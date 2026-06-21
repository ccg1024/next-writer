# UI Architecture Upgrade

## Goal

Rebuild `src/ui` toward domain providers, shared side-effect adapters, and feature-level composition while preserving the current renderer behavior. The migration uses React built-in state only; no Zustand or Redux is introduced.

## Phase Checklist

- [x] Create local tracking documentation.
- [x] Add shared renderer IPC gateway without changing preload/main-process wire shapes.
- [x] Add shared renderer command hook around the renderer command listener.
- [x] Extract library tree/current selection state into `LibraryProvider`.
- [x] Extract runtime menu visibility state into `RuntimeProvider`.
- [x] Extract editor outline state and scroll command into `EditorProvider`.
- [x] Rewire `Home`, `LibrarySidebar`, `Main`, and `Outline` to the new providers.
- [x] Add focused reducer coverage for migrated library state.
- [ ] Split `LibrarySidebar` into feature container/presentational components.
- [ ] Move editor read/cache/save/rename flows into dedicated editor use-cases.
- [ ] Split CodeMirror extensions, lifecycle, theme, and mouse aspects under `editor/codemirror`.
- [ ] Remove transitional `HomeContext`, `messagePublish`, and `renderStore` compatibility usage after all consumers migrate.
- [ ] Add component tests for `LibrarySidebar`, `Main`, and `Outline`.

## Migrated Files

- `src/ui/shared/ipc/renderer-gateway.ts`
- `src/ui/shared/renderer-command/index.ts`
- `src/ui/shared/async/use-async-action.ts`
- `src/ui/domain/library/index.tsx`
- `src/ui/domain/library/index.test.tsx`
- `src/ui/domain/runtime/index.tsx`
- `src/ui/domain/editor/index.tsx`
- `src/ui/home/index.tsx`
- `src/ui/home/module.context.ts`
- `src/ui/modules/library-sidebar/index.tsx`
- `src/ui/modules/main/index.tsx`
- `src/ui/modules/outline/index.tsx`
- `src/ui/libs/main-process/index.ts`
- `src/ui/hooks/use-renderer-ipc-action.ts`
- `src/ui/app.tsx`

## Current Risks

- `messagePublish` is still emitted from `Main` for migration compatibility; no migrated consumer depends on it.
- `renderStore` is still maintained by `useCodemirror` and `Home` for transitional compatibility.
- Library mutations are now domain actions, but loading/message/modal UI feedback is still composed in `LibrarySidebar`.
- `Main` still owns editor cache/save/read effects; those should move into editor use-cases next.

## Verification

- Added renderer reducer tests for library load/update/append/remove behavior.
- `npm run lint` passes.
- `npm test -- --runInBand` passes: 17 suites, 65 tests.
- `npm run format:check` still fails on pre-existing/unrelated files:
  - `docs/renderer-process-upgrade.md`
  - `src/preload.ts`

## Next Entry Point

Continue with editor use-case extraction:

1. Move `readFile`, `updateCache`, `writeFile`, modified-state refs, and title rename flow from `Main` into `domain/editor`.
2. Keep `Main` responsible only for rendering the title/editor surface and binding UI events.
3. Add focused tests for cache revision/save failure behavior before deleting transitional pub-sub emissions.
