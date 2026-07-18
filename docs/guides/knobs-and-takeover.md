# Knobs, faders & soft takeover

Hardware knobs and software values can disagree (you moved UI, or loaded a track that reset FX).

**Soft takeover** protects the PA: the physical control stays “dead” until it **crosses** the software value (or lands within a tiny deadband). Then it snaps live.

## What you’ll see

A hollow **pickup** mark on the control = hardware position.  
Filled cap / pointer = software value.  
Move the hardware through the software point → mark disappears → you’re live.

## After loading a track

- **Pitch & EQ** stay live if they already were (no full relearn).  
- **Filter / wet** follow the last known hardware position (FX pads still turn off).  
- **Gain** may need a quick pickup after auto-gain on the new track.

You should not have to re-match every knob on every load.
