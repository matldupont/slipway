---
id: L-68
date: 2026-09-23
rule: Run another cold-review round only for a finding that breaks a guarantee the spec states; environment edge cases are limitations or follow-ups, and a review that keeps finding them means the change holds surface it should not.
failure: PR #20 (template sync step 2) went three refute-by-default rounds without converging. Each round found a deeper case in one `git ls-remote` call the spec had added to new-project (tokens, prompts, askpass helpers, forks), five follow-ups were filed, and the round cap was the only stop. The spec had no threat model, so every finding read as FIX. Moving the network call out of new-project removed the whole class.
enforcement:
  status: prose
  pointer: process/cold-review.md#When to stop
  review-by: +90d
---

A review with no bar finds a new layer every round. Write the threat model, then review against it.
