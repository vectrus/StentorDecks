import { rampParam } from './ramp';

/** Play L then R test tones (440 / 880 Hz) on a stereo bus for ~0.4s each. */
export async function playStereoTestTone(
  ctx: AudioContext,
  destination: AudioNode,
  opts?: { leftHz?: number; rightHz?: number; durationSec?: number },
): Promise<void> {
  const leftHz = opts?.leftHz ?? 440;
  const rightHz = opts?.rightHz ?? 880;
  const dur = opts?.durationSec ?? 0.35;

  await playOne(ctx, destination, leftHz, 0, dur);
  await sleep(80);
  await playOne(ctx, destination, rightHz, 1, dur);
}

async function playOne(
  ctx: AudioContext,
  destination: AudioNode,
  hz: number,
  channel: 0 | 1,
  dur: number,
): Promise<void> {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const merger = ctx.createChannelMerger(2);
  osc.type = 'sine';
  osc.frequency.value = hz;
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(merger, 0, channel);
  merger.connect(destination);

  const t0 = ctx.currentTime;
  rampParam(gain.gain, 0.2, ctx, 0.02);
  osc.start(t0);
  gain.gain.setTargetAtTime(0, t0 + dur, 0.02);
  osc.stop(t0 + dur + 0.08);

  await sleep((dur + 0.1) * 1000);
  try {
    osc.disconnect();
    gain.disconnect();
    merger.disconnect();
  } catch {
    /* ignore */
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
