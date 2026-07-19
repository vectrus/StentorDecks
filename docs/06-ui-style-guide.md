# 06 — UI style guide

Derived from approved mockups. Governing principle (R7): **readable from 1 meter in a dark room, glanceable in under a second. Size = importance.**

## Palette

| Token | Hex | Use |
|---|---|---|
| `bg-app` | `#0E1115` | app background |
| `bg-well` | `#080A0D` | waveform well |
| `bg-panel` | `#161B22` | deck/mixer/browser panels |
| `bg-panel-2` | `#12161C` | browser/tree panels |
| `bg-raised` | `#262E39` | knobs, tracks, chips |
| `bg-selected` | `#2A3340` | selected browser row |
| `border` | `#313A46` | panel hairlines |
| `border-strong` | `#4A5563` | interactive control borders |
| `text` | `#F4F7FB` | primary text |
| `text-dim` | `#AAB4C2` | labels, secondary |
| `text-faint` | `#8A94A6` | hints, disabled-adjacent |
| `disabled` | `#39424E` / `#6B7787` | empty-deck chrome / text |
| `deckA` | `#FFB454` | amber — configurable (R7.3) |
| `deckB` | `#5BD0FF` | cyan — configurable |
| `vu-ok` | `#57C98A` | VU green |
| `vu-hot` | `#FFB454` | VU amber |
| `vu-clip` | `#FF5D5D` | VU red / rejection flash |

Deck accent is a CSS variable pair (`--deck-a`, `--deck-b`) set from settings; every deck-colored element derives from it, including dark text-on-accent (`#412402` on amber — recompute for custom accents to keep ≥ 7:1 contrast).

## Typography

Sans: Bahnschrift, fallback Segoe UI (Windows-native, DIN-like, condensed variants for labels). Mono (all numerics — BPM, time, key, dB): Consolas. Scale at 100 %:

| Element | Size / weight |
|---|---|
| Deck BPM | 46 px mono, deck accent |
| Time remaining | 24 px mono |
| Key chip | 20 px mono on `bg-raised` |
| Track title (deck) | 16 px / 500 |
| Artist (deck) | 14 px, `text-dim` |
| Browser row | 16 px, row height 42 px |
| Buttons (CUE/SYNC/LOAD/FX) | 15 px, letter-spaced caps |
| Knob/fader labels | 11–12 px caps, `text-dim` |

UI scale (R7.2) multiplies a root `rem`; everything is rem-based. Minimum post-scale interactive text 14 px.

## Layout

**App topbar** — brand, Performance / **Library** (prep mode, R7.4), **MST / CUE / PHN**, Audio, Settings cog, **Help** (**F1**). Dev mode + MIDI monitor live under **Settings → Developer** (not in the topbar). Fullscreen corner control.

**Performance mode** (mockup `01` v2) — **MST / CUE / PHN** knobs in the app topbar (left of Audio). Rows: waveform well / deck A · slim mixer · deck B / library that **fills remaining height** (≥3 × 42 px rows). Library is **two panes** (Djuced-style): narrow **folder tree** left, wide **track list** right (files only — no `[dir]` rows in the list). Browser rows are **draggable** onto a deck’s detail waveform to load (R4.1 / R1.5); drop highlight uses deck accent; playing deck shows clip-color reject. Loaded waveforms are **scrubbable** (drag / click seek; double-click sets cue when paused) — mouse substitute for jog (R2.2 / R1.5).

Deck panel: title/artist + phones PFL; BPM · pitch% · key chip · remaining (EOT → clip color / pulse); overview waveform; pitch strip (zero + cap + soft-takeover ghost); play · CUE · SYNC · **FILTER · AMT · FLANGER · WET** · LOAD (lock + flash toast when playing). Tap/half/double chrome remains Prep / nice-to-have.

Mixer (7 columns L→R): **GAIN A** · blue kill LEDs A · EQ knobs + fader/VU A · centered HI/MID/LOW labels · EQ knobs + fader/VU B · blue kill LEDs B · **GAIN B**. Kill LEDs lit when kill on. Fader cap centered in a lane; VU clear beside it. Master/cue/phones in the app topbar. No crossfader.

**Prep mode** — compact deck strips pinned top (accent left border, play state icon, title, BPM, remaining); below: **two panes** — folder tree (~208 px) left + large **track-only** list right (breadcrumb + search); child crates are opened from the tree, not as list rows. Bottom **correction panel** (not a wrapping button farm): always-visible title/artist + BPM/tap/½/×2/Detect/Camelot (R6.6 / R5.10); segmented **Fix | Loudness** tool rail with primary Preview/Write/Rewrite and quiet Check/Delete/Purge; fixer Fade/Trim/De-click behind **Tune**; phones A/B bar only while preview runs (R5.9). Footer hints for encoder navigation. Operator walkthrough: [`guides/prep-library.md`](./guides/prep-library.md).

## States & feedback

- **Active FX**: pad filled with deck accent at 15 % bg + accent border + accent text; wet amount visible. Loud on purpose (R3.2).
- **Load interlock**: LOAD shows lock icon + faint styling while deck plays. Rejected load → panel border flashes `vu-clip` 2 × 150 ms + toast "Deck A is playing". Ready LOAD on a stopped deck: accent border + accent text.
- **Soft-takeover pickup**: hollow marker (2 px outline, `text` color) at hardware position on the control's track; filled cap = software value; marker disappears on pickup. Same pattern for faders and knobs (knobs: outline tick at hardware angle).
- **Cue (headphone) state**: headphone icon per deck, lit deck-accent when in phones.
- **Sync armed**: SYNC button lit until released.
- **Analysis pending**: `…` in BPM/key cells, `text-faint`; low-confidence values dimmed with `≈` prefix.
- **Session played** (R5.8): after ≥ 30 s cumulative play on a deck, that track’s Prep/Performance row uses `text-faint` / reduced opacity **and** a small `✓` mark before the title (`aria-label` “Played this session”). Selected played rows stay readable (slightly less dim). Settings → Library and Prep footer expose **Clear session played**.
- **Empty deck**: all chrome in `disabled` tones, `---.-` placeholders, LOAD lit.
- **Hardware banners**: controller/audio device lost → single top banner, `vu-clip` accent, auto-dismiss on reconnect.
- **End-of-track warning** (R2.11): time-remaining switches to `vu-clip` at ≤ 30 s; pulses once at 15 s and 10 s (120 ms). Waveform overview trailing region tints per docs/05 rendering contract.
- **Cue marker**: visible on overview + detail waveforms at `cueOffset`.
- **Beat ticks**: dim lines on detail waveform; never thicker/brighter than the playhead.

## Motion

Functional only: 120 ms ease on state changes, 15 ms audio-side ramps have no visual counterpart, VU and waveforms update per rAF. No decorative animation — this is an instrument panel.
