import { describe, expect, it, vi } from 'vitest';
import { DeckTransport } from './DeckGraph';

/** Minimal AudioContext stub so natural onended can be exercised (R2.11). */
function stubCtx(): AudioContext {
  let now = 0;
  const ctx = {
    get currentTime() {
      return now;
    },
    createBufferSource: () => {
      const src = {
        buffer: null as AudioBuffer | null,
        playbackRate: { value: 1, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
        onended: null as (() => void) | null,
      };
      return src as unknown as AudioBufferSourceNode;
    },
  };
  return Object.assign(ctx, {
    advance(sec: number) {
      now += sec;
    },
  }) as unknown as AudioContext;
}

function stubBuffer(duration: number): AudioBuffer {
  return { duration, length: Math.floor(duration * 44100), sampleRate: 44100, numberOfChannels: 2 } as AudioBuffer;
}

describe('DeckTransport natural end (R2.11)', () => {
  it('onended latches offset at duration so EOT tick can stop→cue', () => {
    const ctx = stubCtx();
    const dest = { connect: vi.fn() } as unknown as AudioNode;
    const t = new DeckTransport(ctx, dest);
    t.setBuffer(stubBuffer(10));
    t.play(1);

    const src = (t as unknown as { source: { onended: (() => void) | null } }).source;
    expect(src?.onended).toBeTypeOf('function');
    src!.onended!();

    expect(t.isPlaying).toBe(false);
    expect(t.position()).toBe(10);
  });
});
