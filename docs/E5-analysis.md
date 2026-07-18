# E5 — Analysis pipeline

Reads: docs/05 (pipeline, blob formats), docs/02 (analysis window). Depends on E1 + E4 schema; runs parallel to E4 UI work.

## Scope

1. Analysis window lifecycle: lazy create, supervise, restart on crash, one job at a time, back-pressure to the main-process queue.
2. Priority queue in main: deck-load requests preempt; newly added before backfill; pause/resume; queue depth in `analysis:progress`.
3. Decode stage with hard memory discipline: decode → mono downmix → release stereo buffer; sequential jobs; window working set returns to baseline between jobs.
4. Waveform stage: overview (800 buckets) + detail (50 pps) min/max/RMS u8 blobs per docs/05 format.
5. BPM stage per docs/05 §3: envelope, autocorrelation, tempo folding with dance prior, quadratic refinement, confidence flag.
6. Key stage per docs/05 §4: chroma, Krumhansl correlation, Camelot mapping, confidence flag.
7. Loudness stage per docs/05 §5: `loudness_lufs` + `peak_db` for auto-gain.
8. Commit transaction + progress events; `analysis_version` stamped.
9. Accuracy harness (dev script, not shipped): run the pipeline over a labeled fixture set (owner supplies ~40 tracks with known BPM/key from Mixxx/rekordbox tags) and print an accuracy report. This is the tuning loop for thresholds and priors. Include loudness spot-check vs a reference meter on ≥5 tracks.

## Acceptance criteria

- Accuracy on the labeled set: BPM within ±0.15 of reference (or exact half/double correctly folded) for ≥ 90 % of tracks; key exact-or-adjacent-Camelot (±1 same letter, or relative major/minor) for ≥ 80 %. Misses carry the low-confidence flag in ≥ 70 % of cases (the flag must mean something).
- Throughput: average track (5 min MP3) fully analyzed in ≤ 4 s on the reference laptop; 100-track batch sustains it (no degradation from leaks).
- Memory: analysis window peak < 600 MB during a 60-min WAV; returns under 150 MB between jobs.
- Loading an unanalyzed track to a deck jumps it to queue front; BPM/key/waveform appear on the deck without reload when done.
- Kill the analysis window process mid-job → supervisor restarts it, job re-runs, no corrupt row (transactionality).
- Waveform blobs render correctly in the E6 views (visual check against Audacity for one known file: peaks align with audible hits).
- App restart mid-backfill resumes where it left off; already-analyzed tracks are never re-processed (R5.5 — verify by file-access logging on second run).
