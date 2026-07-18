export type AudioDeviceInfo = {
  deviceId: string;
  label: string;
  kind: 'audiooutput' | 'audioinput';
  maxChannelCount: number | null;
  groupId: string;
};

export type RoutingPlan = 'A' | 'B';

/**
 * Enumerate devices. Labels often empty until a user gesture unlocks the AudioContext.
 * Probes maxChannelCount via temporary AudioContext.setSinkId when possible.
 */
export async function enumerateAudioDevices(): Promise<AudioDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];

  // Nudge permission / labels in Chromium
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    /* outputs still enumerable; labels may be blank */
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const out: AudioDeviceInfo[] = [];

  for (const d of devices) {
    if (d.kind !== 'audiooutput' && d.kind !== 'audioinput') continue;
    let maxChannelCount: number | null = null;
    if (d.kind === 'audiooutput' && d.deviceId) {
      maxChannelCount = await probeMaxChannels(d.deviceId);
    }
    out.push({
      deviceId: d.deviceId,
      label: d.label || (d.kind === 'audiooutput' ? `Output ${d.deviceId.slice(0, 8)}` : `Input ${d.deviceId.slice(0, 8)}`),
      kind: d.kind,
      maxChannelCount,
      groupId: d.groupId,
    });
  }
  return out;
}

async function probeMaxChannels(deviceId: string): Promise<number | null> {
  if (typeof AudioContext === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx({ latencyHint: 'interactive' });
  try {
    const sinkId = (ctx as AudioContext & { setSinkId?: (id: string) => Promise<void> }).setSinkId;
    if (sinkId) {
      await sinkId.call(ctx, deviceId);
    }
    return ctx.destination.maxChannelCount;
  } catch {
    return null;
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

export function looksLikeRmx(label: string): boolean {
  const u = label.toUpperCase();
  return u.includes('RMX') || u.includes('HERCULES') || u.includes('DJCONSOLE');
}

/**
 * Select Plan A when master/cue are the same 4-ch device with channel pairs 0-1 / 2-3.
 * Otherwise Plan B (two stereo devices or forced).
 */
export function resolveRoutingPlan(opts: {
  preference: 'auto' | 'A' | 'B';
  masterDeviceId: string | null;
  cueDeviceId: string | null;
  masterChannels: [number, number];
  cueChannels: [number, number];
  devices: AudioDeviceInfo[];
}): { plan: RoutingPlan; reason: string } {
  if (opts.preference === 'A') return { plan: 'A', reason: 'Forced Plan A' };
  if (opts.preference === 'B') return { plan: 'B', reason: 'Forced Plan B' };

  const master = opts.devices.find((d) => d.deviceId === opts.masterDeviceId);
  if (!master || master.kind !== 'audiooutput') {
    return { plan: 'B', reason: 'No master device — defaulting Plan B' };
  }

  const sameDevice = opts.masterDeviceId === opts.cueDeviceId;
  const fourCh = (master.maxChannelCount ?? 0) >= 4;
  const masterStereo01 =
    opts.masterChannels[0] === 0 && opts.masterChannels[1] === 1;
  const cueStereo23 = opts.cueChannels[0] === 2 && opts.cueChannels[1] === 3;

  if (sameDevice && fourCh && masterStereo01 && cueStereo23) {
    return { plan: 'A', reason: 'Single 4-channel device, channels 1-2 / 3-4' };
  }

  return {
    plan: 'B',
    reason: sameDevice
      ? 'Same device but not 4-ch 1-2/3-4 layout'
      : 'Separate master/cue devices',
  };
}

export function suggestRmxDefaults(devices: AudioDeviceInfo[]): {
  masterDevice: string | null;
  cueDevice: string | null;
  masterChannels: [number, number];
  cueChannels: [number, number];
} {
  const outputs = devices.filter((d) => d.kind === 'audiooutput');
  const rmx = outputs.filter((d) => looksLikeRmx(d.label));
  const four = rmx.find((d) => (d.maxChannelCount ?? 0) >= 4) ?? outputs.find((d) => (d.maxChannelCount ?? 0) >= 4);

  if (four) {
    return {
      masterDevice: four.deviceId,
      cueDevice: four.deviceId,
      masterChannels: [0, 1],
      cueChannels: [2, 3],
    };
  }

  // Split stereo endpoints — prefer two RMX-labeled outs
  if (rmx.length >= 2) {
    return {
      masterDevice: rmx[0]!.deviceId,
      cueDevice: rmx[1]!.deviceId,
      masterChannels: [0, 1],
      cueChannels: [0, 1],
    };
  }

  const first = outputs[0]?.deviceId ?? null;
  return {
    masterDevice: first,
    cueDevice: first,
    masterChannels: [0, 1],
    cueChannels: [0, 1],
  };
}
