# E1 — App skeleton

Reads: docs/02, docs/07. Produces the runnable shell every later epic builds on.

## Scope

1. Repo scaffold: Electron + Vite + React 18 + TypeScript strict + MobX. Workspaces: `app/main`, `app/renderer`, `app/analysis`, `shared`.
2. Window management: visible fullscreen window (R1.2; `Esc` and corner button toggle, dev flag starts windowed), hidden analysis window (created lazily in E5 — stub the supervisor now), single-instance lock.
3. Typed IPC layer in `shared/ipc.ts`: channel names, request/response and event types from docs/02, a thin `invoke`/`handle`/`emit` wrapper so no raw `ipcRenderer` strings appear anywhere else. Stub handlers returning fixtures.
4. `SettingsStore` + main-process settings module implementing docs/07: load, validate (zod), atomic write, `settings:changed` fan-out, live-apply reaction plumbing.
5. better-sqlite3 integration: open/create DB in userData, `kv.schema_version`, migration runner (numbered SQL files), corruption stance from docs/02.
6. UI shell: app frame with mode switcher (Performance/Prep placeholders), root rem scaling wired to `ui.scale`, palette + type tokens from docs/06 as CSS variables, Bahnschrift/Consolas stacks.
7. electron-builder: NSIS installer, x64, app icon placeholder, `npm run dist` produces an installable exe.
8. Tooling: eslint + prettier configs, vitest for `shared` and stores, GitHub Actions CI (lint, typecheck, test, dist dry-run).

## Out of scope

Audio, MIDI, any real library data. Fixtures only.

## Acceptance criteria

- `npm run dev` opens the fullscreen shell with mode switcher; `Esc` exits fullscreen; relaunching while running focuses the existing instance.
- `npm run dist` output installs and launches on a clean Windows 11 VM with no dev tooling.
- Settings round-trip: change `ui.scale` via a temporary settings panel → UI rescales live → value present in `settings.json` → survives restart. Corrupt the JSON by hand → app launches with defaults and shows the notice.
- DB is created on first run; migration runner applies migration 001; deleting the DB file mid-development recreates it on next launch.
- All IPC calls in the renderer go through the typed wrapper (lint rule blocks `ipcRenderer` imports outside it).
- CI green on a clean clone.
