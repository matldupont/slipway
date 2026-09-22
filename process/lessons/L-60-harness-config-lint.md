---
id: L-60
date: 2026-09-21
rule: Check the installed harness config.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: +60d
  trigger: the harness config being installed at bootstrap
---

A meta check over the installed .claude settings: no allow entry for destructive git operations, and every hook command absolute and resolvable.
