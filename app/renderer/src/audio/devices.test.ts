import { describe, expect, it } from 'vitest';
import {
  isVirtualDeviceId,
  looksLikeRmx,
  resolveRoutingPlan,
  suggestRmxDefaults,
} from './devices';

describe('routing plan probe', () => {
  const fourCh = {
    deviceId: 'rmx-4',
    label: 'DJConsole Rmx2',
    kind: 'audiooutput' as const,
    maxChannelCount: 4,
    groupId: 'g1',
  };
  const stereo = {
    deviceId: 'rmx-2',
    label: 'RMX2 Out 1-2',
    kind: 'audiooutput' as const,
    maxChannelCount: 2,
    groupId: 'g2',
  };

  it('detects RMX labels', () => {
    expect(looksLikeRmx('DJConsole Rmx2')).toBe(true);
    expect(looksLikeRmx('Speakers')).toBe(false);
  });

  it('auto → Plan A for same 4-ch device 0-1/2-3', () => {
    const r = resolveRoutingPlan({
      preference: 'auto',
      masterDeviceId: 'rmx-4',
      cueDeviceId: 'rmx-4',
      masterChannels: [0, 1],
      cueChannels: [2, 3],
      devices: [fourCh],
    });
    expect(r.plan).toBe('A');
  });

  it('auto → Plan B for stereo-only', () => {
    const r = resolveRoutingPlan({
      preference: 'auto',
      masterDeviceId: 'rmx-2',
      cueDeviceId: 'rmx-2',
      masterChannels: [0, 1],
      cueChannels: [0, 1],
      devices: [stereo],
    });
    expect(r.plan).toBe('B');
  });

  it('suggests 4-ch RMX for both master and cue', () => {
    const s = suggestRmxDefaults([fourCh, stereo]);
    expect(s.masterDevice).toBe('rmx-4');
    expect(s.cueDevice).toBe('rmx-4');
    expect(s.cueChannels).toEqual([2, 3]);
  });

  it('flags Chromium virtual endpoints', () => {
    expect(isVirtualDeviceId('default')).toBe(true);
    expect(isVirtualDeviceId('communications')).toBe(true);
    expect(isVirtualDeviceId('')).toBe(true);
    expect(isVirtualDeviceId(null)).toBe(true);
    expect(isVirtualDeviceId('rmx-4')).toBe(false);
  });

  it('never suggests virtual "Default –" endpoints (setSinkId rejects them)', () => {
    // Windows ordering: virtual default/communications first, real device last.
    const virtualDefault = {
      deviceId: 'default',
      label: 'Default - Headphones (Realtek)',
      kind: 'audiooutput' as const,
      maxChannelCount: 2,
      groupId: 'g0',
    };
    const comms = { ...virtualDefault, deviceId: 'communications', groupId: 'g0c' };
    const speakers = {
      deviceId: 'spk-1',
      label: 'Speakers (Realtek)',
      kind: 'audiooutput' as const,
      maxChannelCount: 2,
      groupId: 'g3',
    };
    const s = suggestRmxDefaults([virtualDefault, comms, speakers]);
    expect(s.masterDevice).toBe('spk-1');
    expect(s.cueDevice).toBe('spk-1');
  });
});
