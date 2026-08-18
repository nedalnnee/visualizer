import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ProjectExplorer } from './components/ProjectExplorer';
import type { Project } from './types/api';

function App() {
  const [project, setProject] = useState<Project | null>(null);

  if (project) {
    return <ProjectExplorer project={project} onBack={() => setProject(null)} />;
  }

  return <Dashboard onSelect={setProject} />;
}

export default App;
