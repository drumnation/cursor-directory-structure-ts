import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { ProjectMetrics, generateFocusContent } from '../src/content-generator';

const TEST_DIR = path.join(__dirname, 'test-project');

function createTestProject() {
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

  fs.writeFileSync(path.join(TEST_DIR, 'another.ts'), `
    function anotherFunction() {
      return true;
    }
  `);

  // Create subdirectory with a file
  const subDir = path.join(TEST_DIR, 'subdir');
  fs.mkdirSync(subDir, { recursive: true });
  fs.writeFileSync(path.join(subDir, 'sub.ts'), `
    function subFunction() {
      return 42;
    }
  `);

  // Create package.json to identify as a Node.js project
  fs.writeFileSync(path.join(TEST_DIR, 'package.json'), JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    description: 'A test project'
  }));
}

function cleanupTestProject() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe('ProjectMetrics', () => {
  test('should initialize with default values', () => {
    const metrics = new ProjectMetrics();
    assert.strictEqual(metrics.totalFiles, 0);
    assert.strictEqual(metrics.totalLines, 0);
    assert.deepStrictEqual(metrics.filesByType, {});
    assert.deepStrictEqual(metrics.linesByType, {});
    assert.deepStrictEqual(metrics.filesWithFunctions, []);
  });
});

describe('generateFocusContent', () => {
  test('setup', () => {
    createTestProject();
  });

  test('should generate focus content for test project', () => {
    const result = generateFocusContent(TEST_DIR);
    assert.ok(result.includes('# Project Focus:'));
    assert.ok(result.includes('**Project Type:**'));
    assert.ok(result.includes('**Description:**'));
    assert.ok(result.includes('test.ts'));
    assert.ok(result.includes('testFunction'));
  });

  test('should handle empty directories', () => {
    const emptyDir = path.join(TEST_DIR, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });
    const result = generateFocusContent(emptyDir);
    assert.ok(result.includes('# Project Focus:'));
    assert.ok(result.includes('**Files:** 0'));
  });

  test('should handle invalid paths', () => {
    const nonexistentPath = path.join(TEST_DIR, 'nonexistent');
    try {
      generateFocusContent(nonexistentPath);
      assert.fail('Expected error for nonexistent path');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.ok((error as Error).message.includes('ENOENT'));
    }
  });

  test('cleanup', () => {
    cleanupTestProject();
  });
}); 