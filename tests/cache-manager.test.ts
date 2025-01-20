import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CacheManager } from '../src/cache-manager';
import * as fs from 'node:fs';
import * as path from 'node:path';

class MockFileSystem {
  private files: Map<string, { content: string; mtime: Date }> = new Map();
  private directories: Set<string>;

  constructor() {
    this.directories = new Set();
    this.directories.add('.brain');
  }

  existsSync(filePath: fs.PathLike): boolean {
    const path = filePath.toString();
    return this.files.has(path) || this.directories.has(path);
  }

  writeFileSync(filePath: fs.PathLike, content: string): void {
    // Ensure parent directory exists
    const dir = path.dirname(filePath.toString());
    this.directories.add(dir);
    this.files.set(filePath.toString(), { content, mtime: new Date() });
  }

  readFileSync(filePath: fs.PathLike): string {
    const file = this.files.get(filePath.toString());
    if (!file) {
      if (filePath.toString().endsWith('cache.json')) {
        return '{}';
      }
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    return file.content;
  }

  statSync(filePath: fs.PathLike): { mtime: Date } {
    const file = this.files.get(filePath.toString());
    if (!file) {
      throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
    }
    return { mtime: file.mtime };
  }

  unlinkSync(filePath: fs.PathLike): void {
    this.files.delete(filePath.toString());
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
    this.directories.add('.brain');
  }
}

describe('CacheManager', () => {
  const mockFs = new MockFileSystem();
  const mockProjectId = 'test-project';
  let cacheManager: CacheManager;

  beforeEach(() => {
    mockFs.clear();
    const fsProxy = new Proxy({}, {
      get: (target, prop) => {
        if (prop in mockFs) {
          return (mockFs as any)[prop].bind(mockFs);
        }
        return (fs as any)[prop];
      }
    });

    cacheManager = new CacheManager();
    (cacheManager as any).fs = fsProxy;
    (cacheManager as any).cacheDir = '.brain/cache';
    cacheManager.loadProjectCache(mockProjectId);
  });

  describe('File Change Detection', () => {
    it('should detect changes based on file path and timestamp', () => {
      const file1Path = 'src/file1.ts';
      const file2Path = 'src/file2.ts';
      const content = 'same content';

      // Initial setup
      mockFs.writeFileSync(file1Path, content);
      mockFs.writeFileSync(file2Path, content);

      // First check should indicate change since cache is empty
      assert.strictEqual(cacheManager.hasFileChanged(mockProjectId, file1Path, content), true);
      assert.strictEqual(cacheManager.hasFileChanged(mockProjectId, file2Path, content), true);

      // Update cache for both files
      cacheManager.updateFileCache(mockProjectId, file1Path, content);
      cacheManager.updateFileCache(mockProjectId, file2Path, content);

      // No changes yet
      assert.strictEqual(cacheManager.hasFileChanged(mockProjectId, file1Path, content), false);
      assert.strictEqual(cacheManager.hasFileChanged(mockProjectId, file2Path, content), false);

      // Modify file1
      mockFs.writeFileSync(file1Path, 'new content');

      // Only file1 should show as changed
      assert.strictEqual(cacheManager.hasFileChanged(mockProjectId, file1Path, 'new content'), true);
      assert.strictEqual(cacheManager.hasFileChanged(mockProjectId, file2Path, content), false);
    });
  });

  describe('Cache Operations', () => {
    it('should save and load cache based on file paths', () => {
      const file1Path = 'src/file1.ts';
      const file2Path = 'src/file2.ts';
      const content = 'same content';

      // Set up initial cache
      mockFs.writeFileSync(file1Path, content);
      mockFs.writeFileSync(file2Path, content);
      cacheManager.updateFileCache(mockProjectId, file1Path, content);
      cacheManager.updateFileCache(mockProjectId, file2Path, content);

      // Verify cache content
      assert.strictEqual(cacheManager.getCachedFileContent(mockProjectId, file1Path), content);
      assert.strictEqual(cacheManager.getCachedFileContent(mockProjectId, file2Path), content);
    });
  });

  describe('Function Cache', () => {
    it('should cache functions based on their location', () => {
      const file1Path = 'src/file1.ts';
      const file2Path = 'src/file2.ts';
      const functionName = 'testFunction';
      const functionContent = 'function testFunction() {}';
      const description = 'Test function description';

      // Create the files in our mock filesystem
      mockFs.writeFileSync(file1Path, functionContent);
      mockFs.writeFileSync(file2Path, functionContent);

      // Cache same function in different files
      cacheManager.updateFunctionCache(
        mockProjectId,
        file1Path,
        functionName,
        functionContent,
        description
      );

      cacheManager.updateFunctionCache(
        mockProjectId,
        file2Path,
        functionName,
        functionContent,
        description
      );

      // Each function should be cached separately based on its location
      assert.strictEqual(
        cacheManager.getCachedFunctionDescription(mockProjectId, file1Path, functionName),
        description
      );
      assert.strictEqual(
        cacheManager.getCachedFunctionDescription(mockProjectId, file2Path, functionName),
        description
      );

      // Function in non-existent location should return null
      assert.strictEqual(
        cacheManager.getCachedFunctionDescription(mockProjectId, 'src/nonexistent.ts', functionName),
        null
      );
    });

    it('should detect function changes based on location', () => {
      const file1Path = 'src/file1.ts';
      const file2Path = 'src/file2.ts';
      const functionName = 'testFunction';
      const functionContent = 'function testFunction() {}';
      const description = 'Test function description';

      // Create the files in our mock filesystem
      mockFs.writeFileSync(file1Path, functionContent);
      mockFs.writeFileSync(file2Path, functionContent);

      // Cache same function in different files
      cacheManager.updateFunctionCache(
        mockProjectId,
        file1Path,
        functionName,
        functionContent,
        description
      );

      cacheManager.updateFunctionCache(
        mockProjectId,
        file2Path,
        functionName,
        functionContent,
        description
      );

      // Same function content in different locations should be tracked separately
      assert.strictEqual(
        cacheManager.hasFunctionChanged(mockProjectId, file1Path, functionName, functionContent),
        false
      );
      assert.strictEqual(
        cacheManager.hasFunctionChanged(mockProjectId, file2Path, functionName, functionContent),
        false
      );

      // Changing content in one location shouldn't affect the other
      const newContent = 'function testFunction() { return true; }';
      assert.strictEqual(
        cacheManager.hasFunctionChanged(mockProjectId, file1Path, functionName, newContent),
        true
      );
      assert.strictEqual(
        cacheManager.hasFunctionChanged(mockProjectId, file2Path, functionName, functionContent),
        false
      );
    });
  });

  describe('Cache Clearing', () => {
    it('should clear all cached paths for a project', () => {
      const file1Path = 'src/file1.ts';
      const file2Path = 'src/file2.ts';
      const content = 'test content';

      // Create the files in our mock filesystem
      mockFs.writeFileSync(file1Path, content);
      mockFs.writeFileSync(file2Path, content);

      // Add cache entries for multiple files
      cacheManager.updateFileCache(mockProjectId, file1Path, content);
      cacheManager.updateFileCache(mockProjectId, file2Path, content);

      // Clear cache
      cacheManager.clearProjectCache(mockProjectId);

      // All cached content should be cleared
      assert.strictEqual(cacheManager.getCachedFileContent(mockProjectId, file1Path), null);
      assert.strictEqual(cacheManager.getCachedFileContent(mockProjectId, file2Path), null);
    });
  });
}); 