import { observer } from 'mobx-react-lite';
import type { FolderNode } from '@stentordeck/shared';
import { libraryStore } from '../../stores/root';

function norm(p: string): string {
  return p.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
}

export const FolderTree = observer(function FolderTree() {
  const open = libraryStore.openFolder;
  const roots = libraryStore.folders;
  const treeFocused = libraryStore.browsePane === 'tree';

  if (roots.length === 0) {
    return <div className="prep-tree-empty">No library roots</div>;
  }

  return (
    <nav
      className={`prep-tree${treeFocused ? ' pane-focused' : ''}`}
      aria-label="Folder tree"
      onMouseDown={() => libraryStore.focusBrowsePane('tree')}
    >
      <button
        type="button"
        className={`prep-node${open == null && !libraryStore.search ? ' open' : ''}`}
        onClick={() => libraryStore.setOpenFolder(null)}
        title="Clear folder selection"
      >
        <span className="prep-folder-icon">⌂</span>
        Library
      </button>
      {roots.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          openPath={open}
          expanded={libraryStore.treeExpanded}
          onToggle={(path) => libraryStore.toggleTreeExpanded(path)}
          onSelect={(path) => libraryStore.selectTreePath(path)}
        />
      ))}
    </nav>
  );
});

function TreeNode(props: {
  node: FolderNode;
  depth: number;
  openPath: string | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  const { node, depth, openPath, expanded, onToggle, onSelect } = props;
  const hasKids = node.children.length > 0;
  const isOpen = openPath != null && norm(openPath) === norm(node.path);
  const isExp = expanded.has(node.path);

  return (
    <div>
      <button
        type="button"
        className={`prep-node${isOpen ? ' open' : ''}${depth > 0 ? ' child' : ''}`}
        style={{ paddingLeft: `${0.5 + depth * 0.85}rem` }}
        onClick={() => onSelect(node.path)}
      >
        {hasKids ? (
          <span
            className="prep-twist"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.path);
            }}
            role="presentation"
          >
            {isExp ? '▾' : '▸'}
          </span>
        ) : (
          <span className="prep-twist spacer" />
        )}
        <span className="prep-folder-icon">{isOpen ? '▸' : '·'}</span>
        <span className="prep-node-label">{node.name}</span>
      </button>
      {hasKids && isExp
        ? node.children.map((c) => (
            <TreeNode
              key={c.path}
              node={c}
              depth={depth + 1}
              openPath={openPath}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}
