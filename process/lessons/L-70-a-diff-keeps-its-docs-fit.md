---
id: L-70
date: 2026-10-14
rule: A pull request that builds a feature doc reuses each pattern its Fit names under `Reuses:`, and computes each number where its `Numbers:` line says.
failure: expected, not yet seen — a second way of calculating one number, or of building one surface, grows feature by feature while each doc says it reuses the first (F-12, #48; D-036)
enforcement:
  status: prose
  pointer: process/cold-review.md#L-70
  review-by: 2027-01-14
---

F2 holds that a feature doc's Fit is there and filled, not that the build keeps it. The cold reviewer of the build pull request is where the two meet: the doc names what it reuses and where its numbers live, and the diff either does that or adds a second copy. The failure is the owner's expectation for features shaped side by side, not a cited instance; #49's pass over a milestone built with Fit is what would show it, and what reopens the check (D-036 as amended 2026-10-13).
