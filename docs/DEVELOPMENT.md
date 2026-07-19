# DEVELOPMENT — build, fixtures, release

For day-to-day booth operation see [`guides/updating.md`](./guides/updating.md) and [`guides/`](./guides/). This file is for people building or shipping StentorDeck.

## Local build

```bash
npm install                 # Electron ABI + rebuild:native (postinstall)
npm start                   # shared+main build, Electron splash, Vite
npm test                    # Vitest unit + component
npm run typecheck
npm run build               # all workspaces → dist/
npm run dist:dir            # unpackaged win-x64 under release/
npm run dist                # NSIS Setup.exe (no publish)
```

Requires Node 22 LTS (see `scripts/check-node.mjs`). Prefer a system Node — not Cursor’s helper Node on PATH.

## MIDI fixtures

- Decode / learn / takeover tests use recorded bytes under `shared` / `app/renderer` — CI never needs the RMX2.
- Dev harness MIDI monitor: copy last N as fixture when adding a new pad/CC (E3).
- Factory map: `shared/src/midiFactoryMap.ts` + docs/04. Owner confirms `[HW]` on hardware before claiming pad/LED criteria.

## Release checklist (booth auto-update)

Packaged updates use **GitHub Releases** + `electron-updater` (E7 / R1.1).

1. **Bump** `version` in root `package.json` (semver).
2. Ensure working tree is what you intend to ship; run `npm test` / smoke `npm start`.
3. Set a token with `repo` scope: `GH_TOKEN` or `GITHUB_TOKEN`.
4. Publish:

   ```bash
   npm run release
   ```

   (`CSC_IDENTITY_AUTO_DISCOVERY=false` — unsigned for now.)

5. On GitHub → Releases: verify the release is a **full release** (not Pre-release) tagged `v<version>`, and assets include:
   - `StentorDeck-Setup-<version>.exe`
   - `StentorDeck-ReleaseNotes-<version>.txt` (**required** — booth-facing notes; also used as the GitHub release body)
   - `latest.yml` (**required** — without it Settings → Check for updates finds nothing)
   - `*.blockmap` if present

   `npm run dist` writes the notes `.txt` from the CHANGELOG “Ship VERSION” entry. Prefer `npm run release` (dist + `publish:github`) so exe, notes, and `latest.yml` ship together. Do **not** hand-upload only the Setup.exe as a prerelease/tag like `mp3` — that breaks auto-update.
6. On a booth machine with the **previous** installed build:
   - Settings → **Check for updates** (or wait for quiet startup check)
   - Status → download → **Restart & update** (confirm if a deck is playing)
   - Confirm library / settings / MIDI map in `%APPDATA%` survived
7. Fallback: run the new Setup.exe over the old install (upgrade-in-place; `deleteAppDataOnUninstall: false`).

**SmartScreen:** unsigned builds may warn once until a cert is added. `win.verifyUpdateCodeSignature` is `false` so auto-update still works.

## Source-tree sync (not the booth path)

```bat
UPDATE.bat
```

or `npm run update` (`--stash`, `--start` optional). Refuses a dirty git tree unless `--stash`. Does **not** update an already-installed `.exe`.

## Packaging notes

- `appId`: `com.stentordeck.app`
- Publish: `build.publish` → `vectrus/StentorDecks`
- Icon: `npm run icons` + `afterPack` embed hook
- User data must never be wiped by upgrade (E7 §6)
