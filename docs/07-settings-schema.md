# 07 — Settings schema

Stored as `settings.json` in `app.getPath('userData')`, written atomically (temp + rename), validated with zod on load; invalid file → back up aside, use defaults, notify. Values below are the defaults.

```jsonc
{
  "version": 1,

  "audio": {
    "masterDevice": null,          // WASAPI device id; null = show setup screen
    "masterChannels": [0, 1],
    "cueDevice": null,
    "cueChannels": [2, 3],
    "routingPlan": "auto",         // "auto" | "A" | "B" (auto = probe, see docs/02)
    "bufferHintMs": 23,            // maps to AudioContext latencyHint
    "brakeOnStop": false,
    "brakeMs": 400,
    "autoGain": true,              // R2.13 — apply analysis loudness → trim on load
    "autoGainTargetLufs": -14,
    "inputs": { "enabled": false } // reserved; devices enumerated + displayed only (R1.4)
  },

  "mixer": {
    "crossfader": { "enabled": false },              // R2.4 — default OFF
    "channelFaders": {
      "linked": true,
      "a": { "shape": 55 },                          // -100..100, see docs/03 (bottom toe + curve)
      "b": { "shape": 55 }
    },
    "pitchFaders": {
      "range": 0.08,                                 // 0.08 = ±8 % | 0.16 = ±16 % (R2.6)
      "centerDeadZone": 0.04                         // 0..0.10
    },
    "eq": {
      "maxDb": 12                                    // settable; default ±12 dB (R2.12)
    },
    "jog": {                                         // R2.2 dual-zone feel — live in Settings
      "dualZone": true,                              // false = fine-only (no spinback boost)
      "fineSeekMs": 0.08,                            // base phase ms/tick (impulse-capped in engine)
      "spinSeekMs": 12,                              // phase ms/tick at full spin
      "fineRatePercent": 0.02,                       // temp rate bend % (fine)
      "spinRatePercent": 4,                          // temp rate bend % (spin)
      "rateDecayMs": 280,                            // how long temp rate holds
      "pausedFineSeekMs": 1,                         // stopped scrub (fine)
      "pausedSpinSeekMs": 12,                        // stopped scrub (spin)
      "spinStartsAtTps": 140,                        // above light RMX2 ±1 flood
      "spinFullAtTps": 320                           // tick-rate EMA for full spin
    }
  },

  "fx": {
    "flanger": { "rateHz": 0.25, "depthMs": 1.5, "feedback": 0.5 }
  },

  "library": {
    "roots": [],                                     // absolute paths; ≥1 required after setup
    "purgeMissingAfterDays": 30,
    "sort": "filename"                               // filename | artist | title | bpm | key | duration (R5.6)
  },

  "ui": {
    "scale": 100,                                    // 100 | 125 | 150
    "deckAColor": "#FFB454",
    "deckBColor": "#5BD0FF",
    "startInFullscreen": true,
    "startMode": "performance",                      // "performance" | "prep"
    "showBeatTicks": true,                           // R7.5
    "endOfTrackWarnSec": [30, 15, 10]                // R2.11
  },

  "midi": {
    "preferredPort": null,                           // substring match; null = auto ("RMX")
    "sendLeds": true
  }
}
```

Rules:
- Every setting change is applied live (no restart), through `SettingsStore` reactions; audio device/plan changes rebuild the graph per docs/02.
- Any software-side value change caused by a settings change re-arms soft takeover on affected controls (including pitch-range and eq.maxDb changes).
- First run (`masterDevice === null` or `roots` empty) opens the Audio setup screen, then the library root picker, before entering Performance mode.
- The MIDI mapping itself lives in SQLite (docs/04), not here — settings hold only port preference and LED toggle.
- Split-cue (R2.8 nice-to-have) is not represented until that backlog item is promoted.
