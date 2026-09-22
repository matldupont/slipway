---
id: L-59
date: 2026-09-21
rule: Filter verify to affected packages only when CI time is a measured problem.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: +60d
  trigger: the CI verify job taking longer than 10 minutes
---

Dependents-inclusive filtering only; a filter that matches no package must fail, never pass. See decisions.md D-003.
