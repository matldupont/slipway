---
id: L-53
date: 2026-09-21
rule: Build once, promote the artefact, and never gate a deploy more narrowly than a PR.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: 2027-01-19
  trigger: the first deploy workflow
---

The deploy runs pnpm verify on the exact tree it ships and promotes that build. A deploy gate narrower than the PR gate lets an untested tree ship.

Reviewed 2026-11-20 (#686): the trigger has not fired; extended to 2027-01-19.
