---
id: L-57
date: 2026-09-21
rule: No workflow holds write access to main; permissions are declared per workflow.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: +60d
  trigger: the first workflow granting write permission
---

A workflow with write access to the deploy branch can push around review.
