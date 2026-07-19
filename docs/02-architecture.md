# 02 — Architecture

## Process model

```
┌─────────────────────────────────────────────────────────────┐
│ Main process (Node)                                         │
│  - window lifecycle, fullscreen, single-instance lock       │
│  - better-sqlite3 (only process touching the DB)            │
│  - library scanner + chokidar folder watcher                │
│  - settings.json read/write (atomic)                        │
│  - spawns/It supervises the Analysis window                 │
└──────────────┬───────────────────────────┬──────────────────┘
               │ IPC (typed, see below)    │ IPC
┌──────────────┴───────────────┐  ┌────────┴──────────────────┐
│ UI renderer (visible)        │  │ Analysis renderer (hidden)│
│  - React/MobX UI             │  │  - decodes files with     │
│  - AudioEngine (Web Audio)   │  │    OfflineAudioContext    │
│  - MidiEngine (Web MIDI)     │  │  - BPM / key / waveform   │
│  - owns all realtime state   │  │  - one job at a time      │
└──────────────────────────────┘  └───────────────────────────┘
```

Decisions:
- Audio and MIDI live in the **visible renderer**. Web MIDI and AudioContext output selection are renderer APIs; keeping them together avoids IPC in the realtime path. MobX stores drive both UI and engine.
- Analysis runs in a **hidden BrowserWindow** because `decodeAudioData`/`OfflineAudioContext` give free, correct MP3/FLAC/WAV decoding — no ffmpeg dependency. It processes one track at a time (memory: a decoded 6-min FLAC ≈ 120 MB transient; sequential keeps peak bounded), reads files via `fs` (nodeIntegration in this window only, no remote content ever loaded), posts results to main, which writes the DB and notifies the UI.
- The main process is the single writer to SQLite. Renderers query via IPC. No ORM; hand-written statements in a `db/` module.

## IPC contract (E1 deliverable)

Typed channel definitions shared via a `shared/ipc.ts` package. Style: `domain:verb`. Initial set:

```
library:query            (filter, folder, search, sort, limit?) → TrackRow[]
library:folders          () → FolderNode[]
library:stats            () → { trackCount }
library:track            (id) → TrackDetail (incl. waveform blob refs)
library:rescan           (path?) → ack            (progress via library:progress events)
library:read             (id) → { path, bytes, tags… } | null   (deck load; path must be under a library root)
library:pickRoot         () → { path } | null                   (native folder dialog for roots)
library:updateManual     (id, bpm?, key…) → TrackRow | null     (Prep R6.6; sources → manual)
library:mp3FixWrite      (sourceTrackId, wavBytes, title, artist) → {ok,path,trackId}|error
                         (Prep R5.9 — sibling WAV only; never overwrites source)
analysis:enqueue         (trackIds[], priority)   main → analysis window internally
analysis:progress        event → { trackId, stage, queueDepth }
settings:get / settings:set / settings:changed event
midi:mapping:get / set / export / import
app:mode                 get/set fullscreen, performance|prep
```

Rule: nothing latency-sensitive crosses IPC. Deck transport, mixer, FX, metering are renderer-local.

## Soundcard routing

The Hercules driver exposes the RMX2 either as one 4-channel WASAPI render endpoint or as two stereo endpoints, depending on driver version. Both must work; probe at startup and per settings change.

**Plan A — single 4-channel device (preferred).**
One `AudioContext` with `sinkId` = the 4-ch device, `destination.channelCount = 4`, a `ChannelMergerNode(4)`: master bus → channels 0/1, cue bus → channels 2/3. Sample-clock locked by construction.

**Plan B — two stereo devices (fallback).**
Two `AudioContext`s with different `sinkId`s (master ctx, cue ctx). Deck sources exist in the master context; the cue feed crosses via a `MediaStreamAudioDestinationNode` → `MediaStreamAudioSourceNode` bridge. Clocks are independent; acceptable because cue is pre-listen, not phase-critical. Document the added cue latency in the settings UI.

Selection logic: if the configured master device reports `maxChannelCount ≥ 4` and the user has chosen "outputs 1-2"/"outputs 3-4" of the same device → Plan A; otherwise Plan B. The settings screen (docs/07, E2) shows which plan is active. `latencyHint: 'interactive'`; the buffer setting maps to `latencyHint` seconds and is labeled honestly as a hint.

Device changes, default-device changes, and device removal must be survivable: rebuild the graph, restore transport state (position, play state) within 1 s, never crash.

## State management

MobX stores (renderer): `DeckStore` ×2, `MixerStore`, `LibraryStore`, `MidiStore`, `SettingsStore`, `UiStore` (mode, scale, flashes). Engines subscribe to stores via reactions; hardware input mutates stores through actions — the store is the single source of truth, so UI drag and MIDI input follow one code path (soft takeover sits in `MidiStore` before the action fires).

## Failure stance

- Audio device vanished → banner + auto-rebuild on return; decks pause, positions kept.
- MIDI device vanished → banner; hot-reconnect resumes mapping; soft takeover re-arms all continuous controls.
- DB corruption → on open failure, move file aside, recreate, trigger rescan (analysis cache loss is annoying, not fatal — never block launch).
- Renderer crash → Electron relaunches window; main-process state (library, settings) is unaffected. Audio stops (R1.6 — session restore not required in v1).
