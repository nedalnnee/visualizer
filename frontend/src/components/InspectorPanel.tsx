import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon, CopyIcon, CheckIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import type { GraphEdge, GraphNode } from '../types/graph';

interface InspectorPanelProps {
  node: GraphNode | null;
  allNodes?: GraphNode[];
  allEdges?: GraphEdge[];
  onFocusNode?: (nodeId: string) => void;
  onClose: () => void;
}

export function InspectorPanel({
  node,
  allNodes = [],
  allEdges = [],
  onFocusNode,
  onClose,
}: InspectorPanelProps) {
  const [copied, setCopied] = useState(false);

  // Calculate callers (incoming edges) & callees (outgoing edges)
  const callers = node
    ? allEdges
        .filter((e) => e.target === node.id)
        .map((e) => allNodes.find((n) => n.id === e.source))
        .filter((n): n is GraphNode => n !== undefined)
    : [];

  const callees = node
    ? allEdges
        .filter((e) => e.source === node.id)
        .map((e) => allNodes.find((n) => n.id === e.target))
        .filter((n): n is GraphNode => n !== undefined)
    : [];

  const handleCopyPath = () => {
    if (!node) return;
    navigator.clipboard.writeText(node.data.file_path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog.Root open={node !== null} onOpenChange={(open) => !open && onClose()} modal={false}>
      <Dialog.Portal>
        <Dialog.Content
          className="fixed top-0 right-0 h-full w-[400px] overflow-y-auto border-l border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur-md focus:outline-none z-50 animate-in slide-in-from-right duration-200"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {node && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 uppercase">
                    {node.data.label.includes('::') ? 'Method' : 'Class'}
                  </span>
                  <Dialog.Title className="mt-1 font-mono text-base font-bold text-slate-900 break-all">
                    {node.data.label}
                  </Dialog.Title>
                </div>
                <Dialog.Close
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <Cross2Icon className="h-4 w-4" />
                </Dialog.Close>
              </div>

              {/* Error Callout */}
              {node.data.syntax_error !== null && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-rose-700 uppercase">
                    <span>⚠️</span>
                    <span>Syntax Parse Error</span>
                  </div>
                  <p className="mt-1.5 font-mono text-xs text-rose-900 break-all leading-relaxed bg-white/80 p-2.5 rounded-lg border border-rose-200">
                    {node.data.syntax_error}
                  </p>
                </div>
              )}

              {/* Warnings */}
              {node.data.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-700 uppercase">
                    <span>⚡</span>
                    <span>Static Analysis Warnings ({node.data.warnings.length})</span>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs text-amber-900">
                    {node.data.warnings.map((warning, i) => (
                      <li key={i} className="flex items-start gap-1.5 bg-white/80 p-2 rounded border border-amber-200">
                        <span className="text-amber-500">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* File Info */}
              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-xs">
                <div>
                  <dt className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">File Location</dt>
                  <dd className="mt-1 flex items-center justify-between gap-2 font-mono text-slate-800 break-all bg-white p-2 rounded border border-slate-200">
                    <span className="truncate">{node.data.file_path}</span>
                    <button
                      type="button"
                      onClick={handleCopyPath}
                      className="shrink-0 p-1 text-slate-400 hover:text-slate-700"
                      title="Copy file path"
                    >
                      {copied ? <CheckIcon className="h-3.5 w-3.5 text-emerald-600" /> : <CopyIcon className="h-3.5 w-3.5" />}
                    </button>
                  </dd>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <dt className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Line Range</dt>
                    <dd className="mt-1 font-mono font-semibold text-slate-800">
                      {node.data.start_line !== null ? `Line ${node.data.start_line}` : 'Unknown'}
                      {node.data.end_line !== null ? ` – ${node.data.end_line}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Connections</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {callers.length} in / {callees.length} out
                    </dd>
                  </div>
                </div>
              </div>

              {/* Call Graph Relationships */}
              <div className="space-y-4">
                {/* Outgoing Calls (Callees) */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <span>Calls ({callees.length})</span>
                    <span className="text-[10px] text-slate-400 lowercase font-normal">outgoing edges</span>
                  </div>
                  {callees.length === 0 ? (
                    <p className="mt-1.5 text-xs text-slate-400 italic">No outgoing method calls recorded</p>
                  ) : (
                    <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                      {callees.map((callee) => (
                        <button
                          key={callee.id}
                          type="button"
                          onClick={() => onFocusNode?.(callee.id)}
                          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-left text-xs text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 transition"
                        >
                          <span className="truncate font-mono font-medium">{callee.data.label}</span>
                          <span className="text-[10px] text-slate-400">➔ Focus</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Incoming Calls (Callers) */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <span>Called By ({callers.length})</span>
                    <span className="text-[10px] text-slate-400 lowercase font-normal">incoming edges</span>
                  </div>
                  {callers.length === 0 ? (
                    <p className="mt-1.5 text-xs text-slate-400 italic">No direct caller references in scope</p>
                  ) : (
                    <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                      {callers.map((caller) => (
                        <button
                          key={caller.id}
                          type="button"
                          onClick={() => onFocusNode?.(caller.id)}
                          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-left text-xs text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 transition"
                        >
                          <span className="truncate font-mono font-medium">{caller.data.label}</span>
                          <span className="text-[10px] text-slate-400">➔ Focus</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
