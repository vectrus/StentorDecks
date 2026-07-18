import { describe, expect, it } from 'vitest';
import { AudioEngine } from './AudioEngine';

describe('AudioEngine decode/rebuild guards', () => {
  it('waitForDecodes (via rebuild path) unblocks when endDecode balances beginDecode', async () => {
    const eng = new AudioEngine();
    eng.beginDecode();
    let released = false;
    const waiter = (eng as unknown as { waitForDecodes: () => Promise<void> }).waitForDecodes();
    void waiter.then(() => {
      released = true;
    });
    await Promise.resolve();
    expect(released).toBe(false);
    eng.endDecode();
    await waiter;
    expect(released).toBe(true);
  });

  it('epoch starts at 0 and begin/endDecode are reference-counted', () => {
    const eng = new AudioEngine();
    expect(eng.epoch).toBe(0);
    eng.beginDecode();
    eng.beginDecode();
    eng.endDecode();
    // still one in flight — private, but endDecode shouldn't throw
    eng.endDecode();
    eng.endDecode(); // extra end is clamped
  });
});
