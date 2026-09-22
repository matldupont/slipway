---
id: L-09
date: 2026-09-21
rule: For each clause of a compound predicate, name the test that dies without it.
failure: A clause of a compound condition that no test kills silently changes the answer in an edge case.
enforcement:
  status: prose
  pointer: process/cold-review.md#L-09
  review-by: +90d
---

A clause no test kills is not defence in depth; it is a silent narrowing of what gets reported.
