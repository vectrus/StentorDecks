# 05 — Library & analysis

## Scanner (main process)

- Watched roots configured in settings (≥1). Initial scan walks each root; `chokidar` watches thereafter (add/change/unlink, debounced 2 s).
- Accepted extensions: `.mp3 .flac .wav`. Everything else ignored silently.
- Tags via `music-metadata`: title, artist, album, genre, duration; `TBPM`/`BPM` and `TKEY`/`KEY`/`initialkey` honored per R6.1/R6.2 (validated: BPM 60–220, key parseable → stored with source `tag`).
- Identity: `(path, size, mtime)` fast key + `partial_hash` = SHA-1 of first 256 KiB + last 64 KiB + size. Path changed but hash matches an orphaned row → **move**: update path, keep analysis. New hash → new track, enqueue analysis. Hash mismatch on same path → content changed: invalidate analysis, re-enqueue.
- **Duplicates (R5.7):** two live paths with the same `partial_hash` → two `tracks` rows. On commit of analysis for either row, copy BPM/key/loudness/waveform to all other live rows with that hash (or store analysis keyed by hash — implementation choice, same observable behavior). Never hide a path from its folder.
- Deletions: row marked `missing_since`; purged after 30 days (protects analysis across temporarily unplugged drives).

### Sort (R5.6)

- Folder query default: `ORDER BY filename COLLATE NOCASE ASC` (basename of `path`).
- Alternate sorts (UI + settings `library.sort`): `artist`, `title`, `bpm`, `key_camelot`, `duration_ms` (each ASC; nulls last).
- Search query default: `artist COLLATE NOCASE, title COLLATE NOCASE`.

## SQLite schema

```sql
CREATE TABLE tracks (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE, folder TEXT NOT NULL,
  size INTEGER NOT NULL, mtime INTEGER NOT NULL, partial_hash TEXT NOT NULL,
  title TEXT, artist TEXT, album TEXT, genre TEXT, duration_ms INTEGER,
  bpm REAL, bpm_source TEXT CHECK(bpm_source IN ('tag','analysis','manual')),
  key_camelot TEXT, key_name TEXT, key_source TEXT,
  loudness_lufs REAL,           -- integrated loudness for auto-gain (R2.13 / R6.5)
  peak_db REAL,                 -- true peak estimate; informational + clamp guard
  analyzed_at INTEGER, analysis_version INTEGER,
  missing_since INTEGER
);
CREATE INDEX idx_tracks_folder ON tracks(folder);
CREATE INDEX idx_tracks_hash   ON tracks(partial_hash);

CREATE TABLE waveforms (
  track_id INTEGER PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  overview BLOB NOT NULL,     -- 800 px × (min,max,rms) u8 triplets
  detail   BLOB NOT NULL,     -- 50 peaks/sec × (min,max,rms) u8 triplets
  detail_pps INTEGER NOT NULL DEFAULT 50
);

CREATE TABLE midi_map  (control_id TEXT PRIMARY KEY, binding TEXT NOT NULL);   -- JSON Binding
CREATE TABLE kv        (key TEXT PRIMARY KEY, value TEXT NOT NULL);            -- schema_version etc.
```

`analysis_version` lets improved algorithms trigger selective re-analysis later. FTS not needed at ≤5000 rows: search = indexed `LIKE` over artist/title/path, debounced 150 ms, always whole-library (R5.2).

## Analysis pipeline (hidden renderer)

Queue in main (priority: deck-load requests > newly added > backfill), one job at a time. Stages per track:

1. **Decode** file → `OfflineAudioContext` at 44.1 kHz; downmix to mono Float32 for analysis.
2. **Waveform**: compute min/max/RMS per bucket at 50 peaks/s (detail) and 800 buckets/track (overview); quantize u8; write blobs.
3. **BPM** (skip if source `tag`):
   - Resample mono to 11 025 Hz; onset-energy envelope: half-wave-rectified spectral-flux over 1024-sample FFT frames, hop 256.
   - Autocorrelate envelope over lags for 70–180 BPM; comb-score candidate tempi including ×2/÷2 and ×3/2 relations; fold winner into 70–180; prefer 85–150 on near-ties (dance-floor prior).
   - Refine: quadratic-interpolate the autocorrelation peak → one decimal (e.g. 126.4). Confidence = peak prominence; below threshold store BPM with `low_confidence` flag (UI shows value dimmed, "≈").
4. **Key** (skip if source `tag`): FFT 8192 / hop 4096 over the middle 60 % of the track; fold spectrum 55 Hz–1.76 kHz into a 12-bin chroma with harmonic weighting; Pearson-correlate against Krumhansl-Kessler major/minor profiles ×12 rotations; best → key. Map to Camelot (`8A` = A minor wheel etc.). Same confidence/dim rule.
5. **Loudness** (R6.5): compute integrated LUFS-ish loudness on the mono analysis buffer (gated RMS approximation acceptable in v1 if within ±1.5 LU of a reference meter on the fixture set) and true-peak estimate in dBFS; store `loudness_lufs` + `peak_db`. Used only for auto-gain suggestion (R2.13), not for rewriting files.
6. **Commit**: main writes row + blobs in one transaction, emits `analysis:progress`.

### Manual corrections (R6.6)

Prep mode (required): edit BPM (numeric), **tap tempo** (average last N taps, N≥4), **½ / ×2** buttons, key picker (Camelot wheel or list). Writes `bpm_source` / `key_source` = `manual`; does not re-queue analysis. Waveform beat ticks (R7.5) recompute from the corrected BPM. Performance-console affordances for the same actions are nice-to-have.

Performance target on the reference laptop: ≤ 4 s per average track end-to-end, so a 2500-track backfill completes in ≈ 2–3 h of idle time. Browser stays interactive: results appear per-track, `… ` placeholders until then.

## Waveform rendering contract (consumed by E6)

- Overview strip: draw all 800 buckets, played portion full-opacity in deck accent, remainder 40 %. Cue marker: 2 px vertical in deck accent at `cueOffset`. End-of-track warning: remaining region tints toward `vu-clip` when ≤ 30 s (stronger at 15 / 10).
- Scrolling detail: fixed center playhead; window = ±4 s at 50 pps → 400 buckets; canvas redraw per rAF from typed arrays (no React in the draw path). RMS drawn as inner bright bar, min/max as outer dim bar — reads as "energy" at a glance.
- **Beat ticks** (R7.5): light vertical lines at `n × (60 / effectiveBpm)` relative to an origin of 0:00 (not a movable grid). Visual phase aid only; SYNC does not align them across decks.
