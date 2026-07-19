import { describe, expect, it, vi } from 'vitest';
import { connectStereoToChannelPair } from './AudioEngine';

type FakeNode = { connect: ReturnType<typeof vi.fn> };

function fakeCtx(maxChannelCount: number) {
  const splitter: FakeNode = { connect: vi.fn() };
  const merger: FakeNode = { connect: vi.fn() };
  const destination = {
    maxChannelCount,
    channelCount: 2,
    channelCountMode: 'max',
  };
  const ctx = {
    destination,
    createChannelSplitter: vi.fn(() => splitter),
    createChannelMerger: vi.fn(() => merger),
  };
  return { ctx: ctx as unknown as AudioContext, destination, splitter, merger };
}

function fakeSource(): FakeNode & AudioNode {
  return { connect: vi.fn() } as unknown as FakeNode & AudioNode;
}

describe('connectStereoToChannelPair (Plan B multi-channel routing)', () => {
  it('routes [2,3] onto a 4-channel device via splitter → merger', () => {
    const { ctx, destination, splitter, merger } = fakeCtx(4);
    const src = fakeSource();
    const applied = connectStereoToChannelPair(ctx, src, [2, 3]);
    expect(applied).toBe(true);
    expect(destination.channelCount).toBe(4);
    expect(destination.channelCountMode).toBe('explicit');
    expect(src.connect).toHaveBeenCalledWith(splitter);
    expect(splitter.connect).toHaveBeenCalledWith(merger, 0, 2);
    expect(splitter.connect).toHaveBeenCalledWith(merger, 1, 3);
    expect(merger.connect).toHaveBeenCalledWith(destination);
  });

  it('plain stereo connect for the default [0,1] pair', () => {
    const { ctx, destination } = fakeCtx(4);
    const src = fakeSource();
    expect(connectStereoToChannelPair(ctx, src, [0, 1])).toBe(false);
    expect(src.connect).toHaveBeenCalledWith(destination);
    expect(destination.channelCount).toBe(2);
  });

  it('falls back when the device lacks the channels', () => {
    const { ctx, destination } = fakeCtx(2);
    const src = fakeSource();
    expect(connectStereoToChannelPair(ctx, src, [2, 3])).toBe(false);
    expect(src.connect).toHaveBeenCalledWith(destination);
  });

  it('falls back on invalid pairs', () => {
    const { ctx, destination } = fakeCtx(4);
    const src = fakeSource();
    expect(connectStereoToChannelPair(ctx, src, [2, 2])).toBe(false);
    expect(connectStereoToChannelPair(ctx, src, [-1, 3])).toBe(false);
    expect(src.connect).toHaveBeenCalledWith(destination);
  });
});
