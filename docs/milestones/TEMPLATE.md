---
id: M0
status: shaping
kind: mvp
appetite: 2026-01-01..2026-01-14
---

# M0 — <name>

> A milestone is a bet, not an estimate. The appetite is how long it is **worth**; scope
> bends to fit it. MS1 checks this file.
>
> - `status`: shaping → active → closed, or killed. **One active at a time.**
> - `kind`: skeleton (the first, thinnest end-to-end path) · mvp · release · bet (after launch).
> - `appetite`: first and last day, inclusive. When it ends the milestone closes, is killed,
>   or gets an extension recorded in decisions.md (`extended: D-nnn`). By default it does
>   not get more time.
> - Shaping milestones may hold placeholders. Active, closed and killed ones may not.

## Why

The problem this milestone solves, citing FRAME and PRD IDs (F-01, RISK-2, OD-3).

## Contents

Vertical slices — each touches every layer it needs and can be demonstrated on its own. In
order. Each becomes one feature doc or one issue, and cites the PRD feature it builds (`F-01`)
or says `(no feature: <reason>)` — F1 checks this for active and closed milestones.

1. <…> (F-<…>)

## No-gos

What is deliberately out of this milestone, even if it is cheap, and where it goes instead.

- <…>

## Rabbit holes

Known ways this could run long, and the decision already made about each.

- <…>

## Gate

What goes red if the milestone is not done: a check id, a test path, a QA plan in
`docs/qa/`, a metric with a number. Never "feature complete".

- <…>

## Kill criteria

The observation that means stop or reshape instead of pushing on, written before starting.

- <…>

## Retro

Filled when the milestone closes or is killed, by `/close-milestone`, from the diff and the
issues, not from memory: planned vs shipped, what was cut, what was reworked and why, lessons
filed.
