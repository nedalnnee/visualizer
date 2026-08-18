import { useState, useMemo, type FormEvent } from 'react';
import { useProjects } from '../hooks/useProjects';
import { LoadingScreen } from './LoadingScreen';
import type { Project } from '../types/api';

interface DashboardProps {
  onSelect: (project: Project) => void;
}

export function Dashboard({ onSelect }: DashboardProps) {
  const { projects, loading, error, addProject, deleteProject, reload } = useProjects();
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'path'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q),
    );

    return list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'path') return a.path.localeCompare(b.path);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [projects, searchQuery, sortBy]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      await addProject(name.trim(), path.trim());
      setName('');
      setPath('');
      setIsFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseSampleFixture = () => {
    setName('Sample Fixture');
    // Normalize path based on default location
    setPath('backend/tests/fixtures/sample');
    setIsFormOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: number, projectName: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove project "${projectName}"?`)) {
      setDeletingId(id);
      try {
        await deleteProject(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Full Screen Loading State
  if (loading && projects.length === 0 && !error) {
    return (
      <LoadingScreen
        title="PHP Code Visualizer"
        subtitle="Connecting to backend and loading projects…"
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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed top-0 left-1/4 h-96 w-[600px] rounded-full bg-blue-600/10 blur-[130px]" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 h-96 w-[600px] rounded-full bg-indigo-600/10 blur-[130px]" />

      {/* Main Top Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-bold text-white shadow-lg shadow-blue-500/20">
              <span className="text-lg">🐘</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">PHP Code Visualizer</h1>
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Interactive AST & DAG Relationship Analyzer</p>
            </div>
          </div>

          {/* Right Header Status & Action */}
          <div className="flex items-center gap-3">
            {error ? (
              <div className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Backend Offline</span>
                <button
                  type="button"
                  onClick={reload}
                  className="ml-1 underline hover:text-rose-300 font-medium"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Backend Ready</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition duration-150"
            >
              <span>{isFormOpen ? '✕ Close Form' : '+ Add PHP Project'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Error Banner State */}
        {error && (
          <div className="mb-8 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-rose-500/20 p-2 text-rose-400 text-xl">⚠️</div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-rose-300">Cannot Connect to Backend Server</h2>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  {error}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-300 border border-slate-800">
                    composer serve
                  </div>
                  <span className="text-xs text-slate-400">or run</span>
                  <div className="rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-300 border border-slate-800">
                    .\run.cmd
                  </div>
                  <button
                    type="button"
                    onClick={reload}
                    className="ml-auto rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition"
                  >
                    🔄 Retry Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Project Form (Collapsible / Modal Card) */}
        {isFormOpen && (
          <section className="mb-8 animate-in fade-in slide-in-from-top-4 duration-200 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white">Register New PHP Codebase</h2>
                <p className="text-xs text-slate-400">Point to any directory containing PHP classes and scripts.</p>
              </div>
              <button
                type="button"
                onClick={handleUseSampleFixture}
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition"
              >
                ✨ Quick Fill: Sample Fixture
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Project Display Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. My Laravel App"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-300">PHP Directory Path (Absolute or Relative)</label>
                  <input
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="e.g. C:\Users\dell\Desktop\my-php-project or backend/tests/fixtures/sample"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {formError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-950/50 p-2.5 text-xs text-rose-300">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  {submitting ? 'Registering & Validating…' : 'Save & Register Project'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Dashboard Filter Bar & Metrics */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Codebases</h2>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono font-medium text-slate-300">
              {projects.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-56 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-xs text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'recent' | 'path')}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="name">Sort: Name (A-Z)</option>
              <option value="recent">Sort: Recently Added</option>
              <option value="path">Sort: Directory Path</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  viewMode === 'grid' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid View"
              >
                ⊞ Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  viewMode === 'list' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="List View"
              >
                ☰ List
              </button>
            </div>
          </div>
        </div>

        {/* Project Cards Grid / List State */}
        {filteredProjects.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelect(project)}
                className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/50 hover:bg-slate-900/90 hover:shadow-2xl hover:shadow-blue-500/10"
              >
                {/* Top Card Info */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition duration-200 font-mono text-xs font-bold">
                        PHP
                      </div>
                      <h3 className="font-bold text-sm text-white group-hover:text-blue-300 transition">
                        {project.name}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, project.id, project.name)}
                      disabled={deletingId === project.id}
                      className="rounded-lg p-1.5 text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400 transition"
                      title="Remove project"
                    >
                      🗑️
                    </button>
                  </div>

                  <p className="mt-3 truncate rounded-lg bg-slate-950/70 px-2.5 py-1.5 font-mono text-xs text-slate-400 border border-slate-800" title={project.path}>
                    {project.path}
                  </p>
                </div>

                {/* Bottom Card Action */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-800/60 pt-3.5 text-xs">
                  <span className="text-[11px] text-slate-400">
                    {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Active'}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-blue-400 group-hover:translate-x-0.5 transition duration-150">
                    Visualize Graph ➔
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProjects.length > 0 && viewMode === 'list' && (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg backdrop-blur">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Project Name</th>
                  <th className="px-5 py-3.5">Directory Path</th>
                  <th className="px-5 py-3.5">Created</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => onSelect(project)}
                    className="cursor-pointer hover:bg-slate-800/40 transition"
                  >
                    <td className="px-5 py-4 font-bold text-white">{project.name}</td>
                    <td className="px-5 py-4 font-mono text-slate-400">{project.path}</td>
                    <td className="px-5 py-4 text-slate-400">
                      {project.created_at ? new Date(project.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onSelect(project)}
                          className="rounded-lg bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-500"
                        >
                          Explore ➔
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, project.id, project.name)}
                          className="rounded-lg border border-slate-700 p-1 text-slate-400 hover:border-rose-500 hover:text-rose-400"
                          title="Delete project"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State when no projects exist */}
        {!loading && !error && projects.length === 0 && (
          <div className="my-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center backdrop-blur">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-3xl text-blue-400 shadow-inner">
              🐘
            </div>
            <h3 className="mt-4 text-base font-bold text-white">No PHP Codebases Registered Yet</h3>
            <p className="mt-1 max-w-md text-xs text-slate-400 leading-relaxed">
              Add any local PHP repository or load our pre-configured fixture to see classes, static calls, syntax errors, and dead code mapped in a node graph.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleUseSampleFixture}
                className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 transition"
              >
                ✨ Load Sample Fixture
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition"
              >
                + Register PHP Folder
              </button>
            </div>
          </div>
        )}

        {/* Search Empty State */}
        {projects.length > 0 && filteredProjects.length === 0 && (
          <div className="my-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
            No projects matched your search <strong className="text-white">"{searchQuery}"</strong>.
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="ml-2 text-blue-400 underline hover:text-blue-300"
            >
              Clear filter
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
