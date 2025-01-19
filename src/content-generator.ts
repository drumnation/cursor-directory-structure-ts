import * as fs from 'fs';
import * as path from 'path';
import { DateTime } from 'luxon';
import { CODE_EXTENSIONS } from './config';
import { analyzeFileContent } from './analyzers';

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

function generateDirectoryStructureContent(projectPath: string): void {
  try {
    // Create .brain directory if it doesn't exist
    const brainDir = path.join(projectPath, '.brain');
    if (!fs.existsSync(brainDir)) {
      fs.mkdirSync(brainDir, { recursive: true });
    }

    // Initialize metrics
    const metrics = new ProjectMetrics();

    // Get directory structure with defensive scanning
    const structure = getDirectoryStructure(projectPath, 3);

    // Scan for metrics separately
    scanForMetrics(projectPath, metrics);

    // Save directory structure with error handling
    try {
      saveDirectoryStructure(projectPath, structure, metrics);
    } catch (error) {
      console.warn(`Warning: Could not save directory structure: ${error}`);
    }
  } catch (error) {
    console.warn(`Warning: Error generating directory structure content: ${error}`);
  }
}

function scanForMetrics(projectPath: string, metrics: ProjectMetrics, maxDepth: number = 3): void {
  if (!fs.existsSync(projectPath)) {
    return;
  }

  try {
    const items = fs.readdirSync(projectPath);
    for (const item of items) {
      const fullPath = path.join(projectPath, item);

      if (shouldIgnoreDirectory(item)) {
        continue;
      }

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
              console.warn(`Warning: Error analyzing file ${fullPath}: ${error}`);
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not access ${fullPath}: ${error}`);
      }
    }
  } catch (error) {
    console.warn(`Warning: Error scanning directory ${projectPath}: ${error}`);
  }
}

export { generateDirectoryStructureContent, ProjectMetrics };