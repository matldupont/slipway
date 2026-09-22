# <Product> — Product Requirements

Version: 0.1.0
Status: draft

> Every requirement has a stable ID (PRIN-1, DIV-1, F-01, OD-1, RISK-1). Feature docs, issues and reviews
> cite IDs, never headings: headings get renamed, IDs do not. Reviews pin the `Version:` line above and R1
> checks it, so bump it on every substantive change.

## 1. Problem

What is wrong or missing, for whom, and the observation that shows it. One paragraph.

The job story, the question the product answers, and the risks live in
`docs/product/FRAME.md` — cite them (RISK-1), do not restate them. A feature that does not
serve FRAME's question belongs in §4 *Out, explicitly*.

## 2. Principles

Load-bearing. A requirement that violates a principle is wrong even if someone asks for it; changing a
principle is a recorded divergence (§3).

| ID | Principle | What it rules out |
|---|---|---|
| PRIN-1 | | |

The right-hand column is the point. A principle that names what it forbids can be seen being violated.

## 3. Divergences from sources

Where input documents disagree, this PRD decides and records the decision.

| ID | Source position | This PRD | Rationale |
|---|---|---|---|
| DIV-1 | | | |

## 4. Scope — the v1 boundary

- **In:** …
- **Out, explicitly:** … — each with where it goes: a later phase, never, or an open decision.
- **Non-users:** who this is deliberately not for.

## 5. Features

### F-01 — <name>

What it is, priority, effort.

**Acceptance.** Every criterion checkable: a number, a command, a comparison, an identity, or
Given/When/Then.

```
Given …
When  …
Then  …
```

**Edge cases.** …

## 6. Invariants

Rules the product may never break live in `docs/domain-invariants.md`, each citing the test that enforces
it. Reference them here by ID only.

## 7. Open decisions

Every open item carries a **working assumption** and the **cost if that assumption is wrong**, so nothing
blocks.

The exception: a question that can invalidate the *business* rather than the build is marked **BLOCKING**,
gets no working assumption (none would be honest), and names an owner.

### OD-1 — <question>

- **Owner:** … · **Needed by:** <phase or gate>
- **Options:** (a) … (b) …
- **Working assumption:** … *(omit and mark BLOCKING only if the answer can invalidate the business)*
- **Impact if wrong:** …

## 8. Risks and unknowns

| ID | Risk or unknown | Spike (issue) | Resolves by |
|---|---|---|---|
| RISK-1 | | #… | |

An unknown with no spike is a hope. Put non-engineering unknowns (legal, commercial, third-party access)
first: their lead times are longest, and they change scope rather than size.

## 9. Estimate

Show the arithmetic: hours available per week × weeks, against the scope listed. If the number is not
defensible, say so here and list the options: re-baseline, cut, or cut something else and name it. Never
rewrite it silently.

## 10. Story map and milestones

### Story map

The user's journey left to right (activities, from FRAME's job story), the features that serve
each activity underneath, and slice lines across. Each slice line is a milestone: the first is
the walking skeleton — the thinnest path across the *whole* journey — the next answers FRAME's
question for real users, the next is what it takes to charge or launch.

| Slice | <…activity 1…> | <…activity 2…> | <…activity 3…> |
|---|---|---|---|
| M1 skeleton | F-01 (thinnest) | … | … |
| M2 MVP | … | … | … |
| M3 launch | … | … | … |

**Ranking rule, in order:** (1) the slice that tests the riskiest open assumption (FRAME
Risks); (2) what later slices depend on; (3) value to the user. Write down why each feature sits
on its line; a feature below the last line is §4 *Out, explicitly*.

### Milestones

Milestones are files in `docs/milestones/`, one per bet, each with an appetite, no-gos, a gate
and kill criteria (MS1 checks them). Each milestone's Contents cite the F-IDs they build, and
every §5 feature is cited by some milestone (F1 checks both once the PRD leaves draft). List
them here by ID only, in order.

| Milestone | Kind | One line |
|---|---|---|
| M1 | skeleton | walking skeleton — thinnest core path, deployed through CI |

A gate is something that fails, never a milestone name.

## Change log

| Date | Version | Change |
|---|---|---|
| | 0.1.0 | Initial draft |
