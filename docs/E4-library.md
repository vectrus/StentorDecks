# E4 — Library: scanner, database, browser

Reads: docs/05 (scanner, schema), docs/06 (browser layouts), R5. Depends on E1; runs parallel to E5.

## Scope

1. Migrations for the full docs/05 schema.
2. Scanner in main: initial walk, chokidar watcher (debounced), tag extraction via music-metadata, tag-BPM/key validation and trust rules, identity model with partial hash, move detection, change invalidation, missing/purge lifecycle. Scan progress events.
3. `library:*` IPC per docs/02: folder tree, filtered/sorted track queries, search (whole-library, indexed LIKE, debounced 150 ms), single-track detail.
4. `LibraryStore` (renderer): folder tree state (expand + tree cursor), file-pane cursor, browse-pane focus (`tree` | `files`), search state, sort. RMX2 browse up/down act on the focused pane (R5.3).
5. Browser UI — Prep mode per mockup `prep_mode_folder_browser`: **two panes** — folder tree left (open/closed, active accented), track-only list right; breadcrumb, 42 px rows at 16 px, columns Track / BPM / Key / Time, `…` / `≈`, virtualized list. BPM/key correction strip (R6.6). Session-played (R5.8): dim + `✓`; Clear in Prep footer.
6. Browser UI — Performance mode: same two-pane library (tree + files) filling leftover height (≥3 rows); search + analyzing counter; same session-played marks.
7. First-run library root picker; roots editable in settings; multiple roots merge into one tree with root nodes.
8. Load pathways: double-click and per-deck Load buttons call `DeckStore.load(track)` (interlock behavior from E2 surfaces here as the flash/toast once E6 lands; until then, console-visible rejection is acceptable).

## Acceptance criteria

- Point at a real 2500-track folder tree: initial scan completes with progress feedback; browser is interactive during scan; post-scan cold query of any folder < 50 ms.
- Drop a new MP3 into a watched folder via Explorer → appears in the tree within 5 s, queued state visible. Delete it → row marked missing, hidden from browser.
- Rename/move a file within watched roots → same row, analysis fields intact (verified by id stability), path updated.
- Retag a file's title → change reflected after watcher event; content-change (re-encode) → analysis invalidated and re-queued.
- Tags with valid TBPM/TKEY show immediately with source `tag` and are not queued for analysis.
- Search "voorn" mid-scan returns whole-library results in < 100 ms regardless of open folder; search order is artist then title.
- Default folder listing is filename A→Z; switching sort to BPM persists across restart (`library.sort`).
- Copy the same file into a second watched folder → two rows, same analysis fields after either is analyzed (R5.7).
- Keyboard: arrows move selection in the focused pane; right expands / focuses tracks; left focuses tree / collapses / parent; Enter = load to last-targeted deck — identical to RMX2 browse (shared action layer with E3). R5.3.
- Virtualized list: 5000-row folder scrolls at 60 fps on the reference laptop.
- Session played (R5.8): play a track ≥ 30 s → that row dims and shows `✓` in Prep and Performance; Clear session played removes all marks; relaunch starts clean.
- Prep MP3 fix (R5.9): Check MP3 reports truncate; Write fixed WAV creates only a sibling `* (Fixed by SD).wav`; source MP3 bytes unchanged; new row appears and analyzes.
