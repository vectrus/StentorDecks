-- E1: kv + schema_version; full tracks schema arrives in E4.
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS midi_map (
  control_id TEXT PRIMARY KEY,
  binding TEXT NOT NULL
);

INSERT OR IGNORE INTO kv (key, value) VALUES ('schema_version', '1');
