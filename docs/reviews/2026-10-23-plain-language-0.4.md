# Adversarial review — F-16 plain language 0.4

Reviewed: dev/features/plain-language.md @ 8bd2b93
Version line: Version: 0.4 (2026-10-22)
Supersedes: docs/reviews/2026-10-14-plain-language-0.1.md
Supersedes: docs/reviews/2026-10-15-plain-language-0.2.md
Supersedes: docs/reviews/2026-10-22-plain-language-0.3.md
Review date: 2026-10-23
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

8bd2b93 was the head of `matldupont/i462-prose-linter-5b9810` (PR #522) when this review began. The head is now
a242e2d, a merge of `main`; the doc, `scripts/f2.test.mjs`, `process/writing.md` and both lessons are unchanged
between the two. This session did not write or edit the document.

**Scope, by the owner's word:** "one fresh review of the 0.4 changes only". That is `git diff cf36893 8bd2b93` on
the doc, plus the same range on `scripts/f2.test.mjs`, `process/writing.md`, `process/lessons/L-54-docs-lint.md` and
the new `process/lessons/L-71-word-lists-are-a-snapshot.md`. The rest of the doc was read for contradictions with the
changed lines, not reviewed again. The other files #522 changed in that range (`next-form.mjs`, `steps.test.mjs`,
`workflows.test.mjs`) were not read.

F-16 has one ID and nine numbered Contract sections, so each finding is located by `F-16 §n` (or the section name)
and the line range at 8bd2b93.

## Verdict on the 0.3 findings

- **AR-1 (S1), resolved, with one new defect.** §1, §6 and the Acceptance now say what #460 shipped: `## Open
  questions` stays, the template has 12 sections, Seams is one field, and the files #509 changed are named.
  `scripts/f2.test.mjs` pins the count, and it passes at a242e2d. §6's description of the Seams shape is wrong
  (AR-2 below). The Build map was not corrected (AR-5).
- **AR-12, resolved.** §8 keeps the reason and drops the figure (lines 373–376). No other figure from a run on a real
  project's files is in the doc.
- **AR-13, resolved.** All five items: the code span on line 397 closes; the last 0.3 Changes entry ends with its
  tracker; Out of scope names #521; the subject count is gone from Known limitations; rule 7's pair points at
  `SLIPWAY.md`, whose line 9 holds the sentence.
- **AR-3, resolved in slipway, with one new effect.** L-71 is a `prose` lesson, so L1 reads its date: L1 passes at
  a242e2d with 35 prose lessons. L-54 is byte for byte what `main` holds. L-71 is free on `main` and in every open
  PR but #522. The new effect is in projects (AR-1 below).

**What was read.** In full: the doc at 8bd2b93; the 0.3 review; the diffs above. In part, at 8bd2b93 or a242e2d:
`ci/checks/meta/i1-issue-shape.mjs` (the Seams reader), `ci/checks/meta/l1-lessons.mjs`, `dev/ownership.yaml`,
`docs/features/TEMPLATE.md`, `SLIPWAY.md` (line 9 and the lessons table), `process/intake.md`, `package.json`'s
`meta` script, and the three `/log-*` skills' Seams lines. With `gh`: PR #509's body and files, PR #522's checks, and
#521's body.

**Verified, and how.**
- I1 at 8bd2b93, on two copies of its fixture `seams-one-field-list-good.md`: Seams written as two `label: detail`
  lines in a list passes; the same two lines with no list marker fail `seams/unenumerated`.
- `node scripts/f2.test.mjs` at a242e2d: "docs/features/TEMPLATE.md has no more than 12 sections" passes.
- `node ci/checks/meta/l1-lessons.mjs .` at a242e2d: PASS, 65 lessons (13 check, 2 structural, 1 artifact, 35 prose,
  14 declined).
- `node ci/checks/meta/f2-feature-fit.mjs .` at a242e2d: PASS, no line for this doc.
- `ci/checks/lib/ownership.mjs` `classify()` at a242e2d: `process/lessons/L-71-…` and `ci/checks/meta/l1-lessons.mjs`
  are `managed`; `ci/prose/**` and `scripts/f2.test.mjs` are `internal`.

**Not verified.** No project was synced to this branch, so AR-1's effect in a project is read from the ownership map
and L1's code, not observed.

## Severity

| Level | Meaning |
|---|---|
| S0 | Can invalidate the business or the build. Resolve before writing code. |
| S1 | Loses money, breaks correctness, or breaches a stated principle. Fix in the spec before the affected phase. |
| S2 | A real defect or contradiction. Cheap now, expensive later. |
| S3 | Inconsistency or hygiene. Batch these. |

## Register

| ID | Finding | Sev | Owner | Blocks | Tracker |
|---|---|---|---|---|---|
| AR-1 | L-71 ships to every project, and its date turns a project's L1 red over a check the project does not have | S2 | owner | #462 | #521 |
| AR-2 | §6 says Seams lines may be "in a list or not"; I1 fails `label: detail` lines with no list marker | S2 | owner | #462 | #524 |
| AR-3 | The test pins exactly 12 sections; §1, §6 and the Acceptance say it fails "a template with more" | S3 | owner | — | #524 |
| AR-4 | §6's count reads as meeting the bar on a generous reading; it leaves out #509's call that it does not | S3 | owner | — | #524 |
| AR-5 | The Build map still gives #460 the f2 test and `/review-doc`, and leaves the f2 test out of #462 | S3 | owner | — | #524 |
| AR-6 | Rule 7's pair now quotes `SLIPWAY.md`'s lesson table, whose counts are stale; L-71 adds one more | S3 | owner | — | #524 |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — L-71 reaches projects that have no prose check

**Where:** F-16 §8, lines 401–404; Known limitations, line 459; Acceptance, lines 574–576;
`process/lessons/L-71-word-lists-are-a-snapshot.md`.

§8: "`process/lessons/L-71-word-lists-are-a-snapshot.md` is a `prose` lesson with `pointer: process/writing.md` and
`review-by: 2027-04-14`: L1 reads it, so a word list left alone comes back on that date."

The word lists are slipway's alone. `ci/prose/**` is `internal`, and D-046 keeps the prose job in slipway until #521.
But `process/lessons/**` is `managed`, and so is L1. A project's `meta` runs L1, and `meta` is one of the three checks
`new-project` requires. So every project synced to this version receives L-71. On 2027-04-14 its L1 fails, unless
slipway has moved the date and the project has synced since. L-71's body names `ci/prose/Slipway/`, a folder the
project does not have.

The project's owner is then asked to re-read word lists that are not in their repository. That is the shape D-016
rules out: a question in slipway's terms, not the project's.

The 0.3 review's AR-3 proposed exactly this lesson and missed the project side. L-54 as a `check` lesson had no date
L1 reads, so it did not have this effect. #521's body does not mention a lesson.

**Proposed resolution.** Class L-71 `internal` in `dev/ownership.yaml` until #521 ships `ci/prose/`, and add "ship
L-71" to #521. Say so in §8 and in the Known limitations line. Or keep L-71 shipped and give #521 the job of moving its
date before 2027-04-14, with a line in `pnpm status` that names the date, so nothing rests on memory.

### AR-2 — §6 describes a Seams shape that I1 fails

**Where:** F-16 §6, lines 308–313.

"Its lines are `<label>: <detail>`, in a list or not, one per seam (who pays, who is counted, who is told, what is
promised), or the single line `none: <reason>`."

I1 takes label lines only in a list. Its header comment says "one line per seam, `<label>: <detail>`, in a list".
`process/intake.md` says "one list line per seam". PR #509's body says "in a list". Run at 8bd2b93, two `label:
detail` lines with no marker fail `seams/unenumerated`; the same lines with `- ` pass.

Issues embed this Contract. An author who follows §6 as written gets a red I1.

**Proposed resolution.** Replace "in a list or not" with "each a list item". The `none: <reason>` line is the one
that may stand alone, and may wrap.

### AR-3 — "Fails a template with more" understates the test

**Where:** F-16 §1, lines 147–150; §6, lines 316–317; Acceptance, line 534; Changes, line 651.

§1 and the Acceptance say `scripts/f2.test.mjs` "fails a template with more". The test asserts `<= 12` and `>= 12`;
the second message says "a section was cut: lower this number on purpose, in a reviewed change". It pins the count
at 12, as D-046 says ("a test pins the feature template's count").

§6 adds "no template gains a section". §1 says "no template gains a section without the owner's yes". The two
sentences disagree on whether the owner can add one.

**Proposed resolution.** Write "pins the count at 12" in §1, §6 and the Acceptance. Use §1's wording in §6.

### AR-4 — §6's count leaves out the call that decided it

**Where:** F-16 §6, lines 304–306 and 314–316.

The rule: a section is cut when it is empty or restated "in 16 of 20 (or in four of five docs)", over "every feature
doc on `main`". The result: "10 of 15 feature docs … (12 only on a generous reading), against the bar of 12 of 15".

Read cold, the generous reading meets the bar, and the section should have gone. #509's body holds the missing step:
"A count that reaches it only on a generous reading does not meet it, so the section stays", on the orchestrator's
advice. The doc also counts the 15 docs that have the section, while the rule says every feature doc.

**Proposed resolution.** Add #509's sentence, and say that 15 is the docs holding the section.

### AR-5 — The Build map keeps 0.3's file lists

**Where:** F-16 Build map, lines 615–621.

Step 5 (#460) lists `scripts/f2.test.mjs`, `/log-feature` and `/review-doc`. #509 changed neither the f2 test nor
`/review-doc`; it changed `/log-bug`, `/log-followup` and `scripts/skills.test.mjs`, which §6 now names. Step 7 (#462)
does not list `scripts/f2.test.mjs`, which 0.4 changes. AR-1 of the 0.3 review was this mismatch in §6; the Build map
still carries it.

**Proposed resolution.** Copy §6's file list into step 5, and add `scripts/f2.test.mjs` to step 7.

### AR-6 — Rule 7's pair quotes a stale count

**Where:** F-16 §1, lines 142–143; `process/writing.md` line 18; `SLIPWAY.md` lines 227–235.

0.4 points both halves of rule 7's pair at `SLIPWAY.md`. The second half quotes its lessons table: "`check` | 12 | a
check or harness rule fires on violation". The table says 61 lessons, 12 check and 32 prose. L1 at a242e2d counts 65,
13 check and 35 prose. `main` already had the drift; L-71 adds one prose lesson. Nothing checks the table.

The pair is the example for a rule that says "something concrete behind every claim". Its number is wrong.

**Proposed resolution.** Correct the table in #462's PR, or pick a pair whose second half carries no count. A check
that holds the table to L1's counts is a follow-up, not this PR.
