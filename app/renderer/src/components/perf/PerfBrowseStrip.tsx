import { observer } from 'mobx-react-lite';
import { useLayoutEffect, useRef, useState } from 'react';
import { deckA, deckB, libraryStore } from '../../stores/root';
import { mixReferenceKey } from '../../stores/mixReferenceKey';
import { KeyHint } from '../browse/KeyHint';
import { fmtBpm, fmtDur } from '../prep/fmt';

/** Row height matches R7.1 (≥42 px) — keep in sync with `.perf-row` in perf.css. */
const ROW_PX = 42;
const MIN_ROWS = 3;

/** Performance library — fills leftover height; windowed list around cursor. */
export const PerfBrowseStrip = observer(function PerfBrowseStrip() {
  const listRef = useRef<HTMLUListElement>(null);
  const [visibleCount, setVisibleCount] = useState(MIN_ROWS);

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
      : Math.max(0, Math.min(cursor - Math.floor((visibleCount - 1) / 2), entries.length - visibleCount));
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

      <div className="perf-head">
        <span className="perf-col track">Track</span>
        <span className="perf-col bpm">BPM</span>
        <span className="perf-col key">Key</span>
        <span className="perf-col time">Time</span>
      </div>

      <ul
        ref={listRef}
        className="perf-rows"
        role="listbox"
        tabIndex={0}
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
          return (
            <li
              key={entry.kind === 'folder' ? entry.path : entry.track.id}
              className={`perf-row${selected ? ' sel' : ''}${
                entry.kind === 'track' && entry.track.lowConfidence ? ' low' : ''
              }`}
              role="option"
              aria-selected={selected}
              onClick={() => libraryStore.selectIndex(index)}
              onDoubleClick={() => {
                libraryStore.selectIndex(index);
                if (entry.kind === 'folder') libraryStore.enter();
                else libraryStore.requestLoad(deckA);
              }}
            >
              {entry.kind === 'folder' ? (
                <>
                  <span className="perf-col track">[dir] {entry.name}</span>
                  <span className="perf-col bpm mono">…</span>
                  <span className="perf-col key mono">…</span>
                  <span className="perf-col time mono">…</span>
                </>
              ) : (
                <>
                  <span className="perf-col track">{entry.name}</span>
                  <span className="perf-col bpm mono">
                    {fmtBpm(entry.track.bpm, entry.track.lowConfidence)}
                  </span>
                  <KeyHint
                    className="perf-col key mono"
                    trackKey={entry.track.keyCamelot}
                    referenceKey={refKey}
                  />
                  <span className="perf-col time mono">{fmtDur(entry.track.durationMs)}</span>
                </>
              )}
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="perf-row empty">Search or open a folder in Prep · RMX2 browse works here</li>
        )}
      </ul>

      <div className="perf-brow-actions">
        <button type="button" onClick={() => libraryStore.parent()}>
          Parent
        </button>
        <button type="button" onClick={() => libraryStore.enter()}>
          Enter
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
    </section>
  );
});
