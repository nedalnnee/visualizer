import { useMemo, useState } from 'react';
import { collectFiles, filterTree, type FileTreeNode } from '../lib/fileTree';
import { SvgFolder, SvgFile, SvgSearch } from './Icons';

interface ScopePickerProps {
  tree: FileTreeNode;
  activeFiles: Set<string>;
  onSelect: (files: string[]) => void;
}

export function ScopePicker({ tree, activeFiles, onSelect }: ScopePickerProps) {
  const [query, setQuery] = useState('');
  const allFiles = collectFiles(tree);
  const allSelected = allFiles.length > 0 && allFiles.every((f) => activeFiles.has(f)) && activeFiles.size === allFiles.length;

  const filteredTree = useMemo(() => filterTree(tree, query), [tree, query]);
  const isFiltering = query.trim().length > 0;

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200 text-xs border-r border-slate-800">
      {/* Top Header & Search */}
      <div className="shrink-0 p-3.5 border-b border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Files & Scope
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            {activeFiles.size}/{allFiles.length} active
          </span>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500">
            <SvgSearch className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter files..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Batch Actions */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => onSelect(allFiles)}
            className={`flex-1 rounded-lg px-2.5 py-1 text-center font-medium transition ${
              allSelected
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            All Files ({allFiles.length})
          </button>
          <button
            type="button"
            onClick={() => onSelect([])}
            className="rounded-lg bg-slate-900 px-2.5 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            title="Deselect all files"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-[11px]">
        {filteredTree === null ? (
          <div className="p-4 text-center text-slate-500 italic">
            No files match "{query}"
          </div>
        ) : (
          filteredTree.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={0}
              activeFiles={activeFiles}
              onSelect={onSelect}
              forceOpen={isFiltering}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TreeItemProps {
  node: FileTreeNode;
  depth: number;
  activeFiles: Set<string>;
  onSelect: (files: string[]) => void;
  forceOpen?: boolean;
}

function TreeItem({ node, depth, activeFiles, onSelect, forceOpen }: TreeItemProps) {
  const [openState, setOpenState] = useState(depth < 1);
  const open = forceOpen || openState;
  const indent = { paddingLeft: `${depth * 12 + 6}px` };

  if (node.isFile) {
    const isActive = activeFiles.has(node.path);
    return (
      <button
        type="button"
        style={indent}
        onClick={() => onSelect([node.path])}
        className={`flex w-full items-center justify-between rounded-lg py-1 px-2 text-left transition ${
          isActive
            ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
        }`}
        title={node.path}
      >
        <span className="truncate flex items-center gap-1.5">
          <SvgFile className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span>{node.name}</span>
        </span>
        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />}
      </button>
    );
  }

  const descendantFiles = collectFiles(node);
  const isActive = descendantFiles.length > 0 && descendantFiles.every((f) => activeFiles.has(f));

  return (
    <div>
      <div
        style={indent}
        className={`flex w-full items-center justify-between rounded-lg py-1 pr-2 transition ${
          isActive ? 'bg-slate-900 text-blue-300 font-medium' : 'text-slate-300 hover:bg-slate-900'
        }`}
      >
        <div className="flex items-center gap-1 truncate">
          <button
            type="button"
            onClick={() => setOpenState((o) => !o)}
            className="w-4 shrink-0 text-slate-500 hover:text-slate-300 text-center font-mono"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            {open ? '▾' : '▸'}
          </button>
          <button
            type="button"
            onClick={() => onSelect(descendantFiles)}
            className="truncate text-left flex items-center gap-1.5"
          >
            <SvgFolder className="h-3.5 w-3.5 shrink-0 text-amber-500/80" />
            <span>{node.name}/</span>
          </button>
        </div>
        <span className="text-[10px] text-slate-600 font-mono">
          {descendantFiles.length}
        </span>
      </div>
      {open &&
        node.children.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            activeFiles={activeFiles}
            onSelect={onSelect}
            forceOpen={forceOpen}
          />
        ))}
    </div>
  );
}
