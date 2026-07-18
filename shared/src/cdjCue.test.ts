import { describe, expect, it } from 'vitest';
import { resolveCueHoldEnd, resolveCueHoldStart, resolveCuePress } from './cdjCue.js';

describe('CDJ cue state table (R2.10)', () => {
  it('stopped, playhead ≠ cue: press sets cue', () => {
    expect(resolveCuePress('stopped', 4.2, 0)).toEqual({ kind: 'setCue', cueOffset: 4.2 });
  });

  it('stopped, playhead == cue: press is noop', () => {
    expect(resolveCuePress('stopped', 3, 3)).toEqual({ kind: 'noop' });
    expect(resolveCuePress('stopped', 3.0005, 3)).toEqual({ kind: 'noop' });
  });

  it('playing: press jumps to cue and stops', () => {
    expect(resolveCuePress('playing', 10, 2.5)).toEqual({
      kind: 'jumpAndStop',
      seekTo: 2.5,
    });
  });

  it('empty: press is noop', () => {
    expect(resolveCuePress('empty', 0, 0)).toEqual({ kind: 'noop' });
  });

  it('stopped: hold starts preview from cue', () => {
    expect(resolveCueHoldStart('stopped', 1.25)).toEqual({
      kind: 'previewFromCue',
      seekTo: 1.25,
    });
  });

  it('playing / empty: hold is noop', () => {
    expect(resolveCueHoldStart('playing', 1)).toEqual({ kind: 'noop' });
    expect(resolveCueHoldStart('empty', 0)).toEqual({ kind: 'noop' });
  });

  it('release while previewing: stop and snap to cue', () => {
    expect(resolveCueHoldEnd(true, 5)).toEqual({ kind: 'stopSnapCue', seekTo: 5 });
  });

  it('release without preview: noop', () => {
    expect(resolveCueHoldEnd(false, 5)).toEqual({ kind: 'noop' });
  });
});
