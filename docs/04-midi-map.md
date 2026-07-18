# 04 — RMX2 MIDI map & learn mode

Factory defaults below are taken from the Mixxx project's RMX2 mapping (community-verified against real hardware). All on MIDI channel 1. Notes are `0x90` (on) / `0x80` (off); CCs are `0xB0`. Values hex.

**Trust level:** faders/knobs/transport/browse verified; FX pad notes **owner-confirmed 2026-07-18** on Julius’s RMX2 in FX mode (`01`/`02` / `11`/`12` — see `E3-HW-CHECKLIST.md`). Other pad modes (sample/cue/loop) still unused in v1.

## Buttons (note messages)

| Control | Deck A | Deck B | App action |
|---|---|---|---|
| Play | 21 | 32 | toggle play/pause |
| Cue | 22 | 33 | classic CDJ cue (R2.10 / docs/03) |
| Sync | 23 | 34 | one-shot BPM match only (never tap tempo) |
| Load | 24 | 35 | load selected track (interlock R4.2) |
| Headphone (PFL) | 2E | 3F | toggle deck cue |
| Fast rewind | 26 | 37 | seek back (hold) |
| Fast forward | 27 | 38 | seek forward (hold) |
| Pitch bend − | 2C | 3D | temp rate −0.5 % while held |
| Pitch bend + | 2D | 3E | temp rate +0.5 % while held |
| Kill high | 28 | 39 | toggle EQ high kill |
| Kill mid | 29 | 3A | toggle EQ mid kill |
| Kill low | 2A | 3B | toggle EQ low kill |
| Jog press | 2F | 40 | (reserved; no-op v1) |
| Pads 1–4 (fx mode) | `01` / `02` | `11` / `12` | pad1 = `filterPad` (filter toggle), pad2 = `flangerPad` (flanger toggle). Owner-confirmed FX mode 2026-07-18 |

Browse cluster (shared): up `45` prev row, down `46` next row, left `44` parent folder, right `43` enter folder. Mic button `48`: reserved, no-op v1.

## Continuous (CC messages)

14-bit controls send MSB/LSB pairs; consume MSB+LSB as one value (14-bit resolution matters for pitch). LSB CCs must never be independently learnable.

| Control | CC (MSB/LSB) | Notes |
|---|---|---|
| Ch fader A | 3A / 3B | curve-mapped, soft takeover |
| Ch fader B | 4A / 4B | curve-mapped, soft takeover |
| Pitch fader A | 36 / 37 | dead-zone, soft takeover |
| Pitch fader B | 38 / 39 | dead-zone, soft takeover |
| Master volume | 44 / 45 | soft takeover |
| HeadMix (cue/mix) | 46 / 47 | soft takeover |
| Crossfader | 48 / 49 | **ignored by default** (R2.4) |
| Gain A / B | 42 / 52 | 7-bit, soft takeover |
| EQ A high/mid/low | 3C / 3E / 40 | 7-bit, soft takeover |
| EQ B high/mid/low | 4C / 4E / 50 | 7-bit, soft takeover |
| Jog A / B (turn) | 30 / 31 | relative two's-complement: v<64 → +v, else v−128 |
| Jog A / B (scratch mode) | 32 / 33 | treat same as turn (no scratching) |
| WET knob A / B | learn | `deckA.wet` / `deckB.wet` — no factory knob; assign via learn |
| Filter amount A / B | learn | `deckA.filter` / `deckB.filter` — separate from wet; no factory knob; assign via learn |
| Tap tempo A / B | learn | optional; factory Sync stays Sync |
| BPM half / double | learn | optional Prep/performance actions |
| Key nudge / set | learn | optional |

## LED feedback (MIDI out)

Send note-on velocity 7F / 00 to the button's own note number to light/extinguish its LED (Hercules convention; verify per LED on hardware). v1 targets: play (lit while playing), cue-monitor, kills, sync (lit while sync-armed), FX pads. Non-responding LEDs: log, skip, never retry-spam.

## Mapping model & learn mode (R8.2)

```ts
type Binding =
  | { kind:'button'; ch:number; note:number }
  | { kind:'cc7';    ch:number; cc:number }
  | { kind:'cc14';   ch:number; msb:number; lsb:number }
  | { kind:'ccRel';  ch:number; cc:number };          // jogs
type Mapping = Record<ControlId, Binding>;
// ControlId includes at least:
//   deckA|B.play|cue|sync|load|pfl|jog|filter|wet|tapTempo|bpmHalf|bpmDouble|key*
//   mixer.faderA|B, mixer.eqA.* , app.toggleMode, ...
```

Stored in SQLite (`midi_map`), exported/imported as JSON. Factory map ships as a constant; "Reset to RMX2 defaults" always available.

Learn flow: enable Learn → UI controls get a target overlay → click one → next qualifying message binds it. Qualifying: for buttons, any note-on; for continuous, the **first CC number that repeats with ≥3 distinct values within 500 ms** (rejects one-shot LSB noise); if a second interleaved CC tracks it consistently at +1, record as cc14. Esc cancels; captured binding shown for confirm/undo. Conflict (binding already used) → highlight the other control, require explicit steal.

## Runtime rules

- Message dispatch: map `(status,ch,number)` → ControlId → store action. Unknown messages: counted, visible only in MIDI monitor.
- Soft takeover intercepts continuous controls per docs/03.
- Device matching: prefer the port whose name contains `RMX`; else first available; selectable in settings. Hot-plug via `statechange` (R1.5) re-arms all takeovers.
