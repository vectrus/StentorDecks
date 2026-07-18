import { describe, expect, it } from 'vitest';
import { hashPartialParts } from './partialHash';

describe('partialHash (R5.5 identity)', () => {
  it('is stable for same head/tail/size', () => {
    const head = new Uint8Array([1, 2, 3]);
    const tail = new Uint8Array([9, 8, 7]);
    expect(hashPartialParts(head, tail, 100)).toBe(hashPartialParts(head, tail, 100));
  });

  it('changes when size changes', () => {
    const head = new Uint8Array([1]);
    const tail = new Uint8Array([2]);
    expect(hashPartialParts(head, tail, 10)).not.toBe(hashPartialParts(head, tail, 11));
  });

  it('changes when head changes', () => {
    const a = hashPartialParts(new Uint8Array([1]), new Uint8Array([0]), 5);
    const b = hashPartialParts(new Uint8Array([2]), new Uint8Array([0]), 5);
    expect(a).not.toBe(b);
  });

  it('produces hex sha1 length', () => {
    const h = hashPartialParts(new Uint8Array([0]), new Uint8Array([0]), 1);
    expect(h).toMatch(/^[0-9a-f]{40}$/);
  });
});
