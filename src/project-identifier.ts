import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';
import { ProjectInfo } from './types';

export { ProjectInfo };  // Re-export ProjectInfo

interface ProjectType {
  name: string;
  description: string;
  indicators: string[];
  file_patterns: string[];
  required_files?: string[];
  priority?: number;
  additional_checks?: (projectPath: string) => boolean;
}

interface FileTypeInfo {
  fileType: string;
  language: string;
}

const PROJECT_TYPES: { [key: string]: ProjectType } = {
  javascript: {
    name: 'JavaScript/Node.js',
    description: 'JavaScript or Node.js project',
    indicators: ['package.json', 'node_modules'],
    file_patterns: ['.js', '.jsx', '.ts', '.tsx'],
    required_files: ['package.json'],
    priority: 1
  },
  python: {
    name: 'Python',
    description: 'Python project',
    indicators: ['requirements.txt', 'setup.py', 'pyproject.toml'],
    file_patterns: ['.py'],
    priority: 1
  }
};

export function determineProjectType(projectPath: string): string {
  if (!fs.existsSync(projectPath)) {
    return 'generic';
  }

  const files = fs.readdirSync(projectPath);
  
  for (const [type, config] of Object.entries(PROJECT_TYPES)) {
    // Check for required files
    if (config.required_files) {
      const hasRequiredFiles = config.required_files.every(file => 
        files.includes(file)
      );
      if (!hasRequiredFiles) continue;
    }

    // Check for indicators
    const hasIndicators = config.indicators.some(indicator => 
      files.includes(indicator)
    );

    if (hasIndicators) {
      return type;
    }
  }

  return 'generic';
}

export function resolveFileTypeInfo(filePath: string): FileTypeInfo {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.ts':
    case '.tsx':
      return { fileType: 'code', language: 'typescript' };
    case '.js':
    case '.jsx':
      return { fileType: 'code', language: 'javascript' };
    case '.py':
      return { fileType: 'code', language: 'python' };
    default:
      return { fileType: 'unknown', language: 'unknown' };
  }
}

export function identifyMainLanguage(projectPath: string): string {
  const projectType = determineProjectType(projectPath);
  switch (projectType) {
    case 'javascript':
      return 'javascript';
    case 'python':
      return 'python';
    default:
      return 'unknown';
  }
}

export function enumerateProjectFiles(projectPath: string): string[] {
  if (!fs.existsSync(projectPath)) {
    return [];
  }

  const files = fs.readdirSync(projectPath);
  return files.filter(file => {
    const fullPath = path.join(projectPath, file);
    return fs.statSync(fullPath).isFile();
  });
}

export function getProjectDescription(projectPath: string): ProjectInfo {
  const projectType = determineProjectType(projectPath);
  const language = identifyMainLanguage(projectPath);
  
  return {
    name: path.basename(projectPath),
    version: '1.0.0',
    language,
    framework: 'unknown',
    type: projectType,
    description: projectType === 'generic' ? 'unknown project' : `${projectType} project`
  };
}

export function scanForProjects(rootPath: string): ProjectInfo[] {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const projects: ProjectInfo[] = [];
  const entries = fs.readdirSync(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const projectPath = path.join(rootPath, entry.name);
      const projectInfo = getProjectDescription(projectPath);
      if (projectInfo.type !== 'generic') {
        projects.push(projectInfo);
      }
    }
  }

  return projects;
} 