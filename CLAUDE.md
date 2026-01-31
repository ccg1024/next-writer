# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next Writer is a cross-platform markdown editor built with Electron and React. It is currently macOS-only (not adapted for Windows/Linux). The key differentiator is its **hybrid editing mode** that hides markdown syntax marks (emphasis, strong emphasis, etc.) for a cleaner writing experience.

## Development Commands

```bash
npm install              # Install dependencies
npm start                # Development mode with hot reload
npm run package          # Create a package
npm run make             # Build for distribution
npm run lint             # Run ESLint
```

## Architecture

This is an Electron application with separate main and renderer processes:

### Main Process (`src/window/`)
- Handles file system operations, window management, and IPC
- Uses **InversifyJS** for dependency injection (container config in `inversify.config/`)
- IPC handlers in `ipc-handler/` communicate with the renderer
- Data entities in `entities/` represent the domain model

### Renderer Process (`src/ui/`)
- React 18 application with TypeScript
- **CodeMirror 6** powers the editor with extensive custom plugins
- **Ant Design 5.20.5** provides UI components
- **Emotion** handles CSS-in-JS styling
- **PubSub-js** enables inter-process communication

### Key Directories
- `src/ui/modules/` - Feature modules (layout, sidebar, editor)
- `src/ui/plugins/` - Custom CodeMirror extensions and plugins
- `src/ui/components/` - UI components (primarily Ant Design integrations)
- `src/ui/hooks/` - Custom React hooks
- `src/ui/libs/` - Utility libraries and API wrappers
- `src/ui/mix-components/` - Global/shared UI components

## Communication Between Processes

The app uses a custom IPC system:
1. `preload.ts` acts as the bridge between main and renderer
2. Custom protocols registered: `atom://` for file access, `static://` for assets
3. Type-safe IPC handlers for operations like file saving, reading, and library management

## Key Features to Understand

### Hybrid Mode
The editor hides markdown syntax marks during editing. This is implemented through CodeMirror plugins that decorate the editor view.

### List Alignment
Word-wrapped list content is intelligently aligned. This logic resides in the editor plugins.

### Image Handling
- Inline preview with zoom capabilities
- Full-screen viewing
- Automatic preprocessing and caching
- Images embedded via custom protocol

### Library System
Hierarchical folder structure for notes, managed through the main process and exposed via IPC.

## Code Conventions

- **File names**: kebab-case (`detail-bar.tsx`, `use-editor.tsx`)
- **Variables/Functions**: camelCase
- **Components/Classes**: PascalCase
- **Interfaces/Types**: PascalCase, often prefixed with `I`
- **Constants**: UPPER_SNAKE_CASE

### Import Order
1. React imports
2. Third-party libraries (CodeMirror, Ant Design, Emotion)
3. Local modules (hooks, libs, components)
4. Type imports

## TypeScript Configuration

- Strict mode enabled
- Experimental decorators enabled for InversifyJS
- Path aliases configured: `src/*`, `_types`, `bin/*`
- Avoid `any` type - use explicit types

## Build System

Uses **Electron Forge** with custom webpack configurations:
- Separate webpack configs for main and renderer processes
- Forge config in `forge.config.ts`

## Testing

No formal test framework. Manual testing is done with markdown files in the `test/` directory.
