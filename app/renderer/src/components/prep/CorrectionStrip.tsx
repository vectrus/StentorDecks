import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import {
  CAMELOT_KEYS,
  fixerKnobsForPreset,
  isSdSiblingWavPath,
  type Settings,
} from '@stentordeck/shared';
import { libraryStore, settingsStore } from '../../stores/root';

type FixerPreset = Settings['library']['fixer']['preset'];
type DeclickLevel = Settings['library']['fixer']['declick'];

/** Prep BPM/key/title + MP3 click/squeak tools (R5.9 / R5.10 / R6.6). */
export const CorrectionStrip = observer(function CorrectionStrip() {
  const track = libraryStore.selectedTrack;
  const [bpmDraft, setBpmDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [artistDraft, setArtistDraft] = useState('');
  const [flash, setFlash] = useState(false);
  const focusSeq = libraryStore.mp3FixerFocusSeq;
  const fixer = settingsStore.settings.library.fixer;

  useEffect(() => {
    if (focusSeq <= 0) return;
    const el = document.getElementById('prep-mp3-fixer');
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 1600);
    return () => window.clearTimeout(t);
  }, [focusSeq]);

  useEffect(() => {
    setTitleDraft(track?.title ?? '');
    setArtistDraft(track?.artist ?? '');
    setBpmDraft('');
  }, [track?.id, track?.title, track?.artist]);

  if (!track) {
    return (
      <div id="prep-mp3-fixer" className="prep-correct dim">
        Select a track to edit BPM / key / title
      </div>
    );
  }

  const row = track;
  const isSdWav = isSdSiblingWavPath(row.path);
  const isMp3 = /\.mp3$/i.test(row.path) && !isSdWav;
  /** Fixer Preview / Write / Rewrite — MP3 or existing SD sibling (resolves to source). */
  const canFixer = isMp3 || isSdWav;
  const isNormSibling = /\(Normalized by SD\)/i.test(row.path);

  function commitTitleArtist(): void {
    const title = titleDraft.trim() === '' ? null : titleDraft.trim();
    const artist = artistDraft.trim() === '' ? null : artistDraft.trim();
    if (title === (row.title ?? null) && artist === (row.artist ?? null)) return;
    void libraryStore.setManualTitleArtist({ title, artist });
  }

  async function onPurge(): Promise<void> {
    const scope: 'folder' | 'library' =
      libraryStore.openFolder != null ? 'folder' : 'library';
    const n = await libraryStore.countSdSiblings(scope);
    if (n <= 0) {
      window.alert(
        scope === 'folder'
          ? 'No Fixed/Normalized SD WAVs in this folder.'
          : 'No Fixed/Normalized SD WAVs in the library.',
      );
      return;
    }
    const where =
      scope === 'folder'
        ? `this folder (${libraryStore.openFolder})`
        : 'the whole library';
    const ok = window.confirm(
      `Delete ${n} Fixed/Normalized by SD WAV file(s) from ${where}?\n\nOriginal music is never deleted.`,
    );
    if (!ok) return;
    await libraryStore.purgeSdSiblings(scope);
  }

  return (
    <div
      id="prep-mp3-fixer"
      className={`prep-correct${flash ? ' mp3-fixer-focus' : ''}`}
      aria-label="BPM, key, title, and click and squeak fixer"
    >
      <label className="prep-correct-title">
        Title
        <input
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitTitleArtist();
            }
          }}
          onBlur={() => commitTitleArtist()}
        />
      </label>
      <label className="prep-correct-artist">
        Artist
        <input
          type="text"
          value={artistDraft}
          onChange={(e) => setArtistDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitTitleArtist();
            }
          }}
          onBlur={() => commitTitleArtist()}
        />
      </label>
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
      <label
        className="prep-correct-key"
        title="Camelot wheel: 1A–12A (minor) / 1B–12B (major)."
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

      <label className="prep-fixer-preset" title="Sets fade, trim, and de-click together">
        Fixer
        <select
          className="mono"
          value={fixer.preset}
          onChange={(e) => {
            const preset = e.target.value as FixerPreset;
            void settingsStore.set({
              library: { fixer: fixerKnobsForPreset(preset) },
            });
          }}
        >
          <option value="gentle">Gentle</option>
          <option value="normal">Normal</option>
          <option value="aggressive">Aggressive</option>
        </select>
      </label>
      <label className="prep-fixer-num" title="Seam crossfade length (ms)">
        Fade
        <input
          className="mono"
          type="number"
          min={3}
          max={40}
          step={0.5}
          value={fixer.seamFadeMs}
          onChange={(e) => {
            const n = Number.parseFloat(e.target.value);
            if (!Number.isFinite(n)) return;
            void settingsStore.set({
              library: {
                fixer: {
                  ...fixer,
                  seamFadeMs: Math.min(40, Math.max(3, n)),
                },
              },
            });
          }}
        />
      </label>
      <label className="prep-fixer-num" title="Samples trimmed after each resume (ms)">
        Trim
        <input
          className="mono"
          type="number"
          min={0}
          max={26}
          step={0.5}
          value={fixer.seamTrimMs}
          onChange={(e) => {
            const n = Number.parseFloat(e.target.value);
            if (!Number.isFinite(n)) return;
            void settingsStore.set({
              library: {
                fixer: {
                  ...fixer,
                  seamTrimMs: Math.min(26, Math.max(0, n)),
                },
              },
            });
          }}
        />
      </label>
      <label className="prep-fixer-declick" title="Heal mid-track ticks after stitch">
        De-click
        <select
          className="mono"
          value={fixer.declick}
          onChange={(e) => {
            void settingsStore.set({
              library: {
                fixer: {
                  ...fixer,
                  declick: e.target.value as DeclickLevel,
                },
              },
            });
          }}
        >
          <option value="off">Off</option>
          <option value="light">Light</option>
          <option value="strong">Strong</option>
        </select>
      </label>

      <button
        type="button"
        className="prep-mp3-check"
        title="Check whether Chromium truncates this MP3 (R5.9)"
        disabled={libraryStore.mp3FixBusy || !isMp3}
        onClick={() => void libraryStore.checkSelectedMp3()}
      >
        Check MP3
      </button>
      <button
        type="button"
        className={`prep-mp3-preview${libraryStore.phonesPreviewKind === 'fixer' ? ' on' : ''}`}
        title="Phones only — resilient decode with current fixer knobs (source MP3 if sibling selected)."
        disabled={
          libraryStore.mp3FixBusy || libraryStore.phonesPreviewBusy || !canFixer
        }
        onClick={() => void libraryStore.toggleFixerPhonesPreview()}
      >
        {libraryStore.phonesPreviewKind === 'fixer' ? 'Stop fix preview' : 'Preview fix'}
      </button>
      <button
        type="button"
        className="prep-mp3-fix"
        title="Write sibling WAV (Fixed by SD). Never changes the original. Prefer Rewrite if one already exists."
        disabled={libraryStore.mp3FixBusy || !canFixer}
        onClick={() => void libraryStore.fixSelectedMp3()}
      >
        {libraryStore.mp3FixBusy ? 'Fixing…' : 'Write fixed WAV'}
      </button>
      <button
        type="button"
        className="prep-mp3-fix"
        title="Overwrite the Fixed by SD WAV with current knobs (no ‘ 2.wav’). Source MP3 untouched."
        disabled={libraryStore.mp3FixBusy || !canFixer}
        onClick={() => void libraryStore.rewriteSelectedFixed()}
      >
        Rewrite fixed
      </button>
      <button
        type="button"
        className={`prep-mp3-preview${libraryStore.phonesPreviewKind === 'normalize' ? ' on' : ''}`}
        title="Phones only — LUFS normalize. Separate from fixer."
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
        title="Write sibling WAV (Normalized by SD). Never changes the original."
        disabled={libraryStore.mp3FixBusy || track.loudnessLufs == null}
        onClick={() => void libraryStore.writeNormalizedSibling()}
      >
        Write normalized
      </button>
      <button
        type="button"
        className="prep-mp3-norm"
        title="Overwrite the Normalized by SD WAV (no ‘ 2.wav’). Source untouched."
        disabled={
          libraryStore.mp3FixBusy ||
          !(isNormSibling || (canFixer && track.loudnessLufs != null))
        }
        onClick={() => void libraryStore.rewriteSelectedNormalized()}
      >
        Rewrite normalized
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
      <button
        type="button"
        className="prep-mp3-delete"
        title="Delete this Fixed/Normalized sibling from disk"
        disabled={libraryStore.mp3FixBusy || !isSdWav}
        onClick={() => {
          const name = track.path.split(/[/\\]/).pop() ?? 'file';
          const ok = window.confirm(
            `Delete ${name} from disk?\n\nOnly StentorDeck sibling WAVs can be removed. Originals stay.`,
          );
          if (!ok) return;
          void libraryStore.deleteSelectedSdSibling();
        }}
      >
        Delete SD WAV
      </button>
      <button
        type="button"
        className="prep-mp3-purge"
        title="Delete all Fixed/Normalized SD WAVs in the open folder (or whole library)"
        disabled={libraryStore.mp3FixBusy}
        onClick={() => void onPurge()}
      >
        Purge SD WAVs…
      </button>

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
