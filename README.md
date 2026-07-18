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
npm test
npm run docs:screenshots   # mockup PNGs → docs/mockups/screenshots/
npm run lint
npm run typecheck
npm run build
npm run dist:dir   # unpackaged win build
npm run dist       # NSIS installer → release/
```

## Workspaces

| Package | Role |
|---|---|
| `shared` | IPC contract, settings zod schema |
| `app/main` | Electron main, DB, settings file, IPC handlers |
| `app/renderer` | React/MobX UI + audio/MIDI engines |
| `app/analysis` | Hidden analysis window (E5; stub in E1) |

## Epic status

E1 skeleton done. E2 audio engine in progress — do not start E4+ until E2 `[HW]` routing passes on the real RMX2.
