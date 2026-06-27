# UI Modules

## `shared/ipc`

Responsibility: Typed renderer-side gateway for existing preload IPC methods.

Public API: `rendererGateway.readConfig`, `readFile`, `updateLib`, `writeFile`, `queryRuntimeConfig`, and `updateCache`.

Dependencies: `window.ipc` and `_types` request/response shapes.

Side-effect boundary: This is the only new renderer adapter that directly calls preload IPC.

Tests: Covered indirectly by provider/use-case consumers for now; IPC wire shape remains unchanged.

## `shared/renderer-command`

Responsibility: React hook boundary for commands dispatched from the main process menu.

Public API: `useRendererCommand(type, handler)`.

Dependencies: Internal `renderer-ipc-listener` singleton in the same shared boundary.

Side-effect boundary: Registers/deregisters command callbacks during component lifecycle.

Tests: Existing behavior is preserved through `useRendererCommand`; focused hook tests are still pending.

## `domain/library`

Responsibility: Own renderer library tree state, selected library, selected note, tree updates, and library/note IPC mutation actions.

Public API: `LibraryProvider`, `useLibraryState()`, `useLibraryActions()`, and exported `libraryReducer` for tests.

Data flow: `Home` loads the initial tree through `rendererGateway.readConfig()` and calls `setLibraryTree`. `features/library-workspace` reads state and calls domain actions for selection and library/note mutations. Tree updates reuse `refreshRendererTree`, `updateRendererTree`, and `findRendererNodeById`.

Side-effect boundary: Domain mutation actions call `rendererGateway.updateLib`; UI-specific confirmation, validation messages, and loading state remain in the library workspace feature during this migration slice.

Tests: `src/ui/domain/library/index.test.tsx` covers initial runtime field generation, selected-node sync after update, and append/remove operations.

Manual acceptance: Start app, load libraries, select library/note, create/rename/delete library, create/delete note, and verify selected note state survives tree refreshes when applicable.

## `domain/runtime`

Responsibility: Own renderer runtime config and menu/sidebar visibility state.

Public API: `RuntimeProvider`, `useRuntimeLayout()`.

Data flow: `Home` loads runtime config through `rendererGateway.queryRuntimeConfig()` and calls `setRuntimeConfig`. Library/detail sidebar startup visibility follows the existing persisted runtime config behavior. `Outline` keeps the previous startup behavior of staying hidden until a menu command toggles it.

Side-effect boundary: No IPC calls inside the provider; it only receives already-loaded runtime config.

Tests: Pending focused reducer/hook tests.

Manual acceptance: Toggle library sidebar, detail sidebar, and TOC from the app menu and verify visibility matches the previous behavior.

## `domain/editor`

Responsibility: Own active CodeMirror view reference for migrated consumers, outline heading state, and outline scroll command.

Public API: `EditorProvider`, `useEditorState()`, `useEditorActions()`.

Data flow: `Main` sets the editor view and syncs headings on editor mount and document changes. `Outline` reads `headList` and invokes `scrollToLine`.

Side-effect boundary: `scrollToLine` dispatches CodeMirror selection/scroll effects. File read/cache/save effects are still in `Main` and are the next migration target.

Tests: Pending editor session and outline command tests.

Manual acceptance: Open a note with headings, edit headings, toggle the outline, and click headings to jump the editor.

## Transitional Compatibility

`src/ui/hooks/use-renderer-ipc-action.ts` now delegates to `useRendererCommand`.

`src/ui/home/module.context.ts` remains as a compatibility facade over `LibraryProvider` and `RuntimeProvider`.

`messagePublish` and `renderStore` remain available for old code paths. New migrated modules should not read from them directly.
