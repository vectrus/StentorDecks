-- E4: tracks + waveforms (docs/05). midi_map + kv already in 001.
CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  folder TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  mtime INTEGER NOT NULL,
  partial_hash TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  album TEXT,
  genre TEXT,
  duration_ms INTEGER,
  bpm REAL,
  bpm_source TEXT CHECK(bpm_source IN ('tag','analysis','manual')),
  key_camelot TEXT,
  key_name TEXT,
  key_source TEXT CHECK(key_source IN ('tag','analysis','manual')),
  loudness_lufs REAL,
  peak_db REAL,
  analyzed_at INTEGER,
  analysis_version INTEGER,
  low_confidence INTEGER NOT NULL DEFAULT 0,
  missing_since INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tracks_folder ON tracks(folder);
CREATE INDEX IF NOT EXISTS idx_tracks_hash ON tracks(partial_hash);
CREATE INDEX IF NOT EXISTS idx_tracks_filename ON tracks(filename);

CREATE TABLE IF NOT EXISTS waveforms (
  track_id INTEGER PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  overview BLOB NOT NULL,
  detail BLOB NOT NULL,
  detail_pps INTEGER NOT NULL DEFAULT 50
);
