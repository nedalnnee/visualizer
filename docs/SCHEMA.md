# graph.json Schema

The single interchange shape between `backend/` and `frontend/`. Must conform
to React Flow's expected node/edge shape (`data` payload is free-form but the
fields below are contractual — both sides depend on them).

Despite the name, this is no longer necessarily a *file* — since Phase 5,
`GET /api/graph?project_id=` returns exactly this shape over HTTP, and
`backend/bin/visualize` still writes it to disk as before. Same schema,
two delivery mechanisms; keep both in sync with this doc.

```json
{
  "nodes": [
    {
      "id": "App\\Controllers\\UserController::store",
      "type": "codeNode",
      "data": {
        "label": "store()",
        "file_path": "app/Controllers/UserController.php",
        "start_line": 45,
        "end_line": 82,
        "syntax_error": null,
        "warnings": ["Dead code: Method is never called in project"]
      }
    }
  ],
  "edges": [
    {
      "id": "e_UserController::store_AuthService::login",
      "source": "App\\Controllers\\UserController::store",
      "target": "App\\Services\\AuthService::login",
      "animated": true
    }
  ]
}
```

## Field notes

- **`nodes[].id`**: fully-qualified `Class::method` string. This is the join
  key used to map PHPStan / dead-code-detector results back onto AST-extracted
  nodes — any analysis pass must produce/match this exact format (including
  namespace separators as `\\` in JSON, i.e. a single backslash).
- **`nodes[].type`**: always `"codeNode"` — the frontend's custom node
  component. No other node types are defined.
- **`nodes[].data.syntax_error`**: `null` for healthy nodes, or an error
  message/object for a file that failed to parse (see Phase 1 error
  resiliency in `docs/SPEC.md`). Drives the red-border state.
- **`nodes[].data.warnings`**: array of strings, currently used for dead-code
  flags. Empty array (not `null`) when there are none. Populated by
  `backend/src/Analysis/DeadCodeAnalyzer.php` — a node with no incoming edges
  in the graph gets `"Possibly unused: ..."`. This is a heuristic over
  Phase 1's own (incomplete) edge extraction, not a PHPStan/dead-code-detector
  result — see the Phase 2 note in `docs/SPEC.md` for why, and
  `docs/STATUS.md` for known false-positive classes.
- **`edges[].id`**: must be unique per edge; current convention is
  `` e_{source_short}_{target_short} `` — not yet strictly defined, treat as
  "unique string" rather than parsing it.
- **No coordinates**: nodes never carry `position`/`x`/`y` — layout is
  computed client-side by `dagre` before React Flow renders. If this changes,
  update both this doc and the "Layout is computed, not stored" note in the
  root `CLAUDE.md`.

## Versioning

This schema has no version field yet. If a breaking change becomes necessary,
add a top-level `"schema_version"` key rather than silently changing shape —
update this doc when that happens.
