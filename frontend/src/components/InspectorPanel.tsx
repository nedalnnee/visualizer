import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import {
  SvgWarning,
  SvgZap,
  SvgCode,
  SvgCopy,
  SvgCheck,
  SvgPath,
  SvgLayers,
  SvgTarget,
} from './Icons';
import { apiGet } from '../lib/apiClient';
import type { GraphEdge, GraphNode } from '../types/graph';

interface InspectorPanelProps {
  node: GraphNode | null;
  projectId?: number;
  allNodes?: GraphNode[];
  allEdges?: GraphEdge[];
  onFocusNode?: (nodeId: string) => void;
  onSelectForPath?: (nodeId: string) => void;
  onClose: () => void;
}

export function InspectorPanel({
  node,
  projectId,
  allNodes = [],
  allEdges = [],
  onFocusNode,
  onSelectForPath,
  onClose,
}: InspectorPanelProps) {
  const [copied, setCopied] = useState(false);
  const [fileSnippet, setFileSnippet] = useState<string | null>(null);
  const [loadingSnippet, setLoadingSnippet] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'code' | 'relations'>('details');

  // Calculate callers & callees
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

  // Fetch actual code snippet when node is selected
  useEffect(() => {
    if (!node || !projectId) {
      setFileSnippet(null);
      return;
    }

    setLoadingSnippet(true);
    apiGet<{ content: string }>(`/api/file?project_id=${projectId}&file=${encodeURIComponent(node.data.file_path)}`)
      .then((res) => {
        if (!res.content) {
          setFileSnippet(null);
          return;
        }
        const lines = res.content.split('\n');
        const start = Math.max((node.data.start_line ?? 1) - 1, 0);
        const end = Math.min(node.data.end_line ?? start + 25, lines.length);
        const snippet = lines.slice(start, end).join('\n');
        setFileSnippet(snippet);
      })
      .catch(() => setFileSnippet(null))
      .finally(() => setLoadingSnippet(false));
  }, [node, projectId]);

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
          className="fixed top-0 right-0 h-full w-[440px] overflow-y-auto border-l border-slate-800 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-xl text-slate-200 focus:outline-none z-50 animate-in slide-in-from-right duration-200"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {node && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block rounded-md bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-400 border border-blue-500/20 uppercase">
                      {node.data.label.includes('::') ? 'Method' : 'Class'}
                    </span>
                    {node.data.start_line && (
                      <span className="font-mono text-[10px] text-slate-500">
                        Line {node.data.start_line}
                      </span>
                    )}
                  </div>
                  <Dialog.Title className="mt-1 font-mono text-base font-bold text-white break-all">
                    {node.data.label}
                  </Dialog.Title>
                </div>
                <Dialog.Close
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white transition"
                >
                  ✕
                </Dialog.Close>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-1 border-b border-slate-800 pb-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition ${
                    activeTab === 'details' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <SvgLayers className="h-3.5 w-3.5" />
                  <span>Overview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition ${
                    activeTab === 'code' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <SvgCode className="h-3.5 w-3.5" />
                  <span>Code Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('relations')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition ${
                    activeTab === 'relations' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <SvgTarget className="h-3.5 w-3.5" />
                  <span>Calls ({callers.length + callees.length})</span>
                </button>
              </div>

              {/* Quick Actions (Pathfinding / Trace) */}
              <div className="flex items-center gap-2">
                {onSelectForPath && (
                  <button
                    type="button"
                    onClick={() => onSelectForPath(node.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                  >
                    <SvgPath className="h-3.5 w-3.5" />
                    <span>Trace Path from Here</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  {/* Syntax Error */}
                  {node.data.syntax_error !== null && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                        <SvgWarning className="h-4 w-4 text-rose-400" />
                        <span>Syntax Parse Error</span>
                      </div>
                      <p className="mt-2 font-mono text-xs text-rose-200 break-all leading-relaxed bg-slate-950/80 p-2.5 rounded-lg border border-rose-500/20">
                        {node.data.syntax_error}
                      </p>
                    </div>
                  )}

                  {/* Warnings */}
                  {node.data.warnings.length > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                        <SvgZap className="h-4 w-4 text-amber-400" />
                        <span>Analysis Diagnostics ({node.data.warnings.length})</span>
                      </div>
                      <ul className="mt-2 space-y-1.5 text-xs text-amber-200">
                        {node.data.warnings.map((warning, i) => (
                          <li key={i} className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-amber-500/20">
                            <span className="text-amber-400">•</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* File Metadata Card */}
                  <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        File Path
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 font-mono text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span className="truncate">{node.data.file_path}</span>
                        <button
                          type="button"
                          onClick={handleCopyPath}
                          className="shrink-0 p-1 text-slate-400 hover:text-white"
                          title="Copy path"
                        >
                          {copied ? <SvgCheck className="h-3.5 w-3.5 text-emerald-400" /> : <SvgCopy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Line Range
                        </div>
                        <div className="mt-1 font-mono font-semibold text-slate-200">
                          {node.data.start_line !== null ? `Line ${node.data.start_line}` : 'Unknown'}
                          {node.data.end_line !== null ? ` – ${node.data.end_line}` : ''}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Coupling
                        </div>
                        <div className="mt-1 font-semibold text-slate-200">
                          {callers.length} in / {callees.length} out
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Code Preview */}
              {activeTab === 'code' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Source Extract</span>
                    <span className="font-mono text-[10px]">
                      {node.data.start_line ? `Lines ${node.data.start_line} - ${node.data.end_line ?? 'end'}` : 'File preview'}
                    </span>
                  </div>

                  {loadingSnippet ? (
                    <div className="p-8 text-center text-xs text-slate-500">Loading code preview...</div>
                  ) : fileSnippet ? (
                    <pre className="max-h-96 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-blue-200">
                      <code>{fileSnippet}</code>
                    </pre>
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-xs text-slate-500 italic">
                      Code snippet unavailable for this node.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Relationships */}
              {activeTab === 'relations' && (
                <div className="space-y-4">
                  {/* Outgoing Calls */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                      <span>Outgoing Calls ({callees.length})</span>
                    </div>
                    {callees.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-500 italic">No outgoing calls recorded</p>
                    ) : (
                      <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto">
                        {callees.map((callee) => (
                          <button
                            key={callee.id}
                            type="button"
                            onClick={() => onFocusNode?.(callee.id)}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 text-left text-xs text-slate-200 hover:border-blue-500 hover:bg-slate-900 transition"
                          >
                            <span className="truncate font-mono font-medium">{callee.data.label}</span>
                            <span className="text-[10px] text-blue-400">Focus ➔</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Incoming Callers */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                      <span>Called By ({callers.length})</span>
                    </div>
                    {callers.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-500 italic">No callers in current scope</p>
                    ) : (
                      <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto">
                        {callers.map((caller) => (
                          <button
                            key={caller.id}
                            type="button"
                            onClick={() => onFocusNode?.(caller.id)}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 text-left text-xs text-slate-200 hover:border-blue-500 hover:bg-slate-900 transition"
                          >
                            <span className="truncate font-mono font-medium">{caller.data.label}</span>
                            <span className="text-[10px] text-blue-400">Focus ➔</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
