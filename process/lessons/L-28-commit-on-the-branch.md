---
id: L-28
date: 2026-09-21
rule: Verify a commit is on the branch, not merely that it exists.
failure: A commit is created but never lands on the branch the PR is built from.
enforcement:
  status: structural
  pointer: BOOTSTRAP.md#0. Owner-only
---

With protection on main, work arrives only through a PR whose diff is checked; an off-branch commit is simply not in the diff.
