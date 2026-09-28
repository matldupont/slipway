---
prd-ref: D-019
status: draft
---

# F-05 — Experience settles a value risk; `/kickoff` interviews for the why

## Problem

K1 lets nothing past the walking skeleton until every **value** risk in `docs/product/FRAME.md` has a Result
from a test with a Threshold written first. That is right for most products and wrong for two honest cases
(#47, from the 2026-09-24 audit behind #43):

- **Table stakes.** In some domains (money, legal) a product without a feature is not usable at all, so
  there is nothing to test.
- **The creator is the user, or a domain expert already knows.** Years of doing the job are evidence; they
  are just not a spreadsheet.

Today the only way through is a decision in `decisions.md` that reads like a waiver, which kills momentum at
step 2. Separately, saying *why* a gut feature is right is a skill not every engineer has, and `/kickoff`
should do that work with them rather than accept "I know".

**Job:** when I frame a product whose value risk I already know from experience, I want to say why and what
would prove me wrong, so I can build past the skeleton without inventing a test or writing a waiver.

Evidence: #47; the code as it stands (K1's `risk/no-threshold` and `risk/unresolved`, `pnpm status`'s
`untested`, `/kickoff` step 7 asking only for a Threshold). Workaround today: a `PD-n` override in the Result
cell. Serves L-61 (frame before build) and D-016 (every message names the project's own thing).

**Verdict: PROCEED**, as a closed list of rationales plus a mandatory refutation line.

| option | for | against | verdict |
|---|---|---|---|
| do nothing | no change | every real first FRAME writes a waiver; momentum lost at step 2 | rejected |
| closed rationales + a `Wrong if:` line in the evidence file | honest, checkable, FRAME stays one page | one more per-risk line to parse | **proceeds** |
| the refutation in FRAME's Threshold cell | no new parsing | prose in a table cell; overloads "bar set before" | rejected (owner, 2026-09-28) |
| free-text rationale | flexible | an excuse box nothing can refute | rejected |

## Contract

### What settles a value risk

A value risk's Result is one of: a measured result against its Threshold (today); a decision id that builds
ahead of the evidence (today); or, new, **experience**:

- FRAME's `Result` cell reads `experience: <rationale>`. The rationale is exactly one of **table stakes**,
  **creator is the user**, **domain expertise**, matched case-insensitively on the cell's plain text (bold
  and `experience — …` read the same). `Threshold` may stay empty: the refutation line below is that row's
  bar. No Tracker is needed: the risk is settled, not scheduled.
- The risk's evidence in `docs/product/evidence/` carries one line, **`Wrong if: <what would prove it
  wrong>`**, in the owner's words. It sits where `Tracked:` and `Window:` already sit: in a file named
  `RISK-n-…md`, or under a `### RISK-n` heading in a shared file. A `Wrong if:` above any RISK heading
  belongs to no risk. The first one found wins. The rationale lives in the FRAME cell only; the evidence file
  does not repeat it, so there is nothing to reconcile.
- A `Wrong if:` that comes true reopens the risk: clear the Result and run a test. Nothing checks that; it is
  the owner's honesty, made checkable by being written down.

### Reading it

`ci/checks/lib/risks.mjs` (shared by K1 and `pnpm status`, so the two cannot disagree):

- `readRisks` rows gain `experience: { rationale: string } | null`, parsed from `plain(row.result)` (the cell
  is read raw today, line 96, and the fixtures already bold such lines), and `refutation: string | null`.
- `readEvidence` gains one regex beside `Tracked:` and `Window:`: `^[\s>*_-]*Wrong if:\s*(.*)$`, first wins,
  scoped by the same heading rules.
- `tested` stays a boolean (a filled Result). A decision override already shares it, so `risk/unresolved`,
  `risk/untracked` and `risk/overdue` treat an experience-settled risk as settled with no change, and no
  existing K1 or S1 fixture flips (none contains `experience` or `Wrong if`).

### K1 (`ci/checks/meta/k1-frame.mjs`) — a gate file: shown to the owner before it is edited

Two findings, in the always-on tier beside `risk/no-threshold`; each names the risk, the file and the next
action, readable without the check id (D-016):

- `RISK-n#risk/experience-rationale` — the Result starts with `experience` but names none of the three.
  "RISK-n is settled by experience, but `<text>` is not one of: table stakes, creator is the user, domain
  expertise. Write which one in FRAME's Result column, or clear it and run a test."
- `RISK-n#risk/no-refutation` — settled by experience with no `Wrong if:` line. "RISK-n is settled by
  experience (table stakes), but its evidence names nothing that would prove it wrong. Add a `Wrong if:` line
  under RISK-n in docs/product/evidence/ (its `RISK-n-…` file, or its `### RISK-n` heading in a shared one),
  or run a test."
- `risk/no-threshold` is skipped for an experience-settled row: its bar is the `Wrong if:` line.
- The header comment's tier list and the `claim` string name both.

### The known-bad fixture — under `ci/`: shown to the owner before it is added

`ci/fixtures/known-bad/k1/experience/`: a framed FRAME, no milestones, four value risks.

| row | Result | evidence | must |
|---|---|---|---|
| RISK-1 | `experience: table stakes`, empty Threshold | `RISK-1-….md` with `Wrong if:` | stay silent (proves the no-threshold skip) |
| RISK-2 | `experience: domain expertise` | a file with no `Wrong if:` | fire `RISK-2#risk/no-refutation` |
| RISK-3 | `experience: because I said so` | — | fire `RISK-3#risk/experience-rationale` |
| RISK-4 | `**experience: creator is the user**` (bold) | `Wrong if:` under `### RISK-4` in a shared file, after a `Wrong if:` above any heading | stay silent |

`expected.json` lists exactly those two findings, with a `_note`. PC1 runs it with the other K1 cases.

### `pnpm status` (`ci/status.mjs`) and its fixture — shown before it is added

`riskState` prints `RISK-n settled by experience (table stakes)` for an experience row, whether or not its
`Wrong if:` exists (K1 owns that failure). A **new** S1 case `ci/fixtures/status/experience-settled/` pins
the Frame and Next lines verbatim; extending `framed-no-milestone` would rewrite its `frame` string and
`_note`.

### `/kickoff` (`.claude/skills/kickoff/SKILL.md`)

Phase 1 step 7, for each **value** risk, one question per message:

1. "Do you test this, or does experience already settle it?"
2. If experience: "Which is it: table stakes, you are the user, or domain expertise?" The three, no other.
3. "What would prove it wrong?" The answer goes into the evidence file as the `Wrong if:` line, verbatim.
   No answer, or "nothing": the risk is not settled; it gets a cheapest test and a Threshold, as today.

The skill never proposes a rationale or a refutation; the existing rule (nothing invented) covers it. Phase 2
says an experience-settled risk needs no interview guide, only its `Wrong if:` line, and that a `Wrong if:`
which comes true reopens the risk. Phase 1's hand-off text ("no milestone past the skeleton can start…")
gains "or is settled by experience with what would prove it wrong written down".

### Template prose (managed files a project takes on its next sync)

- `docs/product/FRAME.md` Risks paragraph: one sentence on experience, the three rationales, `Wrong if:`.
- `docs/product/evidence/README.md`: the `### RISK-n` block gains a `Wrong if:` field.
- `SLIPWAY.md`: the step-2 row and the K1 row of the check table say "…or settled by experience with what
  would prove it wrong written down". Its sentence claiming the FRAME template is byte-identical to K1's
  `draft-underway` fixture is already false (the PARKED prose landed in the template and not the fixture;
  nothing enforces identity) and is corrected in the same build rather than left over a third divergence. The
  fixture stays a frozen snapshot; its expectations do not change.
- `process/lessons/L-61`: the rule gains the experience path.

### What is reused

The per-risk line pattern (`Tracked:`, `Window:`) and its heading scoping in `readEvidence`; `plain()` from
`ci/checks/lib/markdown.mjs`; `filled` and `PLACEHOLDER`; the K1 report shape and PC1; S1. Searched for an
existing refutation or rationale parser: none.

Verified against: 33d5a32 2026-09-28 — `ci/checks/meta/k1-frame.mjs`, `ci/checks/lib/risks.mjs`,
`ci/status.mjs` (`riskState`, existential warnings), `ci/checks/meta/pc1-positive-control.mjs`,
`ci/checks/meta/s1-status.mjs`, every `ci/fixtures/known-bad/k1/*/expected.json` and
`ci/fixtures/status/*/expect.json`, `.claude/skills/kickoff/SKILL.md`, `docs/product/FRAME.md`,
`docs/product/evidence/README.md`, `SLIPWAY.md` lines 22–23, 215 and 272, `scripts/new-project.mjs:156`.

## Seams

none: developer tooling; adds no person, channel or promise to a project's product.

## Threat model

none beyond baseline. No network call, cache, subprocess, stored secret or deletion. The new input is one
more cell and one more line the checks already read as data; a `Wrong if:` line is text in a report, never
executed. The one gate this touches, K1, gets stricter for experience rows (a rationale and a refutation are
required) and no looser elsewhere: the test path and the decision override are unchanged.

## Known limitations

- The three rationales are a closed list on purpose; a fourth is a change to D-019, not a FRAME edit.
- K1 checks that a `Wrong if:` exists, not that it is honest or specific. "Wrong if: never" passes. That is
  cold review's job at kickoff, not a static check's.
- An **existential** risk marked table stakes is contradictory by definition, and status's existential
  warning goes quiet for it because it reads as tested. Not handled here; a follow-up if it bites.
- A project that wrote its FRAME before this release gets the parsing on its next sync; until then a
  `Wrong if:` line is prose.
- Nothing detects a `Wrong if:` that has come true.

## Acceptance

```
Given a FRAME whose RISK-1 (value) Result reads `experience: table stakes` and whose evidence file
      carries a `Wrong if:` line, and a milestone past the skeleton active
When  node ci/checks/meta/k1-frame.mjs . runs
Then  it exits 0 with no finding for RISK-1, even with an empty Threshold

Given the same row with no `Wrong if:` line anywhere under RISK-1
When  K1 runs
Then  it exits 1 with exactly `RISK-1#risk/no-refutation`, whose message names RISK-1, docs/product/evidence/
      and the `Wrong if:` line to add, and reads without knowing the check id

Given a Result of `experience: because I said so`
When  K1 runs
Then  it exits 1 with exactly `RISK-n#risk/experience-rationale`, naming the three rationales

Given ci/fixtures/known-bad/k1/experience/ as specified above
When  node ci/checks/meta/pc1-positive-control.mjs runs
Then  PC1 is green: the case is red for exactly its two expected findings

Given an experience-settled risk
When  pnpm status runs
Then  the Frame line reads `RISK-n settled by experience (<rationale>)`, and S1's new case pins it

Given /kickoff at Phase 1 step 7 with a value risk
When  the owner answers "experience"
Then  the skill asks which of the three rationales, then what would prove it wrong, one question per
      message, and writes the owner's words to the evidence file; given no refutation, the risk keeps a
      cheapest test and a Threshold instead

Given every message this feature adds or changes (K1, status, /kickoff)
Then  each names the project's own item (file, risk) and the next action, without the check id (D-016)

Given the existing K1 and S1 fixtures
When  pnpm meta runs
Then  every expected.json and expect.json is unchanged and PC1, S1 are green
```

## Verify

```
node ci/checks/meta/k1-frame.mjs ci/fixtures/known-bad/k1/experience   # exit 1; findings: RISK-2#risk/no-refutation, RISK-3#risk/experience-rationale only
node ci/checks/meta/pc1-positive-control.mjs                            # exit 0 (K1 cases +1)
node ci/checks/meta/s1-status.mjs ci/fixtures/status                    # exit 0 (cases +1: experience-settled)
node scripts/skills.test.mjs                                            # kickoff ≤ 300 lines, no stale wording
pnpm meta                                                               # exit 0
git diff --stat -- ci/fixtures/known-bad/k1/*/expected.json ci/fixtures/status/*/expect.json   # only the new cases
# owner probe, in a scratch project from new-project: /kickoff with one value risk answered "experience";
# then pnpm status names the rationale, and K1 is green with the Wrong if: line and red without it
```

## Build map

Three PRs under #47, machinery first; each merges with the gate green. Steps 1 and 2 edit gate files and
fixtures: the agent shows each K1, status and fixture change to the owner before making it, and the PR
carries `## Gate changes`.

1. `ci/checks/lib/risks.mjs` (parse the rationale and `Wrong if:`), K1's two findings and the no-threshold
   skip (**ask first**), the known-bad fixture (**ask first**), and the FRAME and evidence README prose.
   ~150 lines.
2. `ci/status.mjs` `riskState`, the new S1 case (**ask first**), `SLIPWAY.md` rows and the byte-identical
   correction, `process/lessons/L-61`. ~80 lines.
3. `/kickoff` step 7 and Phase 2, and the owner probe in a scratch project. ~40 lines.

## Out of scope

- Removing the test path: experience is an additional answer, not a replacement (#47).
- Any rationale outside the three; a fourth reopens D-019.
- K1 or status judging whether a `Wrong if:` is specific, or has come true.
- Warning on an existential risk settled by experience (Known limitations; a follow-up if it bites).
- `/clarify` walking experience rows: it walks open questions, and an experience row is not one.
- Retro-fitting a project's existing FRAME: FRAME is seeded; the owner edits their own.

## Open questions

none.

## Changes

- 2026-09-28 · ADDED · shaped from #47 before any code · PR for #47
