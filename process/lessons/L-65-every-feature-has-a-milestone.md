---
id: L-65
date: 2026-09-22
rule: Every in-scope PRD feature is scheduled by a live milestone, and every active or closed milestone slice cites the feature it builds.
failure: A feature sits in the PRD and is silently never built, while slices no feature asked for fill the milestone.
enforcement:
  status: check
  pointer: f1
---

The PRD says what; milestones say when. Without a checked link between them, the order of work drifts from the plan and nobody notices until launch.
