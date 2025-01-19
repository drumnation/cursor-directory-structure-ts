import * as fs from 'fs';
import * as path from 'path';
import { FSWatcher, watch } from 'chokidar';
import { RulesGenerator } from './rules-generator';
import { determineProjectType } from './project-identifier';

class RulesWatcher {
  private projectPath: string;
  private projectId: string;
  private rulesGenerator: RulesGenerator;
  private lastUpdate: number;
  private updateDelay: number;
  private autoUpdate: boolean;
  private watcher: FSWatcher;

  constructor(projectPath: string, projectId: string) {
    this.projectPath = projectPath;
    this.projectId = projectId;
    this.rulesGenerator = new RulesGenerator(projectPath);
    this.lastUpdate = 0;
    this.updateDelay = 5; // Seconds to wait before updating
    this.autoUpdate = false; // Disable auto-update by default
    this.watcher = watch(projectPath, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      depth: 99, // Recursively watch all subdirectories
    });

    this.watcher
      .on('add', (path) => this.onFileChange('add', path))
      .on('change', (path) => this.onFileChange('change', path))
      .on('unlink', (path) => this.onFileChange('unlink', path))
      .on('addDir', (path) => this.onDirectoryChange('addDir', path))
      .on('unlinkDir', (path) => this.onDirectoryChange('unlinkDir', path))
      .on('error', (error) => console.error(`Watcher error: ${error}`));
  }

  private onFileChange(event: string, filePath: string): void {
    if (!this.autoUpdate) return;

    if (!this.shouldProcessFile(filePath)) return;

    const now = Date.now();
    if (now - this.lastUpdate < this.updateDelay * 1000) {
      return; // Too soon since last update
    }

    this.lastUpdate = now;
    console.log(
      `[${this.projectId}] File ${event}: ${filePath}. Updating rules...`
    );
    this.updateRules();
  }

  private onDirectoryChange(event: string, dirPath: string): void {
    if (!this.autoUpdate) return;

    const now = Date.now();
    if (now - this.lastUpdate < this.updateDelay * 1000) {
      return; // Too soon since last update
    }

    this.lastUpdate = now;
    console.log(
      `[${this.projectId}] Directory ${event}: ${dirPath}. Updating rules...`
    );
    this.updateRules();
  }

  private shouldProcessFile(filePath: string): boolean {
    // Only process changes to Focus.md or project configuration files
    if (filePath.endsWith('Focus.md')) return true;

    const projectType = determineProjectType(this.projectPath);
    switch (projectType) {
      case 'javascript':
        return filePath.endsWith('package.json');
      case 'typescript':
        return filePath.endsWith('package.json');
      case 'python':
        return filePath.endsWith('setup.py') || filePath.endsWith('requirements.txt');
      case 'go':
        return filePath.endsWith('go.mod') || filePath.endsWith('go.sum');
      case 'rust':
        return filePath.endsWith('Cargo.toml');
      case 'java':
        return filePath.endsWith('pom.xml') || filePath.endsWith('build.gradle');
      default:
        return false;
    }
  }

  private async updateRules(): Promise<void> {
    try {
      const rules = await this.rulesGenerator.generateRules();
      const rulesPath = path.join(this.projectPath, '.cursorrules.json');
      fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2));
      console.log(`[${this.projectId}] Updated .cursorrules.json`);
    } catch (error) {
      console.error(
        `[${this.projectId}] Error updating rules: ${error}`
      );
    }
  }

  public setAutoUpdate(enabled: boolean): void {
    this.autoUpdate = enabled;
    console.log(
      `[${this.projectId}] Auto-update ${
        enabled ? 'enabled' : 'disabled'
      }`
    );
  }

  public stop(): void {
    this.watcher.close();
    console.log(`[${this.projectId}] Stopped watching project`);
  }
}

class ProjectWatcherManager {
  private watchers: { [projectId: string]: RulesWatcher };

  constructor() {
    this.watchers = {};
  }

  addProject(projectPath: string): string {
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const projectId = this.generateProjectId(projectPath);
    if (this.watchers[projectId]) {
      console.log(`Already watching project: ${projectId}`);
      return projectId;
    }

    const watcher = new RulesWatcher(projectPath, projectId);
    this.watchers[projectId] = watcher;
    console.log(`Started watching project: ${projectId}`);
    return projectId;
  }

  removeProject(projectId: string): void {
    const watcher = this.watchers[projectId];
    if (watcher) {
      watcher.stop();
      delete this.watchers[projectId];
      console.log(`Removed project: ${projectId}`);
    } else {
      console.log(`Project not found: ${projectId}`);
    }
  }

  getWatcher(projectId: string): RulesWatcher | undefined {
    return this.watchers[projectId];
  }

  listProjects(): string[] {
    return Object.keys(this.watchers);
  }

  setAutoUpdate(projectId: string, enabled: boolean): void {
    const watcher = this.watchers[projectId];
    if (watcher) {
      watcher.setAutoUpdate(enabled);
    } else {
      console.log(`Project ${projectId} is not being watched`);
    }
  }

  private generateProjectId(projectPath: string): string {
    return path.basename(projectPath);
  }

  stopAll(): void {
    for (const projectId in this.watchers) {
      this.watchers[projectId].stop();
    }
    this.watchers = {};
    console.log('Stopped all watchers');
  }
}

function startWatching(projectPaths: string | string[]): void {
  const manager = new ProjectWatcherManager();

  if (typeof projectPaths === 'string') {
    projectPaths = [projectPaths];
  }

  for (const projectPath of projectPaths) {
    manager.addProject(projectPath);
  }

  process.on('SIGINT', () => {
    console.log('\nStopping watchers...');
    manager.stopAll();
    process.exit(0);
  });
}

export { RulesWatcher, ProjectWatcherManager, startWatching };
