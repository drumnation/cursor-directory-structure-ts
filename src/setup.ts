import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { scanForProjects, determineProjectType, ProjectInfo } from './project-identifier';
import { ProjectWatcherManager } from './rules-watcher';

const CONFIG_FILE = 'config.json';

function resolveProjectPath(projectPath: string): string {
  if (!projectPath) {
    return process.cwd();
  }
  return path.resolve(process.cwd(), projectPath);
}

async function displayMenu(): Promise<string> {
  console.log('\nCursor Directory Structure');
  console.log('1. Manage Projects');
  console.log('2. Scan Directory');
  console.log('3. Add Project');
  console.log('4. Exit');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) => {
    rl.question('\nSelect option (1-4): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function loadConfig(): any {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    } else {
      return { projects: [] };
    }
  } catch (err) {
    console.error('Error loading config:', err);
    return { projects: [] };
  }
}

function saveConfig(config: any): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('Configuration updated successfully.');
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

function manageProjects(): void {
  const config = loadConfig();
  const manager = new ProjectWatcherManager();

  if (config.projects.length === 0) {
    console.log('\nNo projects configured');
    return;
  }

  console.log('\nProjects:');
  config.projects.forEach((project: any, index: number) => {
    console.log(
      `${index + 1}. ${project.name} (${project.project_path})`
    );
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    '\nEnter project number to toggle, or press Enter to go back: ',
    (answer) => {
      rl.close();
      if (!answer) {
        return;
      }

      const index = parseInt(answer) - 1;
      if (index >= 0 && index < config.projects.length) {
        const project = config.projects[index];
        project.watch = !project.watch;
        if (project.watch) {
          manager.addProject(project.project_path);
          manager.setAutoUpdate(
            path.basename(project.project_path),
            true
          );
        } else {
          manager.removeProject(path.basename(project.project_path));
        }
        saveConfig(config);
      } else {
        console.log('Invalid project number');
      }
    }
  );
}

async function scanDirectory(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const directory = await new Promise<string>((resolve) => {
    rl.question('\nDirectory to scan (e.g., ".", "src"): ', (answer) => {
      resolve(resolveProjectPath(answer));
    });
  });

  rl.close();

  if (!fs.existsSync(directory)) {
    console.log('Directory not found');
    return;
  }

  console.log('\nScanning...');
  const projects = await scanForProjects(directory);

  if (projects.length === 0) {
    console.log('No projects found');
    return;
  }

  console.log('\nFound:');
  projects.forEach((project: ProjectInfo, index: number) => {
    console.log(
      `${index + 1}. ${project.name} (${project.type})`
    );
  });

  const config = loadConfig();
  const manager = new ProjectWatcherManager();

  const rl2 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const selectedProjects = await new Promise<number[]>((resolve) => {
    rl2.question(
      '\nSelect projects to add (numbers or "a" for all): ',
      (answer) => {
        if (answer.toLowerCase() === 'a') {
          resolve(projects.map((_: ProjectInfo, index: number) => index));
        } else {
          const indices = answer
            .split(',')
            .map((index) => parseInt(index.trim()) - 1)
            .filter((index) => index >= 0 && index < projects.length);
          resolve(indices);
        }
      }
    );
  });

  rl2.close();

  for (const index of selectedProjects) {
    const project = projects[index];
    const existingProject = config.projects.find(
      (p: any) => p.project_path === project.project_path
    );
    if (!existingProject) {
      config.projects.push({
        name: project.name,
        project_path: project.project_path || path.join(directory, project.name),
        type: project.type,
        watch: true,
      });
      manager.addProject(project.project_path || path.join(directory, project.name));
      manager.setAutoUpdate(project.name, true);
    }
  }

  saveConfig(config);
}

async function addNewProject(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const name = await new Promise<string>((resolve) => {
    rl.question('\nProject name: ', (name) => {
      resolve(name);
    });
  });

  const projectPath = await new Promise<string>((resolve) => {
    rl.question('Project path (e.g., ".", "src"): ', (path) => {
      resolve(resolveProjectPath(path));
    });
  });

  const type = await new Promise<string>((resolve) => {
    rl.question(
      'Project type (or Enter to auto-detect): ',
      (type) => {
        resolve(type);
      }
    );
  });

  rl.close();

  if (!fs.existsSync(projectPath)) {
    console.log(`\nPath not found: ${projectPath}`);
    return;
  }

  const config = loadConfig();
  const manager = new ProjectWatcherManager();

  config.projects.push({
    name,
    project_path: projectPath,
    type: type || determineProjectType(projectPath),
    watch: true,
  });
  manager.addProject(projectPath);
  manager.setAutoUpdate(name, true);
  saveConfig(config);
}

async function setupDirectoryStructure(): Promise<void> {
  while (true) {
    const choice = await displayMenu();
    switch (choice) {
      case '1':
        manageProjects();
        break;
      case '2':
        await scanDirectory();
        break;
      case '3':
        await addNewProject();
        break;
      case '4':
        console.log('Exiting...');
        return;
      default:
        console.log('Invalid option.');
    }
  }
}

if (require.main === module) {
  setupDirectoryStructure();
}
