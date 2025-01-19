# Directory Structure

## Project Metrics

**Files**: 14
**Total Lines**: 3710

## File Types

- .ts: 14 files, 3710 lines

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
