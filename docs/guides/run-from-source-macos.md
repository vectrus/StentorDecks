# Run from source on macOS (unsupported / DIY)

StentorDeck’s **supported product** is Windows + Hercules DJConsole RMX2
([R1.1](../01-requirements.md)). There is **no** official Mac installer, no
notarized `.dmg`, and no promise that Plan A audio or RMX2 LEDs work on macOS.

If you have a Mac and want to **try the source yourself**, this page is for you.
You are on your own for Gatekeeper, drivers, and audio routing. Pull requests
that improve Mac ergonomics are welcome **only if they do not regress the
Windows RMX2 booth path**.

## What you need

- A Mac (Apple Silicon or Intel)
- [Node.js 22 LTS](https://nodejs.org) (not random Homebrew Node 24 if rebuilds fail)
- Xcode Command Line Tools (`xcode-select --install`) — needed to rebuild `better-sqlite3`
- Git clone of this repo
- Optional: RMX2 or another class-compliant MIDI controller; any Core Audio outputs

## Get it running

```bash
cd /path/to/StentorDecks
npm install
npm run rebuild:native    # Electron ABI for better-sqlite3
npm start                 # or: npm run dev
```

`INSTALL.bat` / `Start StentorDeck.bat` are Windows-only — ignore them on Mac.

Windowed by default in dev (`STENTOR_WINDOWED=1`). Fullscreen: `STENTOR_WINDOWED=0 npm start`.

## First boot (same as Windows)

1. **Audio** — pick master (PA) and cue (headphones). Prefer a real device, not “Default”.
2. **Settings → Library** — add a music folder → **Rescan**.
3. Plug MIDI — top bar should show a port name when connected.
4. Load a track (Library or Performance), keep **MST** low (boots ~30%).

MIDI Learn and optional **Settings → MIDI** community profiles work the same as on Windows. Factory default remains the RMX2 map; Reset always restores that.

## Expect rough edges

| Area | Likely reality on Mac |
|------|------------------------|
| **Plan A (4-ch RMX2)** | Often unavailable — Core Audio / Chromium may only expose stereo sinks. Use **Plan B** (separate master + cue devices) or accept cue folded into the master device. |
| **RMX2 LEDs** | May not light; Hercules LED echo is Windows/HW-verified. Turn off **Send LED feedback** if it misbehaves. |
| **Latency** | Core Audio is usually fine for DJ use; don’t expect WASAPI-identical numbers. |
| **Packaging** | `npm run dist` builds a **Windows NSIS** Setup.exe. Do not expect a Mac app from that script. |
| **Auto-update** | GitHub Releases ship Windows artifacts only. |

If something crashes, check the terminal output. Native rebuild failures are almost always Node version / missing CLT — use Node 22 and re-run `npm run rebuild:native`.

## Controllers that aren’t RMX2

See [Controllers (RMX2 locked)](../../README.md#controllers-rmx2-locked) in the root README and [`../BACKLOG-multi-controller.md`](../BACKLOG-multi-controller.md). Learn or apply a community profile; never expect auto-detect to swap the factory map.

## What we are not doing (yet)

- Official macOS installer / notarization  
- Changing R1.1 or making Mac a supported booth platform  
- Softening MIDI decode / soft-takeover rules “for Mac”  

If you get a clean Plan B booth on Mac and want to document what worked, open an issue or PR against this guide — keep Windows RMX2 as the default story.

## Spec links

- Requirements (Windows-only product): [`../01-requirements.md`](../01-requirements.md) R1.1  
- Audio routing Plans A/B: [`../02-architecture.md`](../02-architecture.md), [`audio-and-volume.md`](./audio-and-volume.md)  
- MIDI factory map: [`../04-midi-map.md`](../04-midi-map.md)  
