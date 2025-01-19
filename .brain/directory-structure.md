# Directory Structure

## Project Metrics

**Files**: 18
**Total Lines**: 4168

## File Types

- .ts: 18 files, 4168 lines

## Project Tree

```
├── README.md    # Project documentation
├── config.json    # Configuration file
├── config.template.json    # Template for configuration file
├── package.json    # Project metadata and dependencies
├── pnpm-lock.yaml    # Dependency lock file
├── src    # Source code directory
│   ├── analyzers.ts    # Analyzes file content for complexity metrics
│   ├── auto-updater.ts    # Checks for and installs updates
│   ├── config.ts    # Loads and interacts with the configuration file
│   ├── content-generator.ts    # Generates content for directory structure tree
│   ├── directory-structure.ts    # Manages the directory structure tree
│   ├── gemini-service.ts    # Provides an interface to the Gemini API
│   ├── project-identifier.ts    # Identifies project type and language
│   ├── rules-analyzer.ts    # Analyzes directory structure for rule violations
│   ├── rules-generator.ts    # Generates rule violations based on directory structure
│   ├── rules-watcher.ts    # Watches for changes in directory structure and triggers rule analysis
│   ├── services
│   │   └── gemini.service.ts    # Provides functions to interact with Gemini API
│   ├── setup.ts    # Performs initial setup for the application
│   └── types.ts    # Defines TypeScript interfaces used in the application
├── tests    # Test directory
│   ├── analyzers.test.ts    # Tests for the analyzers module
│   ├── content-generator.test.ts    # Tests for the content-generator module
│   ├── gemini.test.ts    # Tests for the gemini.service module
│   ├── project-identifier.test.ts    # Tests for the project-identifier module
│   └── test-project    # Test project directory
│       ├── package.json    # Test project metadata and dependencies
│       ├── src    # Source code directory
│       │   └── index.ts    # Test project entry point
│       └── tsconfig.json    # Test project TypeScript configuration
└── tsconfig.json    # TypeScript configuration file
```


## Functions


### src/analyzers.ts

- analyzeFileContent    # Analyzes file content for complexity metrics (max 60 chars)
- isBinaryFile    # Checks if a file is binary (max 60 chars)
- shouldIgnoreFile    # Determines if a file should be ignored during analysis (max 60 chars)

### src/auto-updater.ts

- clearConsole    # Clears the console (max 60 chars)

### src/config.ts

- getDefaultConfig    # Returns the default configuration settings (max 60 chars)
- getFileLengthLimit    # Gets the maximum file length limit for analysis (max 60 chars)
- loadConfig    # Loads the configuration file (max 60 chars)
- resolveProjectPath    # Resolves the project path (max 60 chars)

### src/content-generator.ts

- generateDirectoryStructureContent    # Generates content for directory structure tree (max 60 chars)
- generateTreeWithDescriptions    # Generates a tree with file and directory names (max 60 chars)
- getDirectoryStructure    # Gets the directory structure of a project (max 60 chars)
- isBinaryFile    # Checks if a file is binary (max 60 chars)
- saveDirectoryStructure    # Saves the directory structure to disk (max 60 chars)
- scanForMetrics    # Scans the project for complexity metrics (max 60 chars)
- shouldIgnoreDirectory    # Determines if a directory should be ignored during analysis (max 60 chars)
- shouldIgnoreFile    # Determines if a file should be ignored during analysis (max 60 chars)
- structureToTree    # Converts a directory structure to a tree (max 60 chars)

### src/directory-structure.ts

- getDefaultConfig    # Returns the default configuration settings (max 60 chars)
- getParentDirectory    # Gets the parent directory of a given path (max 60 chars)
- main    # Main entry point for the application (max 60 chars)
- monitorProject    # Monitors a project for changes and triggers analysis (max 60 chars)
- setupDirectoryStructure    # Sets up the directory structure for the project (max 60 chars)

### src/project-identifier.ts

- determineProjectType    # Determines the project type (max 60 chars)
- enumerateProjectFiles    # Enumerates all files in a project (max 60 chars)
- getProjectDescription    # Gets the project description (max 60 chars)
- identifyMainLanguage    # Identifies the main language used in a project (max 60 chars)
- resolveFileTypeInfo    # Resolves the type info for a given file (max 60 chars)
- scanForProjects    # Scans for projects in the workspace (max 60 chars)

### src/rules-watcher.ts

- startWatching    # Starts watching a project for changes (max 60 chars)

### src/setup.ts

- addNewProject    # Adds a new project to the workspace (max 60 chars)
- displayMenu    # Displays the main menu (max 60 chars)
- loadConfig    # Loads the configuration file (max 60 chars)
- manageProjects    # Manages projects in the workspace (max 60 chars)
- resolveProjectPath    # Resolves the project path (max 60 chars)
- saveConfig    # Saves the configuration file (max 60 chars)
- scanDirectory    # Scans a directory for files (max 60 chars)
- setupCursorFocus    # Sets up cursor focus (max 60 chars)

### tests/analyzers.test.ts

- cleanupTestFiles    # Cleans up test files (max 60 chars)
- createTestFiles    # Creates test files (max 60 chars)
- testFunction    # Tests a function (max 60 chars)

### tests/content-generator.test.ts

- anotherFunction    # Another function (max 60 chars)
- cleanupTestProject    # Cleans up test project (max 60 chars)
- createTestProject    # Creates a test project (max 60 chars)
- subFunction    # Sub-function (max 60 chars)
- testFunction    # Tests a function (max 60 chars)

### tests/project-identifier.test.ts

- cleanupTestProjects    # Cleans up test projects (max 60 chars)
- createTestProjects    # Creates test projects (max 60 chars)