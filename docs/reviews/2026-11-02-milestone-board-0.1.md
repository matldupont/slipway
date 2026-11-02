# Adversarial review — F-18 milestone board 0.1

Reviewed: dev/features/milestone-board.md @ 877c461
Version line: Version: 0.1 (2026-11-02)
Review date: 2026-11-02
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

877c461 is the head of `docs/feature-milestone-board` (PR #604). It adds F-18, D-055, `dev/board/` and one Changes-style
line each to F-07's and F-17's docs on top of `main` at 0820023. This session did not write or edit the document. No
earlier review names this path, so nothing is superseded.

F-18 has one ID and four numbered Contract sections, so each finding is located by `F-18 §n` (or the section name)
and the line range at 877c461.

**What was read.** In full at 877c461: the doc, D-055 and its diff against `main`, `dev/board/design-direction.md`,
`docs/reviews/TEMPLATE.md`. In `decisions.md`: D-017, D-022, D-023, D-050. In `dev/features/parallel-plan.md` (F-17 0.3):
§1–§3, §5–§8 and §10. In part: `dev/board/specimen.html` (the `<main>` boundary and header), `ci/work-order.mjs`
(lines 29, 91, 103–129, 191, 254, 286, 308, 345), `ci/checks/lib/markdown.mjs` (lines 158–163),
`ci/checks/lib/milestones.mjs` (statuses, `clock`), `ci/checks/lib/issue-body.mjs` (its header), `package.json`
(scripts), `dev/features/template-sync.md` (the `package.json` row). Searches at 877c461: `git grep` for `work-order`
outside the feature docs (no skill, hook or status line runs `pnpm work-order`), `~~` in the milestone and markdown
readers (none), and the prose-wait phrases in `.github/ISSUE_TEMPLATE`, `process/intake.md` and `.claude/skills`.
F2 passes for this doc. Slipway's own `docs/product/FRAME.md` is the template, so the question was read as
`SLIPWAY.md`'s thesis and D-016; the doc serves both, and no finding is about the question itself.

Every Fit and Contract line reference to `main` was checked and holds: `collect()` `:91`, `render()` `:191`,
`parseArgs()` `:254`, `writeAtomic()` `:286`, `serve()` `:308`, `keepFresh()` `:345`, `PICKS = 3` `:29`, `plain()` on item
text `:105`, `blockers()` `:117`, leaves per item `:121`–`:128`, `plain()` at `markdown.mjs:161`, `work-order` at
`package.json:25`. `ci/checks/lib/plan.mjs`, `owed.mjs` and `github-state.mjs` are not in the reviewed commit; the doc
says so and defers to F-17 0.3, so they were checked against F-17's Contract.

**One read of GitHub, for evidence only** (not a commit, so not reproducible from this file): the open issues of
`matldupont/slipway` on 2026-11-02, matched with §3's phrase list outside fenced and inline code and the `Blocked by:`
segment. 16 of 71 open issues match a phrase. Of those, only #600–#603 point at an open issue (#542), each through
F-18's own embedded Contract text. AR-6 rests on this.

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
| AR-1 | The open-issue list reads and lists everyone's issue titles in D-050's read, and no decision says so | S1 | owner | step 1 (#601) | |
| AR-2 | A branch claim puts a leaf in Running and in Left at once | S2 | author | step 2 (#602) | |
| AR-3 | A struck-out Contents item is `Not filed` for ever, and the bar can divide by zero | S2 | author | step 2 (#602) | |
| AR-4 | The time stamps inside `<main>` change the bytes on every read, so the board swaps and drops focus at least every 30 seconds | S2 | author | step 3 (#603) | |
| AR-5 | A prose wait on an issue the read does not fetch has no state | S2 | author | step 1 (#601) | |
| AR-6 | Prose waits fire on the embedded Contract, and `### Links` is not unique in an issue that embeds one | S2 | author | step 1 (#601) | |
| AR-7 | A rank-1 `prose-wait` line sorts ahead of every ready build in In parallel | S2 | owner | step 1 (#601) | |
| AR-8 | `proven` on a gate line rests on an issue's closing, which proves nothing about the line | S2 | owner | step 2 (#602) | |
| AR-9 | Between milestones (latest is `shaping`), the page has no defined state | S2 | author | step 2 (#602) | |
| AR-10 | §1 says a `gh` failure exits 1; §4 says the board keeps serving | S2 | author | steps 2 and 3 | |
| AR-11 | The read schedule can starve under steady writes and can trigger itself | S2 | author | step 3 (#603) | |
| AR-12 | "inside GitHub's GraphQL budget" is stated with no measurement | S2 | author | step 3 (#603) | |
| AR-13 | D-022's "nothing else of an issue" and `issue-body.mjs`'s "three things" are not amended for prose waits | S3 | author | step 1 (#601) | |
| AR-14 | The footer's `100 or more` contradicts an exact `totalCount`, and which 100 is unsaid | S3 | author | step 2 (#602) | |
| AR-15 | Small contradictions and gaps: Next "byte for byte", stacking order, `--out` in the watcher, `you` things in two places, the alias's old flags, the hand-run check | S3 | author | steps 2 and 3 | |
| AR-16 | No Acceptance line makes the accessibility claim beyond contrast able to fail | S3 | author | step 3 (#603) | |

## Findings

### AR-1 — The open-issue list reads and lists everyone's issue titles in D-050's read, and no decision says so

**Where:** F-18 §3, "The open-issue list" (lines 204–206); §2, "The open-issue footer" (lines 185–187); D-055; D-050.

§3 adds to the shared read `repository { issues(states: OPEN, first: 100) { totalCount nodes { number title } } }`,
and §2 lists the issues no item reaches by number and title on the board. D-050 sets what that read reads ("the active
milestone's issues and the `needs-shape` issues, the owner's own open pull requests and the remote branches") and
states a principle: "Only the owner's own pull requests, and the `needs-shape` issues the owner opened, are listed or
steer the plan; everyone else's are counted, never read for paths or text." The new field reads the title of every
open issue, anyone's, through that read, and the footer lists them. D-055's four bullets do not mention the list, and
its `Amends:` line names no decision. The doc keeps titles out of status's output, which honours F-17 §7, but not
D-050's scope or its "never read for text".

Escalated from S2 because it breaches a stated principle of a decided read with no decision recorded.

**Proposed resolution.** Either (a) the owner records the extension in D-055 (a bullet: the read gains every open
issue's number and title, for the board's footer only; status reads `totalCount` alone) with D-050 named on its
`Amends:` line; or (b) the footer prints counts only (`{open} open · {onMilestone} on {id} · {k} elsewhere`) and links
to GitHub's issue list, so no title outside the milestone is read. (b) keeps D-050 as it is. Either changes §3 and
§2, so #600, #601 and #602 need their embedded Contract updated.

### AR-2 — A branch claim puts a leaf in Running and in Left at once

**Where:** F-18 §2, Running and Left (lines 146–155).

Running holds a leaf when "the owner's open pull request closes or is part of it, or a branch claims it". Left's fixed
reasons include `claimed by a branch`. "Every leaf is in exactly one column" cannot hold for a claimed leaf with no pull
request: both rules take it. F-17 §5 gives a likely intent (a *quiet* claim gets a `stale-claim` line), but F-18 never
says so. The precedence between other states is unsaid too: a closed-as-completed leaf with an open `Part of #n` pull
request of the owner's is Done by one rule and Running by the other. The first Acceptance block ("leaves done, dropped,
in a PR, claimed …") cannot fail until the rule is one.

**Proposed resolution.** Give the columns an order of precedence (Done, then Running, then Next, then Left) and say a
claimed leaf is Running, with `claimed by a branch` moved into Running's strip text, or Left keeping it only for a quiet
claim (`stale: resume or delete the branch`). Add an Acceptance line for a closed leaf with an open `Part of` pull
request. Changes §2: #600 and #602.

### AR-3 — A struck-out Contents item is `Not filed` for ever, and the bar can divide by zero

**Where:** F-18 §2, Left, "Nothing is done without an issue" and "Item text" (lines 152, 160–166).

The doc fixes F-07's raw `~~x~~` by rendering it struck: "A struck-through item is shown struck, as the owner wrote
it." Striking an item is how the owner cuts it. But Left takes "every Contents item with no issue yet (`Not filed:
/log-feature {id}#{k}`)", and the bar is `done ÷ (leaves − dropped + items with no issue)`. A struck item with no
issue is therefore offered for shaping in Left and lowers the bar for the rest of the milestone: the board can never
reach 100%, and it invites `/log-feature` on a cut item. Nothing in the milestone reader handles `~~` (searched:
no match in `milestones.mjs` or `markdown.mjs`), so F-17's `shape` may offer the same item as the shaping pick.

The same formula divides by zero when every leaf is dropped and every item has an issue, or when Contents is empty.

**Proposed resolution.** A Contents item whose whole text is struck through is *cut*: shown struck under Done's
dropped fold, never `Not filed`, never in the bar, never the shaping pick (the last is a rule for the shared plan, so
it goes in §3 with status). An empty denominator draws no bar and the words `no issues to count`. Add both to
Acceptance. Changes §2 and §3: #600, #601, #602.

### AR-4 — The time stamps inside `<main>` change the bytes on every read, so the board swaps and drops focus at least every 30 seconds

**Where:** F-18 §2 model (`readAt, githubAt`, line 136); §4 the script and the page (lines 232–249); Known limitations
(line 282); `dev/board/specimen.html` lines 77–80.

The specimen puts the header, with `Updated 14:32:05 · GitHub read 14:32:01`, inside `<main>`. A read happens at least
every 30 seconds, so the page's bytes, and so its `ETag`, change on every read even when no strip moved. The script
then swaps `<main>` at least twice a minute on an idle board. The doc's limitation says focus and selection are lost
"on a change", but in practice that is every read. A keyboard user on a `<summary>`, or the owner selecting a command
to copy, loses it within 30 seconds. The `304` path, and its Acceptance block ("two requests in a row with no change"),
passes in a test and almost never applies on a live board.

WCAG 2.2.2 (Pause, Stop, Hide, level A) also asks for a way to pause auto-updating content shown beside other content.
The doc claims WCAG 2.2 AA but checks only contrast.

**Proposed resolution.** Keep the read times out of the page's bytes: send them as a response header the script writes
into `#live` with `textContent`, or keep them outside `<main>` and out of the hash. Then a swap happens only when a
strip changes. Before swapping, the script keeps focus by element `id` where one exists. Add a pause control (a
`<button>` that stops the poll), or record in D-055 why 2.2.2 does not apply. Add an Acceptance line: two reads with no
change in their inputs give the same `ETag`. Changes §2 and §4: #600, #602, #603.

### AR-5 — A prose wait on an issue the read does not fetch has no state

**Where:** F-18 §3, "Prose waits" (lines 193–203); F-17 §5, "What is read", call 2.

"A leaf with a prose wait on an open issue is not ready … a closed one holds nothing." The read knows the state of the
milestone's issues and their sub-issues (call 1) and of `Blocked by` issues not already read (call 2). A prose wait
usually names an issue outside the milestone, since a wait inside it would mostly be a `Blocked by:` already. §3 does
not add prose-wait numbers to call 2, and the new open-issue list cannot answer either: it holds the first 100 open
issues, so absence means closed *or* past 100. "No fetch is added" is true only if the plan treats an unknown state as
something; the doc does not say what.

**Proposed resolution.** Say that call 2 reads `state stateReason` for prose-wait numbers too (inside the same call
and budget), and that a number GitHub does not return holds the leaf as `waits on #n (not found)`. Add an Acceptance
line for a prose wait on an issue not on the milestone. Changes §3: #600 and #601.

### AR-6 — Prose waits fire on the embedded Contract, and `### Links` is not unique in an issue that embeds one

**Where:** F-18 §3, "Prose waits" (lines 193–197); Known limitations (lines 274–276); the slipway rule that "Execution
issues embed the feature doc's Contract".

Every build issue embeds its feature doc's Contract, and Contracts are full of prose about other issues. F-18's own is
the first example: its `Verified against:` line says "the build re-reads them after #542 merges (L-18)", so #600, #601,
#602 and #603 each carry a prose wait on #542, from text written about the code, not about the ticket. That was the
only live hold among the 71 open issues read on 2026-11-02 (16 matched a phrase; the rest pointed at closed issues). The
hold happens to be right here, but the source is wrong, and the house format guarantees more: every `Verified against:`
line that says "after #n merges" holds its ticket. The limitation names history sentences, not the embedded Contract.

The exclusion is "outside … the `Blocked by:` segment of `### Links`". #600 and #601 contain the text `### Links` inside
their embedded Contract (§3 quotes it), before the real `### Links` heading. A reader that finds the first occurrence
reads the wrong segment.

**Proposed resolution.** Read prose waits only from the issue's own sections, never from its embedded `### Contract`
and `### Verify` blocks (their headings are fixed by `process/intake.md`). `### Links` is the last heading line of that
name, at the start of a line, outside code. Add an Acceptance line: a body whose embedded Contract says "after #30
merges" holds nothing. Changes §3: #600 and #601.

### AR-7 — A rank-1 `prose-wait` line sorts ahead of every ready build in In parallel

**Where:** F-18 §3, "Prose waits" (lines 198–200); F-17 §3, "Candidates" and the ranks; D-050, "Ready builds come
first".

The new owed thing has who `you or an agent`, rank 1 and files `[]`. In F-17 §3, "A ready leaf ranks 1 and sorts after
the rank-1 owed things", `[]` "overlaps nothing", and agent work is not held by the person rule. So every `prose-wait`
line takes an In parallel place before any ready build. Two holds (from AR-6's embedded text, or a history sentence)
fill both places with "add a Blocked by line" and push every ready build out of In parallel, in every session start
until someone edits the issues. D-050 says "Ready builds come first". Rank 1 also prints `It blocks {id} closing`,
which is true only indirectly.

**Proposed resolution.** The owner's call between (a) rank 3, so the hold shows in Needs attention and takes a place only
when fewer than three builds are ready; and (b) keep rank 1, and record in D-055 that a hold outranks ready builds,
with the reason. Either way the Contract names the `blocks.words`. Changes §3: #600 and #601.

### AR-8 — `proven` on a gate line rests on an issue's closing, which proves nothing about the line

**Where:** F-18 §2, "The gate" (lines 173–178); Acceptance (lines 329–330).

`proven`: "the line names one or more `#n`, each closed as completed". A gate line such as "Exports a month in under 3
seconds, measured after #40" or "#40's bug does not come back" is `proven` the moment #40 closes, though nothing
measured it. The board then shows a gate item as met that `/close-milestone` has not verified, on the screen the owner
steers by. Slipway's rule is that work is not done without fresh output from the commands that prove it; this is an
assumption stated as a fact about the gate. The QA-plan case (`Ran: … pass`) is real evidence; the issue case is not.
A gate `#n` outside the milestone also has no state in the read (AR-5).

**Proposed resolution.** Call the issue case `issues closed`, not `proven`, and keep `proven` for a `Ran: … pass` line.
Name where a gate `#n`'s state comes from. Changes §2: #600 and #602.

### AR-9 — Between milestones (latest is `shaping`), the page has no defined state

**Where:** F-18 §2, "No active milestone" (lines 180–183).

The milestone statuses are `shaping`, `active`, `closed` and `killed` (`MILESTONE_STATUSES`). The doc covers "the
latest milestone (by appetite end) is `closed` or `killed`" and "no milestone at all". The usual state after
`/close-milestone` is M1 closed and M2 `shaping`, often with an appetite set ahead. Then the latest by appetite end is
`shaping`, and neither rule applies. The source of `{date}` in "was closed on {date}" is not named either.

**Proposed resolution.** With no active milestone, show the latest `closed` or `killed` one by its end, whatever is
shaping after it, and add `{next id} is shaping.` when one is. Name the date's source (the milestone's frontmatter field,
or its appetite end). Add an Acceptance line for closed M1 with shaping M2. Changes §2: #600 and #602.

### AR-10 — §1 says a `gh` failure exits 1; §4 says the board keeps serving

**Where:** F-18 §1 (lines 118–119); §4, "Reads" (lines 221–223); F-17 §10, "The failure rule".

§1: "Settings, `gh` failures and the exit codes are F-07's as F-17 §10 amends them". F-17 §10: "exit 1 naming `gh auth
status` … nothing is written." §4: a failed read keeps the last good columns, and "with no good read yet, the columns
say `not ready`". For the first read of `pnpm board` (serving), these disagree: exit 1, or serve a `not ready` board.
F-17 §10 also reads "with no 5-second limit (the page is run by hand)", and §4 puts the board under the 5-second budget;
that amendment is right but unsaid.

**Proposed resolution.** Say `--out` keeps F-07's rule (exit 1, nothing written) and serving never exits on a `gh`
failure, and say the board's reads take F-17's 5-second budget in place of §10's "no limit". Changes §1 and §4: #600,
#602, #603.

### AR-11 — The read schedule can starve under steady writes and can trigger itself

**Where:** F-18 §4, "Reads" (lines 215–220).

"After any change under the root, once it has been quiet for 1 second … and every 30 seconds when nothing changed."
A test run, a watch build or `pnpm verify` writes files more often than once a second for minutes. The tree is never
quiet for a second, and "every 30 seconds when nothing changed" does not apply, since things changed. The board can
freeze for the length of the run, which is when the owner is watching it. Second, the ignore list is `node_modules/`,
`.git/objects/` and `.git/logs/`. The read itself runs `git for-each-ref` (F-17 §5) and the plan reads files. If any
part of a read writes under the root (`.git/index`, a lock file, a build tool's cache, `STATE.md` if status's model
writes it), the board marks itself dirty after every read and reads every 10 seconds for ever. The doc does not say
that nothing in a read writes under the root.

**Proposed resolution.** Read at most every 10 seconds while events keep coming (a ceiling, not only a floor), and
state that a read writes nothing under the root, with a test that a read with a real watcher leaves the board clean.
Add `.git/index`, `*.lock` and the project's build output folders to the ignore list, or watch only the paths
`board()` reads. Add an Acceptance line: events every 200 ms for 60 seconds give reads at least every 10 seconds.
Changes §4: #600 and #603.

### AR-12 — "inside GitHub's GraphQL budget" is stated with no measurement

**Where:** F-18 Known limitations (lines 277–278); Build map step 1 (lines 383–385).

"Up to 360 reads an hour, inside GitHub's GraphQL budget for one account but not free." No evidence line: the cost of
one read is not given, and a read is up to three calls (F-17 §5), one with nested `first: 100` connections. The account's
budget is shared with every agent session's `gh` calls, and with a second board if the owner runs two projects.
Secondary rate limits are not mentioned. Step 1 re-times the read; it does not cost it.

**Proposed resolution.** Step 1's timed run also records one read's `rateLimit { cost remaining }` (a field the same
GraphQL call can return), and the doc states the hourly cost at 360 reads with one board and with two. If it is over a
tenth of the budget, lengthen the 10-second floor. Changes Build map step 1 (not the Contract): #601's acceptance.

### AR-13 — D-022's "nothing else of an issue" and `issue-body.mjs`'s "three things" are not amended for prose waits

**Where:** F-18 §3, "Prose waits" (lines 193–197); D-022; D-055; `ci/checks/lib/issue-body.mjs` lines 1–2.

D-022: "From a body it reads only the designation section, `Blocked by:` and `Touches:`." The module says the page
reads "three things, nothing else". Prose waits read the whole body for phrases. D-055 decided prose waits, so this is
not a decision gap, but it amends D-022 only for the script. A later reader of D-022 sees a rule the code breaks.

**Proposed resolution.** D-055 names D-022's "nothing else of an issue" as amended for `proseWaits()`, and D-022 gets a
dated line pointing at D-055, as D-050 did. Step 1 updates the module's header. No Contract change.

### AR-14 — The footer's `100 or more` contradicts an exact `totalCount`, and which 100 is unsaid

**Where:** F-18 §2, "The open-issue footer" (lines 185–187); §3 (line 204).

`totalCount` is exact past 100, so "above 100, `100 or more`" throws away a number the read already has. `first: 100`
with no `orderBy` returns GitHub's default order, so which 100 are listed is unsaid. "On {id}" is unclear for an item's
own issue that has sub-issues: it is not a leaf, so it may count as elsewhere.

**Proposed resolution.** Print the exact count, list the newest 100 (`orderBy: { field: CREATED_AT, direction: DESC }`),
and say an item's own issue counts as on the milestone. If AR-1 goes to (b), this goes with it. Changes §2 and §3:
#600, #601, #602.

### AR-15 — Small contradictions and gaps

**Where:** F-18 §1–§4 and Acceptance, as each item says.

- **Next "byte for byte"** (line 315): the board prints status's Next escaped, so `&` becomes `&amp;`. Say the
  comparison is of the header's text content.
- **Stacking order** (line 248): the Contract says "Waiting on you comes first when the columns stack";
  `dev/board/design-direction.md` says "Columns collapse to one stack … Next first". Say which comes first.
- **`--out` in the watcher** (line 218): §1 makes `--out` a one-shot with no server, so the serving watcher has no
  `--out` file to ignore. Drop it, or allow `--out` beside serving.
- **`you` things in two places** (lines 148–151, 168–171): an owed pick whose who is `you` is in Next and in Waiting on
  you. Say whether that is meant. Folding rank-1 things past 7 hides things that block the milestone closing; say
  they are never folded.
- **The alias's old flags** (lines 112, 117): `pnpm work-order --watch` or `--every` now hits flags that "go". Say the
  alias drops them with a warning or exits 2 naming `pnpm board`. Say what sync does with the renamed
  `ci/work-order.mjs` in a project that has it.
- **Between the steps** (Build map): step 2 is "static, no server change" but renames the command whose default §1 makes
  serving. Say what `pnpm board` does between steps 2 and 3.

**Proposed resolution.** As in each item. Changes §1, §2 and §4: #600, #602, #603.

### AR-16 — No Acceptance line makes the accessibility claim beyond contrast able to fail

**Where:** F-18 §4, "The page" (line 249); Acceptance (lines 360–361); Verify (lines 372–373).

The accessibility line is "WCAG 2.2 AA contrast on every token pair; no motion", and its check is
`node ~/.claude/skills/ui-craft/scripts/check-ui.mjs dev/board`, a path in the owner's home directory, outside the
repository. CI cannot run it, and a collaborator's machine may not have it. Nothing checks keyboard use, the swap's
effect on focus (AR-4) or that colour never carries a state alone, which the direction pins.

**Proposed resolution.** Put a contrast test over the page's tokens in `scripts/board.test.mjs` (the token values are
in the page's inline style), so CI goes red. Keep the ui-craft run as the hand step. Add an Acceptance line: every
column and strip state is in words. Changes §4 and Verify: #600 and #603.
