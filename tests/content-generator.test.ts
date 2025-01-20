import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { ProjectMetrics, generateDirectoryStructureContent } from '../src/content-generator';

const TEST_DIR = path.join(__dirname, 'test-project');

function createTestProject() {
  // Clean up any existing test directory
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }

  // Create test directory
  fs.mkdirSync(TEST_DIR, { recursive: true });

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
  }, null, 2));

  // Create empty directory for empty directory test
  const emptyDir = path.join(TEST_DIR, 'empty');
  fs.mkdirSync(emptyDir, { recursive: true });
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

describe('generateDirectoryStructureContent', () => {
  test('setup', () => {
    createTestProject();
  });

  test('should generate directory structure content for test project', async () => {
    const result = await generateDirectoryStructureContent(TEST_DIR);
    assert.ok(result && typeof result === 'string', 'Result should be a string');
    assert.ok(result.includes('Directory Structure'), 'Should include directory structure heading');
    assert.ok(result.includes('test.ts'), 'Should include test.ts file');
    assert.ok(result.includes('subdir'), 'Should include subdir directory');
  });

  test('should handle empty directories', async () => {
    const emptyDir = path.join(TEST_DIR, 'empty');
    const result = await generateDirectoryStructureContent(emptyDir);
    assert.ok(result && typeof result === 'string', 'Result should be a string');
    assert.ok(result.includes('Directory Structure'), 'Should include directory structure heading');
  });

  test('should handle invalid paths', async () => {
    const nonexistentPath = path.join(TEST_DIR, 'nonexistent');
    await assert.rejects(async () => {
      await generateDirectoryStructureContent(nonexistentPath);
    }, /ENOENT/);
  });

  test('cleanup', () => {
    cleanupTestProject();
  });
}); 