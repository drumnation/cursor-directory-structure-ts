# CursorFocus

A TypeScript tool for monitoring and analyzing project directory structures, with seamless integration for Cursor IDE. This tool helps you track and analyze changes in your project's directory structure, making it easier to maintain and understand your codebase.

## Features

- Project directory structure monitoring
- Automatic project type detection
- Real-time file change tracking
- Customizable rules and analysis
- Built-in test coverage support
- Integration with AI Brain Garden's `.brain` folder system
- Automatic Cursor agent configuration

## How It Works

### Directory Structure Documentation

The tool automatically maintains a `directory-structure.md` file in the `.brain` folder of each monitored project. This file contains:
- A detailed map of your project's structure
- File and directory descriptions
- Key architectural insights
- Important dependency relationships

Example `.brain/directory-structure.md`:
```markdown
# Project Structure
📁 src/
  └─ components/
     ├─ auth/         # Authentication related components
     └─ dashboard/    # Main dashboard interface
  └─ utils/          # Shared utility functions
  └─ types/          # TypeScript type definitions
...
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