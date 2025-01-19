import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { analyzeFileContent, shouldIgnoreFile, isBinaryFile } from '../src/analyzers';

const TEST_DIR = path.join(__dirname, 'test-files');

function createTestFiles() {
  // Create test directory if it doesn't exist
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  // Create test files
  fs.writeFileSync(path.join(TEST_DIR, 'test.ts'), `
function testFunction() {
  console.log('test');
}
`);

  fs.writeFileSync(path.join(TEST_DIR, 'test.txt'), 'This is a text file\n');
  fs.writeFileSync(path.join(TEST_DIR, 'test.bin'), Buffer.from([0x89, 0x50, 0x4E, 0x47]));
  fs.writeFileSync(path.join(TEST_DIR, '.hidden'), 'hidden file\n');
}

function cleanupTestFiles() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe('analyzeFileContent', () => {
  test('setup', () => {
    createTestFiles();
  });

  test('should detect functions in TypeScript file', () => {
    const [functions, lineCount] = analyzeFileContent(path.join(TEST_DIR, 'test.ts'));
    assert.ok(functions.length > 0);
    assert.ok(functions.some(([name]) => name === 'testFunction'));
    assert.ok(lineCount > 0);
  });

  test('should handle non-existent files', () => {
    const [functions, lineCount] = analyzeFileContent(path.join(TEST_DIR, 'nonexistent.ts'));
    assert.deepStrictEqual(functions, []);
    assert.strictEqual(lineCount, 0);
  });

  test('cleanup', () => {
    cleanupTestFiles();
  });
});

describe('shouldIgnoreFile', () => {
  test('should ignore node_modules directory', () => {
    assert.ok(shouldIgnoreFile('node_modules'));
  });

  test('should ignore hidden files', () => {
    assert.ok(shouldIgnoreFile('.hidden'));
  });

  test('should not ignore regular files', () => {
    assert.ok(!shouldIgnoreFile('test.ts'));
  });
});

describe('isBinaryFile', () => {
  test('setup', () => {
    createTestFiles();
  });

  test('should detect binary files', () => {
    const result = isBinaryFile(path.join(TEST_DIR, 'test.bin'));
    assert.ok(result);
  });

  test('should not detect text files as binary', () => {
    const result = isBinaryFile(path.join(TEST_DIR, 'test.txt'));
    assert.ok(!result);
  });

  test('should handle non-existent files', () => {
    const result = isBinaryFile(path.join(TEST_DIR, 'nonexistent.bin'));
    assert.ok(!result);
  });

  test('cleanup', () => {
    cleanupTestFiles();
  });
}); 