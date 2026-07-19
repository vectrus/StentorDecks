<p align="center">
  <img src="brand/stentordeck-wordmark.png" alt="StentorDeck — for julius" width="480" />
</p>

<p align="center">
  As a developer and former DJ  took out my Hercules RMX2 one day and felt that every piece of <br/>
  DJ Software required registration and/or was really bad and did not right the RMX<br/>
  With more then a decade of DJ experience, a few decades of software development and a proper <br/>
  and some proper AI agents and a boring day with nothing to do, hence taking out the dusty RMX, we got to this.<br/>
  I spent some time using it and i'm happy. Besides the small jogs and faders it feel a lot more like 2 CDJ's
  Added a proper filter. Decent flanger.<br/> 
  A two-deck DJ application for Windows, purpose-built around the Hercules DJConsole RMX2.<br/> 
  (Other Hercules and brands may work but need MIDI mapping) <br />
  Not a toy, not a demo — a booth-ready instrument.<br />
  
</p>

## What StentorDeck is

StentorDeck is a complete DJ system: a real-time dual-deck audio engine, deep
hardware integration for the RMX2, a self-maintaining music library with
automatic analysis, and a performance UI designed to be read from a meter away
in a dark booth. It installs from a single `Setup.exe`, updates itself from
GitHub Releases, and shuts down cleanly when you close the lid.

### Why it's great

- **An audio engine that respects your ears.** Two independent decks with
  trim / 3-band EQ + kills / filter / flanger per channel, headphone cue with
  PFL and head-mix, and two routing plans — Plan A (one 4-channel interface)
  or Plan B (any two stereo devices, bridged). Every gain change is ramped,
  every playing seek is a crossfade, stop can brake with a realistic vinyl
  spin-down (the waveform decelerates with the audio), and a −3 dB brickwall
  limiter guards the PA. Master volume boots booth-safe.
- **The RMX2 feels native.** Factory mapping out of the box, MIDI learn for
  everything, soft takeover so faders never jump, LED feedback, and a
  dual-zone jog wheel with tunable feel — fine vinyl-style nudge on the rim,
  spinback when you rip it.
- **A library that looks after itself.** Point it at your folders: SQLite
  index, live file watcher, instant search, and a background analysis
  pipeline (in a sandboxed worker window) that computes waveforms, BPM with a
  real beatgrid, musical key (Camelot), and LUFS loudness for auto-gain —
  including resilient decoding of damaged MP3s. Tag and manual values always
  win over analysis; idle backfill fills in the rest.
- **SYNC that behaves like a good human, not a robot.** One-shot beat snap on
  the analyzed grid, tempo follow of the partner's pitch fader, then a soft
  PI phase assist: hysteresis so it never hunts, a slow integral that absorbs
  slightly-off BPM analysis (the classic "synced but slowly drifting" case),
  and slew-limited rate moves you can't hear. Release SYNC and *phase glue*
  keeps holding the musical offset you jogged in — your mix, not the grid's.
- **A waveform well built for beatmatching.** Both decks stacked with a shared
  latency-compensated playhead, downbeat-emphasized beatgrid ticks, and
  rate-aware windows: both strips scroll at the same pixel speed regardless of
  pitch, so when ticks line up vertically, the decks are in phase. You see
  drift before you hear it.
- **Engineered like it matters.** Strict TypeScript across four workspaces, a
  typed IPC contract with a channel allowlist, sandboxed renderers, ~200 unit
  and component tests, Playwright e2e, and hardware-verified checklists for
  the audio and MIDI layers.

**Spec is law:** see [`docs/README.md`](docs/README.md), [`docs/ROADMAP.md`](docs/ROADMAP.md), [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

Brand assets live in [`brand/`](brand/) (mark, wordmark, app icon).

## UI mockups

Authoritative HTML mockups and PNGs — see [`docs/mockups/MOCKUPS.md`](docs/mockups/MOCKUPS.md). Regenerate with `npm run docs:screenshots`.

### Performance

![Performance mode](docs/mockups/screenshots/01-performance-mode.png)

Header MST / CUE / PHN · waveform well · decks with pitch strip & FX · **7-column mixer** (GAIN · kill LEDs · EQ/faders · labels) · library fill.

### Prep

![Prep mode](docs/mockups/screenshots/02-prep-mode.png)

**In-app Help** (topbar **Help** or **F1**) searches the operator guides in [`docs/guides/`](docs/guides/). Prep walkthrough: [`docs/guides/prep-library.md`](docs/guides/prep-library.md).

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

### Easiest (Windows)

1. Install [Node.js 22 LTS](https://nodejs.org) once (recommended).
2. Double-click **[`INSTALL.bat`](./INSTALL.bat)** in the repo root.

That script installs dependencies (Electron ABI for `better-sqlite3`), rebuilds the native module, creates a **Desktop shortcut**, and starts the app (packaged `.exe` if present, otherwise source/dev). Same entry: `npm run setup`.

[`Start StentorDeck.bat`](./Start%20StentorDeck.bat) launches a packaged `.exe` if present; otherwise it runs `INSTALL.bat`.

If it fails: close anything locking `node_modules`, delete that folder, run `INSTALL.bat` again. Prefer Node 22 — avoid Cursor’s helper Node on PATH (`where node` must not be under `…\cursor\…\helpers\`).

### Production-style (Explorer icon, no command window)

```bash
npm run dist          # NSIS installer — Desktop + Start Menu shortcuts with brand icon
npm run release       # same + publish GitHub Release (needs GH_TOKEN) for auto-update
# or quick unpacked build:
npm run dist:dir
npm run shortcut      # Desktop StentorDeck.lnk → exe (or Launch-StentorDeck.vbs)
```

Windows packaging embeds `build/icon.ico` via an `afterPack` rcedit hook (avoids winCodeSign symlink issues).

#### What `npm run dist` actually does

1. **`npm run icons`** — [`scripts/make-windows-icon.mjs`](scripts/make-windows-icon.mjs)
   converts `build/icon.png` (from `brand/`) into a multi-size `build/icon.ico`
   using electron-builder's bundled `app-builder-bin`.
2. **`npm run build`** — compiles all four workspaces: `shared` (tsc),
   `app/main` + `app/analysis` (tsup, incl. both preloads), `app/renderer` (Vite).
3. **electron-builder** (config in `package.json` `"build"`):
   - rebuilds `better-sqlite3` against the packaged Electron ABI;
   - packs the `dist/` outputs + `package.json` into `resources/app.asar`,
     with native modules (`**/*.node`, better-sqlite3) kept outside the
     archive via `asarUnpack` (native code can't load from inside an asar);
   - runs the `afterPack` hook ([`scripts/embed-win-icon.cjs`](scripts/embed-win-icon.cjs))
     to stamp the icon + version metadata into `StentorDeck.exe` with `rcedit`;
   - builds the **NSIS installer** → `release/StentorDeck-Setup-<version>.exe`
     (per-user, choosable install dir, Desktop + Start Menu shortcuts), plus
     `latest.yml` and a `.blockmap` — the manifest + delta map `electron-updater`
     uses for in-app updates from GitHub Releases.

Builds are intentionally **unsigned** (`CSC_IDENTITY_AUTO_DISCOVERY=false`, no
cert yet): first run on a new machine may show a SmartScreen prompt, and
`verifyUpdateCodeSignature` is disabled so auto-update accepts our own builds.

The installed app is single-instance: launching a second copy (or the Setup
shortcut while the app runs — including a dev `npm start` instance) focuses
the running window and exits.

Double-click **StentorDeck** on the Desktop. Closing the window shuts down analysis, DB, and MIDI cleanly. Boot shows a short branded splash.

Silent helper: [`scripts/Launch-StentorDeck.vbs`](scripts/Launch-StentorDeck.vbs).

### Updating

| How you run | How you update |
|-------------|----------------|
| Installed `.exe` (booth) | Settings → **Check for updates** (GitHub Releases), or run a new Setup.exe |
| Source / `npm start` | [`UPDATE.bat`](./UPDATE.bat) — not GitHub Desktop |

Details: [`docs/guides/updating.md`](docs/guides/updating.md).  
Publish / release checklist: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

### Development (already installed)

```bash
npm start             # same as npm run dev
```

Dev starts windowed (`STENTOR_WINDOWED=1`). Fullscreen like production: `STENTOR_WINDOWED=0`.

If you see `NODE_MODULE_VERSION` errors: `npm run rebuild:native` (or just re-run `INSTALL.bat`).

**npm deprecation warnings:** Leftover `glob` / `inflight` / `rimraf` / `tar` / `npmlog` / `prebuild-install` noise is from **electron-builder** / native tooling (upstream). `EPERM` on Windows = something locking `node_modules`.

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
| `app/main` | Electron main, SQLite, scanner/watcher, analysis supervisor, IPC, splash |
| `app/renderer` | React/MobX UI + audio/MIDI engines + Prep browser |
| `app/analysis` | Hidden **sandboxed** BrowserWindow — decode / waveform / BPM / key / loudness (E5); file bytes are read in main and shipped with the job | 

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
| **E2** Audio engine | DONE | 2026-07-18 | Dual-deck engine, Plan A/B, cue/PFL, USB rebuild. **`[HW]` PASS**. Checklist: [`docs/E2-HW-CHECKLIST.md`](docs/E2-HW-CHECKLIST.md) |
| **E3** MIDI layer | DONE | 2026-07-18 | Decode/map/dispatch/learn/persist/takeover/LEDs. **`[HW]` PASS**. Checklist: [`docs/E3-HW-CHECKLIST.md`](docs/E3-HW-CHECKLIST.md) |
| **E4** Library | DOING | 2026-07-18 | Scan/watcher, Prep + Perf browse, roots. Left: large-library soak ACs |
| **E5** Analysis | DOING | 2026-07-18 | Pipeline + idle backfill + **beatgrid (v3)** for SYNC. Left: accuracy harness |
| **E6** Decks/mixer UI | DOING | 2026-07-18 | Perf v2: 7-col mixer, dual-zone jog (settings), load reconcile, MST default 30%. Left: curve editor UI, `[HW]` mix |
| **E7** Polish | DOING | 2026-07-18 | Splash + graceful quit + NSIS Desktop/Start shortcuts started. Left: soak, failure drills, MANUAL |

### Same-day milestones (2026-07-18)

| Time context | Milestone |
|---|---|
| Spec lock | Requirements + docs/01–07; Sync stays SYNC; library sort/duplicates |
| E1–E3 | Shell → audio `[HW]` → MIDI `[HW]` |
| E4–E5 | Library + analysis pipeline + beatgrid SYNC |
| E6 Perf v2 | Header outs, deck chrome, 7-col mixer, blue kill LEDs |
| Jog feel | Dual-zone SL-1200 / spinback; live Settings sliders + presets |
| Load / takeover | Pitch/EQ stay live on load; filter/wet adopt hardware; gain after auto-gain |
| Booth safety | MST default **30%**; safety limiter threshold −3 dB |
| Packaging start | Branded splash, clean shutdown, `npm run dist` / `shortcut` |

### In progress right now

- **E4** — large-library soak against E4 ACs.
- **E5** — Accuracy harness + confidence tuning.
- **E6** — `[HW]` full manual mix; pitch dead-zone viz; fader-curve settings surface.
- **E7** — Installer polish, soak, failure drills, MANUAL.

### Next up

- Owner `[HW]` mix pass on RMX2; finish E7 packaging / drills.

### Parked (not v1)

v2 Spotify + AI mixmatch — [`docs/BACKLOG-v2-spotify-ai.md`](docs/BACKLOG-v2-spotify-ai.md) (locked 2026-07-18).
