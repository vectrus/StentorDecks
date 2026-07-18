/**
 * Track identity partial hash (docs/05 / R5.5):
 * SHA-1 of first 256 KiB + last 64 KiB + size (decimal ASCII).
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';

const HEAD_BYTES = 256 * 1024;
const TAIL_BYTES = 64 * 1024;

/** Pure — fixture-tested without touching disk. */
export function hashPartialParts(
  head: Uint8Array,
  tail: Uint8Array,
  size: number,
): string {
  const h = createHash('sha1');
  h.update(head);
  h.update(tail);
  h.update(String(size));
  return h.digest('hex');
}

/** Read head/tail from a file and hash. */
export async function computePartialHash(filePath: string): Promise<string> {
  const st = await fsp.stat(filePath);
  const size = st.size;
  if (size <= 0) return hashPartialParts(new Uint8Array(), new Uint8Array(), 0);

  const headLen = Math.min(HEAD_BYTES, size);
  const tailLen = Math.min(TAIL_BYTES, size);
  const fh = await fsp.open(filePath, 'r');
  try {
    const head = Buffer.alloc(headLen);
    await fh.read(head, 0, headLen, 0);
    const tail = Buffer.alloc(tailLen);
    const tailOffset = Math.max(0, size - tailLen);
    await fh.read(tail, 0, tailLen, tailOffset);
    return hashPartialParts(head, tail, size);
  } finally {
    await fh.close();
  }
}

/** Sync variant for scanner hot path when already in a sync walk. */
export function computePartialHashSync(filePath: string): string {
  const st = fs.statSync(filePath);
  const size = st.size;
  if (size <= 0) return hashPartialParts(new Uint8Array(), new Uint8Array(), 0);

  const headLen = Math.min(HEAD_BYTES, size);
  const tailLen = Math.min(TAIL_BYTES, size);
  const fd = fs.openSync(filePath, 'r');
  try {
    const head = Buffer.alloc(headLen);
    fs.readSync(fd, head, 0, headLen, 0);
    const tail = Buffer.alloc(tailLen);
    const tailOffset = Math.max(0, size - tailLen);
    fs.readSync(fd, tail, 0, tailLen, tailOffset);
    return hashPartialParts(head, tail, size);
  } finally {
    fs.closeSync(fd);
  }
}

export const PARTIAL_HASH_HEAD = HEAD_BYTES;
export const PARTIAL_HASH_TAIL = TAIL_BYTES;
