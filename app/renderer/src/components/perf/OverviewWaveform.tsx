import { observer } from 'mobx-react-lite';
import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import type { DeckStore } from '../../stores/DeckStore';
import { registerFrameDraw } from '../../audio/frameClock';
import { drawOverviewWaveform } from '../../waveform/drawOverview';
import { overviewNormAtX } from '../../waveform/waveformScrub';
import { isLibraryTrackDrag } from '../../library/libraryTrackDrag';

type Props = {
  deck: DeckStore;
  accent: 'a' | 'b';
};

type ScrubSession = { pointerId: number };

function token(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Overview strip — native pointer scrub (no setState mid-gesture). R1.5.
 */
export const OverviewWaveform = observer(function OverviewWaveform({ deck, accent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrubRef = useRef<ScrubSession | null>(null);
  const deckRef = useRef(deck);
  deckRef.current = deck;
  const overview = deck.overviewWaveform;
  const empty = deck.state === 'empty';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const accentCss =
      accent === 'a' ? token('--deck-a', '#ffb454') : token('--deck-b', '#5bd0ff');
    const clipCss = token('--vu-clip', '#ff5d5d');

    const draw = (): void => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth || 1;
      const cssH = canvas.clientHeight || 1;
      const pw = Math.max(1, Math.floor(cssW * dpr));
      const ph = Math.max(1, Math.floor(cssH * dpr));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      const d = deckRef.current;
      const blob = d.overviewWaveform;
      if (blob && d.state !== 'empty' && d.duration > 0) {
        const pos = d.visualPosSec;
        const progress = Math.min(1, Math.max(0, pos / d.duration));
        const cueNorm = Math.min(1, Math.max(0, d.cueOffset / d.duration));
        const remaining = Math.max(0, d.duration - pos);
        drawOverviewWaveform(ctx, blob, {
          width: pw,
          height: ph,
          progress,
          cueNorm,
          accent: accentCss,
          clip: clipCss,
          remainingSec: remaining,
        });
      } else {
        ctx.clearRect(0, 0, pw, ph);
      }
    };

    return registerFrameDraw(draw);
  }, [accent, overview, empty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const seekAt = (clientX: number, micro: boolean) => {
      const d = deckRef.current;
      if (d.state === 'empty' || d.duration <= 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = overviewNormAtX(clientX, rect);
      d.seek(x * d.duration, { micro });
    };

    const onPointerDown = (e: PointerEvent) => {
      const d = deckRef.current;
      if (d.state === 'empty' || d.duration <= 0 || e.button !== 0) return;
      if (isLibraryTrackDrag()) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      scrubRef.current = { pointerId: e.pointerId };
      canvas.classList.add('scrubbing');
      seekAt(e.clientX, d.state === 'playing');
    };

    const onPointerMove = (e: PointerEvent) => {
      const s = scrubRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      seekAt(e.clientX, true);
    };

    const endScrub = (e: PointerEvent) => {
      const s = scrubRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      scrubRef.current = null;
      canvas.classList.remove('scrubbing');
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', endScrub);
    canvas.addEventListener('pointercancel', endScrub);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endScrub);
      canvas.removeEventListener('pointercancel', endScrub);
    };
  }, []);

  function onDoubleClick(e: ReactMouseEvent<HTMLCanvasElement>): void {
    const d = deck;
    if (d.state === 'empty' || d.duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = overviewNormAtX(e.clientX, rect);
    d.seek(x * d.duration, { micro: false });
    if (d.state !== 'playing') d.setCueAtPlayhead();
  }

  return (
    <canvas
      className={`perf-wave overview accent-${accent}${empty ? ' empty' : ''}${
        overview ? '' : ' pending'
      }${!empty ? ' scrubbable' : ''}`}
      ref={canvasRef}
      role="img"
      aria-label={
        empty
          ? `Deck ${deck.id} empty`
          : `Deck ${deck.id} overview — drag to seek, double-click sets cue when paused`
      }
      onDoubleClick={onDoubleClick}
    />
  );
});
