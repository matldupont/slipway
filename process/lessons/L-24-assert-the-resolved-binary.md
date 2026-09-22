---
id: L-24
date: 2026-09-21
rule: After a pinned install in CI, assert the resolved binary; N identical auto-filed issues are one cause.
failure: A tool upgrade "succeeds" while the command still resolves the old binary.
enforcement:
  status: prose
  pointer: process/cold-review.md#L-24
  review-by: +90d
---

The install succeeding and the command changing are different facts.
