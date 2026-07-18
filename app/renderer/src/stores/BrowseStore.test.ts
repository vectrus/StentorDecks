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

  it('requestLoad sets pending only for tracks', () => {
    const b = new BrowseStore();
    b.requestLoad('A'); // folder selected
    expect(b.pendingLoad).toBeNull();
    b.down();
    b.down();
    b.down();
    b.down(); // Demo Track A
    expect(b.selected?.kind).toBe('track');
    b.requestLoad('B');
    expect(b.pendingLoad?.deckId).toBe('B');
    expect(b.pendingLoad?.entry.name).toContain('Demo Track');
    b.clearPendingLoad();
    expect(b.pendingLoad).toBeNull();
  });
});
