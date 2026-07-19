# End-user guides (for DJs)

Plain language. These files power the in-app **Help** panel (searchable) and the website **For DJs** section.

Write like the reader is busy, tired, and twelve years old in a good way: short sentences, no hex, no R-IDs in the body. Put engineer links only under a final **Spec links** heading (Help strips that section).

Screenshots: use `![caption](../screenshots/<file>.png)` from the Playwright pack. Same files show in **in-app Help**, the website, and README — regenerate with `npm run docs:screenshots`.

| File | Topic |
|------|--------|
| [`get-started.md`](./get-started.md) | First boot, two screens, master volume |
| [`controllers-and-midi.md`](./controllers-and-midi.md) | RMX2, other controllers, Learn |
| [`prep-library.md`](./prep-library.md) | Library mode, BPM/key, harmonic boost, Next up |
| [`performance-and-mixer.md`](./performance-and-mixer.md) | Performance layout & mixer |
| [`sync-and-jog.md`](./sync-and-jog.md) | SYNC, jog feel |
| [`knobs-and-takeover.md`](./knobs-and-takeover.md) | Soft takeover after UI/load |
| [`audio-and-volume.md`](./audio-and-volume.md) | Outputs, gain staging, phones |
| [`updating.md`](./updating.md) | Check for updates · SmartScreen |
| [`run-from-source-macos.md`](./run-from-source-macos.md) | **Not in Help** — DIY macOS (unsupported); website **Other platforms** |

Engineer specs stay in `docs/01`–`07` and epics — website **For developers** only. Never list them as DJ Help topics.
