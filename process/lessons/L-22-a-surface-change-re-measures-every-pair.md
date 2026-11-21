---
id: L-22
date: 2026-09-21
rule: Changing a background fill re-measures every text colour painted on it; compute each pair before and after.
failure: A colour change made for one surface drops an unrelated text and background pair below the contrast minimum.
enforcement:
  status: declined
  review-by: 2027-01-19
  trigger: the first themed UI surface with a stated contrast budget
---

Inert until the product has a themed UI and a contrast budget; then it needs a contrast check over the real pairs.

Reviewed 2026-11-20 (#686): the trigger has not fired; extended to 2027-01-19.
