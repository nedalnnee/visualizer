# Implementation status

Tracks what's actually built vs. still a stub, per phase in `docs/SPEC.md`.
Update this whenever a phase moves state — this is the doc to check before
assuming something works.

| Phase | Description | Status |
|---|---|---|
| 1 | Backend AST extraction (nodes/edges from PHP source) | **Done** — `backend/bin/visualize <path> [output.json]` walks a directory, extracts class/method nodes and `$this->method()` / static-call edges, and writes `graph.json`. Parse errors produce a `ParseError::<path>` node instead of crashing. |
| 2 | Static analysis integration (PHPStan / dead-code mapping) | **Done, diverged from spec** — see below. Wired into `bin/visualize` automatically, no flag needed. |
| 3 | Frontend scaffold + dagre auto-layout | Not started — Vite/React/TS app scaffolded, dependencies installed (`@xyflow/react`, `dagre`, Tailwind v4, Radix UI), but still the default Vite template; no graph loading or layout code yet |
| 4 | UI/UX: custom `codeNode`, inspector drawer | Not started |

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

## Scaffold state — frontend (as of 2026-08-18)

- `frontend/`: Vite React-TS template generated, `@xyflow/react`, `dagre`,
  `@types/dagre`, `@radix-ui/react-dialog`, `@radix-ui/react-icons`, and
  Tailwind v4 (`@tailwindcss/vite`) installed and wired into
  `vite.config.ts` / `src/index.css`. Build verified working
  (`npm run build`). Directory placeholders exist for `components/`, `hooks/`,
  `layout/`, `types/`, `data/` but contain no code.

There is no real `graph.json` checked into the repo yet — the frontend has
nothing to load until Phase 3 wires it up to backend output (or a fixture
copy of it).
