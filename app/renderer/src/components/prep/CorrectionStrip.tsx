import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { CAMELOT_KEYS } from '@stentordeck/shared';
import { libraryStore } from '../../stores/root';

/** Prep BPM/key correction strip (R6.6). */
export const CorrectionStrip = observer(function CorrectionStrip() {
  const track = libraryStore.selectedTrack;
  const [bpmDraft, setBpmDraft] = useState('');

  if (!track) {
    return (
      <div className="prep-correct dim">
        Select a track to edit BPM / key
      </div>
    );
  }

  return (
    <div className="prep-correct">
      <label className="prep-correct-bpm">
        BPM
        <input
          className="mono"
          type="text"
          inputMode="decimal"
          placeholder={track.bpm != null ? String(track.bpm) : '—'}
          value={bpmDraft}
          onChange={(e) => setBpmDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const n = Number.parseFloat(bpmDraft);
              if (Number.isFinite(n)) {
                void libraryStore.setManualBpm(n);
                setBpmDraft('');
              }
            }
          }}
          onBlur={() => {
            const n = Number.parseFloat(bpmDraft);
            if (Number.isFinite(n)) {
              void libraryStore.setManualBpm(n);
              setBpmDraft('');
            }
          }}
        />
      </label>
      <button type="button" onClick={() => libraryStore.tap()} title="Tap tempo (≥4 taps)">
        Tap
        {libraryStore.tapPreviewBpm != null
          ? ` ${libraryStore.tapPreviewBpm}`
          : libraryStore.tapTimes.length
            ? ` (${libraryStore.tapTimes.length})`
            : ''}
      </button>
      <button
        type="button"
        disabled={libraryStore.tapPreviewBpm == null}
        onClick={() => void libraryStore.applyTapBpm()}
      >
        Apply tap
      </button>
      <button type="button" disabled={track.bpm == null} onClick={() => void libraryStore.halfBpm()}>
        ½
      </button>
      <button
        type="button"
        disabled={track.bpm == null}
        onClick={() => void libraryStore.doubleBpm()}
      >
        ×2
      </button>
      <button
        type="button"
        className="prep-detect"
        title="Run analysis to detect BPM, Camelot key, waveform, loudness (E5 pipeline)"
        onClick={() => void libraryStore.detectSelected()}
      >
        Detect
      </button>
      <button
        type="button"
        className="prep-mp3-check"
        title="Check whether Chromium truncates this MP3 (R5.9)"
        disabled={libraryStore.mp3FixBusy || !/\.mp3$/i.test(track.path)}
        onClick={() => void libraryStore.checkSelectedMp3()}
      >
        Check MP3
      </button>
      <button
        type="button"
        className="prep-mp3-fix"
        title="Decode with resilient stitch → write sibling WAV named (Fixed by SD). Never changes the original."
        disabled={libraryStore.mp3FixBusy || !/\.mp3$/i.test(track.path)}
        onClick={() => void libraryStore.fixSelectedMp3()}
      >
        {libraryStore.mp3FixBusy ? 'Fixing…' : 'Write fixed WAV'}
      </button>
      <label
        className="prep-correct-key"
        title="Camelot wheel: 1A–12A (minor) / 1B–12B (major). Compatible mixes are ±1 on the wheel (e.g. 8A↔9A, 8A↔8B)."
      >
        Camelot
        <select
          className="mono"
          value={track.keyCamelot ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            void libraryStore.setManualKey(v === '' ? null : v);
          }}
        >
          <option value="">—</option>
          {CAMELOT_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <span className="mono hint">
        {track.bpmSource ?? 'no bpm'}
        {track.keyCamelot ? ` · ${track.keyCamelot}` : ''}
        {libraryStore.detectStatus ? ` · ${libraryStore.detectStatus}` : ''}
      </span>
      {libraryStore.mp3Inspect?.trackId === track.id ? (
        <span
          className={`mono hint prep-mp3-detail${
            libraryStore.mp3Inspect.needsFix ? ' needs-fix' : ''
          }`}
        >
          {libraryStore.mp3Inspect.detail}
        </span>
      ) : null}
      {libraryStore.mp3FixStatus ? (
        <span className="mono hint prep-mp3-detail">{libraryStore.mp3FixStatus}</span>
      ) : null}
    </div>
  );
});
