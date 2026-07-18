# E6 — Decks, mixer & performance UI

Reads: docs/06 (authoritative for every visual), docs/03 (behaviors), R7. Depends on E2–E5. The mockups referenced in docs/06 are the design contract.

## Scope

1. Performance mode layout: waveform well, deck panels, mixer column, 3-row browser strip, per docs/06.
2. Waveform rendering per docs/05 §rendering contract: stacked scrolling detail views with fixed center playhead (canvas, rAF, typed arrays), beat ticks, cue marker, EOT tint, overview progress bar per deck (seekable by click).
3. Deck panel: title/artist with ellipsis, GAIN knob (auto-gain aware), 46 px BPM (effective = file × rate, live), key chip, remaining time with EOT warning colors, FX row (FILTER pad + filter knob, FLANGER pad + WET), transport row (play, CUE, SYNC, LOAD), pitch strip with 0.00 marker, range (±8/±16) indication, dead-zone visualization and pickup indicator, empty-deck state.
4. Mixer column: EQ knob pairs with kill states (respect `eq.maxDb`), channel faders with oversized caps + adjacent VU meters (green/amber/red zones per docs/03), pickup indicators. No crossfader.
5. Knob & fader components: mouse drag (vertical), double-click reset, keyboard nudge, MIDI-driven position, pickup marker rendering from `MidiStore` takeover state. One component pair reused everywhere.
6. Interlock & reset surfacing: LOAD lock state, rejection flash + toast, deck-reset visual confirmation (FX pads visibly extinguish on load).
7. Cue state UI: per-deck headphone icon, lit when in phones.
8. Prep mode integration: E4's browser + compact deck strips; mode toggle in UI + mappable ControlId (`app.toggleMode`).
9. Settings surfaces: header cog → central modal; fader-curve editor (canvas curve + shape slider + presets + live dB readout, per mockup 06), pitch dead-zone + range (±8/±16), EQ max dB, auto-gain toggle, UI scale, crossfader enable (guest), beat-tick toggle, jog feel. Remaining: deck accent color picker with derived text-contrast, brake toggle, effect parameter fine-tuning, auto-gain target LUFS.
10. Flanger/filter parameter tuning session with the owner on real material (closes R3.1 "done well").

## Acceptance criteria

- `[HW]` Full manual mix performed by the owner using only the RMX2 + screen: browse → load B (A playing) → pre-listen B in phones → beatmatch by ear using pitch + nudge with waveform confirmation → blend on channel faders with EQ → kill A. Every needed datum readable at arm's length+.
- `[HW]` Owner-judged legibility at ~1 m in a dimmed room at each UI scale; 150 % clips nothing at 1920×1080.
- Waveforms scroll at 60 fps with both decks playing and analysis running in the background (performance trace attached to PR).
- Sync sets effective BPM equal within 0.05; pitch pickup indicator appears and clears exactly per the takeover state machine.
- Load interlock end-to-end from all three pathways: lock icon, flash, toast; loading a stopped deck visibly resets active FX.
- Fader curve editor changes are audible immediately and match the drawn curve (spot-check dB at 50 %); pitch dead-zone snaps to exactly 0.00 with no jump at the zone edge.
- VU zones match docs/03 thresholds against a calibrated test signal; clipping lights red at > -3 dBFS.
- Deck accent color change propagates everywhere including on-accent text contrast; mode toggle works from UI and a learned hardware button.
- Every interactive element reachable by mouse alone (R1.5 — controller-less operation).
