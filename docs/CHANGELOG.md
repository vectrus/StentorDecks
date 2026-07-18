# Spec changelog

Decisions and material changes to the locked requirements and derived docs.
Newest first. Each entry cites owner sign-off context and R-IDs touched.

---

## 2026-07-18 — README roadmap with timestamps

Root [`README.md`](../README.md) now carries a dated epic status table (DONE/DOING/TODO), same-day milestones, in-progress, and next-up — mirrored from this ROADMAP. Update both when epic status changes.

---

## 2026-07-18 — E3 MIDI learn mode

Pure learn state machine (`shared/midiLearn`): button note-on, continuous ≥3 distinct CC values / 500 ms, cc14 auto-pair, LSB rejection, steal flow, Esc cancel. Harness UI + persist on confirm. Unit-tested without hardware. R-IDs: R8.2, docs/04, E3 learn AC.

---

## 2026-07-18 — E3 MIDI map persist (SQLite)

`midi_map` is loaded/saved via better-sqlite3; empty DB seeds `RMX2_FACTORY_MAP`. IPC: get/set/export/import/reset with zod validation (`shared/midiMappingSchema`). Renderer hydrates on boot; E2 harness has Export / Import / Reset. LEDs follow the live mapping + `settings.midi.sendLeds`. R-IDs: R8.2, docs/04.

---

## 2026-07-18 — E2 `[HW]` PASS (owner)

Julius verified Plan A (dual out + PFL + HeadMix), Plan B (forced dual stereo), and unplug/replug mid-playback on the physical RMX2. Sign-off in [`E2-HW-CHECKLIST.md`](./E2-HW-CHECKLIST.md). E2 epic **DONE**; audio-routing gate cleared for E4+. E3 MIDI `[HW]` still outstanding. R-IDs: R1.3, R1.4, R2.8, docs/02 failure stance.

---

## 2026-07-18 — Automated testing pyramid

Unit + component (Vitest/RTL) and Playwright end-user e2e (`npm run test:e2e`) with mocked IPC — no RMX2 in CI. Documented in `docs/TESTING.md`; CI runs `test` then `test:e2e` then doc screenshots.

---

## 2026-07-18 — SYNC latching on/off + real tempo match

SYNC is a latching control: press on → match partner tempo and stay lit (follow while on); press again → off. Pitch fader move or load still releases. Without file BPM, Sync only matched rates (useless across different tracks) — harness now has File BPM fields; with BPM, Sync matches effective BPM (R2.3).

---

## 2026-07-18 — E3 MIDI: holds, browse fixture, LEDs

- FF/RW seek-hold, pitch bend ±0.5% while held, browse cluster → `BrowseStore` fixture (until E4).
- MIDI LED out for play / sync / PFL / kills (silent if no output port).
- Dev harness shows browse cursor for RMX2 cluster testing.

---

## 2026-07-18 — Cue jump+stop; Sync without file BPM

- **Cue (R2.10):** while playing, Cue jumps to cue point and **stops** (Pioneer-style). Spec table in docs/03 updated. MIDI/UI no longer start cue-preview on the same press after a playing jump (that kept audio running).
- **Sync:** no longer no-ops when `fileBpm` is missing (pre-E5). Matches the other deck’s playback rate; with BPM, still matches effective BPM.

---

## 2026-07-18 — Fix reconnect rebuild loop + MIDI + short tracks

Follow-up: rebuilding on **every** `devicechange` while healthy was stopping playback, truncating restored audio (~tens of seconds), and stranding MIDI. Now rebuild only on real loss/recovery; decks keep a full PCM snapshot from load; MIDI handler re-binds after audio USB churn.

## 2026-07-18 — Fix audio after USB unplug/replug

After RMX2 disconnect/reconnect, faders still moved but Play left the time at 0:00. Causes: (1) WASAPI `deviceId` changes on replug so the app stayed in “device lost” and never rebuilt; (2) `AudioBuffer`s from the closed `AudioContext` were reused and could not play. Fix: rebind by device label, rebuild, restore from deck PCM stash; decks stay paused — press Play.

---

## 2026-07-18 — v2 backlog: Spotify + AI (decisions locked)

Parked post-v1 work in [`BACKLOG-v2-spotify-ai.md`](./BACKLOG-v2-spotify-ai.md). Locked: Spotify = browse/match only (no stream audio); mixmatch = analysis→embeddings→LLM rerank (OpenAI|Anthropic|Off); autoplay default = Co-pilot (never load playing deck); suggestions = library-only + Spotify wantlist. Rationale in that file. Does not change v1 scope.

---

## 2026-07-18 — Fix load: OfflineAudioContext in worker

Electron DedicatedWorkers often lack `OfflineAudioContext`. Decode falls back to async `AudioContext.decodeAudioData` on the live context so Deck load no longer fails with “OfflineAudioContext is not defined”.

---

## 2026-07-18 — E2 software close + E3 MIDI scaffold

- **E2 (R2.10 / R2.13 / docs/03):** pure CDJ cue state table + tests; auto-gain load tests; off-main-thread decode worker; filter/flanger AudioParam ramps (≥15 ms); cue/PFL soft-edge polish (no fader coupling).
- **E2 [HW]:** owner checklist [`E2-HW-CHECKLIST.md`](./E2-HW-CHECKLIST.md) — **PASS** 2026-07-18 (supersedes READY FOR HW VERIFICATION).
- **E3 scaffold:** `midiDecode` / factory map / soft takeover (shared, fixture-tested); `MidiEngine` + `MidiStore` dispatch into same deck/mixer actions; minimal MIDI monitor in UI.

---

## 2026-07-18 — Brand mark (for julius)

Replaced all-caps `STENTORDECK` chrome with dual-fader mark + **StentorDeck** / **for julius** (lowercase j). Assets in `brand/`; Windows icon `build/icon.png`; in-app SVG `BrandMark.tsx`.

---

## 2026-07-18 — PFL independent of channel fader + cue soft edges

- PFL no longer forces channel fader to 0 (pre-fader listen; fader always drives master).
- Turning PFL off does not pause the deck.
- Cue hold/jump and play use soft input fades to kill PA clicks.

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

Recorded as: **all correction tools in v1**; **factory Sync buttons remain one-shot BPM SYNC** (not retasked as tap); Prep UI required; Performance-console chrome for tap/½/×2/key is nice-to-have. If the intent was “map tap to Sync by default,” correct this entry and R2.3/R6.6 explicitly.

---

## 2026-07-18 — Initial spec baseline

Full v1 spec set present: README, docs/01–07, epics E1–E7 (under `docs/E*.md`). Product goals, stack lock, epic gating on RMX2 Plan A/B hardware proof.
