---
prd-ref: F-00
status: draft
---

# F-00 — <feature>

Version: 0.1 (<date>)

The line above is the one a `/review-doc` review quotes. Any edit inside the Contract, Acceptance or Verify
below moves it, in the same commit, bar a line that begins `Verified against:`; a single acceptance block the owner
confirmed (`/log-bug`) is the one change that leaves it.

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

## Threat model

What this feature promises, and against whom: the bar a cold review measures findings against
(`process/cold-review.md#When to stop`). The baseline always holds and needs no restating: no secret
leaks, no injection, no auth or authz bypass, no loss of user data or work, no gate an agent can pass
without being asked. `none beyond baseline` is a valid answer, and most UI work gives it; say so.

A feature that adds a network call, a cache, a subprocess, stored secrets, user-supplied input or a
deletion must fill this in: what it defends, who it defends against, and what it does not defend.

## Known limitations

Gaps seen and accepted, one line each with why. A review finding that is already listed here is
dropped; a new one that breaks no guarantee is added here in the same PR instead of opening another
round.

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
