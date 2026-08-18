import { useEffect, useMemo, useState } from 'react';
import { useProjectGraph } from '../hooks/useProjectGraph';
import { buildFileTree, collectFiles } from '../lib/fileTree';
import {
  findCircularDependencies,
  findShortestPath,
} from '../lib/graphAnalysis';
import { GraphCanvas } from './GraphCanvas';
import { LoadingScreen } from './LoadingScreen';
import { ScopePicker } from './ScopePicker';
import {
  SvgFolder,
  SvgNodes,
  SvgEdge,
  SvgWarning,
  SvgZap,
  SvgCycle,
  SvgPath,
  SvgCopy,
  SvgCheck,
  SvgSearch,
} from './Icons';
import type { Project } from '../types/api';
import type { Graph, GraphEdge, GraphNode } from '../types/graph';

interface ProjectExplorerProps {
  project: Project;
  onBack: () => void;
}

const LARGE_PROJECT_FILE_THRESHOLD = 40;

export function ProjectExplorer({ project, onBack }: ProjectExplorerProps) {
  const { graph, loading, error } = useProjectGraph(project.id);
  const [scopeFiles, setScopeFiles] = useState<Set<string> | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [hideUnconnected, setHideUnconnected] = useState(false);
  const [direction, setDirection] = useState<'TB' | 'LR'>('TB');
  const [searchQuery, setSearchQuery] = useState('');
  const [nodeFilter, setNodeFilter] = useState<'all' | 'classes' | 'methods' | 'errors' | 'warnings' | 'cycles'>('all');
  const [copied, setCopied] = useState(false);

  // Pathfinding state
  const [pathStartNode, setPathStartNode] = useState<string | null>(null);
  const [pathEndNode, setPathEndNode] = useState<string | null>(null);
  const [pathResult, setPathResult] = useState<{ nodeIds: string[]; edgeIds: string[] } | null>(null);

  const tree = useMemo(() => {
    if (!graph) return null;
    const filePaths = Array.from(new Set(graph.nodes.map((n) => n.data.file_path)));
    return buildFileTree(filePaths);
  }, [graph]);

  // Default scope
  useEffect(() => {
    if (tree && scopeFiles === null) {
      const files = collectFiles(tree);
      setScopeFiles(new Set(files.length > LARGE_PROJECT_FILE_THRESHOLD ? [] : files));
    }
  }, [tree, scopeFiles]);

  const handleSelectScope = (files: string[]) => {
    setScopeFiles(new Set(files));
    setExpandedNodeIds(new Set());
    setPathResult(null);
  };

  // Run Circular Dependency Analysis (Tarjan SCC)
  const circularCycles = useMemo(() => {
    if (!graph) return [];
    return findCircularDependencies(graph.nodes, graph.edges);
  }, [graph]);

  const cycleNodeIds = useMemo(() => {
    const set = new Set<string>();
    for (const cycle of circularCycles) {
      for (const id of cycle) set.add(id);
    }
    return set;
  }, [circularCycles]);

  // Pathfinding Execution
  useEffect(() => {
    if (pathStartNode && pathEndNode && graph) {
      const result = findShortestPath(pathStartNode, pathEndNode, graph.edges);
      setPathResult(result);
    } else {
      setPathResult(null);
    }
  }, [pathStartNode, pathEndNode, graph]);

  // Calculate project-wide statistics
  const stats = useMemo(() => {
    if (!graph) return { totalNodes: 0, totalEdges: 0, syntaxErrors: 0, warnings: 0, totalFiles: 0 };
    const totalNodes = graph.nodes.length;
    const totalEdges = graph.edges.length;
    const syntaxErrors = graph.nodes.filter((n) => n.data.syntax_error !== null).length;
    const warnings = graph.nodes.filter((n) => n.data.warnings.length > 0).length;
    const totalFiles = new Set(graph.nodes.map((n) => n.data.file_path)).size;

    return { totalNodes, totalEdges, syntaxErrors, warnings, totalFiles };
  }, [graph]);

  // Compute visible graph
  const visibleGraph: Graph | null = useMemo(() => {
    if (!graph || scopeFiles === null) return null;

    const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
    const nodeIds = new Set<string>();

    for (const node of graph.nodes) {
      if (scopeFiles.has(node.data.file_path)) {
        nodeIds.add(node.id);
      }
    }
    for (const id of expandedNodeIds) {
      if (nodesById.has(id)) {
        nodeIds.add(id);
      }
    }

    const nodes: GraphNode[] = Array.from(nodeIds, (id) => nodesById.get(id)).filter(
      (n): n is GraphNode => n !== undefined,
    );
    const edges: GraphEdge[] = graph.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

    return { nodes, edges };
  }, [graph, scopeFiles, expandedNodeIds]);

  // Filter visible nodes
  const renderedGraph: Graph | null = useMemo(() => {
    if (!visibleGraph) return null;

    let nodes = visibleGraph.nodes;

    if (nodeFilter === 'classes') {
      nodes = nodes.filter((n) => !n.data.label.includes('::'));
    } else if (nodeFilter === 'methods') {
      nodes = nodes.filter((n) => n.data.label.includes('::'));
    } else if (nodeFilter === 'errors') {
      nodes = nodes.filter((n) => n.data.syntax_error !== null);
    } else if (nodeFilter === 'warnings') {
      nodes = nodes.filter((n) => n.data.warnings.length > 0);
    } else if (nodeFilter === 'cycles') {
      nodes = nodes.filter((n) => cycleNodeIds.has(n.id));
    }

    if (hideUnconnected) {
      const connectedIds = new Set<string>();
      for (const edge of visibleGraph.edges) {
        connectedIds.add(edge.source);
        connectedIds.add(edge.target);
      }
      nodes = nodes.filter((n) => connectedIds.has(n.id));
    }

    // Attach cycle flags
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges: GraphEdge[] = visibleGraph.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({
        ...e,
        isInCycle: cycleNodeIds.has(e.source) && cycleNodeIds.has(e.target),
      }));

    return { nodes, edges };
  }, [visibleGraph, nodeFilter, hideUnconnected, cycleNodeIds]);

  const handleNodeClick = (nodeId: string) => {
    if (!graph) return;

    const neighbors = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.source === nodeId) neighbors.add(edge.target);
      if (edge.target === nodeId) neighbors.add(edge.source);
    }

    if (neighbors.size === 0) return;

    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      for (const id of neighbors) next.add(id);
      return next;
    });
  };

  const handleFilterErrors = () => {
    if (!graph) return;
    const brokenFiles = graph.nodes
      .filter((n) => n.data.syntax_error !== null)
      .map((n) => n.data.file_path);
    if (brokenFiles.length > 0) {
      setScopeFiles(new Set(brokenFiles));
      setNodeFilter('errors');
    }
  };

  const handleFilterWarnings = () => {
    if (!graph) return;
    const warningFiles = graph.nodes
      .filter((n) => n.data.warnings.length > 0)
      .map((n) => n.data.file_path);
    if (warningFiles.length > 0) {
      setScopeFiles(new Set(warningFiles));
      setNodeFilter('warnings');
    }
  };

  const handleFilterCycles = () => {
    if (!graph || circularCycles.length === 0) return;
    const cycleFiles = graph.nodes
      .filter((n) => cycleNodeIds.has(n.id))
      .map((n) => n.data.file_path);
    setScopeFiles(new Set(cycleFiles));
    setNodeFilter('cycles');
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(project.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSelectForPath = (nodeId: string) => {
    if (!pathStartNode) {
      setPathStartNode(nodeId);
    } else if (!pathEndNode) {
      setPathEndNode(nodeId);
    } else {
      setPathStartNode(nodeId);
      setPathEndNode(null);
    }
  };

  if (loading) {
    return (
      <LoadingScreen
        title={`Analyzing ${project.name}`}
        subtitle={`Parsing AST and extracting relationships from ${project.path}`}
        onCancel={onBack}
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-sm text-rose-400">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 text-center max-w-md">
          <SvgWarning className="h-8 w-8 text-rose-400 mx-auto mb-2" />
          <h2 className="text-base font-bold text-rose-300">Extraction Failed</h2>
          <p className="mt-1 text-xs text-slate-300">{error}</p>
          <button
            onClick={onBack}
            className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            ← Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (!graph || !tree || !visibleGraph || !renderedGraph) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-900 text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2.5 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <span>←</span>
            <span>Projects</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-white tracking-wide">{project.name}</h1>
            <button
              type="button"
              onClick={handleCopyPath}
              className="flex items-center gap-1.5 truncate rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400 border border-slate-800 hover:text-slate-200"
              title="Copy path"
            >
              <span className="truncate max-w-[240px]">{project.path}</span>
              {copied ? <SvgCheck className="h-3 w-3 text-emerald-400" /> : <SvgCopy className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Global Project Metrics Badges */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 border border-slate-800 text-slate-300">
            <SvgFolder className="h-3.5 w-3.5 text-slate-400" />
            <span>{stats.totalFiles} files</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 border border-slate-800 text-slate-300">
            <SvgNodes className="h-3.5 w-3.5 text-blue-400" />
            <span>{stats.totalNodes} nodes</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 border border-slate-800 text-slate-300">
            <SvgEdge className="h-3.5 w-3.5 text-cyan-400" />
            <span>{stats.totalEdges} calls</span>
          </div>

          {/* Circular Dependencies Pill */}
          {circularCycles.length > 0 && (
            <button
              type="button"
              onClick={handleFilterCycles}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-2.5 py-1 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition font-medium"
              title="Click to scope circular dependency cycles"
            >
              <SvgCycle className="h-3.5 w-3.5 text-orange-400" />
              <span>{circularCycles.length} Cycles</span>
            </button>
          )}

          {/* Syntax Errors Pill */}
          {stats.syntaxErrors > 0 && (
            <button
              type="button"
              onClick={handleFilterErrors}
              className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition font-medium"
              title="Click to scope syntax errors"
            >
              <SvgWarning className="h-3.5 w-3.5 text-rose-400" />
              <span>{stats.syntaxErrors} Errors</span>
            </button>
          )}

          {/* Warnings Pill */}
          {stats.warnings > 0 && (
            <button
              type="button"
              onClick={handleFilterWarnings}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition font-medium"
              title="Click to scope dead code warnings"
            >
              <SvgZap className="h-3.5 w-3.5 text-amber-400" />
              <span>{stats.warnings} Dead Code</span>
            </button>
          )}
        </div>
      </header>

      {/* Pathfinding & Tracing Toolbar (when active) */}
      {(pathStartNode || pathEndNode) && (
        <div className="flex shrink-0 items-center justify-between border-b border-cyan-500/30 bg-cyan-950/40 px-4 py-1.5 text-xs text-cyan-200 backdrop-blur">
          <div className="flex items-center gap-2">
            <SvgPath className="h-4 w-4 text-cyan-400" />
            <span className="font-bold">Pathfinder:</span>
            <span className="rounded bg-cyan-900/60 px-2 py-0.5 font-mono text-[11px]">
              {pathStartNode ?? 'Pick Start'} ➔ {pathEndNode ?? 'Pick End (click any node)'}
            </span>
            {pathResult ? (
              <span className="text-emerald-400 font-semibold">
                ✓ Found {pathResult.nodeIds.length} hops!
              </span>
            ) : pathStartNode && pathEndNode ? (
              <span className="text-rose-400">✕ No direct call path</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setPathStartNode(null);
              setPathEndNode(null);
            }}
            className="rounded bg-cyan-900/80 px-2 py-0.5 text-xs hover:bg-cyan-800"
          >
            Clear Path
          </button>
        </div>
      )}

      {/* Secondary Controls Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-4 py-2 text-xs">
        {/* Node Category Tabs */}
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'all', label: 'All Nodes' },
              { id: 'classes', label: 'Classes' },
              { id: 'methods', label: 'Methods' },
              { id: 'cycles', label: 'Cycles' },
              { id: 'errors', label: 'Errors' },
              { id: 'warnings', label: 'Dead Code' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setNodeFilter(tab.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                nodeFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Layout, & Unconnected Filter */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500">
              <SvgSearch className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graph..."
              className="w-48 rounded-lg border border-slate-800 bg-slate-900 pl-7 pr-6 py-1 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1 text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={hideUnconnected}
              onChange={(e) => setHideUnconnected(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-blue-600"
            />
            <span>Hide unconnected</span>
          </label>

          {/* Direction Switcher (TB / LR) */}
          <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
            <button
              type="button"
              onClick={() => setDirection('TB')}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                direction === 'TB' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Top to Bottom"
            >
              ⬇ TB
            </button>
            <button
              type="button"
              onClick={() => setDirection('LR')}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                direction === 'LR' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Left to Right"
            >
              ➔ LR
            </button>
          </div>

          {expandedNodeIds.size > 0 && (
            <button
              type="button"
              onClick={() => setExpandedNodeIds(new Set())}
              className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700"
            >
              Reset Expanded ({expandedNodeIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex min-h-0 flex-1">
        <div className="w-72 shrink-0 border-r border-slate-800 bg-slate-950">
          <ScopePicker
            tree={tree}
            activeFiles={scopeFiles ?? new Set()}
            onSelect={handleSelectScope}
          />
        </div>

        <div className="relative flex-1 bg-slate-900">
          {visibleGraph.nodes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <SvgFolder className="h-10 w-10 text-slate-600 mb-2" />
              <h3 className="text-sm font-bold text-white">No Files Selected in Scope</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                Pick specific PHP files from the left tree explorer to render their class nodes and method relationships.
              </p>
              <button
                type="button"
                onClick={() => handleSelectScope(collectFiles(tree))}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Render All Project Files ({collectFiles(tree).length})
              </button>
            </div>
          ) : renderedGraph.nodes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <SvgSearch className="h-10 w-10 text-slate-600 mb-2" />
              <h3 className="text-sm font-bold text-white">No Matching Nodes in Current Filter</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                Nodes exist in scope, but are filtered out by "{nodeFilter}" or "Hide unconnected".
              </p>
              <button
                type="button"
                onClick={() => {
                  setNodeFilter('all');
                  setHideUnconnected(false);
                }}
                className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Reset Node Filter
              </button>
            </div>
          ) : (
            <GraphCanvas
              graph={renderedGraph}
              projectId={project.id}
              direction={direction}
              searchQuery={searchQuery}
              cycleNodeIds={cycleNodeIds}
              pathNodeIds={pathResult ? new Set(pathResult.nodeIds) : new Set()}
              pathEdgeIds={pathResult ? new Set(pathResult.edgeIds) : new Set()}
              onNodeClick={handleNodeClick}
              onSelectForPath={handleSelectForPath}
            />
          )}
        </div>
      </div>
    </div>
  );
}
