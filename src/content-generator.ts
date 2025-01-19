// content_generator.ts
import * as fs from 'fs';
import * as path from 'path';
import { DateTime } from 'luxon';
import {
  analyzeFileContent,
  shouldIgnoreFile,
  isBinaryFile,
} from './analyzers';
import {
  determineProjectType,
  resolveFileTypeInfo,
  identifyMainLanguage,
  getProjectDescription
} from './project-identifier';
import {
  getFileLengthLimit,
  CODE_EXTENSIONS,
} from './config';

class ProjectMetrics {
  totalFiles: number = 0;
  totalLines: number = 0;
  filesByType: { [key: string]: number } = {};
  linesByType: { [key: string]: number } = {};
  filesWithFunctions: Array<[string, Array<[string, string]>, number]> = [];
}

function getDirectoryStructure(
  projectPath: string,
  maxDepth: number = 3,
  currentDepth: number = 0,
  metrics: ProjectMetrics = new ProjectMetrics()
): { [key: string]: any } {
  if (currentDepth > maxDepth) {
    return {};
  }

  if (!fs.existsSync(projectPath)) {
    throw new Error(`Directory does not exist: ${projectPath}`);
  }

  const structure: { [key: string]: any } = {};
  try {
    const items = fs.readdirSync(projectPath);
    for (const item of items) {
      const itemPath = path.join(projectPath, item);
      
      if (shouldIgnoreFile(itemPath)) {
        continue;
      }

      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        const substructure = getDirectoryStructure(
          itemPath,
          maxDepth,
          currentDepth + 1,
          metrics
        );
        if (Object.keys(substructure).length > 0) {
          structure[item] = substructure;
        }
      } else {
        if (isBinaryFile(itemPath)) {
          continue;
        }

        const ext = path.extname(item).toLowerCase();
        if (!CODE_EXTENSIONS.has(ext)) {
          continue;
        }

        const [functions, lineCount] = analyzeFileContent(itemPath);

        metrics.totalFiles++;
        metrics.filesByType[ext] = (metrics.filesByType[ext] || 0) + 1;
        metrics.linesByType[ext] = (metrics.linesByType[ext] || 0) + lineCount;
        metrics.totalLines += lineCount;

        if (functions.length > 0) {
          const uniqueFunctions = Array.from(
            new Map(functions.map((f) => [f[0], f])).values()
          ).sort((a, b) => a[0].localeCompare(b[0]));
          metrics.filesWithFunctions.push([itemPath, uniqueFunctions, lineCount]);
        }

        const fileInfo = resolveFileTypeInfo(item);
        if (fileInfo) {
          structure[item] = {
            type: fileInfo.fileType,
            language: fileInfo.language
          };
        }
      }
    }
  } catch (e) {
    console.error(`Error scanning directory ${projectPath}: ${e}`);
    throw e;
  }

  return structure;
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

    if (item.type === 'file') {
      const relPath = path.relative(projectPath, path.join(projectPath, key));
      const limit = getFileLengthLimit(relPath);
      const longFileAlert =
        item.line_count > limit
          ? `  **📄 Long-file Alert: File exceeds the recommended ${limit} lines for ${path.extname(
              key
            )} files (${item.line_count} lines)**`
          : '';

      lines.push(
        `${prefix}${isLast ? '    ' : '│   '}  *${
          item.description
        }*${longFileAlert}`
      );

      if (item.functions && item.functions.length > 0) {
        item.functions.forEach(([funcName, funcDesc]: [string, string]) => {
          lines.push(`${prefix}${isLast ? '    ' : '│   '}    - \`${funcName}\``);
        });
      }
    } else if (typeof item === 'object') {
      const newPrefix = `${prefix}${isLast ? '    ' : '│   '}`;
      lines.push(...structureToTree(item, newPrefix, projectPath));
    }
  }

  return lines;
}

function saveDirectoryStructure(projectPath: string): void {
  const brainDir = path.join(projectPath, '.brain');
  if (!fs.existsSync(brainDir)) {
    fs.mkdirSync(brainDir, { recursive: true });
  }

  const metrics = new ProjectMetrics();
  const structure = getDirectoryStructure(projectPath, 3, 0, metrics);
  const tree = structureToTree(structure, '', projectPath);

  const content = [
    '# Directory Structure',
    '',
    '## Project Overview',
    '',
    '- Total Files: ' + metrics.totalFiles,
    '- Total Lines: ' + metrics.totalLines.toLocaleString(),
    '',
    '## File Tree',
    '',
    ...tree,
    '',
    '### Last Updated',
    '',
    DateTime.now().toFormat('MMMM dd, yyyy \'at\' h:mm a'),
    '' // Ensure trailing newline
  ].join('\n');

  const outputPath = path.join(brainDir, 'directory-structure.md');
  fs.writeFileSync(outputPath, content);
  console.log(`📝 Directory structure saved to ${outputPath}`);
}

function generateFocusContent(projectPath: string): string {
  if (!fs.existsSync(projectPath)) {
    const error = new Error(`ENOENT: no such file or directory, stat '${projectPath}'`);
    (error as any).code = 'ENOENT';
    throw error;
  }

  try {
    // Save directory structure
    saveDirectoryStructure(projectPath);

    // Get project info
    const projectInfo = getProjectDescription(projectPath);
    const metrics = new ProjectMetrics();
    const structure = getDirectoryStructure(projectPath, 3, 0, metrics);

    // Generate content
    const content = [
      '# Project Focus:',
      '',
      `**Project Type:** ${projectInfo.type}`,
      `**Description:** ${projectInfo.description}`,
      `**Language:** ${projectInfo.language}`,
      `**Framework:** ${projectInfo.framework}`,
      '',
      '## Project Metrics:',
      '',
      `**Files:** ${metrics.totalFiles}`,
      `**Total Lines:** ${metrics.totalLines}`,
      '',
      '## File Types:',
      ...Object.entries(metrics.filesByType).map(([ext, count]) => 
        `- ${ext}: ${count} files, ${metrics.linesByType[ext]} lines`
      ),
      '',
      '## Functions:',
      ...metrics.filesWithFunctions.map(([file, functions]) => [
        `### ${path.relative(projectPath, file)}:`,
        ...functions.map(([name]) => `- ${name}`)
      ]).flat(),
    ].join('\n');

    return content;
  } catch (error) {
    console.error(`Error generating focus content: ${error}`);
    throw error;
  }
}

export { generateFocusContent, ProjectMetrics };