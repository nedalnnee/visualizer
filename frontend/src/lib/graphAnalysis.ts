import type { Graph, GraphEdge, GraphNode } from '../types/graph';

/**
 * Tarjan's Strongly Connected Components (SCC) algorithm
 * to find all circular dependency cycles.
 */
export function findCircularDependencies(nodes: GraphNode[], edges: GraphEdge[]): string[][] {
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }
  for (const edge of edges) {
    if (adj.has(edge.source)) {
      adj.get(edge.source)!.push(edge.target);
    }
  }

  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  function strongConnect(v: string) {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    for (const w of adj.get(v) || []) {
      if (!indices.has(w)) {
        strongConnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
      } else if (onStack.has(w)) {
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
      }
    }

    if (lowlinks.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w = '';
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);

      // Only SCCs with >= 2 nodes or self-loops count as circular dependencies
      if (scc.length > 1 || (adj.get(v) && adj.get(v)!.includes(v))) {
        sccs.push(scc);
      }
    }
  }

  for (const node of nodes) {
    if (!indices.has(node.id)) {
      strongConnect(node.id);
    }
  }

  return sccs;
}

/**
 * BFS Shortest Pathfinding between startNode and endNode
 */
export function findShortestPath(
  startNodeId: string,
  endNodeId: string,
  edges: GraphEdge[],
): { nodeIds: string[]; edgeIds: string[] } | null {
  if (startNodeId === endNodeId) {
    return { nodeIds: [startNodeId], edgeIds: [] };
  }

  const adj = new Map<string, { target: string; edgeId: string }[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push({ target: edge.target, edgeId: edge.id });
  }

  const queue: { node: string; path: string[]; edgePath: string[] }[] = [
    { node: startNodeId, path: [startNodeId], edgePath: [] },
  ];
  const visited = new Set<string>([startNodeId]);

  while (queue.length > 0) {
    const { node, path, edgePath } = queue.shift()!;

    for (const neighbor of adj.get(node) || []) {
      if (neighbor.target === endNodeId) {
        return {
          nodeIds: [...path, neighbor.target],
          edgeIds: [...edgePath, neighbor.edgeId],
        };
      }

      if (!visited.has(neighbor.target)) {
        visited.add(neighbor.target);
        queue.push({
          node: neighbor.target,
          path: [...path, neighbor.target],
          edgePath: [...edgePath, neighbor.edgeId],
        });
      }
    }
  }

  return null;
}

/**
 * Upstream (Callers) & Downstream (Callees) Dependency Reachability Tracing with Depth Limit
 */
export function traceCallHierarchy(
  rootNodeId: string,
  edges: GraphEdge[],
  direction: 'upstream' | 'downstream' | 'both',
  maxDepth = 3,
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>([rootNodeId]);
  const edgeIds = new Set<string>();

  // Downstream (Callees)
  if (direction === 'downstream' || direction === 'both') {
    let currentLevel = [rootNodeId];
    let depth = 0;
    while (currentLevel.length > 0 && depth < maxDepth) {
      const nextLevel: string[] = [];
      for (const current of currentLevel) {
        for (const edge of edges) {
          if (edge.source === current) {
            edgeIds.add(edge.id);
            if (!nodeIds.has(edge.target)) {
              nodeIds.add(edge.target);
              nextLevel.push(edge.target);
            }
          }
        }
      }
      currentLevel = nextLevel;
      depth++;
    }
  }

  // Upstream (Callers)
  if (direction === 'upstream' || direction === 'both') {
    let currentLevel = [rootNodeId];
    let depth = 0;
    while (currentLevel.length > 0 && depth < maxDepth) {
      const nextLevel: string[] = [];
      for (const current of currentLevel) {
        for (const edge of edges) {
          if (edge.target === current) {
            edgeIds.add(edge.id);
            if (!nodeIds.has(edge.source)) {
              nodeIds.add(edge.source);
              nextLevel.push(edge.source);
            }
          }
        }
      }
      currentLevel = nextLevel;
      depth++;
    }
  }

  return { nodeIds, edgeIds };
}

/**
 * System Architecture Coupling & Hub Analysis
 */
export function calculateArchitectureMetrics(graph: Graph) {
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  }

  for (const edge of graph.edges) {
    outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Hubs (highest incoming connections)
  const topHubs = [...graph.nodes]
    .map((n) => ({ node: n, afferentCoupling: inDegree.get(n.id) || 0, efferentCoupling: outDegree.get(n.id) || 0 }))
    .sort((a, b) => b.afferentCoupling - a.afferentCoupling)
    .slice(0, 5);

  // Instability score: Ce / (Ca + Ce)
  const instabilityMap = new Map<string, number>();
  for (const node of graph.nodes) {
    const ca = inDegree.get(node.id) || 0;
    const ce = outDegree.get(node.id) || 0;
    const instability = ca + ce > 0 ? ce / (ca + ce) : 0;
    instabilityMap.set(node.id, instability);
  }

  return { inDegree, outDegree, topHubs, instabilityMap };
}
