/**
 * Unified Perf frame clock (R7.5 / E7): one rAF domain after deck ticks.
 * Waveform canvases register draw callbacks — no private rAF loops.
 */

export type FrameDrawFn = () => void;

const drawers = new Set<FrameDrawFn>();

/** Register a canvas draw; returns unsubscribe. */
export function registerFrameDraw(fn: FrameDrawFn): () => void {
  drawers.add(fn);
  return () => {
    drawers.delete(fn);
  };
}

/** Run all registered drawers (call once per root rAF after deck.tick). */
export function runFrameDraws(): void {
  for (const fn of drawers) {
    try {
      fn();
    } catch (err) {
      console.error('[frameClock] draw failed', err);
    }
  }
}

/** Output latency for visual playhead only (transport unchanged). */
let visualLatencySec = 0;

export function setVisualLatencySec(sec: number): void {
  visualLatencySec =
    Number.isFinite(sec) && sec > 0 ? Math.min(0.12, sec) : 0;
}

export function getVisualLatencySec(): number {
  return visualLatencySec;
}

/** Transport position → ear-aligned draw position. */
export function visualPositionSec(transportPosSec: number): number {
  return Math.max(0, transportPosSec - visualLatencySec);
}
