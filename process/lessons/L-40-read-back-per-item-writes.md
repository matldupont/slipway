---
id: L-40
date: 2026-09-21
rule: A loop of per-item writes can no-op while a trailing echo prints success; confirm with an independent read-back.
failure: A loop reports success for writes that never landed.
enforcement:
  status: prose
  pointer: process/cold-review.md#L-40
  review-by: +90d
---

Success output from the loop is not evidence the writes landed.
