# Adversarial review — F-12 feature fit 0.2

Reviewed: dev/features/feature-fit.md @ a9c201b
Version line: Version: 0.2 (2026-10-12)
Supersedes: docs/reviews/2026-10-12-feature-fit-0.1.md
Review date: 2026-10-12
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`.

a9c201b is the head of `docs/feature-fit-0.2-48` (pull request #414) at the time of the review. This session did
not write or edit the document at 0.1 or 0.2; it reviewed and then revised another feature doc today (F-14). The
review is committed on #414's branch at the owner's instruction, with no pull request of its own. One earlier
review names this path, `docs/reviews/2026-10-12-feature-fit-0.1.md`, and is superseded above.

**What was read.** In full: the target; `decisions.md` D-036 with its amendment of 2026-10-12; issue #48 (the
source, as filed and as it now embeds 0.2) and #49; `docs/features/TEMPLATE.md`; `ci/ratchet.mjs`;
`ci/checks/meta/id1-ids.mjs` (lines 1–140); `ci/checks/lib/frontmatter.mjs`; `ci/checks/lib/milestones.mjs`;
`process/decision-defaults.md` §3, §4, §5, §9. In part, to check a named claim:
`ci/checks/meta/f1-feature-coverage.mjs` (lines 40–62), `ci/checks/lib/report.mjs` (`report()`),
`ci/checks/lib/review-header.mjs` (its exports), `ci/checks/lib/markdown.mjs` (`section()`), `scripts/sync.mjs`
(`KINDS`, `scriptRows()`, the seeded branch, where `land()` is called), `scripts/new-project.mjs` (what it writes
itself), `dev/ownership.yaml` (the legend and the `ci/**` rows), `.claude/skills/log-bug/SKILL.md` (lines
172–205), `.claude/skills/sync-slipway/SKILL.md` (§1 and §3), `.claude/skills/close-milestone/SKILL.md` §4,
`.claude/skills/work-ticket/SKILL.md` (Which findings count), `.claude/agents/cold-reviewer.md`,
`process/cold-review.md` (lines 28–48), `ci/checks/meta/l1-lessons.mjs` (its header), `scripts/skills.test.mjs`
(the cap), the headings of every file in `dev/features/`, and the register of the 0.1 review (its findings'
titles, to name what it superseded; its bodies were not used as a source).

**Verified, and how.** The document's Fit is a set of claims about the code, so each was opened: `section()` at
`markdown.mjs:11`, `PLACEHOLDER` at `frontmatter.mjs:30`, `frontmatter()` at line 9, `report()` at `report.mjs:65`,
F1's citation pattern at `f1-feature-coverage.mjs:53`, `reviewProvenance()` exported from `review-header.mjs`,
`scriptRows()` refusing a `package.json` that is not JSON, `new-project.mjs:164` writing `process/anchor`, the
ratchet's four outcomes and its refusal to raise. All hold. `wc -l` gives 297 for the log-feature skill and
`MAX_LINES = 300`. `ci/baselines.json` is absent in slipway. The fifteen-doc count in the Problem is off by one
(AR-9).

`docs/product/FRAME.md` in slipway is the unfilled template, so there is no FRAME question to test the feature
against; the document cites its own Job and `ci/checks/lib/risks.mjs:1`. Not read: any project built from
slipway; `scripts/adopt.mjs`; `scripts/sync.test.mjs` beyond a search for `KINDS`; the bodies of
`dev/features/template-sync.md` and `cli-output.md` beyond the lines that list sync's row kinds.

**Not argued.** D-036 and its amendment are the owner's: the count ratchets, sync records it, a doc is held from
its first review or its schedule, Fit is three lines, slipway's own count is the honest number. A finding below
touches one only where the document's text or the code contradicts it.

No finding below is S0.

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
| AR-1 | `/log-bug` schedules its stub in the running milestone and sends it to review inside its own flow, so the stub is held with the template's Fit unfilled; the Contract says nothing is asked of it and the skill needs no change | S1 | owner | Build map 2, 3 | |
| AR-2 | The first review of a draft with no Fit turns the reviewer's pull request red on a file a reviewer may not edit; `/review-doc` gains a sentence and no stop | S2 | owner | Build map 3 | |
| AR-3 | The owner's stop condition has no named evidence at step 1, and the one owner probe needs step 2 and a sync the Build map forbids | S2 | owner | Build map 1 | |
| AR-4 | The owner meets a sync through `/sync-slipway`, which reads the plan as JSON; the Contract does not say the JSON carries the count's sentences, and the skill is not among those changed | S2 | author | Build map 1 | |
| AR-5 | The premise is an expectation with no instance, the pass that could show it false is ordered after the build, and the new cold-review line needs a lesson naming a failure nobody has seen | S2 | owner | Build map 1 | |
| AR-6 | Four clauses of "held" have no case: a closed milestone, a shaping or killed one, a review of another doc, a review that is not current | S2 | author | Build map 2 | |
| AR-7 | "Every other key is byte for byte as it was" and "serialises it (two-space JSON)" are both true only of a file already in that form | S3 | author | Build map 1 | |
| AR-8 | F2 prints less than "whatever the result" on a BROKEN run, and its BROKEN message hands out the one command that records any count | S3 | author | Build map 2 | |
| AR-9 | The Problem's count is off by one: a seventh doc carries an ad hoc reuse list | S3 | author | — | |
| AR-10 | Seven readings the check and its readers depend on are not specified | S3 | author | Build map 1, 2 | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — `/log-bug` schedules its stub in the running milestone and sends it to review inside its own flow

**Where:** F-12, Contract §1 (lines 118–120), §2 "Held" rules 3 and 4 (lines 140–144), §5 (line 292); against
`.claude/skills/log-bug/SKILL.md` lines 179–190 and 198.

> A bug-fix stub `/log-bug` writes from the template starts with the section as the template has it; it is a
> draft with no review and no schedule, so nothing is asked of it yet.

> `/log-bug`'s stub step needs no change.

In a project, the stub step that writes a new doc does three things in the same run. It writes the doc from the
template. It asks "Is fixing this part of what you are building now ({active milestone's summary}), or a later
milestone?" and adds "a Contents item citing `(F-{nn})` to the one they name". Then: "**Commit** on the branch,
and run `pnpm meta`". When the owner answers "now", the stub's F-id is cited by an active milestone before that
`pnpm meta` runs: rule 4 holds it. The skill then says "The bug's acceptance says it is reviewed first", and the
review holds it under rule 3 whatever the milestone.

So the stub is held within minutes of being written, by both of the rules 0.2 added. With the section "as the
template has it", F2 reports three `fit/unfilled/*` and the skill's own `pnpm meta` is red, in the most ordinary
path a project has for a bug in behaviour that was never written down. If the agent follows the skill's "fill
every section … and the rest" instead, Fit is filled with no search: the document forbids that for
`/log-feature` ("never from memory") and gives `/log-bug` no search to fill it from.

S1, not S2, because the Contract states the opposite of what the shipped skill does, and the result is a red
gate inside a skill run, or a Fit written from nothing, on first use.

**Proposed resolution.** For the owner: is a bug stub held like any doc (then `/log-bug` gains the same search
`/log-feature` Phase 3 gets, sized for a fix: where the numbers this behaviour shows are calculated, what it
reuses; §5 lists the skill, its line budget and its pin), or is it given a stated answer the template allows
(`Reuses:` what the fix touches, `New: none` is refused when nothing is reused, so say what a stub writes)?
Either way delete "nothing is asked of it yet" and "needs no change", and add a fixture: a stub as `/log-bug`
leaves it, cited by an active milestone.

### AR-2 — The first review of a draft with no Fit turns the reviewer's pull request red on a file a reviewer may not edit

**Where:** F-12, Contract §2 "Held" rule 3 (lines 140–141), §4 the baseline table (lines 218–226), §5
`/review-doc` (lines 287–288), Contract §3 the plan's second sentence (lines 199–200).

Rule 3 holds a doc from the moment "a file in `docs/reviews/` … gives its path". That file arrives in the review's
own commit. For a draft that predates the section (the plan counts these: "2 feature docs still being drafted
have no Fit section; each needs one before it is reviewed"), the review's `pnpm meta` goes red with
`fit/missing` on the target. The reviewer cannot close it: "a reviewer never edits its target", and `--update`
"refuses to raise one". The review is correct and unmergeable until someone else adds Fit to the doc, on that
branch or on `main` first.

`/review-doc` already has the shape of the answer for the other line a doc must carry: "A feature doc with no
`Version:` line … is not reviewed as it is: stop here, and say …". The Contract gives the skill one sentence
about verifying a Fit line and nothing about a doc that has none.

The same surprise, smaller, for whoever sets a milestone `active`: the finding's example text is "is shipped
and its Fit has no `Numbers:` line". A doc held by a review or a schedule is not shipped, and the pull request
that made it held changed a milestone's frontmatter or added a review, not the doc.

**Proposed resolution.** `/review-doc` step 1 gains the stop: a feature doc with no filled Fit is not reviewed
as it is; its author fills it first (a Fit edit moves no `Version:`). Pin it. And F2's finding says why the doc
is held, in the project's words: "is reviewed (`docs/reviews/<file>`)", "is scheduled in M3", "is marked
shipped", so the person reading a red run knows which change brought it.

### AR-3 — The owner's stop condition has no named evidence at step 1

**Where:** F-12, Build map (lines 478–489), Verify's owner probe (lines 473–474); against D-036.

D-036: "If sync cannot show and write it cleanly, the build stops there and the question comes back before
anything further is built." The Build map: "**The owner's condition sits here**", in step 1. Nothing says what
is looked at to decide. "Cleanly" is the criterion, and an adjective cannot fail. The acceptance lines for sync
are tests the build writes for itself; they show the row does what the Contract says, not that the owner finds
what they see acceptable, which is the question D-036 reserved.

The one place the owner looks is Verify's probe: "in a scratch project with one shipped doc and no Fit:
`sync --plan` shows the count recorded at 1, `--apply` writes it, and `pnpm meta` is green there." That needs F2
(step 2) for `pnpm meta` to mean anything about Fit, so as written it runs after the point where the build was
to stop. It also needs a project synced from a branch or from `main` before step 3, and the Build map says "no
project syncs from `main`, until the third has merged".

**Proposed resolution.** Split the probe. At the end of step 1, before step 2 starts: the owner runs
`sync --plan` and `--apply` from step 1's branch on a scratch project that has a shipped doc, a reviewed draft
and an unheld draft, and says yes or no to what they read; the PR records the answer. Say that a scratch
project is not "a project" for the no-sync rule. The `pnpm meta` half of the probe moves to step 2.

### AR-4 — The owner meets a sync through `/sync-slipway`, which reads the plan as JSON

**Where:** F-12, Contract §3 "What the plan says" and the row table (lines 187–204), §5 (lines 277–292), Fit
`Reuses:` (line 71); against `.claude/skills/sync-slipway/SKILL.md` §1, `dev/features/cli-output.md` lines 64,
129 and 272, `dev/features/template-sync.md` line 209.

D-036 asks that sync "shows the number in the project's words". Contract §3 gives three sentences and a new row
kind, "shown to the owner as 'count recorded'". The owner's usual path is the skill: it runs the plan with
`--json` and relays `buckets`, `rows`, each row's `label` and its bucket's `meaning`, and `needsYou`. The
Contract does not say which of those carries the three sentences, or that they are in the JSON at all; a row's
`label` of "count recorded" with no number would satisfy the text. The skill is not in §5's list, so nothing
tells it to say the count to the owner or to put it in the sync pull request, where "may only go down" is worth
having in writing.

Two documents state the row kinds as a closed list, and the Contract adds one without naming them: F-08's
contract (`KINDS`, `LABEL`, `MEANING`, `OWNER_ROWS`, the "Needs you" rule, the `--json` shape) and F-01's
(`collision`, `seeded: upstream changed`, `merged: key updated or reported`, `unchanged`). The document's own
Fit lists what it reuses from `scripts/sync.mjs` and not that it extends the plan's schema.

**Proposed resolution.** Say where the sentences live in the plan's JSON (the bucket's `meaning`, with the
numbers in it) and that the text plan prints the same; add an acceptance line on `--json`. Add `/sync-slipway`
to §5 with one sentence (relay the count's sentences as written, and carry them into the pull request) and its
pin. Name F-01 and F-08 under `Reuses:` as the contracts the new row kind extends, and say whether each gets a
Changes line.

### AR-5 — The premise is an expectation with no instance, and the pass that could show it false is ordered after the build

**Where:** F-12, Problem (lines 13–19), Out of scope (line 508), Contract §5 `process/cold-review.md` (lines
284–286), Known limitations (lines 353–355); against #49 and `process/cold-review.md:43`.

> No instance of either is cited here. It is an expectation, and #49's pass across what shipped is what would
> show it false

The document is honest that the drift it exists to prevent has not been observed. It then names the test and
schedules it afterwards: "#49 (after #48)". #49 is ordered after because it is written to start from the Fit
lines. But the question it would answer does not need them: in the one real project and in slipway, is any
number a person sees calculated in two places, is any surface built two ways? That is a search of an afternoon.
What is built before it is three pull requests, a new check, a new sync row kind, a template section every
future feature doc fills, and four skill changes.

Known limitations already concedes the mechanism may not catch the case the Problem describes: "Two features
shaped in the same week can each search, each find nothing, and each write a true `New:` line. F2 never
compares two docs; two paths for one number are found by #49's pass." So the pass, not the section, is what
finds the drift, and it runs last.

The same gap shows in §5: `process/cold-review.md` says "A new checklist line needs a lesson naming the failure
it prevents", and the Contract adds "the lesson … with it". With no instance cited, that lesson would name a
failure nobody has seen. The neighbouring evidence (reuse lists written in seven shapes) is about documents, not
about a number calculated twice.

This does not ask to reopen D-036, which settles how the count arrives, not whether the premise holds.

**Proposed resolution.** For the owner: run the search half of #49 by hand first, on what has shipped, and
record what it finds as a count in this Problem. One instance makes the lesson real and gives `/log-feature`'s
search an example to pin; none is a reason to ship the section and the skill sentence (cheap) and hold the
check and the sync row (the cost) until one appears. If the order stays, say so as a decision with what reopens
it, and word the lesson as what it is.

### AR-6 — Four clauses of "held" have no case

**Where:** F-12, Contract §2 "Held" rules 3 and 4 (lines 140–144), §4 the fixture table and the green cases
(lines 236–261); against L-09.

"Held" is what 0.2 changed, and its new rules are each proved by one red case (`reviewed-draft`,
`scheduled-draft`). Nothing proves their edges:

- **`closed`.** Rule 4 says "`active` or `closed`", and gives the reason for `closed`. `scheduled-draft` is an
  active milestone. A reader that tests `status === 'active'` passes every case.
- **`shaping` and `killed`.** No green case has a draft cited by a shaping or a killed milestone. A reader that
  holds on any milestone passes every case, and then a project's whole shaped plan is held on sync.
- **A review of another doc.** No green case has a draft with no Fit beside a review that names a different
  path. A reader that holds every draft once `docs/reviews/` has a file passes.
- **"Any review counts, current or not."** No case has a review whose version line is stale. A reader that
  reuses R1's notion of a current review passes, and then a doc leaves the count when it is revised.

Smaller: the acceptance says `process/cold-review.md` "carries its sentence" and names no test for it (the two
skills' sentences are pinned; this one is in a file `scripts/skills.test.mjs` does not read today).

**Proposed resolution.** Four cases, one line each: `closed-milestone` (red, `fit/missing`); green cases for a
shaping and a killed milestone citing a draft; a green case with a review of another doc; `stale-review` (red).
Name the pin for the cold-review sentence, or say it is unpinned and why.

### AR-7 — "Byte for byte as it was" and "serialises it" are both true only of a file already in that form

**Where:** F-12, Contract §3 (lines 178–180, 193), Acceptance (lines 436–438).

> `ci/checks/lib/ratchet.mjs` reads `ci/baselines.json` and serialises it (two-space JSON and a final newline …)

> `--apply` adds feature-fit and every other key is byte for byte as it was

A project's file written by a formatter with another indent, or holding `1.0` or a key twice, comes back
different after one read and one write. The acceptance line passes on the fixture the build writes for it and
says nothing of the file a project has.

**Proposed resolution.** Say which: every other key's *value* is kept and the file is rewritten in the one
form (then the sync row's sentence says the file was reformatted when it was), or the key is inserted without
re-serialising. Give the test a file that is not already in the form.

### AR-8 — F2 prints less than "whatever the result" on a BROKEN run, and its BROKEN message hands out the one command that records any count

**Where:** F-12, Contract §4 (lines 223–231), Threat model (lines 339–345); against `ci/checks/lib/report.mjs`
and D-036.

"**Every run also prints,** whatever the result: a warning line for each file that is not a feature doc".
`report()` prints warnings only when the run is not BROKEN, and the document's own verified line says "a BROKEN
run reports no findings". On exit 2 the warning lines are not printed.

The BROKEN message names `node ci/checks/meta/f2-feature-fit.mjs . --update`, and `--update` "writes the current
count … when there is no baseline". That is the one branch with no ratchet: whatever the count is becomes the
baseline. D-036 says "the owner never edits the baseline by hand" and that the count "may only go down"; in a
project the recorder is sync. A red F2 two edits away from green (remove the key, run the command the check
then prints) is the shape decision-defaults §3 asks to be named. `ci/**` is owner-only, which is the real
guard; the Threat model mentions a baseline "raised by hand" and not this path.

**Proposed resolution.** Reword to "every run that is not BROKEN". In a project, have the BROKEN message name
sync as what records the count, and keep `--update` with no baseline for slipway's own tree (or say in the
Threat model that the branch exists, that the file is owner-only, and that the diff shows a key removed and
re-added).

### AR-9 — The Problem's count is off by one

**Where:** F-12, Problem (lines 21–24).

> six carry an ad hoc "what is reused" list … this doc is the seventh, and eight carry none

`dev/features/design-before-screens.md` carries one too, as a paragraph ("Reuses (searched by behaviour): …",
line 193 at this commit, and present at 0eb12fc). Seven carry a list in seven shapes, this doc is the eighth,
and seven carry none. It strengthens the point; the number is still wrong, and #48 repeats it.

**Proposed resolution.** Correct the three numbers here and in #48's Problem when the Contract is next embedded.

### AR-10 — Seven readings the check and its readers depend on are not specified

**Where:** F-12, Contract §2 (lines 140–141, 158–165), §3 (lines 187–188), §4 (lines 215–226), §5 (lines
284–286).

1. **`Reuses:` with no bullets.** "Says nothing is reused: every bullet under `Reuses:` starts with `nothing`."
   A doc that writes `Reuses: the date helper in lib/dates.ts` on the label's own line has no bullets, so every
   bullet starts with `nothing`. With `New: none` it gets `fit/unfilled/new` for a line that is filled.
2. **Backticks on `nothing`.** The template's guidance writes the word in backticks. Backticks are removed for
   `New:` and `Numbers:` ("read the same way") and nothing is said for a `Reuses:` bullet that starts
   `` `nothing` ``.
3. **The review's path.** Rule 3 matches "its path" as `reviewProvenance()` gives it. `./dev/features/x.md`, or
   a path R1 accepts after normalising, is the same file; say that the comparison normalises, or that it does
   not and such a review holds nothing.
4. **Why a doc is held** is not in the finding (AR-2).
5. **What sync's install record holds for the path.** The row is handled "whether or not … the project's install
   record lists it"; whether `--apply` and `new-project` then record the path, and with what, is not said, and
   the next plan reads that record.
6. **A `ci/baselines.json` that is not JSON, met by F2.** Sync refuses; F2's table has no row for it, and
   `ci/ratchet.mjs` today throws on it.
7. **"The Fit of the doc the issue embeds."** An issue embeds the doc's Contract and Verify; Fit sits before
   the Contract and is not embedded (#48 carries it by hand). Say that the reviewer opens the doc at the pull
   request's head, or that `/log-feature` embeds Fit in the issue beside the Contract.

**Proposed resolution.** One line each in §2 to §5, and a case for the two that change an answer (1 and 3).
