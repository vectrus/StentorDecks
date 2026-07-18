# Spec changelog

Decisions and material changes to the locked requirements and derived docs.
Newest first. Each entry cites owner sign-off context and R-IDs touched.

---

## 2026-07-18 — Fix cue PFL + phones gain

- HeadMix default **0** (cue only) so master no longer drowns PFL at 50/50.
- Phones/master/HeadMix use linear ramps; phones hits true mute at 0.
- PFL on a **stopped** deck starts monitor playback (pre-fader cue, fader forced 0 to master).
- Mixer gains re-applied after every engine rebuild.

---

## 2026-07-18 — E2 HW progress (owner)

Owner confirmed on real RMX2: configure devices, load a track, play. Screenshot: **Plan A** active, Deck A playing with VU (~−31 dBFS). Still open: cue on 3-4 + PFL/HeadMix, forced Plan B, USB unplug/replug.

---

## 2026-07-18 — Free Vite port on start

`scripts/free-port.mjs` + launcher/`npm start` clear :5173 before Vite so relaunches don’t fail with “port already in use”.

---

## 2026-07-18 — Easy start: `Start StentorDeck.bat` + `npm start`

Double-clickable Windows launcher (install if needed → rebuild native → `npm run dev`). `npm start` aliases the same.

---

## 2026-07-18 — Playwright doc screenshots + cursorrules §2b

- `@playwright/test` suite: `docs/playwright/mockup-screenshots.spec.ts` → `docs/mockups/screenshots/`
- Scripts: `npm run docs:screenshots` (+ CI step)
- `.cursorrules` §2b: regenerate screenshots when mockups change; no ad-hoc snips when a Playwright path exists
- Fix: stale WASAPI deviceIds after reboot → re-suggest RMX2 / force Audio setup (addresses “No master device — Plan B”)

---

## 2026-07-18 — E2 started (audio + RMX2 routing)

Renderer audio stack: device enumeration / Plan A|B probe, AudioEngine (4-ch merger or dual-context cue bridge), DeckGraph + transport (CDJ cue, EOT→cue, pitch/nudge/brake hooks), Mixer/cue/FX/meters, DeckStore load interlock + reset, Audio setup screen (mockup 03), E2 dev harness. Pure curve math in `shared/audioCurves` with unit tests. `[HW]` Plan A/B on RMX2 still owner-verified.

---

## 2026-07-18 — E1 scaffold started

Greenfield implementation of epic E1: npm workspaces (`shared`, `app/main`, `app/renderer`, `app/analysis`), typed IPC, settings (zod + atomic JSON), SQLite migration 001, React/MobX shell with mode switcher + temp scale panel, electron-builder NSIS config, CI workflow. R-IDs: R1.1, R1.2, docs/02 IPC, docs/07.

---

## 2026-07-18 — FX: pad activates, knob = amount; library policy owner-agreed

- R3.1 clarified: **pad = on/off**, **AMT/WET knobs = amount** (separate ControlIds).
- Mockups `01` / `04` FX row: `FILTER · AMT · FLANGER · WET`. `MOCKUPS.md` updated.
- Owner agreed R5.6 / R5.7 (filename sort; two rows + shared analysis).
- ROADMAP S9 / S10 closed; no open questions.

---

## 2026-07-18 — Sync confirmed, mockups in, library sort/dup policy

**Context:** Owner closed open questions; mockups landed in `docs/mockups/`.

| Item | Decision |
|---|---|
| Sync | **SYNC stays SYNC** (factory Sync buttons = one-shot BPM match only) |
| Epic path | Nested `stentordeck-spec/` removed; canonical epics are `docs/E*.md` |
| Mockups | Present: `01`–`06` HTML + `MOCKUPS.md` (authority rules therein) |
| Library sort (R5.6) | Default folder sort = **filename A→Z**; alternates artist/title/BPM/key/duration; search = artist then title |
| Duplicates (R5.7) | **Two rows** for two paths; analysis **shared by `partial_hash`** |

**Files:** `01`, `05`, `07`, `E4`, `README`, `ROADMAP`, this changelog.

**Note:** `MOCKUPS.md` still describes “FILTER + FLANGER pads only.” Spec R3.1 / docs/06 require a **filter amount knob** beside the filter pad. Treat docs as winning for that control until mockups get a small refresh (ROADMAP S10).

---

## 2026-07-18 — Gap-fill from DJ / software-design review

**Context:** Owner answers to clarifying questions after a full-spec review (Carl Cox–style booth needs + veteran software design). Spec files updated the same day.

### Locked decisions

| # | Topic | Decision | R-IDs |
|---|---|---|---|
| 1 | Cue | Classic CDJ (set / hold-preview when stopped; jump-and-continue when playing) | R2.10 |
| 2 | End of track | Stop + jump to cue; warn at 30 / 15 / 10 s | R2.11 |
| 3 | Loudness | Auto-apply trim from analysis; manual override always available | R2.13, R6.5 |
| 4 | Filter vs wet | Separate ControlIds; filter factory-unmapped (learn); no mode-sharing | R3.1 |
| 5 | EQ | Settable max dB, default ±12; non-linear + soft edge at extremes | R2.12 |
| 6 | BPM/key fix | Tap + half/double + key override in v1; Prep UI required; factory Sync stays Sync; Performance chrome nice-to-have | R2.3, R6.6 |
| 7 | Beat aids | Visual beat ticks only (not editable grids, not phase SYNC) | R7.5 |
| 8 | Split cue | Nice-to-have / backlog | R2.8 |
| 9 | Pitch range | Selectable ±8 % / ±16 % (SL-1200-style); mind short RMX2 faders | R2.6 |
| 10 | Renderer crash | Music stopping is acceptable; no session restore in v1 | R1.6 |
| 12 | Mockups | Owner will place assets under `docs/mockups/` shortly | — |

*(Q11 / epic path — closed in later entry same day.)*

### Files touched

- `docs/01-requirements.md` — new/extended R1.6, R2.6, R2.8, R2.10–R2.13, R3.1, R3.3, R5.5, R6.5–R6.6, R7.5
- `docs/02-architecture.md` — crash stance
- `docs/03-audio-engine.md` — CDJ cue table, EOT, pitch range, EQ curve, auto-gain, filter ControlIds
- `docs/04-midi-map.md` — filter/wet/tap learn rows; Sync ≠ tap
- `docs/05-library-and-analysis.md` — loudness columns + stage; manual corrections; beat ticks / cue / EOT render notes
- `docs/06-ui-style-guide.md` — Prep correction strip; EOT / cue / ticks states; filter knob in FX row
- `docs/07-settings-schema.md` — autoGain, pitch range, eq.maxDb, beat ticks, EOT warn
- Epics E2–E7 — acceptance criteria aligned
- `docs/ROADMAP.md` — created
- `docs/README.md` — links to changelog + roadmap

### Interpretation note (Q6)

Owner: “All of them, default is the Sync btn on the controller, Visible representation on console is a nice to have.”

Recorded as: **all correction tools in v1**; **factory Sync buttons remain one-shot BPM SYNC** (not retasked as tap); Prep UI required; Performance-cons