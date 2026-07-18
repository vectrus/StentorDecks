# E2 — HW VERIFICATION COMPLETE

Owner-only checks on the physical Hercules DJConsole RMX2.  
**Do not mark these passed in code/CI** — owner confirms, then docs are updated.

Software hooks exist (Plan A/B, cue bus, device-loss banner/rebuild). This list was the epic gate before E4+.

**Status: owner signed off 2026-07-18 — all sections PASS. E2 `[HW]` gate cleared.**

---

## Prerequisites

- RMX2 USB connected; Windows sees the Hercules audio device (4 outs preferred).
- App started (`Start StentorDeck.bat` / `npm start`), audio setup completed.
- Two different tracks loaded (Deck A + Deck B) via E2 Harness.
- Headphones on outs **3–4** (Plan A) or the Plan B cue device.

---

## 1. Plan A — dual output + PFL + HeadMix

| # | Action | Pass? |
|---|---|---|
| 1.1 | Audio setup shows **Plan A** (4-channel / single device). | ☑ |
| 1.2 | Play Deck A → music on sound-system outs **1–2**. | ☑ |
| 1.3 | Load different track on B; PFL **B** only → B audible in phones **3–4**, A still on 1–2. | ☑ |
| 1.4 | PFL **A** + **B** → both in phones; channel faders still control master independently (PFL does not force fader to 0). | ☑ |
| 1.5 | Sweep **HeadMix** cue → mix → cue: blend audibly changes phones content. | ☑ |
| 1.6 | Cue hold (CDJ preview) on a stopped deck is audible in phones without a loud click on the PA. | ☑ |

Notes: Owner confirmed 2026-07-18 (full checklist).

---

## 2. Plan B — forced dual stereo endpoints

| # | Action | Pass? |
|---|---|---|
| 2.1 | Settings / audio setup: force **Plan B**; UI shows active plan **B**. | ☑ |
| 2.2 | Master device ≠ cue device; play + PFL behaviors match Plan A intent (master on master device, cue on cue device). | ☑ |
| 2.3 | Return to **auto** (or Plan A) when done. | ☑ |

Notes: Owner confirmed 2026-07-18 (full checklist).

---

## 3. Unplug / replug mid-playback

| # | Action | Pass? |
|---|---|---|
| 3.1 | While playing, unplug RMX2 USB → banner appears; decks **pause**; playhead positions kept. | ☑ |
| 3.2 | Replug USB → banner clears / “reconnected”; time/position kept; **Press Play** → audio within ~2 s without restarting the app. | ☑ |
| 3.3 | No crash; audio resumes cleanly after rebuild. | ☑ |

Notes: Owner confirmed 2026-07-18 (full checklist).

---

## Sign-off

| Field | Value |
|---|---|
| Date | 2026-07-18 |
| Owner | Julius |
| Plan A | **PASS** |
| Plan B | **PASS** |
| Unplug/replug | **PASS** |

E2 `[HW]` is **DONE** in `ROADMAP.md`. E4+ merges are unblocked for the audio-routing gate (E3 MIDI `[HW]` remains separate).

---

## Manual soak (software acceptance, not CI)

Optional after HW: 30‑minute two-deck playback with FX toggling; watch Task Manager — renderer working set should stay &lt; ~400 MB without climbing. DevTools heap snapshot: no accumulating AudioNodes after rebuild cycles. Record result in CHANGELOG notes.
