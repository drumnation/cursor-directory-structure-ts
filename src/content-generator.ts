// Test file watcher - second Gemini test
// Test file watcher - testing Gemini integration
// Test file watcher - testing Gemini integration
// Test file watcher - sixth change (final test)
// Test file watcher - fifth change (testing both updates)
// Test file watcher - fourth change (after watcher update)
// Test file watcher - third change
// Test file watcher - second change
// Test file watcher
// Testing new tree format with inline descriptions
// Testing fixed Gemini format
// Testing directory structure generation without rules
// Testing updated Gemini prompt for tree descriptions
import * as fs from 'fs';
import * as path from 'path';
import { DateTime } from 'luxon';
import { CODE_EXTENSIONS } from './config';
import { analyzeFileContent } from './analyzers';
import { GeminiService } from './gemini-service';

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '__pycache__',
  'venv',
  '.git',
  '.idea',
  '.vscode',
  'dist',
  'build',
  'data',
  'chrome_data',
  'tmp',
  'temp',
  'logs',
  'coverage'
]);

function shouldIgnoreDirectory(dirName: string): boolean {
  return dirName.startsWith('.') || IGNORED_DIRECTORIES.has(dirName);
}

function shouldIgnoreFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  return basename.startsWith('.') || basename.endsWith('.pyc');
}

function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.exe', '.bin'].includes(ext);
}

class ProjectMetrics {
  totalFiles: number = 0;
  totalLines: number = 0;
  filesByType: { [key: string]: number } = {};
  linesByType: { [key: string]: number } = {};
  filesWithFunctions: Array<[string, Array<[string, string]>, number]> = [];
}

function getDirectoryStructure(projectPath: string, maxDepth: number = 3): any {
  // Return empty object if directory doesn't exist
  if (!fs.existsSync(projectPath)) {
    console.warn(`Warning: Project path does not exist: ${projectPath}`);
    return {};
  }

  try {
    const stats = fs.statSync(projectPath);
    if (!stats.isDirectory()) {
      console.warn(`Warning: Path is not a directory: ${projectPath}`);
      return {};
    }

    const structure: any = {};
    const items = fs.readdirSync(projectPath);

    for (const item of items) {
      const fullPath = path.join(projectPath, item);

      // Skip ignored directories early
      if (shouldIgnoreDirectory(item)) {
        continue;
      }

      try {
        const itemStats = fs.statSync(fullPath);

        if (itemStats.isDirectory()) {
          if (maxDepth > 0) {
            const subStructure = getDirectoryStructure(fullPath, maxDepth - 1);
            if (Object.keys(subStructure).length > 0) {
              structure[item] = subStructure;
            }
          }
        } else if (itemStats.isFile() && !shouldIgnoreFile(fullPath) && !isBinaryFile(fullPath)) {
          structure[item] = 'file';
        }
      } catch (error) {
        // Log warning for access errors but continue processing
        console.warn(`Warning: Could not access ${fullPath}: ${error}`);
        continue;
      }
    }

    return structure;
  } catch (error) {
    // Log warning for directory access errors
    console.warn(`Warning: Error accessing directory ${projectPath}: ${error}`);
    return {};
  }
}

function structureToTree(
  structure: { [key: string]: any },
  prefix: string = '',
  projectPath: string = ''
): string[] {
  const lines: string[] = [];
  const keys = Object.keys(structure).sort();

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const item = structure[key];
    const isLast = i === keys.length - 1;

    lines.push(`${prefix}${isLast ? '└── ' : '├── '}${key}`);

    if (typeof item === 'object' && Object.keys(item).length > 0) {
      const newPrefix = `${prefix}${isLast ? '    ' : '│   '}`;
      lines.push(...structureToTree(item, newPrefix, projectPath));
    }
  }

  return lines;
}

function saveDirectoryStructure(projectPath: string, structure: any, metrics: ProjectMetrics): void {
  const brainDir = path.join(projectPath, '.brain');
  const filePath = path.join(brainDir, 'directory-structure.md');

  // Generate content sections
  const sections = {
    header: [
      '# Directory Structure',
      '',
      '## Project Metrics',
      ''
    ],
    metrics: [
      `**Files**: ${metrics.totalFiles}`,
      `**Total Lines**: ${metrics.totalLines}`,
      ''
    ],
    fileTypes: [
      '## File Types',
      '',
      ...Object.entries(metrics.filesByType).map(([ext, count]) => 
        `- ${ext}: ${count} files, ${metrics.linesByType[ext]} lines`
      ),
      ''
    ],
    functions: [
      '## Functions',
      '',
      ...metrics.filesWithFunctions.flatMap(([file, functions]) => [
        `### ${path.relative(projectPath, file)}`,
        '',
        ...functions.map(([name]) => `- ${name}`),
        ''
      ])
    ]
  };

  // Combine sections and filter out consecutive blank lines
  const content = Object.values(sections)
    .flat()
    .filter((line, index, array) => {
      // Keep non-empty lines
      if (line !== '') return true;
      // Keep first empty line
      if (array[index - 1] !== '') return true;
      // Filter out consecutive empty lines
      return false;
    })
    .join('\n');

  // Ensure single trailing newline
  fs.writeFileSync(filePath, content + '\n', 'utf-8');
}

async function generateDirectoryStructureContent(projectPath: string): Promise<string> {
  const metrics = new ProjectMetrics();
  scanForMetrics(projectPath, metrics);

  // Get folder descriptions using Gemini
  const geminiService = new GeminiService();
  let descriptions: { [key: string]: string } = {};
  let functionDescriptions: { [key: string]: string } = {};
  try {
    const structure = getDirectoryStructure(projectPath, 3);
    const treeLines = structureToTree(structure, '', projectPath);
    console.log('Generated tree structure with', treeLines.length, 'lines');
    
    const prompt = `Given this project tree structure and list of functions, provide:
1. Brief descriptions (max 60 chars) for each file and folder in the format "path: description"
2. Brief descriptions for each function in the format "function_name: description"

Project structure:
${treeLines.join('\n')}

Functions:
${metrics.filesWithFunctions.map(([file, functions]) => 
  functions.map(([name]) => name).join('\n')
).join('\n')}`;
    
    const response = await geminiService.generateContent(prompt);
    console.log('\nRaw Gemini Response:\n', response, '\n');
    
    // Parse line by line responses into descriptions map
    console.log('Parsing Gemini response into descriptions...');
    const sections = response.split(/^###?\s+/m);
    
    sections.forEach(section => {
      const lines = section.trim().split('\n');
      const sectionTitle = lines[0]?.toLowerCase() || '';
      
      if (sectionTitle.includes('file') || sectionTitle.includes('folder')) {
        lines.slice(1).forEach(line => {
          const match = line.match(/^[-\s]*([^:]+):\s*(.+)$/);
          if (match) {
            const [_, path, description] = match;
            const cleanPath = path.replace(/^[-├└│\s]+/, '').trim();
            console.log(`Adding file/folder description for ${cleanPath}: ${description.trim()}`);
            descriptions[cleanPath] = description.trim();
          }
        });
      } else if (sectionTitle.includes('function')) {
        lines.slice(1).forEach(line => {
          const match = line.match(/^[-\s]*([^:]+):\s*(.+)$/);
          if (match) {
            const [_, name, description] = match;
            const cleanName = name.trim();
            console.log(`Adding function description for ${cleanName}: ${description.trim()}`);
            functionDescriptions[cleanName] = description.trim();
          }
        });
      }
    });

    // If we got no descriptions, try parsing line by line as a fallback
    if (Object.keys(descriptions).length === 0 && Object.keys(functionDescriptions).length === 0) {
      console.log('No descriptions found in sections, trying line by line parsing...');
      response.split('\n').forEach(line => {
        const match = line.match(/^[-\s]*([^:]+):\s*(.+)$/);
        if (match) {
          const [_, path, description] = match;
          const cleanPath = path.replace(/^[-├└│\s]+/, '').trim();
          
          if (metrics.filesWithFunctions.some(([_, functions]) => 
            functions.some(([name]) => name === cleanPath))) {
            console.log(`Adding function description for ${cleanPath}: ${description.trim()}`);
            functionDescriptions[cleanPath] = description.trim();
          } else {
            console.log(`Adding file/folder description for ${cleanPath}: ${description.trim()}`);
            descriptions[cleanPath] = description.trim();
          }
        }
      });
    }

    console.log('\nFinal descriptions map:', descriptions);
    console.log('Final function descriptions map:', functionDescriptions);
  } catch (error) {
    console.warn(`Warning: Could not generate descriptions: ${error}`);
  }

  // Generate tree structure with descriptions
  const structure = getDirectoryStructure(projectPath, 3);
  const treeLines = generateTreeWithDescriptions(structure, '', projectPath, descriptions);
  console.log('\nGenerated tree lines with descriptions:', treeLines.slice(0, 5), '...');

  const content = [
    '# Directory Structure\n',
    '## Project Metrics\n',
    `**Files**: ${metrics.totalFiles}`,
    `**Total Lines**: ${metrics.totalLines}\n`,
    '## File Types\n',
    ...Object.entries(metrics.filesByType)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, count]) => `- ${type}: ${count} files, ${metrics.linesByType[type]} lines`),
    '\n## Project Tree\n',
    '```',
    ...treeLines,
    '```\n',
    '\n## Functions\n',
    ...metrics.filesWithFunctions
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, functions]) => [
        `\n### ${path.relative(projectPath, file)}\n`,
        ...functions.map(([name]) => {
          const description = functionDescriptions[name] || '';
          return `- ${name}${description ? `    # ${description}` : ''}`;
        }),
      ])
      .flat(),
  ].join('\n');

  const brainDir = path.join(projectPath, '.brain');
  if (!fs.existsSync(brainDir)) {
    fs.mkdirSync(brainDir, { recursive: true });
  }

  const filePath = path.join(brainDir, 'directory-structure.md');
  console.log('\nWriting content to:', filePath);
  console.log('Content preview (first 500 chars):', content.substring(0, 500));
  
  fs.writeFileSync(filePath, content);
  return content;
}

function generateTreeWithDescriptions(
  structure: { [key: string]: any },
  prefix: string = '',
  projectPath: string,
  descriptions: { [key: string]: string },
  currentPath: string = ''
): string[] {
  const lines: string[] = [];
  const keys = Object.keys(structure).sort();

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const item = structure[key];
    const isLast = i === keys.length - 1;
    const relativePath = currentPath ? `${currentPath}/${key}` : key;
    const description = descriptions[relativePath] || descriptions[key] || '';
    
    console.log(`Processing ${key}:`, {
      relativePath,
      hasDescription: !!description,
      description
    });

    // Add description as a comment if it exists, with more padding
    const descriptionComment = description ? `    # ${description}` : '';
    const line = `${prefix}${isLast ? '└── ' : '├── '}${key}${descriptionComment}`;
    console.log('Generated line:', line);
    lines.push(line);

    if (typeof item === 'object' && Object.keys(item).length > 0) {
      const newPrefix = `${prefix}${isLast ? '    ' : '│   '}`;
      lines.push(...generateTreeWithDescriptions(item, newPrefix, projectPath, descriptions, relativePath));
    }
  }

  return lines;
}

function scanForMetrics(projectPath: string, metrics: ProjectMetrics, maxDepth: number = 3): void {
  if (!fs.existsSync(projectPath)) {
    return;
  }

  try {
    const items = fs.readdirSync(projectPath);
    for (const item of items) {
      // Skip ignored directories early before any fs operations
      if (shouldIgnoreDirectory(item)) {
        continue;
      }

      const fullPath = path.join(projectPath, item);

      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory() && maxDepth > 0) {
          scanForMetrics(fullPath, metrics, maxDepth - 1);
        } else if (stats.isFile() && !shouldIgnoreFile(fullPath) && !isBinaryFile(fullPath)) {
          const ext = path.extname(item).toLowerCase();
          if (CODE_EXTENSIONS.has(ext)) {
            try {
              const [functions, lineCount] = analyzeFileContent(fullPath);
              metrics.totalFiles++;
              metrics.filesByType[ext] = (metrics.filesByType[ext] || 0) + 1;
              metrics.linesByType[ext] = (metrics.linesByType[ext] || 0) + lineCount;
              metrics.totalLines += lineCount;

              if (functions.length > 0) {
                const uniqueFunctions = Array.from(
                  new Map(functions.map((f) => [f[0], f])).values()
                ).sort((a, b) => a[0].localeCompare(b[0]));
                metrics.filesWithFunctions.push([fullPath, uniqueFunctions, lineCount]);
              }
            } catch (error) {
              // Log warning but continue processing other files
              console.warn(`Warning: Error analyzing file ${fullPath}: ${error}`);
            }
          }
        }
      } catch (error) {
        // Log warning but continue processing other items
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn(`Warning: Could not access ${fullPath}: ${error}`);
        }
      }
    }
  } catch (error) {
    // Log warning but allow the process to continue
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`Warning: Error scanning directory ${projectPath}: ${error}`);
    }
  }
}

export { generateDirectoryStructureContent, ProjectMetrics };