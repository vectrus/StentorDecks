/**
 * Classic CDJ cue state table (R2.10 / docs/03).
 * Pure — unit-tested; DeckStore applies the resulting actions to transport.
 *
 * Owner correction 2026-07-18: while playing, Cue jumps to cue point and STOPS
 * (Pioneer-style), not jump-and-continue.
 */

export type CueDeckState = 'empty' | 'stopped' | 'playing';

const CUE_EPS = 0.001;

export type CuePressAction =
  | { kind: 'noop' }
  | { kind: 'setCue'; cueOffset: number }
  | { kind: 'jumpAndStop'; seekTo: number };

export type CueHoldStartAction =
  | { kind: 'noop' }
  | { kind: 'previewFromCue'; seekTo: number };

export type CueHoldEndAction =
  | { kind: 'noop' }
  | { kind: 'stopSnapCue'; seekTo: number };

export function resolveCuePress(
  state: CueDeckState,
  playhead: number,
  cueOffset: number,
): CuePressAction {
  if (state === 'empty') return { kind: 'noop' };
  if (state === 'playing') {
    return { kind: 'jumpAndStop', seekTo: cueOffset };
  }
  // stopped/paused
  if (Math.abs(playhead - cueOffset) > CUE_EPS) {
    return { kind: 'setCue', cueOffset: playhead };
  }
  return { kind: 'noop' }; // already at cue
}

export function resolveCueHoldStart(state: CueDeckState, cueOffset: number): CueHoldStartAction {
  if (state === 'empty' || state === 'playing') return { kind: 'noop' };
  return { kind: 'previewFromCue', seekTo: cueOffset };
}

export function resolveCueHoldEnd(cuePreviewing: boolean, cueOffset: number): CueHoldEndAction {
  if (!cuePreviewing) return { kind: 'noop' };
  return { kind: 'stopSnapCue', seekTo: cueOffset };
}
