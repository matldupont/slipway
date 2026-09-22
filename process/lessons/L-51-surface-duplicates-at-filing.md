---
id: L-51
date: 2026-09-21
rule: Surface likely duplicates when an issue is filed.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: +60d
  trigger: the first issue closed as a duplicate
---

A workflow on issue open that comments with open issues and PRs sharing title terms or touched files. Self-filed duplicates are a common source of abandoned issues.
