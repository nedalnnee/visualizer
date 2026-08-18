// Mirrors backend/docs/SCHEMA.md & rich client-side analysis

export type EdgeCallType = 'static' | 'instance' | 'unknown';

export interface CodeNodeData extends Record<string, unknown> {
  label: string;
  file_path: string;
  start_line: number | null;
  end_line: number | null;
  syntax_error: string | null;
  warnings: string[];
  // Extended analysis properties
  visibility?: 'public' | 'protected' | 'private';
  is_static?: boolean;
  loc?: number;
  highlighted?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  isInCycle?: boolean;
  isInPath?: boolean;
}

export interface GraphNode {
  id: string;
  type: 'codeNode';
  data: CodeNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  call_type?: EdgeCallType;
  isInCycle?: boolean;
  isInPath?: boolean;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
