---
id: L-64
date: 2026-09-21
rule: Every event in docs/product/metrics.md is referenced in code, and a smoke test proves analytics fire on the deployed tree.
failure: A funnel is redesigned while analytics are silently dead, and the weekly review reads a funnel that records nothing.
enforcement:
  status: declined
  review-by: +60d
  trigger: the first user-facing surface ships (M1 gate)
---

A check (A1) that the event table and the code agree, plus an end-to-end assertion that the analytics request leaves the deployed page. Deferred until there is an app to check.
