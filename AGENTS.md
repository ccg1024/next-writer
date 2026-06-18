# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains app code for the Electron main/renderer split.
  - `src/window/` is the main process (IPC, window management, file system).
  - `src/ui/` is the React renderer (modules, components, plugins, hooks).
  - `src/preload.ts` bridges IPC between processes.
- `public/` holds static assets.
- `test/` contains manual test fixtures (markdown files and trace data).
- Build/config files live at the root: `forge.config.ts`, `webpack.*.ts`, `tsconfig.json`.

## Build, Test, and Development Commands
- `npm start`: run Electron Forge dev mode with hot reload.
- `npm run make`: build distributables.
- `npm run package`: package without making installers.
- `npm run lint`: run ESLint checks.
- `npm run format`: format with Prettier (all supported file types).
- `npm run format:check`: verify formatting without writing.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; line width: 120; semicolons required; single quotes.
- Formatting is enforced by Prettier (`prettier.config.js`); ESLint is quality-only.
- Naming:
  - Files: `kebab-case` (e.g., `detail-bar.tsx`).
  - Components/Classes/Types: `PascalCase` (interfaces often `I*`).
  - Variables/Functions: `camelCase`.
  - Constants: `UPPER_SNAKE_CASE`.
- Import order: React, third-party libs, local modules, then types.

## Testing Guidelines
- No automated test framework is configured.
- Use `test/` fixtures (e.g., `test/test1.md`) for manual regression checks.
- Verify hot-reload behaviors around editor cache and IPC changes.

## Commit & Pull Request Guidelines
- Commit messages follow a conventional style like `feat: ...` (see `git log`).
- PRs should include: summary, testing performed, and UI screenshots when relevant.

## Platform & Architecture Notes
- App targets macOS currently (Windows/Linux not adapted).
- Electron Forge + Webpack handles builds; keep main vs renderer boundaries clear.
