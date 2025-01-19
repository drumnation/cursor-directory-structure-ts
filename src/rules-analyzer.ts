import * as fs from 'fs';
import * as path from 'path';
import { ProjectInfo } from './types';

class RulesAnalyzer {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  analyzeProjectForRules(): ProjectInfo {
    const projectInfo: ProjectInfo = {
      name: this.detectProjectName(),
      version: '1.0.0',
      language: this.detectMainLanguage(),
      framework: this.detectFramework(),
      type: this.detectProjectType(),
    };
    return projectInfo;
  }

  private detectProjectName(): string {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (data.name) {
          return data.name;
        }
      } catch (e) {
        // Ignore errors
      }
    }

    const setupPyPath = path.join(this.projectPath, 'setup.py');
    if (fs.existsSync(setupPyPath)) {
      try {
        const content = fs.readFileSync(setupPyPath, 'utf-8');
        const nameMatch = content.match(/name\s*=\s*['"](.+?)['"]/);
        if (nameMatch) {
          return nameMatch[1];
        }
      } catch (e) {
        // Ignore errors
      }
    }

    return path.basename(this.projectPath);
  }

  private detectMainLanguage(): string {
    const languageScores: { [key: string]: number } = {};

    const files = this.listProjectFiles();
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      switch (ext) {
        case '.js':
        case '.jsx':
          languageScores['javascript'] = (languageScores['javascript'] || 0) + 1;
          break;
        case '.ts':
        case '.tsx':
          languageScores['typescript'] = (languageScores['typescript'] || 0) + 1;
          break;
        case '.py':
          languageScores['python'] = (languageScores['python'] || 0) + 1;
          break;
        case '.java':
          languageScores['java'] = (languageScores['java'] || 0) + 1;
          break;
        case '.kt':
        case '.kts':
          languageScores['kotlin'] = (languageScores['kotlin'] || 0) + 1;
          break;
        case '.rs':
          languageScores['rust'] = (languageScores['rust'] || 0) + 1;
          break;
        case '.go':
          languageScores['go'] = (languageScores['go'] || 0) + 1;
          break;
        case '.swift':
          languageScores['swift'] = (languageScores['swift'] || 0) + 1;
          break;
        case '.php':
          languageScores['php'] = (languageScores['php'] || 0) + 1;
          break;
        case '.cs':
          languageScores['csharp'] = (languageScores['csharp'] || 0) + 1;
          break;
        case '.cpp':
        case '.cc':
        case '.cxx':
        case '.h':
        case '.hpp':
          languageScores['cpp'] = (languageScores['cpp'] || 0) + 1;
          break;
        case '.c':
          languageScores['c'] = (languageScores['c'] || 0) + 1;
          break;
        case '.rb':
          languageScores['ruby'] = (languageScores['ruby'] || 0) + 1;
          break;
        case '.r':
          languageScores['r'] = (languageScores['r'] || 0) + 1;
          break;
        case '.lua':
          languageScores['lua'] = (languageScores['lua'] || 0) + 1;
          break;
        case '.pl':
        case '.pm':
          languageScores['perl'] = (languageScores['perl'] || 0) + 1;
          break;
        case '.m':
          languageScores['matlab'] = (languageScores['matlab'] || 0) + 1;
          break;
        case '.groovy':
          languageScores['groovy'] = (languageScores['groovy'] || 0) + 1;
          break;
        case '.zig':
          languageScores['zig'] = (languageScores['zig'] || 0) + 1;
          break;
        case '.d':
          languageScores['d'] = (languageScores['d'] || 0) + 1;
          break;
        case '.dart':
          languageScores['dart'] = (languageScores['dart'] || 0) + 1;
          break;
        case '.scala':
        case '.sc':
          languageScores['scala'] = (languageScores['scala'] || 0) + 1;
          break;
        case '.jl':
          languageScores['julia'] = (languageScores['julia'] || 0) + 1;
          break;
        case '.hs':
          languageScores['haskell'] = (languageScores['haskell'] || 0) + 1;
          break;
        case '.clj':
        case '.cljs':
        case '.cljc':
        case '.edn':
          languageScores['clojure'] = (languageScores['clojure'] || 0) + 1;
          break;
        case '.erl':
        case '.hrl':
          languageScores['erlang'] = (languageScores['erlang'] || 0) + 1;
          break;
        case '.fs':
        case '.fsi':
        case '.fsx':
        case '.fsscript':
          languageScores['fsharp'] = (languageScores['fsharp'] || 0) + 1;
          break;
        case '.ml':
        case '.mli':
          languageScores['ocaml'] = (languageScores['ocaml'] || 0) + 1;
          break;
        case '.nim':
          languageScores['nim'] = (languageScores['nim'] || 0) + 1;
          break;
        case '.vb':
          languageScores['vb.net'] = (languageScores['vb.net'] || 0) + 1;
          break;
        case '.v':
          languageScores['vlang'] = (languageScores['vlang'] || 0) + 1;
          break;
        case '.ex':
        case '.exs':
          languageScores['elixir'] = (languageScores['elixir'] || 0) + 1;
          break;
        case '.elm':
          languageScores['elm'] = (languageScores['elm'] || 0) + 1;
          break;
        case '.purs':
          languageScores['purescript'] = (languageScores['purescript'] || 0) + 1;
          break;
        case '.re':
        case '.rei':
          languageScores['reason'] = (languageScores['reason'] || 0) + 1;
          break;
        case '.svelte':
          languageScores['svelte'] = (languageScores['svelte'] || 0) + 1;
          break;
        case '.vue':
          languageScores['vue'] = (languageScores['vue'] || 0) + 1;
          break;
        case '.bsl':
        case '.os':
          languageScores['1c'] = (languageScores['1c'] || 0) + 1;
          break;
        case '.sol':
          languageScores['solidity'] = (languageScores['solidity'] || 0) + 1;
          break;
        case '.move':
          languageScores['move'] = (languageScores['move'] || 0) + 1;
          break;
        case '.rsx':
          languageScores['rush'] = (languageScores['rush'] || 0) + 1;
          break;
        default:
          break;
      }
    }

    const sortedLanguages = Object.entries(languageScores).sort(([, a], [, b]) => b - a);
    return sortedLanguages.length > 0 ? sortedLanguages[0][0] : 'unknown';
  }

  private listProjectFiles(): string[] {
    const files: string[] = [];
    const stack: string[] = [this.projectPath];

    while (stack.length > 0) {
      const currentPath = stack.pop()!;
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (
            !item.startsWith('.') &&
            !['node_modules', '__pycache__', 'venv', '.git', '.idea', '.vscode', 'dist', 'build'].includes(item)
          ) {
            stack.push(fullPath);
          }
        } else {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private detectFramework(): string {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const deps = { ...data.dependencies, ...data.devDependencies };

        if (deps['react'] || deps['react-dom']) {
          if (deps['next']) return 'next.js';
          if (deps['@remix-run/react']) return 'remix';
          return 'react';
        }
        if (deps['vue']) return 'vue';
        if (deps['@angular/core']) return 'angular';
        if (deps['svelte']) return 'svelte';
        if (deps['express']) return 'express';
        if (deps['koa']) return 'koa';
        if (deps['fastify']) return 'fastify';
        if (deps['@nestjs/core']) return 'nestjs';
        if (deps['meteor']) return 'meteor';
        if (deps['ember-cli']) return 'ember.js';
        if (deps['backbone.js']) return 'backbone.js';
        if (deps['jquery']) return 'jquery';
      } catch (e) {
        // Ignore errors
      }
    }

    const requirementsTxtPath = path.join(this.projectPath, 'requirements.txt');
    if (fs.existsSync(requirementsTxtPath)) {
      try {
        const content = fs.readFileSync(requirementsTxtPath, 'utf-8').toLowerCase();
        if (content.includes('django')) return 'django';
        if (content.includes('flask')) return 'flask';
        if (content.includes('fastapi')) return 'fastapi';
        if (content.includes('tornado')) return 'tornado';
        if (content.includes('pyramid')) return 'pyramid';
        if (content.includes('web2py')) return 'web2py';
        if (content.includes('bottle')) return 'bottle';
        if (content.includes('cherrypy')) return 'cherrypy';
      } catch (e) {
        // Ignore errors
      }
    }

    const composerJsonPath = path.join(this.projectPath, 'composer.json');
    if (fs.existsSync(composerJsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(composerJsonPath, 'utf-8'));
        const require = data.require || {};
        const requireDev = data['require-dev'] || {};

        if (require['laravel/framework'] || requireDev['laravel/framework']) {
          return 'laravel';
        }
        if (require['symfony/symfony'] || requireDev['symfony/symfony']) {
          return 'symfony';
        }
        if (require['yiisoft/yii2'] || requireDev['yiisoft/yii2']) {
          return 'yii';
        }
        if (require['zendframework/zendframework'] || requireDev['zendframework/zendframework']) {
          return 'zend';
        }
        if (require['cakephp/cakephp'] || requireDev['cakephp/cakephp']) {
          return 'cakephp';
        }
        if (require['codeigniter4/framework'] || requireDev['codeigniter4/framework']) {
          return 'codeigniter';
        }
        if (require['slim/slim'] || requireDev['slim/slim']) {
          return 'slim';
        }
        if (require['phalcon/cphalcon'] || requireDev['phalcon/cphalcon']) {
          return 'phalcon';
        }
      } catch (e) {
        // Ignore errors
      }
    }

    const cargoTomlPath = path.join(this.projectPath, 'Cargo.toml');
    if (fs.existsSync(cargoTomlPath)) {
      try {
        const content = fs.readFileSync(cargoTomlPath, 'utf-8').toLowerCase();
        if (content.includes('actix-web')) return 'actix-web';
        if (content.includes('rocket')) return 'rocket';
        if (content.includes('yew')) return 'yew';
        if (content.includes('axum')) return 'axum';
        if (content.includes('tonic')) return 'tonic';
      } catch (e) {
        // Ignore errors
      }
    }

    const mixExsPath = path.join(this.projectPath, 'mix.exs');
    if (fs.existsSync(mixExsPath)) {
      try {
        const content = fs.readFileSync(mixExsPath, 'utf-8').toLowerCase();
        if (content.includes('phoenix')) return 'phoenix';
        if (content.includes('plug')) return 'plug';
      } catch (e) {
        // Ignore errors
      }
    }

    const pubspecYamlPath = path.join(this.projectPath, 'pubspec.yaml');
    if (fs.existsSync(pubspecYamlPath)) {
      try {
        const content = fs.readFileSync(pubspecYamlPath, 'utf-8').toLowerCase();
        if (content.includes('flutter')) return 'flutter';
      } catch (e) {
        // Ignore errors
      }
    }

    const buildGradlePath = path.join(this.projectPath, 'build.gradle');
    if (fs.existsSync(buildGradlePath)) {
      try {
        const content = fs.readFileSync(buildGradlePath, 'utf-8').toLowerCase();
        if (content.includes('org.jetbrains.compose')) return 'jetpack compose';
        if (content.includes('org.springframework.boot')) return 'spring boot';
        if (content.includes('ktor')) return 'ktor';
      } catch (e) {
        // Ignore errors
      }
    }

    return 'none';
  }

  private detectProjectType(): string {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const deps = { ...data.dependencies, ...data.devDependencies };

        if (deps['react-native'] || deps['@ionic/core']) {
          return 'mobile application';
        }

        if (deps['electron']) {
          return 'desktop application';
        }

        if (data.name && (data.name.startsWith('@') || data.name.includes('-lib'))) {
          return 'library';
        }
      } catch (e) {
        // Ignore errors
      }
    }

    const webIndicators = ['index.html', 'public/index.html', 'src/index.html'];
    for (const indicator of webIndicators) {
      if (fs.existsSync(path.join(this.projectPath, indicator))) {
        return 'web application';
      }
    }

    return 'application';
  }
}

export { RulesAnalyzer };
