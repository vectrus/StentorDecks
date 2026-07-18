import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import type { DeckStore } from '../../stores/DeckStore';
import { settingsStore } from '../../stores/SettingsStore';
import { drawDetailWaveform } from '../../waveform/drawDetail';

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
 * Scrolling detail strip — fixed center playhead via CSS; canvas scrolls under it.
 * docs/05 ±4 s @ 50 pps; beat ticks from effective BPM + grid offset (R7.5).
 */
export const DetailWaveform = observer(function DetailWaveform({ deck, accent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detail = deck.detailWaveform;
  const empty = deck.state === 'empty';
  const showTicks = settingsStore.settings.ui.showBeatTicks;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    const accentCss =
      accent === 'a' ? token('--deck-a', '#ffb454') : token('--deck-b', '#5bd0ff');
    const tickCss = token('--text-faint', '#8a94a6');

    const loop = (): void => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || 1;
        const cssH = canvas.clientHeight || 1;
        const pw = Math.max(1, Math.floor(cssW * dpr));
        const ph = Math.max(1, Math.floor(cssH * dpr));
        if (canvas.width !== pw || canvas.height !== ph) {
          canvas.width = pw;
          canvas.height = ph;
        }
        const blob = deck.detailWaveform;
        if (blob && deck.state !== 'empty' && deck.duration > 0) {
          drawDetailWaveform(ctx, blob, {
            width: pw,
            height: ph,
            positionSec: deck.position,
            durationSec: deck.duration,
            cueOffsetSec: deck.cueOffset,
            detailPps: deck.detailPps || 50,
            accent: accentCss,
            tickColor: tickCss,
            // Track-time lattice (file BPM) — not pitched/jogged effective BPM (R7.5).
            gridBpm: deck.fileBpm,
            beatGridOffsetSec: deck.beatGridOffsetSec,
            showBeatTicks: settingsStore.settings.ui.showBeatTicks,
          });
        } else {
          ctx.clearRect(0, 0, pw, ph);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [deck, accent, detail, empty, showTicks]);

  return (
    <canvas
      className={`perf-wave detail accent-${accent}${empty ? ' empty' : ''}${detail ? '' : ' pending'}`}
      ref={canvasRef}
      role="img"
      aria-label={
        empty
          ? `Deck ${deck.id} empty`
          : detail
            ? `Deck ${deck.id} detail waveform`
            : `Deck ${deck.id} analyzing waveform`
      }
    />
  );
});
