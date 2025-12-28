# AGENTS.md - Next Writer Development Guide

## Build & Development Commands
- `npm start` - Start development server with hot reload
- `npm run make` - Package application for distribution
- `npm run lint` - Run ESLint code quality checks
- `npm run package` - Create package without distribution
- `npm run publish` - Publish to distribution channels

## Code Style Guidelines

### Imports Order
1. React imports (`import { FC, useEffect } from 'react'`)
2. Third-party libraries (CodeMirror, Ant Design, Emotion)
3. Local modules (hooks, libs, components)
4. Type imports (`import { FileState } from '_types'`)

### Formatting (Prettier)
- Single quotes, 2-space indentation
- 120 character print width
- Semicolons required
- No trailing commas
- Arrow parens: avoid when single parameter

### TypeScript
- Strict mode enabled (`noImplicitAny: true`)
- Use explicit types, avoid `any`
- Experimental decorators enabled for InversifyJS
- Path aliases: `src/*`, `_types`, `bin/*`

### Naming Conventions
- **Files**: kebab-case (e.g., `detail-bar.tsx`, `use-editor.tsx`)
- **Variables/Functions**: camelCase
- **Components/Classes**: PascalCase
- **Interfaces/Types**: PascalCase (often prefixed with `I` for interfaces)
- **Constants**: UPPER_SNAKE_CASE

### React Components
- Use function components with TypeScript
- Define props interfaces
- Use `FC<Props>` type for components
- Prefer hooks over class components

### Error Handling
- Use TypeScript type system for compile-time safety
- Avoid runtime type checking when possible
- Use optional chaining and nullish coalescing
- Follow existing patterns in IPC handlers

### Project Architecture
- **Main Process**: `src/window/` - Electron main process code
- **Renderer Process**: `src/ui/` - React UI components
- **Plugins**: `src/ui/plugins/` - CodeMirror extension system
- **Dependency Injection**: InversifyJS in `src/window/inversify.config/`
- **Unused Code**: `src/**/unused/` - Do not modify these directories

### Key Technologies
- Electron + React + TypeScript
- CodeMirror 6 for editor functionality
- Ant Design for UI components
- Emotion for CSS-in-JS styling
- InversifyJS for dependency injection
- PubSub-js for event communication

### Testing
- No test framework currently configured
- Manual testing with markdown files in `test/` directory
- Focus on functional testing of editor features

### Development Notes
- macOS-only development (not adapted for Windows/Linux)
- Hybrid editing mode with hidden markdown syntax
- Image preview and full-screen functionality
- Typewriter mode support
- Real-time file saving via IPC handlers