import { observer } from 'mobx-react-lite';
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
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
 * Scrolling detail strip — fixed center playhead via CSS; canvas scrolls under it.
 * Drawn from the shared frame clock (same rAF as transport tick). R7.5 / E7.
 * Mouse: drag scrub / click seek (jog substitute, R1.5); double-click sets cue when paused.
 * Drop library tracks to load (R4.1) — blocked while playing (R4.2).
 */
export const DetailWaveform = observer(function DetailWaveform({ deck, accent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<ScrubSession | null>(null);
  const detail = deck.detailWaveform;
  const empty = deck.state === 'empty';
  const playing = deck.state === 'playing';
  const showTicks = settingsStore.settings.ui.showBeatTicks;
  const [dragOver, setDragOver] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

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
      const blob = deck.detailWaveform;
      if (blob && deck.state !== 'empty' && deck.duration > 0) {
        const rate = Math.min(4, Math.max(0.25, deck.pitchOnlyRate || 1));
        drawDetailWaveform(ctx, blob, {
          width: pw,
          height: ph,
          positionSec: deck.visualPosSec,
          durationSec: deck.duration,
          cueOffsetSec: deck.cueOffset,
          detailPps: deck.detailPps || 50,
          accent: accentCss,
          tickColor: tickCss,
          gridBpm: deck.fileBpm,
          beatGridOffsetSec: deck.beatGridOffsetSec,
          showBeatTicks: settingsStore.settings.ui.showBeatTicks,
          devicePixelRatio: dpr,
          halfWindowSec: DETAIL_HALF_WINDOW_SEC * rate,
        });
      } else {
        ctx.clearRect(0, 0, pw, ph);
      }
    };

    return registerFrameDraw(draw);
  }, [deck, accent, detail, empty, showTicks]);

  function halfWin(): number {
    return detailHalfWindowSec(deck.pitchOnlyRate);
  }

  function seekAtClientX(clientX: number, micro: boolean): void {
    const el = wrapRef.current;
    if (!el || deck.state === 'empty' || deck.duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const t = detailTimeAtX(clientX, rect, deck.visualPosSec, halfWin());
    deck.seek(t, { micro });
  }

  function onPointerDown(e: ReactPointerEvent): void {
    if (empty || deck.duration <= 0 || e.button !== 0) return;
    // Don't steal library HTML5 drags — those use drag events, not primary scrub.
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubRef.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    setScrubbing(true);
  }

  function onPointerMove(e: ReactPointerEvent): void {
    const s = scrubRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const el = wrapRef.current;
    if (!el) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved && dx * dx + dy * dy > 9) s.moved = true;
    if (!s.moved) return;
    const rect = el.getBoundingClientRect();
    const dSec = (e.clientX - s.lastX) * detailSecPerPx(rect.width, halfWin());
    s.lastX = e.clientX;
    // Drag right → earlier time under fixed playhead (jog-like).
    deck.seek(deck.position - dSec, { micro: true });
  }

  function endScrub(e: ReactPointerEvent): void {
    const s = scrubRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (!s.moved) {
      // Click: put that sample under the playhead.
      seekAtClientX(e.clientX, playing);
    }
    scrubRef.current = null;
    setScrubbing(false);
  }

  function onDoubleClick(e: ReactMouseEvent): void {
    if (empty || deck.duration <= 0) return;
    seekAtClientX(e.clientX, false);
    // Pause path: set cue at the new playhead (R2.10 / R1.5 — no jog needed).
    if (deck.state !== 'playing') {
      deck.setCueAtPlayhead();
    }
  }

  function onDragOver(e: DragEvent): void {
    if (!isLibraryTrackDrag(e.dataTransfer)) return;
    // R4.2: playing deck is not a drop target (no-drop cursor).
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
    // R4.2 — never load into a playing channel (also guarded in loadTrackId).
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
      }${playing ? ' locked' : ''}${scrubbing ? ' scrubbing' : ''}${
        !empty ? ' scrubbable' : ''
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endScrub}
      onPointerCancel={endScrub}
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
