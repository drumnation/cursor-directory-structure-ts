import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { detectProjectType, getFileTypeInfo, getProjectDescription } from '../src/project-detector';

const TEST_DIR = path.join(__dirname, 'test-project');

function createTestProjects() {
  // Create test directory if it doesn't exist
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  // Create Node.js project
  const nodeDir = path.join(TEST_DIR, 'node');
  fs.mkdirSync(nodeDir, { recursive: true });
  fs.writeFileSync(path.join(nodeDir, 'package.json'), JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    description: 'A test Node.js project'
  }));
  fs.writeFileSync(path.join(nodeDir, 'index.js'), 'console.log("test");');

  // Create Python project
  const pythonDir = path.join(TEST_DIR, 'python');
  fs.mkdirSync(pythonDir, { recursive: true });
  fs.writeFileSync(path.join(pythonDir, 'requirements.txt'), 'requests==2.31.0\npandas==2.1.0');
  fs.writeFileSync(path.join(pythonDir, 'main.py'), 'print("test")');

  // Create test files
  fs.writeFileSync(path.join(TEST_DIR, 'test.ts'), 'const x: number = 42;');
  fs.writeFileSync(path.join(TEST_DIR, 'test.js'), 'console.log("test");');
  fs.writeFileSync(path.join(TEST_DIR, 'test.py'), 'print("test")');
  fs.writeFileSync(path.join(TEST_DIR, 'test.xyz'), 'unknown file type');
}

function cleanupTestProjects() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe('detectProjectType', () => {
  test('setup', () => {
    createTestProjects();
  });

  test('should detect Node.js project', () => {
    const result = detectProjectType(path.join(TEST_DIR, 'node'));
    assert.strictEqual(result, 'javascript');
  });

  test('should detect Python project', () => {
    const result = detectProjectType(path.join(TEST_DIR, 'python'));
    assert.strictEqual(result, 'python');
  });

  test('should handle unknown project type', () => {
    const emptyDir = path.join(TEST_DIR, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });
    const result = detectProjectType(emptyDir);
    assert.strictEqual(result, 'generic');
  });

  test('cleanup', () => {
    cleanupTestProjects();
  });
});

describe('getFileTypeInfo', () => {
  test('should detect TypeScript files', () => {
    const result = getFileTypeInfo('test.ts');
    assert.deepStrictEqual(result, { fileType: 'code', language: 'typescript' });
  });

  test('should detect JavaScript files', () => {
    const result = getFileTypeInfo('test.js');
    assert.deepStrictEqual(result, { fileType: 'code', language: 'javascript' });
  });

  test('should detect Python files', () => {
    const result = getFileTypeInfo('test.py');
    assert.deepStrictEqual(result, { fileType: 'code', language: 'python' });
  });

  test('should handle unknown file types', () => {
    const result = getFileTypeInfo('test.xyz');
    assert.deepStrictEqual(result, { fileType: 'unknown', language: 'unknown' });
  });
});

describe('getProjectDescription', () => {
  test('setup', () => {
    createTestProjects();
  });

  test('should get Node.js project description', () => {
    const result = getProjectDescription(path.join(TEST_DIR, 'node'));
    assert.ok(result.description.includes('JavaScript'));
    assert.ok(result.name === 'test-project');
  });

  test('should get Python project description', () => {
    const result = getProjectDescription(path.join(TEST_DIR, 'python'));
    assert.ok(result.description.includes('Python'));
    assert.ok(result.name === 'python');
  });

  test('should handle unknown project type', () => {
    const emptyDir = path.join(TEST_DIR, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });
    const result = getProjectDescription(emptyDir);
    assert.ok(result.description.includes('generic'));
    assert.ok(result.name === 'empty');
  });

  test('cleanup', () => {
    cleanupTestProjects();
  });
}); 