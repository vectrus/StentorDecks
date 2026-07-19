import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { CAMELOT_KEYS } from '@stentordeck/shared';
import { libraryStore } from '../../stores/root';

/** Prep BPM/key correction strip (R6.6) + MP3 click/squeak tools (R5.9). */
export const CorrectionStrip = observer(function CorrectionStrip() {
  const track = libraryStore.selectedTrack;
  const [bpmDraft, setBpmDraft] = useState('');
  const [flash, setFlash] = useState(false);
  const focusSeq = libraryStore.mp3FixerFocusSeq;

  useEffect(() => {
    if (focusSeq <= 0) return;
    const el = document.getElementById('prep-mp3-fixer');
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 1600);
    return () => window.clearTimeout(t);
  }, [focusSeq]);

  if (!track) {
    return (
      <div id="prep-mp3-fixer" className="prep-correct dim">
        Select a track to edit BPM / key
      </div>
    );
  }

  return (
    <div
      id="prep-mp3-fixer"
      className={`prep-correct${flash ? ' mp3-fixer-focus' : ''}`}
      aria-label="BPM, key, and click and squeak fixer"
    >
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
        className={`prep-mp3-preview${libraryStore.phonesPreviewKind === 'fixer' ? ' on' : ''}`}
        title="Phones only — hear resilient decode before writing. Stops normalize preview if that was playing."
        disabled={
          libraryStore.mp3FixBusy ||
          libraryStore.phonesPreviewBusy ||
          !/\.mp3$/i.test(track.path)
        }
        onClick={() => void libraryStore.toggleFixerPhonesPreview()}
      >
        {libraryStore.phonesPreviewKind === 'fixer' ? 'Stop fix preview' : 'Preview fix'}
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
      <button
        type="button"
        className={`prep-mp3-preview${libraryStore.phonesPreviewKind === 'normalize' ? ' on' : ''}`}
        title="Phones only — hear LUFS normalize gain (Settings target). Separate from fixer; not both at once. Needs Detect loudness."
        disabled={
          libraryStore.mp3FixBusy ||
          libraryStore.phonesPreviewBusy ||
          track.loudnessLufs == null
        }
        onClick={() => void libraryStore.toggleNormalizePhonesPreview()}
      >
        {libraryStore.phonesPreviewKind === 'normalize'
          ? 'Stop norm preview'
          : 'Preview normalize'}
      </button>
      <button
        type="button"
        className="prep-mp3-norm"
        title="Write sibling WAV named (Normalized by SD) toward auto-gain target LUFS. Never changes the original. Separate from Write fixed WAV."
        disabled={libraryStore.mp3FixBusy || track.loudnessLufs == null}
        onClick={() => void libraryStore.writeNormalizedSibling()}
      >
        Write normalized
      </button>
      {libraryStore.phonesPreviewKind != null ? (
        <button
          type="button"
          className="prep-mp3-preview-stop"
          title="Stop phones-only preview"
          onClick={() => void libraryStore.stopPhonesPreview()}
        >
          Stop preview
        </button>
      ) : null}
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
