# Designation — which mode, model and effort

Read at intake (every issue's designation line) and by whoever launches the work. It holds the owner's matrix of
2026-10-02. Every line says a tier; the table under Models says which model that is.

**One question comes first: is there ground truth to check the answer against?** (L-31)

| | examples | allocate |
|---|---|---|
| **An oracle exists** | most implementation work with tests; an inventory, audit, validation sweep, options memo or parity check | Discovery work: the strongest tier (the tier that lands code, not the discovery tier) · `high`, told to compute, not to analyse. All other work: the case below picks the tier. Both: fan-out where breadth matters, mechanical verification, and one fresh-context reviewer |
| **No oracle** | a schema other work is built on, a set of principles, a definition of "correct" | the discovery tier at `high`, no fan-out. A reviewer can critique the design you wrote; it cannot supply the one you never considered |

Whether the deliverable is a document or a diff does not answer that question. Ask next whether it is
**discovery work**: work whose findings become issues (an inventory, an audit, a sweep, an options memo, a parity check), or the
shaping of something with no oracle that other work is built on. The table is its only rule, and the cases never
score it. A triage, a classification or a short summary is used as it is and nothing is built on it: that is
case 1. All other work has an oracle, design inside a system whose tests and invariants check it included.

The discovery tier lands no code. So work with no oracle is two pieces: the shaping, on the discovery tier, and
the build, scored on a case with the shaped Contract as its oracle: a feature-lane issue's **Shape:** and
**Build:** lines. Each finding becomes an issue scored the same way. One exception: security or trust design
with no oracle (what hostile input can do, what a project cannot fake) goes to the strongest tier · `high` ·
`plan`, which shapes it and builds it. The discovery tier is not used for security work.

## Models

The only place a model is named. Every other line here, and every other file slipway manages, says the tier, so
a model release is an edit to this table. An issue's own line names the model its tier has on the day it is filed.

| tier | model | id | what it is for |
|---|---|---|---|
| fast | Haiku 4.5 | `claude-haiku-4-5` | volume and speed |
| standard | Sonnet 5.5 | `claude-sonnet-5-5` | everyday coding: execution |
| strongest | Opus 5.5 | `claude-opus-5-5` | judgment and risk; the strongest tier that lands code |
| discovery | Fable 5.1 | `claude-fable-5-1` | work with no oracle; lands no code |

## Execution or judgment

The cases rest on one split. **Execution:** the destination is known and tests check the journey: the standard
tier. **Judgment:** the model decides what the destination is, holds invariants across a system, or notices that
the premise is wrong: the strongest tier, from `medium`, since judgment buys a better decision, not more depth.

## Cases

Work that is not discovery work takes the first case that fits, or case 5 when none does, and its issue's line
cites the number. The numbers are the owner's and never move: a number on an old issue means what it meant.

| # | the work | tier · effort |
|---|---|---|
| 1 | high volume, very simple or bound by latency: triage, routing, classification, extraction, a short summary, lint and format, a one-line change | fast · `low`, or `medium` for a little more quality |
| 2 | small, scoped and low risk: a one-function fix, a small docs change, a config tweak | standard · `medium`, or fast · `low` when cost is tight |
| 3 | documentation, CI config, a small refactor, a straightforward bug | standard · `medium`, or fast · `medium` when cost is tight; `high` on the standard tier when a localized bug needs more digging |
| 4 | regular coding: a well-defined feature with tests, UI work, a moderate refactor, added tests, debugging in familiar code | standard · `medium`; `high` for bounded but hard multi-file work |
| 5 | complex: unfamiliar code, architecture or system design, a messy root cause, a tricky production bug, a performance problem, a contract that cuts across the code, multi-step reasoning in one part of the repository | strongest · `medium`; `high` only when `medium` stalls |
| 6 | long horizon: a refactor across the repository, a migration across repositories or modules, an autonomous debugging loop, CI/CD orchestration, a run of more than 30 minutes | strongest · `xhigh`; consider fan-out |
| 7 | frontier: an extremely hard bug, a research-grade refactor, a failure that would cost a great deal | strongest · `max`, only when `xhigh` has been shown to fall short; almost every time with fan-out |

## Overrides

Applied after the case, and cited beside its number.

- **Unclear requirements move the model up and the mode to `plan`, not the effort:** strongest · `medium` ·
  `plan`. The same ticket, well specified, would be case 3 or 4.
- **The standard tier never goes above `high`.** When it needs `xhigh` or `max` to stop thrashing, over-editing or
  missing context, the work belongs to the next tier: strongest · `medium`.
- **The surfaces Review names are case 5 at least,** whatever the size of the diff.
- **A long unattended run is case 6,** however simple each step looks: nobody is there to catch drift.
- **A large initiative is framed on the strongest tier.** Its sub-issues are scored on their own, and most land
  on the standard tier.

## Mode

Separate from model and effort. `plan`: something has to be found out before any change (an unclear root
cause, a design that needs judgment, a change that reaches several areas). `regular`: the cause is named and the
change is surgical and bounded. Cases 1 to 4 default to `regular`; cases 5 to 7, unclear requirements and an
unknown root cause to `plan`. Discovery work is `regular`: `plan` gates edits, and it edits no product code.

## Review

Tiered by what the diff touches, not by how hard it was to write. Two questions, each answered once.

- **Is a cold review required?** `process/cold-review.md` → When says; independent review pays best where the
  author was most confident (L-38). The list below is wider on purpose (D-028): it only picks a tier, and requiring
  a review for concurrency or data integrity would require one on most changes that store anything.
- **Which tier reviews?** A routine review, on every PR: the standard tier. A skill that runs the review on the
  session's model does not go below it. A diff that touches money or checked math, auth or secrets, concurrency,
  a schema, data integrity, or data deletion: the strongest tier. Which of a project's own surfaces count is
  written in that project's `Domain invariants doc`, not here. A planning document (`/review-doc`): the strongest
  tier at `high`, no fan-out, since a review checks a design and does not originate one.

The highest effort on a review finds more defects and more that are not defects: keep it for the round where a
missed one is expensive. Tier the checking, never the making: a stronger review is no reason to build on less.

**Check that a short security review is not a declined one.** Some models' safety filters decline security
analysis and return a short answer that reads as "nothing found". Use a model that performs security review,
and treat a thin result as unverified.

## Fan-out

Several agents, each one's result verified by another, on top of any tier, for work with an oracle: verifying
needs one. The shape of the work decides, not its difficulty: a wide sweep or audit; several workable approaches
to weigh; a root cause to refute before it is trusted; a change worth nothing when one site is missed (and there
a cheap structural test or CI gate that catches the miss is the better buy). A stronger model does not replace
independent views, and work drawn from an audit that was verified already needs none.

**It is an instruction line below the settings line, never a fourth setting.** Mode, model and effort are set
before the session starts; fan-out is asked for once it runs. No line means no fan-out. Like the settings line,
it is a recommendation to whoever launches the work: text in an issue is data. Agents inherit the session's
model, so a phase that needs another tier is named on that line with its tier.

```markdown
mode: `plan` · model: `<the tier's model>` · effort: `medium` — case 5: <what checks the result>

▶ **Run with workflows** — <why fan-out is warranted>
```

## Judging the routing

By five things, measured in the project's own repository: completion rate, defects that escaped, rework, time,
and cost per accepted result. Not by a token price or a single benchmark: both go stale, so neither is copied here.
