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

Master bus → masterGain (hardware master volume CC; **software default 0.3 / 30%** so cold-start is booth-safe) → DynamicsCompressor as **safety limiter** (threshold −3 dB, ratio 20, knee 0, attack 1 ms, release 250 ms) → merger ch 0/1. Limiter is a last-resort clip guard, not a loudness maximizer; gain staging is trim + channel faders + MST.

Cue bus: per-deck pflTap gains (0/1, 15 ms ramp) → cueSum; headphone output = blend(cueSum, master bus) via equal-power cue/mix crossfade (hardware HeadMix / UI **CUE**) → headphoneGain (software `mixer.phones` / UI **PHN**) → merger ch 2/3. The RMX2’s physical phones volume knob is analog (no MIDI) and sits after the DAC — it does not move PHN.

## Transport

- Play: create a fresh `AudioBufferSourceNode` at `ctx.currentTime` through a per-source gain (unity), remember `(startCtxTime, startOffset)`. Pause: stop node, compute offset. Sources are throwaway; the decoded `AudioBuffer` is deck state.
- **Playing seek** (jog sticky phase, cue jump while playing, SYNC phase snap/assist): **overlap crossfade** — keep the prior source fading out on its local gain while a new `AudioBufferSourceNode` starts at the target offset fading in. Do **not** cold `stop` + recreate mid-waveform (that zippers). Micro-seeks (jog/assist) use ~10 ms; large/cue jumps ~15 ms. After the fade, disconnect the old source. Stopped seek only updates offset (no source).
- **Frame clock (R7.5 / E7):** one rAF ticks both decks, then samples `transport.position()` into non-observable `visualPosSec` and runs registered waveform drawers. Detail/overview canvases must **not** run private rAF loops (avoids A/B sampling crawl). Remaining-time UI uses a ~10 Hz `displayPosition`.
- **Visual latency offset (draw only):** playhead draw uses `max(0, transportPos − (baseLatency + outputLatency))`. Transport / jog / SYNC clocks are **not** shifted — R2.2 output latency is still WASAPI/Chromium.
- Position for logic: re-anchor on rate change / seek; while ramping, multiply elapsed by the **live** `playbackRate.value` so the playhead does not race the audio.
- Nudge (jog) — `shared/jogFeel`, tunables in `settings.mixer.jog` / docs/07. **Vinyl OFF / Soft (default):** rim-speed regimes from message-rate EMA (1 MIDI msg = 1 tick; packed |delta| ignored for speed). **Slow rim** (~&lt;1 cm/s outer): **ride** — temporary rate bend (forward = speed up / phase creeps forward; back = slow down). **Faster rim:** **nudge** — stronger rate throw + tiny sticky seasoning (nudge² + flood; ~4.5 ms impulse cap) so flicks are not skippy seek stairs. **Vinyl ON / `dualZone: true`:** fine sticky seek + spinback on sustained whip. Scratch CCs `32`/`33` alias to turn jogs. RMX2 **Vinyl** `0x47` toggles dual-zone. Presets: Soft (ride + nudge) / Balanced / Spinny. Jog mutes soft phase assist ~800 ms and retargets post-SYNC phase glue.
- Pitch: `rate = 1 + pitchFaderNormalized × pitchRange` where `pitchRange` is `0.08` or `0.16` from settings (R2.6). Effective BPM = fileBPM × rate (drives the big readout). Changing range re-maps the current fader position into the new domain and re-arms soft takeover.
- SYNC: latching on/off, **one slave at a time** — engage clears SYNC on the partner, then matches tempo so pitchOnlyBPM(this) = pitchOnlyBPM(other) (fileBPM × pitch-fader rate; partner jog/bend ignored) or pitch-% match if file BPM unknown, then **one-shot phase snap** onto analyzed beatgrids in **track time**: each deck’s period = `60/fileBPM`, compare beat fractions, correct this deck’s buffer position. While armed: tempo follow (skip no-op pitch writes) + **soft phase assist** on that lattice — small errors use a tiny temporary **rate bias**; larger errors use throttled micro-seeks (not every rAF). **On release:** pitch stays frozen and **phase glue** holds the current track-time phase error; further jogs retarget the glue. Glue clears on pitch-fader move, load (R3.3), or re-engaging SYNC. **Loading a new track on the master** clears SYNC on the slave and **freezes** the slave’s pitch (does not retarget mid-play to the new analyzed BPM). Soft-takeover re-arms the pitch fader on engage. Factory Sync buttons only — never aliased to tap tempo. Phase snap/assist/glue skipped when file BPM or beat-grid offset unknown (tempo-only / pitch-% mode; status line honest). Not Pioneer hard phase-lock (R2.3).
- Brake (optional, default off): on stop, ramp playbackRate → 0 over 400 ms, then stop.
- Load interlock: `DeckStore.load()` throws `DeckPlayingError` if `state === playing`; every input path routes through this one method (R4.2).
- Deck reset on load: FX **pads** off, kills released, nudge cleared, sync released, cue point → 0:00 on the new buffer. Filter amount / wet **adopt last hardware** when known (else → 0.5 / 0 + arm). Pitch + EQ values kept and **stay live** if already live (no blanket re-arm). Then **auto-gain trim** (R2.13) re-arms **gain only**. Click-free via 15 ms gain ramps.

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

- Channel faders: bottom **toe** then power curve. First map physical `pos` so **0..0.20 → 0..0.10** of the shaped domain (remaining 0.20..1.0 → 0.10..1.0) — soft cut-in. Then `shaped = eased^(2^(s/50))` with `s ∈ [-100..100]` (0 = linear-in-eased, positive = fine control at top). Domain map: `gain = 0` at pos 0, else `dB = -60 + shaped × 60`, `gain = 10^(dB/20)`. Presets: linear s=0, smooth s=55, sharp s=-45. Per-fader setting, mirrored by default (`linked: true`).
- Pitch faders: linear, then center dead-zone: `|pos-0.5| < deadZone/2 → 0.00 %` with continuous remap outside the zone (no jump at the edge). `deadZone` default 0.04, range 0–0.10. Domain: `pitch% = (posMapped - 0.5) × 2 × (pitchRange × 100)`.
- EQ knobs (per band): knob `t ∈ 0..1`, center 0.5 = 0 dB. Non-linear bipolar map with soft shoulders:
  - `u = 2t - 1` → `shaped = sign(u) × |u|^γ` with `γ = 1.6` (finer near center).
  - `dB = shaped × eqMaxDb` where `eqMaxDb` is settings-selectable, default **12**.
  - Soft edge: as `|shaped| → 1`, apply a smoothstep saturation so the last ~10 % of throw approaches `±eqMaxDb` asymptotically (no abrupt shelf). All gain changes use `setTargetAtTime` / linearRamp ≥ 15 ms — never snap `.value` mid-playback.
- Curve is applied **after** soft-takeover comparison: takeover compares raw hardware position against the raw position corresponding to the current software value (inverse-map), so pickup feel is independent of curve.

## Auto-gain (R2.13)

On load, after deck reset: if `audio.autoGain` is true and the track has `loudness_lufs` (docs/05), set trim so estimated playback loudness matches target `-14 LUFS` (clamped to trim domain -∞..+12 dB) and soft takeover re-arms the gain knob. If auto-gain is **off** (or loudness missing), trim is **sticky** across loads — do not zero GAIN; soft takeover stays live if it was live.

## Soft takeover (R2.7)

Applies to: channel faders, pitch faders, gain, EQ ×3 ×2, filter amount ×2, wet knobs, master, headMix, phones.
State per control: `armed` (bool) + last hardware raw. Armed on: app start, MIDI reconnect, software-side change of **that** value (sync, UI drag, preset, auto-gain). **Deck load** is special (R3.3): do not blanket-rearm unchanged pitch/EQ; adopt hardware for filter/wet when known; arm gain after auto-gain only. While armed, incoming hardware values are ignored until hardware crosses the software value (or comes within 1/128); then control goes live. `MidiStore` exposes `{softwareValue, hardwareValue, armed}` per control; UI renders the hollow pickup marker from this (R7 / style guide).

## Effects (R3)

Insert chain: `input → [filter] → [flanger] → output`, each independently bypassable (true bypass via routing, 15 ms crossfade to avoid clicks).

**Filter** — one BiquadFilter. Amount ControlId `deckA.filter` / `deckB.filter` (separate from wet). Knob 0..1, center 0.5 = bypass. Left half: lowpass, cutoff 20 kHz → 80 Hz (log). Right half: highpass, 20 Hz → 8 kHz (log). Q ramps 0.7 → 8 toward the extremes. Knob within ±0.03 of center snaps to bypass. Unmapped on factory MIDI — UI always live; learn to a spare knob (docs/04).

**Flanger** — split dry/wet; wet path: DelayNode (base 2 ms) with LFO (OscillatorNode sine → GainNode depth → delayTime), feedback GainNode loop. Params: rate 0.05–2 Hz (default 0.25), depth 0.5–3 ms (default 1.5), feedback 0–0.85 (default 0.5), wet 0–1 (`deckA.wet` / `deckB.wet`, equal-power mix). Defaults tuned by ear on real material before E6 closes.

Pad behavior: pad toggles the effect on/off (latching). While flanger is on, writing filter amount also sets wet to the same value (engage adopts current AMT → wet). Dedicated wet ControlId still works. Active effect state must be visually loud (R3.2).

## Metering

Per channel + master: `AnalyserNode` (fftSize 2048) read each rAF; RMS → dB for the bar fill, plus a short **peak hold** tip (true peak of the block). VU zones: green < -9 dBFS, amber -9..-3, red > -3 — segment heights are stacked fractions of the full bar (mockup 05). Channel default = **post-fader** (mix/PA). When that deck’s **PFL is on**, the bar shows `max(pre-fader, post-fader)` so trim/EQ/gain are readable with the channel fader down (cue matching). Master meter stays post-limiter-input. Meters live beside faders (style guide).
