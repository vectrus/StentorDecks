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
| `shared` | IPC contract, settings zod schema |
| `app/main` | Electron main, DB, settings file, IPC handlers |
| `app/renderer` | React/MobX UI + audio/MIDI engines |
| `app/analysis` | Hidden analysis window (E5; stub in E1) |

## Roadmap & status

Living tracker (mirrors [`docs/ROADMAP.md`](docs/ROADMAP.md)). Decision detail: [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

**Legend:** `DONE` · `DOING` · `TODO` · `BACKLOG`

### Build order

```
E1 skeleton → E2 audio [HW ✓] → E3 MIDI [HW]
                → E4 library  ⎤
                → E5 analysis ⎦ parallel
                → E6 UI [HW mix]
                → E7 polish
```

| Epic | Status | When | What landed / what’s left |
|---|---|---|---|
| **E1** Skeleton | DONE | 2026-07-18 | Shell, typed IPC, settings, SQLite, workspaces |
| **E2** Audio engine | DONE | 2026-07-18 | Dual-deck engine, Plan A/B, cue/PFL, USB rebuild. **`[HW]` PASS** (owner Julius) — Plan A, Plan B, unplug/replug. Checklist: [`docs/E2-HW-CHECKLIST.md`](docs/E2-HW-CHECKLIST.md) |
| **E3** MIDI layer | **DOING** | 2026-07-18 → | Software ready: decode/map/dispatch/learn/persist/takeover/LEDs + FX pads (provisional `01`/`02`/`11`/`12`) + MIDI Load→file pick. **`[HW]` READY** — owner checklist [`docs/E3-HW-CHECKLIST.md`](docs/E3-HW-CHECKLIST.md) |
| **E4** Library | TODO | — | Scanner, Prep corrections; after E3 per path (audio gate already clear) |
| **E5** Analysis | TODO | — | BPM/key/waveform/loudness (stub today; File BPM is manual in harness) |
| **E6** Decks/mixer UI | TODO | — | Performance UI from mockups; beat ticks, EOT, `[HW]` mix |
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
| E3 pads + load | Provisional FX pad notes + dispatch/LEDs; MIDI Load → harness file picker until E4 |
| Testing | Vitest unit/component + Playwright e2e (`docs/TESTING.md`) |

### In progress right now

- **E3 `[HW]`** — owner runs [`docs/E3-HW-CHECKLIST.md`](docs/E3-HW-CHECKLIST.md) on the RMX2 (pads, takeover, OOTB sweep, LEDs).

### Next up (after E3)

- E4 library + E5 analysis (can run in parallel once E3 software is solid)
- E6 performance UI from mockups
- E7 polish / installer

### Parked (not v1)

v2 Spotify + AI mixmatch — [`docs/BACKLOG-v2-spotify-ai.md`](docs/BACKLOG-v2-spotify-ai.md) (locked 2026-07-18).
