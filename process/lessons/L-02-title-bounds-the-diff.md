---
id: L-02
date: 2026-09-21
rule: The ticket title bounds the diff; split or rename when the changed files exceed it.
failure: A change that reaches beyond what its title describes is reviewed only as widely as the title.
enforcement:
  status: prose
  pointer: process/cold-review.md#L-02
  review-by: +90d
---

Review attention follows the title. A diff wider than its title is reviewed at the width of the title.
