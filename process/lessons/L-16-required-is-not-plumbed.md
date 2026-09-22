---
id: L-16
date: 2026-09-21
rule: A required parameter makes the compiler name every call site, not answer it; table each caller's value.
failure: The cheapest value that satisfies a new required parameter reproduces the bug at a call site and still compiles.
enforcement:
  status: prose
  pointer: process/cold-review.md#L-16
  review-by: +90d
---

Compiling is not the same as being plumbed.
