import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';

// graph.json carries no coordinates by design (see docs/SCHEMA.md) — layout
// is always computed client-side before handing nodes to React Flow.

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

export function layoutGraph<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): { nodes: Node<T>[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    // dagre only lays out edges between nodes it knows about; a Phase 1
    // edge that points at a node id we didn't extract (shouldn't happen,
    // but nothing guarantees it) would throw here otherwise.
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    const position = graph.node(node.id);
    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
