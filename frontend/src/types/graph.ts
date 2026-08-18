// Mirrors backend/docs/SCHEMA.md — keep in sync with that doc and with
// backend/src/Extractor.php + backend/src/Analysis/DeadCodeAnalyzer.php.

export interface CodeNodeData extends Record<string, unknown> {
  label: string;
  file_path: string;
  start_line: number | null;
  end_line: number | null;
  syntax_error: string | null;
  warnings: string[];
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
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
