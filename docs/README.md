# StentorDeck — spec repository

Two-deck DJ application for Windows, built around the Hercules DJConsole RMX2 controller.
Single user, single machine (HP workbook Gen 12, i7, 64 GB RAM), fullscreen use in a live/booth setting.

> Working title. Rename globally before E1 if desired.

## Product goals

1. Play a set on two decks with the RMX2 as the only physical interface: browse, load, beatmatch, EQ, fade, cue in headphones.
2. Readable from ~1 meter in a dark room by a user with declining eyesight: large type, high contrast, size = importance.
3. Zero repeated work: every track is analyzed (BPM, key, waveform) exactly once, ever. All results persist across restarts.
4. Deterministic decks: loading a track always produces a known clean state. No forgotten effects, no surprise loads into a playing deck.

## Stack (decided, do not relitigate)

| Layer | Choice | Rationale |
|---|---|---|
| Shell | Electron (latest LTS) | Chromium ships decoding (MP3/FLAC/WAV), Web Audio graph, Web MIDI. UI in owner's home stack. |
| UI | React 18 + TypeScript + MobX | Owner's stack (matches Unicat/Catalyst conventions). |
| Build | Vite + electron-builder | NSIS installer target, Windows x64 only. |
| Persistence | better-sqlite3 in main process | Synchronous, fast, single-user. |
| Audio | Web Audio API, WASAPI via Chromium | Nudge-grade latency (~20–40 ms) is sufficient; no scratching requirement. |
| MIDI | Web MIDI API | RMX2 is USB class-compliant MIDI; no native layer needed. |

Explicitly out of scope for v1: scratching, keylock/master tempo, recording, hotcues, loops, echo/reverb/gater FX, playlists/crates (disk folders are the crates), streaming services, second screen.

## Tracking

| File | Role |
|---|---|
| [ROADMAP.md](./ROADMAP.md) | Build order, open todos, backlog, open questions |
| [CHANGELOG.md](./CHANGELOG.md) | Dated owner decisions and spec diffs |
| [`mockups/`](./mockups/MOCKUPS.md) | Approved HTML mockups (design contract for E2/E6) |
| [`playwright/`](./playwright/README.md) | Doc screenshots (`npm run docs:screenshots`) |

## Repository layout (this spec)

```
README.md                     you are here
01-requirements.md            locked requirements, the contract
02-architecture.md            processes, IPC, threading, routing plans
03-audio-engine.md            node graph, fader curves, soft takeover, FX, cue bus
04-midi-map.md                RMX2 factory map, learn mode, mapping persistence
05-library-and-analysis.md    scanner, SQLite schema, BPM/key/waveform/loudness
06-ui-style-guide.md          palette, type scale, modes, components
07-settings-schema.md         settings.json schema and defaults
ROADMAP.md / CHANGELOG.md     proceedings tracker
mockups/                      HTML design contract (see mockups/MOCKUPS.md)
E1-skeleton.md … E7-…         epics (canonical path: this folder)
```

## Build order

E1 → E2 → E3 sequentially (E2 proves the riskiest assumption: dual-output routing on the actual RMX2 driver — do not start E4+ until the E2 acceptance test passes on real hardware). E4 and E5 can run in parallel after E3. E6 integrates everything. E7 last.

Each epic file is self-contained: an agent should be able to implement it with only that file plus the docs it references. Acceptance criteria are the definition of done; several require the physical RMX2 and are marked `[HW]` — these must be verified by the owner, not simulated.
