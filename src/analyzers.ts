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

  // Check if the path itself is in ignored_directories
  if (IGNORED_DIRECTORIES.has(fileName)) {
    return true;
  }

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
  for (const part of dirParts) {
    if (IGNORED_DIRECTORIES.has(part)) {
      return true;
    }
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
    const ext = path.extname(filePath).slice(1).toLowerCase(); // Remove the dot and convert to lowercase

    // Get language-specific function patterns
    const pattern = FUNCTION_PATTERNS[ext];
    if (pattern) {
      const regex = new RegExp(pattern, 'g');
      let match;
      while ((match = regex.exec(content)) !== null) {
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