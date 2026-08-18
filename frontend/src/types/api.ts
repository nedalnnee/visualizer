// Mirrors backend/src/Repository/ProjectRepository.php's normalized row shape.
export interface Project {
  id: number;
  name: string;
  path: string;
  created_at: string;
}
