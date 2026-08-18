import { useState } from 'react';
import { collectFiles, type FileTreeNode } from '../lib/fileTree';

interface ScopePickerProps {
  tree: FileTreeNode;
  activeFiles: Set<string>;
  onSelect: (files: string[]) => void;
}

export function ScopePicker({ tree, activeFiles, onSelect }: ScopePickerProps) {
  const allFiles = collectFiles(tree);
  const allSelected = allFiles.length > 0 && allFiles.every((f) => activeFiles.has(f)) && activeFiles.size === allFiles.length;

  return (
    <div className="h-full overflow-y-auto border-r border-gray-200 bg-white p-3 text-sm">
      <p className="mb-2 px-2 text-xs font-medium tracking-wide text-gray-400 uppercase">Render scope</p>
      <button
        type="button"
        onClick={() => onSelect(allFiles)}
        className={`mb-1 w-full rounded px-2 py-1.5 text-left font-medium ${
          allSelected ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        All files ({allFiles.length})
      </button>
      {tree.children.map((child) => (
        <TreeItem key={child.path} node={child} depth={0} activeFiles={activeFiles} onSelect={onSelect} />
      ))}
    </div>
  );
}

interface TreeItemProps {
  node: FileTreeNode;
  depth: number;
  activeFiles: Set<string>;
  onSelect: (files: string[]) => void;
}

function TreeItem({ node, depth, activeFiles, onSelect }: TreeItemProps) {
  const [open, setOpen] = useState(depth < 1);
  const indent = { paddingLeft: `${depth * 14 + 8}px` };

  if (node.isFile) {
    const isActive = activeFiles.has(node.path);
    return (
      <button
        type="button"
        style={indent}
        onClick={() => onSelect([node.path])}
        className={`block w-full truncate rounded py-1 text-left ${
          isActive ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'
        }`}
        title={node.path}
      >
        {node.name}
      </button>
    );
  }

  const descendantFiles = collectFiles(node);
  const isActive = descendantFiles.length > 0 && descendantFiles.every((f) => activeFiles.has(f));

  return (
    <div>
      <div
        style={indent}
        className={`flex w-full items-center gap-1 rounded py-1 pr-2 ${
          isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-4 shrink-0 text-gray-400"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? '▾' : '▸'}
        </button>
        <button type="button" onClick={() => onSelect(descendantFiles)} className="truncate text-left font-medium">
          {node.name}/
        </button>
      </div>
      {open &&
        node.children.map((child) => (
          <TreeItem key={child.path} node={child} depth={depth + 1} activeFiles={activeFiles} onSelect={onSelect} />
        ))}
    </div>
  );
}
