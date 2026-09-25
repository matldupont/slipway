---
id: L-10
date: 2026-09-21
rule: A declared test unit that nothing invokes never runs and never fails; check the invocation, not the declaration.
failure: A test suite or script that no workflow invokes reads as coverage.
enforcement:
  status: check
  pointer: w1
---

Declaration reads as coverage. W1 fails any gated script or check that no CI workflow runs.
