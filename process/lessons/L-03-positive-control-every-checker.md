---
id: L-03
date: 2026-09-21
rule: Positive-control every checker and report its denominator before trusting a clean run.
failure: A checker whose candidate set silently excludes some inputs reports "0 missing" while real misses exist.
enforcement:
  status: check
  pointer: m6
---

A checker that has never been seen to fail cannot be told apart from one that looks at nothing. M6 runs every check against a known-bad fixture.
