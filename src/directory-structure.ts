// directory-structure.ts
import * as fs from 'fs';
import * as path from 'path';
import { DateTime } from 'luxon';
import { loadConfig, UPDATE_INTERVAL } from './config';
import { generateDirectoryStructureContent } from './content-generator';
import { RulesAnalyzer } from './rules-analyzer';
import { RulesGenerator } from './rules-generator';
import { ProjectWatcherManager } from './rules-watcher';
import { AutoUpdater } from './auto-updater';

interface ProjectConfig {
  name: string;
  project_path: string;
  update_interval?: number;
  max_depth?: number;
}

function getParentDirectory(): string {
  return path.join(__dirname, '..');
}

function getDefaultConfig(): any {
  return {
    project_path: getParentDirectory(),
    update_interval: UPDATE_INTERVAL,
    max_depth: 3,
    ignored_directories: [
      '__pycache__',
      'node_modules',
      'venv',
      '.git',
      '.idea',
      '.vscode',
      'dist',
      'build',
      'CursorFocus',
    ],
    ignored_files: ['.DS_Store', '*.pyc', '*.pyo'],
    binary_extensions: [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.ico',
      '.pdf',
      '.exe',
      '.bin',
    ],
    file_length_standards: {
      '.js': 300,
      '.jsx': 250,
      '.ts': 300,
      '.tsx': 250,
      '.py': 400,
      '.css': 400,
      '.scss': 400,
      '.less': 400,
      '.sass': 400,
      '.html': 300,
      '.vue': 250,
      '.svelte': 250,
      '.json': 100,
      '.yaml': 100,
      '.yml': 100,
      '.toml': 100,
      '.md': 500,
      '.rst': 500,
      '.php': 400,
      '.phtml': 300,
      '.ctp': 300,
      '.swift': 300,
      '.kt': 300,
      default: 300,
    },
    file_length_thresholds: {
      warning: 1.0,
      critical: 1.5,
      severe: 2.0,
    },
    project_types: {
      chrome_extension: {
        indicators: ['manifest.json'],
        required_files: [],
        description: 'Chrome Extension',
      },
      node_js: {
        indicators: ['package.json'],
        required_files: [],
        description: 'Node.js Project',
      },
      python: {
        indicators: ['setup.py', 'pyproject.toml'],
        required_files: [],
        description: 'Python Project',
      },
      react: {
        indicators: [],
        required_files: ['src/App.js', 'src/index.js'],
        description: 'React Application',
      },
    },
  };
}

function setupDirectoryStructure(projectPath: string, projectName: string): void {
  try {
    // Create .brain directory if it doesn't exist
    const brainDir = path.join(projectPath, '.brain');
    if (!fs.existsSync(brainDir)) {
      fs.mkdirSync(brainDir, { recursive: true });
    }

    // Only analyze specific paths
    const validPaths = [
      path.join(projectPath, 'src'),
      path.join(projectPath, '.brain'),
      path.join(projectPath, 'package.json'),
      path.join(projectPath, 'setup.py'),
      path.join(projectPath, 'requirements.txt'),
      path.join(projectPath, 'pyproject.toml')
    ].filter(p => fs.existsSync(p));

    if (validPaths.length === 0) {
      console.warn(`[${projectName}] Warning: No valid paths found in ${projectPath}`);
      return;
    }

    const rulesGenerator = new RulesGenerator(projectPath);
    const rulesAnalyzer = new RulesAnalyzer(projectPath);

    const projectInfo = rulesAnalyzer.analyzeProjectForRules();
    rulesGenerator.generateRules();

    // Generate content and save directory structure
    generateDirectoryStructureContent(projectPath);

    console.log(
      `✅ [${projectName}] Directory structure analysis completed at ${DateTime.now().toFormat(
        'yyyy-MM-dd HH:mm:ss'
      )}`
    );
  } catch (error) {
    console.warn(`[${projectName}] Warning: Error setting up directory structure: ${error}`);
  }
}

function monitorProject(project: ProjectConfig, config: any): void {
  const projectPath = project.project_path;
  const projectName = project.name;

  console.log(
    `🔍 [${projectName}] Initial directory structure analysis at ${DateTime.now().toFormat(
      'yyyy-MM-dd HH:mm:ss'
    )}`
  );

  try {
    // Create .brain directory if it doesn't exist
    const brainDir = path.join(projectPath, '.brain');
    if (!fs.existsSync(brainDir)) {
      fs.mkdirSync(brainDir, { recursive: true });
    }

    // Generate initial content
    generateDirectoryStructureContent(projectPath);

    console.log(
      `✅ [${projectName}] Directory structure generated at ${DateTime.now().toFormat(
        'yyyy-MM-dd HH:mm:ss'
      )}`
    );
  } catch (error) {
    console.warn(`[${projectName}] Warning: Error generating directory structure: ${error}`);
  }
}

async function main(): Promise<void> {
  let config = loadConfig();
  if (!config) {
    console.log('No config.json found');
    config = getDefaultConfig();
  }

  if (!config.projects) {
    config.projects = [
      {
        name: 'Default Project',
        project_path: config.project_path,
        update_interval: config.update_interval || 60,
        max_depth: config.max_depth || 3,
      },
    ];
  }

  const manager = new ProjectWatcherManager();

  try {
    for (const project of config.projects) {
      const absolutePath = path.resolve(project.project_path);
      
      // Check specific paths instead of the entire project path
      const validPaths = [
        path.join(absolutePath, 'src'),
        path.join(absolutePath, '.brain'),
        path.join(absolutePath, 'package.json'),
        path.join(absolutePath, 'setup.py'),
        path.join(absolutePath, 'requirements.txt'),
        path.join(absolutePath, 'pyproject.toml')
      ].filter(p => fs.existsSync(p));

      if (validPaths.length > 0) {
        // Create .brain directory if it doesn't exist
        const brainDir = path.join(absolutePath, '.brain');
        if (!fs.existsSync(brainDir)) {
          fs.mkdirSync(brainDir, { recursive: true });
        }

        // Do initial setup and start watching
        setupDirectoryStructure(absolutePath, project.name);
        manager.addProject(absolutePath);
        manager.setAutoUpdate(project.name, true);
        monitorProject({
          ...project,
          project_path: absolutePath
        }, config);
      } else {
        console.log(`⚠️ No valid paths found in: ${absolutePath}`);
      }
    }

    const projectList = manager.listProjects();
    if (projectList.length === 0) {
      console.log('❌ No projects to monitor');
      return;
    }

    console.log(
      `\n📝 Monitoring ${projectList.length} ${projectList.length === 1 ? 'project' : 'projects'}`
    );

    process.on('SIGINT', () => {
      console.log('\nStopping monitoring...');
      manager.stopAll();
      process.exit(0);
    });
  } catch (error) {
    console.error(`\n❌ Error: ${error}`);
  }
}

if (require.main === module) {
  main();
}