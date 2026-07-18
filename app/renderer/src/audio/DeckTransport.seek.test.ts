import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DeckTransport,
  TRANSPORT_SEEK_CROSSFADE_SEC,
  TRANSPORT_SEEK_MICRO_CROSSFADE_SEC,
} from './DeckGraph';

type StubSource = {
  buffer: AudioBuffer | null;
  playbackRate: {
    value: number;
    cancelScheduledValues: ReturnType<typeof vi.fn>;
    setValueAtTime: ReturnType<typeof vi.fn>;
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
};

type StubGain = {
  gain: {
    value: number;
    cancelScheduledValues: ReturnType<typeof vi.fn>;
    setValueAtTime: ReturnType<typeof vi.fn>;
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

function stubCtx(): AudioContext & {
  sources: StubSource[];
  gains: StubGain[];
  advance: (sec: number) => void;
} {
  let now = 0;
  const sources: StubSource[] = [];
  const gains: StubGain[] = [];
  const ctx = {
    get currentTime() {
      return now;
    },
    createBufferSource: () => {
      const src: StubSource = {
        buffer: null,
        playbackRate: {
          value: 1,
          cancelScheduledValues: vi.fn(),
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
        onended: null,
      };
      sources.push(src);
      return src as unknown as AudioBufferSourceNode;
    },
    createGain: () => {
      const g: StubGain = {
        gain: {
          value: 1,
          cancelScheduledValues: vi.fn(),
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      gains.push(g);
      return g as unknown as GainNode;
    },
    sources,
    gains,
    advance(sec: number) {
      now += sec;
    },
  };
  return ctx as unknown as AudioContext & {
    sources: StubSource[];
    gains: StubGain[];
    advance: (sec: number) => void;
  };
}

function stubBuffer(duration: number): AudioBuffer {
  return {
    duration,
    length: Math.floor(duration * 44100),
    sampleRate: 44100,
    numberOfChannels: 2,
  } as AudioBuffer;
}

describe('DeckTransport playing seek crossfade (R2.2 / docs/03)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('while playing: fades out prior source and starts a new one (no cold kill)', () => {
    vi.useFakeTimers();
    const ctx = stubCtx();
    const dest = { connect: vi.fn() } as unknown as AudioNode;
    const t = new DeckTransport(ctx, dest);
    t.setBuffer(stubBuffer(30));
    t.play(1);

    expect(ctx.sources).toHaveLength(1);
    expect(ctx.gains).toHaveLength(1);
    const oldSrc = ctx.sources[0]!;
    const oldGain = ctx.gains[0]!;
    expect(oldSrc.stop).not.toHaveBeenCalled();

    t.seek(5);

    expect(ctx.sources).toHaveLength(2);
    expect(ctx.gains).toHaveLength(2);
    const newSrc = ctx.sources[1]!;
    const newGain = ctx.gains[1]!;

    // Old still alive during overlap — stop deferred past crossfade.
    expect(oldSrc.stop).not.toHaveBeenCalled();
    expect(oldGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      TRANSPORT_SEEK_CROSSFADE_SEC,
    );
    expect(newGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
    expect(newGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      1,
      TRANSPORT_SEEK_CROSSFADE_SEC,
    );
    expect(newSrc.start).toHaveBeenCalledWith(0, 5);
    expect(t.isPlaying).toBe(true);

    vi.advanceTimersByTime(Math.ceil(TRANSPORT_SEEK_CROSSFADE_SEC * 1000) + 12);
    expect(oldSrc.stop).toHaveBeenCalled();
    expect(oldSrc.disconnect).toHaveBeenCalled();
    expect(oldGain.disconnect).toHaveBeenCalled();
  });

  it('while stopped: updates offset without starting a source', () => {
    const ctx = stubCtx();
    const dest = { connect: vi.fn() } as unknown as AudioNode;
    const t = new DeckTransport(ctx, dest);
    t.setBuffer(stubBuffer(30));
    t.seek(8);
    expect(ctx.sources).toHaveLength(0);
    expect(t.isPlaying).toBe(false);
    expect(t.position()).toBe(8);
  });

  it('micro seek uses shorter crossfade', () => {
    vi.useFakeTimers();
    const ctx = stubCtx();
    const dest = { connect: vi.fn() } as unknown as AudioNode;
    const t = new DeckTransport(ctx, dest);
    t.setBuffer(stubBuffer(30));
    t.play(1);
    t.seek(5, { micro: true });
    const oldGain = ctx.gains[0]!;
    expect(oldGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      TRANSPORT_SEEK_MICRO_CROSSFADE_SEC,
    );
    expect(TRANSPORT_SEEK_MICRO_CROSSFADE_SEC).toBeLessThan(TRANSPORT_SEEK_CROSSFADE_SEC);
  });
});
