import { useCallback, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { layoutGraph } from '../layout/dagreLayout';
import { CodeNode } from './CodeNode';
import { InspectorPanel } from './InspectorPanel';
import type { CodeNodeData, Graph, GraphNode } from '../types/graph';

// Defined outside the component: React Flow warns (and re-mounts nodes) if
// nodeTypes is a fresh object every render.
const nodeTypes = { codeNode: CodeNode };

interface GraphCanvasProps {
  graph: Graph;
  /**
   * Called (in addition to opening the inspector) whenever a node is
   * clicked. ProjectExplorer uses this to pull in cross-file connections —
   * GraphCanvas itself has no notion of "scope" or "other files".
   */
  onNodeClick?: (nodeId: string) => void;
}

function GraphCanvasInner({ graph, onNodeClick }: GraphCanvasProps) {
  const [selected, setSelected] = useState<GraphNode | null>(null);

  const { nodes, edges } = useMemo(() => {
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

  const handleNodeClick = useCallback<NodeMouseHandler<Node<CodeNodeData>>>(
    (_event, node) => {
      setSelected({ id: node.id, type: 'codeNode', data: node.data });
      onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

  return (
    <>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={handleNodeClick} fitView>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <InspectorPanel node={selected} onClose={() => setSelected(null)} />
    </>
  );
}

export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
