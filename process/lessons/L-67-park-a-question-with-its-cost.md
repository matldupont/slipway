---
id: L-67
date: 2026-09-23
rule: A question you proceed without is parked with a working assumption, the cost if it is wrong, and a tracker — never left as an open marker.
failure: A question gets a ticket somewhere and stays written as unresolved, so nothing says whether work may continue, and the assumption everything was built on is never written down. In a private project (#9, #14) it happened with this rule in place — the concierge issue was filed while the marker still said NEEDS CLARIFICATION, and RISK-2's test issue had nowhere to go but a note in the Cheapest-test cell, so `pnpm status` could not tell a scheduled test from an untested one.
enforcement:
  status: check
  pointer: k1
---

Most questions do not block: you can build on an assumption. What makes that honest is saying which assumption, what it costs if it is wrong, and where the real answer is being chased. `/clarify` writes them that way, files the tracker and converts the marker in one step, and `pnpm status` lists them.

An untested risk is the same debt. K1's `risk/untracked` requires every untested value risk to name its tracker (FRAME's Tracker column, or `Tracked:` in its evidence file) once a milestone is underway, and `pnpm status` shows it as scheduled or untested.
