<p align="center">
  <img src="brand/stentordeck-wordmark.png" alt="StentorDeck — for julius" width="480" />
</p>

<p align="center">
  Two-deck DJ application for Windows, built around the Hercules DJConsole RMX2.<br />
  <em>for julius</em>
</p>

**Spec is law:** see [`docs/README.md`](docs/README.md), [`docs/ROADMAP.md`](docs/ROADMAP.md), [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

Brand assets live in [`brand/`](brand/) (mark, wordmark, app icon).

## UI mockups

Authoritative HTML mockups and PNGs — see [`docs/mockups/MOCKUPS.md`](docs/mockups/MOCKUPS.md). Regenerate with `npm run docs:screenshots`.

### Performance

![Performance mode](docs/mockups/screenshots/01-performance-mode.png)

### Prep

![Prep mode](docs/mockups/screenshots/02-prep-mode.png)

**How to use the Prep library** (plain-language guide): [`docs/guides/prep-library.md`](docs/guides/prep-library.md)

### Audio setup

![Audio setup](docs/mockups/screenshots/03-audio-setup.png)

### Deck panel states

![Deck panel states](docs/mockups/screenshots/04-deck-panel-states.png)

### Mixer column

![Mixer column](docs/mockups/screenshots/05-mixer-column.png)

### Fader curve editor

![Fader curve editor](docs/mockups/screenshots/06-fader-curve-editor.png)

## Stack

Electron · React 18 · TypeScript strict · MobX · better-sqlite3 · Web Audio · Web MIDI

## Start the app

**Easiest (Windows):** double-click [`Start StentorDeck.bat`](./Start%20StentorDeck.bat) in the project folder.  
It installs deps on first run, rebuilds the Electron native module, then launches the app.

Or from a terminal in this folder:

```bash
npm start
```

(`npm run dev` is the same command.)

Dev starts windowed (`STENTOR_WINDOWED=1`). For fullscreen like production, set `STENTOR_WINDOWED=0`.

If you see `NODE_MODULE_VERSION` errors for better-sqlite3, run `npm run rebuild:native` again (fetches the Electron prebuild; no VS Build Tools required when a prebuild exists).

```bash
npm test                 # unit + component (Vitest)
npm run test:coverage
npm run test:e2e         # Playwright end-user (no RMX2)
npm run docs:screenshots # mockup PNGs → docs/mockups/screenshots/
npm run lint
npm run typecheck
npm run build
npm run dist:dir   # unpackaged win build
npm run dist       # NSIS installer → release/
```

See [`docs/TESTING.md`](docs/TESTING.md).

## Workspaces

| Package | Role |
|---|---|
| `shared` | IPC contract, settings zod, MIDI/audio pure logic, analysis contract |
| `app/main` | Electron main, SQLite, scanner/watcher, analysis supervisor, IPC |
| `app/renderer` | React/MobX UI + audio/MIDI engines + Prep browser |
| `app/analysis` | Hidden BrowserWindow — decode / waveform / BPM / key / loudness (E5) |

## Roadmap & status

Living tracker (mirrors [`docs/ROADMAP.md`](docs/ROADMAP.md)). Decision detail: [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

**Legend:** `DONE` · `DOING` · `TODO` · `BACKLOG`

### Build order

```
E1 skeleton → E2 audio [HW ✓] → E3 MIDI [HW ✓]
                → E4 library  ⎤
                → E5 analysis ⎦ parallel
                → E6 UI [HW mix]
                → E7 polish
```

| Epic | Status | When | What landed / what’s left |
|---|---|---|---|
| **E1** Skeleton | DONE | 2026-07-18 | Shell, typed IPC, settings, SQLite, workspaces |
| **E2** Audio engine | DONE | 2026-07-18 | Dual-deck engine, Plan A/B, cue/PFL, USB rebuild. **`[HW]` PASS** (owner Julius). Checklist: [`docs/E2-HW-CHECKLIST.md`](docs/E2-HW-CHECKLIST.md) |
| **E3** MIDI layer | DONE | 2026-07-18 | Decode/map/dispatch/learn/persist/takeover/LEDs + FX pads + Load pending. **`[HW]` PASS** (owner Julius) — pads, Sync takeover, OOTB sweep, LEDs. Checklist: [`docs/E3-HW-CHECKLIST.md`](docs/E3-HW-CHECKLIST.md) |
| **E4** Library | DOING | 2026-07-18 | Schema/scan/watcher, IPC/read/load, MIDI browse, root picker, Prep UI, **Perf 3-row strip** + analyzing counter. Left: large-library soak ACs |
| **E5** Analysis | DOING | 2026-07-18 | Queue + pipeline commit + **idle backfill**. Prep Detect wired. Left: accuracy harness |
| **E6** Decks/mixer UI | DOING | 2026-07-18 | Perf **detail well** + per-deck overview (cue/EOT/ticks/seek). Left: full decks/mixer chrome, `[HW]` mix |
| **E7** Polish | TODO | — | Packaging, soak, failure drills |

### Same-day milestones (2026-07-18)

| Time context | Milestone |
|---|---|
| Spec lock | Requirements + docs/01–07; Sync stays SYNC; library sort/duplicates |
| E1 | Greenfield app shell shipped |
| E2 software | Load/play, Plan A/B probe, CDJ cue, auto-gain, reconnect fixes |
| E2 `[HW]` | Owner verified on physical RMX2 — **gate cleared for E4+ audio** |
| E3 scaffold | MIDI decode/map/dispatch/monitor/LEDs |
| E3 persist + learn | SQLite `midi_map`, export/import/reset, learn SM + harness UI |
| E3 takeover polish | Raw-space pickup refresh, gain↔trim inverse, UI re-arm, harness pickup table |
| E3 pads + load | FX pad notes + dispatch/LEDs; MIDI Load → harness file picker (then E4 paths) |
| E3 `[HW]` | Owner PASS — [`docs/E3-HW-CHECKLIST.md`](docs/E3-HW-CHECKLIST.md) |
| E4 library core | Scan, SQLite tracks, select/load, chokidar, root picker, MIDI browse merge |
| E4 Prep UI | Folder tree + virtualized list + R6.6 correction strip; settings drawer |
| E5 pipeline start | Analysis window + Detect→commit (waveform/BPM/key/loudness) |
| E4 Perf strip | 3-row browser + search summary + analyzing counter (mockup 01) |
| E5 idle backfill | Auto-enqueue unanalyzed tracks at `backfill` priority when queue idle |
| E6 overview well | Canvas overview from DB blobs; cue marker, EOT tint, click-seek |
| E6 detail + overview layout | Stacked scrolling detail (±4s) + overview in each deck panel |
| MP3 truncate fix | Resilient decode past Chromium early-stop (~32s); analysis v2 re-backfill |
| Testing | Vitest unit/component + Playwright e2e (`docs/TESTING.md`) |

### In progress right now

- **E4** — large-library soak against E4 ACs (scan/watch/search timing).
- **E5** — Accuracy harness + confidence tuning.
- **E6** — Full deck/mixer chrome from mockups; `[HW]` mix.

### Next up

- E6 `[HW]` full manual mix; E7 polish / installer / failure drills

### Parked (not v1)

v2 Spotify + AI mixmatch — [`docs/BACKLOG-v2-spotify-ai.md`](docs/BACKLOG-v2-spotify-ai.md) (locked 2026-07-18).
