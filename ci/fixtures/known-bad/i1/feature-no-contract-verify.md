### Problem
Search across projects returns stale results after a rename.

### Acceptance
- `pnpm test:search` exits 0
- Given a project renamed, when search runs within 5s, then results use the new name

### Seams
none

### Seams detail
internal indexer change, no new person, channel or promise

### Links
Part of: #43 · Lane: feature
