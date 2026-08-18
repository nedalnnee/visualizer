import { useMemo } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraph } from '../hooks/useGraph';
import { layoutGraph } from '../layout/dagreLayout';
import type { CodeNodeData } from '../types/graph';

// Phase 3: load graph.json, auto-layout with dagre, render with React Flow.
// No custom node styling or click-to-inspect yet — that's Phase 4
// (see docs/STATUS.md). Unregistered 'codeNode' type falls back to React
// Flow's default node renderer, which reads data.label — already present.
function GraphCanvasInner() {
  const { graph, loading, error } = useGraph();

  const { nodes, edges } = useMemo(() => {
    if (!graph) {
      return { nodes: [] as Node<CodeNodeData>[], edges: [] as Edge[] };
    }

    const rawNodes: Node<CodeNodeData>[] = graph.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      data: node.data,
      position: { x: 0, y: 0 },
    }));

    const rawEdges: Edge[] = graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: edge.animated,
    }));

    return layoutGraph(rawNodes, rawEdges);
  }, [graph]);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading graph…</div>;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-600">
        Failed to load graph.json: {error}
      </div>
    );
  }

  return (
    <ReactFlow nodes={nodes} edges={edges} fitView>
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}
