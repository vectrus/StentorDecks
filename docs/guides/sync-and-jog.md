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

The RMX2 jog is a relative MIDI stream — not a heavy SL-1200. Soft feel is simulated from **rim speed** (message rate).

**Soft / Vinyl OFF** (default):

| Rim speed | Feel |
|-----------|------|
| **Slow** (~&lt;1 cm/s on the outer edge) | **Ride** — forward speeds the track up a bit (phase creeps forward); back slows it (phase the other way) |
| **Faster** (a deliberate push / flick) | **Nudge chunk** — sticky push of the record by a small amount |

When you stop turning, tempo returns to the pitch fader; the phase offset you rode or nudged **stays**.

**Vinyl ON** (button / dual-zone): fine sticky phase + spinback on a hard whip.

Presets in Settings: **Soft (ride + chunk) · Balanced · Spinny**. If chunks come too early/late, tune **Chunk starts at** / **Full chunk at** (msg/s proxy for rim speed on your RMX2).

Paused jog always scrubs through the track.
