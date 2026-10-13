# Adversarial review — F-14 design before screens 0.3

Reviewed: dev/features/design-before-screens.md @ f2fab36
Version line: Version: 0.3 (2026-10-13)
Supersedes: docs/reviews/2026-10-12-design-before-screens-0.1.md
Supersedes: docs/reviews/2026-10-12-design-before-screens-0.2.md
Review date: 2026-10-13
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`.

**How this review was run.** In a session the owner opened for it (model id `claude-opus-5-5`, as the harness
reports it), which wrote and edited no version of the document. No agent was spawned. One departure from the
skill's step 3, the owner's instruction: the review is committed to the branch of pull request #418
(`docs/design-before-screens-0.3-406`) with no branch or pull request of its own. That branch is checked out in
another worktree, so the document was read at its head, f2fab36, on a detached checkout, and the commit is
pushed to the branch from there. Two earlier reviews in `docs/reviews/` name this path; both are superseded
above. Both were read, since the document's Changes entries and Build map cite them. Their findings are not
re-scored; where one below continues one of theirs it says so.

**What was read.** In full: the target at f2fab36; `docs/reviews/TEMPLATE.md`; the 0.2 review, and the 0.1
review's titles; `decisions.md` D-042 with both amendments, D-040 and D-041; issue #406 (body and its one
comment), which embeds the Contract at 0.3; `process/decision-defaults.md`; `docs/product/FRAME.md`;
`docs/milestones/TEMPLATE.md`; `docs/milestones/M1-walking-skeleton.md`; `.claude/skills/close-milestone/SKILL.md`;
`.claude/skills/sync-slipway/SKILL.md`; `ci/checks/lib/exceptions.mjs`; `ci/exceptions.yaml`;
`ci/checks/meta/fo1-fail-open.mjs`; `ci/checks/meta/ms1-milestones.mjs`. In part, to check a named claim:
`ci/checks/lib/clock.mjs` (header and `zone()`), `ci/checks/lib/milestones.mjs` (lines 1–140),
`ci/checks/meta/lk1-lockfile.mjs` (its registry loop), `ci/status.mjs` (the lines that read the frame and build
Needs attention), `dev/ownership.yaml` (the seeded and managed rows), `ci/checks/meta/r1-review-provenance.mjs`
(the `Supersedes:` rule).

**What was run.** Each from the working tree, none writing a file in it:

- `node ci/checks/meta/fo1-fail-open.mjs` on a scratch folder holding one workflow with no `continue-on-error`
  and a registry with the Contract's own entry (`docs/milestones#M2/accessibility`, a reason, an owner, a day
  still to come): exit 1, "the entry in ci/exceptions.yaml matches no continue-on-error step or job — remove
  it" (AR-1).
- `expiryProblem()` with today as the day (`expired`), the day after (`null`) and `never` (`not-a-day`): the
  Contract's "today or earlier" holds.
- `PLACEHOLDER` against the `reason:` value the Contract's example shows, `<what is not held yet, and what will
  hold it>`: no match (AR-5).
- `git diff --stat a76c489..origin/main` over the files the Contract's "Verified against" names and the ones
  0.3 adds: one file moved, `ci/status.mjs`, in #403 (how it counts a PRD review); nothing the Contract reads.
- `node ci/checks/meta/r1-review-provenance.mjs .` before this file existed: 2 findings, the 0.1 and 0.2 reviews
  stale.

**What held.** Of what 0.3 newly builds on: `loadRegistry()` reads `id`, `expires`, `reason` and `owner`
strictly and throws on anything else; `expiryProblem()` is the one date rule and LK1 uses it; LK1 reads only ids
that start `pnpm-lock.yaml#`; `ci/exceptions.yaml` is seeded, so a project's entries survive a sync; `clock.mjs`
gives the day in the project's zone and takes `CHECK_TODAY`; MS1 fails a placeholder under Gate and No-gos in an
active, closed or killed milestone and holds one milestone active at a time; `pnpm status` sends an unframed
project to `/kickoff`; `/close-milestone` §2 evidences "every line under `## Gate`"; `/sync-slipway` §5 wants both
gates green before its pull request opens; the Changes entry's count of the 0.2 findings (six in the text, AR-3
and part of AR-6 carried, seven tracker only) adds up to that review's fourteen; #406's body embeds the Contract
and Verify of 0.3, with the Build map's carried lines.

**Not verified.** The private project the Problem describes. WCAG 2.2's text. The claims the 0.2 review opened
and found to hold at 5719345 (`prose()`, `section()`, `plain()`, `noGos()`, K1's `placeholder/present`, PC1, W1,
`milestoneNumber()`, PRD §9, `/kickoff`'s phases) were not opened again; the diff above shows none of those
files moved. `.claude/skills/kickoff/SKILL.md`, `ci/checks/lib/report.mjs`, the lessons in `process/lessons/`
and `docs/domain-invariants.md` were not read in this run. `docs/product/FRAME.md` in slipway is the unfilled
template, so the feature is read against the thesis it cites, `SLIPWAY.md`'s "a rule exists only where
something fires".

**The eight passes.** The question: no part drifts from the cited thesis; AR-2 is where it is left partly unmet.
Criteria that cannot fail: AR-8. Assumptions stated as facts: AR-1 (a code fact the document states and does
not act on). Contradictions: AR-3, AR-5, AR-6. Source coverage: a feature doc has no table; #406's six points
each have a section and its eight acceptance lines now match the Contract. Scope: nothing is in that should be
out. Sequencing: AR-4. What is missing: AR-2, AR-7, AR-9.

**Not argued.** D-042's six choices and the picks of its two amendments are the owner's. One is noted and left:
the second amendment replaced `accessibility: PD-<n>` because "the decision left every surface on the day its
milestone closed, and one decision could be named by every milestone", and says in the same paragraph that
`design: PD-<n>` is not changed. Both reasons are true of `design: PD-<n>`. That is a stated choice, and Known
limitations says what it passes on.

**Read with the cap in mind.** The Changes entry says 0.3 was written "under the capped loop", and #406 says this
is the last whole-document review before the build. So each proposed resolution below says whether it can be
taken without moving the `Version:` line (the Build map and Known limitations are outside Contract, Acceptance
and Verify, D-041), or whether it is a Contract edit.

No finding below is S0 or S1.

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
| AR-1 | The dated entry is red on the day it is written: FO1 reports it as stale. The document states the fact and files it as a thing to check; the change to FO1 is in no list of gate changes, and no check owns a `docs/milestones#` id that is not well formed | S2 | author | Build map 3, 4 | |
| AR-2 | An entry ends with a sentence nobody proves: the milestone closes with no accessibility evidence, the line is later typed into a closed file, and `/close-milestone` is unchanged. Nothing shows the debt before its day | S2 | owner | Build map 3, 4 | |
| AR-3 | On sync the skeleton's two new lines and the owner's answers do not compose: a shaping skeleton takes placeholders the next bullet forbids, a running one that answers with a date goes red on MS1, and a project with no front end is not told to decline them | S2 | author | Build map 4 | |
| AR-4 | The carried lines and half the tracked findings end in Contract edits, each of which moves `Version:` and asks for the review the cap says is the last; seven findings are tracked only in a review this one supersedes | S2 | owner | Build map 2–4 | |
| AR-5 | `Front end: none` "closes every finding but `screens/unknown`", an entry's included; five readings of an entry and of a decision id are not specified | S3 | author | Build map 3 | |
| AR-6 | "The two differ in that argument and nowhere else" is not what the two rules say; thirteen status cases change and the Build map names four | S3 | author | Build map 3 | |
| AR-7 | One design item answers for every later milestone for the life of the project, and any item that starts `Design:` is one | S3 | owner | — | |
| AR-8 | `accessibility/entry` has seven clauses and one case; four more clauses of 0.3 have none | S3 | author | Build map 3 | |
| AR-9 | Five small things: Seams, Out of scope, the template's own instruction, the "Verified against" list, the example's `reason:` | S3 | author | — | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — The dated entry is red on the day it is written, and the document files that as a question

**Where:** F-14, Contract §3 "Not held yet" (lines 165–191), §4 first paragraph (lines 195–199) and the rows
`gate/accessibility`, `accessibility/overdue`, `accessibility/entry` (lines 216–218), Reuses (lines 371–375), §5
`/sync-slipway` (lines 343–349), Build map step 3 (lines 579–582) and its opening (lines 553–554); against
`ci/checks/meta/fo1-fail-open.mjs:139–148` and D-042's amendment of 2026-10-13.

> Carried from the 0.3 round: AR-1, check how FO1 treats a registry entry that is not its own (it reports
> one that matches no `continue-on-error` as stale, and skips only the lockfile's) against the code and pin
> with a test that an entry of DS1's class is not reported by FO1 or LK1

The parenthesis is the answer, and it is right (run: FO1 exits 1 on the Contract's own example entry). Three
things follow that the line does not carry.

1. **The Contract, built as written, cannot be used.** `gate/accessibility` tells the owner to add the entry;
   FO1 then tells them to remove it. On a sync, "an owner who cannot yet say how the screens meet the level
   answers with the date", and sync's own rule wants `pnpm meta` green before its pull request opens. The
   owner's pick of 2026-10-13 works only with a change the Contract does not describe.
2. **That change is to a gate, and it is in no list.** FO1 must stop reporting a second class of id. §4 says
   what DS1 reads and Reuses lists `loadRegistry()` and `expiryProblem()`; neither says FO1 changes. The Build
   map names MS1 under `## Gate changes` and files FO1 as "check … against the code". A builder who checks,
   finds the document already knew, and adds a skip has changed what a gate passes with no line asking for it.
3. **Ownership by prefix leaves ids nobody owns.** Once FO1 skips ids that start `docs/milestones#`, an entry
   written `docs/milestones#M2/accesibility`, `docs/milestones#M2` or `docs/milestones#M2/design` is FO1's no
   longer. `accessibility/entry` lists "is not a milestone"; it does not say an id of the wrong form is its
   finding. If it is not, that entry sits in an owner-only file excusing nothing, reported by no check. (A
   mistyped prefix stays FO1's, which is right.)

**Proposed resolution.** No version move needed: reword the Build map line as work, not a question. FO1 skips
ids that start `docs/milestones#`, as it skips the lockfile's; `ci/checks/meta/fo1-fail-open.mjs` is named
beside MS1 under `## Gate changes`; DS1 reports every entry with that prefix that it cannot hold to a milestone
and the `/accessibility` form, as `accessibility/entry`; one case that FO1 still reports a stale entry of its
own class, one that it does not report DS1's. If the owner would rather the Contract say it, that is one
sentence in §4 and a version move (AR-4).

### AR-2 — An entry ends with a sentence nobody proves, and nothing shows the debt before its day

**Where:** F-14, Contract §3 "The accessibility line" (lines 156–158) and "Closing the milestone does not end
it" (lines 182–185), §4 "`pnpm status`" (lines 292–310), §5 `/close-milestone` (line 363), Known limitations
(lines 411–412, 420–424); against `.claude/skills/close-milestone/SKILL.md` §2 and D-042, "Where accessibility
is proved".

> What closes it is the line written under that milestone's `## Gate` with what holds it, and the entry removed

> **`/close-milestone`.** No change: §2 already proves every Gate line with evidence.

0.3 gave the deferral a date that is read, and kept it alive after the milestone closes. That answers the first
and third points of the 0.2 review's AR-1. The second, "closing drops it", is half answered: the entry survives
the close, and the proof does not.

1. **The milestone closes with nothing said.** §2 of the skill produces evidence "for every line under
   `## Gate`". A milestone under a live entry has no accessibility line, so there is nothing to evidence, the
   skill is not told an entry exists, and the Retro does not mention it. The skill's own rule for this is that
   what was not verified "is listed as not verified, not waved through".
2. **The line is written after the only step that proves lines.** Known limitations sends a Gate line "held by
   nothing real" to `/close-milestone`. For this line that skill ran before the line existed and does not run
   again. So the screens built under a deferral are the one set whose line is never proved by anything: a
   sentence added to a closed file, and an entry removed, turn the build green. D-042: "A later audit confirms
   and does not discover."
3. **Nothing shows it coming, and the work has no place.** `pnpm status` gains lines for shaping milestones
   only. A live entry is in DS1's view, whose channel is still to be checked (the 0.2 review's AR-3, carried).
   When the day comes `main` is red for every pull request, in a session that may not edit `ci/**`, for work on
   a closed milestone that no open one planned hours for. The cheap way out on that day is "a later day, with
   its reason".

S2 and not S1: the date fires, which is what the 0.2 finding asked for, and the proof of any Gate line is a
skill's step, not a check's.

**Proposed resolution.** For the owner, one of two. (a) A Contract edit to §5, which moves the version:
`/close-milestone` §2 names a live entry for the milestone it closes in the Retro as not verified, with its
day, and the pull request that later writes the line pastes its evidence under that milestone's Retro;
`pnpm status` shows each live entry and its day under Needs attention. (b) No version move: Known limitations
says the three things above in plain words, and the status line is filed as a follow-up.

### AR-3 — On sync, the skeleton's two new lines and the owner's answers do not compose

**Where:** F-14, Contract §5 `/sync-slipway` (lines 337–362), §2 (lines 125–130), §3 (lines 163–164), Acceptance
(lines 523–528); against `ci/checks/meta/ms1-milestones.mjs:127–129` and `.claude/skills/sync-slipway/SKILL.md`
§3 and §5.

> **Milestones still being shaped** get nothing written … No placeholder is written into a file the project
> owns.

> **The skeleton**, where the project kept slipway's text: the diff is taken (the Gate bullet, the no-go's
> sentence); a closed skeleton is left as it was built. **A skeleton already running** does not take the
> no-go's sentence

The skeleton's diff holds two lines, each with a placeholder. The section says what happens to them in two of
the cases a project can be in. Three are left, and the acceptance pins "each sentence".

1. **A skeleton still being shaped.** It is a milestone still being shaped, in a file the project owns. The
   first passage says nothing is written and no placeholder; the second says the diff is taken, which writes
   two.
2. **A skeleton already running, and the owner answers with a date.** The no-go's sentence is declined. The
   Gate bullet is not: it "is taken", with its placeholder. MS1 fails a placeholder under Gate in an active
   milestone (`section/Gate`), so `pnpm meta` is red and sync's pull request cannot open. With the entry live
   and the bullet unfilled DS1 is content; MS1 is not. The section solved this for the no-go and not for the
   bullet.
3. **No front end.** "A project with no front end sees nothing more." Its skeleton's diff still arrives. §2 and
   §3 say such a project deletes both lines; the sync text does not say the skill declines them, and none of
   the skill's four settled kinds is "the project has no screens".

**Proposed resolution.** One rule and one small table in §5, a Contract edit: a placeholder is never written
into a project's file by a sync; the Gate bullet is written filled with the owner's answer or not at all, and
the no-go's sentence only when a design item exists to name. Rows: skeleton shaping, running, closed; columns:
no front end, answered with what holds it, answered with a date. Without a version move: the same rule as a
carried line under Build map step 4, with the pinned sentences taken from it and the Contract's two passages
left to disagree until the next revision (AR-4).

### AR-4 — The carried work ends in Contract edits, and seven findings are tracked only in a review this one supersedes

**Where:** F-14, Build map (lines 566–568, 574–582, 589–591), Changes (lines 621–630), "Verified against" (lines
388–389); against D-041, D-040, R1, #406 ("the last whole-document review before the build") and the Tracker
column of `docs/reviews/2026-10-12-design-before-screens-0.2.md`.

D-041: "Every edit inside those three sections moves the line, a typo among them", and a moved line turns R1 red
"until a fresh whole-document review names the earlier one". D-040's exception is one added acceptance block.

Each carried line says "check … against the code and pin it with a test". Several can only end by correcting
the Contract, and the document already knows which way:

- "Verified against" still says `docs/milestones/**` seeded for the template, and the Build map's own line says
  that is what it says; §5 now says the template "is slipway's file: the sync replaces it whole".
- "DS1's printed view, on every run and at exit 0 too" waits on which channel `report()` gives it.
- FO1 (AR-1 above).
- The 0.2 review's Tracker cells for its AR-9 ("one case list", in §4 and Acceptance), AR-14 ("one line each",
  in §1 to §4) and AR-8 ("the view says what satisfied each milestone") are Contract edits in their own words.

So each of steps 2 to 4 either leaves in the Contract a sentence its own pull request showed to be wrong, or
moves `Version:` and is red on R1 until a whole-document review is written. The cap says none is coming, and
nothing in the document says which gives.

Second, where the tracked findings live. The Build map and #406 carry lines for the 0.2 review's AR-1, AR-3 and
AR-6. Its AR-7, AR-8, AR-9, AR-12, AR-13 and AR-14 are assigned to build steps only in that review's Tracker
column, and AR-10 is done. This review supersedes that file, and R1 stops reporting it. A builder working from
#406, which is what `/work-ticket` reads, has no line for six of them.

**Proposed resolution.** Both parts are Build map edits, with no version move. One line under its step for each
of the six, in the form the carried lines have. And one sentence, the owner's to choose, on how a Contract
correction found in the build lands: collected through steps 2 to 4 and made once, as 0.4, in step 4's pull
request, with one review of that revision before the release (a review of a Contract against built code, which
is a different job from the three so far); or a decision that a correction made under a carried line is recorded
in Changes without a review, which amends D-041 and is not a default's to settle.

### AR-5 — `Front end: none` closes an entry's findings too; five readings are not specified

**Where:** F-14, Contract §3 (lines 190–191), §4 (lines 217–218, 228–235), the example entry (lines 167–172).

> A front-end line that says `none` closes every finding but `screens/unknown`

> An entry that excuses nothing is a finding too (`accessibility/entry`)

Read together: in a project whose frame says `none`, a registry entry for a milestone is closed with the rest.
It excuses nothing, and with AR-1's skip in FO1 no check reports it. The same question stands for a frame that
is unrecorded, and for `design/unresolved` under `none`. Readings the check needs and the text leaves open:

1. Whether the three entry findings depend on the front-end state at all.
2. Two entries naming one milestone, one live and one past its day.
3. An entry that is both incomplete and past its day: `accessibility/overdue`, `accessibility/entry`, or both.
4. `design: D-<n>`. The value may be `PD-<n>` or `D-<n>`; the heading it must match is written as `## PD-<n>`
   or `### PD-<n>`. Every project's `decisions.md` holds `## D-005 — Frontend framework *(open — week 1)*`. If
   `design: D-005` resolves, an open stub answers for design.
5. What a reason is. The example's `reason: <what is not held yet, and what will hold it>` is not a placeholder
   to `PLACEHOLDER` (run: no `…`), so an entry copied from the Contract is live. LK1 holds a reason and an
   owner with its own test (`said`); say whether DS1 uses it.

**Proposed resolution.** Build map step 3, one line each and a case for readings 1 and 4: entry findings are
reported whatever the frame says; `D-<n>` resolves only against a heading with that exact id, and whether a
slipway stub may answer is said in one sentence; DS1 holds `reason` and `owner` as LK1 does.

### AR-6 — "The two differ in that argument and nowhere else" is not what the two rules say

**Where:** F-14, Contract §4 "`pnpm status`" (lines 299–310) and "One predicate" (lines 312–320), the row
`design/missing` (line 214), Build map step 3 (lines 569–573).

> DS1 and `ci/status.mjs` both call it, so the two differ in that argument and nowhere else.

DS1 counts a design item in the milestone itself "as item 1 or below started items only". The status bullet
counts "its own item 1". A shaping milestone whose first two items carry their marker and whose third is the
design item gets a line from status under one text and none under the other. Smaller: whether a placeholder
item counts for status is said for DS1 only.

The status cases: four are named. The 0.2 review counted 13 of 21 cases under `ci/fixtures/status/` that pin
their whole `attention` list, with no front-end line in any fixture frame, and "a frame with no front-end line
… is shown too, before any milestone is active". Each of those cases gains a line or a frame edit. The Build
map says "their cases".

**Proposed resolution.** Build map step 3: the own-milestone rule is inside the shared predicate, so both read
"item 1, or below started items only"; the step names the existing status cases that change.

### AR-7 — One design item answers for every later milestone, and any item that starts `Design:` is one

**Where:** F-14, Contract §2 (lines 85–94, 100–105), §4 `design/missing` (line 214), §5 `/kickoff` (line 332),
Known limitations (lines 430–432).

`design/missing` asks for "no design item in a milestone before it". The example item covers "the flows for the
screens in M2 and M3". M4 to M9 pass on it, and `/kickoff`'s readiness question is asked "of M2". Known
limitations says a closed item counts without being read; it does not say that one item is the whole of what
the check asks of a project, ever. Second, the label: `3. Design: the billing schema (F-07)` is a design item
by §2's test, for every milestone after it.

Both follow from D-042 ("One Contents item") and from a check that holds presence. Neither is said.

**Proposed resolution.** For the owner, no version move: one sentence under Known limitations for each. If more
is wanted later, the 0.2 review's AR-8 (the view names which item satisfied each milestone) is where it would
show.

### AR-8 — `accessibility/entry` has seven clauses and one case

**Where:** F-14, Contract §4 the row `accessibility/entry` (line 218), Fixtures (lines 258–266), Controls (lines
282–283), Acceptance (lines 476–483); against L-09 as the document cites it.

The row has seven ways to fire: no reason, no owner, no real day, the milestone has the line, builds no
screens, is shaping or killed, is not a milestone. The fixture list gives "one case per finding id" and adds
none for this id; the acceptance line names four of the seven and ends "(fixture)". A check that reported only
a missing reason passes every case listed. Also without a case: an entry for a milestone under `screens: none`;
an entry under `Front end: none` (AR-5); status not counting a design item in a killed earlier milestone;
`design: D-<n>` against a `## D-<n>` heading (AR-5). This continues the 0.2 review's AR-9, which is tracked to
step 3.

**Proposed resolution.** Build map step 3, with the line AR-4 asks for: one case per clause of
`accessibility/entry`, and the four above.

### AR-9 — Five small things

**Where:** F-14, Seams (lines 393–394), Out of scope (line 601), Contract §3 (lines 145–147) against §4 (lines
228–229), "Verified against" (lines 377–389), the example entry (lines 168–171).

1. Seams says no person is added. An entry names an `owner:`, "who answers for it", and nothing tells that
   person when the day passes: the red reaches whoever runs `pnpm meta` next.
2. Out of scope: "A project's own milestones: each re-plans from the rule, on its next kickoff or sync." §5 has
   the sync write a Gate line, a design item or `design:` into the project's running milestone.
3. The template's bullet says "Delete this line, and set `screens: none`"; §4 says a project with no front end
   needs no `screens:` field. A project with `Front end: none` that follows the bullet sets a field nothing
   asks for.
4. "Verified against: a76c489 2026-10-12" predates 0.3 and does not list what 0.3 builds on:
   `ci/checks/lib/exceptions.mjs`, `ci/checks/lib/clock.mjs`, FO1, LK1, `ci/exceptions.yaml`'s class. Opened in
   this run: they hold, FO1 excepted (AR-1).
5. The example entry's `reason:` and `owner:` are written in angle brackets with no `…`, the form §2 says "is
   not one to any check" (AR-5, reading 5).

**Proposed resolution.** Batch with the first Contract revision, if there is one (AR-4); items 1 and 2 are
outside the versioned sections and can be corrected at any time.
