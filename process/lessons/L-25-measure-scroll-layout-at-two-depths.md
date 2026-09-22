---
id: L-25
date: 2026-09-21
rule: Scroll-dependent layout is measured in a real browser at two scroll depths.
failure: Sticky or scroll-linked behaviour passes component tests and fails in the page, which has a scroll range the tests lack.
enforcement:
  status: prose
  pointer: docs/testing-strategy.md#Layout
  review-by: +90d
---

Component tests have no scrollport.
