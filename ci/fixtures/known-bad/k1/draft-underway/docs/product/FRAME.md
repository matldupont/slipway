---
status: draft
---

# <Product> — Frame

> Step 1 of the slipway path (`SLIPWAY.md`). One page: whose job this product does, the single question it
> answers, and what could kill it. Written before the PRD, and before any production code.
> `/kickoff` drafts it by asking one question at a time.
>
> K1 checks it. While `status: draft` it may hold placeholders and NEEDS CLARIFICATION markers
> (in square brackets, so `pnpm status` can count them). Set `status: framed` when none
> remain; no milestone can start before that. No milestone past the walking skeleton can
> start until every **value** risk has a Result.

## Job story

When <…situation…>, I want to <…motivation…>, so I can <…outcome…>.

The situation is a moment, not a persona. The outcome is what changes in the person's life,
not a feature.

## The question it answers

<…the one question a user brings to the product, in their words…>

Every MVP feature must serve this question. A feature that does not is a later bet.

## Four forces

| Force | What it is for this job |
|---|---|
| Push — what's wrong with today | <…> |
| Pull — what the new way promises | <…> |
| Anxiety — what makes switching scary | <…> |
| Habit — what they do instead, today | <…spreadsheet, another app, nothing…> |

Habit is the real competitor. Name it precisely.

## Non-users

Who this is deliberately not for, and why.

## Press release

Half a page, written as if launch day happened. Headline, who it's for, the problem, how it
solves it, one customer quote, how to start. If it cannot say why this beats the habit above,
the idea is not ready.

<…>

## Hard questions

Five questions a skeptic would ask, answered honestly. At least one is "why is this better
than <habit>?" and one is "why would someone pay?"

1. <…>

## Risks

The assumptions that could kill the product. Category is one of **value** (will they want
it), **usability** (can they use it), **feasibility** (can we build it), **viability** (does
it work as a business), **ethical** (could it do harm). Test the riskiest first, as cheaply
as possible — interviews, a concierge run done by hand, a fake door — before building.

Write the Threshold **before** the test. K1 fails a Result with no Threshold. A Result may be
a decision override (`PD-<n>`) when you proceed despite the evidence.

| ID | Assumption | Category | Impact if wrong | Cheapest test | Threshold (set before) | Result | Tracker |
|---|---|---|---|---|---|---|---|
| RISK-1 | <…> | value | <…> | <…> | <…> | | |

Evidence — interview notes and test results — lives in `docs/product/evidence/`.
