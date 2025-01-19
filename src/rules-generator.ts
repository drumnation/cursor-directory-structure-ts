import * as fs from 'fs';
import * as path from 'path';
import { DateTime } from 'luxon';
import {
  AiConfig,
  ImportPattern,
  ClassPattern,
  FunctionPattern,
  Rules,
  ProjectStructure,
} from './types';
import { RulesAnalyzer } from './rules-analyzer';
import { config } from 'dotenv';
import { CODE_EXTENSIONS } from './config';

config();

class RulesGenerator {
  private static readonly IMPORT_PATTERNS: ImportPattern = {
    python: '^(?:from|import)\\s+([a-zA-Z0-9_\\.]+)',
    javascript:
      '(?:import\\s+.*?from\\s+[\\\'"]([^\\\'"]+)[\\\'"]|require\\s*\\([\\\'"]([^\\\'"]+)[\\\'"]\\))',
    typescript: '(?:import|require)\\s+.*?[\\\'"]([^\\\'"]+)[\\\'"]',
    java: 'import\\s+(?:static\\s+)?([a-zA-Z0-9_\\.\\*]+);',
    php: 'namespace\\s+([a-zA-Z0-9_\\\\]+)',
    csharp: 'using\\s+(?:static\\s+)?([a-zA-Z0-9_\\.]+);',
    ruby: "require(?:_relative)?\\s+[\\'\\\"]([^\\\'\\\"]+)[\\'\\\"]",
    go: 'import\\s+(?:\\([^)]*\\)|[\\\'"]([^\\\'"]+)[\\\'"])',
    cpp: '#include\\s*[<\"]([^>\"]+)[>\"]',
    c: '#include\\s*[<\"]([^>\"]+)[>\"]',
    kotlin: 'import\\s+([^\\n]+)',
    swift: 'import\\s+([^\\n]+)',
    zig: '(?:const|pub const)\\s+(\\w+)\\s*=\\s*@import\\("([^"]+)"\\);',
    rush: 'import\\s+.*?[\\\'"]([^\\\'"]+)[\\\'"]',
    rust: '(?:use|extern crate)\\s+([a-zA-Z0-9_:]+)(?:\\s*{[^}]*})?;',
    scala: 'import\\s+([a-zA-Z0-9_\\.]+)(?:\\._)?(?:\\s*{[^}]*})?',
    dart: "import\\s+[\\'\\\"]([^\\\'\\\"]+)[\\'\\\"](?:\\s+(?:as|show|hide)\\s+[^;]+)?;",
    r: "(?:library|require)\\s*\\([\\'\\\"]([^\\\'\\\"]+)[\\'\\\"]\\)",
    julia:
      '(?:using|import)\\s+([a-zA-Z0-9_\\.]+)(?:\\s*:\\s*[a-zA-Z0-9_,\\s]+)?',
    perl: '(?:use|require)\\s+([a-zA-Z0-9_]+)(?:\\s+([a-zA-Z0-9_]+))?',
    matlab: 'function\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s*:\\s*([^{]+))?',
    groovy: 'def\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s*:\\s*([^{]+))?',
    lua: 'function\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s*:\\s*([^{]+))?',
  };

  private static readonly CLASS_PATTERNS: ClassPattern = {
    python: 'class\\s+(\\w+)(?:\\((.*?)\\))?\\s*:',
    javascript: 'class\\s+(\\w+)(?:\\s+extends\\s+(\\w+))?\\s*{',
    typescript: 'class\\s+(\\w+)(?:\\s+extends\\s+(\\w+))?\\s*{',
    java: 'class\\s+(\\w+)(?:\\s+extends\\s+(\\w+))?(?:\\s+implements\\s+([\\w, ]+))?\\s*{',
    php: 'class\\s+(\\w+)(?:\\s+extends\\s+(\\w+))?(?:\\s+implements\\s+([\\w,\\\\]+))?\\s*{',
    csharp: 'class\\s+(\\w+)(?:\\s+:\\s+([\\w, ]+))?\\s*{',
    ruby: 'class\\s+(\\w+)(?:\\s*<\\s*(\\w+))?\\s*',
    go: 'type\\s+(\\w+)\\s+struct\\s*{',
    cpp: '(?:class|struct)\\s+(\\w+)(?:\\s+:\\s+(?:public|private|protected)?\\s*(\\w+))?(?:\\s*,\\s*(?:public|private|protected)?\\s*(\\w+))*\\s*{',
    c: 'typedef\\s+(?:struct|union)\\s+(\\w+)?\\s*{(?:[^}]*?)}(?:\\s*(\\w+))?;',
    kotlin: 'class\\s+(\\w+)(?:\\s*\\((.*?)\\))?(?:\\s+:\\s+([\\w.,() ]+))?\\s*{',
    swift: 'class\\s+(\\w+)(?:\\s+:\\s+([\\w, ]+))?\\s*{',
    zig: '(?:const|var)\\s+(\\w+)\\s*=\\s*(?:struct|enum|union)(?:\\((.*?)\\))?\\s*{',
    rush: 'class\\s+(\\w+)(?:\\s+extends\\s+(\\w+))?\\s*{',
    rust: '(?:pub\\s+)?(?:struct|enum|union)\\s+(\\w+)(?:\\((.*?)\\))?\\s*{',
    scala: '(?:case\\s+)?class\\s+(\\w+)(?:\\((.*?)\\))?(?:\\s+extends\\s+([\\w()]+))?(?:\\s+with\\s+([\\w()\\s,]+))?\\s*{',
    dart: 'class\\s+(\\w+)(?:\\s+extends\\s+(\\w+))?(?:\\s+with\\s+([\\w,]+))?(?:\\s+implements\\s+([\\w,]+))?\\s*{',
    r: 'setClass\\s*\\(\\s*[\\\'"]([\\w]+)[\\\'"](?:,\\s*representation\\s*\\((.*?)\\))?(?:,\\s*prototype\\s*\\((.*?)\\))?(?:,\\s*contains\\s*=\\s*([\\w]+))?\\s*\\)',
    julia: 'struct\\s+(\\w+)(?:\\s*<:\\s*(\\w+))??\\s*(?:[^{]*){(?:([^{]+))?}(?:\\s*end)?',
    perl: 'package\\s+(\\w+)\\s*;\\s*(?:use base\\s+([\\w:]+);)?',
    matlab: 'classdef\\s+(\\w+)(?:\\s*<\\s*(\\w+))?\\s*(?:[^{]*){(?:([^{]+))?}(?:\\s*end)?',
    groovy: 'class\\s+(\\w+)(?:\\s+extends\\s+(\\w+))?(?:\\s+implements\\s+([\\w, ]+))?\\s*{',
    lua: 'local\\s+(\\w+)\\s*=\\s*(?:\\w+\\.)?class\\s*\\(\\s*\\)',
  };

  private static readonly FUNCTION_PATTERNS: FunctionPattern = {
    python: '(?:async\\s+)?def\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s*->\\s*([^{]+))?:',
    javascript:
      '(?:async\\s+)?(?:function\\s+)?(\\w+)?\\s*\\((.*?)\\)(?:\\s*=>)?\\s*{',
    typescript:
      '(?:async\\s+)?(?:function\\s+)?(\\w+)?\\s*\\((.*?)\\)(?:\\s*:\\s*([^{]+))?(?:\\s*=>)?\\s*{',
    java: '(?:public|private|protected)?\\s*(?:static)?\\s*([\\w<>\\[\\]]+)\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s+throws\\s+([\\w, ]+))?\\s*{',
    php: '(?:abstract|final)?\\s*(?:public|private|protected)?\\s*(?:static)?\\s*function\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s*:\\s*([^{]+))?\\s*{',
    csharp:
      '(?:public|private|protected)?\\s*(?:static)?\\s*([\\w<>\\[\\]]+)\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s+where\\s+([\\w, :]+))?\\s*{',
    ruby: 'def\\s+(\\w+)(?:\\.([\\w]+))?\\s*(?:\\((.*?)\\))?(?:\\s*;\\s*([^{]+))?',
    go: 'func\\s+(?:\\((.*?)\\)\\s*)?(\\w+)\\s*\\((.*?)\\)(?:\\s*([\\w\\[\\]{}() \\*]+))?\\s*{',
    cpp: '([\\w:<>]+(?:\\s*\\*)?)\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s+const)?(?:\\s+override|final)?(?:\\s+=\\s+\\w+)?;',
    c: '([\\w:<>]+(?:\\s*\\*)?)\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s+const)?\\s*{',
    kotlin:
      'fun\\s+(?:<([\\w, ]+)>\\s+)?(?:(\\w+)\\.)?(\\w+)\\s*\\((.*?)\\)(?::\\s*([\\w<>\\[\\]]+))?\\s*{',
    swift:
      'func\\s+(\\w+)(?:\\s*<([\\w, ]+)>)?\\s*\\((.*?)\\)(?:\\s*->\\s*([^{]+))?\\s*{',
    zig: '(?:pub\\s+)?fn\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s*->\\s*([^{]+))?\\s*{',
    rush: '(?:async\\s+)?(?:function\\s+)?(\\w+)?\\s*\\((.*?)\\)(?:\\s*=>)?\\s*{',
    rust: '(?:pub(?:\\((.*?)\\))?\\s+)?fn\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s*->\\s*([^{]+))?\\s*{',
    scala:
      'def\\s+(\\w+)(?:\\((.*?)\\))?(?:\\s*:\\s*([\\w\\[\\]]+))?(?:\\s*=\\s*[^{]+)?\\s*{',
    dart: '([\\w<>]+)\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s+async)?(?:\\s*:\\s*([^{]+))?\\s*{',
    r: '(\\w+)\\s*<-\\s*function\\s*\\((.*?)\\)(?:\\s*:\\s*([^{]+))?\\s*{',
    julia: 'function\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s*:\\s*([^{]+))?\\s*(?:end)?',
    perl: 'sub\\s+(\\w+)\\s*{(?:\\s*my\\s*\\((.*?)\\))?(?:\\s*:\\s*([^{]+))?\\s*}',
    matlab: 'function\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s*:\\s*([^{]+))?',
    groovy: 'def\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s*:\\s*([^{]+))?',
    lua: 'function\\s+(\\w+)\\s*\\((.*?)\\)(?:\\s*:\\s*([^{]+))?',
  };

  private projectPath: string;
  private rulesAnalyzer: RulesAnalyzer;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.rulesAnalyzer = new RulesAnalyzer(projectPath);
  }

  async generateRules(
    aiConfig: AiConfig = this.getDefaultAiConfig()
  ): Promise<Rules> {
    const projectInfo = this.rulesAnalyzer.analyzeProjectForRules();
    const projectStructure = this.analyzeProjectStructure();

    const rules: Rules = {
      version: '1.0',
      last_updated: DateTime.now().toISO() || '',
      project: {
        name: projectInfo.name,
        version: projectInfo.version,
        language: projectInfo.language,
        framework: projectInfo.framework,
        type: projectInfo.type,
      },
      ai_behavior: {
        code_generation: {
          style: {
            prefer: [
              'async/await over callbacks',
              'const over let',
              'descriptive variable names',
              'single responsibility functions',
            ],
            avoid: [
              'magic numbers',
              'nested callbacks',
              'hard-coded values',
              'complex conditionals',
            ],
          },
          error_handling: {
            prefer: [
              'try/catch for async operations',
              'custom error messages',
              'meaningful error states',
            ],
            avoid: ['silent errors', 'empty catch blocks', 'generic error messages'],
          },
          performance: {
            prefer: [
              'memoization for expensive calculations',
              'efficient data structures',
              'avoiding unnecessary re-renders',
            ],
            avoid: [
              'premature optimization',
              'deeply nested loops',
              'excessive DOM manipulation',
            ],
          },
          security: {
            prefer: [
              'input validation',
              'output encoding',
              'secure authentication methods',
            ],
            avoid: ['SQL injection', 'XSS vulnerabilities', 'sensitive data exposure'],
          },
          validate_user_data: true,
          avoid_eval: true,
        },
        accessibility: {
          standards: ['WCAG 2.1 AA', 'ARIA 1.2'],
          require_alt_text: true,
          focus_indicators: true,
          aria_labels: true,
        },
      },
      communication: {
        style: 'step-by-step',
        level: 'beginner-friendly',
        on_error: [
          'log error details',
          'suggest alternative solutions',
          'ask for clarification if unsure',
        ],
        on_success: [
          'summarize changes',
          'provide context for future improvements',
          'highlight any potential optimizations',
        ],
        confirmations: {
          required_for: [
            'major changes',
            'file deletions',
            'dependency updates',
            'structural changes',
          ],
        },
      },
      response_format: {
        always: [
          'show file paths',
          'explain changes simply',
          'highlight modified sections only',
          'provide next steps',
        ],
        never: [
          'create new files without permission',
          'remove existing code without confirmation',
          'use technical jargon without explanation',
          'show entire files unless requested',
        ],
      },
    };

    return rules;
  }

  private getDefaultAiConfig(): AiConfig {
    return {
      model: 'gemini-pro',
      temperature: 0.5,
      maxOutputTokens: 2048,
      topP: 1,
      topK: 32,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    };
  }

  private analyzeProjectStructure(): ProjectStructure {
    const structure: ProjectStructure = {
      dependencies: {},
      patterns: {
        imports: [],
        class_patterns: [],
        function_patterns: [],
        code_organization: [],
      },
    };

    const files = this.listProjectFiles();
    for (const file of files) {
      const relPath = path.relative(this.projectPath, file);
      const content = fs.readFileSync(file, 'utf-8');
      const ext = path.extname(file).toLowerCase().substring(1);

      switch (ext) {
        case 'py':
          this.analyzePythonFile(content, relPath, structure);
          break;
        case 'js':
        case 'jsx':
        case 'mjs':
        case 'cjs':
          this.analyzeJavaScriptFile(content, relPath, structure);
          break;
        case 'ts':
        case 'tsx':
          this.analyzeTypeScriptFile(content, relPath, structure);
          break;
        case 'java':
          this.analyzeJavaFile(content, relPath, structure);
          break;
        case 'php':
          this.analyzePhpFile(content, relPath, structure);
          break;
        case 'cs':
          this.analyzeCsharpFile(content, relPath, structure);
          break;
        case 'rb':
          this.analyzeRubyFile(content, relPath, structure);
          break;
        case 'go':
          this.analyzeGoFile(content, relPath, structure);
          break;
        case 'cpp':
        case 'cc':
        case 'cxx':
        case 'h':
        case 'hpp':
          this.analyzeCppFile(content, relPath, structure);
          break;
        case 'c':
          this.analyzeCFile(content, relPath, structure);
          break;
        case 'kt':
        case 'kts':
          this.analyzeKotlinFile(content, relPath, structure);
          break;
        case 'swift':
          this.analyzeSwiftFile(content, relPath, structure);
          break;
        case 'zig':
          this.analyzeZigFile(content, relPath, structure);
          break;
        case 'rs':
          this.analyzeRustFile(content, relPath, structure);
          break;
        case 'scala':
          this.analyzeScalaFile(content, relPath, structure);
          break;
        case 'dart':
          this.analyzeDartFile(content, relPath, structure);
          break;
        case 'r':
          this.analyzeRFile(content, relPath, structure);
          break;
        case 'jl':
          this.analyzeJuliaFile(content, relPath, structure);
          break;
        case 'pl':
          this.analyzePerlFile(content, relPath, structure);
          break;
        case 'm':
          this.analyzeMatlabFile(content, relPath, structure);
          break;
        case 'groovy':
          this.analyzeGroovyFile(content, relPath, structure);
          break;
        case 'lua':
          this.analyzeLuaFile(content, relPath, structure);
          break;
        default:
          break;
      }
    }

    return structure;
  }

  private listProjectFiles(): string[] {
    const files: string[] = [];
    const stack: string[] = [this.projectPath];

    // Directories to ignore
    const ignoredDirs = new Set([
      'node_modules',
      '__pycache__',
      'venv',
      '.git',
      '.idea',
      '.vscode',
      'dist',
      'build',
      'data',          // Ignore data directories
      'chrome_data',   // Specifically ignore chrome data
      'tmp',
      'temp',
      'logs',
      'coverage'
    ]);

    while (stack.length > 0) {
      const currentPath = stack.pop()!;
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip if directory name is in ignored list or starts with a dot
          if (!item.startsWith('.') && !ignoredDirs.has(item)) {
            stack.push(fullPath);
          }
        } else if (stat.isFile()) {
          // Only include files with extensions we care about
          const ext = path.extname(item).toLowerCase();
          if (CODE_EXTENSIONS.has(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    return files;
  }

  private analyzePythonFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['python'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['python'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(new RegExp(RulesGenerator.FUNCTION_PATTERNS['python'], 'gm'))
    ).map((match) => ({
      name: match[1],
      parameters: match[2],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeJavaScriptFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['javascript'], 'gm'))
    )
      .flatMap((match) => [match[1], match[2]])
      .filter(Boolean) as string[];
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['javascript'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(
        new RegExp(RulesGenerator.FUNCTION_PATTERNS['javascript'], 'gm')
      )
    ).map((match) => ({
      name: match[1] || match[2],
      parameters: match[3],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeTypeScriptFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['typescript'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['typescript'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(
        new RegExp(RulesGenerator.FUNCTION_PATTERNS['typescript'], 'gm')
      )
    ).map((match) => ({
      name: match[1] || match[2],
      parameters: match[3],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeJavaFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['java'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['java'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(new RegExp(RulesGenerator.FUNCTION_PATTERNS['java'], 'gm'))
    ).map((match) => ({
      name: match[2],
      parameters: match[3],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzePhpFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['php'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['php'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(new RegExp(RulesGenerator.FUNCTION_PATTERNS['php'], 'gm'))
    ).map((match) => ({
      name: match[1],
      parameters: match[2],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeCsharpFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['csharp'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['csharp'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(new RegExp(RulesGenerator.FUNCTION_PATTERNS['csharp'], 'gm'))
    ).map((match) => ({
      name: match[2],
      parameters: match[3],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeRubyFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['ruby'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['ruby'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(new RegExp(RulesGenerator.FUNCTION_PATTERNS['ruby'], 'gm'))
    ).map((match) => ({
      name: match[1],
      parameters: match[2],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeGoFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['go'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['go'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(new RegExp(RulesGenerator.FUNCTION_PATTERNS['go'], 'gm'))
    ).map((match) => ({
      name: match[2],
      parameters: match[3],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeCppFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['cpp'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['cpp'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(new RegExp(RulesGenerator.FUNCTION_PATTERNS['cpp'], 'gm'))
    ).map((match) => ({
      name: match[2],
      parameters: match[3],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeCFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['c'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['c'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(new RegExp(RulesGenerator.FUNCTION_PATTERNS['c'], 'gm'))
    ).map((match) => ({
      name: match[2],
      parameters: match[3],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeKotlinFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['kotlin'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['kotlin'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(
        new RegExp(RulesGenerator.FUNCTION_PATTERNS['kotlin'], 'gm')
      )
    ).map((match) => ({
      name: match[3],
      parameters: match[4],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeSwiftFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['swift'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['swift'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(
        new RegExp(RulesGenerator.FUNCTION_PATTERNS['swift'], 'gm')
      )
    ).map((match) => ({
      name: match[1],
      parameters: match[3],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeZigFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['zig'], 'gm'))
    ).map((match) => match[2]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['zig'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(new RegExp(RulesGenerator.FUNCTION_PATTERNS['zig'], 'gm'))
    ).map((match) => ({
      name: match[1],
      parameters: match[2],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeRustFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['rust'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['rust'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(
        new RegExp(RulesGenerator.FUNCTION_PATTERNS['rust'], 'gm')
      )
    ).map((match) => ({
      name: match[2],
      parameters: match[3],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeScalaFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['scala'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['scala'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(
        new RegExp(RulesGenerator.FUNCTION_PATTERNS['scala'], 'gm')
      )
    ).map((match) => ({
      name: match[1],
      parameters: match[2],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeDartFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['dart'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['dart'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(new RegExp(RulesGenerator.FUNCTION_PATTERNS['dart'], 'gm'))
    ).map((match) => ({
      name: match[2],
      parameters: match[3],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeRFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['r'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['r'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 's4_class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(new RegExp(RulesGenerator.FUNCTION_PATTERNS['r'], 'gm'))
    ).map((match) => ({
      name: match[1],
      parameters: match[2],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);

    const pipes = Array.from(
      content.matchAll(/([^%\s]+)\s*%>%\s*([^%\s]+)/g)
    ).map((match) => ({
      type: 'pipe',
      from: match[1],
      to: match[2],
      file: relPath,
    }));
    structure.patterns.code_organization.push(...pipes);
  }

  private analyzeJuliaFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['julia'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['julia'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'struct',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(
        new RegExp(RulesGenerator.FUNCTION_PATTERNS['julia'], 'gm')
      )
    ).map((match) => ({
      name: match[1],
      parameters: match[2],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzePerlFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['perl'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['perl'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'package',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(
        new RegExp(RulesGenerator.FUNCTION_PATTERNS['perl'], 'gm')
      )
    ).map((match) => ({
      name: match[1],
      parameters: match[2],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeMatlabFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['matlab'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'classdef',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(
        new RegExp(RulesGenerator.FUNCTION_PATTERNS['matlab'], 'gm')
      )
    ).map((match) => ({
      name: match[1],
      parameters: match[2],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeGroovyFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const imports = Array.from(
      content.matchAll(new RegExp(RulesGenerator.IMPORT_PATTERNS['groovy'], 'gm'))
    ).map((match) => match[1]);
    structure.dependencies = {
      ...structure.dependencies,
      ...imports.reduce((acc: { [key: string]: boolean }, imp) => {
        acc[imp] = true;
        return acc;
      }, {}),
    };
    structure.patterns.imports.push(...imports);

    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['groovy'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(
        new RegExp(RulesGenerator.FUNCTION_PATTERNS['groovy'], 'gm')
      )
    ).map((match) => ({
      name: match[1],
      parameters: match[2],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }

  private analyzeLuaFile(
    content: string,
    relPath: string,
    structure: ProjectStructure
  ): void {
    const classes = Array.from(
      content.matchAll(new RegExp(RulesGenerator.CLASS_PATTERNS['lua'], 'gm'))
    ).map((match) => ({
      name: match[1],
      type: 'class',
      file: relPath,
    }));
    structure.patterns.class_patterns.push(...classes);

    const functions = Array.from(
      content.matchAll(new RegExp(RulesGenerator.FUNCTION_PATTERNS['lua'], 'gm'))
    ).map((match) => ({
      name: match[1],
      parameters: match[2],
      file: relPath,
    }));
    structure.patterns.function_patterns.push(...functions);
  }
}

export { RulesGenerator };
