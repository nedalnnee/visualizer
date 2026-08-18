import { useEffect, useMemo, useState } from 'react';
import { useProjectGraph } from '../hooks/useProjectGraph';
import { buildFileTree, collectFiles } from '../lib/fileTree';
import { GraphCanvas } from './GraphCanvas';
import { LoadingScreen } from './LoadingScreen';
import { ScopePicker } from './ScopePicker';
import type { Project } from '../types/api';
import type { Graph, GraphEdge, GraphNode } from '../types/graph';

interface ProjectExplorerProps {
  project: Project;
  onBack: () => void;
}

// Owns the "what's currently rendered" logic: the full project graph is
// fetched once (useProjectGraph); everything else — module/file scoping,
// and pulling in cross-file connections on click — is a client-side filter
// over that one payload. See docs/STATUS.md Phase 5 for why this is a
// client-side filter rather than more API endpoints.
export function ProjectExplorer({ project, onBack }: ProjectExplorerProps) {
  const { graph, loading, error } = useProjectGraph(project.id);
  const [scopeFiles, setScopeFiles] = useState<Set<string> | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  const tree = useMemo(() => {
    if (!graph) return null;
    const filePaths = Array.from(new Set(graph.nodes.map((n) => n.data.file_path)));
    return buildFileTree(filePaths);
  }, [graph]);

  // Default scope: everything. Runs once the graph (and therefore the tree) arrives.
  useEffect(() => {
    if (tree && scopeFiles === null) {
      setScopeFiles(new Set(collectFiles(tree)));
    }
  }, [tree, scopeFiles]);

  const handleSelectScope = (files: string[]) => {
    setScopeFiles(new Set(files));
    setExpandedNodeIds(new Set());
  };

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

  // "Click a node with external connections and it renders the other file
  // too": pull in every node directly connected to the clicked one, from
  // whatever file it lives in, and merge into the same canvas.
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

  if (loading) {
    return (
      <LoadingScreen
        title={`Loading ${project.name}`}
        subtitle={`Analyzing codebase at ${project.path}`}
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 text-sm text-red-600">
        <p>Failed to load graph: {error}</p>
        <button onClick={onBack} className="rounded border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50">
          ← Back to projects
        </button>
      </div>
    );
  }

  if (!graph || !tree || !visibleGraph) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-4 py-2">
        <button type="button" onClick={onBack} className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">
          ← Projects
        </button>
        <h1 className="text-sm font-semibold text-gray-800">{project.name}</h1>
        <span className="truncate font-mono text-xs text-gray-400">{project.path}</span>
        {expandedNodeIds.size > 0 && (
          <button
            type="button"
            onClick={() => setExpandedNodeIds(new Set())}
            className="ml-auto rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
          >
            Reset expanded connections ({expandedNodeIds.size})
          </button>
        )}
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="w-64 shrink-0">
          <ScopePicker tree={tree} activeFiles={scopeFiles ?? new Set()} onSelect={handleSelectScope} />
        </div>
        <div className="relative flex-1">
          <GraphCanvas graph={visibleGraph} onNodeClick={handleNodeClick} />
        </div>
      </div>
    </div>
  );
}
