# Cursor Directory Structure TS

A TypeScript tool for monitoring and analyzing project directory structures, with seamless integration for Cursor IDE. This tool helps you track and analyze changes in your project's directory structure, making it easier to maintain and understand your codebase.

## Features

- Project directory structure monitoring
- Automatic project type detection
- Real-time file change tracking
- Customizable rules and analysis
- Built-in test coverage support
- Integration with AI Brain Garden's `.brain` folder system
- Automatic Cursor agent configuration
- AI-powered file and function descriptions using Google's Gemini API

## How It Works

### Directory Structure Documentation

The tool automatically maintains a `directory-structure.md` file in the `.brain` folder of each monitored project. This file contains:

- A complete map of your project's structure
- Key files and directories with AI-generated descriptions
- Function documentation with AI-generated descriptions
- Project organization overview
- Detailed metrics and statistics

### AI-Powered Documentation

Using Google's Gemini API, the tool automatically:
- Generates concise descriptions for each file and directory
- Creates meaningful documentation for functions
- Updates descriptions in real-time as your project evolves
- Maintains consistent documentation style

Example `.brain/directory-structure.md`:

```markdown
# Directory Structure

## Project Metrics

**Files**: 14
**Total Lines**: 3710

## File Types

- .ts: 14 files, 3710 lines

## Project Tree

├── src    # Source code directory containing core functionality
│   ├── analyzers.ts    # File analysis and processing utilities
│   ├── auto-updater.ts    # Automatic update management system
│   └── config.ts    # Configuration and settings management

## Functions

### src/analyzers.ts

- analyzeFileContent    # Analyzes file content for metrics and patterns
- isBinaryFile    # Checks if a file is binary or text
- shouldIgnoreFile    # Determines if a file should be ignored

### src/auto-updater.ts

- clearConsole    # Clears the console for clean output

### src/config.ts

- getDefaultConfig
- getFileLengthLimit
- loadConfig
- resolveProjectPath

### src/content-generator.ts

- generateDirectoryStructureContent
- getDirectoryStructure
- isBinaryFile
- saveDirectoryStructure
- scanForMetrics
- shouldIgnoreDirectory
- shouldIgnoreFile
- structureToTree

### src/directory-structure.ts

- getDefaultConfig
- getParentDirectory
- main
- monitorProject
- setupDirectoryStructure

### src/project-identifier.ts

- determineProjectType
- enumerateProjectFiles
- getProjectDescription
- identifyMainLanguage
- resolveFileTypeInfo
- scanForProjects

### src/rules-watcher.ts

- startWatching

### src/setup.ts

- addNewProject
- displayMenu
- loadConfig
- manageProjects
- resolveProjectPath
- saveConfig
- scanDirectory
- setupCursorFocus

### tests/analyzers.test.ts

- cleanupTestFiles
- createTestFiles
- testFunction

### tests/content-generator.test.ts

- anotherFunction
- cleanupTestProject
- createTestProject
- subFunction
- testFunction

### tests/project-identifier.test.ts

- cleanupTestProjects
- createTestProjects
```

### Cursor Agent Integration

1. The tool creates/updates a `.cursorrules` file in your project root
2. This file instructs Cursor's AI agent to read the `directory-structure.md`
3. When you interact with Cursor's AI, it will have immediate access to your project's structure
4. This results in more accurate and contextual AI assistance

Example `.cursorrules`:

```json
{
  "projectDocs": [".brain/directory-structure.md"],
  "updateFrequency": "realtime"
}
```

### Multi-Project Monitoring

- Monitor multiple projects simultaneously
- Each project gets its own `.brain` folder with up-to-date documentation
- Real-time updates as files are added, modified, or deleted
- Configurable ignore patterns (e.g., node_modules, build directories)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- TypeScript knowledge (for customization)

## Installation

1. Clone the repository:

```bash
git clone [your-repo-url]
cd cursor-directory-structure-ts
```

2. Install dependencies:

```bash
npm install
```

## Usage

### Quick Start

1. Build the project:

```bash
npm run build
```

2. Run the setup:

```bash
npm run setup
```

The setup process will guide you through:

- Managing existing projects
- Scanning directories for new projects
- Adding projects manually
- Configuring monitoring rules

### Available Scripts

- `npm run build` - Compiles TypeScript code
- `npm start` - Starts the directory structure monitoring
- `npm run setup` - Runs the interactive setup process
- `npm test` - Runs all tests
- `npm run test:watch` - Runs tests in watch mode
- `npm run test:coverage` - Runs tests with coverage report

## Configuration

The project uses a `config.json` file to store settings. A template file `config.template.json` is provided as a reference. To get started:

1. Copy the template:

```bash
cp config.template.json config.json
```

2. Modify the configuration according to your needs:

```json
{
  "projects": [
    {
      "path": "/path/to/your/project",
      "type": "detected-project-type",
      "rules": []
    }
  ]
}
```

Note: `config.json` is ignored by git to allow for personal configurations.

## Project Structure

```
├── src/
│   ├── analyzers.ts         # Project analysis logic
│   ├── auto-updater.ts      # Auto-update functionality
│   ├── config.ts           # Configuration management
│   ├── content-generator.ts # Content generation utilities
│   ├── project-identifier.ts# Project type detection
│   ├── rules-analyzer.ts   # Rule analysis implementation
│   ├── rules-generator.ts  # Rule generation logic
│   ├── rules-watcher.ts    # File system watching
│   ├── setup.ts           # Setup and configuration
│   └── types.ts           # TypeScript type definitions
├── tests/                  # Test files
├── package.json           # Project dependencies
└── tsconfig.json         # TypeScript configuration
```

## Testing

The project includes a comprehensive test suite. Run tests using:

```bash
npm test
```

For development, you can use watch mode:

```bash
npm run test:watch
```

To check test coverage:

```bash
npm run test:coverage
```

## Dependencies

- chokidar - File system watcher
- dotenv - Environment variable management
- luxon - DateTime handling
- unzipper - File compression utilities

## License

ISC

## Author

drumnation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your Gemini API key:
- Create a `.env` file in your project root
- Add your Gemini API key:
```
GEMINI_API_KEY=your_api_key_here
```

3. Run the tool:
```bash
ts-node src/directory-structure.ts [project_path]
```

## Configuration

The tool can be configured through:
- Environment variables (like `GEMINI_API_KEY`)
- Project-specific settings in `config.json`
- TypeScript configuration in `tsconfig.json`
