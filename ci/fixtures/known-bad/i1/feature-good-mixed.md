### Problem
Search across projects returns stale results after a rename.

### Acceptance
- `pnpm test:search` exits 0
- Given a project renamed, when search runs within 5s, then results use the new name

### Contract
The indexer re-keys a project's documents by id, not by name, on every rename event; the
search API resolves a project name to its id before querying, so a stale name can never
return another project's rows. Error case: an unresolved name returns 404, not an empty
result. Full detail: [docs/features/search-rename.md](docs/features/search-rename.md).

### Verify
`pnpm test:search` — a property test that renames a project N times and asserts every
search resolves to the current id, never a stale one.

### Seams
none

### Seams detail
internal indexer change, no new person, channel or promise

### Links
Part of: #43 · Lane: feature
