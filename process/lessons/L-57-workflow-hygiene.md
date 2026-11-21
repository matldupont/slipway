---
id: L-57
date: 2026-09-21
rule: No workflow holds write access to main; permissions are declared per workflow.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: 2027-01-19
  trigger: the first workflow granting contents: write
---

A workflow with write access to the deploy branch can push around review.

Reviewed 2026-11-20 (#686): the only write grant is issues: write; no workflow holds contents: write, the harm the rule names. Extended to 2027-01-19.
