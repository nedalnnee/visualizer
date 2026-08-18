# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

PHP Code Visualizer: a two-part tool that turns a PHP codebase into an interactive
Directed Acyclic Graph (DAG) of classes/methods and their call relationships, so
structural issues, circular dependencies, dead code, and syntax errors are visible
in a node-based UI. Full design rationale and phase breakdown live in
`docs/SPEC.md` — read it before making architectural changes.

The two halves talk over a small live HTTP API (`backend/public/index.php`,
`composer serve`) rather than a static file — see "Dashboard / multi-project
API" below and Phase 5 in `docs/STATUS.md`. The `graph.json` shape itself
(`docs/SCHEMA.md`) is unchanged: it's just returned by `GET /api/graph` now
instead of being written to disk. `backend/bin/visualize` (the original
one-off CLI) still exists and still writes a file — useful for a quick check
without starting the server/DB.

## Repo layout

- `backend/` — PHP (Composer project, not Laravel Zero despite the original spec
  naming it — plain Composer + `nikic/php-parser` was chosen instead).
  - `src/Extractor.php` + `src/Visitors/CallGraphVisitor.php` — walks a PHP
    directory, builds an AST per file, extracts class/method nodes and
    method-call edges.
  - `src/Analysis/DeadCodeAnalyzer.php` — Phase 2's dead-code heuristic (see
    Architecture notes below).
  - `src/Db.php` + `src/Repository/ProjectRepository.php` — SQLite-backed
    project registry (`storage/visualizer.sqlite`, auto-created) for the
    dashboard's project list. Graphs themselves are never persisted — every
    `GET /api/graph` request re-runs extraction against the filesystem.
  - `public/index.php` — the API front controller (`composer serve`).
  - `bin/visualize` — the original one-off CLI, unchanged.
- `frontend/` — Vite + React + TypeScript app. `App.tsx` switches between two
  views: `Dashboard` (list/add projects, calls the API) and `ProjectExplorer`
  (fetches one project's full graph once, then does module/file scoping and
  cross-file expansion client-side — see Phase 5 in `docs/STATUS.md` for why).
  `GraphCanvas` is the reusable rendering piece: `dagre` auto-layout +
  `@xyflow/react`. Styling is Tailwind CSS v4 (via `@tailwindcss/vite`, no
  `tailwind.config.js` — v4 is CSS-first, configure via `@theme` in
  `src/index.css` if needed); the node inspector side panel uses Radix UI
  primitives.
- `docs/` — living documentation: architecture/spec, JSON schema, and phase
  status. Keep these in sync with the code — see "Keeping docs in sync" below.
- `run.cmd` — starts both dev servers (see "Run everything" below).

Each half is independently runnable and has its own dependency manager
(Composer vs npm) — there is no root-level build tool tying them together,
just `run.cmd` launching both.

## Commands

### Run everything

```
run.cmd
```

From the repo root — starts the backend API (`composer serve`, port 8000) and
frontend dev server (`npm run dev`, port 5173) each in their own window.
Requires `composer install` and `npm install` to have been run first (the
script checks and tells you if not). Open http://localhost:5173.

### Backend (`backend/`)

```
composer install                        # install nikic/php-parser + phpstan
composer serve                          # php -S localhost:8000 -t public — the dashboard's API
php bin/visualize <path> [output.json]  # one-off: extract a PHP dir straight to a JSON file, no server/DB needed
vendor/bin/phpstan analyse src           # static analysis
```

No automated test runner is wired up (no PHPUnit). Verify extraction changes
by hand against the fixture in `tests/fixtures/sample/`:

```
php bin/visualize tests/fixtures/sample graph.sample.json
```

The fixture is deliberately small: two classes with a resolvable static-call
edge, an unresolvable cross-object call (to confirm we don't fabricate
edges), and one file with a syntax error (to confirm error resiliency).

### Frontend (`frontend/`)

```
npm install       # install deps
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build (type-check is part of the build)
npm run preview   # preview a production build
npm run lint      # oxlint
```

No test runner is configured yet. When one is added, record the run command here.

`npm run dev` alone renders an empty dashboard ("No projects yet") unless the
backend API is also running (`composer serve` in `backend/`) — the frontend
has no bundled sample data anymore now that it talks to a live API. Add the
fixture as a project from the dashboard UI, or:
```
curl -X POST http://localhost:8000/api/projects -H "Content-Type: application/json" \
  -d "{\"name\":\"fixture\",\"path\":\"<repo>/backend/tests/fixtures/sample\"}"
```

## Dashboard / multi-project API (Phase 5)

`backend/public/index.php` (run via `composer serve`, port 8000) serves:
- `GET /api/projects` — list registered projects (id, name, path, created_at)
- `POST /api/projects` `{name, path}` — register a project; 422 if `path`
  isn't a directory on disk
- `GET /api/graph?project_id=<id>` — full Phase 1+2 extraction for that
  project's path, same shape as `docs/SCHEMA.md`, computed fresh every call

CORS is wide open (`Access-Control-Allow-Origin: *`) — this is a local dev
tool, not meant to be deployed as-is. The project registry lives in
`backend/storage/visualizer.sqlite` (SQLite, auto-created on first request);
nothing else is persisted — there's no graph cache, so a large target project
re-parses on every dashboard visit.

## Architecture notes

- **Node/edge identity**: nodes are keyed by fully-qualified `Class::method`
  strings (see `docs/SCHEMA.md`). Any code that maps PHPStan/dead-code results
  onto AST-extracted nodes must match on this exact key format.
- **Error resiliency is a hard requirement**: the backend must never crash on a
  malformed file. A parse failure becomes a "failed" node in the payload (file
  path + line) rather than aborting the run — see Phase 1 in `docs/SPEC.md`.
- **Edges are best-effort, not complete**: `CallGraphVisitor` only resolves
  `$this->method()` and static calls (`Class::method()`, `self::`, `static::`,
  `parent::`) into edges. Calls through other variables/properties need type
  inference we don't have and are silently dropped rather than guessed —
  don't "fix" this by adding fuzzy matching without discussing it, since a
  wrong edge is worse than a missing one for this tool's purpose. Full
  rationale and scope limits are in `docs/STATUS.md`.
- **Dead-code detection is our own graph pass, not PHPStan**: despite the
  original spec naming PHPStan / `shipmonk/dead-code-detector`,
  `DeadCodeAnalyzer` just flags nodes with no incoming edge in Phase 1's own
  graph — real PHPStan needs the *target* project's own working autoloader,
  which we can't assume. This means it inherits every false positive Phase 1's
  edge scope produces (see above). Don't read a `warnings` entry as
  "confirmed dead" when writing frontend UI for it — word it as a hint, per
  the wording already in `DeadCodeAnalyzer::FLAG`.
- **Layout is computed, not stored**: `graph.json` carries no x/y coordinates.
  `frontend/src/layout/dagreLayout.ts` runs `dagre` over the raw nodes/edges
  before handing them to React Flow (`GraphCanvas.tsx`) — don't add layout
  logic to the backend.
- **Node visuals are data-driven**: `frontend/src/components/CodeNode.tsx`
  (registered as React Flow's `codeNode` type in `GraphCanvas.tsx`) changes
  appearance from `data.syntax_error` / `data.warnings` alone — red border =
  syntax error, muted/dashed = dead-code flag. Keep new status flags flowing
  through `data` rather than inventing new node types.
- **Scoping and cross-file expansion are client-side, not new API calls**:
  `ProjectExplorer.tsx` fetches one project's *entire* graph once, then
  derives the file tree, the currently-rendered subset (`scopeFiles`), and
  expansion (`expandedNodeIds`) all by filtering that one payload in memory.
  There's no `/api/graph?scope=...` endpoint — don't add one without a reason
  (like the target scale actually outgrowing "fetch once, filter locally").
- **Clicking a node both opens the inspector and expands connections**: in
  `GraphCanvas.tsx`, `onNodeClick` does both — `ProjectExplorer`'s handler
  adds any not-yet-visible neighbor nodes (which may be in a different file)
  into `expandedNodeIds`, merging them into the same canvas. This is *how*
  "click a node with an external connection and it renders the other file"
  is implemented — don't reintroduce a separate "expand" button/affordance
  without discussing it, it was a deliberate single-interaction choice.
- **Project registry is SQLite, not MySQL**: despite MySQL being the initial
  ask, there was no reachable local MySQL/MariaDB with known credentials, so
  `backend/src/Db.php` uses `pdo_sqlite` against a file in `backend/storage/`
  — zero setup, auto-creates its schema on first connection. If this needs to
  become MySQL later (e.g. multi-user access), that's a `Db.php` swap; the
  `ProjectRepository` interface shouldn't need to change.
- **The inspector drawer is deliberately non-modal**:
  `frontend/src/components/InspectorPanel.tsx` sets Radix Dialog's
  `modal={false}` and skips `Dialog.Overlay` on purpose — a modal overlay
  would swallow the click when jumping straight from one node to another
  (verified: it did, before this was changed). If you touch this component,
  re-verify node-to-node click switching still works without a
  close-then-click-again step.

## Keeping docs in sync

`docs/SPEC.md` and `docs/SCHEMA.md` are the source of truth for intent — when a
change in this session alters the schema, the phase plan, or a documented
architectural decision, update the relevant doc in the same session rather than
letting it drift. `docs/STATUS.md` tracks which phases are actually implemented;
update it whenever a phase moves from stub to working code.
