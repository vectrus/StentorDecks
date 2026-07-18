# E4 — Library: scanner, database, browser

Reads: docs/05 (scanner, schema), docs/06 (browser layouts), R5. Depends on E1; runs parallel to E5.

## Scope

1. Migrations for the full docs/05 schema.
2. Scanner in main: initial walk, chokidar watcher (debounced), tag extraction via music-metadata, tag-BPM/key validation and trust rules, identity model with partial hash, move detection, change invalidation, missing/purge lifecycle. Scan progress events.
3. `library:*` IPC per docs/02: folder tree, filtered/sorted track queries, search (whole-library, indexed LIKE, debounced 150 ms), single-track detail.
4. `LibraryStore` (renderer): folder tree state, selection model (row cursor as the single selection the RMX2 browse cluster and load buttons act on), search state, sort.
5. Browser UI — Prep mode per mockup `prep_mode_folder_browser`: folder tree (open/closed, active folder accented), breadcrumb, 42 px rows at 16 px, columns Track (artist — title) / BPM / Key / Time, `…` placeholders, `≈` low-confidence dimming, virtualized list (5000 rows smooth). BPM/key correction strip (tap, ½, ×2, key picker) writing `manual` sources (R6.6).
6. Browser UI — Performance mode: the 3-row strip with search summary line and analyzing counter.
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
- Keyboard: arrows move cursor, right/left enter/parent folder, Enter = load to last-targeted deck — identical semantics to the RMX2 browse cluster (shared action layer with E3).
- Virtualized list: 5000-row folder scrolls at 60 fps on the reference laptop.
