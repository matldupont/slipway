---
id: L-63
date: 2026-09-21
rule: An agent turn does not end while the fast gate is red.
failure: An agent declares work done that was never run.
enforcement:
  status: check
  pointer: process/harness/hooks/stop-verify.sh
---

Instructions to verify are advisory and get skipped under pressure. A Stop hook is the one gate a turn cannot talk past; CI stays the real gate.
