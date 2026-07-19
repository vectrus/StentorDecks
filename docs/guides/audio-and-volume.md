# Audio routing & volume

## Plan A vs Plan B

| Plan | Meaning |
|------|---------|
| **A** | One 4-channel device (RMX2): channels 1–2 master, 3–4 headphones |
| **B** | Separate master and cue devices (or 2-channel fallback) |

Open **Audio** in the top bar to change devices. The active plan is shown in the top bar.

## Levels — a simple gain stack

1. **Track trim (GAIN)** — match loudness between songs (auto-gain helps on load).  
2. **EQ** — cut more than boost when possible.  
3. **Channel fader** — blend in the mix.  
4. **MST** — booth level (default **30%**).  

If the PA is hot, turn **MST** down first — don’t bury everything in EQ kills.

## Headphones

- Per-deck **PFL** (headphone icon) sends that deck to the cue bus.  
- With PFL on, that deck’s **VU** shows pre-fader level (gain/EQ) even if the channel fader is down — use it to match volumes before you open the fader.  
- VU **red / peak tip** means you’re peaking (above about −3 dBFS).  
- **CUE** — RMX2 **Cue to Mix** (MIDI). Blends PFL cue vs master in the phones bus.  
- **PHN** — software cue-bus level after that blend. The RMX2’s physical **phones volume** knob is analog (no MIDI), so it will not move the on-screen PHN; use PHN in the top bar, or Learn a spare knob.  
- Default head-mix leans **cue-only** so PFL isn’t drowned by the master bus.
