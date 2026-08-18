// Builds a directory/file tree from the flat file_path list on graph nodes,
// so ScopePicker can offer "module" (directory) and "file" selection without
// a separate backend endpoint — everything needed is already in the graph.

export interface FileTreeNode {
  name: string;
  /** Full relative path (POSIX-separated, matches data.file_path). Empty string for the synthetic root. */
  path: string;
  isFile: boolean;
  children: FileTreeNode[];
}

export function buildFileTree(filePaths: string[]): FileTreeNode {
  const root: FileTreeNode = { name: '', path: '', isFile: false, children: [] };

  for (const filePath of filePaths) {
    const parts = filePath.split('/').filter(Boolean);
    let current = root;
    let accumulated = '';

    parts.forEach((part, index) => {
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      const isFile = index === parts.length - 1;
      let child = current.children.find((c) => c.name === part && c.isFile === isFile);

      if (!child) {
        child = { name: part, path: accumulated, isFile, children: [] };
        current.children.push(child);
      }

      current = child;
    });
  }

  sortTree(root);
  return root;
}

function sortTree(node: FileTreeNode): void {
  node.children.sort((a, b) => {
    if (a.isFile !== b.isFile) {
      return a.isFile ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });
  node.children.forEach(sortTree);
}

export function collectFiles(node: FileTreeNode): string[] {
  if (node.isFile) {
    return [node.path];
  }
  return node.children.flatMap(collectFiles);
}

/**
 * Returns a copy of the tree containing only files whose path matches
 * `query` (case-insensitive substring) and the folders needed to reach them.
 * Empty/whitespace query returns the tree unchanged.
 */
export function filterTree(node: FileTreeNode, query: string): FileTreeNode | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return node;

  if (node.isFile) {
    return node.path.toLowerCase().includes(needle) ? node : null;
  }

  const children = node.children.map((c) => filterTree(c, needle)).filter((c): c is FileTreeNode => c !== null);
  if (children.length === 0) return null;

  return { ...node, children };
}
