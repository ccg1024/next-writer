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
npm run format           # Format all files with Prettier
```

## Task Completion

After completing any task, you MUST output the following message:

`+_+ 还有什么需要嘛？`

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

## Code Formatting

The project uses **Prettier 3.8.1** for code formatting with specific configuration. **ALL code must follow these formatting rules.**

### Prettier Configuration

**Location**: `prettier.config.js`

```javascript
{
  arrowParens: 'avoid',        // (x) => x instead of (x) => (x)
  singleQuote: true,           // Use single quotes instead of double
  bracketSpacing: true,        // { key: value } instead of {key: value}
  endOfLine: 'lf',             // Line feed (Unix style)
  semi: true,                  // Require semicolons
  tabWidth: 2,                 // 2 spaces for indentation
  trailingComma: 'none',       // No trailing commas
  printWidth: 120              // Max line length of 120 characters
}
```

### Formatting Rules Summary

| Rule                | Setting             | Example                        |
| ------------------- | ------------------- | ------------------------------ |
| **Quotes**          | Single              | `const str = 'hello';`         |
| **Semicolons**      | Required            | `const x = 1;`                 |
| **Indentation**     | 2 spaces            | No tabs                        |
| **Line Width**      | 120 chars           | Max characters per line        |
| **Trailing Commas** | None                | `const obj = { a: 1, b: 2 }`   |
| **Arrow Parens**    | Avoid when possible | `x => x` instead of `(x) => x` |
| **Line Endings**    | LF                  | Unix-style line endings        |

### ESLint Integration

ESLint is configured for **code quality checking only**. Prettier handles **all formatting**.

**Important**: ESLint and Prettier are **NOT** integrated via eslint-plugin-prettier. They run separately:

- **Prettier**: Formats code style (quotes, spacing, line width, etc.)
- **ESLint**: Checks code quality (unused variables, type errors, etc.)

### Formatting Workflow

**VSCode Auto-Format on Save**:

- Configured in `.vscode/settings.json`
- Prettier formats on save
- ESLint auto-fixes on save

**Manual Formatting**:

```bash
# Format all files
npx prettier --write "**/*.{ts,tsx,js,jsx,json,css,less,md}"

# Format specific file
npx prettier --write src/ui/modules/main/index.tsx

# Check formatting without making changes
npx prettier --check "**/*.{ts,tsx,js,jsx}"
```

### Formatting Best Practices

1. **Always format before committing**
   - VSCode auto-formats on save
   - Or run: `npm run format` (if added)

2. **Don't commit formatting-only changes**
   - If you see a PR/commit with only formatting changes
   - It means the original code wasn't formatted properly
   - Avoid this by formatting as you work

3. **Formatting conflicts**
   - If Prettier and ESLint disagree, Prettier wins
   - Format issues are caught by pre-commit hooks (if configured)

4. **When creating new code**
   - Follow Prettier rules as you write
   - Let auto-format handle the details
   - Don't manually fight the formatter

### Common Formatting Issues

| Issue             | Cause               | Solution                  |
| ----------------- | ------------------- | ------------------------- |
| Double quotes     | Manual editing      | Use single quotes         |
| Trailing commas   | Old config          | Remove trailing commas    |
| Long lines        | Exceeding 120 chars | Break into multiple lines |
| Mixed tabs/spaces | Manual editing      | Use 2 spaces only         |

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

## Development Lessons & Gotchas

### Hot Reload Related Issues

**Critical Lesson: Effect Dependencies in Hot Reload Scenarios**

When working with React effects in development mode with hot reload, be extremely careful about effect dependencies.

#### Problem Case: File Cache Corruption

**Location**: `src/ui/modules/main/index.tsx:243`

**The Bug**:

```typescript
// ❌ WRONG - Causes cache corruption on hot reload
useEffect(() => {
  // ... cache management logic
  return () => {
    // Cleanup: update cache when editor unmounts
    mainProcess.updateCache({
      path: prevNoteInfoRef.current.relativePath,
      content: editor.state.doc.toString(),
      isChange: isModifiedRef.current
    });
  };
}, [editor, currentNote?.id]); // Two dependencies!
```

**Why It Failed**:

1. User opens file A, then switches to file B
2. `currentNote.id` changes from "A" to "B"
3. Effect cleanup triggers (because `currentNote?.id` changed)
4. Cleanup updates cache with **current editor content** (which may be file B's content)
5. Cache for file A gets corrupted with file B's content (or empty content)
6. Hot reload amplifies this issue

**The Fix**:

```typescript
// ✅ CORRECT - Only trigger on editor instance change
useEffect(() => {
  // ... cache management logic
  return () => {
    // Cleanup: only update cache when editor actually unmounts
    mainProcess.updateCache({
      path: prevNoteInfoRef.current.relativePath,
      content: editor.state.doc.toString(),
      isChange: isModifiedRef.current
    });
  };
}, [editor]); // Only depend on editor instance
```

**Key Principles**:

1. **Effect cleanup should only run for its actual lifecycle event**
   - If cleanup should run "on editor unmount", only depend on `editor`
   - Don't add unrelated state variables to dependencies

2. **Hot reload exposes timing issues that normal usage might not**
   - Always test cache-related features with hot reload
   - Hot reload causes component unmount/remount which triggers all cleanup functions

3. **State updates in cleanup functions are especially dangerous**
   - Cleanup runs during transitions when state may be inconsistent
   - Validate state before using it in cleanup
   - Consider if cleanup is the right place for the logic

4. **For cache synchronization**:
   - Use immediate updates for user edits (already implemented via `onEditorDocChange`)
   - Use cleanup only for final flush on component unmount
   - Don't trigger cache updates on unrelated state changes

### File Cache System

**Cache Validation** (`src/window/ipc-handler/read-file-handler.ts:26-30`):

The cache system now validates content before returning it:

```typescript
// Guard against empty cache (hot reload corruption)
const isCacheContentEmpty =
  buffer && (buffer.content === '' || buffer.content === undefined || buffer.content === null);
const content =
  buffer && !isCacheContentEmpty ? buffer.content : await fileSys.readFile(fullPath, { encoding: 'utf8' });
```

**When to Check Cache Behavior**:

- After any changes to effect dependencies
- After adding/changing cleanup logic
- During hot reload testing
- When implementing new cache-related features
