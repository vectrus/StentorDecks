# Prep library — how to use it (simple guide)

This page is for **you**, the DJ — not for programmers.  
It explains what the **Prep** screen’s music library is, and how to use it.

---

## What is Prep?

StentorDeck has two big screens at the top:

| Button | What it’s for |
|--------|----------------|
| **Performance** | Mixing live: waveforms, faders, play / cue / sync. |
| **Prep** | Getting your music ready: find tracks, fix BPM & key, load decks. |

Think of it like this:

- **Prep** = the back room where you sort records  
- **Performance** = the booth where you play them  

Your music folders are the “crates.” The app does **not** invent playlists — what’s on your disk is what you see.

---

## What is “the library”?

The library is a **list of your songs** that the app has looked at on your computer.

When you pick a music folder, StentorDeck:

1. Looks through that folder (and folders inside it)  
2. Remembers each song (title, artist, length, BPM, key when known)  
3. Shows them in Prep so you can browse and load  

Supported files: **MP3**, **FLAC**, **WAV**.

The app **never moves, renames, or deletes** your music files. It only reads them.

---

## First time: add your music folder

If you haven’t added music yet:

1. Look for a message like **“Choose a music folder…”** or open **Settings** (gear / settings drawer).  
2. Click **Browse…** and pick the folder where your DJ tracks live.  
3. Wait for a **rescan** — the app indexes the files.  

You can add more folders later and press **Rescan** if something new doesn’t show up.  
(If you drop new files into a watched folder, the app often notices by itself after a short wait.)

---

## The Prep screen — what each part does

```
┌──────────── Deck A ────────────┐  ┌──────────── Deck B ────────────┐
│  What’s loaded on A (BPM, time) │  │  What’s loaded on B             │
└─────────────────────────────────┘  └─────────────────────────────────┘

┌─ Folders ─┐  ┌──────── Song list ──────────────────────────────┐
│  Library  │  │  Search: [ artist / title… ]                    │
│  MyTunes  │  │  Track          BPM     Key     Time            │
│   techno  │  │  Artist — Title  128     8A      5:32           │
│   house   │  │  …                                              │
└───────────┘  │                                                 │
               │  BPM / Tap / ½ / ×2 / Detect / Camelot  ← fix   │
               └─────────────────────────────────────────────────┘
```

### Top: Deck A and Deck B strips

Tiny status for each deck: song name, BPM, time left, playing or not.  
This is so you can see what’s loaded while you dig through folders.

### Left: folder tree (small pane)

- Click a folder to show **its tracks** in the big pane on the right (Djuced-style).  
- Expand / collapse with the arrows.  
- **Library** clears the selection (empty file pane until you pick a crate).  
- Subfolders are opened here — they do **not** appear as `[dir]` rows in the track list.

**Tip:** Your real folders on disk = your crates. Keep sets organized on the hard drive the way you want to browse them.

### Right: song list (large pane)

Tracks only for the folder you selected on the left (or whole-library search results).

Columns:

| Column | Meaning |
|--------|---------|
| **Track** | Artist and title (or the file name if tags are empty) |
| **BPM** | Beats per minute — how fast the song is |
| **Key** | Musical key in **Camelot** form (like `8A` or `9B`) — used for mixing in key |
| **Time** | How long the track is |

- Rows that say **`[dir]`** are **folders**, not songs.  
- **`…`** means “not known yet” (often still analyzing).  
- **`≈`** before BPM means “we’re not very sure” — check it with Tap / Detect if Sync feels wrong.  
- A faint **`~`** next to the key means “this song could fit after the one you’re playing / have loaded” (same key, neighbour on the Camelot wheel, or relative major/minor). Hover for a short tip. It does **not** auto-sort the list.
- A dimmed row with a **`✓`** means you already **played** that track this session (Play on for at least half a minute). Cleared when you quit the app, or with **Clear session played** (Prep footer or Settings → Library).

### Search box

Type an artist or title.  
Search looks through **your whole library**, not only the open folder.  
Clear the search (or go “back”) to return to normal folder browsing.

### Bottom strip: fix BPM and key

Select a **track** (not a folder). Then you can:

| Control | What it does |
|---------|----------------|
| **BPM** box | Type the correct number, press Enter |
| **Tap** | Tap along with the beat (at least 4 taps). Then **Apply tap** to save |
| **½** / **×2** | If the number is double or half of the real tempo (very common), fix it in one click |
| **Detect** | Ask the app to re-analyze that song (BPM, key, **beatgrid**, waveform, loudness). Good SYNC needs a beatgrid — run Detect if Sync says “no beatgrid”. |
| **Check MP3** | See if Chromium truncates this MP3 (short decode vs real length). |
| **Write fixed WAV** | Makes a **new** file next to it named `… (Fixed by SD).wav`. The original MP3 is **never** changed. Use the Fixed file on the decks. |
| **Camelot** | Pick the key yourself (`8A`, `9B`, …) or clear it with `—` |

Your fixes are remembered. You don’t have to do them again next time.

---

## How to load a song onto a deck

1. Click a **track** so it’s selected (highlighted).  
2. Load it:

| How | Loads to |
|-----|----------|
| **Double-click** the track | Deck **A** |
| **Enter** on the keyboard | Deck **A** |
| RMX2 **Load** button for deck A or B | That deck |
| In **Performance**, the **Load A** / **Load B** buttons | That deck |

Prep itself focuses on browsing + fixing; Load B from the mouse is easiest in Performance (or use the Hercules Load buttons).

### Important rules (so nothing explodes mid-set)

- You **cannot** load into a deck that is **already playing**. Pause it first.  
- You **cannot** load a folder — only a track.  
- If the file is missing or broken, load fails and you’ll see a short error at the bottom.

Loading a new track **resets** that deck’s FX, filter, sync, cue, etc. — always a clean start.

---

## Keyboard & Hercules (same library!)

Mouse, keyboard, and the RMX2 all move the **same** highlight. Click a pane (folders or tracks) to focus it; ↑/↓ then move in that pane.

**Keyboard / Hercules browse cluster:**

- ↑ / ↓ — move selection in the focused pane (folder tree or track list)  
- → — expand a collapsed folder, or move focus to the track list  
- ← — focus the folder tree, collapse, or move to the parent folder (does not jump to blank Library)  
- Enter — load selected track to **A** (keyboard)  
- Load A / Load B — load the selected track (RMX2)  

So: dig in Prep with the mouse, then keep browsing from the controller in Performance without losing your place.

---

## A simple prep workflow

1. Open **Prep**.  
2. Open tonight’s folder (or search for a tune).  
3. Check **BPM** and **Key**. Fix weird ones with Tap / ½ / ×2 / Camelot / Detect.  
4. Load song into **A** (paused). Cue it.  
5. Find the next track that looks good (watch for the `~` key hint if you care about harmonic mixes).  
6. Switch to **Performance** when you’re ready to mix.  
7. Use the small library strip there — same list, same cursor — to load **B** while A plays.

---

## Prep vs Performance library (same brain)

| | Prep | Performance |
|--|------|-------------|
| List size | Big — easy to read and fix | Smaller strip under the decks |
| Fix BPM / key | Yes (full strip) | No full strip (yet) |
| Load buttons on screen | Mostly keyboard / controller / double-click → A | **Load A** and **Load B** |
| Folder tree | Yes | No (search + list; open folders from Prep or MIDI) |

One library. Two views. Don’t think of them as two different collections.

---

## Quick FAQ

**Why is BPM empty or `…`?**  
The file has no tag yet, or analysis hasn’t finished. Select the track → **Detect**, or wait while the app analyzes in the background.

**Why does Sync sound wrong?**  
Often the BPM is half or double — try **½** / **×2** / **Tap**. Or the track has no **beatgrid** yet — press **Detect**, wait, reload the deck, then SYNC again. SYNC snaps and holds phase while lit; turn SYNC off and the app **keeps your offset** (phase glue) until you jog again, move pitch, or load.

**What does Camelot mean?**  
A DJ-friendly code for musical key. Nearby numbers (and A↔B with the same number) usually mix nicer. The `~` mark is a gentle hint, not a rule.

**Can I make playlists inside the app?**  
Not in v1. Use folders on your disk.  
*(Later idea — parked for v2: maybe reuse this Prep list as a “next songs” queue when AI Co-pilot helps pick tracks. See [`../BACKLOG-v2-spotify-ai.md`](../BACKLOG-v2-spotify-ai.md) § Prep library as queue.)*

**Does the library in Prep delete files?**  
No. Never.

---

## Spec links (for agents / deep detail)

Operator guide ends here. Technical detail lives in:

- Requirements: R5.* (library), R6.6 (corrections), R4.2 (no load while playing) — [`../01-requirements.md`](../01-requirements.md)  
- Scanner / analysis: [`../05-library-and-analysis.md`](../05-library-and-analysis.md)  
- Prep layout: [`../06-ui-style-guide.md`](../06-ui-style-guide.md), mockup [`../mockups/02-prep-mode.html`](../mockups/02-prep-mode.html)
