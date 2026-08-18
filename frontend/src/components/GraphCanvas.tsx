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
import { SvgCycle, SvgPath, SvgNodes, SvgEdge } from './Icons';
import type { CodeNodeData, Graph, GraphNode } from '../types/graph';

const nodeTypes = { codeNode: CodeNode };
const LARGE_GRAPH_NODE_THRESHOLD = 300;

interface GraphCanvasProps {
  graph: Graph;
  projectId?: number;
  direction?: 'TB' | 'LR';
  searchQuery?: string;
  cycleNodeIds?: Set<string>;
  pathNodeIds?: Set<string>;
  pathEdgeIds?: Set<string>;
  selectedNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  onSelectForPath?: (nodeId: string) => void;
  onCloseInspector?: () => void;
}

function GraphCanvasInner({
  graph,
  projectId,
  direction = 'TB',
  searchQuery = '',
  cycleNodeIds = new Set(),
  pathNodeIds = new Set(),
  pathEdgeIds = new Set(),
  selectedNodeId,
  onNodeClick,
  onSelectForPath,
  onCloseInspector,
}: GraphCanvasProps) {
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const reactFlow = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const rawNodes: Node<CodeNodeData>[] = graph.nodes.map((node) => {
      const isMatched = query.length === 0 || node.data.label.toLowerCase().includes(query) || node.data.file_path.toLowerCase().includes(query);
      const isSelected = selectedNodeId === node.id || selected?.id === node.id;
      const isInCycle = cycleNodeIds.has(node.id);
      const isInPath = pathNodeIds.has(node.id);

      return {
        id: node.id,
        type: node.type,
        data: {
          ...node.data,
          highlighted: (query.length > 0 && isMatched) || isInPath || isSelected,
          dimmed: (query.length > 0 && !isMatched) || (pathNodeIds.size > 0 && !isInPath),
          selected: isSelected,
          isInCycle,
          isInPath,
        },
        position: { x: 0, y: 0 },
      };
    });

    const rawEdges: Edge[] = graph.edges.map((edge) => {
      const isInPath = pathEdgeIds.has(edge.id);
      const isStatic = edge.target.includes('::') && !edge.id.includes('$this');

      let strokeColor = '#94a3b8';
      let strokeWidth = 1.5;
      let animated = edge.animated;

      if (isInPath) {
        strokeColor = '#06b6d4'; // Cyan
        strokeWidth = 3.5;
        animated = true;
      } else if (edge.isInCycle) {
        strokeColor = '#f97316'; // Orange
        strokeWidth = 2.5;
        animated = true;
      } else if (isStatic) {
        strokeColor = '#3b82f6'; // Blue for static
      }

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated,
        style: {
          stroke: strokeColor,
          strokeWidth,
        },
      };
    });

    return layoutGraph(rawNodes, rawEdges, direction);
  }, [graph, direction, searchQuery, selectedNodeId, selected?.id, cycleNodeIds, pathNodeIds, pathEdgeIds]);

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
      reactFlow.setCenter(foundNode.position.x + 100, foundNode.position.y + 30, { zoom: 1.2, duration: 700 });
      const target = graph.nodes.find((n) => n.id === nodeId);
      if (target) setSelected(target);
    }
  };

  return (
    <div className="relative h-full w-full bg-slate-900/50">
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
        <Background gap={20} size={1} color="#334155" />
        <Controls className="bg-slate-900! border-slate-800! text-slate-300! shadow-xl! rounded-xl!" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="rounded-xl! border! border-slate-800! bg-slate-950/90! shadow-xl!"
          maskColor="rgba(15, 23, 42, 0.75)"
          nodeColor={(n) => (n.data?.syntax_error ? '#f43f5e' : n.data?.isInCycle ? '#f97316' : '#3b82f6')}
        />
      </ReactFlow>

      {/* Floating Canvas Quick Legend & Analysis Status */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/90 px-3.5 py-1.5 text-xs text-slate-300 shadow-xl backdrop-blur">
          <div className="flex items-center gap-1">
            <SvgNodes className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-bold text-white">{nodes.length}</span>
            <span className="text-slate-500">nodes</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <SvgEdge className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-bold text-white">{edges.length}</span>
            <span className="text-slate-500">calls</span>
          </div>

          {cycleNodeIds.size > 0 && (
            <>
              <span className="text-slate-700">•</span>
              <div className="flex items-center gap-1 font-bold text-orange-400">
                <SvgCycle className="h-3.5 w-3.5 text-orange-400" />
                <span>{cycleNodeIds.size} in cycle</span>
              </div>
            </>
          )}

          {pathNodeIds.size > 0 && (
            <>
              <span className="text-slate-700">•</span>
              <div className="flex items-center gap-1 font-bold text-cyan-400">
                <SvgPath className="h-3.5 w-3.5 text-cyan-400" />
                <span>Path: {pathNodeIds.size} nodes</span>
              </div>
            </>
          )}
        </div>
      </div>

      <InspectorPanel
        node={selected}
        projectId={projectId}
        allNodes={graph.nodes}
        allEdges={graph.edges}
        onFocusNode={handleFocusNode}
        onSelectForPath={onSelectForPath}
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
