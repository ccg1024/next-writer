# Main Process Architecture Progress

## Final Target

The main process architecture should evolve toward a layered Electron application structure that keeps platform concerns, business use cases, and shared state separated. The final shape should follow JavaScript OOP practices, SOLID principles, and Electron official security guidance.

The target file architecture is:

```text
src/window/
  main.ts                         # Thin bootstrap entry
  container/
    index.ts                      # DI bindings
  app/
    application.ts                # Application lifecycle composition
    app-lifecycle.ts              # ready / activate / quit
    global-error-reporter.ts
  window/
    main-window-factory.ts
    window-registry.ts
    window-guards.ts              # navigation/window-open/webview restrictions
  protocol/
    protocol-service.ts
    protocol-url-resolver.ts
  ipc/
    ipc-router.ts
    ipc-contract.ts
    sender-validator.ts
    handlers/
  domain/
    workspace-service.ts
    library-service.ts
    document-service.ts
    cache-service.ts
    config-service.ts
  infrastructure/
    file-system.ts
    app-paths.ts
    json-store.ts
  menu/
    app-menu.ts
    menu-actions.ts
```

Target responsibilities:

- `main.ts` only performs Electron bootstrap work that must happen before the app is ready.
- `container/` owns dependency binding and should replace the current `inversify.config/` location.
- `app/` owns lifecycle orchestration, macOS activation behavior, quit behavior, and global error reporting.
- `window/` owns `BrowserWindow` creation, security defaults, window guards, and the current-window registry.
- `protocol/` owns custom protocol registration and URL-to-file resolution.
- `ipc/` owns IPC routing, contracts, sender validation, and command handlers.
- `domain/` owns application use cases such as config, workspace, document, library, and cache behavior.
- `infrastructure/` owns low-level adapters such as filesystem access, app paths, and JSON persistence.
- `menu/` owns menu template creation and menu actions.
- `entities/`, `services/`, and `ipc-handler/` are transitional folders. They should shrink or disappear as code moves into the target folders above.

Architecture goals:

- Keep Electron APIs isolated from business logic.
- Use constructor injection instead of handlers pulling dependencies from the global container.
- Keep IPC channels explicit and allowlisted.
- Avoid storing `BrowserWindow` inside general application config state.
- Keep path access centralized and validated.
- Preserve existing user data formats: `nwriter.json` and `.nwriter.info.json`.
- Preserve renderer compatibility during migration, including the deprecated `_post` API.

## Current Progress

Completed in the latest main process refactor:

- Added `Application` to coordinate `app.whenReady()`, protocol handlers, global errors, IPC registration, initial window creation, `window-all-closed`, and macOS `activate`.
- Reduced `src/window/index.ts` to squirrel handling, privileged scheme registration, and `Application.start()`.
- Added `GlobalErrorReporter` so main-process error listeners are registered once.
- Added `MainWindowFactory` with Electron security defaults:
  - `nodeIntegration: false`
  - `contextIsolation: true`
  - `sandbox: true`
  - navigation blocking
  - new-window denial with external HTTP(S) handoff
  - webview attach blocking
- Added `WindowRegistry`, moved current-window access away from `MainProcessConfig.win`, and later removed the
  deprecated `win` field from `MainProcessConfig`.
- Updated `NextCacheSystem` to use `WindowRegistry` for `setDocumentEdited`.
- Added `ProtocolService` for `atom` and `static` protocols.
- Reduced protocol privileges by removing broad options such as `bypassCSP` and `allowServiceWorkers`.
- Added `PathResolver` with root allowlist validation using `path.resolve` and `path.relative`.
- Fixed `atom://` image handling after tightening path checks:
  - library-relative images resolve under `rootDir`
  - library-contained absolute paths remain allowlisted
  - external absolute paths are only allowed for common image extensions
- Replaced IPC handler internals with class-based injectable handlers.
- Updated `NextIpcServer` into a Map-backed router with:
  - duplicate channel detection
  - invalid request handling
  - unknown channel handling
  - trusted sender validation against `WindowRegistry`
  - unified response wrapping
- Added explicit preload APIs:
  - `readConfig`
  - `readFile`
  - `updateLib`
  - `writeFile`
  - `queryRuntimeConfig`
  - `updateCache`
- Kept `_post` as a deprecated compatibility wrapper with channel allowlisting.
- Changed renderer IPC listener flow so raw `IpcRendererEvent` is not exposed to renderer callbacks.
- Added shared IPC contract definitions for channels, request data, response data, and the shared invoke channel name.
- Added per-channel IPC request validation and reuse it in both preload and the main-process IPC router.
- Bound IPC handler request/response types to each handler channel through the typed channel map.
- Extracted IPC sender trust checks into injectable `SenderValidator`.
- Normalized `write-file` success responses to `data: null`.
- Extracted `ConfigService`, `WorkspaceService`, `DocumentService`, `LibraryService`, and `MenuActionService`.
- Moved legacy `NextMenu` out of `entities/` into `menu/AppMenu` as `app-menu.ts`.
- Renamed the menu DI boundary from `INextMenu` / `TYPES.INextMenu` to `IAppMenu` / `TYPES.IAppMenu`.
- Extracted `WindowCloseService` so unsaved-change close confirmation is no longer embedded in the window session
  coordinator.
- Kept existing close behavior intact: cancel blocks closing, confirm closes the window and discards unsaved changes.
- Replaced legacy `NextApp` with `WindowSessionCoordinator` for main-window session composition.
- Extracted `WindowCloseController` so close event wiring and dirty-close guard behavior live under `window/`.
- Removed deprecated `win` from `MainProcessConfig`; `WindowRegistry` is now the shared window access boundary.
- Kept legacy data shape and menu behavior intact.
- Added correct `IPC_CHANNEL.WRITE_FILE` while keeping deprecated `WIRTE_FILE` compatibility.
- Added focused automated tests for main-process path and protocol boundaries:
  - `PathResolver` now covers root allowlist validation, traversal rejection, root-contained absolute Markdown paths, single `.md` suffix handling, and empty path failures.
  - `ProtocolService` now covers one-time handler registration, `atom://` root-contained files, external image compatibility, external non-image rejection, and `static://` renderer-bundle traversal rejection.
- Added focused automated tests for IPC contract boundaries:
  - `RequestValidator` now covers valid payloads, invalid envelopes, unknown channels, payload rejection for no-data channels, per-channel payload failures, and deprecated `WIRTE_FILE` compatibility.
  - `NextIpcServer` now covers listener registration, invalid request handling, duplicate handler detection, sender rejection, trusted dispatch, `null` response normalization, thrown handler errors, and destroy cleanup.
- Added focused automated tests for close lifecycle behavior:
  - `WindowCloseService` now covers clean close, canceling dirty close, and confirming dirty close.
  - `WindowCloseController` now covers close cancellation, confirmed dirty close cleanup, and clean close cleanup.
  - `WindowSessionCoordinator` now covers window creation, session cleanup, and replacing an existing live window.
- Added focused automated tests for the application menu boundary:
  - `AppMenu` now covers menu installation and delegation for save, library synchronization, sidebar toggles, and TOC toggles.
- Formatted the previously failing `src/window/protocol/protocol-service.test.ts` file.

Validation performed:

- `npm run lint` passes.
- `npm test -- --runInBand` passes with 11 suites and 50 tests.
- `npm run package` passes.
- `npm run format:check` passes.

## Current Design Tradeoffs

- `entities/` still exists because the migration is incremental. New code is placed by responsibility, while old implementation classes remain in place to avoid a large file-move-only diff.
- `NextIpcServer` still keeps its legacy name, but its responsibility is now narrower.
- `atom://` intentionally allows external absolute image files for compatibility with existing Markdown content. This is narrower than the old behavior because non-image files outside the library root remain blocked.
- `_post` remains available for renderer compatibility, but new renderer code should prefer explicit preload methods.
- Focused automated coverage now exists for document cache revisions, path resolution, protocol boundaries, IPC routing/validation, close lifecycle behavior, and library-tree utilities. Broader Electron integration behavior still depends on package/lint checks and manual regression until an app-level harness is added.

## Next Steps

Recommended next implementation order:

1. Continue shrinking legacy entities.
   - Move or rename `NextIpcServer` into the final IPC router structure once behavior is stable.
   - Keep file moves separate from behavior changes where possible.

2. Improve state boundaries.
   - Split runtime menu state from persisted render config.
   - Consider immutable updates for library tree operations to reduce accidental shared mutation.

3. Improve protocol and image compatibility.
   - Decide whether external image paths should be persisted as absolute local paths, copied into the library, or mediated by an import workflow.
   - Add clearer error logging for blocked `atom://` requests.
   - Consider separate protocol handlers for library files and external image previews.

4. Improve close/save lifecycle.
   - Continue narrowing `WindowSessionCoordinator` responsibilities after extracting unsaved-change close confirmation.
   - Ensure cache state, document edited state, and renderer dirty state stay consistent after save, rename, and window close.

5. Continue IPC cleanup.
   - Move IPC router and handler folders into the final `ipc/` target structure once behavior is stable.
   - Gradually replace renderer `_post` usage with explicit preload methods.
   - Keep deprecated `_post` available until compatibility consumers are confirmed gone.

6. Add development documentation.
   - Document main-process folder responsibilities.
   - Document IPC channel creation steps.
   - Document Electron security assumptions and exceptions.
   - Document manual regression scenarios until automated tests exist.

7. Expand automated regression coverage.
   - Add tests for close/save lifecycle coordination around dirty cache state.
   - Consider an Electron-level smoke harness for startup, preload isolation, and menu shortcuts.

## Manual Regression Checklist

Before merging the architecture changes, manually verify:

- App starts with `npm start`.
- Renderer loads with `nodeIntegration: false`.
- Config and library tree load on first window.
- Markdown file open, edit, cache, save, and rename still work.
- Unsaved close confirmation still appears.
- Menu shortcuts still trigger save and sidebar toggles.
- `atom://` renders:
  - relative library images
  - absolute images inside the library root
  - existing external absolute image paths
- `atom://` rejects non-image files outside the library root.
- `static://` assets load.
- macOS dock activation recreates a window after all windows are closed.
