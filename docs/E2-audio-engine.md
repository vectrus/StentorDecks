# E2 — Audio engine & device routing

Reads: docs/02 (routing), docs/03 (engine), docs/07. **Dual-output routing risk retired: `[HW]` criteria PASS (owner Julius, 2026-07-18) — see `E2-HW-CHECKLIST.md`.**

## Scope

1. Device layer: enumerate output devices (`enumerateDevices` + `AudioContext.setSinkId` probing), expose id/label/maxChannelCount; react to device add/remove/default-change; rebuild-and-restore per docs/02 failure stance.
2. Routing plans A and B exactly per docs/02, selected by the `auto` probe or forced via settings.
3. Audio setup screen (first-run + settings): master/cue device pickers, per-output test tone (L then R, spoken-panning not required — 440/880 Hz distinct), active-plan indicator, buffer hint slider, inputs section rendered from live enumeration in the disabled "coming later" state (mockup: audio_device_config).
4. Deck engine ×2 per docs/03: buffer load/decode, transport (play/pause/classic CDJ cue/seek), pitch (±8/±16), nudge model, brake option, end-of-track stop→cue, position tracking across rate changes, auto-gain on load (R2.13).
5. Mixer graph: trim, EQ + kills (R2.12 non-linear ±maxDb), fader gain with curve mapping (docs/03 shapes; settings-driven), bypassed crossfader stage, master gain + limiter.
6. Cue bus: per-deck PFL taps, cue/mix equal-power blend, phones gain, wired to outputs 3-4 (or Plan B cue context).
7. FX inserts: filter and flanger per docs/03 spec, bypass crossfades, parameter API (UI/MIDI attach in E3/E6).
8. Metering: per-channel + master analysers exposing dB RMS at rAF cadence.
9. Deck reset-on-load and load interlock implemented in `DeckStore.load()` (single choke point, R4.2/R3.3) — UI feedback lands in E6, the *behavior* lands here with unit tests.
10. Dev harness page: two file pickers, transport buttons, sliders for every parameter, meter readouts — enough to exercise everything without E6.

## Acceptance criteria

- `[HW]` Plan A on the owner's RMX2: different tracks simultaneously on sound-system outputs (1-2) and headphones (3-4); PFL toggles per deck; cue/mix blend audibly sweeps.
- `[HW]` Plan B forced: same behaviors with two stereo endpoints; app states the active plan truthfully.
- `[HW]` Unplug the RMX2 mid-playback → banner, decks pause, positions kept; replug → playable within 2 s without restart.
- Decode + play MP3, FLAC, WAV; a 60-minute WAV loads without UI freeze (decode off the main thread of the renderer via async decode; loading indicator). Long/damaged MP3s use resilient resume-at-sync decode; multi-segment joins seam-heal (short trim + ~6 ms overlap-add) so stitch clicks stay quiet without a second full decode.
- Pitch fader model at ±8 % and ±16 % changes effective rate correctly; range switch re-arms takeover; nudge decays per spec; brake toggle audibly brakes.
- Classic CDJ cue: set/preview-while-held when stopped; jump-and-continue when playing (unit tests for the state table in docs/03).
- End of track: stops and jumps to cue; warning timestamps exposed to UI store at 30/15/10 s.
- Auto-gain on load applies trim from `loudness_lufs` toward target when enabled; manual trim override sticks until next load.
- EQ kills mute their band within 20 ms without click; fader curve presets produce the documented dB at 25/50/75 % positions; EQ non-linear map unit-tested at center / ±25 % / ±100 % throw (docs/03).
- Filter amount and wet are independent params; filter sweeps LP→bypass→HP with center snap; flanger audibly flanges with defaults; toggling either produces no click.
- `load()` on a playing deck throws `DeckPlayingError` and changes nothing; on a stopped deck it resets FX/kills/sync/cue per R3.3 then applies auto-gain (unit tests cover every reset item).
- 30-minute two-deck playback with FX toggling: no glitches, renderer memory stable (< 400 MB working set), no accumulating nodes (heap snapshot check).
