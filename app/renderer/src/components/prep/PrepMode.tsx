import { observer } from 'mobx-react-lite';
import { deckA, deckB, libraryStore } from '../../stores/root';
import { CorrectionStrip } from './CorrectionStrip';
import { DeckStrip } from './DeckStrip';
import { FolderTree } from './FolderTree';
import { VirtualBrowseList } from './VirtualBrowseList';

/** Prep mode library browser — docs/06 + mockup 02 (E4). */
export const PrepMode = observer(function PrepMode() {
  return (
    <div className="prep">
      <div className="prep-strips">
        <DeckStrip deck={deckA} accent="a" />
        <DeckStrip deck={deckB} accent="b" />
      </div>

      <div className="prep-main">
        <aside className="prep-tree-panel">
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
            <span>Encoder: up/down browse · right open · left back</span>
            <span>
              Load: deck buttons
              {libraryStore.loadError ? ` · ${libraryStore.loadError}` : ''}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
});
