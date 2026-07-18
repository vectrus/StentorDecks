import { describe, expect, it } from 'vitest';
import { BrowseStore } from './BrowseStore';

describe('BrowseStore fixture (R5.3)', () => {
  it('moves cursor and enters/leaves folders', () => {
    const b = new BrowseStore();
    expect(b.selected?.name).toBe('Techno');
    b.down();
    expect(b.selected?.name).toBe('Minimal');
    b.up();
    b.enter();
    expect(b.breadcrumb).toContain('Techno');
    expect(b.selected?.kind).toBe('track');
    b.parent();
    expect(b.pathLabels).toEqual(['Library']);
  });
});
