import { observer } from 'mobx-react-lite';
import { deckA, deckB, libraryStore, sessionPlayedStore } from '../../stores/root';
import { CorrectionStrip } from './CorrectionStrip';
import { DeckStrip } from './DeckStrip';
import { FolderTree } from './FolderTree';
import { NextUpStrip } from './NextUpStrip';
import { VirtualBrowseList } from './VirtualBrowseList';

/** Prep mode library browser — docs/06 + mockup 02 (E4). */
export const PrepMode = observer(function PrepMode() {
  return (
    <div className="prep">
      <div className="prep-strips">
        <DeckStrip deck={deckA} accent="a" />
        <DeckStrip deck={deckB} accent="b" />
      </div>

      <NextUpStrip />

      <div className="prep-main">
        <aside className="prep-tree-panel sd-scroll">
          <FolderTree />
        </aside>

        <section className="prep-list-panel">
          <div className="prep-crumb">
            <span className="prep-crumb-path">{libraryStore.breadcrumb}</span>
            <label className="prep-search">
              <span className="prep-search-label">Search</span>
              <input
                type="search"
                placeholder="artist / title…"
                value={libraryStore.search}
                onChange={(e) => libraryStore.setSearch(e.target.value)}
              />
            </label>
          </div>

          <div className="prep-head">
            <span className="prep-col track">Track</span>
            <span className="prep-col bpm">BPM</span>
            <span className="prep-col key">Key</span>
            <span className="prep-col time">Time</span>
          </div>

          <VirtualBrowseList />

          <CorrectionStrip />

          <div className="prep-foot">
            <span>Folders left · tracks right · encoder: up/down · right=subfolder · left=parent</span>
            <span>
              Load: deck buttons
              {libraryStore.loadError ? ` · ${libraryStore.loadError}` : ''}
              {sessionPlayedStore.playedCount > 0
                ? ` · ${sessionPlayedStore.playedCount} played`
                : ''}
            </span>
            <button
              type="button"
              className="prep-clear-played"
              disabled={sessionPlayedStore.playedCount === 0}
              onClick={() => sessionPlayedStore.clear()}
              title="Clear session played marks (R5.8)"
            >
              Clear session played
            </button>
          </div>
        </section>
      </div>
    </div>
  );
});
