---
id: L-15
date: 2026-09-21
rule: Changing a shared predicate for one caller creates the divergence you were fixing; list every caller first.
failure: A shared predicate changed for one caller makes two surfaces answer the same question differently.
enforcement:
  status: prose
  pointer: process/cold-review.md#L-15
  review-by: +90d
---

If some callers cannot supply the new input, choose semantics that need none, or make the change for every consumer.
