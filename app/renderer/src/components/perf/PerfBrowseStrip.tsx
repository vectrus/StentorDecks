import { observer } from 'mobx-react-lite';
import { useLayoutEffect, useRef, useState } from 'react';
import { deckA, deckB, libraryStore, sessionPlayedStore } from '../../stores/root';
import { mixReferenceKey } from '../../stores/mixReferenceKey';
import { KeyHint } from '../browse/KeyHint';
import {
  TrackContextMenu,
  type TrackContextTarget,
} from '../browse/TrackContextMenu';
import { FolderTree } from '../prep/FolderTree';
import { fmtBpm, fmtDur } from '../prep/fmt';

/** Row height matches R7.1 (≥42 px) — keep in sync with `.perf-row` in perf.css. */
const ROW_PX = 42;
const MIN_ROWS = 3;

/**
 * Performance library — Djuced-style two panes:
 * small folder tree (left) + track list (right).
 */
export const PerfBrowseStrip = observer(function PerfBrowseStrip() {
  const listRef = useRef<HTMLUListElement>(null);
  const [visibleCount, setVisibleCount] = useState(MIN_ROWS);
  const [ctx, setCtx] = useState<TrackContextTarget | null>(null);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = (): void => {
      const h = el.clientHeight;
      const n = Math.max(MIN_ROWS, Math.floor(h / ROW_PX));
      setVisibleCount(n);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const entries = libraryStore.entries;
  const cursor = libraryStore.cursor;
  const start =
    entries.length === 0
      ? 0
      : Math.max(
          0,
          Math.min(cursor - Math.floor((visibleCount - 1) / 2), entries.length - visibleCount),
        );
  const visible = entries.slice(start, start + visibleCount);
  const analyzing = libraryStore.analyzingCount;
  const refKey = mixReferenceKey(deckA, deckB);

  return (
    <section className="perf-brow" aria-label="Library browser">
      <div className="perf-bh">
        <label className="perf-search">
          <span className="perf-search-ico" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            placeholder="Search library…"
            value={libraryStore.search}
            onChange={(e) => libraryStore.setSearch(e.target.value)}
          />
        </label>
        <span className="mono perf-summary">
          {libraryStore.trackCount.toLocaleString()} tracks
          {analyzing > 0 ? ` · ${analyzing} analyzing` : ''}
          {libraryStore.breadcrumb ? ` · ${libraryStore.breadcrumb}` : ''}
        </span>
      </div>

      <div className="perf-brow-split">
        <aside className="perf-tree-panel sd-scroll" aria-label="Folders">
          <FolderTree />
        </aside>

        <div className="perf-brow-files">
          <div className="perf-head">
            <span className="perf-col track">Track</span>
            <span className="perf-col bpm">BPM</span>
            <span className="perf-col key">Key</span>
            <span className="perf-col time">Time</span>
          </div>

          <ul
            ref={listRef}
            className={`perf-rows sd-scroll${libraryStore.browsePane === 'files' ? ' pane-focused' : ''}`}
            role="listbox"
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
            {visible.map((entry) => {
              const index = entries.indexOf(entry);
              const selected = index === cursor;
              if (entry.kind !== 'track') return null;
              const played = sessionPlayedStore.isPlayed(entry.track.id);
              return (
                <li
                  key={entry.track.id}
                  className={`perf-row${selected ? ' sel' : ''}${
                    entry.track.lowConfidence ? ' low' : ''
                  }${played ? ' played' : ''}`}
                  role="option"
                  aria-selected={selected}
                  onClick={() => libraryStore.selectIndex(index)}
                  onDoubleClick={() => {
                    libraryStore.selectIndex(index);
                    libraryStore.requestLoad(deckA);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    libraryStore.selectIndex(index);
                    setCtx({
                      trackId: entry.track.id,
                      path: entry.track.path,
                      clientX: e.clientX,
                      clientY: e.clientY,
                    });
                  }}
                >
                  <span className="perf-col track">
                    {played ? (
                      <span className="played-mark" aria-label="Played this session">
                        ✓
                      </span>
                    ) : null}
                    {entry.name}
                  </span>
                  <span className="perf-col bpm mono">
                    {fmtBpm(entry.track.bpm, entry.track.lowConfidence)}
                  </span>
                  <KeyHint
                    className="perf-col key mono"
                    trackKey={entry.track.keyCamelot}
                    referenceKey={refKey}
                  />
                  <span className="perf-col time mono">{fmtDur(entry.track.durationMs)}</span>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="perf-row empty">
                {libraryStore.search.trim()
                  ? 'No matches'
                  : libraryStore.openFolder == null
                    ? 'Select a folder on the left'
                    : 'No tracks in this folder'}
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="perf-brow-actions">
        <button
          type="button"
          onClick={() => libraryStore.parent()}
          title="Focus folders, or collapse / parent folder"
        >
          Left
        </button>
        <button
          type="button"
          onClick={() => libraryStore.enter()}
          title="Expand folder, or focus track list"
        >
          Right
        </button>
        <button
          type="button"
          disabled={!libraryStore.selectedTrack}
          onClick={() => libraryStore.requestLoad(deckA)}
        >
          Load A
        </button>
        <button
          type="button"
          disabled={!libraryStore.selectedTrack}
          onClick={() => libraryStore.requestLoad(deckB)}
        >
          Load B
        </button>
        {libraryStore.loadError ? (
          <span className="mono hint">{libraryStore.loadError}</span>
        ) : null}
      </div>
      <TrackContextMenu target={ctx} onClose={() => setCtx(null)} />
    </section>
  );
});
