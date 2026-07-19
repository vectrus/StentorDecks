import { observer } from 'mobx-react-lite';
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { DeckStore } from '../../stores/DeckStore';
import { settingsStore } from '../../stores/SettingsStore';
import { libraryStore } from '../../stores/root';
import { registerFrameDraw } from '../../audio/frameClock';
import { DETAIL_HALF_WINDOW_SEC, drawDetailWaveform } from '../../waveform/drawDetail';
import {
  detailHalfWindowSec,
  detailSecPerPx,
  detailTimeAtX,
} from '../../waveform/waveformScrub';
import {
  isLibraryTrackDrag,
  parseLibraryTrackId,
} from '../../library/libraryTrackDrag';

type Props = {
  deck: DeckStore;
  accent: 'a' | 'b';
};

type ScrubSession = {
  pointerId: number;
  lastX: number;
  startX: number;
  startY: number;
  moved: boolean;
};

function token(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Detail waveform — scrub (native pointer, no React setState mid-gesture) +
 * library drop-to-load. R7.5 / R1.5 / R4.1 / R4.2.
 */
export const DetailWaveform = observer(function DetailWaveform({ deck, accent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<ScrubSession | null>(null);
  const deckRef = useRef(deck);
  deckRef.current = deck;
  const detail = deck.detailWaveform;
  const empty = deck.state === 'empty';
  const playing = deck.state === 'playing';
  const showTicks = settingsStore.settings.ui.showBeatTicks;
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const accentCss =
      accent === 'a' ? token('--deck-a', '#ffb454') : token('--deck-b', '#5bd0ff');
    const tickCss = token('--text-faint', '#8a94a6');

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
      const blob = d.detailWaveform;
      if (blob && d.state !== 'empty' && d.duration > 0) {
        const rate = Math.min(4, Math.max(0.25, d.pitchOnlyRate || 1));
        drawDetailWaveform(ctx, blob, {
          width: pw,
          height: ph,
          positionSec: d.visualPosSec,
          durationSec: d.duration,
          cueOffsetSec: d.cueOffset,
          detailPps: d.detailPps || 50,
          accent: accentCss,
          tickColor: tickCss,
          gridBpm: d.fileBpm,
          beatGridOffsetSec: d.beatGridOffsetSec,
          showBeatTicks: settingsStore.settings.ui.showBeatTicks,
          devicePixelRatio: dpr,
          halfWindowSec: DETAIL_HALF_WINDOW_SEC * rate,
        });
      } else {
        ctx.clearRect(0, 0, pw, ph);
      }
    };

    return registerFrameDraw(draw);
  }, [accent, detail, empty, showTicks]);

  // Native pointer scrub — avoid React setState on pointerdown (breaks capture).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const halfWin = () => detailHalfWindowSec(deckRef.current.pitchOnlyRate);

    const onPointerDown = (e: PointerEvent) => {
      const d = deckRef.current;
      if (d.state === 'empty' || d.duration <= 0 || e.button !== 0) return;
      // Don't start scrub while a library HTML5 drag is active.
      if (isLibraryTrackDrag()) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      scrubRef.current = {
        pointerId: e.pointerId,
        lastX: e.clientX,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };
      el.classList.add('scrubbing');
    };

    const onPointerMove = (e: PointerEvent) => {
      const s = scrubRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      const d = deckRef.current;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      if (!s.moved && dx * dx + dy * dy > 9) s.moved = true;
      if (!s.moved) return;
      const rect = el.getBoundingClientRect();
      const dSec = (e.clientX - s.lastX) * detailSecPerPx(rect.width, halfWin());
      s.lastX = e.clientX;
      d.seek(d.position - dSec, { micro: true });
    };

    const endScrub = (e: PointerEvent) => {
      const s = scrubRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const d = deckRef.current;
      if (!s.moved && d.state !== 'empty' && d.duration > 0) {
        const rect = el.getBoundingClientRect();
        const t = detailTimeAtX(e.clientX, rect, d.visualPosSec, halfWin());
        d.seek(t, { micro: d.state === 'playing' });
      }
      scrubRef.current = null;
      el.classList.remove('scrubbing');
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endScrub);
    el.addEventListener('pointercancel', endScrub);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endScrub);
      el.removeEventListener('pointercancel', endScrub);
    };
  }, []);

  function onDoubleClick(e: ReactMouseEvent): void {
    const d = deck;
    if (d.state === 'empty' || d.duration <= 0) return;
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const t = detailTimeAtX(
      e.clientX,
      rect,
      d.visualPosSec,
      detailHalfWindowSec(d.pitchOnlyRate),
    );
    d.seek(t, { micro: false });
    if (d.state !== 'playing') d.setCueAtPlayhead();
  }

  function onDragOver(e: DragEvent): void {
    if (!isLibraryTrackDrag(e.dataTransfer)) return;
    if (playing) {
      e.dataTransfer.dropEffect = 'none';
      e.preventDefault();
      if (!dragOver) setDragOver(true);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!dragOver) setDragOver(true);
  }

  function onDragLeave(e: DragEvent): void {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setDragOver(false);
  }

  function onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (playing || deck.state === 'playing') {
      libraryStore.rejectLoad(`Deck ${deck.id} is playing — pause first`);
      return;
    }
    const id = parseLibraryTrackId(e.dataTransfer);
    if (id == null) return;
    void libraryStore.loadTrackId(deck, id).catch((err: unknown) => {
      console.warn('[waveform drop] load rejected', err);
    });
  }

  return (
    <div
      ref={wrapRef}
      className={`perf-wave-drop accent-${accent}${empty ? ' empty' : ''}${
        dragOver ? ' over' : ''
      }${playing ? ' locked' : ''}${!empty ? ' scrubbable' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDoubleClick={onDoubleClick}
    >
      <canvas
        className={`perf-wave detail accent-${accent}${empty ? ' empty' : ''}${
          detail ? '' : ' pending'
        }`}
        ref={canvasRef}
        role="img"
        aria-label={
          empty
            ? `Deck ${deck.id} empty — drop a track to load`
            : `Deck ${deck.id} waveform — drag to scrub, double-click to set cue when paused`
        }
      />
      {empty && !dragOver ? (
        <span className="perf-wave-drop-hint" aria-hidden>
          Drop track → Deck {deck.id}
        </span>
      ) : null}
      {dragOver ? (
        <span className="perf-wave-drop-hint active" aria-hidden>
          {playing ? `Deck ${deck.id} playing — pause first` : `Load Deck ${deck.id}`}
        </span>
      ) : null}
    </div>
  );
});
