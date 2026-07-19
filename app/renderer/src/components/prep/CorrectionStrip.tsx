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
type ToolPane = 'fix' | 'loudness';

/** Prep BPM/key/title + segmented Fix / Loudness tools (R5.9 / R5.10 / R6.6). */
export const CorrectionStrip = observer(function CorrectionStrip() {
  const track = libraryStore.selectedTrack;
  const [bpmDraft, setBpmDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [artistDraft, setArtistDraft] = useState('');
  const [flash, setFlash] = useState(false);
  const [tool, setTool] = useState<ToolPane>('fix');
  const [tuneOpen, setTuneOpen] = useState(false);
  const focusSeq = libraryStore.mp3FixerFocusSeq;
  const fixer = settingsStore.settings.library.fixer;
  const previewKind = libraryStore.phonesPreviewKind;
  const previewLeg = libraryStore.phonesPreviewLeg;

  useEffect(() => {
    if (focusSeq <= 0) return;
    setTool('fix');
    setTuneOpen(true);
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
  const canFixer = isMp3 || isSdWav;
  const isNormSibling = /\(Normalized by SD\)/i.test(row.path);
  const canRewriteNorm = isNormSibling || (canFixer && track.loudnessLufs != null);
  const busy = libraryStore.mp3FixBusy;
  const previewBusy = libraryStore.phonesPreviewBusy;

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

  const statusParts: string[] = [];
  if (track.bpmSource) statusParts.push(track.bpmSource);
  else statusParts.push('no bpm');
  if (track.keyCamelot) statusParts.push(track.keyCamelot);
  if (track.loudnessLufs != null && Number.isFinite(track.loudnessLufs)) {
    statusParts.push(`${track.loudnessLufs.toFixed(1)} LUFS`);
  }
  if (libraryStore.detectStatus) statusParts.push(libraryStore.detectStatus);
  if (libraryStore.mp3Inspect?.trackId === track.id) {
    statusParts.push(libraryStore.mp3Inspect.detail);
  }
  if (libraryStore.mp3FixStatus) statusParts.push(libraryStore.mp3FixStatus);
  const statusLine = statusParts.join(' · ');
  const statusHot =
    libraryStore.mp3Inspect?.trackId === track.id && libraryStore.mp3Inspect.needsFix;

  return (
    <div
      id="prep-mp3-fixer"
      className={`prep-correct${flash ? ' mp3-fixer-focus' : ''}`}
      aria-label="BPM, key, title, and library tools"
    >
      <div className="prep-correct-meta">
        <label className="prep-correct-title">
          <span className="prep-correct-lab">Title</span>
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
          <span className="prep-correct-lab">Artist</span>
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
      </div>

      <div className="prep-correct-tempo">
        <label className="prep-correct-bpm">
          <span className="prep-correct-lab">BPM</span>
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
          Apply
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
          <span className="prep-correct-lab">Camelot</span>
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
      </div>

      <p
        className={`prep-correct-status mono${statusHot ? ' needs-fix' : ''}`}
        title={statusLine}
      >
        {statusLine}
      </p>

      {previewKind != null ? (
        <div className="prep-preview-bar" role="group" aria-label="Phones preview A/B">
          <span className="prep-preview-tag">
            PHONES · {previewKind === 'normalize' ? 'NORMALIZE' : 'FIX'}
          </span>
          <span className="prep-mp3-ab">
            <button
              type="button"
              className={`prep-mp3-ab-btn${previewLeg === 'original' ? ' on' : ''}`}
              title="Phones: hear the stock original at this position"
              disabled={previewBusy}
              onClick={() => void libraryStore.setPhonesPreviewLeg('original')}
            >
              Original
            </button>
            <button
              type="button"
              className={`prep-mp3-ab-btn${previewLeg === 'processed' ? ' on' : ''}`}
              title={
                previewKind === 'normalize'
                  ? 'Phones: hear normalized gain at this position'
                  : 'Phones: hear the fixed decode at this position'
              }
              disabled={previewBusy}
              onClick={() => void libraryStore.setPhonesPreviewLeg('processed')}
            >
              {previewKind === 'normalize' ? 'Normalized' : 'Fixed'}
            </button>
            <button
              type="button"
              className="prep-mp3-ab-btn"
              title="Flip Original ↔ processed (same playhead)"
              disabled={previewBusy}
              onClick={() => void libraryStore.togglePhonesPreviewLeg()}
            >
              A/B
            </button>
          </span>
          <button
            type="button"
            className="prep-mp3-preview-stop"
            title="Stop phones-only preview"
            onClick={() => void libraryStore.stopPhonesPreview()}
          >
            Stop
          </button>
        </div>
      ) : null}

      <div className="prep-tool-rail">
        <div className="prep-tool-tabs" role="tablist" aria-label="Library tools">
          <button
            type="button"
            role="tab"
            aria-selected={tool === 'fix'}
            className={`prep-tool-tab${tool === 'fix' ? ' on' : ''}`}
            onClick={() => setTool('fix')}
          >
            Fix
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tool === 'loudness'}
            className={`prep-tool-tab${tool === 'loudness' ? ' on' : ''}`}
            onClick={() => setTool('loudness')}
          >
            Loudness
          </button>
        </div>

        {tool === 'fix' ? (
          <div className="prep-tool-body" role="tabpanel" aria-label="Click and squeak fix">
            <label className="prep-fixer-preset" title="Sets fade, trim, and de-click together">
              <span className="prep-correct-lab">Preset</span>
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
            <button
              type="button"
              className={`prep-tool-tune${tuneOpen ? ' on' : ''}`}
              aria-expanded={tuneOpen}
              title="Fade, trim, and de-click knobs"
              onClick={() => setTuneOpen((v) => !v)}
            >
              Tune{tuneOpen ? ' ▾' : ' ▸'}
            </button>
            <button
              type="button"
              className={`prep-mp3-preview${previewKind === 'fixer' ? ' on' : ''}`}
              title="Phones only — resilient decode with current fixer knobs (A/B vs original)."
              disabled={busy || previewBusy || !canFixer}
              onClick={() => void libraryStore.toggleFixerPhonesPreview()}
            >
              {previewKind === 'fixer' ? 'Listening…' : 'Preview'}
            </button>
            <button
              type="button"
              className="prep-mp3-fix"
              title="Write sibling WAV (Fixed by SD). Never changes the original."
              disabled={busy || !canFixer}
              onClick={() => void libraryStore.fixSelectedMp3()}
            >
              {busy ? 'Writing…' : 'Write'}
            </button>
            <button
              type="button"
              className="prep-mp3-fix"
              title="Overwrite the Fixed by SD WAV with current knobs (no ‘ 2.wav’)."
              disabled={busy || !canFixer}
              onClick={() => void libraryStore.rewriteSelectedFixed()}
            >
              Rewrite
            </button>
            <div className="prep-tool-quiet">
              <button
                type="button"
                className="prep-quiet"
                title="Check whether Chromium truncates this MP3 (R5.9)"
                disabled={busy || !isMp3}
                onClick={() => void libraryStore.checkSelectedMp3()}
              >
                Check
              </button>
              <button
                type="button"
                className="prep-quiet"
                title="Delete this Fixed/Normalized sibling from disk"
                disabled={busy || !isSdWav}
                onClick={() => {
                  const name = track.path.split(/[/\\]/).pop() ?? 'file';
                  const ok = window.confirm(
                    `Delete ${name} from disk?\n\nOnly StentorDeck sibling WAVs can be removed. Originals stay.`,
                  );
                  if (!ok) return;
                  void libraryStore.deleteSelectedSdSibling();
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="prep-quiet"
                title="Delete all Fixed/Normalized SD WAVs in the open folder (or whole library)"
                disabled={busy}
                onClick={() => void onPurge()}
              >
                Purge…
              </button>
            </div>
          </div>
        ) : (
          <div className="prep-tool-body" role="tabpanel" aria-label="Loudness normalize">
            <span className="prep-loudness-hint mono">
              {track.loudnessLufs == null
                ? 'Run Detect for LUFS'
                : `→ ${settingsStore.settings.audio.autoGainTargetLufs} LUFS`}
            </span>
            <button
              type="button"
              className={`prep-mp3-preview${previewKind === 'normalize' ? ' on' : ''}`}
              title="Phones only — LUFS normalize preview (A/B vs original level)."
              disabled={busy || previewBusy || track.loudnessLufs == null}
              onClick={() => void libraryStore.toggleNormalizePhonesPreview()}
            >
              {previewKind === 'normalize' ? 'Listening…' : 'Preview'}
            </button>
            <button
              type="button"
              className="prep-mp3-norm"
              title="Write sibling WAV (Normalized by SD). Never changes the original."
              disabled={busy || track.loudnessLufs == null}
              onClick={() => void libraryStore.writeNormalizedSibling()}
            >
              Write
            </button>
            <button
              type="button"
              className="prep-mp3-norm"
              title="Overwrite the Normalized by SD WAV (no ‘ 2.wav’). Source untouched."
              disabled={busy || !canRewriteNorm}
              onClick={() => void libraryStore.rewriteSelectedNormalized()}
            >
              Rewrite
            </button>
            <div className="prep-tool-quiet">
              <button
                type="button"
                className="prep-quiet"
                title="Delete this Fixed/Normalized sibling from disk"
                disabled={busy || !isSdWav}
                onClick={() => {
                  const name = track.path.split(/[/\\]/).pop() ?? 'file';
                  const ok = window.confirm(
                    `Delete ${name} from disk?\n\nOnly StentorDeck sibling WAVs can be removed. Originals stay.`,
                  );
                  if (!ok) return;
                  void libraryStore.deleteSelectedSdSibling();
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="prep-quiet"
                title="Delete all Fixed/Normalized SD WAVs in the open folder (or whole library)"
                disabled={busy}
                onClick={() => void onPurge()}
              >
                Purge…
              </button>
            </div>
          </div>
        )}
      </div>

      {tool === 'fix' && tuneOpen ? (
        <div className="prep-tune-row" aria-label="Fixer tune knobs">
          <label className="prep-fixer-num" title="Seam crossfade length (ms)">
            <span className="prep-correct-lab">Fade</span>
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
            <span className="prep-correct-lab">Trim</span>
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
            <span className="prep-correct-lab">De-click</span>
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
        </div>
      ) : null}
    </div>
  );
});
