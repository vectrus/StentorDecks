# E3 — HW VERIFICATION COMPLETE

Owner-only checks on the physical Hercules DJConsole RMX2.  
**Do not mark these passed in code/CI** — owner confirms, then docs are updated.

Software ready: factory map (incl. FX pads), learn, persist, soft-takeover pickup table, MIDI monitor, LEDs.

**Status: owner signed off 2026-07-18 — all sections PASS. E3 `[HW]` gate cleared.**

---

## Prerequisites

- E2 `[HW]` already **PASS** (routing).
- RMX2 USB connected; app running; Audio setup done; MIDI shows connected (prefer port name containing `RMX`).
- E2/E3 Dev harness open; **MIDI monitor** visible.
- Pads in **FX mode** (not sample/cue/loop).

---

## 1. FX pad notes (filter / flanger)

Factory (Hercules MIDI Commands PDF — owner-confirmed):

| Control | Deck A note | Deck B note |
|---|---|---|
| Filter pad (pad 1) | `0x01` (1) | `0x11` (17) |
| Flanger pad (pad 2) | `0x02` (2) | `0x12` (18) |

| # | Action | Pass? |
|---|---|---|
| 1.1 | Open MIDI monitor. Press Deck A FX pad 1 → annotation shows `deckA.filterPad` (or note `01`). | ☑ |
| 1.2 | Deck A FX pad 2 → `deckA.flangerPad` (note `02`). | ☑ |
| 1.3 | Deck B FX pad 1 / 2 → `deckB.filterPad` / `deckB.flangerPad` (`11` / `12`). | ☑ |
| 1.4 | Pads toggle FILTER / FLANGER on that deck; LEDs follow when `Send MIDI LEDs` is on. | ☑ |
| 1.5 | If notes differ: Learn → bind `filterPad` / `flangerPad` → Confirm → Export (or tell agent the hex notes to patch factory). | ☑ N/A (factory OK) |

Notes: Owner confirmed 2026-07-18 (full checklist). Factory pad notes accepted.

---

## 2. Soft takeover (SYNC)

| # | Action | Pass? |
|---|---|---|
| 2.1 | Two tracks loaded; set File BPM on both; Sync Deck B → harness pickup shows `deckB.pitch` **ARMED**. | ☑ |
| 2.2 | Hardware pitch B inert until it crosses Soft value → becomes **live**. | ☑ |

Notes: Owner confirmed 2026-07-18. File BPM required on both decks for BPM match (documented in harness).

---

## 3. Out-of-the-box control sweep

| # | Action | Pass? |
|---|---|---|
| 3.1 | Play, Cue, Sync, PFL, kills, pitch bend, FF/RW on both decks. | ☑ |
| 3.2 | Both pitch faders: 1 mm move changes displayed pitch % (14-bit, no 7-bit stepping). | ☑ |
| 3.3 | Channel faders, gains, all six EQ knobs, master, headMix, jogs (nudge play / seek stop). | ☑ |
| 3.4 | Browse cluster moves fixture list; Load on a track row → harness “MIDI Load” file picker. | ☑ |
| 3.5 | Crossfader does nothing (unless enabled in settings). | ☑ |

Notes: Owner confirmed 2026-07-18 (full checklist).

---

## 4. LEDs

| # | Action | Pass? |
|---|---|---|
| 4.1 | Play lit while playing; Sync lit while armed; PFL / kills lit when on. | ☑ |
| 4.2 | FX pads lit when filter/flanger active. | ☑ |
| 4.3 | No LED output spam if MIDI out missing (one log line max). | ☑ |

Notes: Owner confirmed 2026-07-18 (full checklist).

---

## Sign-off

| Field | Value |
|---|---|
| Date | 2026-07-18 |
| Owner | Julius |
| Pad notes | **PASS** (factory `01`/`02`/`11`/`12`) |
| Soft takeover | **PASS** |
| OOTB sweep | **PASS** |
| LEDs | **PASS** |

E3 `[HW]` is **DONE** in `ROADMAP.md` + README. Path continues with E4 library + E5 analysis.
