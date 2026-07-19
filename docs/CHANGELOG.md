# Spec changelog

Decisions and material changes to the locked requirements and derived docs.
Newest first. Each entry cites owner sign-off context and R-IDs touched.

---

## 2026-07-19 — Ship 0.2.9: Click & squeak fixer + phones preview / normalize

Library tools since 0.2.8: right-click **Click & squeak fixer…**; **Preview fix** and **Preview normalize** on **headphones only** (never booth/master; not both at once); **Write fixed WAV** (`… (Fixed by SD).wav`) and separate **Write normalized** (`… (Normalized by SD).wav`) toward auto-gain LUFS — originals never overwritten. R5.9, R2.13.

---

## 2026-07-19 — Prep: phones-only fix/normalize preview (R5.9)

Library correction strip + context menu: **Preview fix** and **Preview normalize** play on **headphones only** (never booth/master), mutually exclusive. **Write normalized** writes a sibling `* (Normalized by SD).wav` toward the auto-gain LUFS target — separate from **Write fixed WAV**. Source files still never overwritten. R5.9, R2.13 target LUFS.

---

## 2026-07-19 — Doc screenshots: harmonic + Next up

Regenerated Playwright pack for Library / Settings → Library; added `12-next-up.png`. Manifest website gallery includes Library settings + Next up. E7 / docs.

---

## 2026-07-19 — Library: right-click → click & squeak fixer (R5.9)

Track context menu in Library and Performance browse: **Click & squeak fixer…** selects the track, opens Library correction strip (highlight), runs Check MP3; also Check / Write fixed WAV / Load A·B. Original file still never overwritten.

---

## 2026-07-19 — Ship 0.2.8: Harmonic neighbours + rules Next up

Booth polish since 0.2.7: Settings → Library **Harmonic neighbours first** (soft-ranks Camelot fits when a deck is playing); opt-in **Next up** strip (`ai.mixmatch = rules`) — Camelot + BPM suggestions, human load only; Help shows the same screenshot pack as the website; Controllers & MIDI guide; DJ vs developer docs split. Defaults stay off for new Library options. R5.6, R6.*, R8.2, V2-B.

---

## 2026-07-19 — Harmonic soft-rank + V2-B rules mixmatch

Library setting **Harmonic neighbours first** soft-ranks Camelot band 0 then ±2 when a deck is playing (`playingReferenceKey`). Opened v2 with **Next up** rules shortlist (`ai.mixmatch = rules`) — Camelot + BPM, suggest-only, R4.2 intact. Epic [`V2-B-mixmatch-rules.md`](./V2-B-mixmatch-rules.md). R5.6, R6.*, BACKLOG-v2.

---

## 2026-07-19 — In-app Help shows the same screenshots

Help bundles `docs/screenshots/*.png` (Vite) and renders guide `![…](../screenshots/…)` lines — same pack as the website. Search still ignores image markup. E7 / docs/guides.

---

## 2026-07-19 — Docs split: DJs vs developers

New plain guide [`guides/controllers-and-midi.md`](./guides/controllers-and-midi.md) (Help + website). Operator guides rewritten simpler; tech files `02`/`03`/`04`/`05` open with “DJs skip this”. Website `docs.html` sidebar: **For DJs** / **For developers** (midi-map no longer the DJ entry). Updating guide no longer mixes release-publish steps into booth instructions. E7 / R8.2 / docs.

---

## 2026-07-19 — Website consumes screenshot manifest

`docs/screenshots/manifest.json` gains `website` / `websiteOrder` / `alt` for stentordecks.com. Site homepage + Docs → Screenshots pull the pack from GitHub raw. Broken `07-settings.png` link retired. E7 / docs.

---

## 2026-07-19 — Doc screenshots pack for website (Settings + Help)

Expanded Playwright suite: Help panel + Settings tabs (Faders, Jog, Library, Display, MIDI, Updates); cropped Settings panels; `docs/screenshots/README.md` + `manifest.json` for the marketing site. README embeds Faders / MIDI / Updates. E6 / E7 / R7.4.

---

## 2026-07-19 — README: SmartScreen “unsafe app” workaround

Document More info → Run anyway for unsigned Setup.exe / first launch. Operator note synced in [`guides/updating.md`](./guides/updating.md). E7 / R1.1 packaging.

---

## 2026-07-19 — DIY macOS from-source guide (unsupported)

Owner: no Mac product/installer — document how a willing person can try `npm start` on macOS from git. R1.1 stays Windows-only. Guide: [`guides/run-from-source-macos.md`](./guides/run-from-source-macos.md); README pointer. Not in in-app Help.

---

## 2026-07-19 — Ship 0.2.7: Library mode, multi-controller profiles, live screenshots

Booth polish since 0.2.6: topbar **Prep → Library**; Dev mode + MIDI monitor under Settings → Developer; opt-in MIDI controller profiles (RMX2 factory locked; community FLX4 / Inpulse 500); README screenshots from live Playwright app; MP3 click/squeak notes in README. R7.4, R8.2, docs/04, docs/06.

---

## 2026-07-19 — Multi-controller profiles (RMX2 locked)

Opt-in controller profile packs (Settings → MIDI): factory `rmx2` unchanged; community `pioneer-ddj-flx4` + `hercules-inpulse-500` (unverified, partial). Never auto-apply on hot-plug; Reset always restores RMX2. Deny list in README + [`BACKLOG-multi-controller.md`](./BACKLOG-multi-controller.md). R8.2, docs/04.

---

## 2026-07-19 — Topbar: Library label; Dev/MIDI → Settings

Owner: topbar mode **Prep** renamed **Library** (IPC mode id stays `prep`, R7.4). **E2 Harness** → **Dev mode** and **MIDI monitor** move to Settings → Developer (off the booth topbar). docs/06.

---

## 2026-07-19 — README screenshots from live app (Playwright)

`npm run docs:screenshots` now boots the Vite renderer with mocked IPC (same family as e2e) and writes PNGs to `docs/screenshots/`. HTML under `docs/mockups/` stays as design contract only. README UI section updated. E6 / docs/06.

---

## 2026-07-19 — PHN wiring clarified + wider folder pane

`mixer.phones` is a first-class ControlId (soft takeover / Learn). The RMX2 **physical** phones volume knob is analog and does not send MIDI — it cannot move on-screen PHN; use PHN / Learn, or the Cue-to-Mix knob for **CUE**. Library folder pane widened; thin token scrollbars on tree/lists. R2.8, docs/04, docs/06.

---

## 2026-07-19 — Ship 0.2.6: VU / folder scroll / shared FX AMT

Booth polish since 0.2.5: channel VU peaking tip + red when hot, PFL shows pre-fader levels for gain match; left folder tree scrolls selection into view + sticky folder name; while FLANGER is on, AMT also drives wet (both pads → shared amount). R7.6, R2.8, R5.3, R3.1.

---

## 2026-07-19 — FX: AMT shares flanger wet when FLANGER on (R3.1)

While the flanger pad is on, the filter AMT knob/encoder also drives flanger wet (same 0…1). Both pads on → AMT is filter amount + wetness. Wet still resets to 0 on load; dedicated WET / Shift+FX remains. Owner request. R3.1, docs/03.

---

## 2026-07-19 — VU: peaking tip + PFL pre-fader levels (R7.6 / R2.8)

Channel VU segment math was wrong (green filled 100% in the amber/red zone so peaking never read). Bars now stack green→amber→red per mockup 05; peak-hold tip + red border when > −3 dBFS. With PFL on, meter uses max(pre-fader, post-fader) so gain can be matched with the fader down. Owner request. R7.6, R2.8, docs/03.

---

## 2026-07-19 — Ship 0.2.5: auto-update feed + dual-pane browse

In-app Check for updates found nothing because GitHub only had **prerelease** Setup.exe uploads **without** `latest.yml` (electron-updater’s feed). Publish config now forces a full `release` (tag `v*`); updater accepts prereleases that ship `latest.yml`; clearer Settings error when the feed is missing. Every release publishes `StentorDeck-ReleaseNotes-<version>.txt` next to the Setup.exe (from CHANGELOG). Includes dual-pane browse focus (R5.3). E7 / R1.1.

---

## 2026-07-19 — Browse cluster: dual-pane focus (R5.3)

Up/down navigate the **focused** pane (folder tree or track list). Right expands a collapsed folder or moves focus to tracks; left returns focus to the tree, collapses, or walks to the parent folder — no more “enter first child” / jump to blank Library root. Tree expand state lives in `LibraryStore` so MIDI and mouse share it. Owner clarification of R5.3.

---

## 2026-07-19 — Booth: prevent Windows screen dim

Electron `powerSaveBlocker('prevent-display-sleep')` while StentorDeck is running so Windows does not dim/blank the display after idle minutes mid-gig (or Prep). Cleared on quit. E7.

---

## 2026-07-19 — Library explorer: Djuced-style two panes

Folder tree (narrow, left) + track list (wide, right) in Prep and Performance. File pane is **tracks only** — no `[dir]` rows mixed into the list. (Browse-right/left semantics refined in “dual-pane focus” entry.) R5.2–R5.3, docs/06, mockup 02.

---

## 2026-07-19 — Scanner: OneDrive / cloud placeholders skipped almost everything

Library walk used `dirent.isFile()` / `isDirectory()` only. OneDrive and similar reparse points often report neither, so a folder with ~1000 files indexed as ~2 tracks — no waveforms to analyze. Walk now `statSync`s ambiguous entries. Settings shows real `trackCount`. R5.1–R5.4, docs/05.

---

## 2026-07-19 — Prep: Check MP3 + Write fixed WAV (R5.9)

Owner: Prep tools to inspect bad MP3s and write a **sibling** fixed file — never touch the original. Output is always `* (Fixed by SD).wav` (PCM16; no ffmpeg). Check compares Chromium decode vs Xing/tag; Write runs resilient decode + index + analysis enqueue. R5.9, docs/02, docs/06.

---

## 2026-07-19 — MP3 resilient stitch: seam crossfade (clicks)

Booth library is mostly MP3. Chromium truncate recovery concatenates decode segments; hard abut left ticks at seams (worse on damaged/VBR files). Multi-part concat now trims continuation priming (~576 samples) and overlap-adds ~6 ms (256 samples) per seam — O(seams × fade), no extra decode passes. Clean single-decode MP3s unchanged. R2.1, docs/E2.

---

## 2026-07-19 — Soft takeover: stop re-arming on every MIDI rescan

Channel faders (and other continuous controls) went live after pickup, then “lost connection” because `setConnection(true)` / MIDI `statechange` / audio `rescan` re-armed soft takeover even when the RMX2 port never changed. Re-arm only on real reconnect or port change. R2.7, docs/03.

---

## 2026-07-19 — Session played marks (R5.8)

Owner: mark tracks already played this session — transport play cumulative ≥ 30 s; Prep + Performance rows dim **and** show a `✓`; clear on quit/restart **and** via Clear session played. R5.8, docs/06, E4.

---

## 2026-07-19 — Jog Soft: smoother nudges (rate-led flick)

Skippy Soft nudges came from ~3 ms sticky seeks stacking. Soft flicks are now **rate-led** (stronger temp bend) with tiny flood-compressed sticky seasoning (~0.85 ms, ~4.5 ms impulse cap); seek opens with nudge². Migrate prior Soft 3 ms / 42–90 t/s bundle. R2.2, docs/03, docs/07.

---

## 2026-07-19 — Plan A: refuse 2-ch sink (PFL folded into 1-2)

After `setSinkId`, Plan A only builds the 4-ch merger when the **live** destination reports ≥4 channels. A 2-ch sink with a 4-ch merger was downmixing cue into outs 1-2 (PFL on the PA). Fallback Plan B + banner explains when cue pair 3-4 is unavailable. R1.4, docs/02.

---

## 2026-07-19 — Jog Soft: ride (slow) + chunk nudge (fast)

Owner contract: slow outer rim (&lt;~1 cm/s) **rides** — forward speeds up / phase creeps forward, back slows; faster rim **nudges** a sticky chunk (“push the record”). Message-rate EMA is the rim-speed proxy (tune in Settings). Vinyl dual unchanged. R2.2, docs/03, docs/07.

---

## 2026-07-18 — Jog: kill the slow→fast gear change

RMX2 packs larger |delta| on short fast bursts; we were treating that as higher tick-rate / spin, so steady turns and nudges felt like two gears. Activity EMA counts one tick per MIDI message; single-zone bend is constant per message; spin opens only on sustained message rate (not packed delta); scratch CCs `32`/`33` alias to the turn jogs. R2.2, docs/03, docs/04.

---

## 2026-07-18 — Settings modal + channel fader curve editor

Settings moves from the corner FAB into a header **cog** → central modal (Ctrl+,). **Faders & mixer** section: live curve canvas (mockup 06), Linear/Smooth/Sharp presets, shape slider, link A/B, pitch range/dead-zone, EQ max, auto-gain, crossfader guest enable. Shape/EQ/pitch settings re-apply the graph and re-arm takeovers. DeckGraph default shape uses Smooth (55). E6 §9, R2.5–R2.7, R2.12, docs/03, docs/07.

---

## 2026-07-18 — Jog: Vinyl toggles CDJ nudge vs dual-zone

Playing jog default is **single-zone tempo nudge** (no sticky seek zipper) for smooth phase riding to vinyl. RMX2 **Vinyl** (`0x47` / `mixer.vinyl`) toggles `dualZone`; LED follows. Vinyl ON keeps dual-zone sticky seek + spin. Soft preset = CDJ nudge; migrate prior Soft dual bundles. R2.2, docs/03, docs/04, docs/07. Vinyl note/LED: READY FOR HW VERIFICATION.

---

## 2026-07-18 — Sticky GAIN when auto-gain off

Load no longer zeros trim when `audio.autoGain` is false (or loudness missing). Soft takeover re-arms GAIN only when auto-gain actually rewrote trim. Booth: keep your GAIN through track changes. R2.13 / R3.3, docs/03.

---

## 2026-07-18 — Gig feel: unified frame clock + quieter SYNC assist

Waveform A/B crawl and jog fight came from multi-rAF sampling + assist seeks, not Soft numbers. One rAF ticks transport then draws both decks from latency-compensated `visualPosSec`; detail draw steps ~CSS px; SYNC assist uses rate bias for small errors, throttled micro-seeks, longer jog mute (~800 ms); micro seek fade ~10 ms. R2.2, R2.3, R7.5, E7, docs/03.

---

## 2026-07-18 — FX amount: factory relative AMT + Shift WET

RMX2 FX Mode encoder (`54`/`55`) and Shift+FX (`5C`/`5D`) are factory `ccRel` for filter AMT / flanger WET. Main SQLite load migrates mistaken `cc7` learns so relative decode sticks after restart. R3.1, docs/04.

---

## 2026-07-18 — Playing seek: overlap crossfade (jog zipper)

Cold `stop` + new `AudioBufferSourceNode` on every sticky seek caused zipper clicks; Soft retunes could not fix that. Playing seeks now dual-source ~15 ms gain crossfade; jog flush no longer ducks deck input. R2.2, docs/03.

---

## 2026-07-18 — Jog Soft: revert rate-primary → quiet phase

Rate-primary fine (seek killed on steady turns) felt worse — dead crawl + tempo warble. Soft is seek-primary again: quiet sticky phase, fine rate 0, flood + impulse cap kept; migrate the rate-crawl Soft bundle. R2.2 / R2.3.

---

## 2026-07-18 — FX Mode encoder is relative (filter AMT)

RMX2 FX Mode knobs (`CC 54`/`55`) only send incremental 1/127 — not absolute. Factory map + learn bind them as `ccRel`; filter amount steps from deltas. Soft-migrates prior `cc7` learns on those CCs. R3.1 / R8.1, docs/04.

---

## 2026-07-18 — SYNC: load on master freezes slave

Loading a track into the SYNC master no longer retargets the playing slave to the new analyzed BPM mid-play — slave SYNC clears and pitch stays frozen. R2.3 / R3.3.

---

## 2026-07-18 — Jog heavy-platter + waveform drift

RMX2 ±1 floods made short nudges jump and click (per-tick `seek`). Fine zone now flood-compresses + impulse-caps sticky phase; playing seeks coalesce to one soft-edged seek per rAF. Soft preset quieter again (migrate prior Soft). Detail ticks + SYNC assist use **file-BPM track-time** lattices (not pitched period); `setRate` re-anchors with live `playbackRate` and skips no-op ramps. R2.2, R2.3, R7.5, docs/03, docs/07.

---

## 2026-07-18 — End of track stop→cue (load unblocked)

Natural buffer end cleared transport `playing` without latching offset at duration, so the deck stayed logically playing and load stayed locked until Cue. `onended` now latches EOF; tick always stop→cue (R2.11 / R4.2).

---

## 2026-07-18 — Channel fader softer open (bottom toe)

Channel faders felt too hot in the first throw. Spec curve now eases physical **0..20% → 0..10%** of the shaped domain before the power curve; factory smooth preset **s=55** (was 35); saved `shape: 35` soft-migrates. R2.5, docs/03, docs/07, mockup 06.

---

## 2026-07-18 — RMX2 pitch fader polarity

Hardware pitch felt inverted vs tempo. Factory pitch CC is now MIDI-inverted into logical `pitchPos` (0=slow, 1=fast) so soft-takeover stays in one domain; UI strip unchanged (left slow / right fast). R2.6, docs/04, E3.

---

## 2026-07-18 — App updates: GitHub Releases + UPDATE.bat

Packaged app uses `electron-updater` against GitHub Releases (`npm run release` + Settings → Check for updates / restart). Source trees use `UPDATE.bat` / `npm run update` (refuse dirty tree; `--stash` optional). NSIS `deleteAppDataOnUninstall: false`. Docs: `guides/updating.md`, `DEVELOPMENT.md` release checklist. Replaces GitHub Desktop as the booth update path. E7 / R1.1.

---

## 2026-07-18 — Jog feel: quieter RMX2 defaults

RMX2 relative jogs flood ±1 CCs on a light turn, so prior spin thresholds (~45→130 t/s) opened spinback too early. New Soft defaults: finer seek/rate, spin opens ~120→300 t/s, softer EMA attack; auto-migrate previous factory bundles. Settings sliders widened. R2.2 / R2.3, docs/03, docs/07.

---

## 2026-07-18 — Filter AMT knob unresponsive in Perf

Deck panel `overflow: hidden` could clip the FILTER **AMT** hit target; knobs also lacked pointer-capture / keyboard. Fixed layout (`flex-shrink: 0`, overflow visible) + hardened `PerfKnob` (R3.1 / R1.5, E6).

---

## 2026-07-18 — Splash during slow Desktop / npm start

Desktop shortcut → VBS → `npm start` hid all progress (builds + Vite) before Electron painted. Dev now launches Electron (branded splash) right after main build and waits for Vite with splash up; VBS/INSTALL show a WinForms boot splash until Electron signals ready. E7 / R1.1.

---

## 2026-07-18 — INSTALL.bat stopped before setup (cmd CALL)

`npm -v` without `call` ends `INSTALL.bat` on Windows (`npm` → `npm.cmd`), so setup never ran. Fixed with `call npm -v` / clearer progress line. E7 / R1.1.

---

## 2026-07-18 — Windows icon + Desktop shortcut after install

Packaged `StentorDeck.exe` kept the default Electron icon because `signAndEditExecutable: false` skips builder’s rcedit (and turning it on pulls `winCodeSign`, which fails on Windows without symlink privileges). Fix: `build/icon.ico` (`npm run icons`) + `afterPack` [`scripts/embed-win-icon.cjs`](../scripts/embed-win-icon.cjs) via devDep `rcedit` (justification: only reliable way to embed icon/metadata without winCodeSign). `npm run setup` / INSTALL.bat create a Desktop `.lnk` and prefer packaged exe; boot failures show a dialog. E7 / R1.1.

---

## 2026-07-18 — INSTALL.bat one-shot setup

Root [`INSTALL.bat`](../INSTALL.bat) / `npm run setup` installs deps (Electron ABI), rebuilds native, frees Vite port, and starts the app. `Start StentorDeck.bat` delegates to it. E7 / R1.1.

---

## 2026-07-18 — npm install: bootstrap + ESLint 9

Hard failure on Node 24 / Cursor helper Node (`better-sqlite3` → no host prebuild → node-gyp / unrecognized VS 18). Added `npm run bootstrap` (forces Electron ABI for better-sqlite3), pinned Electron `33.4.11`, `preinstall` check-node guidance, ESLint 9 flat config (drops deprecated eslint@8). Remaining deprecation noise is mostly transitive (electron-builder / npmlog / glob / prebuild-install) — not direct deps. E7 / R1.1.

---

## 2026-07-18 — Packaged app: ship better-sqlite3

`npm run dist` omitted runtime `node_modules` (custom `files` whitelist + workspace-only deps), so the unpacked exe crashed with `Cannot find module 'better-sqlite3'`. Root `dependencies` now include `better-sqlite3`, `chokidar`, `music-metadata`; native `.node` unpacked via `asarUnpack`. E7 / R1.1.

---

## 2026-07-18 — In-app Help (searchable guides)

Topbar **Help** button + **F1** opens a searchable panel fed by `docs/guides/` (get-started, Prep, Performance/mixer, SYNC/jog, soft takeover, audio). Spec-link tails are stripped for operators. E7, docs/06.

---

## 2026-07-18 — README + mockup screenshots refresh

Mockups `01`/`04`/`05` updated to 7-col mixer (GAIN · blue kill LEDs · outside VUs); GAIN off decks. Regenerated `docs/mockups/screenshots/*.png` via `npm run docs:screenshots`. Root README: packaging path, E6/E7 status, booth MST default 30%. R2.4, R2.7, R3.3, docs/06, E6, E7.

---

## 2026-07-18 — MST/CUE/PHN in app topbar

Owner placement: master / cue-mix / phones knobs sit in the shell topbar immediately left of **Audio** (not in the Perf content header), freeing waveform/deck vertical space. docs/06.

---

## 2026-07-18 — Perf deck polish: AMT, EOT, load toast

FILTER **AMT** knob restored (R3.1). Remaining time uses EOT clip color + short pulse at 15/10 s. Load while playing flashes LOAD and shows a dismissible toast (R4.2/R4.3). E6.

---

## 2026-07-18 — Perf UI v2 handoff (header outs + full decks)

Designer handoff applied: **MST / CUE / PHN** knobs in Perf header (library gets height); deck panels gain GAIN, phones PFL, pitch%, key chip, pitch strip + pickup, FILTER/FLANGER/WET/LOAD; mixer slimmed to EQ + faders/VU. Mockup `01` replaced; docs/06 updated. R2.5–R2.8, R3, R4.2, R7.7, E6.

---

## 2026-07-18 — SYNC phase glue + Perf mixer column (E6)

SYNC off now **phase-glues** the release offset (soft assist holds it; jog micro-seeks + retargets; pitch/load clears). Playing jog = sticky seek + short rate nudge; assist muted ~300 ms during jog. Perf mixer: HI/MID/LOW EQ knobs + kill labels, channel faders with green/amber/red VU + soft-takeover ghosts, MASTER / CUE-MIX / PHONES (no crossfader). R2.3, R2.4, R2.7, R7.6, E6 §4, mockup 05.

---

## 2026-07-18 — Radical SYNC: beatgrids + soft phase assist (R2.3)

SYNC no longer assumes beat 1 at 0:00. Analysis writes `beat_grid_offset_sec` (`ANALYSIS_VERSION` **3**, migration `003_beat_grid`); engage snaps onto that grid; while armed, soft phase assist keeps phases glued (deadband + capped seeks); SYNC off freezes pitch and stops assist for Hercules jogs. Visual ticks use the same offset. Missing grid → honest tempo-only status. Spec: R2.3, R7.5, docs/03, docs/05.

---

## 2026-07-18 — Park: Prep library as v2 AI queue surface

Owner note: later examine whether Prep’s library UI can host a Co-pilot / Suggest **queue (playlist)** for AI autoplay. Parked in [`BACKLOG-v2-spotify-ai.md`](./BACKLOG-v2-spotify-ai.md) (design spike before V2-E); ROADMAP + Prep guide FAQ pointed. **Not v1** — disk folders remain crates.

---

## 2026-07-18 — Prep library operator guide

Added plain-language how-to [`docs/guides/prep-library.md`](./guides/prep-library.md) (what Prep’s library is, browse/load/BPM-key fix, Hercules + Performance strip). Linked from root README, `docs/README.md`, docs/05, docs/06. R5.*, R6.6, E4.

---

## 2026-07-18 — SYNC sole-slave + pitch-only follow (R2.3)

Engaging SYNC on A clears B (and vice versa). Tempo follow targets the master's pitch-fader BPM only — partner jog/bend no longer yanks the slave. Press SYNC again freezes pitch for manual Hercules jogs (soft takeover already on the fader). Perf deck panels clip overflow so overview waveforms cannot bleed into the mixer. R2.3, docs/03.

---

## 2026-07-18 — Camelot “fits next” library hints

Prep and Perf browse rows show a faint `~` beside tracks whose Camelot key matches the current mix reference (playing deck preferred, else loaded): same key, ±1 same letter, or relative major/minor. Tooltip explains the relation. Pure Camelot helpers in shared; no auto-sort/filter. R5.*, R6.*, E4/E6.

---

## 2026-07-18 — Perf library fills leftover height

Performance browser was flex-growing but only painted 3 rows (empty panel below). List now measures available height and shows as many 42 px rows as fit (≥3), windowed around the cursor; row type bumped to 17 px. docs/06 updated. R7.1, E4/E6 Perf strip.

---

## 2026-07-18 — SYNC one-shot beat phase snap (R2.3)

Owner change: SYNC still matches tempo and latches for tempo follow, and on **engage** also seeks the synced deck by the shortest delta so playhead beat phases align (0:00-origin grid, same as visual ticks). No continuous phase-lock. Spec updated in R2.3 / R7.5 / docs/03 / docs/05.

---

## 2026-07-18 — E6 Perf detail well + per-deck overview

Performance mode: stacked **scrolling detail** waveforms (±4 s @ 50 pps) under a shared white center playhead with beat ticks + cue; each deck panel hosts the **full-track overview** (click-seek, EOT tint). Minimal deck-accent bars only. R-IDs: R7.5, docs/05 §rendering, docs/06, E6 §2, mockup 01.

---

## 2026-07-18 — PFL is headphones-only (no auto-play)

`togglePfl` no longer soft-starts a stopped deck. PFL only opens/closes the pre-fader headphone tap (R2.8); Play and Cue remain the transport controls. Supersedes the earlier “PFL starts monitor playback” note. R-IDs: R2.8.

---

## 2026-07-18 — Fix Chromium MP3 truncate (~32s of long tracks)

`decodeAudioData` stops at the first bad MPEG frame on some library MP3s (Phenomenon was ~32s of an 8:08 file; file on disk and `<audio>` were fine). Added resilient resume-at-next-sync decode (`decodeMpegResilient`); analysis `ANALYSIS_VERSION` → **2** so idle backfill rewrites short durations/waveforms. Also closed a decode/rebuild TOCTOU via `acquireDecode()`. R-IDs: R2.*, R5.5, E5.

---

## 2026-07-18 — E5 idle backfill + E6 overview waveforms

Analysis supervisor auto-enqueues unanalyzed tracks (`backfill` priority) on a 4 s idle timer and after library rescan. Perf well draws **overview** canvases from `library:waveform` (800× min/max/rms u8): played opacity, cue marker, EOT tint, click-seek; refreshes when analysis commits for the loaded track. Scrolling detail + full deck chrome still TODO. R-IDs: R5.5, R6.*, docs/05 §rendering, E5/E6.

---

## 2026-07-18 — E4 Performance 3-row library strip

Performance mode shell: waveform placeholder well, compact A/mixer/B, **3-row browser** with search + `library:stats` track count + analyzing counter (same LibraryStore cursor as MIDI/Prep). Load A/B + keyboard browse. Full waveforms/deck chrome remain E6. R-IDs: R5.*, docs/06, E4 §6, mockup 01.

---

## 2026-07-18 — Living status rule (§2c)

`.cursorrules` now **requires** agents to update `README.md` roadmap + `docs/ROADMAP.md` + `docs/CHANGELOG.md` in the same change whenever epic progress moves — no waiting for the owner to ask. README refreshed to match E4/E5 DOING state.

---

## 2026-07-18 — E5 analysis pipeline (start)

Hidden analysis BrowserWindow + priority queue; OfflineAudioContext decode; waveform/BPM/key/loudness stages; SQLite commit via `commitAnalysis`. Prep **Detect** enqueues real jobs. Accuracy harness still TODO. R-IDs: R5.5, R6.*, docs/05, E5.

---

## 2026-07-18 — E4 Prep browser UI

Prep mode: deck strips, folder tree, virtualized 42 px browse list (same cursor as MIDI), search, BPM/key correction strip (tap / ½ / ×2 / Camelot / numeric) via `library:updateManual` (R6.6). R-IDs: R5.*, R6.6, docs/06, mockup 02.

---

## 2026-07-18 — E4 root picker (`library:pickRoot`)

Native folder dialog for library roots; Settings **Browse…** + first-run banner when roots empty (auto-rescan after pick). R-IDs: E4 first-run / settings roots.

---

## 2026-07-18 — E4 chokidar library watcher

Debounced (2 s) `chokidar` watch on library roots: add/change → re-index file; unlink → `missing_since`. Restarts when roots change. UI refreshes on `library:progress` watch flush. R-IDs: R5.*, docs/05, E4 watcher AC.

---

## 2026-07-18 — E4 MIDI browse → LibraryStore

RMX2 browse cluster (up/down/left/right) and Load A/B drive `LibraryStore` (real scanned roots/folders/tracks). Fixture `BrowseStore` unwired. Harness shows one shared cursor list. R-IDs: R5.3, E3/E4 browse merge.

---

## 2026-07-18 — E4 library selection + `library:read`

Mouse row selection (library + browse fixture), Load → A/B, double-click load. New IPC `library:read` (id → bytes, root-gated) for deck load from DB. R-IDs: R5.3, R4.2, E4 load pathway.

---

## 2026-07-18 — E4 library foundation (start)

Migration `002_tracks` (tracks + waveforms), partial-hash identity + tag BPM/key validation, one-shot `scanLibraryRoots` (`music-metadata`), `tracksRepo` queries/folder tree/upsert/move/missing, real `library:*` IPC (fixtures retired), `LibraryStore` + settings roots/rescan/sort in temp panel + harness. Watcher, Prep UI next. R-IDs: R5.*, docs/05, E4.

---

## 2026-07-18 — E3 `[HW]` PASS (owner)

Julius verified FX pads (`01`/`02`/`11`/`12`), soft takeover after Sync, OOTB control sweep, and LEDs on the physical RMX2. Sign-off in [`E3-HW-CHECKLIST.md`](./E3-HW-CHECKLIST.md). E3 epic **DONE**. Next: E4 library + E5 analysis. R-IDs: R1.5, R2.7, R8.2, docs/04.

---

## 2026-07-18 — E3 FX pads + Load pending + HW checklist

- ControlIds `filterPad` / `flangerPad`; factory notes from Hercules PDF (`01`/`02` / `11`/`12`); dispatch + LEDs.
- MIDI Load → `BrowseStore.pendingLoad` + harness file picker (until E4 paths).
- Owner checklist [`E3-HW-CHECKLIST.md`](./E3-HW-CHECKLIST.md) — later **PASS** same day (see entry above).

---

## 2026-07-18 — E3 soft takeover raw-space + harness pickup

Takeover compares hardware vs software in raw 0..1 (docs/03): refresh software target while armed (SYNC follow), gain uses `gainKnobFromTrimDb` inverse, UI/load re-arms (MIDI writes skipped). Dev harness shows Soft/Hard/Armed for pitch, gain, faders, master, headMix. R2.7, E3 `[HW]` soft-takeover AC (software ready; owner verifies on RMX2).

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

Julius verified Plan A (dual out + PFL + HeadMix), Plan B (forced dual stereo), and unplug/replug mid-playback on the physical RMX2. Sign-off in [`E2-HW-CHECKLIST.md`](./E2-HW-CHECKLIST.md). E2 epic **DONE**; audio-routing gate cleared. (E3 `[HW]` also PASS same day — see above.) R-IDs: R1.3, R1.4, R2.8, docs/02 failure stance.

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
- ~~PFL on a stopped deck starts monitor playback~~ — **reverted 2026-07-18** (PFL is headphones tap only).
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
| 7 | Beat aids | Visual beat ticks; SYNC engage one-shot phase snap (not continuous lock) | R7.5 / R2.3 |
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
