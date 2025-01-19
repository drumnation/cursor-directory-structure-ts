import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';

interface ProjectType {
  name: string;
  description: string;
  indicators: string[];
  file_patterns: string[];
  required_files?: string[];
  priority?: number;
  additional_checks?: (projectPath: string) => boolean;
}

const PROJECT_TYPES: { [key: string]: ProjectType } = {
  python: {
    name: 'Python',
    description: 'A Python project',
    indicators: ['setup.py', 'requirements.txt', 'pyproject.toml'],
    file_patterns: ['*.py'],
    priority: 2,
    additional_checks: (projectPath: string) => {
      try {
        const files = fs.readdirSync(projectPath);
        return files.some(file => file.endsWith('.py'));
      } catch {
        return false;
      }
    }
  },
  nodejs: {
    name: 'Node.js',
    description: 'A Node.js project',
    indicators: ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
    file_patterns: ['*.js', '*.jsx', '*.ts', '*.tsx'],
    required_files: ['package.json'],
    priority: 3,
    additional_checks: (projectPath: string) => {
      try {
        const packageJsonPath = path.join(projectPath, 'package.json');
        return fs.existsSync(packageJsonPath);
      } catch {
        return false;
      }
    }
  },
  rust: {
    name: 'Rust',
    description: 'A Rust project',
    indicators: ['Cargo.toml', 'Cargo.lock'],
    file_patterns: ['*.rs'],
    required_files: ['Cargo.toml'],
    priority: 2
  },
  go: {
    name: 'Go',
    description: 'A Go project',
    indicators: ['go.mod', 'go.sum'],
    file_patterns: ['*.go'],
    required_files: ['go.mod'],
    priority: 2
  },
  java: {
    name: 'Java',
    description: 'A Java project',
    indicators: ['pom.xml', 'build.gradle', 'settings.gradle'],
    file_patterns: ['*.java'],
    priority: 2
  },
  csharp: {
    name: 'C#',
    description: 'A C# project',
    indicators: ['*.csproj', '*.sln'].map(pattern => pattern.replace('*', '.*')),
    file_patterns: ['*.cs'],
    priority: 2
  },
  cpp: {
    name: 'C++',
    description: 'A C++ project',
    indicators: ['CMakeLists.txt', '*.vcxproj'],
    file_patterns: ['*.cpp', '*.hpp', '*.h'],
    priority: 1
  },
  javascript: {
    name: 'JavaScript',
    description: 'JavaScript/Node.js Project',
    indicators: [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'node_modules/',
      'webpack.config.js',
      '.npmrc',
      '.nvmrc',
      'next.config.js',
    ],
    file_patterns: ['*.js', '*.jsx', '*.mjs', '*.cjs'],
    required_files: [],
    priority: 5,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) =>
        ['.js', '.jsx', '.mjs', '.cjs'].some((ext) => f.endsWith(ext)) && fs.statSync(projectPath + '/' + f).isFile()
      ),
  },
  typescript: {
    name: 'TypeScript',
    description: 'TypeScript Project',
    indicators: [
      'tsconfig.json',
      'tslint.json',
      'typescript.json',
      '.ts',
      '.tsx',
      '.eslintrc',
    ],
    file_patterns: ['*.ts', '*.tsx'],
    required_files: [],
    priority: 6,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) =>
        ['.ts', '.tsx'].some((ext) => f.endsWith(ext)) && fs.statSync(projectPath + '/' + f).isFile()
      ),
  },
  web: {
    name: 'Web',
    description: 'Web Project',
    indicators: [
      'index.html',
      'styles.css',
      '.html',
      '.css',
      'public/',
      'assets/',
      'images/',
    ],
    file_patterns: ['*.html', '*.css', '*.scss', '*.sass', '*.less', '*.svg'],
    required_files: [],
    priority: 3,
  },
  php: {
    name: 'PHP',
    description: 'PHP Project',
    indicators: ['composer.json', 'composer.lock', 'artisan', '.php', 'vendor/'],
    file_patterns: ['*.php'],
    required_files: [],
    priority: 5,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.php') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  kotlin: {
    name: 'Kotlin',
    description: 'Kotlin Project',
    indicators: [
      'build.gradle.kts',
      'settings.gradle.kts',
      '.kt',
      'gradlew',
      'gradlew.bat',
      'src/main/kotlin/',
      'src/test/kotlin/',
    ],
    file_patterns: ['*.kt', '*.kts'],
    required_files: [],
    priority: 8,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) =>
        ['.kt', '.kts'].some((ext) => f.endsWith(ext)) && fs.statSync(projectPath + '/' + f).isFile()
      ),
  },
  swift: {
    name: 'Swift',
    description: 'Swift Project',
    indicators: [
      'Package.swift',
      '.xcodeproj',
      '.xcworkspace',
      '.swift',
      'Sources/',
      'Tests/',
    ],
    file_patterns: ['*.swift'],
    required_files: [],
    priority: 8,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.swift') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  c: {
    name: 'C',
    description: 'C Project',
    indicators: ['Makefile', 'CMakeLists.txt', '.c', 'src/', 'include/'],
    file_patterns: ['*.c', '*.h'],
    required_files: [],
    priority: 7,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.c') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  ruby: {
    name: 'Ruby',
    description: 'Ruby Project',
    indicators: ['Gemfile', 'Gemfile.lock', 'Rakefile', '.rb', 'config/'],
    file_patterns: ['*.rb', '*.rake'],
    required_files: [],
    priority: 6,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.rb') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  elixir: {
    name: 'Elixir',
    description: 'Elixir Project',
    indicators: ['mix.exs', 'mix.lock', '.ex', '.exs', 'lib/', 'test/'],
    file_patterns: ['*.ex', '*.exs'],
    required_files: [],
    priority: 6,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) =>
        ['.ex', '.exs'].some((ext) => f.endsWith(ext)) && fs.statSync(projectPath + '/' + f).isFile()
      ),
  },
  haskell: {
    name: 'Haskell',
    description: 'Haskell Project',
    indicators: ['stack.yaml', 'package.yaml', '.cabal', '.hs', 'src/', 'app/'],
    file_patterns: ['*.hs', '*.lhs'],
    required_files: [],
    priority: 6,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.hs') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  clojure: {
    name: 'Clojure',
    description: 'Clojure Project',
    indicators: ['project.clj', 'deps.edn', '.clj', '.cljs', '.cljc', 'src/', 'test/'],
    file_patterns: ['*.clj', '*.cljs', '*.cljc'],
    required_files: [],
    priority: 6,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) =>
        ['.clj', '.cljs', '.cljc'].some((ext) => f.endsWith(ext)) && fs.statSync(projectPath + '/' + f).isFile()
      ),
  },
  zig: {
    name: 'Zig',
    description: 'Zig Project',
    indicators: ['build.zig', '.zig', 'src/main.zig', 'src/build.zig'],
    file_patterns: ['*.zig'],
    required_files: [],
    priority: 7,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.zig') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  ocaml: {
    name: 'OCaml',
    description: 'OCaml Project',
    indicators: ['dune', 'dune-project', '.ml', '.mli', '_opam/', 'bin/', 'lib/'],
    file_patterns: ['*.ml', '*.mli'],
    required_files: [],
    priority: 6,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) =>
        ['.ml', '.mli'].some((ext) => f.endsWith(ext)) && fs.statSync(projectPath + '/' + f).isFile()
      ),
  },
  nim: {
    name: 'Nim',
    description: 'Nim Project',
    indicators: ['.nimble', '.nim', 'config/config.nims', 'src/', 'tests/'],
    file_patterns: ['*.nim', '*.nims'],
    required_files: [],
    priority: 6,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) =>
        ['.nim', '.nims'].some((ext) => f.endsWith(ext)) && fs.statSync(projectPath + '/' + f).isFile()
      ),
  },
  crystal: {
    name: 'Crystal',
    description: 'Crystal Project',
    indicators: ['shard.yml', '.cr', 'lib/', 'spec/'],
    file_patterns: ['*.cr'],
    required_files: [],
    priority: 6,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.cr') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  julia: {
    name: 'Julia',
    description: 'Julia Project',
    indicators: ['Project.toml', 'Manifest.toml', '.jl', 'src/', 'test/'],
    file_patterns: ['*.jl'],
    required_files: [],
    priority: 6,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.jl') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  groovy: {
    name: 'Groovy',
    description: 'Groovy Project',
    indicators: ['build.gradle', '.groovy', 'src/main/groovy/', 'src/test/groovy/'],
    file_patterns: ['*.groovy'],
    required_files: [],
    priority: 6,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.groovy') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  fortran: {
    name: 'Fortran',
    description: 'Fortran Project',
    indicators: ['Makefile', '.f', '.f90', '.f95', '.f03', '.f08', 'src/', 'include/'],
    file_patterns: ['*.f', '*.f90', '*.f95', '*.f03', '*.f08'],
    required_files: [],
    priority: 6,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) =>
        ['.f', '.f90', '.f95', '.f03', '.f08'].some((ext) => f.endsWith(ext)) && fs.statSync(projectPath + '/' + f).isFile()
      ),
  },
  assembly: {
    name: 'Assembly',
    description: 'Assembly Project',
    indicators: ['Makefile', '.asm', '.s', 'src/', 'include/'],
    file_patterns: ['*.asm', '*.s'],
    required_files: [],
    priority: 6,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) =>
        ['.asm', '.s'].some((ext) => f.endsWith(ext)) && fs.statSync(projectPath + '/' + f).isFile()
      ),
  },
  latex: {
    name: 'LaTeX',
    description: 'LaTeX Project',
    indicators: ['.tex', 'main.tex', 'Makefile', 'documentclass{', '\\begin{document}'],
    file_patterns: ['*.tex'],
    required_files: [],
    priority: 5,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.tex') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  markdown: {
    name: 'Markdown',
    description: 'Markdown Project',
    indicators: ['.md', 'README.md', 'docs/', 'mkdocs.yml'],
    file_patterns: ['*.md'],
    required_files: [],
    priority: 4,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.md') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  html: {
    name: 'HTML',
    description: 'HTML Project',
    indicators: ['.html', 'index.html', '<html>', '<head>', '<body>'],
    file_patterns: ['*.html'],
    required_files: [],
    priority: 4,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.html') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  css: {
    name: 'CSS',
    description: 'CSS Project',
    indicators: ['.css', 'style.css', '<style>', 'stylesheet'],
    file_patterns: ['*.css'],
    required_files: [],
    priority: 4,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.css') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  sql: {
    name: 'SQL',
    description: 'SQL Project',
    indicators: ['.sql', 'CREATE TABLE', 'INSERT INTO', 'SELECT * FROM'],
    file_patterns: ['*.sql'],
    required_files: [],
    priority: 5,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.sql') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  docker: {
    name: 'Docker',
    description: 'Docker Project',
    indicators: ['Dockerfile', 'docker-compose.yml', '.dockerignore'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  kubernetes: {
    name: 'Kubernetes',
    description: 'Kubernetes Project',
    indicators: ['deployment.yaml', 'service.yaml', 'ingress.yaml', 'namespace.yaml', 'kubectl', 'k8s/'],
    file_patterns: ['*.yaml', '*.yml'],
    required_files: [],
    priority: 5,
  },
  terraform: {
    name: 'Terraform',
    description: 'Terraform Project',
    indicators: ['.tf', 'terraform.tfstate', 'provider.tf', 'variables.tf', 'outputs.tf'],
    file_patterns: ['*.tf'],
    required_files: [],
    priority: 5,
    additional_checks: (projectPath: string): boolean =>
      fs.readdirSync(projectPath).some((f) => f.endsWith('.tf') && fs.statSync(projectPath + '/' + f).isFile()),
  },
  ansible: {
    name: 'Ansible',
    description: 'Ansible Project',
    indicators: ['ansible.cfg', 'playbook.yml', 'roles/', 'group_vars/', 'host_vars/'],
    file_patterns: ['*.yml', '*.yaml'],
    required_files: [],
    priority: 5,
  },
  chef: {
    name: 'Chef',
    description: 'Chef Project',
    indicators: ['knife.rb', 'Policyfile.rb', 'cookbooks/', 'recipes/', 'attributes/'],
    file_patterns: ['*.rb'],
    required_files: [],
    priority: 5,
  },
  puppet: {
    name: 'Puppet',
    description: 'Puppet Project',
    indicators: ['manifests/', 'modules/', 'Puppetfile', 'site.pp', 'init.pp'],
    file_patterns: ['*.pp'],
    required_files: [],
    priority: 5,
  },
  jenkins: {
    name: 'Jenkins',
    description: 'Jenkins Project',
    indicators: ['Jenkinsfile', '.jenkins', 'pipeline', 'node', 'stage'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  vscode: {
    name: 'VS Code',
    description: 'VS Code Extension',
    indicators: ['.vscode', 'package.json', 'vsc-extension-quickstart.md', 'src/extension.ts'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  chrome_extension: {
    name: 'Chrome Extension',
    description: 'Chrome Extension',
    indicators: ['manifest.json', '.crx', 'background.js', 'content.js', 'popup.html'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  mobile: {
    name: 'Mobile',
    description: 'Mobile App Project',
    indicators: [
      'android/',
      'ios/',
      '.apk',
      '.ipa',
      'MainActivity.java',
      'AppDelegate.swift',
      'AndroidManifest.xml',
      'Info.plist',
    ],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  game: {
    name: 'Game',
    description: 'Game Development Project',
    indicators: ['Assets/', 'Scenes/', '.unity', '.pck', '.godot', '.tscn', '.tres'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  data_science: {
    name: 'Data Science',
    description: 'Data Science Project',
    indicators: ['.csv', '.tsv', '.json', '.parquet', 'notebooks/', 'data/', 'models/'],
    file_patterns: ['*.ipynb'],
    required_files: [],
    priority: 5,
  },
  machine_learning: {
    name: 'Machine Learning',
    description: 'Machine Learning Project',
    indicators: ['.h5', '.pb', '.tflite', 'model.pt', 'model.pkl', 'train.py', 'predict.py'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  deep_learning: {
    name: 'Deep Learning',
    description: 'Deep Learning Project',
    indicators: ['model.py', 'layers.py', 'optimizer.py', 'loss.py', 'metrics.py'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  blockchain: {
    name: 'Blockchain',
    description: 'Blockchain Project',
    indicators: ['.sol', 'truffle-config.js', 'migrations/', 'contracts/', 'web3.js', 'ethers.js'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  iot: {
    name: 'IoT',
    description: 'IoT Project',
    indicators: ['device.py', 'sensor.js', 'data.ts', 'gateway.go', 'controller.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  embedded: {
    name: 'Embedded',
    description: 'Embedded Systems Project',
    indicators: ['.hex', '.elf', '.bin', 'startup.s', 'linker.ld', 'hal.c', 'driver.c'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  security: {
    name: 'Security',
    description: 'Security Project',
    indicators: ['auth.py', 'secure.js', 'access.ts', 'encrypt.go', 'decrypt.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  testing: {
    name: 'Testing',
    description: 'Testing/QA Project',
    indicators: ['test_suite.py', 'test_case.rb', 'spec.js', 'e2e/', 'integration/'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  database: {
    name: 'Database',
    description: 'Database Project',
    indicators: ['schema.sql', 'migrations/', 'db.sqlite', '.mdb', '.accdb', 'pg_hba.conf'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  devops: {
    name: 'DevOps',
    description: 'DevOps Project',
    indicators: ['Vagrantfile', 'packer.json', 'cloudformation.json', 'azuredeploy.json'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  fullstack: {
    name: 'Full Stack',
    description: 'Full Stack Project',
    indicators: ['client/', 'server/', 'frontend/', 'backend/', 'api/', 'ui/'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  library: {
    name: 'Library',
    description: 'Library/Module Project',
    indicators: ['__init__.py', '__init__.js', 'index.ts', 'lib.go', 'mod.rs'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  script: {
    name: 'Script',
    description: 'Scripting Project',
    indicators: ['.sh', '.bat', '.ps1', 'script.py', 'script.js', 'script.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  config: {
    name: 'Config',
    description: 'Configuration Project',
    indicators: ['.json', '.yaml', '.yml', '.toml', '.ini', 'config.xml'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  documentation: {
    name: 'Documentation',
    description: 'Documentation Project',
    indicators: ['docs/', 'README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'LICENSE'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  tools: {
    name: 'Tools',
    description: 'Developer Tools Project',
    indicators: ['cli.js', 'cli.py', 'utils.go', 'scripts/', 'bin/'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  finance: {
    name: 'Finance',
    description: 'Financial/Trading Project',
    indicators: ['trading.py', 'portfolio.js', 'stock.ts', 'crypto.go', 'forex.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  healthcare: {
    name: 'Healthcare',
    description: 'Healthcare Project',
    indicators: ['patient.py', 'doctor.js', 'hospital.ts', 'ehr.go', 'medical.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  education: {
    name: 'Education',
    description: 'Educational Project',
    indicators: ['course.py', 'lesson.js', 'quiz.ts', 'student.go', 'teacher.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  ecommerce: {
    name: 'E-commerce',
    description: 'E-commerce Project',
    indicators: ['product.py', 'cart.js', 'order.ts', 'payment.go', 'customer.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  social: {
    name: 'Social',
    description: 'Social Media Project',
    indicators: ['user.py', 'post.js', 'comment.ts', 'feed.go', 'profile.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  games: {
    name: 'Games',
    description: 'Game Development Project',
    indicators: ['game.py', 'level.js', 'character.ts', 'scene.go', 'player.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  utility: {
    name: 'Utility',
    description: 'Utility Project',
    indicators: ['tool.py', 'helper.js', 'util.ts', 'convert.go', 'process.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  api: {
    name: 'API',
    description: 'API Project',
    indicators: ['api.py', 'routes.js', 'controller.ts', 'endpoints.go', 'handler.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  automation: {
    name: 'Automation',
    description: 'Automation Project',
    indicators: ['automate.py', 'task.js', 'workflow.ts', 'script.go', 'auto.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  monitoring: {
    name: 'Monitoring',
    description: 'Monitoring Project',
    indicators: ['monitor.py', 'metrics.js', 'log.ts', 'alert.go', 'watch.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  real_estate: {
    name: 'Real Estate',
    description: 'Real Estate Project',
    indicators: ['property.py', 'listing.js', 'agent.ts', 'rental.go', 'sale.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  travel: {
    name: 'Travel',
    description: 'Travel Project',
    indicators: ['booking.py', 'flight.js', 'hotel.ts', 'trip.go', 'tour.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  food: {
    name: 'Food',
    description: 'Food/Restaurant Project',
    indicators: ['recipe.py', 'menu.js', 'order.ts', 'restaurant.go', 'delivery.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  sports: {
    name: 'Sports',
    description: 'Sports Project',
    indicators: ['team.py', 'player.js', 'game.ts', 'score.go', 'league.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  music: {
    name: 'Music',
    description: 'Music Project',
    indicators: ['song.py', 'artist.js', 'album.ts', 'playlist.go', 'track.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  video: {
    name: 'Video',
    description: 'Video Project',
    indicators: ['movie.py', 'video.js', 'stream.ts', 'clip.go', 'show.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  news: {
    name: 'News',
    description: 'News Project',
    indicators: ['article.py', 'news.js', 'feed.ts', 'source.go', 'reporter.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  weather: {
    name: 'Weather',
    description: 'Weather Project',
    indicators: ['forecast.py', 'weather.js', 'temperature.ts', 'condition.go', 'location.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  maps: {
    name: 'Maps',
    description: 'Mapping Project',
    indicators: ['map.py', 'location.js', 'route.ts', 'gps.go', 'geo.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  chat: {
    name: 'Chat',
    description: 'Chat/Messaging Project',
    indicators: ['message.py', 'chat.js', 'conversation.ts', 'user.go', 'channel.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  events: {
    name: 'Events',
    description: 'Event Management Project',
    indicators: ['event.py', 'ticket.js', 'venue.ts', 'booking.go', 'schedule.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  crm: {
    name: 'CRM',
    description: 'CRM Project',
    indicators: ['customer.py', 'contact.js', 'lead.ts', 'opportunity.go', 'account.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  erp: {
    name: 'ERP',
    description: 'ERP Project',
    indicators: ['inventory.py', 'order.js', 'supply.ts', 'production.go', 'resource.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  analytics: {
    name: 'Analytics',
    description: 'Analytics Project',
    indicators: ['data.py', 'report.js', 'metric.ts', 'dashboard.go', 'analysis.rb'],
    file_patterns: [],
    required_files: [],
    priority: 5,
  },
  generic: {
    name: 'Generic',
    description: 'Generic Project',
    indicators: [],
    file_patterns: [],
    required_files: [],
    priority: 1,
  },
};

function detectProjectType(projectPath: string): string {
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Directory does not exist: ${projectPath}`);
  }

  try {
    const files = fs.readdirSync(projectPath);
    let bestMatch: { type: string; score: number } | null = null;

    for (const [type, config] of Object.entries(PROJECT_TYPES)) {
      let score = 0;
      const priority = config.priority || 1;

      // Check for required files
      if (config.required_files && !config.required_files.every(file => {
        const pattern = file.replace(/\*/g, '.*');
        return files.some(f => new RegExp(`^${pattern}$`).test(f));
      })) {
        continue;
      }

      // Check for indicators
      const hasIndicators = config.indicators.some(indicator => {
        const pattern = indicator.replace(/\*/g, '.*');
        return files.some(file => new RegExp(`^${pattern}$`).test(file));
      });
      if (hasIndicators) {
        score += 2 * priority;
      }

      // Check for matching file patterns
      const hasMatchingFiles = config.file_patterns.some(pattern => {
        const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
        return files.some(file => regex.test(file));
      });
      if (hasMatchingFiles) {
        score += priority;
      }

      // Run additional checks if they exist
      if (config.additional_checks && config.additional_checks(projectPath)) {
        score += priority;
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { type, score };
      }
    }

    return bestMatch ? bestMatch.type : 'generic';
  } catch (error) {
    console.error(`Error detecting project type: ${error}`);
    return 'generic';
  }
}

function getFileTypeInfo(fileName: string): { fileType: string; language: string } {
  const ext = path.extname(fileName).toLowerCase();
  const fileType = ext.slice(1) || 'unknown';
  
  const languageMap: { [key: string]: string } = {
    js: 'JavaScript',
    jsx: 'JavaScript (React)',
    ts: 'TypeScript',
    tsx: 'TypeScript (React)',
    py: 'Python',
    java: 'Java',
    cpp: 'C++',
    hpp: 'C++ Header',
    h: 'C/C++ Header',
    cs: 'C#',
    go: 'Go',
    rs: 'Rust',
    rb: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kt: 'Kotlin',
    scala: 'Scala',
    m: 'Objective-C',
    mm: 'Objective-C++',
    pl: 'Perl',
    sh: 'Shell',
    bat: 'Batch',
    ps1: 'PowerShell',
    sql: 'SQL',
    r: 'R',
    md: 'Markdown',
    json: 'JSON',
    xml: 'XML',
    yaml: 'YAML',
    yml: 'YAML',
    toml: 'TOML',
    ini: 'INI',
    cfg: 'Config',
    conf: 'Config'
  };

  return {
    fileType,
    language: languageMap[fileType] || fileType.toUpperCase()
  };
}

function getProjectDescription(projectPath: string): { name: string; description: string } {
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Directory does not exist: ${projectPath}`);
  }

  const projectType = detectProjectType(projectPath);
  const projectName = path.basename(projectPath);
  let description = '';

  try {
    switch (projectType) {
      case 'nodejs': {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          description = packageJson.description || `A ${PROJECT_TYPES[projectType].name} project`;
        }
        break;
      }
      case 'python': {
        const setupPyPath = path.join(projectPath, 'setup.py');
        const pyprojectPath = path.join(projectPath, 'pyproject.toml');
        
        if (fs.existsSync(setupPyPath)) {
          description = `A Python project with setup.py`;
        } else if (fs.existsSync(pyprojectPath)) {
          description = `A Python project with pyproject.toml`;
        } else {
          description = `A Python project with requirements.txt`;
        }
        break;
      }
      default:
        description = PROJECT_TYPES[projectType]?.description || 'A generic project';
    }
  } catch (error) {
    console.error(`Error getting project description: ${error}`);
    description = 'A generic project';
  }

  return {
    name: projectName,
    description
  };
}

interface ProjectInfo {
  name: string;
  type: string;
  path: string;
}

async function scanForProjects(directory: string): Promise<ProjectInfo[]> {
  const projects: ProjectInfo[] = [];
  
  try {
    const files = fs.readdirSync(directory);
    const projectType = detectProjectType(directory);
    
    if (projectType !== 'generic') {
      const projectName = path.basename(directory);
      projects.push({
        name: projectName,
        type: projectType,
        path: directory
      });
    }
    
    // Recursively scan subdirectories
    for (const file of files) {
      const fullPath = path.join(directory, file);
      if (fs.statSync(fullPath).isDirectory() && !file.startsWith('.')) {
        const subProjects = await scanForProjects(fullPath);
        projects.push(...subProjects);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${directory}:`, error);
  }
  
  return projects;
}

export { detectProjectType, getFileTypeInfo, getProjectDescription, ProjectType, scanForProjects, ProjectInfo };