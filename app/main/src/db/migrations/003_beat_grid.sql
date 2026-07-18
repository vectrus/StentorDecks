-- E5/R2.3: per-track beatgrid first-beat offset (seconds from file start).
ALTER TABLE tracks ADD COLUMN beat_grid_offset_sec REAL;
