import { describe, expect, it } from 'vitest';
import type fs from 'node:fs';
import { classifyWalkEntry } from './scanLibrary';

function dirent(partial: {
  name: string;
  directory?: boolean;
  file?: boolean;
}): Pick<fs.Dirent, 'name' | 'isDirectory' | 'isFile'> {
  return {
    name: partial.name,
    isDirectory: () => Boolean(partial.directory),
    isFile: () => Boolean(partial.file),
  };
}

describe('classifyWalkEntry (OneDrive / reparse)', () => {
  it('uses dirent flags when present', () => {
    expect(
      classifyWalkEntry(dirent({ name: 'Techno', directory: true }), 'C:\\m\\Techno', () => {
        throw new Error('stat should not run');
      }),
    ).toBe('dir');
    expect(
      classifyWalkEntry(dirent({ name: 'a.mp3', file: true }), 'C:\\m\\a.mp3', () => {
        throw new Error('stat should not run');
      }),
    ).toBe('file');
  });

  it('falls back to stat when dirent is neither file nor dir (cloud placeholder)', () => {
    const cloudy = dirent({ name: 'banger.mp3' }); // both false
    expect(
      classifyWalkEntry(cloudy, 'C:\\OneDrive\\banger.mp3', () =>
        ({
          isDirectory: () => false,
          isFile: () => true,
        }) as fs.Stats,
      ),
    ).toBe('file');

    const cloudyDir = dirent({ name: 'Sets' });
    expect(
      classifyWalkEntry(cloudyDir, 'C:\\OneDrive\\Sets', () =>
        ({
          isDirectory: () => true,
          isFile: () => false,
        }) as fs.Stats,
      ),
    ).toBe('dir');
  });

  it('skips dot-directories', () => {
    expect(
      classifyWalkEntry(dirent({ name: '.git', directory: true }), 'C:\\m\\.git', () => {
        throw new Error('unused');
      }),
    ).toBe('skip');
  });
});
