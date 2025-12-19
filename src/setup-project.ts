#!/usr/bin/env tsx
/**
 * Setup Directory Structure for a Project
 *
 * Automates the process of adding directory-structure generation
 * to any project (monorepo or single package).
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

interface SetupOptions {
  projectPath: string;
  force?: boolean;
  skipHook?: boolean;
  enableWatch?: boolean;
}

interface ProjectInfo {
  name: string;
  type: 'brain-garden-monorepo' | 'monorepo' | 'single-package';
  packageManager: 'pnpm' | 'npm' | 'yarn';
  hasHusky: boolean;
}

function detectProjectInfo(projectPath: string): ProjectInfo {
  const hasTurbo = existsSync(join(projectPath, 'turbo.json'));
  const hasApps = existsSync(join(projectPath, 'apps'));
  const hasPackages = existsSync(join(projectPath, 'packages'));
  const hasLerna = existsSync(join(projectPath, 'lerna.json'));
  const hasPnpmWorkspace = existsSync(join(projectPath, 'pnpm-workspace.yaml'));
  const hasHusky = existsSync(join(projectPath, '.husky'));

  // Detect package manager
  let packageManager: 'pnpm' | 'npm' | 'yarn' = 'npm';
  if (existsSync(join(projectPath, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (existsSync(join(projectPath, 'yarn.lock'))) {
    packageManager = 'yarn';
  }

  // Detect project type
  let type: ProjectInfo['type'] = 'single-package';
  if (hasTurbo && hasApps && hasPackages) {
    type = 'brain-garden-monorepo';
  } else if (hasLerna || hasPnpmWorkspace) {
    type = 'monorepo';
  }

  // Get project name from package.json
  let name = basename(projectPath);
  const pkgPath = join(projectPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      name = pkg.name || name;
    } catch {
      // Use directory name
    }
  }

  return { name, type, packageManager, hasHusky };
}

function createConfig(projectPath: string, info: ProjectInfo): void {
  const configPath = join(projectPath, '.directory-structure.json');

  if (existsSync(configPath)) {
    console.log('⚠️  Config already exists, skipping...');
    return;
  }

  const config = {
    outputPath: '.brain/directory-structure.md',
    projectName: info.name,
    ignore: [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      'coverage',
      '.turbo',
      '.cache',
      '*.log',
    ],
    monorepo:
      info.type !== 'single-package'
        ? {
            enabled: true,
            appsDir: 'apps',
            packagesDir: 'packages',
          }
        : { enabled: false },
    ai: {
      enabled: true,
      model: 'google/gemini-2.0-flash-exp:free',
      generateDescriptions: true,
    },
    incremental: {
      enabled: true,
      cacheDir: '.brain/.structure-cache',
    },
  };

  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✅ Created .directory-structure.json');
}

function updatePackageJson(projectPath: string, info: ProjectInfo): void {
  const pkgPath = join(projectPath, 'package.json');

  if (!existsSync(pkgPath)) {
    console.log('⚠️  No package.json found, skipping script setup...');
    return;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  // Add scripts based on project type
  pkg.scripts = pkg.scripts || {};

  if (info.type === 'brain-garden-monorepo') {
    // Use local package
    pkg.scripts['structure:generate'] =
      'tsx packages/directory-structure/src/brain-garden-adapter.ts';
    pkg.scripts['structure:watch'] =
      'tsx packages/directory-structure/src/brain-garden-adapter.ts --watch';
  } else {
    // Use CLI from installed package
    pkg.scripts['structure:generate'] = 'directory-structure generate';
    pkg.scripts['structure:watch'] = 'directory-structure watch';
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('✅ Added structure scripts to package.json');
}

function installGitHook(projectPath: string, info: ProjectInfo): void {
  const huskyDir = join(projectPath, '.husky');
  const hookPath = join(huskyDir, 'post-commit');

  // Create .husky directory if needed
  if (!existsSync(huskyDir)) {
    mkdirSync(huskyDir, { recursive: true });
    console.log('📁 Created .husky directory');
  }

  const hookContent = `#!/bin/sh
#
# Auto-regenerate directory structure after commits with code changes
#
# Bypass with: SKIP_STRUCTURE_GEN=1 git commit ...
#

# Skip if explicitly disabled
if [ "$SKIP_STRUCTURE_GEN" = "1" ]; then
  exit 0
fi

# Only regenerate on significant code changes
SIGNIFICANT_CHANGES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E '\\.(ts|tsx|js|jsx|py|go|rs)$' | head -1)

if [ -n "$SIGNIFICANT_CHANGES" ]; then
  echo "🧠 Regenerating directory structure..."
  (${info.packageManager} structure:generate >/dev/null 2>&1 && echo "✅ Structure updated" || echo "⚠️ Structure generation failed (non-blocking)") &
fi
`;

  // Check if hook exists and has our content
  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, 'utf-8');
    if (existing.includes('structure:generate')) {
      console.log('⚠️  Git hook already configured, skipping...');
      return;
    }
    // Append to existing hook
    writeFileSync(hookPath, existing + '\n' + hookContent);
    console.log('✅ Updated existing post-commit hook');
  } else {
    writeFileSync(hookPath, hookContent);
    console.log('✅ Created post-commit hook');
  }

  chmodSync(hookPath, '755');
}

function createOutputDir(projectPath: string): void {
  const brainDir = join(projectPath, '.brain');
  if (!existsSync(brainDir)) {
    mkdirSync(brainDir, { recursive: true });
    console.log('📁 Created .brain directory');
  }
}

function generateInitialStructure(projectPath: string, info: ProjectInfo): void {
  console.log('🧠 Generating initial directory structure...');

  try {
    if (info.type === 'brain-garden-monorepo') {
      execSync('pnpm structure:generate', {
        cwd: projectPath,
        stdio: 'inherit',
      });
    } else {
      // For external projects, use the adapter directly
      const adapterPath = join(
        process.env.HOME || '~',
        'Dev/packages/directory-structure/src/brain-garden-adapter.ts'
      );
      execSync(`tsx ${adapterPath}`, {
        cwd: projectPath,
        stdio: 'inherit',
      });
    }
    console.log('✅ Generated .brain/directory-structure.md');
  } catch (error) {
    console.log('⚠️  Initial generation failed - you can run it manually later');
  }
}

export async function setupProject(options: SetupOptions): Promise<void> {
  const { projectPath, force = false, skipHook = false } = options;

  console.log('\n🌱 Setting up Directory Structure for project...\n');

  // Step 1: Detect project info
  const info = detectProjectInfo(projectPath);
  console.log(`📦 Project: ${info.name}`);
  console.log(`📁 Type: ${info.type}`);
  console.log(`📦 Package Manager: ${info.packageManager}\n`);

  // Step 2: Create config
  createConfig(projectPath, info);

  // Step 3: Update package.json
  updatePackageJson(projectPath, info);

  // Step 4: Create output directory
  createOutputDir(projectPath);

  // Step 5: Install git hook (unless skipped)
  if (!skipHook) {
    installGitHook(projectPath, info);
  } else {
    console.log('⏭️  Skipping git hook installation');
  }

  // Step 6: Generate initial structure
  generateInitialStructure(projectPath, info);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Directory structure setup complete!\n');
  console.log('📁 Config: .directory-structure.json');
  console.log('📄 Output: .brain/directory-structure.md');
  if (!skipHook) {
    console.log('🪝 Hook: .husky/post-commit (auto-regeneration)');
  }
  console.log('\nRun `' + info.packageManager + ' structure:generate` to regenerate manually.');
  console.log('='.repeat(50) + '\n');
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const projectPath = args.find((a) => !a.startsWith('--')) || process.cwd();
  const force = args.includes('--force');
  const skipHook = args.includes('--no-hook');
  const enableWatch = args.includes('--watch');

  setupProject({ projectPath, force, skipHook, enableWatch });
}
