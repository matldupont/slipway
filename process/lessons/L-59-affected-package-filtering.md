---
id: L-59
date: 2026-09-21
rule: Filter verify to affected packages only when CI time is a measured problem.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: 2027-01-19
  trigger: the CI verify job taking longer than 10 minutes
---

Dependents-inclusive filtering only; a filter that matches no package must fail, never pass. See decisions.md D-003.

Reviewed 2026-11-20 (#686): the trigger has not fired; extended to 2027-01-19.
