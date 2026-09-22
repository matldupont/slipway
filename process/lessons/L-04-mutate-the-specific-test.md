---
id: L-04
date: 2026-09-21
rule: Mutation-test the specific test, not the suite, and commit before mutating.
failure: A new test that cannot fail reads as coverage; restoring files from HEAD to mutation-test destroys uncommitted work.
enforcement:
  status: prose
  pointer: process/cold-review.md#L-04
  review-by: +90d
---

A red suite proves some test caught the mutation, not yours. Restoring from HEAD silently eats uncommitted work.
