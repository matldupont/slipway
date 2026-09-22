---
id: L-42
date: 2026-09-21
rule: An ownership filter on rows does not scope a display join; scope the read path and assert both halves.
failure: A query filters rows by owner but joins display data without the same scope, and leaks data across users.
enforcement:
  status: prose
  pointer: process/cold-review.md#L-42
  review-by: +90d
---

Scope every join that brings in display data, not only the row filter.
