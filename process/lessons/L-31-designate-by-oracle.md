---
id: L-31
date: 2026-09-21
rule: Allocate the expensive model by whether ground truth exists to check the answer.
failure: Model and effort are chosen by the kind of deliverable rather than by whether an oracle exists.
enforcement:
  status: prose
  pointer: process/designation.md
  review-by: +90d
---

With an oracle, verification does the work and the cases pick the tier, except discovery work, which takes the strongest tier (the tier that lands code, not the discovery tier). Without one, only a better thinker helps.
