# SYNC & jog

## SYNC (manual-first)

StentorDeck is built for **manual beatmatching**. SYNC helps, it does not replace ears.

1. Press **SYNC** on the deck you want as the **slave** (the other becomes master).  
2. Tempo follows the master’s **pitch fader** BPM.  
3. One-shot **beatgrid snap**, then soft phase assist while SYNC stays lit.  
4. Press SYNC again to turn it off — **phase glue** holds your offset so the mix doesn’t jump.

Needs a **beatgrid** on both tracks. In Prep: select track → **Detect**, then reload the deck.

Loading a **new track on the master** (the deck you are not SYNC’d on) turns SYNC off on the slave and **keeps the slave’s pitch** — it will not jump to the new track’s BPM mid-play. Press SYNC again when you want to match the new master.

Half/double BPM mistakes are common — use **½ / ×2 / Tap** in Prep first.

Phase math uses each track’s **file BPM** grid (same ticks you see on the detail waveform). Pitch only changes how fast the playhead moves through that grid.

## Jog (RMX2 platter)

The RMX2 jog is a relative MIDI stream (lots of tiny ±1 messages) — not a heavy SL-1200 platter. Soft feel is simulated in software.

Dual-zone feel (Settings → Jog feel). Default is **Soft (heavy platter)**:

| Zone | When | Feel |
|------|------|------|
| **Fine** | Gentle fingertip / short nudge | Tiny sticky phase (impulse-capped) + light temp bend |
| **Spin** | Fast whip | Bigger throw for spinbacks |

A short nudge shares one small phase budget across the MIDI flood (so it does not jump). Slow rotate stays subtle; a real hard twist still opens spin. Playing seeks are applied once per frame to reduce clicks.

Presets: **Soft · Balanced · Spinny**. Changes apply live. Turn **Dual zone** off for fine-only (no spinback boost).

Paused jog seeks through the track; playing jog nudges phase + light temp speed.
