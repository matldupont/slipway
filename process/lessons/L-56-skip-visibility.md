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
(`.only`), and `pnpm verify` prints the skipped-test markers per package and fails a package that declares `test`
and holds no test file. FO1 fails a gate that a `paths` or `paths-ignore` filter keeps from running on some change,
because a job a trigger filter skips never runs and cannot print that it did not.
