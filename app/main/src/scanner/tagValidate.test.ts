import { describe, expect, it } from 'vitest';
import { parseTagKey, validateTagBpm } from './tagValidate';

describe('tagValidate (R6.1 / R6.2)', () => {
  it('accepts BPM in 60–220', () => {
    expect(validateTagBpm(128)).toBe(128);
    expect(validateTagBpm('126.4')).toBe(126.4);
    expect(validateTagBpm(59)).toBeNull();
    expect(validateTagBpm(221)).toBeNull();
    expect(validateTagBpm('nope')).toBeNull();
  });

  it('parses Camelot and common note names', () => {
    expect(parseTagKey('8A')).toEqual({ camelot: '8A', name: '8A' });
    expect(parseTagKey('a minor')?.camelot).toBe('8A');
    expect(parseTagKey('garbage')).toBeNull();
  });
});
