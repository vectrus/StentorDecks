# E2 — READY FOR HW VERIFICATION

Owner-only checks on the physical Hercules DJConsole RMX2.  
**Do not mark these passed in code/CI.** Confirm each item, then update `docs/ROADMAP.md` + `CHANGELOG.md`.

Software hooks exist (Plan A/B, cue bus, device-loss banner/rebuild). This list is the epic gate before E4+.

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
| 1.1 | Audio setup shows **Plan A** (4-channel / single device). | ☐ |
| 1.2 | Play Deck A → music on sound-system outs **1–2**. | ☐ |
| 1.3 | Load different track on B; PFL **B** only → B audible in phones **3–4**, A still on 1–2. | ☐ |
| 1.4 | PFL **A** + **B** → both in phones; channel faders still control master independently (PFL does not force fader to 0). | ☐ |
| 1.5 | Sweep **HeadMix** cue → mix → cue: blend audibly changes phones content. | ☐ |
| 1.6 | Cue hold (CDJ preview) on a stopped deck is audible in phones without a loud click on the PA. | ☐ |

Notes: _______________________________________________

---

## 2. Plan B — forced dual stereo endpoints

| # | Action | Pass? |
|---|---|---|
| 2.1 | Settings / audio setup: force **Plan B**; UI shows active plan **B**. | ☐ |
| 2.2 | Master device ≠ cue device; play + PFL behaviors match Plan A intent (master on master device, cue on cue device). | ☐ |
| 2.3 | Return to **auto** (or Plan A) when done. | ☐ |

Notes: _______________________________________________

---

## 3. Unplug / replug mid-playback

| # | Action | Pass? |
|---|---|---|
| 3.1 | While playing, unplug RMX2 USB → banner appears; decks **pause**; playhead positions kept. | ☐ |
| 3.2 | Replug USB → banner clears / “reconnected”; time/position kept; **Press Play** → audio within ~2 s without restarting the app. | ☐ |
| 3.3 | No crash; audio resumes cleanly after rebuild. | ☐ |

Notes: _______________________________________________

---

## Sign-off

| Field | Value |
|---|---|
| Date | |
| Owner | Julius |
| Plan A | PASS / FAIL |
| Plan B | PASS / FAIL |
| Unplug/replug | PASS / FAIL |

When all three are **PASS**, set E2 `[HW]` to DONE in `ROADMAP.md` and allow E4+ merges per `.cursorrules`.

---

## Manual soak (software acceptance, not CI)

Optional after HW: 30‑minute two-deck playback with FX toggling; watch Task Manager — renderer working set should stay &lt; ~400 MB without climbing. DevTools heap snapshot: no accumulating AudioNodes after rebuild cycles. Record result in CHANGELOG notes.
