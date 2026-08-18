import { useState, type FormEvent } from 'react';
import { useProjects } from '../hooks/useProjects';
import { LoadingScreen } from './LoadingScreen';
import type { Project } from '../types/api';

interface DashboardProps {
  onSelect: (project: Project) => void;
}

export function Dashboard({ onSelect }: DashboardProps) {
  const { projects, loading, error, addProject } = useProjects();
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      await addProject(name.trim(), path.trim());
      setName('');
      setPath('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add project');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && projects.length === 0 && !error) {
    return (
      <LoadingScreen
        title="PHP Code Visualizer"
        subtitle="Discovering projects and initializing analyzer…"
        estimatedSteps={[
          'Checking backend server connection',
          'Scanning registered workspaces',
          'Reading project configuration',
          'Preparing AST parsers',
          'Readying canvas engine',
        ]}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">PHP Code Visualizer</h1>
      <p className="mt-1 text-sm text-gray-500">Pick a project to explore its call graph.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap gap-2 rounded-lg border border-gray-200 p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm"
          required
        />
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Absolute path, e.g. C:\Users\dell\Desktop\baraka\baraka_managment"
          className="min-w-[280px] flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Adding…' : 'Add project'}
        </button>
      </form>
      {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}

      {loading && <p className="mt-6 text-sm text-gray-500">Loading projects…</p>}
      {error && (
        <p className="mt-6 text-sm text-red-600">
          Failed to load projects: {error} — is the backend running? (<code className="font-mono">composer serve</code> in{' '}
          <code className="font-mono">backend/</code>)
        </p>
      )}

      {!loading && !error && (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => onSelect(project)}
                className="w-full rounded-lg border border-gray-200 p-4 text-left hover:border-gray-400 hover:shadow-sm"
              >
                <div className="font-medium text-gray-900">{project.name}</div>
                <div className="mt-1 truncate font-mono text-xs text-gray-400">{project.path}</div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && projects.length === 0 && (
        <p className="mt-6 text-sm text-gray-400">No projects yet — add one above.</p>
      )}
    </div>
  );
}
