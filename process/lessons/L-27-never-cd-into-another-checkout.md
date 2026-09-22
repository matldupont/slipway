---
id: L-27
date: 2026-09-21
rule: Never cd into another checkout, even to read; parallel relative cd commands compound.
failure: A relative `cd` in parallel tool calls lands a commit in another checkout.
enforcement:
  status: prose
  pointer: CLAUDE.md#Agents
  review-by: +90d
---

Use git -C and confirm the repository root in the same call as the commit.
