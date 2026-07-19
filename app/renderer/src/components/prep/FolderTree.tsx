import { observer } from 'mobx-react-lite';
import { useEffect, useRef, type RefObject } from 'react';
import type { FolderNode } from '@stentordeck/shared';
import { libraryStore } from '../../stores/root';

function norm(p: string): string {
  return p.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
}

function folderLeafName(path: string | null): string {
  if (path == null) return 'All';
  const leaf = path.replace(/[/\\]+$/, '').split(/[/\\]/).pop();
  return leaf && leaf.length > 0 ? leaf : path;
}

export const FolderTree = observer(function FolderTree() {
  const open = libraryStore.openFolder;
  const roots = libraryStore.folders;
  const treeFocused = libraryStore.browsePane === 'tree';
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  // Keep the selected folder in view when MIDI/keyboard walks the tree (like the file list).
  useEffect(() => {
    const el = selectedRef.current;
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [
    open,
    libraryStore.treeCursor,
    libraryStore.visibleTreeRows.length,
    libraryStore.treeExpanded.size,
  ]);

  if (roots.length === 0) {
    return <div className="prep-tree-empty">No library roots</div>;
  }

  const selectedName = folderLeafName(open);
  const crumb = libraryStore.breadcrumb;

  return (
    <div className={`prep-tree-wrap${treeFocused ? ' pane-focused' : ''}`}>
      <div className="prep-tree-sel" title={crumb} aria-live="polite">
        <span className="prep-tree-sel-label">Folder</span>
        <span className="prep-tree-sel-name">{selectedName}</span>
      </div>
      <nav
        className="prep-tree"
        aria-label="Folder tree"
        onMouseDown={() => libraryStore.focusBrowsePane('tree')}
      >
        <button
          type="button"
          ref={open == null ? selectedRef : undefined}
          className={`prep-node${open == null && !libraryStore.search ? ' open' : ''}`}
          onClick={() => libraryStore.setOpenFolder(null)}
          title="Clear folder selection"
          aria-label="All folders"
        >
          <span className="prep-folder-icon">⌂</span>
          All
        </button>
        {roots.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            openPath={open}
            expanded={libraryStore.treeExpanded}
            selectedRef={selectedRef}
            onToggle={(path) => libraryStore.toggleTreeExpanded(path)}
            onSelect={(path) => libraryStore.selectTreePath(path)}
          />
        ))}
      </nav>
    </div>
  );
});

function TreeNode(props: {
  node: FolderNode;
  depth: number;
  openPath: string | null;
  expanded: Set<string>;
  selectedRef: RefObject<HTMLButtonElement | null>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  const { node, depth, openPath, expanded, selectedRef, onToggle, onSelect } = props;
  const hasKids = node.children.length > 0;
  const isOpen = openPath != null && norm(openPath) === norm(node.path);
  const isExp = expanded.has(node.path);

  return (
    <div>
      <button
        type="button"
        ref={isOpen ? selectedRef : undefined}
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
              selectedRef={selectedRef}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}
