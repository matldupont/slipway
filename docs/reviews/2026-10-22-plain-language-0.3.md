# Adversarial review — F-16 plain language 0.3

Reviewed: dev/features/plain-language.md @ cf36893
Version line: Version: 0.3 (2026-10-22)
Supersedes: docs/reviews/2026-10-14-plain-language-0.1.md
Supersedes: docs/reviews/2026-10-15-plain-language-0.2.md
Review date: 2026-10-22
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

cf36893 is the head of `matldupont/i462-prose-linter-5b9810` (PR #522). This session did not write or edit the
document. F2 run on the tree at cf36893 passes and names no line for this doc.

F-16 has one ID and nine numbered Contract sections, so each finding is located by `F-16 §n` (or the section name)
and the line range at cf36893.

**How 0.3 was judged.** Stages §1, §2, §4, §6 and §8 have landed (#456, #458, #460, and #462 on this branch), so
those sections are read against the tree. §3 (#457), §5 (#459) and §7 (#461) are open, so the corrections there
(0.2's AR-2, AR-5, AR-11 and AR-13) are judged as rules those builds must meet, not as reports of what shipped.

**What was read.** In full: the target; the 0.2 review; `docs/reviews/TEMPLATE.md`. In part, at cf36893, to check a
named claim: `decisions.md` D-035, D-046 and D-048; `process/decision-defaults.md` §9; `process/writing.md`;
`ci/status.mjs` (`next()`); `ci/checks/lib/steps.mjs`; `ci/checks/lib/next-form.mjs`; `ci/checks/meta/s1-status.mjs`;
`ci/checks/meta/l1-lessons.mjs`; `ci/checks/meta/i1-issue-shape.mjs`; `ci/verify.mjs`; `ci/ratchet.mjs`;
`ci/prose.mjs`; `.vale.ini`; `ci/prose/Slipway/Placeholder.yml`; `ci/baselines.json`; `dev/ownership.yaml`;
`process/lessons/L-54-docs-lint.md`; `.github/workflows/ci.yml` and `pr-body.yml`; `scripts/prose.test.mjs`,
`scripts/workflows.test.mjs`, `scripts/f2.test.mjs`, `scripts/new-project.test.mjs`; `SLIPWAY.md`'s path table and step
headings; `README.md`; `docs/features/TEMPLATE.md`; the `## Phase` headings of the three skills §5 names. With git
and `gh`: the commits of #458 and #460, PR #509's body, the subjects on `main..cf36893`, and the state of #457, #459,
#461 and #521.

**Verified, and how.**
- S1 on `ci/fixtures/status` at cf36893: PASS on 66 fixtures, the `#next-form` rule included.
- `ci/fixtures/known-bad/` holds 48 `expected.json` files with a `details` key (`grep -rl`), as §3 says.
- `ci/baselines.json` holds `"prose": 136`. The `prose` job and the pr-body Vale steps carry the `is_template` guard,
  and slipway's repository has `is_template: true` (`gh api`).
- `findings.push` and `warnings.push` under `ci/checks/meta/`: 129 at cf36893.

**Not verified.** Vale was not run: no `vale` binary on this machine. PR #522's `prose` job passed in CI.

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
| AR-1 | §6 still cuts `## Open questions` and pins 11 sections; #460 kept the section, and nothing pins a count | S1 | owner | #462 | |
| AR-2 | §3's static test reads only `.push` calls, so the ratchet's finding and the prose check's escape it | S2 | owner | #457 | |
| AR-3 | L-54 becomes a `check` lesson, so L1 never reads its review date, and nothing checks its rule | S2 | owner | #462 | |
| AR-4 | The pr-body Vale steps landed with no test of their guard; that test waits for #461 | S2 | owner | #462 | |
| AR-5 | §5 bans every word of the skill's `## Phase` headings, which bans "the" and "risk" in `/kickoff` | S2 | owner | #459 | |
| AR-6 | Seams says no project's engineer meets a new rule; I1's new Seams shape and warning reach projects | S2 | owner | #462 | |
| AR-7 | §3's one-sentence and no-id rules read quoted project text, which §2 removes first | S3 | owner | #457 | |
| AR-8 | The Next-form check does not test that the first sentence ends with a period | S3 | owner | #462 | |
| AR-9 | The Build map says "in this order"; the stages landed in another | S3 | owner | — | |
| AR-10 | §4 promises `SLIPWAY.md`'s own warning count in Changes; Changes holds only the held-set total | S3 | owner | — | |
| AR-11 | `SLIPWAY.md`'s step headings give a second set of times, one of which disagrees with `STEPS` | S3 | owner | — | |
| AR-12 | §8 records a figure from a run on a real project's files; decision-defaults §9 puts it in the PR | S3 | owner | #462 | |
| AR-13 | Stale or broken text: a code span, the Changes form, a tracker, a subject count, a pair | S3 | owner | #462 | |
| AR-14 | The scope line says `decisions.md` and `process/intake.md` are agent text; §8 checks both | S3 | owner | — | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — §6 contradicts what #460 landed

**Where:** F-16 §1, lines 147–150; §6, lines 302–325; Acceptance, lines 524–528; Changes, line 642.

0.3's Changes says the Contract was corrected "against a landed build (#456, #458, #460, #462)". §6 still reads as
the plan #460 did not carry out:

- "`docs/features/TEMPLATE.md`: `## Open questions` is cut. … The template's section count goes from 12 to 11, and
  `scripts/f2.test.mjs` pins it."
- §1: "the feature template has 11 sections, and `scripts/f2.test.mjs` pins that count".
- Acceptance: "TEMPLATE.md has 11 sections and scripts/f2.test.mjs pins the count".

At cf36893 the template has 12 sections, `## Open questions` among them. #460's PR (#509) ran §6's own count and
kept the section: 10 empty docs against a bar of 12. `process/writing.md` says "has 12 sections today".
`scripts/f2.test.mjs` pins no section count. #460 is closed, so no open issue builds what the Acceptance asks for.
That Acceptance cannot pass.

PR #509's body also listed what the Contract had to say and does not: Seams is one textarea whose lines I1 reads as
`label: detail` or `none: reason`, and `/log-bug`, `/log-followup`, `process/intake.md` and `scripts/skills.test.mjs`
changed with `/log-feature`. §6 still names only `/log-feature` and `/review-doc`.

D-046 says "a test pins the feature template's count". Nothing does, so the "only lose sections" rule has no check.

S1: the Acceptance contradicts the tree it claims to describe, and issues embed this Contract.

**Proposed resolution.** Rewrite §6 to what #460 shipped: the section stays, with the count and the bar that kept
it. Name the Seams shape and the files #509 changed. Then either pin the count at 12 in `scripts/f2.test.mjs` in
#462's PR, or file it under an issue and say so in §1, §6 and the Acceptance.

### AR-2 — §3's static test cannot see two of the sites it names

**Where:** F-16 §3, lines 249–253 and 267–270; Acceptance, lines 494–498.

The static test checks that "every `findings.push` and `warnings.push` call under `ci/checks/meta/`, in
`ci/verify.mjs` and in `ci/ratchet.mjs` passes a `fix` key". §3 adds that "so does the ratchet's" line, and that
until the build ends "the static test names the sites still owed, so the gap is visible, never silent".

At cf36893 some findings are not built by a `.push` call:

- `ci/ratchet.mjs` has no `.push` call. Its two findings are array literals passed to `report()` (`:54`, `:62`).
- F2's `--update` refusal is an array literal too (`f2-feature-fit.mjs:79`).
- `ci/prose.mjs` builds its findings with `.map(finding)` and a spread push (`:153`–`160`, `:189`–`190`). It prints
  through `report()`, and §3 does not list it. That is the gap 0.2's AR-5 found, opened again by #462's own script.

So the ratchet's finding, the one §3 names, prints with no fix while the static test stays green. The on-output
test does not reach them either: no known-bad fixture runs the ratchet, and the prose fixture runs only where Vale
is installed, outside `pnpm meta`.

**Proposed resolution.** Make the static rule "every object with a `detail` key" in the named files, not "every
`.push` call". Add `ci/prose.mjs` to §3's files. Or name these sites as exceptions in the test, with a count.

### AR-3 — L-54 as a `check` lesson

**Where:** F-16 §8, lines 400–402; Known limitations, lines 452–453; Acceptance, lines 566–570.

§8: "`process/lessons/L-54-docs-lint.md` moves to `enforcement: status: check`, `pointer: process/writing.md`,
`review-by: 2027-04-14`: L1 reads it, so a word list left alone comes back on that date."

L1 reads `review-by` only for `prose` and `declined` lessons (`l1-lessons.mjs:96`). For a `check` lesson the date
goes red never. `ci/status.mjs:322` lists it, which is a line someone has to notice. The Known limitations line "L-54's
review date brings it back" rests on this.

L1 describes `check` as "a mechanism fires", and the pointer is a markdown file. L-54's rule is also not what Vale
checks: "Lint docs for a declared reader, resolving citations, and generated-or-frozen status." Nothing in §8 checks a
declared reader, a citation or a frozen sha. Marking the lesson `check` says those fire.

**Proposed resolution.** Keep L-54's rule and file a lesson of its own for the word lists: `status: prose`, pointer
`process/writing.md`, review-by 2027-04-14, so L1 fails on that date. Or make L-54 `prose` with a rule that matches
what the check does.

### AR-4 — The pr-body Vale guard has no test

**Where:** F-16 §8, lines 388–391; Acceptance, lines 536–540; Build map steps 6 and 7.

The Acceptance test for the `is_template` guard covers "the step that writes the title and commits files and the
Vale install and body steps". It is built in #461 (step 6, open). The Vale steps it guards landed in #462, in this
PR. At cf36893 no script checks any `is_template` guard: `scripts/workflows.test.mjs` does not mention `pr-body`, and
`scripts/prose.test.mjs` compares only the two pins.

`pr-body.yml` ships to projects; `ci/prose.mjs` is classed `internal` and does not. If a later edit drops the guard
on the body step, every project's PR-body check runs a script it does not have and fails.

**Proposed resolution.** Add the Vale half of the guard test to `scripts/workflows.test.mjs` in #462's PR, using
`ci/checks/lib/workflow-yaml.mjs`. #461 adds the title-and-commits step to the same test.

### AR-5 — §5's Phase-heading rule

**Where:** F-16 §5, lines 289–295; Acceptance, lines 518–522.

Each quoted question has "no check id, decision id, lesson id, or a word from the skill's own `## Phase` headings".
`/kickoff`'s headings are "Phase 1 — Frame (`docs/product/FRAME.md`)", "Phase 2 — Test the risk
(`docs/product/evidence/`)" and "Phase 3 — Shape". Read as written, a `/kickoff` question cannot hold "the", "risk",
"test", "frame" or "shape". The fourth rule asks a question to name "the project's own thing (a file, a risk …)".
`/bootstrap` and `/close-milestone` have no `## Phase` headings, so the rule checks nothing for them.

**Proposed resolution.** Ban the phase labels as phrases ("Phase 1", "Phase 2"), not each word. Or name the
internal words to ban in the test.

### AR-6 — Seams says no project meets a new rule

**Where:** F-16 Seams, lines 430–434; §6, lines 308–320.

"Every new rule runs in slipway's own repository until a project's text has been measured (D-046), so no project's
engineer meets one." D-046 keeps three things to slipway: the prose job, the chatbot check on PR bodies, and P1's
title and subject rules. The rest ships:

- I1 now reads Seams as `label: detail` lines or a `none: reason` line, and warns on a last line starting `Per `.
  §6 notes that the issue-shape workflow runs on `edited`, so a project's open issue meets the new shape when edited.
- §2's Next line and §3's message form change the text a project's engineer reads every session.

None of these adds a person, channel or promise. But the reason Seams gives is false, and "who is told" has an
answer: the project's owner, at the sync that brings I1's new shape.

**Proposed resolution.** Keep `none`, with a true reason: no person, channel or promise is added. Then add one Known
limitations line saying a project's open issues meet I1's new Seams shape when next edited after a sync.

### AR-7 — §3's rules read quoted project text

**Where:** F-16 §3, lines 254–259.

§2 removes quoted spans before applying its rules, because they hold "project text the rules cannot govern". §3's
output test does not. Its own example `detail` opens with one: `"Contrast is lower" is an adjective, not a test.`
A finding that quotes a body line holding a period, a `K1` or 140 characters breaks "one sentence", "no id" or "160
characters". The message cannot fix that. The fixture text, not the message, decides whether the test passes.

**Proposed resolution.** Apply §2's rule: remove `"…"` spans before the sentence, id and length rules, and cap a quoted
span with `excerpt()`.

### AR-8 — The first-sentence period

**Where:** F-16 §2, line 168; Acceptance, line 479.

§2: "the first sentence is 14 words or fewer and ends with a period". `next-form.mjs` checks the word count only
(`:22`–`23`). A first sentence ending `?` or `!` passes. The Acceptance line leaves the period out too.

**Proposed resolution.** Add the period to `nextFormBreaks` and `scripts/steps.test.mjs`, or drop it from §2.

### AR-9 — The Build map's order

**Where:** F-16 Build map, lines 594–614.

"One PR per stage, in this order." Steps 3, 5 and 7 (#458, #460, #462) landed or are landing before steps 2, 4 and 6
(#457, #459, #461). The doc does not say the order changed or what depends on it. AR-4 is one result: step 7 ships a
guard whose test is in step 6.

**Proposed resolution.** Say the stages are independent except where named, and name the one dependency left (AR-4).

### AR-10 — `SLIPWAY.md`'s count

**Where:** F-16 §4, lines 281–283.

"The rest of `SLIPWAY.md` … is counted once the gate table is in code spans, and the number goes in this doc's
Changes and the ratchet's baseline." #458 put the gate table in code spans. Changes records only "136 warnings on the
held set", which is eight files and every warning rule, not `SLIPWAY.md`'s check ids.

**Proposed resolution.** Record the `SLIPWAY.md` figure at 04b47c0 in Changes, or change §4 to say the held-set
total is the number.

### AR-11 — A second list of step times

**Where:** F-16 Seams, lines 433–434; §2, lines 175–180.

Seams: "The time per step on the Next line is the path table's existing estimate, read from one list." `SLIPWAY.md`'s
step headings give their own: "### 0 · Bootstrap — about an hour" against `STEPS`'s "1 to 2 hours", "a day or two"
against "1 to 2 days", "the rest of the milestone" against "one issue per session". `scripts/steps.test.mjs` holds the
table only.

**Proposed resolution.** Drop the times from the headings, or have `steps.test.mjs` hold them to `STEPS`.

### AR-12 — A real project's figure in the doc

**Where:** F-16 §8, lines 373–375.

The line gives the count from a read-only run on a real project's docs, and what those docs held. Decision-defaults
§9 says such a run is recorded by "the PR … as a count or a pass, never that project's name, paths or content". A
feature doc is not the PR.

**Proposed resolution.** Keep the reason ("an HTML tag in a table cell is not a placeholder") and move the figure to
#462's PR body.

### AR-13 — Stale and broken text

**Where:** F-16 §8, line 396; Out of scope, lines 627–628; Known limitations, line 465; Changes, line 642; §1, lines
142–143.

- Line 396 opens a code span before `<sha>` and never closes it, so the span runs on into the next line.
- The last Changes entry has a sentence after its tracker: "· #462 Shipping the prose job … is #521."
- Out of scope still says "Tracker: filed by step 7's PR", while #521 is open.
- "This branch's own subjects … one is 77 code points." At cf36893, `main..cf36893` holds two subjects over 72, of
  100 and 74. "This branch" has no meaning once the doc is on `main`.
- §1 rule 7's pair, as `process/writing.md` writes it, says "`README.md` says 'a rule exists only where something
  fires.'" #458 moved that sentence to `SLIPWAY.md`. `scripts/writing.test.mjs` checks that a path is named, not that
  the quote is in it.

**Proposed resolution.** Close the span. Put the #521 sentence before the tracker, and name #521 in Out of scope.
Drop the subject count or name the PR. Point rule 7's pair at `SLIPWAY.md`.

### AR-14 — Agent text in the diff set

**Where:** F-16 Contract, lines 119–121; §8, lines 355–358.

The scope line: "Skills, `process/intake.md`, `decisions.md` and the checks' own source comments are agent text and
are not held to the form." §8's diff set holds `process/*.md` and `decisions.md`. Their added lines' warnings are
printed, and their errors fail.

**Proposed resolution.** Say that the three error rules apply to agent text too, since junk is junk. Or take
`decisions.md` and `process/intake.md` out of the diff set.
