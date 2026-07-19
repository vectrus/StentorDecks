import { observer } from 'mobx-react-lite';
import { useState, type DragEvent } from 'react';
import type { DeckStore } from '../../stores/DeckStore';
import { libraryStore } from '../../stores/root';
import {
  isLibraryTrackDrag,
  parseLibraryTrackId,
} from '../../library/libraryTrackDrag';
import { fmtRemaining } from './fmt';

export const DeckStrip = observer(function DeckStrip(props: {
  deck: DeckStore;
  accent: 'a' | 'b';
}) {
  const { deck, accent } = props;
  const playing = deck.state === 'playing';
  const title = deck.title || (deck.state === 'empty' ? 'Empty' : 'Untitled');
  const bpm =
    deck.effectiveBpm != null
      ? deck.effectiveBpm.toFixed(1)
      : deck.fileBpm != null
        ? deck.fileBpm.toFixed(1)
        : '—';
  const [dragOver, setDragOver] = useState(false);

  function onDragOver(e: DragEvent): void {
    if (!isLibraryTrackDrag(e.dataTransfer)) return;
    if (playing) {
      e.dataTransfer.dropEffect = 'none';
      e.preventDefault();
      if (!dragOver) setDragOver(true);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!dragOver) setDragOver(true);
  }

  function onDragLeave(e: DragEvent): void {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setDragOver(false);
  }

  function onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (playing || deck.state === 'playing') {
      libraryStore.rejectLoad(`Deck ${deck.id} is playing — pause first`);
      return;
    }
    const id = parseLibraryTrackId(e.dataTransfer);
    if (id == null) return;
    void libraryStore.loadTrackId(deck, id).catch((err: unknown) => {
      console.warn('[deck strip drop] load rejected', err);
    });
  }

  return (
    <div
      className={`prep-strip prep-strip-${accent}${dragOver ? ' drop-over' : ''}${
        playing ? ' drop-locked' : ''
      }`}
      title={
        playing
          ? `Deck ${deck.id} playing — pause before loading`
          : `Drop a track here to load Deck ${deck.id}`
      }
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className="prep-strip-icon" aria-hidden>
        {playing ? '▶' : deck.state === 'stopped' ? '❚❚' : '○'}
      </span>
      <span className="prep-strip-title">{title}</span>
      <span className={`prep-strip-bpm mono accent-${accent}`}>{bpm}</span>
      <span className="prep-strip-rem mono">
        {deck.state === 'empty' ? '—' : fmtRemaining(deck.position, deck.duration)}
      </span>
    </div>
  );
});
