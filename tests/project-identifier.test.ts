import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { determineProjectType, resolveFileTypeInfo, getProjectDescription } from '../src/project-identifier';
import { ProjectInfo } from '../src/types';

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

describe('determineProjectType', () => {
  test('setup', () => {
    createTestProjects();
  });

  test('should detect Node.js project', () => {
    const result = determineProjectType(path.join(TEST_DIR, 'node'));
    assert.strictEqual(result, 'javascript');
  });

  test('should detect Python project', () => {
    const result = determineProjectType(path.join(TEST_DIR, 'python'));
    assert.strictEqual(result, 'python');
  });

  test('should handle empty directory', () => {
    const emptyDir = path.join(TEST_DIR, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });
    const result = determineProjectType(emptyDir);
    assert.strictEqual(result, 'generic');
  });

  test('cleanup', () => {
    cleanupTestProjects();
  });
});

describe('resolveFileTypeInfo', () => {
  test('should detect TypeScript files', () => {
    const result = resolveFileTypeInfo('test.ts');
    assert.deepStrictEqual(result, { fileType: 'code', language: 'typescript' });
  });

  test('should detect JavaScript files', () => {
    const result = resolveFileTypeInfo('test.js');
    assert.deepStrictEqual(result, { fileType: 'code', language: 'javascript' });
  });

  test('should detect Python files', () => {
    const result = resolveFileTypeInfo('test.py');
    assert.deepStrictEqual(result, { fileType: 'code', language: 'python' });
  });

  test('should handle unknown file types', () => {
    const result = resolveFileTypeInfo('test.xyz');
    assert.deepStrictEqual(result, { fileType: 'unknown', language: 'unknown' });
  });
});

describe('getProjectDescription', () => {
  test('setup', () => {
    createTestProjects();
  });

  test('should return project info for Node.js project', () => {
    const result = getProjectDescription(path.join(TEST_DIR, 'node'));
    const expected: ProjectInfo = {
      name: 'node',
      version: '1.0.0',
      language: 'javascript',
      framework: 'unknown',
      type: 'javascript',
      description: 'javascript project'
    };
    assert.deepStrictEqual(result, expected);
  });

  test('should get Python project description', () => {
    const result = getProjectDescription(path.join(TEST_DIR, 'python'));
    const expected: ProjectInfo = {
      name: 'python',
      version: '1.0.0',
      language: 'python',
      framework: 'unknown',
      type: 'python',
      description: 'python project'
    };
    assert.deepStrictEqual(result, expected);
  });

  test('should handle unknown project type', () => {
    const emptyDir = path.join(TEST_DIR, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });
    const result = getProjectDescription(emptyDir);
    const expected: ProjectInfo = {
      name: 'empty',
      version: '1.0.0',
      language: 'unknown',
      framework: 'unknown',
      type: 'generic',
      description: 'unknown project'
    };
    assert.deepStrictEqual(result, expected);
  });

  test('cleanup', () => {
    cleanupTestProjects();
  });
}); 