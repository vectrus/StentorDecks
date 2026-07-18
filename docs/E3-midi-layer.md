# E3 — MIDI layer

Reads: docs/04 (map, learn), docs/03 (soft takeover, curves). Depends on E2 (actions to drive).  
**`[HW]` PASS (owner Julius, 2026-07-18)** — see `E3-HW-CHECKLIST.md`.

## Scope

1. `MidiEngine`: Web MIDI access, port selection per docs/04 (prefer `RMX`, settings override), hot-plug handling, connection state surfaced to `MidiStore`.
2. Message decoder: note on/off, cc7, cc14 pairing (MSB/LSB assembly with 30 ms pairing window), ccRel two's-complement for jogs. Unknown messages counted for the monitor.
3. Factory mapping constant from docs/04; mapping persistence in `midi_map`; export/import JSON with schema validation; "Reset to RMX2 defaults".
4. Dispatch: binding → ControlId → MobX store action (the same actions the UI uses). Crossfader CC dropped unless `mixer.crossfader.enabled`.
5. Soft takeover per docs/03 §Soft takeover, including inverse-curve comparison and re-arm triggers (start, reconnect, software-side change). Expose `{softwareValue, hardwareValue, armed}` per control for E6's pickup indicators.
6. Button semantics: play/classic-CDJ-cue/sync/load/PFL/kills/pitch-bend/FF-RW hold behavior, browse cluster driving `LibraryStore` selection + folder enter/parent (target list exists as fixture until E4 merges). Sync never dispatches tap tempo.
7. Jog handling: nudge while playing, seek while paused, per docs/03 transport rules.
8. MIDI learn mode per docs/04: overlay targeting, qualifying-message logic (LSB rejection), cc14 auto-detection, conflict steal flow, Esc cancel.
9. LED feedback: state → note-out per docs/04; reactive (MobX reaction on the relevant state), throttled, silent-fail per LED.
10. MIDI monitor panel (early, minimal): scrolling live message list with decode annotations + unknown-message counter. Full polish in E7, but the tool must exist now — it's how pad note numbers get verified `[HW]`.

## Acceptance criteria

- `[HW]` Out of the box on the owner's RMX2: play, cue, sync, load, PFL, kills, pitch bends, FF/RW, browse cluster, both pitch faders (14-bit — moving 1 mm changes the displayed pitch %, no 7-bit stepping), both channel faders, gains, all six EQ knobs, master, headMix, jogs. Crossfader does nothing.
- `[HW]` Pad note numbers for FX verified via the monitor and committed to the factory map (filter pad 1, flanger pad 2, both decks).
- `[HW]` Soft takeover: press SYNC (software pitch jumps) → hardware pitch fader is inert until it crosses the value, then live; pickup data visibly correct in the dev harness.
- `[HW]` LEDs: play lights while playing, kills light when engaged, FX pads light when active; unplugging LED-less scenarios logs once, no spam.
- Learn: rebind WET A and FILTER A to spare knobs in < 10 s each (separate ControlIds); binding survives restart; export → wipe → import restores; learning a bound control triggers the steal flow; LSB CCs are never learned as independent controls (test with recorded RMX2 traffic fixtures).
- Unit tests: cc14 assembly, relative decoding, takeover state machine, curve-inverse comparison — all against recorded fixture streams, no hardware needed in CI.
