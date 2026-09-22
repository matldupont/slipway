---
id: L-36
date: 2026-09-21
rule: Do not report agent-rendered motion or responsive layout as verified; say what was not verified.
failure: A change is reported verified while something (motion, a real device, layout) was never checked.
enforcement:
  status: prose
  pointer: process/cold-review.md#L-36
  review-by: +90d
---

The PR template asks what was not verified; saying so is the honest line.
