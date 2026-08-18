# PHP Code Visualizer — Developer Specification

> Source of truth for project intent and phase plan. If an implementation
> decision diverges from this doc (e.g. Composer instead of Laravel Zero),
> the divergence and reason should be noted here, not silently left stale.

## 1. Project overview

An interactive, visual representation of a PHP codebase to help developers
identify structural issues, circular dependencies, and redundancies (often
introduced by AI-assisted coding). Raw PHP is transformed into a Directed
Acyclic Graph (DAG) showing function/method call hierarchies, with syntax
errors and unused code flagged directly in a node-based interface.

## 2. Technology stack

| Component | Technology / Library | Purpose |
|---|---|---|
| Backend engine | PHP CLI (Composer project) | Command-line execution and file system traversal. *(Spec originally named Laravel Zero; plain Composer was chosen instead — no framework overhead needed for a single-purpose CLI.)* |
| AST parser | `nikic/php-parser` | Generating the AST to extract classes, methods, and method calls. |
| Static analysis | PHPStan (or `shipmonk/dead-code-detector`) | Identifying unused methods (dead code) and structural warnings. |
| Frontend framework | React (Vite) + TypeScript | Rendering the UI. |
| Graph renderer | `@xyflow/react` (React Flow) | Interactive, draggable node canvas and connection edges. |
| Auto-layout engine | `dagre` | Computing x/y coordinates to prevent node overlap. |
| Styling & UI | Tailwind CSS (v4) + Radix UI | Node styling and the metadata inspector side panel. |

## 3. Data interchange schema

See `docs/SCHEMA.md` for the authoritative, versioned schema. Summary: the
backend emits a `graph.json` with `nodes` (one per class method, keyed by
`FQCN::method`) and `edges` (one per method call), matching React Flow's
expected node/edge shape.

## 4. Implementation phases

### Phase 1: Backend extraction (the AST parser)
- Read a directory of `.php` files.
- Use `nikic/php-parser` with a custom `NodeVisitor`.
- Extract class definitions and method declarations → nodes.
- Extract method calls within those declarations → edges.
- **Error resiliency**: wrap parsing in try/catch. A file that fails to parse
  must produce a "failed" node (file path + line) in the payload instead of
  crashing the run.

### Phase 2: Static analysis & payload generation
- Run PHPStan (or a dead-code detector) programmatically.
- Map results onto extracted nodes by fully-qualified class/method name.
- Serialize the final graph to `graph.json`.

*(Implemented differently than spec'd: PHPStan / `shipmonk/dead-code-detector`
need the **target** project's own working Composer autoloader to run at all,
which this tool can't assume — it has to work against an arbitrary directory,
including its own fixture, which isn't a real Composer project. Phase 2 is
instead a self-contained heuristic — `DeadCodeAnalyzer` — that flags any
method node with no incoming edges in the graph Phase 1 already built. See
the "Edges are best-effort" note in the root `CLAUDE.md` and `docs/STATUS.md`
for the false-positive classes this inherits from Phase 1's edge scope.)*

### Phase 3: Frontend scaffolding & auto-layout
- Vite + React project loads `graph.json`.
- Pass nodes/edges through `dagre` to compute x/y before rendering, so the
  initial layout is readable rather than a tangle.

### Phase 4: UI/UX & interactivity
- Custom React Flow node component (`type: 'codeNode'`) that changes style
  based on the data payload:
  - Healthy code: neutral border/background.
  - Syntax error: red border + warning icon.
  - Dead code: muted opacity / dashed border.
- Inspector panel: Radix UI drawer, bound to React Flow's `onNodeClick`.
  Displays file path, line numbers, and any warnings/errors for the clicked
  node.

## 5. Success criteria

- Backend script executes across a standard Laravel/PHP project without
  crashing on syntax errors.
- Frontend renders 100+ nodes smoothly.
- Clicking any node opens a detailed view with exact file location and line
  numbers.
