import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface FileCache {
  [filePath: string]: {
    content: string;
    hash: string;
    lastModified: number;
    functions: {
      [functionName: string]: {
        description: string;
        hash: string;
      };
    };
  };
}

interface ProjectCache {
  [projectId: string]: FileCache;
}

export class CacheManager {
  private cache: ProjectCache = {};
  private cacheDir: string;

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.brain', 'cache');
    this.ensureCacheDirectory();
  }

  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(projectId: string): string {
    return path.join(this.cacheDir, `${projectId}.json`);
  }

  private calculateHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  loadProjectCache(projectId: string): void {
    const cacheFile = this.getCacheFilePath(projectId);
    try {
      if (fs.existsSync(cacheFile)) {
        this.cache[projectId] = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      } else {
        this.cache[projectId] = {};
      }
    } catch (error) {
      console.warn(`Failed to load cache for project ${projectId}:`, error);
      this.cache[projectId] = {};
    }
  }

  saveProjectCache(projectId: string): void {
    const cacheFile = this.getCacheFilePath(projectId);
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(this.cache[projectId], null, 2));
    } catch (error) {
      console.warn(`Failed to save cache for project ${projectId}:`, error);
    }
  }

  hasFileChanged(projectId: string, filePath: string, content: string): boolean {
    if (!this.cache[projectId]) {
      this.loadProjectCache(projectId);
    }

    const currentHash = this.calculateHash(content);
    const cachedFile = this.cache[projectId][filePath];

    if (!cachedFile) {
      return true;
    }

    return cachedFile.hash !== currentHash;
  }

  hasFunctionChanged(
    projectId: string,
    filePath: string,
    functionName: string,
    functionContent: string
  ): boolean {
    if (!this.cache[projectId]) {
      this.loadProjectCache(projectId);
    }

    const cachedFile = this.cache[projectId][filePath];
    if (!cachedFile?.functions?.[functionName]) {
      return true;
    }

    const currentHash = this.calculateHash(functionContent);
    return cachedFile.functions[functionName].hash !== currentHash;
  }

  updateFileCache(
    projectId: string,
    filePath: string,
    content: string
  ): void {
    if (!this.cache[projectId]) {
      this.loadProjectCache(projectId);
    }

    this.cache[projectId][filePath] = {
      content,
      hash: this.calculateHash(content),
      lastModified: Date.now(),
      functions: this.cache[projectId][filePath]?.functions || {}
    };
    this.saveProjectCache(projectId);
  }

  updateFunctionCache(
    projectId: string,
    filePath: string,
    functionName: string,
    functionContent: string,
    description: string
  ): void {
    if (!this.cache[projectId]) {
      this.loadProjectCache(projectId);
    }

    if (!this.cache[projectId][filePath]) {
      this.cache[projectId][filePath] = {
        content: '',
        hash: '',
        lastModified: 0,
        functions: {}
      };
    }

    this.cache[projectId][filePath].functions[functionName] = {
      description,
      hash: this.calculateHash(functionContent)
    };
    this.saveProjectCache(projectId);
  }

  getCachedFileContent(projectId: string, filePath: string): string | null {
    if (!this.cache[projectId]) {
      this.loadProjectCache(projectId);
    }

    return this.cache[projectId][filePath]?.content || null;
  }

  getCachedFunctionDescription(
    projectId: string,
    filePath: string,
    functionName: string
  ): string | null {
    if (!this.cache[projectId]) {
      this.loadProjectCache(projectId);
    }

    return this.cache[projectId][filePath]?.functions?.[functionName]?.description || null;
  }

  clearProjectCache(projectId: string): void {
    const cacheFile = this.getCacheFilePath(projectId);
    try {
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
      }
      delete this.cache[projectId];
    } catch (error) {
      console.warn(`Failed to clear cache for project ${projectId}:`, error);
    }
  }
} 