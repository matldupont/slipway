---
id: L-51
date: 2026-09-21
rule: Surface likely duplicates when an issue is filed.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: 2027-01-19
  trigger: the first issue closed as a duplicate
---

A workflow on issue open that comments with open issues and PRs sharing title terms or touched files. Self-filed duplicates are a common source of abandoned issues.

Reviewed 2026-11-20 (#686): one issue closed as a duplicate so far (#680), not yet a pattern; extended to 2027-01-19.
