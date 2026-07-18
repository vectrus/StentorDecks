# 03 — Audio engine

All nodes Web Audio, master context (Plan A shown; Plan B differs only at the output stage).

## Per-deck graph

```
AudioBufferSourceNode (playbackRate = pitch × nudge)
  → trimGain            (GAIN knob, -∞..+12 dB, default 0 dB)
  → eqLow   BiquadFilter lowshelf   f=180 Hz   (gain via R2.12 curve)
  → eqMid   BiquadFilter peaking    f=1 kHz, Q=0.9
  → eqHigh  BiquadFilter highshelf  f=4.5 kHz
  → killLow/Mid/High     (implemented as the same biquads driven to -40 dB, 15 ms ramp)
  → fx chain (see below)
  → pflTap ──────────────────────────────► cue bus (pre-fader listen)
  → faderGain           (channel fader, curve-mapped, see Fader curves)
  → [crossfaderGain]    (BYPASSED by default: node present, gain fixed at 1, no automation;
                         hardware crossfader CC ignored unless settings.crossfader.enabled)
  → master bus
```

Master bus → masterGain (hardware master volume CC) → DynamicsCompressor as safety limiter (threshold -1 dB, ratio 20, knee 0) → merger ch 0/1.

Cue bus: per-deck pflTap gains (0/1, 15 ms ramp) → cueSum; headphone output = blend(cueSum, master bus) via equal-power cue/mix crossfade (hardware HeadMix CC) → headphoneGain (hardware phones volume) → merger ch 2/3.

## Transport

- Play: create a fresh `AudioBufferSourceNode` at `ctx.currentTime`, remember `(startCtxTime, startOffset)`. Pause: stop node, compute offset. Seek/cue: same mechanism. Sources are throwaway; the decoded `AudioBuffer` is deck state.
- Position for UI/waveform derived each rAF: `offset + (ctx.currentTime - startCtxTime) × playbackRate` (integrate across rate changes: accumulate on every rate change).
- Nudge (jog while playing): rate multiplier 1 ± 0.02 × velocityFactor, decays to 1 over 250 ms after last tick. Jog while paused: seek ±20 ms per tick.
- Pitch: `rate = 1 + pitchFaderNormalized × pitchRange` where `pitchRange` is `0.08` or `0.16` from settings (R2.6). Effective BPM = fileBPM × rate (drives the big readout). Changing range re-maps the current fader position into the new domain and re-arms soft takeover.
- SYNC: one-shot — set pitch so effectiveBPM(this) = effectiveBPM(other); pitch fader enters soft-takeover pickup. Released by loading (R3.3) or moving the pitch fader through pickup. Factory Sync buttons only — never aliased to tap tempo.
- Brake (optional, default off): on stop, ramp playbackRate → 0 over 400 ms, then stop.
- Load interlock: `DeckStore.load()` throws `DeckPlayingError` if `state === playing`; every input path routes through this one method (R4.2).
- Deck reset on load: FX off + filter amount → 0.5 + wet → 0, kills released, nudge cleared, sync released, cue point → 0:00 on the new buffer, pitch **value** kept at fader's logical value but re-armed for takeover, then **auto-gain trim** applied (R2.13) unless disabled. Click-free via 15 ms gain ramps.

### Cue — classic CDJ (R2.10)

Single cue point per deck (`cueOffset` seconds).

| State | Cue press | Cue hold | Cue release |
|---|---|---|---|
| Stopped/paused, playhead ≠ cue (or never set) | Set `cueOffset = playhead`; stay paused | Preview: play from cue | Stop; snap playhead to cue; stay paused |
| Stopped/paused, playhead == cue | (already set) | Preview from cue | Stop; snap to cue; stay paused |
| Playing | Jump playhead to cue and **stop** (Pioneer-style) | (no extra) | (no extra) |

On first load of a track, `cueOffset = 0`. Clearing on load (R3.3) means the new track starts with cue at 0:00.

### End of track (R2.11)

When playhead reaches `duration`: stop transport (no brake unless stop was user-initiated with brake on — EOT uses immediate stop), set playhead to `cueOffset`. Emit UI warning stages at remaining ≤ 30 / 15 / 10 s while still playing (docs/06).

## Fader curves (R2.5, R2.6) & EQ (R2.12)

Chain per continuous control: `raw14bit → normalize 0..1 → shape → domain map`.

- Channel faders: `shaped = pos^(2^(s/50))` with shape `s ∈ [-100..100]` (0 = linear, positive = fine control at top). Domain map: `gain = 0` at pos 0, else `dB = -60 + shaped × 60`, `gain = 10^(dB/20)`. Presets: linear s=0, smooth s=35, sharp s=-45. Per-fader setting, mirrored by default (`linked: true`).
- Pitch faders: linear, then center dead-zone: `|pos-0.5| < deadZone/2 → 0.00 %` with continuous remap outside the zone (no jump at the edge). `deadZone` default 0.04, range 0–0.10. Domain: `pitch% = (posMapped - 0.5) × 2 × (pitchRange × 100)`.
- EQ knobs (per band): knob `t ∈ 0..1`, center 0.5 = 0 dB. Non-linear bipolar map with soft shoulders:
  - `u = 2t - 1` → `shaped = sign(u) × |u|^γ` with `γ = 1.6` (finer near center).
  - `dB = shaped × eqMaxDb` where `eqMaxDb` is settings-selectable, default **12**.
  - Soft edge: as `|shaped| → 1`, apply a smoothstep saturation so the last ~10 % of throw approaches `±eqMaxDb` asymptotically (no abrupt shelf). All gain changes use `setTargetAtTime` / linearRamp ≥ 15 ms — never snap `.value` mid-playback.
- Curve is applied **after** soft-takeover comparison: takeover compares raw hardware position against the raw position corresponding to the current software value (inverse-map), so pickup feel is independent of curve.

## Auto-gain (R2.13)

On load, after deck reset: if `audio.autoGain` is true and the track has `loudness_lufs` (docs/05), set trim so estimated playback loudness matches target `-14 LUFS` (clamped to trim domain -∞..+12 dB). Manual trim moves after that are sticky for the loaded track; next load re-applies auto-gain. Soft takeover re-arms the gain knob.

## Soft takeover (R2.7)

Applies to: channel faders, pitch faders, gain, EQ ×3 ×2, filter amount ×2, wet knobs, master, headMix, phones.
State per control: `armed` (bool) + last hardware raw. Armed on: app start, MIDI reconnect, any software-side change of the value (sync, load-reset, UI drag, preset). While armed, incoming hardware values are ignored until hardware crosses the software value (or comes within 1/128); then control goes live. `MidiStore` exposes `{softwareValue, hardwareValue, armed}` per control; UI renders the hollow pickup marker from this (R7 / style guide).

## Effects (R3)

Insert chain: `input → [filter] → [flanger] → output`, each independently bypassable (true bypass via routing, 15 ms crossfade to avoid clicks).

**Filter** — one BiquadFilter. Amount ControlId `deckA.filter` / `deckB.filter` (separate from wet). Knob 0..1, center 0.5 = bypass. Left half: lowpass, cutoff 20 kHz → 80 Hz (log). Right half: highpass, 20 Hz → 8 kHz (log). Q ramps 0.7 → 8 toward the extremes. Knob within ±0.03 of center snaps to bypass. Unmapped on factory MIDI — UI always live; learn to a spare knob (docs/04).

**Flanger** — split dry/wet; wet path: DelayNode (base 2 ms) with LFO (OscillatorNode sine → GainNode depth → delayTime), feedback GainNode loop. Params: rate 0.05–2 Hz (default 0.25), depth 0.5–3 ms (default 1.5), feedback 0–0.85 (default 0.5), wet 0–1 (`deckA.wet` / `deckB.wet`, equal-power mix). Defaults tuned by ear on real material before E6 closes.

Pad behavior: pad toggles the effect on/off (latching). Filter amount and wet are **never** mode-shared (avoids soft-takeover fights when switching FX). Active effect state must be visually loud (R3.2).

## Metering

Per channel + master: `AnalyserNode` (fftSize 2048) read each rAF; RMS → dB. VU zones: green < -9 dBFS, amber -9..-3, red > -3 (post-fader, pre-master for channels; post-limiter-input for master clip light). Meters live beside faders (style guide).
