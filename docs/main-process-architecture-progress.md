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
- Added `WindowRegistry` and moved current-window access away from `MainProcessConfig.win`.
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
- Extracted `ConfigService`, `WorkspaceService`, `DocumentService`, `LibraryService`, and `MenuActionService`.
- Kept legacy data shape and menu behavior intact.
- Added correct `IPC_CHANNEL.WRITE_FILE` while keeping deprecated `WIRTE_FILE` compatibility.

Validation performed:

- `npm run lint` passes.
- `npm run package` passes.
- `npm run format:check` still fails only because existing `AGENTS.md` is not Prettier-formatted.

## Current Design Tradeoffs

- `entities/` still exists because the migration is incremental. New code is placed by responsibility, while old implementation classes remain in place to avoid a large file-move-only diff.
- `NextApp`, `NextMenu`, and `NextIpcServer` still keep their legacy names, but their responsibilities are now narrower.
- `atom://` intentionally allows external absolute image files for compatibility with existing Markdown content. This is narrower than the old behavior because non-image files outside the library root remain blocked.
- `_post` remains available for renderer compatibility, but new renderer code should prefer explicit preload methods.
- No automated test framework exists yet, so regression coverage is currently lint, package, and manual Electron checks.

## Next Steps

Recommended next implementation order:

1. Add focused tests or test harnesses for path and protocol behavior.
   - `resolveWithinRoot` should reject path traversal.
   - `resolveLibraryPath` should preserve absolute `.md` paths without appending `.md` twice.
   - `atom://` should allow root-contained files and external image files only.
   - `static://` should reject traversal outside `.webpack/renderer`.

2. Finish IPC contract hardening.
   - Add per-channel request validation.
   - Replace stringly typed `Request.type` with a typed channel map.
   - Make handler response types explicit end to end.
   - Remove direct use of deprecated `WIRTE_FILE` from new code.

3. Continue shrinking legacy entities.
   - Move remaining window lifecycle guard logic out of `NextApp`.
   - Rename `NextApp` to a clearer window/session coordinator once call sites are stable.
   - Rename `NextMenu` or split it into menu template and menu action bindings.
   - Keep file moves separate from behavior changes where possible.

4. Improve state boundaries.
   - Remove `win` from `MainProcessConfig` after confirming there are no external consumers.
   - Split runtime menu state from persisted render config.
   - Consider immutable updates for library tree operations to reduce accidental shared mutation.

5. Improve protocol and image compatibility.
   - Decide whether external image paths should be persisted as absolute local paths, copied into the library, or mediated by an import workflow.
   - Add clearer error logging for blocked `atom://` requests.
   - Consider separate protocol handlers for library files and external image previews.

6. Improve close/save lifecycle.
   - Move unsaved-change close confirmation out of `NextApp`.
   - Ensure cache state, document edited state, and renderer dirty state stay consistent after save, rename, and window close.

7. Add development documentation.
   - Document main-process folder responsibilities.
   - Document IPC channel creation steps.
   - Document Electron security assumptions and exceptions.
   - Document manual regression scenarios until automated tests exist.

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
