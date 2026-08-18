import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeMouseHandler,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { layoutGraph } from '../layout/dagreLayout';
import { CodeNode } from './CodeNode';
import { InspectorPanel } from './InspectorPanel';
import type { CodeNodeData, Graph, GraphNode } from '../types/graph';

const nodeTypes = { codeNode: CodeNode };
const LARGE_GRAPH_NODE_THRESHOLD = 300;

interface GraphCanvasProps {
  graph: Graph;
  direction?: 'TB' | 'LR';
  searchQuery?: string;
  selectedNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  onCloseInspector?: () => void;
}

function GraphCanvasInner({
  graph,
  direction = 'TB',
  searchQuery = '',
  selectedNodeId,
  onNodeClick,
  onCloseInspector,
}: GraphCanvasProps) {
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const reactFlow = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const rawNodes: Node<CodeNodeData>[] = graph.nodes.map((node) => {
      const isMatched = query.length === 0 || node.data.label.toLowerCase().includes(query) || node.data.file_path.toLowerCase().includes(query);
      const isSelected = selectedNodeId === node.id || selected?.id === node.id;

      return {
        id: node.id,
        type: node.type,
        data: {
          ...node.data,
          // Attach highlight state to node styling if searched
          highlighted: query.length > 0 && isMatched,
          dimmed: query.length > 0 && !isMatched,
          selected: isSelected,
        },
        position: { x: 0, y: 0 },
      };
    });

    const rawEdges: Edge[] = graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: edge.animated,
      style: {
        stroke: '#94a3b8',
        strokeWidth: 1.5,
      },
    }));

    return layoutGraph(rawNodes, rawEdges, direction);
  }, [graph, direction, searchQuery, selectedNodeId, selected?.id]);

  // Sync selectedNodeId prop with inspector
  useEffect(() => {
    if (selectedNodeId) {
      const target = graph.nodes.find((n) => n.id === selectedNodeId);
      if (target) setSelected(target);
    }
  }, [selectedNodeId, graph.nodes]);

  const handleNodeClick = useCallback<NodeMouseHandler<Node<CodeNodeData>>>(
    (_event, node) => {
      const graphNode: GraphNode = { id: node.id, type: 'codeNode', data: node.data };
      setSelected(graphNode);
      onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

  const handleClose = () => {
    setSelected(null);
    onCloseInspector?.();
  };

  const handleFocusNode = (nodeId: string) => {
    const foundNode = nodes.find((n) => n.id === nodeId);
    if (foundNode) {
      reactFlow.setCenter(foundNode.position.x + 100, foundNode.position.y + 30, { zoom: 1.2, duration: 800 });
      const target = graph.nodes.find((n) => n.id === nodeId);
      if (target) setSelected(target);
    }
  };

  return (
    <div className="relative h-full w-full bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        onlyRenderVisibleElements
        nodesDraggable={nodes.length <= LARGE_GRAPH_NODE_THRESHOLD}
        nodesConnectable={false}
      >
        <Background gap={18} size={1} color="#cbd5e1" />
        <Controls className="bg-white! border-slate-200! shadow-md! rounded-lg!" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="rounded-lg! border! border-slate-200! bg-white/90! shadow-md!"
          maskColor="rgba(241, 245, 249, 0.7)"
        />
      </ReactFlow>

      {/* Floating Canvas Quick Controls & Stats */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow-sm backdrop-blur">
          <span className="font-semibold text-slate-900">{nodes.length}</span> nodes
          <span className="text-slate-300">•</span>
          <span className="font-semibold text-slate-900">{edges.length}</span> edges
          <span className="text-slate-300">•</span>
          <span className="font-mono text-[10px] text-slate-500">{direction === 'TB' ? 'Top ➔ Bottom' : 'Left ➔ Right'}</span>
        </div>
      </div>

      <InspectorPanel
        node={selected}
        allNodes={graph.nodes}
        allEdges={graph.edges}
        onFocusNode={handleFocusNode}
        onClose={handleClose}
      />
    </div>
  );
}

export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
