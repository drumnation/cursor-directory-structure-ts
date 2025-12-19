/**
 * Brain Garden Monorepo Adapter
 *
 * Adapts the directory-structure generator for Brain Garden's specific structure:
 * - apps/ (Trunk Electron, Tendril Web, API, etc.)
 * - packages/ (shared libraries)
 * - docs/features/ (GROVE planning phases)
 * - tooling/ (build tools, templates)
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import { AIService, FREE_MODELS } from './ai-service.js';
import { CODE_EXTENSIONS, IGNORED_DIRECTORIES } from './config';
import { analyzeFileContent } from './analyzers';

// Brain Garden specific directories to categorize
const BRAIN_GARDEN_CATEGORIES = {
  apps: {
    description: 'Applications - Deployable units',
    subCategories: {
      trunk: 'Electron desktop app - Main Claude Code UI',
      tendril: 'Web/mobile client - Tailwind-based',
      api: 'Express REST API backend',
      storybook: 'Component development and testing',
      design: 'Design system and Figma integration',
      playground: 'Experimental features',
      vine: 'Browser automation tools',
    }
  },
  packages: {
    description: 'Shared libraries - Reusable code',
    subCategories: {
      'shared-ui': 'Mantine-based UI components',
      'shared-types': 'TypeScript type definitions',
      'session-intelligence': 'Agent session management',
    }
  },
  docs: {
    description: 'Documentation and planning',
    subCategories: {
      features: 'GROVE feature planning (phases 00-08)',
      bugs: 'Bug tracking and resolution',
      maintenance: 'Technical debt and upgrades',
      borg: 'External code assimilation',
    }
  },
  tooling: {
    description: 'Build tools and templates',
  },
};

// GROVE phases for feature documentation
const GROVE_PHASES = {
  '00-research': 'Research and discovery',
  '01-planning': 'PRD and design documents',
  '02-design': 'Technical architecture',
  '03-stories': 'User stories and acceptance criteria',
  '04-development': 'Implementation phase',
  '05-testing': 'Test coverage and QA',
  '06-documentation': 'User and developer docs',
  '07-release': 'Deployment and rollout',
  '08-post-launch': 'Monitoring and iteration',
};

interface MonorepoMetrics {
  totalFiles: number;
  totalLines: number;
  apps: { [name: string]: AppMetrics };
  packages: { [name: string]: PackageMetrics };
  groveFeatures: GroveFeature[];
}

interface AppMetrics {
  files: number;
  lines: number;
  type: string;
  description: string;
}

interface PackageMetrics {
  files: number;
  lines: number;
  description: string;
}

interface GroveFeature {
  name: string;
  path: string;
  currentPhase: string;
  hasPlanning: boolean;
  hasDesign: boolean;
  hasStories: boolean;
}

function getMonorepoRoot(): string {
  // Start from current directory and traverse up to find monorepo root
  let currentDir = process.cwd();
  while (currentDir !== '/') {
    // Check for Brain Garden markers
    const hasApps = fs.existsSync(path.join(currentDir, 'apps'));
    const hasPackages = fs.existsSync(path.join(currentDir, 'packages'));
    const hasTurbo = fs.existsSync(path.join(currentDir, 'turbo.json'));

    if (hasApps && hasPackages && hasTurbo) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return process.cwd();
}

function scanApps(rootPath: string): { [name: string]: AppMetrics } {
  const appsDir = path.join(rootPath, 'apps');
  const result: { [name: string]: AppMetrics } = {};

  if (!fs.existsSync(appsDir)) return result;

  const apps = fs.readdirSync(appsDir).filter(name => {
    const appPath = path.join(appsDir, name);
    return fs.statSync(appPath).isDirectory() && !name.startsWith('.');
  });

  for (const appName of apps) {
    const appPath = path.join(appsDir, appName);
    const metrics = scanDirectory(appPath);
    const subCategory = (BRAIN_GARDEN_CATEGORIES.apps.subCategories as any)[appName];

    result[appName] = {
      files: metrics.files,
      lines: metrics.lines,
      type: detectAppType(appPath),
      description: subCategory || `Application: ${appName}`,
    };
  }

  return result;
}

function scanPackages(rootPath: string): { [name: string]: PackageMetrics } {
  const packagesDir = path.join(rootPath, 'packages');
  const result: { [name: string]: PackageMetrics } = {};

  if (!fs.existsSync(packagesDir)) return result;

  const packages = fs.readdirSync(packagesDir).filter(name => {
    const pkgPath = path.join(packagesDir, name);
    return fs.statSync(pkgPath).isDirectory() && !name.startsWith('.');
  });

  for (const pkgName of packages) {
    const pkgPath = path.join(packagesDir, pkgName);
    const metrics = scanDirectory(pkgPath);
    const subCategory = (BRAIN_GARDEN_CATEGORIES.packages.subCategories as any)[pkgName];

    result[pkgName] = {
      files: metrics.files,
      lines: metrics.lines,
      description: subCategory || readPackageDescription(pkgPath) || `Package: ${pkgName}`,
    };
  }

  return result;
}

function scanGroveFeatures(rootPath: string): GroveFeature[] {
  const featuresDir = path.join(rootPath, 'docs', 'features');
  const features: GroveFeature[] = [];

  if (!fs.existsSync(featuresDir)) return features;

  const featureDirs = fs.readdirSync(featuresDir).filter(name => {
    const featurePath = path.join(featuresDir, name);
    return fs.statSync(featurePath).isDirectory() && !name.startsWith('.');
  });

  for (const featureName of featureDirs) {
    const featurePath = path.join(featuresDir, featureName);
    const phases = fs.readdirSync(featurePath).filter(name => name.match(/^\d{2}-/));

    features.push({
      name: featureName,
      path: featurePath,
      currentPhase: detectCurrentPhase(phases),
      hasPlanning: fs.existsSync(path.join(featurePath, '01-planning')),
      hasDesign: fs.existsSync(path.join(featurePath, '02-design')),
      hasStories: fs.existsSync(path.join(featurePath, '03-stories')) ||
                  fs.existsSync(path.join(featurePath, '01-planning', 'stories')),
    });
  }

  return features;
}

function detectCurrentPhase(phases: string[]): string {
  // Find the highest phase that has content
  const sortedPhases = phases.sort().reverse();
  for (const phase of sortedPhases) {
    if (GROVE_PHASES[phase as keyof typeof GROVE_PHASES]) {
      return phase;
    }
  }
  return '00-research';
}

function detectAppType(appPath: string): string {
  const packageJsonPath = path.join(appPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return 'unknown';

  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps['electron']) return 'electron';
    if (deps['@mantine/core']) return 'mantine-web';
    if (deps['tailwindcss']) return 'tailwind-web';
    if (deps['express']) return 'express-api';
    if (deps['@storybook/react']) return 'storybook';
    if (deps['react-native']) return 'react-native';

    return 'node';
  } catch {
    return 'unknown';
  }
}

function readPackageDescription(pkgPath: string): string | null {
  const packageJsonPath = path.join(pkgPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return null;

  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return pkg.description || null;
  } catch {
    return null;
  }
}

function scanDirectory(dirPath: string, maxDepth: number = 5): { files: number; lines: number } {
  let files = 0;
  let lines = 0;

  if (!fs.existsSync(dirPath)) return { files, lines };

  function scan(currentPath: string, depth: number) {
    if (depth > maxDepth) return;

    const items = fs.readdirSync(currentPath);
    for (const item of items) {
      if (IGNORED_DIRECTORIES.has(item) || item.startsWith('.')) continue;

      const fullPath = path.join(currentPath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        scan(fullPath, depth + 1);
      } else if (stats.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (CODE_EXTENSIONS.has(ext)) {
          files++;
          try {
            const [, lineCount] = analyzeFileContent(fullPath);
            lines += lineCount;
          } catch {
            // Skip files that can't be analyzed
          }
        }
      }
    }
  }

  scan(dirPath, 0);
  return { files, lines };
}

function generateTreeStructure(rootPath: string, maxDepth: number = 3): string[] {
  const lines: string[] = [];

  function addTree(dirPath: string, prefix: string, depth: number) {
    if (depth > maxDepth) return;

    const items = fs.readdirSync(dirPath).filter(name => {
      if (name.startsWith('.') || IGNORED_DIRECTORIES.has(name)) return false;
      return true;
    }).sort();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isLast = i === items.length - 1;
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);

      const connector = isLast ? '└── ' : '├── ';
      const relativePath = path.relative(rootPath, fullPath);

      // Add category hints for top-level directories
      let hint = '';
      if (depth === 0) {
        if (item === 'apps') hint = ' # Applications';
        else if (item === 'packages') hint = ' # Shared libraries';
        else if (item === 'docs') hint = ' # Documentation';
        else if (item === 'tooling') hint = ' # Build tools';
      }

      lines.push(`${prefix}${connector}${item}${hint}`);

      if (stats.isDirectory()) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        addTree(fullPath, nextPrefix, depth + 1);
      }
    }
  }

  addTree(rootPath, '', 0);
  return lines;
}

async function generateBrainGardenStructure(): Promise<void> {
  const rootPath = getMonorepoRoot();
  console.log(`🧠 Brain Garden Directory Structure Generator`);
  console.log(`📁 Root: ${rootPath}`);

  // Collect metrics
  const metrics: MonorepoMetrics = {
    totalFiles: 0,
    totalLines: 0,
    apps: scanApps(rootPath),
    packages: scanPackages(rootPath),
    groveFeatures: scanGroveFeatures(rootPath),
  };

  // Sum up totals
  Object.values(metrics.apps).forEach(app => {
    metrics.totalFiles += app.files;
    metrics.totalLines += app.lines;
  });
  Object.values(metrics.packages).forEach(pkg => {
    metrics.totalFiles += pkg.files;
    metrics.totalLines += pkg.lines;
  });

  // Generate tree structure
  const treeLines = generateTreeStructure(rootPath, 2);

  // Try to get AI descriptions (optional) - uses OpenRouter with free models
  let aiDescriptions: { [key: string]: string } = {};
  try {
    const aiService = new AIService({
      model: FREE_MODELS.GEMINI_FLASH, // Free model via OpenRouter
    });
    const prompt = `Given this Brain Garden monorepo structure, provide brief descriptions (max 50 chars) for each top-level directory:

${treeLines.slice(0, 30).join('\n')}

Format as "path: description" one per line.`;

    const response = await aiService.generateContent(prompt);
    response.split('\n').forEach(line => {
      const match = line.match(/^[-\s]*([^:]+):\s*(.+)$/);
      if (match) {
        aiDescriptions[match[1].trim()] = match[2].trim();
      }
    });
  } catch (error) {
    console.log('⚠️ AI descriptions unavailable, using defaults');
  }

  // Generate markdown content
  const content = [
    '# Brain Garden Monorepo Structure',
    '',
    `> Generated: ${DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')}`,
    `> Root: ${rootPath}`,
    '',
    '## Quick Stats',
    '',
    `- **Total Files**: ${metrics.totalFiles.toLocaleString()}`,
    `- **Total Lines**: ${metrics.totalLines.toLocaleString()}`,
    `- **Apps**: ${Object.keys(metrics.apps).length}`,
    `- **Packages**: ${Object.keys(metrics.packages).length}`,
    `- **GROVE Features**: ${metrics.groveFeatures.length}`,
    '',
    '## Applications',
    '',
    '| App | Type | Files | Lines | Description |',
    '|-----|------|-------|-------|-------------|',
    ...Object.entries(metrics.apps).map(([name, m]) =>
      `| ${name} | ${m.type} | ${m.files} | ${m.lines.toLocaleString()} | ${m.description} |`
    ),
    '',
    '## Packages',
    '',
    '| Package | Files | Lines | Description |',
    '|---------|-------|-------|-------------|',
    ...Object.entries(metrics.packages).map(([name, m]) =>
      `| ${name} | ${m.files} | ${m.lines.toLocaleString()} | ${m.description} |`
    ),
    '',
    '## Active GROVE Features',
    '',
    metrics.groveFeatures.length > 0
      ? [
          '| Feature | Phase | Planning | Design | Stories |',
          '|---------|-------|----------|--------|---------|',
          ...metrics.groveFeatures.map(f =>
            `| ${f.name} | ${f.currentPhase} | ${f.hasPlanning ? '✅' : '❌'} | ${f.hasDesign ? '✅' : '❌'} | ${f.hasStories ? '✅' : '❌'} |`
          )
        ].join('\n')
      : '_No active features in docs/features/_',
    '',
    '## Project Tree',
    '',
    '```',
    path.basename(rootPath) + '/',
    ...treeLines,
    '```',
    '',
    '## Usage',
    '',
    'This file is auto-generated to provide context for AI assistants.',
    'Include it in your Claude Code sessions for better codebase awareness.',
    '',
    '```bash',
    '# Regenerate this file',
    'pnpm structure:generate',
    '',
    '# Watch for changes',
    'pnpm structure:watch',
    '```',
    '',
  ].join('\n');

  // Write output
  const brainDir = path.join(rootPath, '.brain');
  if (!fs.existsSync(brainDir)) {
    fs.mkdirSync(brainDir, { recursive: true });
  }

  const outputPath = path.join(brainDir, 'directory-structure.md');
  fs.writeFileSync(outputPath, content);

  console.log(`✅ Generated: ${outputPath}`);
  console.log(`📊 ${metrics.totalFiles} files, ${metrics.totalLines.toLocaleString()} lines`);
}

// CLI entry point - ESM compatible
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('brain-garden-adapter.ts');

if (isMainModule) {
  generateBrainGardenStructure().catch(console.error);
}

export { generateBrainGardenStructure, getMonorepoRoot };
