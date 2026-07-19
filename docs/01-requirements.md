# 01 — Requirements (locked)

Source: design sessions with the owner (DJ, 54, declining eyesight, RMX2 hardware, HP i7/64GB laptop). Changes to this file require owner sign-off; everything else derives from it.

## R1 Hardware & platform
- R1.1 Windows 10/11 x64 native app, distributed as an installer. Runs offline.
- R1.2 Launches directly into fullscreen (no title bar/taskbar). `Esc` or corner button exits fullscreen; the app remains usable windowed for development.
- R1.3 Hercules DJConsole RMX2 is the reference controller: MIDI in/out and 4-out/4-in USB sound card.
- R1.4 Soundcard routing is configurable in-app: master output (default RMX2 outputs 1-2 → sound system) and cue output (default RMX2 outputs 3-4 → headphones) are independently selectable devices/channel pairs. Inputs (mic, line 1-2) are enumerated and displayed but not routable in v1 ("coming later" state) — the settings model must already contain them.
- R1.5 The app must remain fully operable with mouse/keyboard when the RMX2 is disconnected, and must hot-reconnect the controller without restart.
- R1.6 Renderer/audio-process crash may stop music; relaunch restores the shell and library. Full transport session restore is **not** required in v1 (owner-accepted).

## R2 Playback & mixing
- R2.1 Two decks, MP3 + FLAC + WAV.
- R2.2 Jog wheels: nudge (temporary tempo bend while playing) and seek (while paused) only. No scratching. Latency target ≤ 40 ms output; no ASIO requirement.
- R2.3 Beatmatching is manual-first: pitch faders, pitch-bend buttons, jog nudge. SYNC button per deck makes **that deck the sole slave**: clears SYNC on the other deck, sets the slave's rate so its BPM equals the master's **pitch-fader BPM** (jog nudge / pitch-bend on the master are ignored for follow), then performs a **one-shot beat phase snap** onto the analyzed **beatgrid** (BPM + first-beat offset per track — not a naive 0:00 origin). While armed: tempo follow continues and **soft phase assist** gently keeps grid phases aligned (not a hard CDJ phase-lock). Press SYNC again to freeze pitch and enter **phase glue** (soft-hold the current phase offset; further jogs retarget the hold). Glue ends on pitch-fader move, load, or SYNC re-engage. Playing jog uses sticky micro-seek so wheel offsets persist. No editable/dragable beatgrids. No keylock (pitch changes tone; acceptable). Factory SYNC mapping stays on the hardware Sync buttons (not reused for tap tempo).
- R2.4 No crossfader. The engine contains a bypassed crossfader stage; hardware crossfader MIDI is ignored; no crossfader appears in the UI. A settings toggle (default off) can enable it for guests.
- R2.5 Channel faders are the mixing instrument. Per-fader response: position→dB mapping with a user-adjustable curve (presets linear/smooth/sharp + continuous shape control); A and B curves mirrored by default, unlinkable.
- R2.6 Pitch faders: near-linear curve, plus configurable center dead-zone that snaps to exactly 0.00 %. Pitch range is user-selectable **±8 %** or **±16 %** (SL-1200-style). Default ±8 %. At ±16 %, the same short RMX2 fader travel is coarser — dead-zone and soft-takeover remain mandatory.
- R2.7 Soft takeover on all continuous hardware controls (faders, knobs). UI shows a pickup indicator (hollow marker at physical position) whenever software and hardware values diverge.
- R2.8 Headphone cue: per-deck cue (PFL) toggle from hardware and UI; cue/mix blend and headphone volume from the hardware knobs. Deck cue state is always visible on screen. Split-cue (cue in one ear / master in the other) is **nice-to-have / backlog**, not v1-blocking.
- R2.9 Optional brake ("vinyl stop") on the stop action, off by default.
- R2.10 Cue transport follows classic **CDJ** semantics (single cue point per deck):
  - While stopped/paused: Cue **sets** the cue point at the current playhead (if moved since last set) and, on press-and-hold, **previews** from the cue point (play while held, return to cue and stay paused on release).
  - While playing: Cue **jumps** to the cue point and continues playing (hot-return).
  - Exact edge cases (first load cue at 0:00, re-set rules) are specified in docs/03.
- R2.11 End of track: playback **stops** and the playhead **jumps to the cue point** (not silence at EOF, not auto-load). UI warns as remaining time enters the final 30 s / 15 s / 10 s (docs/06).
- R2.12 Channel EQ: per-band gain with **settable** maximum range (default **±12 dB**). Response is **non-linear** (finer control near center) with a **soft edge** approaching the extremes (no hard clip of the control feel). Exact curve in docs/03.
- R2.13 Loudness: analysis stores a gain recommendation; on load the deck **auto-applies** it to trim. Operator may override trim manually at any time; auto-apply can be disabled in settings.

## R3 Effects
- R3.1 Exactly two effects per deck: resonant filter and flanger. **Pad activates** (latching on/off) from RMX2 and UI; **knob defines amount** — filter AMT (LP left of center / HP right), flanger WET (plus rate/depth/feedback in settings). ControlIds stay separate (`deck*.filter` / `deck*.wet`). **Owner 2026-07-19:** while the flanger pad is on, the filter AMT knob/encoder also writes flanger wet (same 0…1 value); with both pads on, AMT is shared filter amount + wetness. Dedicated WET (Shift+FX / UI WET) still adjusts wet alone. Load still resets wet → 0 and pads off (R3.3). Factory RMX2: FX Mode encoder = filter AMT; Shift+FX Mode encoder = flanger WET (both relative). See docs/04.
- R3.2 An active effect is visually loud in the UI (lit accent + wet/filter amount).
- R3.3 Deck reset on load (hard rule): loading a track switches all FX **pads** off, releases EQ kills, releases pitch bend, releases sync, clears the cue point (resets to 0:00 on the new track after load). **Filter amount / wet** adopt the last known hardware knob positions when available (so the operator does not relearn knobs); if no hardware sample yet, they reset to center/0 and soft-takeover arms. **Pitch and EQ** keep their software values and stay live if already live — load must not force a full soft-takeover relearn on unchanged knobs. Auto-gain from R2.13 applies after reset and re-arms **gain only**.

## R4 Loading & interlocks
- R4.1 Load into a deck via: hardware load buttons, per-deck UI Load button, double-click in browser.
- R4.2 A playing deck cannot receive a track, from any input path. The attempt triggers a visible rejection flash on the deck ("Deck A is playing"). Paused/stopped decks load normally. No override in v1.
- R4.3 The Load control displays a lock state while its deck is playing.

## R5 Library
- R5.1 Library size 500–5000 tracks. Disk folders are the organizational structure ("crates"); the app never moves or renames files on disk, and never deletes **source** music. Exception: the operator may delete StentorDeck-created sibling WAVs named with **`(Fixed by SD)`** or **`(Normalized by SD)`** (single file or bulk purge of those siblings only).
- R5.2 Browser offers a folder tree mirroring the watched music folders plus flat search across the whole library (artist/title/filename).
- R5.3 RMX2 browse cluster (two-pane): up/down moves selection in the **focused** pane (folder tree or track list). Right: tree → expand collapsed folder, or focus track list; files → no-op. Left: files → focus tree; tree → collapse expanded folder, or move to parent folder (never blank “Library” root via browse). Mouse click focuses the pane.
- R5.4 Watched folders are monitored; new/changed/removed files are picked up automatically.
- R5.5 All analysis results (BPM, key, duration, tags, waveform peaks, loudness) persist in SQLite. Keyed on path + size + mtime, with a partial content hash so moved/renamed files keep their analysis. A track is analyzed at most once per content.
- R5.6 Sort defaults: inside a folder, **filename A→Z** (basename; matches disk-as-crate mental model). Operator may switch to artist, title, BPM, key, or duration; choice persists in settings. Whole-library search results sort **artist, then title**.
- R5.7 Duplicate files (same `partial_hash`, different paths): **two browser rows** — folders are the crates, so the same tune in two folders must appear in both. Analysis/waveform/loudness are **shared by hash** (analyze once; both rows read the same results). Move detection (one path gone, hash matches orphan) still collapses to a path update, not a second identity.
- R5.8 Session played: a library track is marked **played this session** after it has been in transport **play** on either deck for a cumulative **≥ 30 s** (wall-clock while `playing`; pauses do not count). Browser rows (Prep + Performance) show both a dimmed row and a small played mark. Marks are in-memory only (cleared on app quit/restart) and via an explicit **Clear session played** action. Loading alone does not mark; cue-preview that never reaches 30 s does not mark.
- R5.9 Prep MP3 fix (sibling only): Prep offers **Check MP3** (decode health vs Xing/tag) and **Write fixed WAV** for the selected MP3. Fix runs resilient decode then writes a **new** file beside the source named with **`(Fixed by SD)`** (always `.wav` — no ffmpeg / no re-encode to MP3). The original file is **never** modified, renamed, or overwritten. The new file is indexed as its own library track and queued for analysis. Operator may still write a fixed WAV when Check says OK (clicks from bad frames that do not truncate). **Phones-only preview** of the resilient decode is available before Write (never booth/master). Fixer options (preset Gentle/Normal/Aggressive, seam fade ms, seam trim ms, de-click off/light/strong) live in settings; Preview and Write use the same policy. Separately, Prep may **phones-preview** and write a loudness-normalized sibling named **`(Normalized by SD).wav`** (toward R2.13 auto-gain target LUFS); fix preview and normalize preview are mutually exclusive — not both at once. Operator may **Delete SD WAV** / **Purge SD WAVs** for those siblings only (R5.1 exception).
- R5.10 Prep may edit stored **title** and **artist** in the library DB (display only). Path and filename on disk are unchanged; no ID3/tag write-back to the audio file.

## R6 Analysis
- R6.1 BPM detection tuned for 70–180 BPM electronic/dance material; existing TBPM/BPM tags are trusted and skip analysis (marked `tag` source, re-analyzable on demand).
- R6.2 Key detection displayed Camelot-first (e.g. `8A`), musical name secondary. Existing key tags trusted as above.
- R6.3 Analysis runs as a background queue that never blocks UI or audio; progress visible in the browser.
- R6.4 Waveforms: full-track overview + detail peaks for the scrolling view, pre-rendered during analysis and cached.
- R6.5 Loudness/peak metrics computed at analysis time to feed R2.13 auto-gain (algorithm in docs/05).
- R6.6 Operator corrections in v1: **tap tempo**, **BPM half / double**, **key override**, and **title/artist** (display fields; R5.10). Primary UI in Prep mode (mouse/keyboard). Factory Sync buttons remain SYNC (R2.3); tap/half/double/key are separate actions (learnable). Visible Performance-console chrome for these corrections is **nice-to-have**, not blocking.

## R7 UI & accessibility
- R7.1 Readable at ~1 m in a dark room: near-white on near-black, minimum 14 px for any interactive text, browser rows ≥ 16 px / 42 px tall, BPM readout ≥ 40 px, time-remaining ≥ 22 px.
- R7.2 UI scale setting: 100 / 125 / 150 %.
- R7.3 Deck accent colors configurable (defaults: A amber `#FFB454`, B cyan `#5BD0FF`).
- R7.4 Two modes, both fullscreen: Performance (waveforms + decks + mixer + 3-row browser) and Prep (compact deck strips + folder tree + large browser). UI label for Prep mode is **Library**. Toggle via UI and mappable hardware control.
- R7.5 Waveform strip: both decks stacked, fixed center playhead, deck-colored. **Visual beat ticks** on the track-time lattice (`file BPM` + analyzed **beat-grid offset** — same grid SYNC uses; not editable/dragable). The big BPM readout may show file×rate; ticks stay locked to waveform peaks. SYNC engage snaps and soft-assists against that grid (R2.3). Cue point marker on overview + detail.
- R7.6 VU meters beside channel faders: green → amber, red only at clipping.
- R7.7 Size = importance: mid-mix data (BPM, remaining time, key, VU) is the largest; prep-time data is smaller or moved to Prep mode.

## R8 MIDI
- R8.1 RMX2 factory mapping works out of the box (see docs/04). 14-bit CC pairs honored for faders; jog relative encoding honored.
- R8.2 MIDI-learn mode: click a UI control, move a hardware control, mapping stored. Export/import mapping as JSON.
- R8.3 A MIDI monitor panel (dev/settings area) shows the live message stream for debugging.
