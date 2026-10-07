---
id: L-63
date: 2026-09-21
rule: The Stop hook blocks the first stop of a turn while the fast gate is red; a second stop ends the turn red, with the agent asked to say what is failing.
failure: An agent declares work done that was never run.
enforcement:
  status: check
  pointer: process/harness/hooks/stop-verify.sh
---

Instructions to verify are advisory and get skipped under pressure. A Stop hook is the one gate that blocks a turn once; CI stays the real gate.
