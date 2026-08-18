# Implementation status

Tracks what's actually built vs. still a stub, per phase in `docs/SPEC.md`.
Update this whenever a phase moves state — this is the doc to check before
assuming something works.

| Phase | Description | Status |
|---|---|---|
| 1 | Backend AST extraction (nodes/edges from PHP source) | **Done** — `backend/bin/visualize <path> [output.json]` walks a directory, extracts class/method nodes and `$this->method()` / static-call edges, and writes `graph.json`. Parse errors produce a `ParseError::<path>` node instead of crashing. |
| 2 | Static analysis integration (PHPStan / dead-code mapping) | **Done, diverged from spec** — see below. Wired into `bin/visualize` automatically, no flag needed. |
| 3 | Frontend scaffold + dagre auto-layout | **Done** — loads `graph.json`, lays it out with `dagre`, renders with React Flow. Verified in a live browser (see below). |
| 4 | UI/UX: custom `codeNode`, inspector drawer | **Done** — verified live in a browser (styling + click-to-inspect). |
| 5 | Dashboard, multi-project, module/file scoping, cross-file expansion | **Done, not in original spec** — added post-Phase-4 at user request. See below. |

## Phase 1 details (as of 2026-08-18)

- `backend/src/Extractor.php` — walks the target directory (skipping
  `vendor`, `node_modules`, `.git`), parses each `.php` file with
  `nikic/php-parser`, and merges per-file nodes/edges. A parse failure is
  caught per-file and turned into a node rather than aborting the run.
- `backend/src/Visitors/CallGraphVisitor.php` — the `NodeVisitor` that does
  the actual extraction, run behind a `NameResolver` pass so class names
  resolve to FQCNs. Known scope limits (by design, not bugs):
  - Only two call shapes produce edges: `$this->method()` and static calls
    (`Class::method()`, `self::`, `static::`, `parent::`). Calls through
    other variables/properties (`$this->service->method()`,
    `$container->get(...)->method()`) require type inference we don't have
    yet and are silently skipped — no phantom edges.
  - `self`/`static` resolve to the enclosing class; `parent` resolves to the
    `extends` clause captured when entering the class. Multiple inheritance
    levels aren't walked (no MRO), so a `parent::` call more than one level
    up won't resolve correctly.
  - Free (non-class) functions aren't extracted, only class/interface/trait
    methods.
- `backend/tests/fixtures/sample/` — a hand-built 3-file fixture (two
  classes with a resolvable static-call edge and an unresolvable
  cross-object call, plus one file with a deliberate syntax error) used to
  manually verify extraction and error-resiliency. **No automated test
  runner is wired up yet** (no PHPUnit) — re-verify by hand after changes:
  `php bin/visualize tests/fixtures/sample graph.sample.json`.
## Phase 2 details (as of 2026-08-18)

- `backend/src/Analysis/DeadCodeAnalyzer.php` — **not** PHPStan or
  `shipmonk/dead-code-detector` as the spec named. Both require the *target*
  project to have its own working Composer autoload to run at all; this tool
  has to work against an arbitrary directory (including its own fixture,
  which isn't a real Composer project), so that dependency was dropped.
  Instead it's a pure graph pass over Phase 1's own output: any method node
  with no incoming edge gets flagged `"Possibly unused: ..."`. Magic methods
  (`__construct`, `__toString`, etc.) are always excluded since PHP calls
  them implicitly.
- Because this reuses Phase 1's edge set, it inherits the same blind spots:
  a method called only via `$this->service->method()`, DI container
  resolution, an interface, a route closure, or reflection has no edge
  pointing at it and will be **flagged as a false positive**. Verified against
  the fixture: `AuthService::unusedMethod` (truly dead) is correctly flagged,
  but so are `UserController::store` and `AuthService::login` (both false
  positives — called only through `$this->auth->login()`, the exact call
  shape Phase 1 documents as unresolvable). Treat every flag as "worth a
  human look," not "confirmed dead."
- If real PHPStan/dead-code-detector integration is wanted later, it would
  need to be opt-in (only run when the target has its own `vendor/autoload.php`)
  rather than replacing this pass, since this pass is what keeps the tool
  working on arbitrary/fixture input.

## Phase 3 details (as of 2026-08-18)

- `frontend/src/types/graph.ts` — TS types mirroring `docs/SCHEMA.md`. Keep
  these in sync by hand if the schema changes; nothing generates them.
- `frontend/src/hooks/useGraph.ts` — fetches `/graph.json` (served from
  `public/` in dev, or wherever it's deployed alongside the built app).
- `frontend/src/layout/dagreLayout.ts` — runs nodes/edges through `dagre`
  and returns nodes with computed `position`; `graph.json` itself never
  carries coordinates (see `docs/SCHEMA.md`).
- `frontend/src/components/GraphCanvas.tsx` — wires the above into
  `@xyflow/react`'s `<ReactFlow>` (`Background`, `Controls`, `MiniMap`).
  `App.tsx` now renders just this, full-screen; the default Vite template
  (`App.css`, `src/assets/`) was deleted as dead weight.
- **No custom node component yet** — nodes render via React Flow's built-in
  default fallback (reads `data.label`), which logs a
  `Node type "codeNode" not found ... Using fallback type "default"` console
  warning. That's expected until Phase 4 registers the real `codeNode`
  component; not a bug.
- Verified live in a browser via `npm run dev`: all 7 fixture nodes render
  with no overlap, both real edges (`store→validate`, `login→log`) draw
  correctly, pan/zoom/minimap/controls all work.
- `frontend/public/graph.json` (the committed sample used for this
  verification) **no longer exists** — Phase 5 replaced the fetch-a-static-file
  model with a live API (`GraphCanvas` now takes `graph` as a prop instead of
  fetching it). See Phase 5 below.

## Phase 4 details (as of 2026-08-18)

- `frontend/src/components/CodeNode.tsx` — the real `codeNode` React Flow
  node type, registered in `GraphCanvas.tsx`'s `nodeTypes`. Appearance reads
  only `data.syntax_error` / `data.warnings`: red solid border + warning icon
  for a syntax error, gray dashed/muted for warnings (dead-code flag),
  neutral otherwise. No new status flags without extending `CodeNodeData` —
  see the "Node visuals are data-driven" note in the root `CLAUDE.md`.
- `frontend/src/components/InspectorPanel.tsx` — Radix `Dialog` styled as a
  fixed right-side drawer (not a centered modal), bound to
  `GraphCanvas`'s `onNodeClick`. Shows label, file path, line range, node id,
  and the syntax-error/warnings boxes.
  - **Deliberately non-modal** (`modal={false}`, no `Dialog.Overlay`): a
    modal overlay swallows the click when jumping straight from one node to
    another, forcing a close-then-click-again interaction. Escape and
    click-elsewhere-to-close still work without it. Don't add the overlay
    back without re-testing node-to-node click switching.
- Verified live in a browser: clicking `Broken.php` shows the syntax-error
  box with the exact parse message; clicking `login()` (flagged dead by
  Phase 2, actually a false positive per its documented blind spot) shows
  the warnings box with the full hint text; switching directly between two
  nodes updates the panel without needing to close it first. No console
  errors.
- All four spec phases are now implemented end-to-end against the fixture.
  What's *not* done: automated tests (backend or frontend), running this
  against a real/large PHP project (only the 3-file fixture has been
  exercised — the "100+ nodes smoothly" success criterion in `docs/SPEC.md`
  is unverified), and the PHPStan-vs-heuristic dead-code gap noted in the
  Phase 2 section above.
