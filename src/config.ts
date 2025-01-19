// config.ts
import * as fs from 'fs';
import * as path from 'path';
import { FileLengthStandards } from './types';

// Default update interval in seconds
export const UPDATE_INTERVAL = 60;

// Function patterns for different languages
export const FUNCTION_PATTERNS: { [key: string]: string } = {
  ts: 'function\\s+([a-zA-Z_$][\\w$]*)\\s*\\(',
  js: 'function\\s+([a-zA-Z_$][\\w$]*)\\s*\\(',
  py: 'def\\s+([a-zA-Z_][\\w]*)\\s*\\(',
};

// Keywords to ignore when detecting functions
export const IGNORED_KEYWORDS: Set<string> = new Set([
  'if',
  'for',
  'while',
  'switch',
  'catch',
]);

// Directories to ignore
export const IGNORED_DIRECTORIES: Set<string> = new Set([
  '__pycache__',
  'node_modules',
  'venv',
  '.git',
  '.idea',
  '.vscode',
  'dist',
  'build',
  'coverage',
]);

// Files to ignore
export const IGNORED_FILES: string[] = [
  '.DS_Store',
  'Thumbs.db',
  '*.pyc',
  '*.pyo',
  'package-lock.json',
  'yarn.lock',
];

// Binary file extensions
export const BINARY_EXTENSIONS: Set<string> = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.pdf',
  '.exe',
  '.bin',
]);

// Code file extensions
export const CODE_EXTENSIONS: Set<string> = new Set([
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

function resolveProjectPath(projectPath: string): string {
  if (!projectPath) {
    return process.cwd();
  }
  return path.resolve(process.cwd(), projectPath);
}

function loadConfig(): any {
  try {
    const configPath = path.join(process.cwd(), 'config.json');

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
    ignored_directories: Array.from(IGNORED_DIRECTORIES),
    ignored_files: IGNORED_FILES,
    binary_extensions: Array.from(BINARY_EXTENSIONS),
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
    }
  };
}

export function getFileLengthLimit(filePath: string): number {
  const ext = path.extname(filePath).toLowerCase();
  const config = loadConfig();
  return config?.file_length_standards?.[ext] || config?.file_length_standards?.default || 300;
}

export { loadConfig };