---
id: L-56
date: 2026-09-21
rule: Make skipped work visible.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: +60d
  trigger: the first CI path filter or skipped test
---

A job skipped by a path filter, or a suite with skips, prints what it skipped. Zero tests run is never green.
