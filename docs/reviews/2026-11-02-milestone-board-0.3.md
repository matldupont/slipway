# Adversarial review — F-18 milestone board 0.3

Reviewed: dev/features/milestone-board.md @ b01ea1d
Version line: Version: 0.3 (2026-11-02)
Supersedes: docs/reviews/2026-11-02-milestone-board-0.1.md
Supersedes: docs/reviews/2026-11-02-milestone-board-0.2.md
Review date: 2026-11-02
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

b01ea1d is the head of `docs/feature-milestone-board` (PR #604). It adds 0.3 on top of the 0.2 review's commit. This
session did not write or edit the document. Two earlier reviews name this path, and both are superseded.

**This is the last round under the review-loop cap.** Every finding below S1 rides the build step its Blocks column
names (#601–#603); none of them asks for a 0.4. The two S1 findings are the owner's call. AR-1 changes step 1's
Contract and its Acceptance text, which can land in #601's body before it starts. AR-2 changes no doc at all: it is
the four issue bodies.

F-18 has one ID and four numbered Contract sections, so each finding is located by `F-18 §n` (or the section name)
and the line range at b01ea1d.

**What was read.** In full at b01ea1d: the doc, its diff from 0.2 (`42fdb2b..b01ea1d`, which changes only the doc,
`dev/board/specimen.html` and adds the 0.2 review), the 0.2 review, D-055, `docs/reviews/TEMPLATE.md`. In
`dev/features/parallel-plan.md` (F-17 0.3): §5 and its Threat model. In part: `ci/work-order.mjs` (lines 28, 40–77,
108–150), `ci/checks/lib/issue-body.mjs` (its caps and `blockers()`), `dev/features/deferred-checks.md` (F-09's
`Owed:` and `Ran:` grammar, lines 67–82), the `Ran:` lines in `ci/fixtures/`, `.claude/skills/close-milestone/SKILL.md`
(§2, "Prove the gate"), `.claude/skills/work-ticket/SKILL.md` (what a run builds to), `dev/board/specimen.html` (the
gate rows, the header and the footer), `dev/board/design-direction.md` (the gate and the ticks). A search of
`process/lessons/` for `NOT_FOUND`, `issueOrPullRequest` and an embedded Contract found nothing. F2 prints nothing for
this doc. No code changed between 42fdb2b and b01ea1d, so the 0.2 review's check of every Fit and Contract line
reference stands.

**GitHub, read for evidence only** (not a commit, so not reproducible from this file), on 2026-11-02:

- The bodies of #600–#603: each still says `Version 0.1`, and none has `issueOrPullRequest` or `issues closed`. AR-2
  rests on this.
- One read-only GraphQL query on this repository, with `gh api graphql`: `issue(number: 604)`, which is a pull request,
  answers `null` with an error of type `NOT_FOUND`; `issueOrPullRequest(number: 604)` answers `PullRequest`, `OPEN`;
  `issueOrPullRequest` on a number that does not exist answers `null` with `NOT_FOUND`; `gh` exits 1 and still prints
  the data. `realGh()` uses such an answer when every error is `NOT_FOUND` (`ci/work-order.mjs:43`–`:56`). AR-1 rests
  on this.

**The 0.2 review's findings.** 0.3 answers AR-12 (call 2 reads prose-wait and gate numbers) and AR-13 (`issues closed`
is not ticked). Both answers are read hardest here, and AR-1, AR-3, AR-4, AR-5 and AR-6 are about them. Every other 0.2
finding was re-checked against 0.3's text and still holds, since 0.3 does not touch the sections they cite. Each is
carried as one register row (AR-8 to AR-25) with its 0.2 id; the 0.2 review's text and proposed resolution stand for
it, and its section below says only what 0.3 changes and where the lines are now.

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
| AR-1 | The board tells the owner to add `Blocked by: #n` for a pull request or a number not found, and that line then holds the issue for ever | S1 | owner | step 1 (#601) | |
| AR-2 | #600–#603 still embed 0.1, and the cap sends every open finding into build steps that build from those bodies | S1 | owner | steps 1–3 (#601–#603) | |
| AR-3 | `proven` needs a `Ran:` line whose check is the QA plan's path, which F-09's lines never write, so nothing is ever ticked | S2 | author | step 2 (#602) | |
| AR-4 | The four gate states overlap, and a file-only `proven` turns `unproven` whenever GitHub is not read | S2 | author | step 2 (#602) | |
| AR-5 | The new call-2 Acceptance block gives #31 two prose waits and asserts both, so it decides the 0.2 review's AR-8 by fixture | S2 | author | step 1 (#601) | |
| AR-6 | Call 2's new numbers have no cap, and step 1's timed run leaves them out | S3 | author | step 1 (#601) | |
| AR-7 | The specimen's gate drops `unproven`'s words and no longer shows what a tick looks like | S3 | author | step 2 (#602) | |
| AR-8 | (0.2 AR-1, the doc's part) Three 0.1 leftovers: Build map step 1's "open-issue list", the `issues-elsewhere` id, the specimen's "6 elsewhere" | S3 | author | steps 1–3 | |
| AR-9 | (0.2 AR-2) The skip rules miss a wrapped `Verified against:` paragraph, and "level 3 or higher" can end the skip at a `####` | S2 | author | step 1 (#601) | |
| AR-10 | (0.2 AR-3) A closed leaf that still owes a check is counted done, and `owes {check}` can never fire | S2 | author | step 2 (#602) | |
| AR-11 | (0.2 AR-4) After a failed GitHub read, the header's Next and the columns come from different reads; 0.3 adds the gate | S2 | author | step 3 (#603) | |
| AR-12 | (0.2 AR-5) The footer has no defined form with no active milestone or no read, and `other` can go below zero | S3 | author | step 2 (#602) | |
| AR-13 | (0.2 AR-6) The owner's answers that amend F-17 and D-055 are recorded in neither; 0.3 adds two | S3 | author | step 1 (#601) | |
| AR-14 | (0.2 AR-7) The watcher's fallback misses Linux's `ENOSPC`, and a watch error after start is unsaid | S3 | author | step 3 (#603) | |
| AR-15 | (0.2 AR-8) One issue with two prose waits, or two held leaves before the main step, has no defined line | S3 | author | step 1 (#601) | |
| AR-16 | (0.2 AR-9) A branch claim puts a leaf in Running and in Left at once | S2 | author | step 2 (#602) | |
| AR-17 | (0.2 AR-10) A struck-out Contents item is `Not filed` for ever, and the bar can divide by zero | S2 | author | step 2 (#602) | |
| AR-18 | (0.2 AR-11) The time stamps inside `<main>` change the bytes on every read, so the board swaps and drops focus | S2 | author | step 3 (#603) | |
| AR-19 | (0.2 AR-14) Between milestones (latest is `shaping`), the page has no defined state | S2 | author | step 2 (#602) | |
| AR-20 | (0.2 AR-15) §1 says a `gh` failure exits 1; §4 says the board keeps serving | S2 | author | steps 2 and 3 | |
| AR-21 | (0.2 AR-16) The read schedule can starve under steady writes and can trigger itself | S2 | author | step 3 (#603) | |
| AR-22 | (0.2 AR-17) "inside GitHub's GraphQL budget" is stated with no measurement | S2 | author | step 3 (#603) | |
| AR-23 | (0.2 AR-18) D-022's "nothing else of an issue" and `issue-body.mjs`'s "three things" are not amended for prose waits | S3 | author | step 1 (#601) | |
| AR-24 | (0.2 AR-19) Small contradictions and gaps: Next "byte for byte", stacking order, `--out` in the watcher, `you` things in two places, the alias's old flags, between the steps | S3 | author | steps 2 and 3 | |
| AR-25 | (0.2 AR-20) No Acceptance line makes the accessibility claim beyond contrast able to fail | S3 | author | step 3 (#603) | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — The board tells the owner to add `Blocked by: #n` for a pull request or a number not found, and that line then holds the issue for ever

**Where:** F-18 §3, "Prose waits" (lines 209–211) and "States outside the milestone" (lines 217–224); §2, Left
(lines 152–153); Acceptance (lines 367–369); D-055's prose-wait bullet; F-17 §5, call 2 (`parallel-plan.md` line 363);
`ci/work-order.mjs:70`–`:75` and `:131`–`:138`.

0.3 lets a prose wait name a pull request ("since a prose wait often names a pull request") or a number that does not
exist ("A prose wait on a number not found holds"). For both, the fix the board and status print is the one D-055
gives for an issue: the owed text says "Add Blocked by: #{n} to its Links line, or remove the wait.", and Left says
"says it waits on #72 (not found): add Blocked by: #72 or remove the wait", which the new Acceptance block pins word
for word.

Follow that advice and the hold no longer clears. 0.3 reads only prose-wait and gate numbers with
`issueOrPullRequest`; a `Blocked by:` number stays on F-17's call 2, `state stateReason` of an issue
(`issue(number:)`, `ci/work-order.mjs:72`). For a pull request's number, or one that does not exist, GitHub answers
`null` with `NOT_FOUND` (read above), `realGh()` keeps that answer, and the blocker's state is `missing`
(`:134`–`:135`). A leaf is ready only when every blocker is done or dropped (`:138`). So:

- #31 says "after #71" and #71 is an open pull request. The board says add `Blocked by: #71`. The owner does. #71
  merges. #31 is never offered again, and Left says `waits on #71`, which looks true.
- #31 says "after #72" and #72 does not exist (a typo, or another repository's number). The board offers "add Blocked
  by: #72" first. Taken, it holds #31 for ever with no line that says why.

This breaks D-055's "A closed `#n` holds nothing" and §3's own "a closed or merged one holds nothing", in status as
well as the board, since the plan is shared. Escalated to S1 for that reason, and because the Acceptance block makes a
build to the letter ship the advice.

There is a second trap in the same paragraph: a number one leaf names on its `Blocked by:` line and another names in
prose is read in one call with two shapes. If both use work-order's alias `i{n}`, GraphQL refuses the query, and that
error fails the whole read.

**Proposed resolution.** Read every call-2 number, `Blocked by:` ones included, with `issueOrPullRequest`, one alias
per number: an issue keeps `state stateReason`; a pull request is done when merged, dropped when closed unmerged, open
otherwise. Then "add Blocked by: #n" is right for a pull request too. For a number not found, print only "remove the
wait or correct the number", in the owed text and in Left, and change the Acceptance block's quoted text to match. Add
one Acceptance line: #31 says "after #71", the owner adds `Blocked by: #71`, #71 merges, and #31 is offered. This
amends F-17 §5's call 2, so it is recorded with AR-13. Changes §3 and Acceptance: #601.

### AR-2 — #600–#603 still embed 0.1, and the cap sends every open finding into build steps that build from those bodies

**Where:** F-18 Build map (lines 415–431); Changes, the 0.3 line (lines 462–466); slipway's rule "Execution issues
embed the feature doc's Contract"; `/work-ticket` ("Read the issue again: Problem, Acceptance, Contract, Verify", and
the cold reviewer gets the issue's contract "verbatim").

The 0.2 review's AR-1 found the four issues still at 0.1. They still are. 0.3's Changes line says every other 0.2
finding "is fixed in the build step its register's Blocks column names (#601–#603)". A `/work-ticket` run on #601
builds to #601's body, and its cold review checks against the same body. That body has 0.1's §3, with the
`issues(states: OPEN, first: 100) { … nodes { number title } }` read the owner declined under D-050 (0.1 AR-1) and no
call-2 change. #602 has 0.1's gate, where an issue's closing is `proven` and ticked, which the owner declined in 0.3
(0.2 AR-13). Nothing fires to bring the bodies to 0.3: the doc's PR merging checks no issue, and `/work-ticket` does
not compare an embedded version with the doc's. Each answer the owner gave in two review rounds is then built
backwards unless someone remembers. Escalated to S1 because it breaches the embedding rule, and the cap makes the
build the only place the remaining fixes can land.

**Proposed resolution.** No 0.4 is needed. Before #601 starts, rewrite each body from 0.3 (#600 all embedded
sections; #601 §3, its Acceptance, Verify and title; #602 §2, the footer and gate Acceptance blocks; #603 §4's ids and
limitations), each saying `Version 0.3`, and with any answer to AR-1 above in #601. Record that in the doc's Changes.
So the gap cannot reopen, file a follow-up that has `/work-ticket` stop when an issue's embedded `Version` differs
from the feature doc's.

### AR-3 — `proven` needs a `Ran:` line whose check is the QA plan's path, which F-09's lines never write, so nothing is ever ticked

**Where:** F-18 §2, "The gate" (lines 172–180); Acceptance (lines 364–365); F-09's grammar
(`dev/features/deferred-checks.md` lines 67–72); `dev/board/specimen.html` line 129.

0.3 makes `proven` the only ticked state, so whether it can fire now decides whether the gate ever shows a tick. It
fires on "a `Ran: {that path} … pass` line", that path being the gate line's `docs/qa/…` path. F-09 writes `Ran:
{check} — {environment} {yyyy-mm-dd} pass|fail {comment URL}[ · bug #{n}]`, where the check is a name such as
`staging journey "see tomorrow's walks"`. Every example in F-09 and every `Ran:` line in `ci/fixtures/` has a journey
name or a check id there, never a path. So a QA plan that ran and passed still reads `not yet` on the board, which says
the opposite of the record. The specimen's own row is that case: "QA plan docs/qa/export.md, run on staging", `not
yet`. The doc does not say how a check is matched to a path (exact text, substring, or the plan's journeys).

**Proposed resolution.** Say what ties a gate line's QA plan to a run, in F-09's terms. Either the gate line names the
check as its `Owed:`/`Ran:` lines spell it (`Ran: {check} … pass`, exact text), or a QA plan path matches every `Ran:`
line whose check begins with that path. Make the Acceptance fixture a `Ran:` line in F-09's real form. Changes §2 and
Acceptance: #602.

### AR-4 — The four gate states overlap, and a file-only `proven` turns `unproven` whenever GitHub is not read

**Where:** F-18 §2, "The gate" (lines 172–183); Acceptance (lines 364–369).

The four bullets and the paragraph after them do not give one state per line:

- A line that names a QA plan path and a `#n`: "takes its state from its `Ran:` lines alone" (line 175), but "With
  GitHub not read, or a `#n` that is a pull request or is not found, a line naming it is `unproven`" (line 183). With
  a passing run, offline, the first says `proven` and the second `unproven`. `Ran:` lines are files, so the tick would
  come and go with the network, and on every failed read (AR-11).
- A line naming two issues, one closed as completed and one a pull request: `not yet` ("issues not all closed as
  completed") or `unproven` (line 183).
- A line naming an issue closed as not planned or as a duplicate is `not yet` for ever. `not yet` reads as work still
  to come; nothing can move it.

The Acceptance blocks test `issues closed`, `proven` and a prose `unproven`. None tests `not yet`, a pull request
`#n`, an offline read, or a line that names both a path and a `#n`.

**Proposed resolution.** Give the states as an ordered rule, first match wins: a QA plan path decides alone (`proven`
or `not yet`, offline too); else, with no read, `unproven`; else any `#n` that is a pull request, not found, or closed
other than as completed gives `unproven`; else all closed as completed gives `issues closed`; else `not yet`. Add one
Acceptance line per branch. Changes §2 and Acceptance: #602.

### AR-5 — The new call-2 Acceptance block gives #31 two prose waits and asserts both, so it decides the 0.2 review's AR-8 by fixture

**Where:** F-18 Acceptance (lines 367–369); §2, Left (lines 151–154, "Each says why it is not Next"); AR-15 below.

The block's #31 says "after #71" and "after #72". It expects "#31 is held by #71" and Left to say "says it waits on
#72 (not found): …". Left gives one reason per strip. So the block passes only if #72's reason wins over #71's, or if
Left shows both, and the Contract says neither. That is the open question of the 0.2 review's AR-8 (carried as AR-15),
answered by a fixture instead of the Contract. A builder who answers AR-15 by naming every open `#n` in number order
fails this block.

**Proposed resolution.** Answer AR-15 in #601's Contract first, then write the block's Then from that answer: for
example, one owed thing for #31 naming #71 and #72, and Left showing both. Or split the block into two issues, one wait
each. Changes Acceptance: #601.

### AR-6 — Call 2's new numbers have no cap, and step 1's timed run leaves them out

**Where:** F-18 §3, "States outside the milestone" (lines 217–219); Build map step 1 (lines 422–424); F-17's Threat
model, "Bounded" (`parallel-plan.md` lines 591–593); `ci/checks/lib/issue-body.mjs:11` (`BLOCKERS_MAX = 50`).

F-17 bounds every list its read takes and says each cap ("Caps, each said, never silent"). `blockers()` keeps at most
50 numbers. 0.3 adds to call 2 "every number not already read that … a prose wait or a gate line names", and
`proseWaits()` has no cap. One body can name any number of them, and call 2 runs inside the same 5-second, all-or-nothing
budget. Call 2 also used to be skipped on most milestones; with gate numbers it now runs on most reads, a second
round trip after call 1. Step 1 still re-times #541's run "with the open-issue field in the read", not with call 2's
numbers.

**Proposed resolution.** Cap prose-wait numbers per issue (the same 50 as `blockers()`), and say what happens past the
cap: the leaf is held with one line, as `unplannable` does. Add the cap to F-17's "Bounded" line. Re-time step 1's run
with a fixture that has gate and prose-wait numbers outside the milestone. Changes §3 and Build map step 1: #601.

### AR-7 — The specimen's gate drops `unproven`'s words and no longer shows what a tick looks like

**Where:** `dev/board/specimen.html` lines 66–69, 128–130; F-18 §2, "The gate" (lines 172, 180); §4, "The page"
(line 266).

§2 says `unproven` is "shown as `the board cannot check this; /close-milestone does`". The specimen's `unproven` row
shows only the line's text. 0.3 gave `issues closed` its words in the specimen and left `unproven` without its own. §2
also says "Only `proven` is ticked", and neither the doc nor the direction says what a tick is. 0.2's specimen showed
`proven` with `.state.ok`, darker ink; 0.3 removed that row, so `.state.ok` is now unused and the specimen shows no
tick at all. The page follows the specimen (line 266), so a build to it has no tick to copy.

**Proposed resolution.** Add `the board cannot check this; /close-milestone does` to the specimen's `unproven` row.
Add one `proven` row with the tick drawn (a glyph and `.state.ok`), and say in §4 or the direction what the tick is.
Changes the specimen and §4's page line: #602.

### AR-8 — (0.2 AR-1, the doc's part) Three 0.1 leftovers in the doc and the specimen

**Where:** Build map step 1 (line 420), "the open-issue list"; §4 (lines 263–264), the `issues-elsewhere` id;
`dev/board/specimen.html` line 136, "6 elsewhere" with "show the 6".

Unchanged in 0.3, and deferred to the build by the owner. The issue bodies' part of 0.2 AR-1 is AR-2 above. The 0.2
resolution stands. Changes Build map, §4 and the specimen: #601, #602, #603.

### AR-9 — (0.2 AR-2) The skip rules miss a wrapped `Verified against:` paragraph, and "level 3 or higher" can end the skip at a `####`

**Where:** F-18 §3, "Prose waits" (lines 203–207); Acceptance (lines 336–342).

Unchanged in 0.3. The 0.2 resolution stands. Changes §3 and Acceptance: #601.

### AR-10 — (0.2 AR-3) A closed leaf that still owes a check is counted done, and `owes {check}` can never fire

**Where:** F-18 §2, Done and Left (lines 143–154), "Nothing is done without an issue" (lines 159–161).

Unchanged in 0.3. The specimen now shows the case: its gate row "#55 and #56 closed as completed" sits beside "Run the
owed check on item 2 (#56)" (lines 122, 128). The 0.2 resolution stands. Changes §2: #602.

### AR-11 — (0.2 AR-4) After a failed GitHub read, the header's Next and the columns come from different reads; 0.3 adds the gate

**Where:** F-18 §4, "Reads" (lines 232–244); §3, "One Next" (lines 227–228); §2, the gate's last paragraph (lines
182–183); Acceptance (lines 388–390).

0.3 makes it wider. The gate is not a column, so on a failed read it is a "file-read part", re-read now, and every
line naming a `#n` turns `unproven` ("With GitHub not read") until the next good read, beside columns kept from the
last one. The 0.2 resolution stands, with the gate named among the parts kept. Changes §4 and its Acceptance block:
#603.

### AR-12 — (0.2 AR-5) The footer has no defined form with no active milestone or no read, and `other` can go below zero

**Where:** F-18 §2, "No active milestone" (lines 185–188), "The open-issue footer" (lines 190–195).

Unchanged in 0.3. The 0.2 resolution stands. Changes §2: #602.

### AR-13 — (0.2 AR-6) The owner's answers that amend F-17 and D-055 are recorded in neither; 0.3 adds two

**Where:** F-18 §3 (lines 211–213, 217–224); D-055's prose-wait bullet; F-17 §5, call 2.

0.3's diff changes no line of `decisions.md` or F-17. Besides the 0.1 AR-7 sort order, two more answers now sit only in
F-18: call 2 reads prose-wait and gate numbers with `issueOrPullRequest` (an amendment of F-17 §5's call 2), and "A
prose wait on a number not found holds", which goes past D-055's "waits on an open `#n`". The 0.2 resolution stands,
with both added to D-055's bullet and F-17's note, and AR-1's answer with them. Changes no Contract: #601's
acceptance.

### AR-14 — (0.2 AR-7) The watcher's fallback misses Linux's `ENOSPC`, and a watch error after start is unsaid

**Where:** F-18 §4, "Reads" (lines 237–240).

Unchanged in 0.3. The 0.2 resolution stands. Changes §4: #603.

### AR-15 — (0.2 AR-8) One issue with two prose waits, or two held leaves before the main step, has no defined line

**Where:** F-18 §2, Left (lines 152–153); §3, "Prose waits" (lines 208–215).

Unchanged in the Contract; AR-5 above shows a 0.3 Acceptance block now depends on it. The 0.2 resolution stands.
Changes §2 and §3: #601, #602.

### AR-16 — (0.2 AR-9) A branch claim puts a leaf in Running and in Left at once

**Where:** F-18 §2, Running and Left (lines 145–154).

Unchanged in 0.3. The 0.1 resolution stands. Changes §2: #602.

### AR-17 — (0.2 AR-10) A struck-out Contents item is `Not filed` for ever, and the bar can divide by zero

**Where:** F-18 §2, Left, "Nothing is done without an issue" and "Item text" (lines 151, 159–165).

Unchanged in 0.3. The 0.1 resolution stands. Changes §2 and §3: #601, #602.

### AR-18 — (0.2 AR-11) The time stamps inside `<main>` change the bytes on every read, so the board swaps and drops focus

**Where:** F-18 §2 (`readAt, githubAt`, line 135); §4 (lines 252–264); Known limitations (line 305);
`dev/board/specimen.html` line 80.

Unchanged in 0.3. The 0.1 resolution stands, the pause control for WCAG 2.2.2 included. Changes §2 and §4: #602,
#603.

### AR-19 — (0.2 AR-14) Between milestones (latest is `shaping`), the page has no defined state

**Where:** F-18 §2, "No active milestone" (lines 185–188).

Unchanged in 0.3. The 0.1 resolution stands. Changes §2: #602.

### AR-20 — (0.2 AR-15) §1 says a `gh` failure exits 1; §4 says the board keeps serving

**Where:** F-18 §1 (lines 117–118); §4, "Reads" (lines 232–243); F-17 §10.

Unchanged in 0.3. The 0.1 resolution stands. Changes §1 and §4: #602, #603.

### AR-21 — (0.2 AR-16) The read schedule can starve under steady writes and can trigger itself

**Where:** F-18 §4, "Reads" (lines 235–238).

Unchanged in 0.3. The 0.1 resolution stands. Changes §4: #603.

### AR-22 — (0.2 AR-17) "inside GitHub's GraphQL budget" is stated with no measurement

**Where:** F-18 Known limitations (lines 298–299); Build map step 1 (lines 422–424).

Unchanged in 0.3; AR-6 above adds call 2's numbers to what is read each time. The 0.1 resolution stands. Changes Build
map (not the Contract): #601's acceptance.

### AR-23 — (0.2 AR-18) D-022's "nothing else of an issue" and `issue-body.mjs`'s "three things" are not amended for prose waits

**Where:** F-18 §3 (lines 201–207); D-022; D-055; `ci/checks/lib/issue-body.mjs` lines 1–2.

Unchanged in 0.3. The 0.1 resolution stands. Changes §3: #601.

### AR-24 — (0.2 AR-19) Small contradictions and gaps

**Where:** F-18 §1–§4 and Acceptance, as the 0.1 review's items say.

Unchanged in 0.3, item by item: Next "byte for byte" (line 350); Waiting on you first when stacked (line 268); `--out`
in the watcher's ignore list (line 238); `you` things in Next and in Waiting on you (lines 148–150, 167–170); the
alias's old flags (lines 111, 116), F-07's `--serve` included; and what `pnpm board` does between steps 2 and 3. The
0.1 resolutions stand. Changes §1, §2 and §4: #602, #603.

### AR-25 — (0.2 AR-20) No Acceptance line makes the accessibility claim beyond contrast able to fail

**Where:** F-18 §4, "The page" (lines 266–269); Acceptance (lines 399–400); Verify (line 412).

Unchanged in 0.3: the Verify line still runs a script outside the repository. The 0.1 resolution stands. Changes §4
and Verify: #603.
