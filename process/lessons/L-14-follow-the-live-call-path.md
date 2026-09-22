---
id: L-14
date: 2026-09-21
rule: Follow the live call path before building on behaviour you read.
failure: A fix lands in a near-namesake module that is not on the live call path.
enforcement:
  status: prose
  pointer: process/cold-review.md#L-14
  review-by: +90d
---

Near-namesake modules both contain true statements; only one of them runs. A short integration probe beats an hour of reading.
