# Adversarial review — F-18 milestone board 0.2

Reviewed: dev/features/milestone-board.md @ 42fdb2b
Version line: Version: 0.2 (2026-11-02)
Supersedes: docs/reviews/2026-11-02-milestone-board-0.1.md
Review date: 2026-11-02
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

42fdb2b is the head of `docs/feature-milestone-board` (PR #604). It adds 0.2 on top of the 0.1 review's commit. This
session did not write or edit the document. One earlier review names this path, the 0.1 review, and it is superseded.

F-18 has one ID and four numbered Contract sections, so each finding is located by `F-18 §n` (or the section name)
and the line range at 42fdb2b.

**What was read.** In full at 42fdb2b: the doc, its diff from 0.1 (`877c461..42fdb2b`), the 0.1 review, D-055,
`dev/board/design-direction.md`, `docs/reviews/TEMPLATE.md`. In `dev/features/parallel-plan.md` (F-17 0.3): the
Contract §1–§3, §5–§8 and §10, and this branch's note in its Open questions. In part: `dev/board/specimen.html` (the
`<main>` boundary, header and footer), `ci/work-order.mjs` (lines 29, 91–135, 191, 254–285, 286, 308, 345),
`ci/checks/lib/markdown.mjs` (exports, lines 63 and 161), `ci/checks/lib/html.mjs`, `ci/checks/lib/clock.mjs` and
`ci/checks/lib/milestones.mjs` (exports, `clock`), `ci/checks/lib/issue-body.mjs` (header and exports), `package.json`
(scripts), `dev/features/work-order.md` (lines 160–163, 327–330), `docs/product/FRAME.md` (slipway's own is the
template, so the question was read as `SLIPWAY.md`'s thesis and D-016; the doc serves both). F2 prints nothing for this
doc. A search of `process/lessons/` for watch, poll, reload, `ETag` and prose found no lesson about this feature's
mechanisms.

**Fit and Contract line references.** Each was checked at 42fdb2b and holds: `collect()` `:91`, `render()` `:191`,
`parseArgs()` `:254`, `writeAtomic()` `:286`, `serve()` `:308`, `keepFresh()` `:345`, `PICKS = 3` `:29`, `plain()` on
item text `:105`, `blockers()` `:117`, leaves per item `:121`–`:128`, `plain()` at `markdown.mjs:161`, `section()` in
`markdown.mjs` (`:63`), `escapeShown()` in `html.mjs`, `today()` and `zone()` in `clock.mjs` (`CHECK_NOW` is the
environment variable it reads), `readMilestoneModel()`'s `clock` (`day`, `of`, `overrun`), `status` and `work-order`
at `package.json:24` and `:25`, no `<script>` at `work-order.md:162`, `--serve` at `:329`. `plain()` also drops link
syntax, so "nothing else" in the Fit is loose; its point (it leaves `~~`) holds. `plan.mjs`, `owed.mjs` and
`github-state.mjs` are not in the reviewed commit; the doc says so, and they were checked against F-17 0.3's Contract.

**GitHub, read for evidence only** (not a commit, so not reproducible from this file): the bodies of #600–#603 on
2026-11-02. Each still says `Version 0.1` and embeds 0.1's Contract; their embedded Contract's sub-sections are `####`
headings; their Acceptance blocks are fenced. AR-1 and AR-2 rest on this.

**The 0.1 review's findings.** 0.2 answers AR-1, AR-6 and AR-7. AR-14 goes with AR-1's answer: the footer is counts
only, so "100 or more" and "which 100" no longer apply, and §2 now counts an item's own issue as on the milestone.
Every other 0.1 finding was re-checked against 0.2's text and still holds. Each is carried here as one register row
(AR-9 to AR-20) with its 0.1 id; the 0.1 review's full text and proposed resolution stand for it, and its section
below says only what 0.2 changes.

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
| AR-1 | The build issues #600–#603 still embed 0.1's Contract, including the title-reading field AR-1 of 0.1 removed | S2 | author | steps 1–3 (#601–#603) | |
| AR-2 | The new skip rules miss a wrapped `Verified against:` paragraph, and "level 3 or higher" can end the skip at the embedded Contract's first `####` | S2 | author | step 1 (#601) | |
| AR-3 | A closed leaf that still owes a check is counted done, and Left's `owes {check}` reason can never fire | S2 | author | step 2 (#602) | |
| AR-4 | After a failed GitHub read, the header's Next and the columns come from different reads, and "file-read parts" is undefined | S2 | author | step 3 (#603) | |
| AR-5 | The footer has no defined form with no active milestone or no read, and `other` can go below zero | S3 | author | step 2 (#602) | |
| AR-6 | The owner's AR-7 answer amends F-17 §3 but is recorded in neither D-055 nor F-17's note | S3 | author | step 1 (#601) | |
| AR-7 | The watcher's fallback misses Linux's `ENOSPC`, and a watch error after start is unsaid | S3 | author | step 3 (#603) | |
| AR-8 | One issue with two prose waits, or two held leaves before the main step, has no defined line | S3 | author | step 1 (#601) | |
| AR-9 | (0.1 AR-2) A branch claim puts a leaf in Running and in Left at once | S2 | author | step 2 (#602) | |
| AR-10 | (0.1 AR-3) A struck-out Contents item is `Not filed` for ever, and the bar can divide by zero | S2 | author | step 2 (#602) | |
| AR-11 | (0.1 AR-4) The time stamps inside `<main>` change the bytes on every read, so the board swaps and drops focus at least every 30 seconds | S2 | author | step 3 (#603) | |
| AR-12 | (0.1 AR-5) A prose wait on an issue the read does not fetch has no state | S2 | author | step 1 (#601) | |
| AR-13 | (0.1 AR-8) `proven` on a gate line rests on an issue's closing, which proves nothing about the line | S2 | owner | step 2 (#602) | |
| AR-14 | (0.1 AR-9) Between milestones (latest is `shaping`), the page has no defined state | S2 | author | step 2 (#602) | |
| AR-15 | (0.1 AR-10) §1 says a `gh` failure exits 1; §4 says the board keeps serving | S2 | author | steps 2 and 3 | |
| AR-16 | (0.1 AR-11) The read schedule can starve under steady writes and can trigger itself | S2 | author | step 3 (#603) | |
| AR-17 | (0.1 AR-12) "inside GitHub's GraphQL budget" is stated with no measurement | S2 | author | step 3 (#603) | |
| AR-18 | (0.1 AR-13) D-022's "nothing else of an issue" and `issue-body.mjs`'s "three things" are not amended for prose waits | S3 | author | step 1 (#601) | |
| AR-19 | (0.1 AR-15) Small contradictions and gaps: Next "byte for byte", stacking order, `--out` in the watcher, `you` things in two places, the alias's old flags, between the steps | S3 | author | steps 2 and 3 | |
| AR-20 | (0.1 AR-16) No Acceptance line makes the accessibility claim beyond contrast able to fail | S3 | author | step 3 (#603) | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — The build issues #600–#603 still embed 0.1's Contract, including the title-reading field AR-1 of 0.1 removed

**Where:** F-18 Build map (lines 397–413); §2 "The open-issue footer" (lines 184–189); §3 "Prose waits" and "The
open-issue count" (lines 195–212); §4 the `<details>` ids (lines 249–250); Changes (lines 440–443); the slipway rule
"Execution issues embed the feature doc's Contract".

0.2 changed §2, §3, Known limitations, Acceptance and Verify. None of the four issues was updated. Each says
`Version 0.1`. #600 and #601 embed 0.1's §3: the read gains `issues(states: OPEN, first: 100) { totalCount nodes {
number title } }`, and the prose-wait skip is 0.1's ("outside fenced code, inline code and the `Blocked by:` segment of
`### Links`"). #600 and #602 embed 0.1's footer, `elsewhere: [{ n, title }]`, and its Acceptance block "the footer
lists it under elsewhere". #603 embeds the `issues-elsewhere` id and the limitation "At most 100 open issues listed". A
`/work-ticket` run on #601 builds the field the owner declined as a breach of D-050. Nothing fires to bring the issues
in step: the Changes line names the answers, not the issues, and #604 merging does not check them.

0.2 also leaves 0.1 text in the doc itself:

- Build map step 1 (line 402): "**The plan gains prose waits, the open-issue list and one Next**". It is a count now.
- §4 (lines 249–250): the fixed ids include `issues-elsewhere`, but 0.2's footer has no `<details>`.
- `dev/board/specimen.html` line 136, which §4 says the page follows: "6 elsewhere" with a `<details>` "show the 6".

**Proposed resolution.** Fix the three leftovers in the doc. Then update each issue body to the version this review's
answers produce, in the same change that bumps the doc: #600 (all embedded sections), #601 (§3, its Acceptance, its
Verify and its title), #602 (§2's footer, its footer Acceptance block, the model's `issues` line), #603 (§4's ids, the
limitation line). Record in the Changes line that the issues were brought to that version.

### AR-2 — The new skip rules miss a wrapped `Verified against:` paragraph, and "level 3 or higher" can end the skip at the embedded Contract's first `####`

**Where:** F-18 §3, "Prose waits" (lines 197–202); Acceptance (lines 322–324).

0.2 skips "every line that starts `Verified against:`". The house format wraps that paragraph. F-18's own runs from
line 89 to line 95, and the phrase that started AR-6 of 0.1, "the build re-reads them after #542 merges", sits on line
95, which does not start `Verified against:`. Inside an embedded Contract the section rule skips it anyway. In an
issue's own text, a wrapped `Verified against:` paragraph (L-18 asks for one before building on a code-state claim)
still holds the issue on its second line.

0.2 also skips "the embedded `### Contract` and `### Verify` sections, each up to the next heading of level 3 or
higher". The embedded Contract's own sections are `####` headings (#600 lines 111, 125, 193, 214). Read as a larger
level number, "higher" ends the skip at `#### §1` and reads every Contract section after it as the issue's own text,
which is AR-6 of 0.1 again. Both Acceptance fixtures pass under either reading: "only in a Verified against line" can
be one line, and "inside its embedded Contract" can have no sub-heading.

**Proposed resolution.** Skip the paragraph that starts `Verified against:`, up to the next blank line. Write the
section end as "the next heading of `#`, `##` or `###`". Make the Acceptance fixture the shape the issues have: a
wrapped `Verified against:` paragraph with the phrase on its second line, and an embedded Contract with `####`
sub-headings and the phrase under one of them. Changes §3 and Acceptance: #600 and #601.

### AR-3 — A closed leaf that still owes a check is counted done, and Left's `owes {check}` reason can never fire

**Where:** F-18 §2, Done and Left (lines 143–154), "Nothing is done without an issue" (lines 159–161).

Done takes a leaf "closed as completed". Left takes "every other open leaf", with the reason `owes {check}`. An owed
check (F-09) is "a check moved to after merge", so it belongs to an issue that is already closed. F-07 shows it on
the item's row "whatever the issue's state" (`ci/work-order.mjs:127`–`:128`). Under F-18 that leaf is in Done and
counted done by the rail, while the milestone cannot close. The `owes {check}` reason applies only to an open leaf,
which an after-merge check does not have, so it never fires. The owed-check thing still shows in Next or Left as an
owed pick, so the work is visible; the leaf's own strip and the bar say the opposite.

**Proposed resolution.** A closed leaf that owes a check is in Left with `owes {check}`, and is not counted done until
the check has a `Ran: … pass` line. Add an Acceptance line: a closed leaf with an owed check is in Left and the bar is
below 100%. Changes §2: #600 and #602.

### AR-4 — After a failed GitHub read, the header's Next and the columns come from different reads, and "file-read parts" is undefined

**Where:** F-18 §4, "Reads" (lines 218–230); §3 "One Next" (lines 213–214); Acceptance (lines 370–372); D-055's
"Declined: reusing a GitHub answer across the board's reads".

On a failed read, "the columns stay those of the last good read" and "the files are re-read now". The header prints
`statusModel(root, read)`'s `next`. With the failed read, `read` is `null`, so status's Next is the offline one (F-17
§3: shape the first unstarted item). The header then says "Shape item 4" over a Next column that offers #15 from the
last good read. With no good read yet, "nothing is offered", but the header may still offer shaping.

The Acceptance block says "file-read parts are current", and the doc never says which parts those are. Waiting on you
mixes owed things from files with §6 kinds from GitHub (`merge`, `red-check`). The gate's `proven` reads issue states.
The rail's done count and the footer's counts are GitHub's. §4 also says "No answer of GitHub is reused across reads",
yet keeps columns built from an earlier answer. Keeping a rendered part is defensible, but the doc should say it is the
part that is kept, not the read.

**Proposed resolution.** On a failed read, keep the whole page of the last good read and change only the `#live` line
and the failure line; the files are read again at the next good read. If the owner wants file parts current, list the
parts by name (Contents text, the owed things from files, the clock) and say the header's Next is the last good read's.
Either way, say a kept page is not a reused answer. Changes §4 and its Acceptance block: #600 and #603.

### AR-5 — The footer has no defined form with no active milestone or no read, and `other` can go below zero

**Where:** F-18 §2, "No active milestone" (lines 179–182), "The open-issue footer" (lines 184–189).

- With no active milestone, the page shows "the open-issue footer", but its form is `{onMilestone} on {id}`, and
  there is no active `{id}`.
- With GitHub not read, `issues` has no counts, and the footer's form is unsaid.
- `onMilestone` counts "its items' issues and their sub-issues", and `other` is `open − onMilestone`. GitHub allows a
  sub-issue from another repository, which counts in `onMilestone` but not in this repository's `totalCount`. `other`
  then goes below zero, and "`onMilestone + other = open` always" holds only as arithmetic.
- An issue reached from two items (§2, "An issue appears once") must be counted once; the count rule does not say so.
  An item with more than 50 sub-issues (`unplannable`) undercounts.

**Proposed resolution.** Count `onMilestone` as the distinct open issues of this repository that the milestone reaches.
With no active milestone, print `{open} open issues in {repo}` and the link. With no read, print no footer, or
`open issues not read`. Add an Acceptance line for an issue under two items. Changes §2: #600 and #602.

### AR-6 — The owner's AR-7 answer amends F-17 §3 but is recorded in neither D-055 nor F-17's note

**Where:** F-18 §3 (lines 205–207); D-055's prose-wait bullet; F-17's Open questions, the line this branch adds.

§3 says the hold "sorts after every ready leaf and before shaping … this amends F-17 §3's 'sorts after the rank-1 owed
things' for this kind only", citing "the owner, AR-7". D-055 says nothing of the order. F-17's new note names D-055's
readiness rule and says nothing of the order either. Slipway's rule is to record decisions in `decisions.md` when they
are made, and a decision that changes a feature names it. A reader of F-17 §3 or D-055 sees a sort the code breaks.

**Proposed resolution.** Add one sentence to D-055's prose-wait bullet: a hold sorts after every ready build, the owner
on the 0.1 review's AR-7. Extend F-17's note to say so. No Contract change.

### AR-7 — The watcher's fallback misses Linux's `ENOSPC`, and a watch error after start is unsaid

**Where:** F-18 §4, "Reads" (lines 224–227).

"Where the watch cannot start (`ERR_FEATURE_UNAVAILABLE_ON_PLATFORM`, `EMFILE`), the 30-second read stands alone". On
Linux, a recursive `fs.watch` places one inotify watch per directory under the root. `node_modules/` is in it:
ignoring a path filters its events, not its watches. When the system's watch limit is reached, the error is `ENOSPC`,
which is not in the list. A watcher can also emit `'error'` after it started, when a watched folder goes away; with no
listener, that ends the server. The doc does not say what the board does then.

**Proposed resolution.** Fall back on any error from starting the watch, and on any `'error'` event after it, to the
30-second read, with the header's `files: read every 30 seconds`. Add an Acceptance line with a fake watcher that
throws at start and one that emits `'error'` later. Changes §4: #600 and #603.

### AR-8 — One issue with two prose waits, or two held leaves before the main step, has no defined line

**Where:** F-18 §2, Left (lines 152–153); §3, "Prose waits" (lines 202–209).

The owed thing's text and Left's reason each name one `#{n}`. An issue whose text says it waits on #30 and on #31 has
two waits. The doc does not say whether that is two owed things (one key per pair) or one line naming both. The Next
line ends with `#{m} is held: …` "when the held leaf comes before the main step". With two held leaves before it, the
doc does not say which one is named. With a Next line already at four sentences, a fifth breaks F-16's form, and "within
F-16's form" does not say what gives.

**Proposed resolution.** One owed thing per held issue, naming every open `#n` it waits on, in number order. The Next
sentence names the first held leaf in plan order and adds `and {k} more` for the rest. When the sentence would break
the form, it is left out, and the owed line still shows. Changes §2 and §3: #600, #601, #602.

### AR-9 — (0.1 AR-2) A branch claim puts a leaf in Running and in Left at once

**Where:** F-18 §2, Running and Left (lines 145–154).

Unchanged in 0.2. F-17 §5 is explicit: "A claimed leaf is in progress, as one with an open pull request is." So Left's
`claimed by a branch` contradicts F-17 as well as F-18's own Running. The 0.1 resolution stands. Changes §2: #600 and
#602.

### AR-10 — (0.1 AR-3) A struck-out Contents item is `Not filed` for ever, and the bar can divide by zero

**Where:** F-18 §2, Left, "Nothing is done without an issue" and "Item text" (lines 151, 159–165).

Unchanged in 0.2. The 0.1 resolution stands. Changes §2 and §3: #600, #601, #602.

### AR-11 — (0.1 AR-4) The time stamps inside `<main>` change the bytes on every read, so the board swaps and drops focus at least every 30 seconds

**Where:** F-18 §2 (`readAt, githubAt`, line 135); §4 (lines 238–250); Known limitations (line 291);
`dev/board/specimen.html` line 80.

Unchanged in 0.2: the specimen still puts `Updated 14:32:05 · GitHub read 14:32:01 · live` inside `<main>`. The 0.1
resolution stands, the pause control for WCAG 2.2.2 included. Changes §2 and §4: #600, #602, #603.

### AR-12 — (0.1 AR-5) A prose wait on an issue the read does not fetch has no state

**Where:** F-18 §3, "Prose waits" (lines 202–203, 209–210); F-17 §5, "What is read", call 2.

0.2 makes this sharper. 0.1's open-issue list could at least name the first 100 open issues; 0.2's count names none.
F-17's call 2 reads the `Blocked by` issues not already read, and §3 adds no prose-wait numbers to it. So for a wait on
an issue outside the milestone, the read cannot tell open from closed, and "a closed one holds nothing" has no input.
The 0.1 resolution stands: call 2 reads `state stateReason` for prose-wait numbers too, inside the same call and budget.
Changes §3: #600 and #601.

### AR-13 — (0.1 AR-8) `proven` on a gate line rests on an issue's closing, which proves nothing about the line

**Where:** F-18 §2, "The gate" (lines 172–177); Acceptance (lines 350–351).

Unchanged in 0.2. A gate `#n` outside the milestone also has no state in the read (AR-12). The 0.1 resolution stands.
Changes §2: #600 and #602.

### AR-14 — (0.1 AR-9) Between milestones (latest is `shaping`), the page has no defined state

**Where:** F-18 §2, "No active milestone" (lines 179–182).

Unchanged in 0.2. AR-5 adds the footer's form to the same gap. The 0.1 resolution stands. Changes §2: #600 and #602.

### AR-15 — (0.1 AR-10) §1 says a `gh` failure exits 1; §4 says the board keeps serving

**Where:** F-18 §1 (lines 117–118); §4, "Reads" (lines 228–230); F-17 §10, "The failure rule" and "The read".

Unchanged in 0.2. F-17 §10 still says "exit 1 naming `gh auth status` … nothing is written" and "with no 5-second
limit (the page is run by hand)"; F-18 §4 still puts the board under the 5-second budget without saying it amends
that. The 0.1 resolution stands. Changes §1 and §4: #600, #602, #603.

### AR-16 — (0.1 AR-11) The read schedule can starve under steady writes and can trigger itself

**Where:** F-18 §4, "Reads" (lines 221–225).

Unchanged in 0.2. AR-7 adds the watcher's failure path to the same section. The 0.1 resolution stands. Changes §4:
#600 and #603.

### AR-17 — (0.1 AR-12) "inside GitHub's GraphQL budget" is stated with no measurement

**Where:** F-18 Known limitations (lines 284–285); Build map step 1 (lines 405–407).

Unchanged in 0.2. Step 1 still re-times the read and does not cost it. The 0.1 resolution stands. Changes Build map
step 1 (not the Contract): #601's acceptance.

### AR-18 — (0.1 AR-13) D-022's "nothing else of an issue" and `issue-body.mjs`'s "three things" are not amended for prose waits

**Where:** F-18 §3 (lines 195–203); D-022; D-055; `ci/checks/lib/issue-body.mjs` lines 1–2.

Unchanged in 0.2. F-17 §5 adds a second rule to amend: "Nothing else of a body … reaches status." §3 does not say
whether the child runs `proseWaits()` and passes numbers, or passes bodies to status. The 0.1 resolution stands. Add one
sentence to §3: the child returns the prose-wait numbers per leaf, never the body. Changes §3: #600 and #601.

### AR-19 — (0.1 AR-15) Small contradictions and gaps

**Where:** F-18 §1–§4 and Acceptance, as the 0.1 review's items say.

Unchanged in 0.2, item by item: Next "byte for byte" (line 336); Waiting on you first when stacked (line 254) against
the direction's "Next first"; `--out` in the watcher's ignore list (line 224); `you` things in Next and in Waiting on
you (lines 148–150, 167–170); the alias's old flags (lines 111, 116), now including F-07's `--serve`
(`ci/work-order.mjs:261`); and what `pnpm board` does between steps 2 and 3. The 0.1 resolutions stand. Changes §1,
§2 and §4: #600, #602, #603.

### AR-20 — (0.1 AR-16) No Acceptance line makes the accessibility claim beyond contrast able to fail

**Where:** F-18 §4, "The page" (lines 252–255); Acceptance (lines 381–382); Verify (line 394).

Unchanged in 0.2: the Verify line still runs `node ~/.claude/skills/ui-craft/scripts/check-ui.mjs`, a path outside
the repository. The 0.1 resolution stands. Changes §4 and Verify: #600 and #603.
