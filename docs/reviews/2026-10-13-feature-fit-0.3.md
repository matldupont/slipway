# Adversarial review — F-12 feature fit 0.3

Reviewed: dev/features/feature-fit.md @ 135dfee
Version line: Version: 0.3 (2026-10-13)
Supersedes: docs/reviews/2026-10-12-feature-fit-0.1.md
Supersedes: docs/reviews/2026-10-12-feature-fit-0.2.md
Review date: 2026-10-13
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`.

135dfee is the head of `docs/feature-fit-0.3-48` (pull request #417) at the time of the review, with `main`
(2259472) merged in. This session did not write or edit the document at any version, and wrote neither earlier
review. The review is committed on #417's branch at the owner's instruction, with no pull request of its own.
Two earlier reviews name this path and both are superseded above.

D-036 as amended on 2026-10-13 makes this the last whole-document review before the build. So each finding
below says where its proposed resolution would sit: inside Contract, Acceptance or Verify (which moves the
`Version:` line, D-041, and asks for a review the cap rules out), or outside them (Problem, Known limitations,
Build map), which moves nothing.

**What was read.** In full: the target; `decisions.md` D-036 with its three parts, D-040 and D-041; issues #48
(the body as re-embedded from this branch) and #49; pull request #417's body; `.claude/skills/log-bug/SKILL.md`;
`.claude/skills/review-doc/SKILL.md`; `ci/ratchet.mjs`; `docs/reviews/TEMPLATE.md`; the 0.2 review, for what it
asked and what its Tracker column now promises. In part, to check a named claim:
`.claude/skills/sync-slipway/SKILL.md` (the commands, §1), `scripts/sync.mjs` (its header, `KINDS`, `LABEL`,
`MEANING`, `planDoc()`), `scripts/skills.test.mjs` (lines 1–60, the cap, which skills it reads),
`.claude/skills/close-milestone/SKILL.md` §3 and §4, `.claude/skills/log-feature/SKILL.md` (its headings and
where it extends a doc), `process/cold-review.md` (lines 25–50), `process/decision-defaults.md` §5 and "What
these never settle", `process/intake.md` → Feature doc version, `process/lessons/L-69`, the register of the 0.1
review, the frontmatter and headings of every file in `dev/features/`, `docs/milestones/`.

**Verified, and how.** The line references in the document's Fit were opened at 135dfee: `section()` at
`markdown.mjs:11`, `frontmatter()` at `frontmatter.mjs:9`, `PLACEHOLDER` at line 30, `report()` at
`report.mjs:65`, F1's citation pattern at `f1-feature-coverage.mjs:53`, `MAX_LINES = 300` at
`skills.test.mjs:29`, `reviewProvenance()` exported from `review-header.mjs`. All hold. `wc -l` gives 300 for
the log-bug skill and 297 for log-feature. `ci/baselines.json` is absent. A sync from a branch exists
(`npx github:matldupont/slipway#<ref> sync …`, the sync-slipway skill), so the step 1 probe can run as written
on that point. The plan's JSON has a `notes` array the skill already says to the owner, so the count's sentences
have a place to travel without a skill edit; whether they do is the carried AR-4 of 0.2 and is not re-argued.
No open pull request other than #417 touches this doc, its reviews, or the two skills 0.3 names. Two references
from the older `Verified against: 0eb12fc` line have moved and are not findings (0.3 says it re-read nothing
else): `ci/status.mjs` reads `decisions.md` at line 107, not 105, and the words quoted from
`ci/checks/lib/risks.mjs:1` sit on line 2 of the comment that starts there.

`docs/product/FRAME.md` in slipway is the unfilled template, as the 0.2 review found; there is no FRAME question
to hold the feature against. Not read: any project built from slipway; `scripts/new-project.mjs`,
`scripts/adopt.mjs` and the sync tests; the bodies of the other feature docs.

**Not argued.** D-036 and its amendments are the owner's: the count ratchets, sync records it, a doc is held
from its first review or its schedule, Fit is three lines, the build is not held for #49's pass, a bug stub is
held like any doc, `/review-doc` stops on a doc with no filled Fit, and the round is capped. A finding below
touches one only where the document's own text, or the code, does not carry it out.

No finding below is S0 or S1. The four findings of 0.2 that 0.3 set out to resolve are resolved as far as the
decision in each goes: AR-3 (the probe is named, and a no keeps the pull request unmerged) and AR-5 (the order
is a recorded decision with a stated reason) cleanly; AR-1 and AR-2 each leave the narrower gap below.

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
| AR-1 | `/log-bug` is told to read Fit "from its code as Phase 2 traced it"; Phase 2 traces the bug's path and the stub covers the whole feature | S2 | owner | Build map 3 | |
| AR-2 | `/review-doc`'s stop restates "no filled Fit" as three conditions where Contract §2 has more, and nothing tells a reviewer what F2 will say of a draft not yet held | S2 | owner | Build map 3 | |
| AR-3 | A filled Fit leaves the baseline above the count until someone runs `--update` on an owner-only file; nobody is told to, and each backfill leaves room for a new held doc with no Fit to pass | S2 | owner | Build map 2, 3 | |
| AR-4 | What reopens the choice cannot be read off as written: "only the short answers" has no reading under Contract §2, and the line is headed for the acceptance of an issue whose pull request cannot meet it | S2 | owner | #49 | |
| AR-5 | The step 1 probe does not say which slipway makes the scratch project; one made by step 1's own `new-project` already holds `feature-fit: 0`, and the plan shows the file unchanged | S3 | author | Build map 1 | |
| AR-6 | Six items carried from the 0.2 review have their build step only in the Tracker column of a review this one supersedes; neither the Build map nor #48 names them | S3 | author | Build map 1, 2, 3 | |
| AR-7 | Five small things: who sends a stub to review, slipway's expected count, the pins, a cap one sentence cannot break, the window between build steps 2 and 3 | S3 | author | — | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — `/log-bug` reads Fit from a trace of the bug's path, and the stub covers the whole feature

**Where:** F-12, Contract §5 `/log-bug` (lines 307–313), §1 (lines 127–130), §2 "Lacks Fit" (lines 165,
173–175); against `.claude/skills/log-bug/SKILL.md` lines 86–87, 171–172 and 183–184.

> The feature is already built, so the three lines are read from its code as Phase 2 traced it (what it reuses,
> with paths; where each number it shows is calculated), never from memory.

Phase 2 does not trace the feature. It goes "from the symptom inward" and says "Read the functions on the path,
not whole files." The stub step then says "The doc covers the whole feature the bug lives in, not the bug: 'the
export skips the last day' goes in `export.md`." `Numbers:` asks for "each number this feature shows a person".
For an export whose bug is one date bound, the trace holds one number's path; the rest of the feature's numbers
were never read.

Three outcomes, and the Contract picks none:

- The stub's Fit lists what the trace saw and reads as the feature's whole answer. A reviewer checking it finds
  each line true and cannot see what is absent.
- The agent fills the rest from what it believes the feature does, which is the "from memory" the sentence
  forbids.
- "When the trace shows nothing shared, the stub gives the short answers." A trace of one narrow path will
  usually show nothing shared, so `nothing` and `none shown` become what a bug stub writes. Those are the
  answers D-036's amendment counts to decide whether the check goes back to the owner (AR-4).

`New:` has its own problem on this path. It asks "why reuse was not possible", for code someone else wrote some
time ago. The skill's own rule for the stub is "Everything you cannot derive from the PRD or the code is an
Open question for the owner, never an invented rule." And Contract §2 refuses `nothing` with `none`, so the
stub that reuses nothing must write something under `New:`; "the short answers any doc may, under the same
rules" leads straight to `fit/unfilled/new` in the skill's own `pnpm meta` when the fix is scheduled now.

S2, not S1: the result is a thin or partly invented Fit, not a red gate, and the bug's acceptance sends the stub
to `/review-doc` before the fix starts, where a Fit line is checked as a claim about the code.

**Proposed resolution.** For the owner, one of: (a) the stub step reads further than Phase 2, sized for a fix:
the feature's entry points, for each number it shows and each shared helper it calls, and says what it read;
(b) the stub's Fit covers what was traced and says so in the line ("traced: the date range; not read: the
rest"), with the remainder an Open question, and `/review-doc` is the reader that asks for the rest. Either
way say what a stub writes under `New:` (what the feature's code has that nothing else does, with "why" an
Open question when the code does not show it). This sits in Contract §5. Under the cap it can be carried the
way 0.2's AR-4 was: a line under Build map step 3, "check the stub step's reach against Phase 2 and the doc it
writes, and pin what the sentence says is read".

### AR-2 — `/review-doc`'s stop is a second definition of "no filled Fit", and a reviewer has no way to ask F2

**Where:** F-12, Contract §5 `/review-doc` (lines 298–303), §2 "Lacks Fit" (lines 159–177), Known limitations
(lines 392–393); against pull request #417's body and `.claude/skills/log-feature/SKILL.md` lines 135 and 293.

> a feature doc with no filled Fit (no `## Fit`, a label absent, or a placeholder left in one) is not reviewed
> as it is.

Contract §2 has more ways to lack Fit than these three: a label whose text is empty; a label written
`- Reuses:` or `**Numbers:**`, which "reads as absent" to the check and reads as present to a person; `Reuses:`
saying nothing with `New: none`; a first `## Fit` inside a fence above the real one. A reviewer who applies the
three conditions reviews such a doc, commits the review, and F2 holds the doc under rule 3 and turns the
reviewer's pull request red on a file "a reviewer never edits". That is the case the stop was added to end.

The document already holds the principle that would have caught it: "One definition of 'unfilled' is kept over
a second." The stop writes a second one, in prose, in a skill.

Nor can the reviewer ask the check. F2 names the docs that are held. For a draft not yet held, the module
returns a count ("the drafts not yet held that would lack Fit if held") that only sync prints, as a number. So
at step 1 of a first review there is no command that says "this doc would be counted".

Two smaller points on the same stop:

- **A doc already counted.** The reason the Contract gives ("The review would hold it … and turn the reviewer's
  own pull request red") is true only of a doc nothing holds yet. #417's body says the stop was widened to
  "any feature doc with no filled Fit, one already counted in the baseline included" by decision-defaults §5.
  That choice changes what a project's owner meets (the first revision of each doc written before the section
  now needs its Fit before it can be reviewed), and it is recorded in a pull request body, not in the document
  or `decisions.md`.
- **`/log-feature` extending a doc.** `/log-bug` is told to fill Fit in a doc it "extends and sends to review".
  `/log-feature` also extends an existing doc ("Extend its doc (a Changes line, the Contract amended)") and
  §5 gives it Fit only in "Phase 4's feature-doc list". On that path the Contract moves, the review is owed,
  and the review stops and sends the owner back to the session that just finished.

**Proposed resolution.** The stop names no conditions of its own: a feature doc "that F2 would report as lacking
Fit (Contract §2)" is not reviewed, and F2 prints, on every run that is not BROKEN, one line for each draft not
yet held that would lack Fit, so `pnpm meta` before the review answers the question. Say in the Contract that
the stop covers a doc already counted, and why. Give `/log-feature`'s extend path the same sentence `/log-bug`
got. All three sit in Contract §5 and §4. Carried instead: a line under Build map step 3 (the stop's wording
is checked against §2's table, case by case, and pinned) and one under step 2 (the named lines for drafts).

### AR-3 — A filled Fit leaves the baseline above the count, and nobody is told to lock it in

**Where:** F-12, Contract §4 the baseline table and `--update` (lines 228–236), "Slipway's own tree" (lines
281–282), §5 (lines 287–313), Known limitations (line 387); against D-036 and `ci/ratchet.mjs`.

D-036: "a new or newly shipped doc without Fit raises the count, so it fails." That holds only while the count
equals the baseline. The table's third row:

> below | exit 0, the same warnings, and the ratchet's line as an `F2:` line: the number improved, run F2 with
> `--update` to lock it in

`ci/baselines.json` is under `ci/**`, owner-only, and D-036 says "The owner never edits the baseline by hand."
The Contract now names four places that fill a Fit in a doc already counted: `/log-bug` on a doc it extends,
`/close-milestone` on a doc it marks shipped, the author before a review (`/review-doc`'s stop), and slipway's
own docs as "each of those lands its own Fit". None is told to
run `--update`, to ask the owner for the edit, or to list it under `## Gate changes`. `SLIPWAY.md` describes
`--update` and no skill runs it.

So in the ordinary course: a project is recorded at 3; `/log-bug` fills one doc's Fit; the count is 2 against
3 and every run is green with a line nobody is assigned to act on. The next doc that becomes held with no Fit
(a milestone set `active` that cites a draft, a `status:` changed by hand) brings the count back to 3: equal,
exit 0. The check is silent on exactly the doc it exists to catch, once for every Fit that was filled and not
locked in. The other two ratchets have the same shape, but their numbers move by accident; this one is moved
down on purpose, by skills, as the designed way out.

This was in the document at 0.2. It is raised now because 0.3 adds two more of the paths that open the gap.

**Proposed resolution.** For the owner: who locks it in. Either each skill sentence that fills a Fit in a
counted doc ends by running `--update` in the same commit, asked for as an owner-only edit and named under
`## Gate changes`; or "below" is not left to a person at all: it fails until the baseline in the same pull
request matches, the stricter reading (decision-defaults §5), and a change to what D-036 says of "below". The
first is a clause in each §5 sentence, the second a row of §4's table (both Contract). Outside the
Contract, and enough to build on: a Known limitations line that says the room exists and how large it can get,
and a line under Build map step 3 that the skills' sentences are checked for it.

### AR-4 — What reopens the choice cannot be read off as written

**Where:** F-12, Problem (lines 24–28), Contract §2 (lines 165, 173–175), §4 the claim line (lines 242–244),
Known limitations (lines 381–383); against D-036 as amended 2026-10-13, #49 and #417's body.

> how many of the milestone's docs gave only the short answers (`nothing`, `none shown`, `none`). A drift Fit
> did not stop, or short answers in most of the docs, brings the check and the sync count back to the owner.

Four things stand between this sentence and a reader who can act on it.

1. **"Only the short answers" has no reading.** Contract §2 refuses `nothing` together with `none`
   (`fit/unfilled/new`), so no doc with a filled Fit gives all three. Is the count docs that give any one, two
   of three, or `nothing` with `none shown`? F2's claim line counts each answer alone, across every held doc,
   not per milestone and not per doc. The number the sentence asks for is not one the module returns.
2. **"Most"** has no number. More than half of the milestone's docs is the plain reading; say it.
3. **"A drift Fit did not stop"** is something the document expects when Fit works as designed: "Two features
   shaped in the same week can each search, each find nothing, and each write a true `New:` line … two paths for
   one number are found by #49's pass." One such find reopens the check. If that is intended, the first
   milestone with two features shaped together very likely reopens it; if it is not, the trigger needs to
   leave out the case the Known limitations already accept.
4. **Where the line goes.** "The line goes into #49's acceptance when this version merges." #49 builds a step
   in `/close-milestone` that runs at every close in every project. Its pull request cannot show "the first
   pass over a milestone built with Fit": no such milestone exists when #49 is built, and its oracle is a
   fixture. An acceptance line no pull request can meet is dropped or left unticked. What #49 can be held to
   is what the step prints each time; the one-off reading of the first real result, and bringing it back to
   slipway's owner, is somebody's task and has no home yet. #49 is unchanged today, as the document says; the
   only carrier named is a sentence in #417's body.

None of this reopens the owner's decision to build first. It is about whether the condition they attached to
that decision can fire.

**Proposed resolution.** For the owner: fix the two numbers (which docs count as short, and "more than half"),
and say whether a drift of the kind the Known limitations name counts. Put in #49's acceptance what its step
prints at every close (the drifts found that the docs' Fit lines did not name, and the short-answer count over
the milestone's docs, from the same module F2 uses), and track the first reading as its own item under #379.
All of this is Problem text, D-036's amendment and #49: nothing in Contract, Acceptance or Verify moves.

### AR-5 — The step 1 probe does not say which slipway makes the scratch project

**Where:** F-12, Verify, owner probes (lines 508–517), Contract §3 `new-project` and the row table (lines
195–205), Build map step 1 (lines 526–537); against `process/decision-defaults.md` → What these never settle.

> The build session makes the project, outside the repository … it syncs from step 1's branch.

Step 1 changes `new-project` so that it writes `{"feature-fit": n}`, "which is 0". In slipway's checkout the
natural way to make a project is that branch's `new-project`. Such a project already holds a whole-number
`feature-fit`, so §3's table gives the row `unchanged` and "writes nothing", whatever docs are then added. The
three things the owner is to read (a "count recorded" row with 2, 1, 1; the file holding 2; a second plan
unchanged) cannot appear, and the owner's no would be about the setup, not about sync. The acceptance block
for the same behaviour says it ("and no ci/baselines.json"); the probe does not. Step 2's probe has the same
gap.

Also: "Creating or deleting anything outside the repository" is on the list decision-defaults never settles.
The probe has the build session create the project and bars deleting it; the creation is still asked for.

**Proposed resolution.** One clause in each probe: the project is made from the newest release (before step 1),
given its docs and a review file, committed, then synced from the branch. Say the session asks before it makes
the project. The probes sit in Verify; carried instead as a clause in Build map step 1's probe sentence.

### AR-6 — Six carried items have no line the build will read

**Where:** F-12, Changes (lines 587–594), Build map (lines 526–546); against the Tracker column of
`docs/reviews/2026-10-12-feature-fit-0.2.md` and #48's body.

> Carried into the build with no Contract change: AR-4 (step 1), AR-6 (step 2). AR-7 to AR-10: the review's
> Tracker column

The Build map names AR-4 and AR-6. #48's body, which `/work-ticket` builds from, names the same two and no
other (`grep` of the body: `AR-4` twice, `AR-6` once). The rest are promised only in the 0.2 review's table:

- AR-7: `scripts/sync.test.mjs` gives the row a file that is not already two-space JSON (step 1);
- AR-8: `scripts/f2.test.mjs` pins what a BROKEN run prints, and the `--update` path with no baseline is named
  in that pull request's known limitations (step 2);
- AR-9: the Problem's three numbers are corrected, here and in #48 (step 2);
- AR-10: seven readings, split over steps 1, 2 and 3;
- the second half of 0.2's AR-2: F2's finding says why a doc is held (step 2);
- the smaller item of 0.2's AR-6, the pin for the cold-review sentence, which has no Tracker cell at all.

That review is superseded by this one. It stays on disk, but a build session has no instruction that leads to
a superseded review's table, and R1 stops reporting it. The cap's rule was that a low finding gets a build
step; these have one written where the builder does not look.

**Proposed resolution.** One line under each Build map step listing the carried items by what is done, as AR-4
and AR-6 have, and the same lines in #48 when it is next embedded. The Build map is outside Contract,
Acceptance and Verify, so the version does not move.

### AR-7 — Five small things

**Where:** F-12, Contract §1 (lines 128–130), §4 "Slipway's own tree" (lines 277–283), §5 (lines 291–313),
Acceptance (lines 479–486), the 0.3 `Verified against:` line (lines 354–358), Build map (lines 521–524).

1. **Who sends a stub to review.** "held like any doc, and in the run that writes it: the skill sends it to
   review". The skill does not: "The bug's acceptance says it is reviewed first (Phase 5); there is no separate
   review issue." The review is a later session's, and only a project's case C, answered "now", schedules the
   stub in the same run. The stub's Fit is filled before its commit either way, so nothing breaks; the sentence
   describes a run that does not happen.
2. **Slipway's expected count.** "at 0eb12fc those are `tests-can-fail.md` and `design-before-screens.md` … the
   number is expected to be 2". Both pull requests have merged. By the paragraph's own rule nothing now excuses
   those two, so step 2 backfills four docs and the count is 0; Build map step 2 still lists two. #417's body
   says this was seen and left under the round's rule. It is recorded here so it has a Tracker cell.
3. **The pins.** §5 gives `/review-doc` two sentences and ends "One new pin"; Acceptance pins both (lines 480
   and 486). §5 gives `/close-milestone` no pin; Acceptance pins it. The cold-review sentence has none (AR-6).
4. **A cap one sentence cannot break.** "The skill is 300 lines against the cap of 300; room is made by
   rewording or trimming". The cap counts lines, and that file has four lines over 300 characters, the longest
   628. A sentence appended to any of them keeps the count at 300, so "≤ 300 lines" in the acceptance cannot
   fail for this change. The `Verified against:` line also says `log-bug` "is under the cap"; it is at it.
5. **Between steps 2 and 3, in slipway.** "No release is tagged, and no project syncs from `main`, until the
   third has merged" protects projects. Slipway's own tree gets the check at step 2, and the stop and the
   skills that fill Fit at step 3. In between, a first review of any of its nine drafts that nothing holds yet turns that
   review's pull request red on `fit/missing`, with no skill saying why.

**Proposed resolution.** 1: reword §1 to "from its first review, and from its commit when the fix is scheduled
now". 2: name the four docs, or say the list is taken at step 2's head. 3: count the pins once, in §5. 4: say
the sentence goes in without lengthening a line past the longest there, or drop the claim that the cap is what
holds it. 5: a sentence in each of step 2's and step 3's pull request bodies, or land the two together. Items
1 to 4 are Contract or Acceptance text; none changes what is built, so they can wait for the first Contract
edit the build needs, if there is one. Item 5 is Build map.
