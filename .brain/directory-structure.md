# Directory Structure

## Project Metrics

**Files**: 22
**Total Lines**: 4624

## File Types

- .ts: 22 files, 4624 lines

## Project Tree

```
├── README.md # Project documentation
├── config.json # Project configuration
├── config.template.json # Default configuration template
├── package.json # Project dependencies and metadata
├── pnpm-lock.yaml # Package manager lock file
├── src
│   ├── analyzers.ts
│   ├── auto-updater.ts
│   ├── cache-manager.ts
│   ├── config.ts
│   ├── content-generator.ts
│   ├── directory-structure.ts
│   ├── gemini-service.ts
│   ├── project-identifier.ts
│   ├── rules-analyzer.ts
│   ├── rules-generator.ts
│   ├── rules-watcher.ts
│   ├── services
│   │   └── gemini.service.ts
│   ├── setup.ts
│   └── types.ts
├── tests
│   ├── analyzers.test.ts
│   ├── cache-manager.test.ts
│   ├── content-generator.test.ts
│   ├── gemini.test.ts
│   ├── project-identifier.test.ts
│   └── test-project
│       ├── another.ts
│       ├── package.json # Project dependencies and metadata
│       ├── subdir
│       │   └── sub.ts
│       └── test.ts
└── tsconfig.json # TypeScript compiler configuration
```


## Functions


### src/analyzers.ts

- analyzeFileContent
- isBinaryFile
- shouldIgnoreFile

### src/auto-updater.ts

- clearConsole

### src/config.ts

- getDefaultConfig
- getFileLengthLimit
- loadConfig
- resolveProjectPath

### src/content-generator.ts

- generateContent
- generateDirectoryStructureContent
- generateTreeWithDescriptions
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
- setupDirectoryStructure

### tests/analyzers.test.ts

- cleanupTestFiles
- createTestFiles
- testFunction

### tests/cache-manager.test.ts

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

### tests/test-project/another.ts

- anotherFunction

### tests/test-project/subdir/sub.ts

- subFunction

### tests/test-project/test.ts

- testFunction