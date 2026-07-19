import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isSdSiblingWavPath } from '@stentordeck/shared';
import { deckA, deckB, libraryStore, uiStore } from '../../stores/root';

export type TrackContextTarget = {
  trackId: number;
  path: string;
  clientX: number;
  clientY: number;
};

type Props = {
  target: TrackContextTarget | null;
  onClose: () => void;
};

/**
 * Right-click menu on library / Performance browse rows (R5.9, R1.5 mouse path).
 * Primary action: open the click & squeak fixer on the Library correction strip.
 */
export function TrackContextMenu({ target, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!target || !menuRef.current) return;
    const pad = 8;
    const rect = menuRef.current.getBoundingClientRect();
    let left = target.clientX;
    let top = target.clientY;
    if (left + rect.width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - rect.width - pad);
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = Math.max(pad, window.innerHeight - rect.height - pad);
    }
    setPos({ left, top });
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [target, onClose]);

  if (!target) return null;

  const isSdWav = isSdSiblingWavPath(target.path);
  const isMp3 = /\.mp3$/i.test(target.path) && !isSdWav;
  const canFixer = isMp3 || isSdWav;
  const busy = libraryStore.mp3FixBusy;

  const openFixer = () => {
    const id = target.trackId;
    onClose();
    void (async () => {
      // UI label is "Library"; IPC mode id remains `prep` (docs/02).
      if (uiStore.mode !== 'prep') {
        await uiStore.setMode('prep');
      }
      libraryStore.openInMp3Fixer(id);
    })();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="track-ctx"
      role="menu"
      aria-label="Track actions"
      style={{ left: pos.left, top: pos.top }}
    >
      <button type="button" role="menuitem" className="track-ctx-primary" onClick={openFixer}>
        Click &amp; squeak fixer…
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={busy || !isMp3}
        title={isMp3 ? 'Check whether Chromium truncates this MP3' : 'MP3 only'}
        onClick={() => {
          onClose();
          void (async () => {
            if (uiStore.mode !== 'prep') await uiStore.setMode('prep');
            libraryStore.openInMp3Fixer(target.trackId);
          })();
        }}
      >
        Check MP3
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={busy || !canFixer}
        title={
          canFixer
            ? 'Phones only — resilient decode preview (not booth). Sibling → source MP3.'
            : 'MP3 or Fixed/Normalized sibling'
        }
        onClick={() => {
          onClose();
          void (async () => {
            if (uiStore.mode !== 'prep') await uiStore.setMode('prep');
            libraryStore.openInMp3Fixer(target.trackId, { runCheck: false });
            await libraryStore.toggleFixerPhonesPreview();
          })();
        }}
      >
        Preview fix (phones)
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={busy || !canFixer}
        title={
          canFixer
            ? 'Write sibling WAV (Fixed by SD) — never changes the original'
            : 'MP3 or Fixed/Normalized sibling'
        }
        onClick={() => {
          onClose();
          void (async () => {
            if (uiStore.mode !== 'prep') await uiStore.setMode('prep');
            libraryStore.openInMp3Fixer(target.trackId, { runCheck: false });
            await libraryStore.fixSelectedMp3();
          })();
        }}
      >
        Write fixed WAV
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={busy || !canFixer}
        title={
          canFixer
            ? 'Overwrite Fixed by SD with current knobs (no ‘ 2.wav’)'
            : 'MP3 or Fixed/Normalized sibling'
        }
        onClick={() => {
          onClose();
          void (async () => {
            if (uiStore.mode !== 'prep') await uiStore.setMode('prep');
            libraryStore.openInMp3Fixer(target.trackId, { runCheck: false });
            await libraryStore.rewriteSelectedFixed();
          })();
        }}
      >
        Rewrite fixed WAV
      </button>
      <div className="track-ctx-sep" role="separator" />
      <button
        type="button"
        role="menuitem"
        disabled={busy}
        title="Phones only — LUFS normalize preview (needs Detect). Not at the same time as fix preview."
        onClick={() => {
          onClose();
          void (async () => {
            if (uiStore.mode !== 'prep') await uiStore.setMode('prep');
            libraryStore.openInMp3Fixer(target.trackId, { runCheck: false });
            await libraryStore.toggleNormalizePhonesPreview();
          })();
        }}
      >
        Preview normalize (phones)
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={busy}
        title="Write sibling WAV (Normalized by SD) — never changes the original"
        onClick={() => {
          onClose();
          void (async () => {
            if (uiStore.mode !== 'prep') await uiStore.setMode('prep');
            libraryStore.openInMp3Fixer(target.trackId, { runCheck: false });
            await libraryStore.writeNormalizedSibling();
          })();
        }}
      >
        Write normalized WAV
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={busy || !canFixer}
        title={
          canFixer
            ? 'Overwrite Normalized by SD (no ‘ 2.wav’) — source untouched'
            : 'MP3 or SD sibling'
        }
        onClick={() => {
          onClose();
          void (async () => {
            if (uiStore.mode !== 'prep') await uiStore.setMode('prep');
            libraryStore.openInMp3Fixer(target.trackId, { runCheck: false });
            await libraryStore.rewriteSelectedNormalized();
          })();
        }}
      >
        Rewrite normalized WAV
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={busy || !isSdWav}
        title={
          isSdWav
            ? 'Delete this Fixed/Normalized sibling from disk'
            : 'Only Fixed/Normalized by SD WAVs'
        }
        onClick={() => {
          onClose();
          void (async () => {
            if (uiStore.mode !== 'prep') await uiStore.setMode('prep');
            libraryStore.openInMp3Fixer(target.trackId, { runCheck: false });
            const name = target.path.split(/[/\\]/).pop() ?? 'file';
            const ok = window.confirm(
              `Delete ${name} from disk?\n\nOnly StentorDeck sibling WAVs can be removed.`,
            );
            if (!ok) return;
            await libraryStore.deleteSelectedSdSibling();
          })();
        }}
      >
        Delete SD WAV
      </button>
      <div className="track-ctx-sep" role="separator" />
      <button
        type="button"
        role="menuitem"
        disabled={deckA.state === 'playing'}
        onClick={() => {
          onClose();
          const idx = libraryStore.entries.findIndex(
            (e) => e.kind === 'track' && e.track.id === target.trackId,
          );
          if (idx >= 0) libraryStore.selectIndex(idx);
          libraryStore.requestLoad(deckA);
        }}
      >
        Load A
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={deckB.state === 'playing'}
        onClick={() => {
          onClose();
          const idx = libraryStore.entries.findIndex(
            (e) => e.kind === 'track' && e.track.id === target.trackId,
          );
          if (idx >= 0) libraryStore.selectIndex(idx);
          libraryStore.requestLoad(deckB);
        }}
      >
        Load B
      </button>
    </div>,
    document.body,
  );
}
