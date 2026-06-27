# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains app code for the Electron main/renderer split.
  - `src/window/` is the main process. It is organized by responsibility: `app/`, `container/`, `domain/`,
    `infrastructure/`, `interface/`, `ipc/`, `menu/`, `protocol/`, `state/`, `types/`, `utils/`, and `window/`.
  - `src/ui/` is the React renderer. It contains domain areas, feature UI, layout modules, plugins, shared IPC and
    renderer-command utilities, hooks, libs, and shared components.
  - `src/preload.ts` is the validated IPC bridge exposed to the renderer.
  - `src/renderer.ts` and `src/index.html` are the renderer entrypoints.
- `public/` holds static assets.
- `test/` contains manual test fixtures (markdown files and trace data).
- Build/config files live at the root: `forge.config.ts`, `webpack.*.ts`, `tsconfig.json`.

## Build, Test, and Development Commands

- `npm start`: run Electron Forge dev mode with hot reload.
- `npm run make`: build distributables.
- `npm run package`: package without making installers.
- `npm run publish`: publish with Electron Forge.
- `npm run lint`: run ESLint checks.
- `npm run format`: format with Prettier (all supported file types).
- `npm run format:check`: verify formatting without writing.
- `npm test`: run all Jest projects.
- `npm run test:watch`: run Jest in watch mode.

## Coding Style & Naming Conventions

- Indentation: 2 spaces; line width: 120; semicolons required; single quotes; LF line endings; no trailing commas.
- Formatting is enforced by Prettier (`prettier.config.js`); ESLint is quality-only.
- TypeScript aliases are configured for `src/*`, `_types`, and `bin/*`.
- Unused variables and arguments are lint errors unless their names start with `_`.
- Naming:
  - Files: `kebab-case` (e.g., `detail-bar.tsx`).
  - Components/Classes/Types: `PascalCase` (interfaces often `I*`).
  - Variables/Functions: `camelCase`.
  - Constants: `UPPER_SNAKE_CASE`.
- Import order: React, third-party libs, local modules, then types.

## Development Constraints

- Main process and renderer process code must follow the minimal-change principle and single-function principle.
- For data transformations, especially high-frequency object processing, prefer functional programming practices: pure
  functions, immutable updates, explicit inputs/outputs, and composable helpers.
- Prefer reusing existing utility functions. When an existing helper cannot be reused directly but most logic is shared,
  extract the common logic into small atomic helpers and compose them to implement the needed behavior.
- Main process code in `src/window/` must follow JavaScript OOP best practices, SOLID principles, and Electron official best practices.
- Main process services should depend on interfaces in `src/window/interface/` and be registered through
  `src/window/container/index.ts`.
- IPC changes should keep the contract, validation, handler registration, preload exposure, and renderer gateway usage in
  sync. Start from `src/window/ipc/ipc-contract.ts` and update related request validation, handlers, `src/preload.ts`,
  and `src/ui/shared/ipc/` as needed.
- Renderer process code in `src/ui/` must follow React development best practices and AOP programming conventions.
- Renderer code should keep domain behavior, feature UI, plugins, shared IPC/commands, and layout modules separated.

## Testing Guidelines

- Jest is configured with two projects:
  - `node`: uses the Node environment for `src/{config,tools,window}/**/*.test.ts`.
  - `renderer`: uses jsdom for `src/ui/**/*.test.(ts|tsx)`.
- Renderer tests load `jest.setup.ts`; CSS/Less and static assets are mapped to test mocks.
- Test-only globals and matcher types come from `tsconfig.spec.json`.
- Use `test/` fixtures (e.g., `test/test1.md`) for manual regression checks.
- Verify hot-reload behaviors around editor cache and IPC changes.
- When adding test files, make sure test-only globals and matcher extensions are visible to both Jest and the editor
  LSP; prefer local type references when the main TS project does not include those types.

## Commit & Pull Request Guidelines

- Commit messages follow a conventional style like `feat: ...` (see `git log`).
- PRs should include: summary, testing performed, and UI screenshots when relevant.

## Platform & Architecture Notes

- App targets macOS currently (Windows/Linux not adapted).
- Electron Forge + Webpack handles builds; keep main vs renderer boundaries clear.
