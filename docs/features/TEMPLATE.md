---
prd-ref: F-00
status: draft
---

# F-00 — <feature>

## Problem

What this solves, citing the PRD by ID.

## Contract

The unit of execution. Detailed enough that building it is mechanical: data shapes, states and
transitions, error cases, the endpoints and components touched. Decisions belong here, not in the PR —
agents produce slop when they are asked to decide while implementing.

Embed this section in the execution issue. A ticket that links to it instead is not self-sufficient.

Verified against: <main sha> <date> — every code-state claim above re-checked against `main` on that
date. Evidence rots within days; re-verify before building (L-18).

## Seams

Does this add a person, a channel, or a promise? `none` plus one line of why — or who pays, who is
counted, who is told, what is promised.

## Acceptance

```
Given …
When  …
Then  …
```

## Verify

The exact commands and test paths that prove the Contract. The execution issue carries this
block, and the work is not done until each one has been run and its output pasted in the PR.

```
pnpm verify
```

## Build map

Ordered, one PR per line where possible. Never put a visible surface and the machinery behind it in one
step: the surface ships and the machinery does not.

1. …

## Out of scope

What is deferred, and where it goes.

## Open questions

Each with an owner. When answered, the answer moves into Contract and the question stays, struck through.

## Changes

After `status: shipped`, behaviour changes are recorded here as deltas instead of rewriting
the Contract, so the doc stays true without losing its history. One line each:

- <date> · ADDED | MODIFIED | REMOVED · what changed · #PR
