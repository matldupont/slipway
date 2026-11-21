---
id: L-50
date: 2026-09-21
rule: Wire cold review as a required check on consequence-bearing paths.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: 2027-01-19
  trigger: the first change touching money, auth, schema or data deletion
---

A tier map (path patterns to money, auth, schema, infra) plus a required check on matching PRs. It requires a Cold review section whose reviewed sha equals the PR head and whose file and line references resolve in the diff.

Reviewed 2026-11-20 (#686): the trigger has not fired; extended to 2027-01-19.
