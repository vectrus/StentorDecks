# Updating the app

For DJs who installed StentorDeck with the **Setup.exe** (normal booth install).

![Settings — Updates](../screenshots/11-settings-updates.png)

## How to update (installed app)

1. Open **Settings → Updates**.  
2. Click **Check for updates** (or wait a few seconds after launch).  
3. When a download finishes → **Restart & update**.  
4. If a deck is playing, the app asks before it restarts.

Your music library, settings, and MIDI map stay on the computer. They are **not** wiped by an update.

### Or install by hand

Download the new `StentorDeck-Setup-….exe` from the website / GitHub Releases and run it over the old install.

## Windows says the app is unsafe

Builds are not code-signed yet. That warning is expected.

1. Click **More info**.  
2. Click **Run anyway**.

If the **browser** blocked the download: Keep → Show more → Keep anyway.  
Do **not** turn off SmartScreen or Defender.

## What not to do

- Don’t delete AppData folders to “fix” an update — that can wipe your library.  
- Don’t expect GitHub Desktop or a source folder update to change the installed `.exe`. The booth app only updates via Releases / Setup.exe.

## Running from source? (developers)

If you use `npm start` / `INSTALL.bat` instead of the installer, use `UPDATE.bat` in the repo — not the in-app updater. Details: [`../DEVELOPMENT.md`](../DEVELOPMENT.md).

## Spec links

Operator guide ends here. How releases are published: [`../DEVELOPMENT.md`](../DEVELOPMENT.md).
