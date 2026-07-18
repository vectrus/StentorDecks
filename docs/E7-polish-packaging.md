# E7 — Polish, resilience & packaging

Reads: everything. Depends on E1–E6. This epic turns a working app into one you'd trust in front of a room.

## Scope

1. MIDI monitor panel, full version: live decoded stream, filter by type/control, unknown-message counter, "copy last 50 as fixture" (feeds the E3 test fixtures), reachable from settings.
2. Resilience passes per docs/02 failure stance: scripted fault drills for audio-device loss, MIDI loss, DB corruption, analysis-window crash, settings corruption — each with the specified user-visible behavior and recovery.
3. Performance hardening: 3-hour two-deck soak with FX + background analysis; renderer < 500 MB stable, no rAF long-tasks > 8 ms sustained, no handle leaks (Windows Performance Monitor evidence).
4. Booth safety details: confirm-on-quit while any deck is playing; screen-sleep/display-off inhibited while a deck is playing (powerSaveBlocker); audio continues when window is minimized/unfocused (backgroundThrottling off, verified).
5. Error reporting: rotating local log file (main + renderer), crash dumps to userData, "open logs folder" in settings. No telemetry — offline app.
6. Installer polish: proper icon, version stamping from package.json, per-user install, Desktop + Start Menu shortcuts (no console), branded splash on boot, graceful shutdown on window close (analysis + DB + IPC), upgrade-in-place preserving DB + settings, uninstaller leaves userData unless checkbox.
7. Docs: `MANUAL.md` for the owner (setup, MIDI learn, curve editor, fault behaviors) and `DEVELOPMENT.md` (build, fixture recording, release checklist).
8. Backlog seeding: file issues for the parked v2 items (inputs/mic routing, hotcues, loops, keylock via worklet, recording, gater, crossfader UI, second-screen, split-cue, performance-console tap/half/double chrome, transport session restore after renderer crash) so scope cut in v1 isn't scope forgotten.

## Acceptance criteria

- All five fault drills pass exactly per docs/02, demonstrated in one recorded session.
- Soak test evidence attached; zero audio dropouts logged over 3 h.
- `[HW]` Pull the RMX2's USB mid-set and replug: playback never stops, controller live again ≤ 2 s, all takeovers re-armed.
- Quit attempt while playing prompts; display never sleeps during a 30-min unattended playback; minimized window keeps playing.
- Upgrade install over previous version: library, analysis, mapping, settings all intact (tested with a seeded profile).
- Fresh Windows 11 VM: installer → first-run setup (audio, roots) → analyzing → playable, no manual steps outside the app.
- Manual verified by the owner performing MIDI learn + a curve change using only `MANUAL.md`.
