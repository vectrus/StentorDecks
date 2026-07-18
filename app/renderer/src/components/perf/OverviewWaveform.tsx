import { observer } from 'mobx-react-lite';
import { useEffect, useRef, type MouseEvent } from 'react';
import type { DeckStore } from '../../stores/DeckStore';
import { registerFrameDraw } from '../../audio/frameClock';
import { drawOverviewWaveform } from '../../waveform/drawOverview';

type Props = {
  deck: DeckStore;
  accent: 'a' | 'b';
};

function token(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Overview strip — canvas from typed array (docs/05 / E6).
 * Drawn on the shared frame clock (same rAF as transport). Click seeks.
 */
export const OverviewWaveform = observer(function OverviewWaveform({ deck, accent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  const onClick = (e: MouseEvent<HTMLCanvasElement>): void => {
    if (deck.state === 'empty' || deck.duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / Math.max(1, rect.width);
    deck.seek(x * deck.duration);
  };

  return (
    <canvas
      className={`perf-wave overview accent-${accent}${empty ? ' empty' : ''}${overview ? '' : ' pending'}`}
      ref={canvasRef}
      role="img"
      aria-label={
        empty
          ? `Deck ${deck.id} empty`
          : overview
            ? `Deck ${deck.id} overview waveform`
            : `Deck ${deck.id} analyzing waveform`
      }
      onClick={onClick}
    />
  );
});
