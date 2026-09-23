# dev — slipway's own planning

Slipway builds itself with its own path, but its `docs/` is the template a new project starts from:
a spec written there ships to every project. Slipway's own planning lives here instead. `new-project`
never copies this directory.

- `features/` — feature docs for slipway's own work, in the shape of `docs/features/TEMPLATE.md`.
  Execution issues embed their Contract and `Verify` block, as `CLAUDE.md` asks.
- `ownership.yaml` — the class of every path slipway ships (`managed`, `seeded`, `merged`, `internal`).
  `new-project` copies by it and O1 fails on a path it does not classify.
