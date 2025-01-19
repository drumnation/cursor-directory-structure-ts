// Load environment variables first
import * as dotenv from 'dotenv';
dotenv.config();

// directory-structure.ts
import * as fs from 'fs';
import * as path from 'path';
import { DateTime } from 'luxon';
import { loadConfig, UPDATE_INTERVAL } from './config';
import { generateDirectoryStructureContent } from './content-generator';
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
      'cursor-directory-structure',
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
    ].filter(p => {
      try {
        return fs.existsSync(p);
      } catch (error) {
        // Silently skip paths we can't access
        return false;
      }
    });

    if (validPaths.length === 0) {
      console.warn(`[${projectName}] Warning: No valid paths found in ${projectPath}`);
      return;
    }

    try {
      // Generate content and save directory structure
      generateDirectoryStructureContent(projectPath);

      console.log(
        `✅ [${projectName}] Directory structure analysis completed at ${DateTime.now().toFormat(
          'yyyy-MM-dd HH:mm:ss'
        )}`
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Silently skip ENOENT errors for ignored directories
        return;
      }
      console.warn(`[${projectName}] Warning: Error generating directory structure: ${error}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Silently skip ENOENT errors for ignored directories
      return;
    }
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

    try {
      // Generate initial content
      generateDirectoryStructureContent(projectPath);

      console.log(
        `✅ [${projectName}] Directory structure generated at ${DateTime.now().toFormat(
          'yyyy-MM-dd HH:mm:ss'
        )}`
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Silently skip ENOENT errors for ignored directories
        return;
      }
      console.warn(`[${projectName}] Warning: Error generating directory structure: ${error}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Silently skip ENOENT errors for ignored directories
      return;
    }
    console.warn(`[${projectName}] Warning: Error generating directory structure: ${error}`);
  }
}

async function main() {
  // Get target project path from command line args or use current directory
  const targetProjectPath = process.argv[2] || process.cwd();
  console.log('Target project path:', targetProjectPath);

  try {
    // Start watching the project - this will handle the initial generation
    console.log(`Started watching project: ${path.basename(targetProjectPath)}`);
    monitorProject({
      name: path.basename(targetProjectPath),
      project_path: targetProjectPath,
      update_interval: 60,
      max_depth: 3
    }, getDefaultConfig());
    console.log(`[${path.basename(targetProjectPath)}] Auto-update enabled`);

    // Keep the process running
    console.log('\n📝 Monitoring 1 project');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}