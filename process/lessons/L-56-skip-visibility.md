---
id: L-56
date: 2026-09-21
rule: Make skipped work visible.
failure: deferred component, not yet built
enforcement:
  status: check
  pointer: sk1
---

A suite with skips prints what it skipped. SK1 fails a skip with no issue on its line and any focused test
(`.only`), and `pnpm verify` prints the skipped-test markers per package, zero test files included. Not enforced:
"zero tests run is never green", which verify only prints, and a job skipped by a path filter, which nothing prints
yet.
