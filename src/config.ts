// config.ts
import * as fs from 'fs';
import * as path from 'path';
import { FileLengthStandards } from './types';

function resolveProjectPath(projectPath: string): string {
  if (!projectPath) {
    return process.cwd();
  }
  return path.resolve(process.cwd(), projectPath);
}

function loadConfig(): any {
  try {
    const scriptDir = __dirname;
    const configPath = path.join(scriptDir, 'config.json');

    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      if (configPath.endsWith('.json')) {
        const config = JSON.parse(data);
        // Resolve relative paths in projects array
        if (config.projects) {
          config.projects = config.projects.map((project: any) => ({
            ...project,
            project_path: resolveProjectPath(project.project_path)
          }));
        }
        // Resolve relative path in project_path
        if (config.project_path) {
          config.project_path = resolveProjectPath(config.project_path);
        }
        return config;
      }
    }

    return getDefaultConfig();
  } catch (e) {
    console.error(`Error loading config: ${e}`);
    return null;
  }
}

function getDefaultConfig(): any {
  return {
    project_path: '',
    update_interval: 60,
    max_depth: 3,
    ignored_directories: [
      '__pycache__',
      'node_modules',
      'venv',
      '.git',
      '.idea',
      '.vscode',
      'dist',
      'build',
      'coverage',
    ],
    ignored_files: [
      '.DS_Store',
      'Thumbs.db',
      '*.pyc',
      '*.pyo',
      'package-lock.json',
      'yarn.lock',
    ],
    binary_extensions: [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.ico',
      '.pdf',
      '.exe',
      '.bin',
    ],
    file_length_standards: {
      '.py': 400,
      '.js': 300,
      '.ts': 300,
      '.tsx': 300,
      '.kt': 300,
      '.php': 400,
      '.swift': 400,
      '.cpp': 500,
      '.c': 500,
      '.h': 300,
      '.hpp': 300,
      '.cs': 400,
      '.csx': 400,
      '.rb': 300,
      '.go': 400,
      '.zig': 300,
      '.rush': 300,
      '.perl': 400,
      '.matlab': 400,
      '.groovy': 300,
      '.lua': 300,
      default: 300,
    },
  };
}

const _config = loadConfig();

const UPDATE_INTERVAL: number = _config.update_interval;
const MAX_DEPTH: number = _config.max_depth;
const IGNORED_DIRECTORIES: Set<string> = new Set(_config.ignored_directories);
const IGNORED_FILES: Set<string> = new Set(_config.ignored_files);
const BINARY_EXTENSIONS: Set<string> = new Set(_config.binary_extensions);
const FILE_LENGTH_STANDARDS: FileLengthStandards =
  _config.file_length_standards;

const NON_CODE_EXTENSIONS: Set<string> = new Set([
  '.txt',
  '.md',
  '.rst',
  '.json',
  '.csv',
  '.xml',
  '.yaml',
  '.yml',
  '.toml',
]);

const CODE_EXTENSIONS: Set<string> = new Set([
  '.py',
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.java',
  '.kt',
  '.php',
  '.swift',
  '.cpp',
  '.c',
  '.h',
  '.hpp',
  '.cs',
  '.csx',
  '.rb',
  '.go',
  '.zig',
  '.rush',
  '.perl',
  '.matlab',
  '.groovy',
  '.lua',
]);

const FUNCTION_PATTERNS: { [key: string]: string } = {
  // Python
  python_function: 'def\\s+([a-zA-Z_]\\w*)\\s*\\(',
  python_class: 'class\\s+([a-zA-Z_]\\w*)\\s*[:\\(]',

  // JavaScript/TypeScript
  js_function: '(?:^|\\s+)(?:function\\s+([a-zA-Z_]\\w*)|(?:const|let|var)\\s+([a-zA-Z_]\\w*)\\s*=\\s*(?:async\\s*)?function)',
  js_arrow: '(?:^|\\s+)(?:const|let|var)\\s+([a-zA-Z_]\\w*)\\s*=\\s*(?:async\\s*)?(?:\\([^)]*\\)|[^=])\\s*=>',
  js_method: '\\b([a-zA-Z_]\\w*)\\s*:\\s*(?:async\\s*)?function',
  js_class_method: '(?:^|\\s+)(?:async\\s+)?([a-zA-Z_]\\w*)\\s*\\([^)]*\\)\\s*\\{',

  // PHP
  php_function: '(?:public\\s+|private\\s+|protected\\s+)?function\\s+([a-zA-Z_]\\w*)\\s*\\(',

  // C/C++
  cpp_function: '(?:virtual\\s+)?(?:static\\s+)?(?:inline\\s+)?(?:const\\s+)?(?:\\w+(?:::\\w+)*\\s+)?([a-zA-Z_]\\w*)\\s*\\([^)]*\\)(?:\\s*const)?(?:\\s*noexcept)?(?:\\s*override)?(?:\\s*final)?(?:\\s*=\\s*0)?(?:\\s*=\\s*default)?(?:\\s*=\\s*delete)?(?:\\s*\\{|;)',

  // C#
  csharp_method: '(?:public|private|protected|internal|static|virtual|override|abstract|sealed|async)\\s+(?:\\w+(?:<[^>]+>)?)\\s+([a-zA-Z_]\\w*)\\s*\\([^)]*\\)',

  // Kotlin
  kotlin_function: '(?:fun\\s+)?([a-zA-Z_]\\w*)\\s*(?:<[^>]+>)?\\s*\\([^)]*\\)(?:\\s*:\\s*[^{]+)?\\s*\\{',

  // Swift
  swift_function: '(?:func\\s+)([a-zA-Z_]\\w*)\\s*(?:<[^>]+>)?\\s*\\([^)]*\\)(?:\\s*->\\s*[^{]+)?\\s*\\{',

  // Go
  go_function: 'func\\s+([a-zA-Z_]\\w*)\\s*\\([^)]*\\)(?:\\s*\\([^)]*\\))?\\s*\\{',

  // Ruby
  ruby_function: '(?:def\\s+)([a-zA-Z_]\\w*[?!]?)',

  // Lua
  lua_function: '(?:local\\s+)?function\\s+([a-zA-Z_]\\w*(?:\\.[a-zA-Z_]\\w*)*)\\s*\\([^)]*\\)',

  // Perl
  perl_function: 'sub\\s+([a-zA-Z_]\\w*)\\s*\\{',

  // MATLAB
  matlab_function: 'function\\s+(?:\\[?[^\\]]*\\]?\\s*=\\s*)?([a-zA-Z_]\\w*)\\s*\\(',

  // Groovy
  groovy_function: '(?:def|public|private|protected)\\s+([a-zA-Z_]\\w*)\\s*\\([^)]*\\)\\s*\\{',

  // Zig
  zig_function: '(?:pub\\s+)?fn\\s+([a-zA-Z_]\\w*)\\s*\\(',

  // Rush
  rush_function: '(?:pub\\s+)?fn\\s+([a-zA-Z_]\\w*)\\s*\\('
};

const IGNORED_KEYWORDS: Set<string> = new Set([
  'if',
  'switch',
  'while',
  'for',
  'catch',
  'finally',
  'else',
  'return',
  'break',
  'continue',
  'case',
  'default',
  'to',
  'from',
  'import',
  'as',
  'try',
  'except',
  'raise',
  'with',
  'async',
  'await',
  'yield',
  'assert',
  'pass',
  'del',
  'print',
  'in',
  'is',
  'not',
  'and',
  'or',
  'lambda',
  'global',
  'nonlocal',
  'class',
  'def',
]);

const IGNORED_NAMES: Set<string> = new Set(_config.ignored_directories);

function getFileLengthLimit(filePath: string): number {
  const ext = path.extname(filePath).toLowerCase();
  return FILE_LENGTH_STANDARDS[ext] || FILE_LENGTH_STANDARDS['default'];
}

export {
  UPDATE_INTERVAL,
  MAX_DEPTH,
  IGNORED_DIRECTORIES,
  IGNORED_FILES,
  BINARY_EXTENSIONS,
  FILE_LENGTH_STANDARDS,
  loadConfig,
  getFileLengthLimit,
  NON_CODE_EXTENSIONS,
  CODE_EXTENSIONS,
  FUNCTION_PATTERNS,
  IGNORED_KEYWORDS,
  IGNORED_NAMES,
};