---
id: L-07
date: 2026-09-21
rule: A regression fixture must disagree on the axis the bug lives on, generated at the boundary.
failure: A fixture that shares the disputed assumption (units, origin, timezone) passes however many cases it generates.
enforcement:
  status: prose
  pointer: docs/testing-strategy.md#Fixtures
  review-by: +90d
---

A fixture that shares the disputed assumption cannot observe the defect, however many cases it generates.
