import { describe, expect, it } from 'vitest';
import { snapshotAudioBuffer } from './cloneAudioBuffer';

/** Minimal AudioBuffer stand-in for node tests (no Web Audio in vitest node env). */
function fakeBuffer(channels: Float32Array[], sampleRate = 44100) {
  return {
    numberOfChannels: channels.length,
    length: channels[0]!.length,
    sampleRate,
    duration: channels[0]!.length / sampleRate,
    getChannelData: (c: number) => channels[c]!,
  } as unknown as AudioBuffer;
}

describe('snapshotAudioBuffer', () => {
  it('copies channel data so teardown cannot mutate the snapshot', () => {
    const ch0 = new Float32Array([0.1, 0.2, 0.3]);
    const buf = fakeBuffer([ch0]);
    const snap = snapshotAudioBuffer(buf);
    ch0[0] = 9;
    expect(snap.channels[0]![0]).toBeCloseTo(0.1);
    expect(snap.sampleRate).toBe(44100);
    expect(snap.length).toBe(3);
  });
});
