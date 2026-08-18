import { useEffect, useState } from 'react';
import type { Graph } from '../types/graph';

interface UseGraphResult {
  graph: Graph | null;
  loading: boolean;
  error: string | null;
}

// Loads /graph.json (served from public/ in dev, or wherever it's deployed
// alongside the built app) — the one artifact backend/ and frontend/ share.
export function useGraph(url = '/graph.json'): UseGraphResult {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
        }
        return res.json() as Promise<Graph>;
      })
      .then((data) => {
        if (!cancelled) {
          setGraph(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { graph, loading, error };
}
