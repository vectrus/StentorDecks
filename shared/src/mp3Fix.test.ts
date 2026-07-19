import { describe, expect, it } from 'vitest';
import {
  FIXED_BY_SD_MARK,
  encodeWavPcm16le,
  fixedSiblingWavPath,
  uniqueFixedSiblingWavPath,
  withFixedBySdTitle,
} from './mp3Fix.js';

describe('mp3Fix (R5.9)', () => {
  it('builds sibling WAV path with Fixed by SD mark', () => {
    expect(fixedSiblingWavPath('C:\\Music\\techno\\banger.mp3')).toBe(
      `C:\\Music\\techno\\banger${FIXED_BY_SD_MARK}.wav`,
    );
    expect(fixedSiblingWavPath('/music/banger.MP3')).toBe(
      `/music/banger${FIXED_BY_SD_MARK}.wav`,
    );
  });

  it('does not double-append the mark', () => {
    const once = fixedSiblingWavPath(`C:\\a\\x${FIXED_BY_SD_MARK}.mp3`);
    expect(once).toBe(`C:\\a\\x${FIXED_BY_SD_MARK}.wav`);
  });

  it('uniqueFixedSiblingWavPath bumps when file exists', () => {
    const exists = (p: string) =>
      p.endsWith(`${FIXED_BY_SD_MARK}.wav`) && !p.includes(' 2.');
    const p = uniqueFixedSiblingWavPath('C:\\Music\\a.mp3', exists);
    expect(p).toBe(`C:\\Music\\a${FIXED_BY_SD_MARK} 2.wav`);
  });

  it('withFixedBySdTitle', () => {
    expect(withFixedBySdTitle('Phenomenal', 'file')).toBe(`Phenomenal${FIXED_BY_SD_MARK}`);
    expect(withFixedBySdTitle(`Already${FIXED_BY_SD_MARK}`, 'file')).toContain('Fixed by SD');
  });

  it('encodeWavPcm16le writes RIFF header + samples', () => {
    const L = new Float32Array([0, 0.5, -0.5, 1]);
    const R = new Float32Array([0, -0.5, 0.5, -1]);
    const wav = encodeWavPcm16le({
      sampleRate: 44100,
      numberOfChannels: 2,
      channelData: [L, R],
    });
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
    expect(wav.byteLength).toBe(44 + 4 * 2 * 2);
  });
});
