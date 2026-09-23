---
id: L-21
date: 2026-09-21
rule: Rebase- or squash-merging a base PR invalidates anything stacked on it.
failure: A misread `git cherry` result, pushed on, regresses the target branch.
enforcement:
  status: prose
  pointer: process/slipway-rules.md#Working rules
  review-by: +90d
---

In git cherry, a minus is conclusive; a plus only means "diff it and look".
