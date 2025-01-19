// analyzers.ts
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, FUNCTION_PATTERNS, IGNORED_KEYWORDS, IGNORED_DIRECTORIES, IGNORED_FILES, BINARY_EXTENSIONS } from './config';

const config = loadConfig();

function isBinaryFile(filePath: string): boolean {
  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Check if extension is in binary_extensions
    if (BINARY_EXTENSIONS.has(ext)) {
      return true;
    }

    // Check first 512 bytes for null bytes
    const sampleSize = Math.min(512, buffer.length);
    for (let i = 0; i < sampleSize; i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`Error checking if file is binary: ${error}`);
    return false;
  }
}

function shouldIgnoreFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  const dirPath = path.dirname(filePath);

  // Check if file matches any ignored_files pattern
  for (const pattern of IGNORED_FILES) {
    // Convert glob pattern to regex
    const regexPattern = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    if (regexPattern.test(fileName)) {
      return true;
    }
  }

  // Check if any parent directory matches ignored_directories
  const dirParts = dirPath.split(path.sep);
  if (dirParts.some(part => IGNORED_DIRECTORIES.has(part))) {
    return true;
  }

  // Check if file is hidden (starts with .)
  if (fileName.startsWith('.')) {
    return true;
  }

  return false;
}

function analyzeFileContent(filePath: string): [Array<[string, string]>, number] {
  if (!fs.existsSync(filePath)) {
    return [[], 0];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const functions: Array<[string, string]> = [];
    const ext = path.extname(filePath).toLowerCase();

    // Get language-specific function patterns
    const patterns = Object.entries(FUNCTION_PATTERNS)
      .filter(([key]) => key.includes(ext.slice(1)))
      .map(([_, pattern]) => new RegExp(pattern, 'g'));

    // Find functions
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && !IGNORED_KEYWORDS.has(match[1])) {
          functions.push([match[1], match[0]]);
        }
      }
    }

    return [functions, lines.length];
  } catch (error) {
    console.error(`Error analyzing file content: ${error}`);
    return [[], 0];
  }
}

export { isBinaryFile, shouldIgnoreFile, analyzeFileContent };