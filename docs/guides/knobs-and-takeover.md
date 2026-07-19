# Knobs, faders & soft takeover

![Settings — Faders & mixer](../screenshots/06-settings-faders-mixer.png)

Hardware knobs and software values can disagree (you moved UI, or loaded a track that reset FX).

**Soft takeover** protects the PA: the physical control stays “dead” until it **crosses** the software value (or lands within a tiny deadband). Then it snaps live.

## What you’ll see

A hollow **pickup** mark on the control = hardware position.  
Filled cap / pointer = software value.  
Move the hardware through the software point → mark disappears → you’re live.

## After loading a track

- **Pitch & EQ** stay live if they already were (no full relearn).  
- **Filter / wet** follow the last known hardware position (FX pads still turn off).  
- **Gain** needs a quick pickup only when **auto-gain** rewrote trim on load. With auto-gain off, GAIN stays sticky and live.

You should not have to re-match every knob on every load.
