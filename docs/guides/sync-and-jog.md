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

The RMX2 jog is a relative MIDI stream (lots of tiny ±1 messages) — not a heavy SL-1200 platter. Feel is simulated in software. Short nudges often send **packed** deltas (bigger than ±1); those are **not** treated as a second high-speed gear.

**Vinyl button** (or Settings → Dual zone) switches modes:

| Mode | Vinyl LED | Playing feel |
|------|-----------|--------------|
| **Single-zone** (default Soft) | Off | Smooth **tempo nudge** — same bend per MIDI message while you turn; no sticky seeks (CDJ-style phase ride) |
| **Dual-zone** | On | Sticky **phase** seek on light turns + **spin** only on a sustained fast whip |

Paused jog always seeks through the track (scrub).

Presets: **Soft (CDJ nudge) · Balanced (Vinyl dual) · Spinny**. Changes apply live. Fine rate bend is the main Soft control; fine seek matters when Vinyl / dual-zone is on.
