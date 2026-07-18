# Roadmap & todo

Living tracker for spec work and build order. **Agents must keep this file, root `README.md` § Roadmap, and `CHANGELOG.md` in sync** (see `.cursorrules` §2c) whenever epic status changes.

**Status legend:** `TODO` · `DOING` · `BLOCKED` · `DONE` · `BACKLOG`

---

## Now (spec hygiene)

| ID | Item | Status | Notes |
|---|---|---|---|
| S1 | Owner gap-fill decisions → locked requirements | DONE | 2026-07-18 |
| S2 | Propagate decisions into docs/02–07 + epics | DONE | 2026-07-18 |
| S3 | Create CHANGELOG + ROADMAP | DONE | this file |
| S4 | Drop mockups into `docs/mockups/` | DONE | `01`–`06` + `MOCKUPS.md` |
| S5 | Resolve canonical epic path | DONE | nested tree gone; `docs/E*.md` |
| S6 | Confirm Sync stays SYNC | DONE | owner 2026-07-18 |
| S7 | Working title rename before E1 | TODO | Optional; README flag |
| S8 | USB selective-suspend / RMX2 sleep note in MANUAL or E7 | TODO | Mentioned in review |
| S9 | Library sort default + duplicate-hash policy | DONE | Owner agreed; R5.6 / R5.7 |
| S10 | Mockups: pad activates, knob = amount | DONE | `01`/`04` + MOCKUPS.md; R3.1 clarified |
| S11 | Playwright doc screenshots | DONE | `npm run docs:screenshots`; cursorrules §2b |

---

## Build order (implementation)

Gating: **E2 `[HW]`** and **E3 `[HW]`** both **PASSED 2026-07-18** (owner Julius). E4/E5 unblocked.

```
E1 skeleton → E2 audio [HW ✓] → E3 MIDI [HW ✓]
                → E4 library  ⎤
                → E5 analysis ⎦ parallel
                → E6 UI [HW mix]
                → E7 polish
```

| Epic | Status | Blocking deps | Notes |
|---|---|---|---|
| E1 | DONE | — | Shell + IPC + settings + DB (2026-07-18) |
| E2 | DONE | E1; **RMX2** | `[HW]` Plan A/B + unplug/replug **PASS** — owner Julius 2026-07-18. Checklist: [`E2-HW-CHECKLIST.md`](./E2-HW-CHECKLIST.md) |
| E3 | DONE | E2 actions | `[HW]` pads + takeover + OOTB sweep + LEDs **PASS** — owner Julius 2026-07-18. Checklist: [`E3-HW-CHECKLIST.md`](./E3-HW-CHECKLIST.md) |
| E4 | DOING | E1 + E3 | Core library + MIDI browse + watcher + root picker + Prep UI + Perf 3-row strip. Remaining: large-library soak ACs. |
| E5 | DOING | E1 + E4 schema | Queue + pipeline + idle backfill + resilient MP3 decode + **beatgrid offset (v3)** for SYNC; accuracy harness later |
| E6 | DOING | E2–E5; mockups | Perf v2 + AMT/EOT/load toast. Remaining: pitch dead-zone viz, settings curve editor surface, `[HW]` mix |
| E7 | TODO | E1–E6 | backlog issues |

### Mockup map (authoritative layouts)

| Mockup | Epic consumer |
|---|---|
| `01-performance-mode.html` | E6 |
| `02-prep-mode.html` | E4 / E6 |
| `03-audio-setup.html` | E2 |
| `04-deck-panel-states.html` | E6 |
| `05-mixer-column.html` | E6 |
| `06-fader-curve-editor.html` | E6 settings |

---

## Backlog (explicitly not v1-blocking)

- Split cue — R2.8 nice-to-have
- Performance-console chrome for tap / half / double / key — R6.6 nice-to-have
- Transport session restore after renderer crash — R1.6
- Inputs / mic, hotcues, loops, keylock, recording, gater, crossfader UI, second screen
- Drive-letter remount identity hardening
- Windows USB selective suspend guidance / mitigation
- **v2 Spotify + AI mixmatch/autoplay** — decisions locked in [`BACKLOG-v2-spotify-ai.md`](./BACKLOG-v2-spotify-ai.md) (2026-07-18). Not v1. Includes parked spike: **reuse Prep library chrome as Co-pilot queue / playlist surface** (examine at V2-E; no v1 playlists).

---

## Open questions for Julius

*(none for v1 — Sync, epic path, library policy, FX pad/knob closed 2026-07-18)*

v2 Spotify/AI defaults were agent-decided with rationale in `BACKLOG-v2-spotify-ai.md`; override there if needed.

---

## How to update this file

1. Change the Status cell; add a one-line Notes date.
2. Add a matching entry at the top of `CHANGELOG.md` if requirements/docs changed.
3. Mirror epic status + “in progress / next” into the **Roadmap & status** section of [`../README.md`](../README.md).
4. Never silently expand v1 — park in Backlog and ask.
