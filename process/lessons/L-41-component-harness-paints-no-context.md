---
id: L-41
date: 2026-09-21
rule: A component-test harness paints no page around the component; split behaviour assertions from composited measurements.
failure: A measurement taken in a component harness uses a background or context the real page never has.
enforcement:
  status: prose
  pointer: docs/testing-strategy.md#Instruments
  review-by: +90d
---

Name which instrument owns which measurement.
