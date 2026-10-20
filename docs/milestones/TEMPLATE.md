---
id: M0
status: shaping
kind: mvp
appetite: 2026-01-01..2026-01-14
summary: <…one line: what this bet delivers…>
---

# M0 — <name>

Version: 0.1 (<date>)

> A milestone is a bet, not an estimate. The appetite is how long it is **worth**; scope
> bends to fit it. MS1 checks this file.
>
> - `status`: shaping → active → closed, or killed. **One active at a time.**
> - `kind`: skeleton (the first, thinnest end-to-end path) · mvp · release · bet (after launch).
> - `kind: test` is a milestone that exists to run the test of untested value risks, named on a
>   `tests: RISK-1, RISK-2` line added under `kind`. Declaring one is the owner's call: record it in
>   decisions.md, marked decided, with a `Starts: M1.1 · RISK-1, RISK-2` line naming this milestone and the same
>   risks, with no comment, code fence or HTML block above it in decisions.md, and name that decision on a
>   `decided: PD-<n>` line before the milestone goes active. It may go active
>   before its risks have a Result, cannot close until each has one, and frees no other milestone; K1 checks it.
>   Other kinds have no `tests:` or `decided:` line.
> - `screens`: optional. A milestone in a project with a front end builds screens, and owes the accessibility
>   line under Gate below. `screens: none` says this one builds none (a data migration, a billing back end).
>   Any other value is a finding.
> - `design`: optional, `design: PD-<n>`. Names a decision in decisions.md that answers where the design for
>   this milestone's screens comes from, in place of a `Design:` item in Contents.
> - `appetite`: first and last day, inclusive. When it ends the milestone closes, is killed,
>   or gets an extension recorded in decisions.md (`extended: PD-<n>`). By default it does
>   not get more time.
> - `summary`: the one line the PRD's milestones table (§10) shows for this milestone. The table
>   is generated from these fields, never hand-written; MS1 flags a row that differs. A `|` in it
>   is written `\|` in the row.
> - Shaping milestones may hold placeholders. Active, closed and killed ones may not.
> - `Version:` is the line a `/review-doc` review of this milestone quotes. Any edit to `appetite` or
>   `extended`, or inside Why, Contents, No-gos, Rabbit holes, Gate or Kill criteria below, moves it, in the same
>   commit. Bookkeeping does not: an item's ` · #n` started marker, an `Owed:` or `Ran:` line, `status`, `summary` and the Retro.

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
- Screens built here meet WCAG 2.2 AA, held by
  <…what goes red: an automated accessibility check in CI, a keyboard and screen-reader pass in docs/qa/…>.
  Delete this line, and set `screens: none`, when the milestone builds no screens.

## Kill criteria

The observation that means stop or reshape instead of pushing on, written before starting.

- <…>

## Retro

Filled when the milestone closes or is killed, by `/close-milestone`, from the diff and the
issues, not from memory: planned vs shipped, what was cut, what was reworked and why, lessons
filed.
