# Mockups

Self-contained HTML files — open directly in a browser. These are the **design contract** referenced by `docs/06-ui-style-guide.md` and epic E6. Where a mockup and docs/06 disagree on a token value, docs/06 wins; where docs/06 is silent on layout/composition, the mockup wins.

| File | Shows | Authority |
|---|---|---|
| `01-performance-mode.html` | Performance **v2**: well, decks (phones, BPM·%·key·rem, overview, pitch strip, FX/WET/LOAD), **7-col mixer** (GAIN·LEDs·EQ/fader·labels·…), MST/CUE/PHN in header, flex library | **Authoritative** for Performance mode layout |
| `02-prep-mode.html` | Compact deck strips, folder tree, breadcrumb, large browser | **Authoritative** for Prep mode layout |
| `03-audio-setup.html` | First-run/settings audio routing screen incl. disabled inputs section | **Authoritative** for the setup screen |
| `04-deck-panel-states.html` | Deck A playing + PFL + FILTER/AMT + LOAD locked, vs. Deck B empty + LOAD ready (GAIN in mixer, not on deck) | **Authoritative** for state styling (R3.2, R4.3, empty deck) |
| `05-mixer-column.html` | 7-col mixer detail: GAIN, blue kill LEDs, EQ, outside VUs, soft-takeover ghost | **Authoritative** for mixer column |
| `06-fader-curve-editor.html` | Interactive curve editor (presets, shape slider, live dB) — functional demo | **Authoritative** for the settings curve editor |

Design history (superseded iterations are *not* included, deliberately): an earlier small-type draft and a crossfader-bearing mixer existed; both were rejected by the owner. The composite in `01` reflects final decisions: no crossfader (R2.4), **GAIN in the mixer** (not on decks), blue kill LEDs (not red strikethrough), FX row = **FILTER pad · AMT knob · FLANGER pad · WET knob** (R3.1), LOAD interlock states, large-type accessibility floors (R7.1).

Not mocked (implement from docs/06 §States + these components): soft-takeover pickup markers (hollow outline at hardware position — shown once in `05`), rejection flash/toast, banners, MIDI-learn overlay, settings panels beyond the curve editor, 125/150 % scale variants (rem-driven, same layout), beat ticks / cue markers / EOT tint on waveforms (docs/05 + docs/06).

Icons load from the Tabler webfont CDN; offline they degrade to blank squares — irrelevant to the contract.

## Screenshots

Canonical PNGs live in [`screenshots/`](./screenshots/). Regenerate after mockup edits:

```bash
npm run docs:screenshots
```

See [`../playwright/README.md`](../playwright/README.md) and `.cursorrules` §2b.
