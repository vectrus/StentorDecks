import { makeAutoObservable } from 'mobx';

/**
 * Browse cursor fixture until E4 LibraryStore merges (E3 / R5.3).
 * Same actions MIDI and keyboard will share.
 */

export type BrowseEntry = {
  id: string;
  name: string;
  kind: 'folder' | 'track';
};

const ROOT: BrowseEntry[] = [
  { id: 'f-techno', name: 'Techno', kind: 'folder' },
  { id: 'f-minimal', name: 'Minimal', kind: 'folder' },
  { id: 'f-trance', name: 'Trance', kind: 'folder' },
  { id: 'f-chill', name: 'Chill', kind: 'folder' },
  { id: 't-demo-a', name: 'Demo Track A.mp3', kind: 'track' },
  { id: 't-demo-b', name: 'Demo Track B.mp3', kind: 'track' },
];

const FOLDER_CHILDREN: Record<string, BrowseEntry[]> = {
  'f-techno': [
    { id: 't-tec-1', name: 'Warehouse 01.flac', kind: 'track' },
    { id: 't-tec-2', name: 'Warehouse 02.flac', kind: 'track' },
  ],
  'f-minimal': [{ id: 't-min-1', name: 'Click Room.wav', kind: 'track' }],
  'f-trance': [{ id: 't-tra-1', name: 'Horizon.mp3', kind: 'track' }],
  'f-chill': [{ id: 't-chi-1', name: 'Afterglow.mp3', kind: 'track' }],
};

export class BrowseStore {
  pathLabels: string[] = ['Library'];
  private stack: BrowseEntry[][] = [ROOT];
  cursor = 0;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get entries(): BrowseEntry[] {
    return this.stack[this.stack.length - 1] ?? ROOT;
  }

  get selected(): BrowseEntry | null {
    return this.entries[this.cursor] ?? null;
  }

  get breadcrumb(): string {
    return this.pathLabels.join(' / ');
  }

  up(): void {
    this.cursor = Math.max(0, this.cursor - 1);
  }

  down(): void {
    this.cursor = Math.min(this.entries.length - 1, this.cursor + 1);
  }

  /** Right / enter folder (R5.3). */
  enter(): void {
    const sel = this.selected;
    if (!sel || sel.kind !== 'folder') return;
    const kids = FOLDER_CHILDREN[sel.id];
    if (!kids) return;
    this.stack.push(kids);
    this.pathLabels.push(sel.name);
    this.cursor = 0;
  }

  /** Left / parent folder. */
  parent(): void {
    if (this.stack.length <= 1) return;
    this.stack.pop();
    this.pathLabels.pop();
    this.cursor = 0;
  }
}
