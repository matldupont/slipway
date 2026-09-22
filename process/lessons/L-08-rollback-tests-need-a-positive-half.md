---
id: L-08
date: 2026-09-21
rule: A rollback or abort test ends by proving the operation does land once unblocked.
failure: A rollback test that asserts only the pre-state also passes when the operation never ran.
enforcement:
  status: prose
  pointer: docs/testing-strategy.md#Rollback
  review-by: +90d
---

The pre-state a rollback test asserts is also what an operation that never ran leaves behind.
