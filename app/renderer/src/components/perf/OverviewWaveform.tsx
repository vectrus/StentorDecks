import { observer } from 'mobx-react-lite';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { DeckStore } from '../../stores/DeckStore';
import { registerFrameDraw } from '../../audio/frameClock';
import { drawOverviewWaveform } from '../../waveform/drawOverview';
import { overviewNormAtX } from '../../waveform/waveformScrub';

type Props = {
  deck: DeckStore;
  accent: 'a' | 'b';
};

type ScrubSession = {
  pointerId: number;
};

function token(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Overview strip — canvas from typed array (docs/05 / E6).
 * Click / drag seeks (mouse jog substitute, R1.5). Double-click sets cue when paused.
 */
export const OverviewWaveform = observer(function OverviewWaveform({ deck, accent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrubRef = useRef<ScrubSession | null>(null);
  const overview = deck.overviewWaveform;
  const empty = deck.state === 'empty';
  const [scrubbing, setScrubbing] = useState(false);

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
      const blob = deck.overviewWaveform;
      if (blob && deck.state !== 'empty' && deck.duration > 0) {
        const pos = deck.visualPosSec;
        const progress = Math.min(1, Math.max(0, pos / deck.duration));
        const cueNorm = Math.min(1, Math.max(0, deck.cueOffset / deck.duration));
        const remaining = Math.max(0, deck.duration - pos);
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
  }, [deck, accent, overview, empty]);

  function seekAtClientX(clientX: number, micro: boolean): void {
    const canvas = canvasRef.current;
    if (!canvas || deck.state === 'empty' || deck.duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = overviewNormAtX(clientX, rect);
    deck.seek(x * deck.duration, { micro });
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>): void {
    if (empty || deck.duration <= 0 || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubRef.current = { pointerId: e.pointerId };
    setScrubbing(true);
    seekAtClientX(e.clientX, deck.state === 'playing');
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>): void {
    const s = scrubRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    seekAtClientX(e.clientX, true);
  }

  function endScrub(e: ReactPointerEvent<HTMLCanvasElement>): void {
    const s = scrubRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    scrubRef.current = null;
    setScrubbing(false);
  }

  function onDoubleClick(e: React.MouseEvent<HTMLCanvasElement>): void {
    if (empty || deck.duration <= 0) return;
    seekAtClientX(e.clientX, false);
    if (deck.state !== 'playing') {
      deck.setCueAtPlayhead();
    }
  }

  return (
    <canvas
      className={`perf-wave overview accent-${accent}${empty ? ' empty' : ''}${
        overview ? '' : ' pending'
      }${scrubbing ? ' scrubbing' : ''}${!empty ? ' scrubbable' : ''}`}
      ref={canvasRef}
      role="img"
      aria-label={
        empty
          ? `Deck ${deck.id} empty`
          : `Deck ${deck.id} overview — drag to seek, double-click sets cue when paused`
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endScrub}
      onPointerCancel={endScrub}
      onDoubleClick={onDoubleClick}
    />
  );
});
