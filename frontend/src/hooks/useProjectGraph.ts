import { useEffect, useState } from 'react';
import { apiGet } from '../lib/apiClient';
import type { Graph } from '../types/graph';

// Fetches the FULL graph for a project, once. Scoping to a module/file and
// expanding cross-file connections both happen client-side against this
// (see ProjectExplorer) rather than as separate API calls — simplest thing
// that works at the "100+ nodes" scale this tool targets.
export function useProjectGraph(projectId: number) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setGraph(null);

    apiGet<Graph>(`/api/graph?project_id=${projectId}`)
      .then((data) => {
        if (!cancelled) {
          setGraph(data);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { graph, loading, error };
}
