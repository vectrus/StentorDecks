# Backlog — Multi-controller MIDI (RMX2 locked)

Parked implementation track for optional controller profile packs.
**Does not reopen E3.** RMX2 remains the only factory default and `[HW]`-verified controller.

Operator summary: [`../README.md`](../README.md) § Controllers. Factory map authority: [`04-midi-map.md`](./04-midi-map.md).

## Status

| Phase | What | Status |
|---|---|---|
| 0 | Docs + deny list | DONE (this file + README) |
| 1 | Profile schema, registry, Settings apply/reset | DONE |
| 2 | Community profiles: DDJ-FLX4, Inpulse 500 | DONE (unverified) |
| 3 | LED adapters / shift layers / FLX10 A+B | BACKLOG |

## Prime constraint

- Fresh install / empty DB / **Reset to RMX2 defaults** → `RMX2_FACTORY_MAP` only.
- Port preference still prefers names containing `RMX`.
- Never auto-apply a community profile on hot-plug.
- Never claim `[HW] PASS` for non-RMX2 profiles without physical verification.

## Architecture

Static **ControlId → Binding** JSON packs (`shared/src/controllerProfiles/`).
No Mixxx JavaScript at runtime. MIDI Learn (R8.2) still covers gaps.

## Deny list (refused — would risk RMX2 or v1)

| Denied change | Why |
|---|---|
| Auto-switch factory map when a non-RMX port appears | Silently breaks Julius’s booth after a friend’s controller |
| Replacing `RMX2_FACTORY_MAP` with a “generic 2-deck” layout | RMX2 notes/CCs are HW-verified |
| Running Mixxx `.script.js` inside Electron | Security, latency, different ControlId model |
| Global jog/scratch semantics for Pioneer “vinyl” | v1 excludes scratching; RMX2 dual-zone jog is tuned |
| Softening cc14 / LSB / Learn rules for 7-bit-only gear | RMX2 pitch/faders need 14-bit + LSB rejection |
| Claiming `[HW] PASS` for FLX4 / Inpulse / etc. without physical verification | Same rule as E3 |
| First-class 4-deck / stems / pad-mode banks (FLX10) | v1 is two decks; stems/loops/hotcues excluded |
| Changing default audio Plan A RMX2 suggest as “generic factory” | Other interfaces already work via Audio setup |

## Community profiles shipped

| Profile id | Hardware | Status |
|---|---|---|
| `rmx2` | Hercules DJConsole RMX2 | **factory** / HW-verified |
| `pioneer-ddj-flx4` | Pioneer / AlphaTheta DDJ-FLX4 | community — READY FOR HW VERIFICATION |
| `hercules-inpulse-500` | Hercules DJControl Inpulse 500 | community — READY FOR HW VERIFICATION |

Sources: Pioneer MIDI message list + Mixxx `Pioneer-DDJ-FLX4.midi.xml`; Mixxx community Inpulse 500 map (`herimp-500map`). Partial maps — pads/stems/script layers stay Learn-or-unmapped.
