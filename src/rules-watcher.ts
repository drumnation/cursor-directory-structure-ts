import * as fs from 'fs';
import * as path from 'path';
import { watch } from 'chokidar';
import { RulesGenerator } from './rules-generator';
import { generateDirectoryStructureContent } from './content-generator';
import { determineProjectType } from './project-identifier';

class RulesWatcher {
  private projectPath: string;
  private projectId: string;
  private rulesGenerator: RulesGenerator;
  private watcher: any;
  private lastUpdate: number;
  private updateDelay: number;
  private autoUpdate: boolean;
  private updateTimeout: NodeJS.Timeout | null;

  constructor(projectPath: string, projectId: string) {
    this.projectPath = projectPath;
    this.projectId = projectId;
    this.rulesGenerator = new RulesGenerator(projectPath);
    this.lastUpdate = 0;
    this.updateDelay = 5000; // 5 seconds delay between updates
    this.autoUpdate = false;
    this.updateTimeout = null;
    
    // Add error handling for missing directories
    if (!fs.existsSync(projectPath)) {
      console.warn(`[${projectId}] Warning: Project path does not exist: ${projectPath}`);
      return;
    }

    try {
      // Create .brain directory if it doesn't exist
      const brainDir = path.join(projectPath, '.brain');
      if (!fs.existsSync(brainDir)) {
        fs.mkdirSync(brainDir, { recursive: true });
      }

      // Only watch specific files and directories
      const watchPaths = [
        path.join(projectPath, 'src'),
        path.join(projectPath, '.brain'),
        path.join(projectPath, 'package.json'),
        path.join(projectPath, 'setup.py'),
        path.join(projectPath, 'requirements.txt'),
        path.join(projectPath, 'pyproject.toml')
      ].filter(p => fs.existsSync(p)); // Only watch paths that exist

      if (watchPaths.length === 0) {
        console.warn(`[${projectId}] Warning: No valid paths to watch in ${projectPath}`);
        return;
      }

      this.watcher = watch(watchPaths, {
        ignored: [
          /(^|[\/\\])\../,  // Ignore dotfiles
          '**/node_modules/**',
          '**/__pycache__/**',
          '**/venv/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/data/**',      // Ignore data directories
          '**/chrome_data/**', // Specifically ignore chrome_data
          '**/tmp/**',
          '**/temp/**',
          '**/logs/**',
          '**/coverage/**'
        ],
        persistent: true,
        ignoreInitial: true,
        depth: 1, // Only watch immediate subdirectories
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        }
      });

      this.watcher
        .on('add', this.handleFileChange.bind(this))
        .on('change', this.handleFileChange.bind(this))
        .on('unlink', this.handleFileChange.bind(this))
        .on('error', (error: Error) => {
          if ((error as any).code === 'ENOENT') {
            console.warn(`[${this.projectId}] Warning: Directory not found: ${(error as any).path}`);
          } else {
            console.error(`[${this.projectId}] Watcher error: ${error}`);
          }
        });

    } catch (error) {
      console.error(`[${this.projectId}] Error setting up watcher: ${error}`);
    }
  }

  private handleFileChange(event: string, filePath: string): void {
    if (!this.autoUpdate) return;

    if (!this.shouldProcessFile(filePath)) return;

    // Clear any existing timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Set a new timeout
    this.updateTimeout = setTimeout(() => {
      const now = Date.now();
      if (now - this.lastUpdate < this.updateDelay) {
        return; // Too soon since last update
      }

      this.lastUpdate = now;
      console.log(
        `[${this.projectId}] File ${event}: ${filePath}. Updating rules...`
      );
      this.updateRules();
      this.updateTimeout = null;
    }, 1000); // Wait 1 second after last change before updating
  }

  private shouldProcessFile(filePath: string): boolean {
    // Only process changes to directory-structure.md or project configuration files
    if (filePath.endsWith('directory-structure.md')) return true;

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
    if (this.watcher) {
      this.watcher.close();
      console.log(`[${this.projectId}] Stopped watching project`);
    }
  }
}

class ProjectWatcherManager {
  private watchers: { [projectId: string]: RulesWatcher };

  constructor() {
    this.watchers = {};
  }

  addProject(projectPath: string): string {
    const projectId = this.generateProjectId(projectPath);
    if (this.watchers[projectId]) {
      console.log(`Already watching project: ${projectId}`);
      return projectId;
    }

    if (!fs.existsSync(projectPath)) {
      console.warn(`Warning: Project path does not exist: ${projectPath}`);
      // Still create the watcher - it will handle the missing directory gracefully
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
