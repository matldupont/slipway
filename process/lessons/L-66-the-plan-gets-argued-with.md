---
id: L-66
date: 2026-09-22
rule: A PRD that has left draft has an adversarial review of its current version, written from a fresh context into docs/reviews/.
failure: The plan is reviewed as a code diff, or in a chat that leaves no file, so nothing records that it was argued with — and the next version silently inherits the same assumptions.
enforcement:
  status: check
  pointer: r1
---

Reviewing the pull request that carries a document is not reviewing the document: one reads a diff, the other argues with the reasoning. `/review-doc` writes the second kind where R1 can see it.
