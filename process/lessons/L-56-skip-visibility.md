---
id: L-56
date: 2026-09-21
rule: Make skipped work visible.
failure: deferred component, not yet built
enforcement:
  status: check
  pointer: sk1
---

A skipped test passes CI while proving nothing. SK1 fails a skip with no issue on its line and any focused test
(`.only`), and `pnpm verify` prints the skipped-test markers per package, zero test files included. A job skipped
by a path filter is not covered: nothing prints it yet.
