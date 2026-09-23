---
id: L-26
date: 2026-09-21
rule: State the absolute working path in every spawned-agent prompt, twice, and run git status in that tree afterwards.
failure: A spawned agent given a relative working path acts in the wrong repository.
enforcement:
  status: prose
  pointer: process/slipway-rules.md#Agents
  review-by: +90d
---

A relative-path instruction is not a guarantee about the agent's actual working directory.
