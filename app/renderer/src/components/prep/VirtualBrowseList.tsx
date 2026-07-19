import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import type { LibraryBrowseEntry } from '../../stores/LibraryStore';
import { mixReferenceKey } from '../../stores/mixReferenceKey';
import { deckA, deckB, libraryStore, sessionPlayedStore } from '../../stores/root';
import { KeyHint } from '../browse/KeyHint';
import {
  TrackContextMenu,
  type TrackContextTarget,
} from '../browse/TrackContextMenu';
import { setLibraryTrackDragData } from '../../library/libraryTrackDrag';
import { fmtBpm, fmtDur } from './fmt';

/** docs/06 — browser row 42 px at 16 px type */
const ROW_H = 42;
const OVERSCAN = 8;

export const VirtualBrowseList = observer(function VirtualBrowseList() {
  const entries = libraryStore.entries;
  const cursor = libraryStore.cursor;
  const refKey = mixReferenceKey(deckA, deckB);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(400);
  const [ctx, setCtx] = useState<TrackContextTarget | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewH(el.clientHeight));
    ro.observe(el);
    setViewH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const top = cursor * ROW_H;
    const bottom = top + ROW_H;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (bottom > el.scrollTop + el.clientHeight) {
      el.scrollTop = bottom - el.clientHeight;
    }
  }, [cursor, entries.length]);

  const totalH = entries.length * ROW_H;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const visible = Math.ceil(viewH / ROW_H) + OVERSCAN * 2;
  const end = Math.min(entries.length, start + visible);
  const slice = entries.slice(start, end);

  return (
    <div
      className={`prep-virt sd-scroll${libraryStore.browsePane === 'files' ? ' pane-focused' : ''}`}
      ref={scrollerRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      role="listbox"
      aria-label="Tracks"
      tabIndex={0}
      onMouseDown={() => libraryStore.focusBrowsePane('files')}
      onFocus={() => libraryStore.focusBrowsePane('files')}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          libraryStore.down();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          libraryStore.up();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          libraryStore.enter();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          libraryStore.parent();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          libraryStore.requestLoad(deckA);
        }
      }}
    >
      <div className="prep-virt-inner" style={{ height: totalH }}>
        {slice.map((entry, i) => {
          const index = start + i;
          return (
            <BrowseRow
              key={entry.kind === 'folder' ? entry.path : entry.track.id}
              entry={entry}
              index={index}
              selected={index === cursor}
              offsetY={index * ROW_H}
              referenceKey={refKey}
              onContextTrack={(t) => setCtx(t)}
            />
          );
        })}
      </div>
      {entries.length === 0 && (
        <div className="prep-empty">
          {libraryStore.search.trim()
            ? 'No matches'
            : libraryStore.openFolder == null
              ? 'Select a folder on the left'
              : 'No tracks in this folder'}
        </div>
      )}
      <TrackContextMenu target={ctx} onClose={() => setCtx(null)} />
    </div>
  );
});

const BrowseRow = observer(function BrowseRow(props: {
  entry: LibraryBrowseEntry;
  index: number;
  selected: boolean;
  offsetY: number;
  referenceKey: string | null;
  onContextTrack: (t: TrackContextTarget) => void;
}) {
  const { entry, index, selected, offsetY, referenceKey, onContextTrack } = props;
  const played =
    entry.kind === 'track' && sessionPlayedStore.isPlayed(entry.track.id);
  return (
    <div
      className={`prep-row${selected ? ' sel' : ''}${
        entry.kind === 'track' && entry.track.lowConfidence ? ' low' : ''
      }${played ? ' played' : ''}`}
      style={{ top: offsetY, height: ROW_H }}
      role="option"
      aria-selected={selected}
      draggable={entry.kind === 'track'}
      title={
        entry.kind === 'track'
          ? 'Double-click → Load A · drag onto a waveform to load'
          : undefined
      }
      onDragStart={(e) => {
        if (entry.kind !== 'track') return;
        libraryStore.selectIndex(index);
        setLibraryTrackDragData(e.dataTransfer, entry.track.id);
      }}
      onClick={() => libraryStore.selectIndex(index)}
      onDoubleClick={() => {
        libraryStore.selectIndex(index);
        if (entry.kind === 'folder') libraryStore.enter();
        else libraryStore.requestLoad(deckA);
      }}
      onContextMenu={(e) => {
        if (entry.kind !== 'track') return;
        e.preventDefault();
        libraryStore.selectIndex(index);
        onContextTrack({
          trackId: entry.track.id,
          path: entry.track.path,
          clientX: e.clientX,
          clientY: e.clientY,
        });
      }}
    >
      {entry.kind === 'folder' ? (
        <>
          <span className="prep-col track">[dir] {entry.name}</span>
          <span className="prep-col bpm mono">…</span>
          <span className="prep-col key mono">…</span>
          <span className="prep-col time mono">…</span>
        </>
      ) : (
        <>
          <span className="prep-col track">
            {played ? (
              <span className="played-mark" aria-label="Played this session">
                ✓
              </span>
            ) : null}
            {entry.name}
          </span>
          <span className="prep-col bpm mono">
            {fmtBpm(entry.track.bpm, entry.track.lowConfidence)}
          </span>
          <KeyHint
            className="prep-col key mono"
            trackKey={entry.track.keyCamelot}
            referenceKey={referenceKey}
          />
          <span className="prep-col time mono">{fmtDur(entry.track.durationMs)}</span>
        </>
      )}
    </div>
  );
});
