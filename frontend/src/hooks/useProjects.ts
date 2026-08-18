import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '../lib/apiClient';
import type { Project } from '../types/api';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGet<Project[]>('/api/projects')
      .then(setProjects)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addProject = useCallback(async (name: string, path: string) => {
    const project = await apiPost<Project>('/api/projects', { name, path });
    setProjects((prev) => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)));
    return project;
  }, []);

  const deleteProject = useCallback(async (id: number) => {
    await apiDelete<{ success: boolean }>(`/api/projects?id=${id}`);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { projects, loading, error, addProject, deleteProject, reload };
}
