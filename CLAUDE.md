# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

PHP Code Visualizer: a two-part tool that turns a PHP codebase into an interactive
Directed Acyclic Graph (DAG) of classes/methods and their call relationships, so
structural issues, circular dependencies, dead code, and syntax errors are visible
in a node-based UI. Full design rationale and phase breakdown live in
`docs/SPEC.md` — read it before making architectural changes.

The two halves communicate through exactly one artifact: a `graph.json` file
matching the schema in `docs/SCHEMA.md`. `backend/` produces it, `frontend/`
consumes it. There is no live API between them (at least not yet — see
`docs/SPEC.md` if that changes).

## Repo layout

- `backend/` — PHP CLI (Composer project, not Laravel Zero despite the original
  spec naming it — plain Composer + `nikic/php-parser` was chosen instead). Walks
  a target PHP directory, builds an AST per file, extracts class/method
  declarations (nodes) and method calls (edges), runs PHPStan for dead-code /
  warning data, and serializes the result to `graph.json`.
- `frontend/` — Vite + React + TypeScript app. Loads `graph.json`, runs it through
  `dagre` for auto-layout, and renders it with `@xyflow/react` (React Flow).
  Styling is Tailwind CSS v4 (via `@tailwindcss/vite`, no `tailwind.config.js` —
  v4 is CSS-first, configure via `@theme` in `src/index.css` if needed); the
  node inspector side panel uses Radix UI primitives.
- `docs/` — living documentation: architecture/spec, JSON schema, and phase
  status. Keep these in sync with the code — see "Keeping docs in sync" below.

Each half is independently runnable and has its own dependency manager
(Composer vs npm) — there is no root-level build tool tying them together.

## Commands

### Backend (`backend/`)

```
composer install                        # install nikic/php-parser + phpstan
php bin/visualize <path> [output.json]  # extract a PHP dir to graph.json (default output.json = graph.json)
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
  The frontend runs `dagre` over the raw nodes/edges before handing them to
  React Flow — don't add layout logic to the backend.
- **Node visuals are data-driven**: the custom React Flow node type (`codeNode`)
  changes appearance from `data.syntax_error` / `data.warnings` alone (red
  border = syntax error, muted/dashed = dead code). Keep new status flags
  flowing through `data` rather than inventing new node types.

## Keeping docs in sync

`docs/SPEC.md` and `docs/SCHEMA.md` are the source of truth for intent — when a
change in this session alters the schema, the phase plan, or a documented
architectural decision, update the relevant doc in the same session rather than
letting it drift. `docs/STATUS.md` tracks which phases are actually implemented;
update it whenever a phase moves from stub to working code.
