---
prd-ref: D-024
status: draft
---

# F-09 — Deferred checks: a check moved to after merge stays owed until its result is recorded

## Problem

**Job:** when a pull request can only prove part of its issue after `main` deploys, I want the check it moves
to after merge to stay visibly owed until someone records its result, so I can trust that an item the
milestone reads as done was checked, not only promised.

`/work-ticket` lets a PR's Verification move a check to after merge (typically a staging journey that runs
only once `main` has deployed). The PR's closing line closes the issue on merge, and after that nothing holds
the check: the issue is closed, `pnpm status` says nothing, the milestone counts the item as done.

Evidence: a private project's first milestone (2026-09-30). Two feature items in a row closed with their
staging run "to follow the merge", and neither run was recorded. One item's closing comment said the run had
been "posted on" its PR; that PR had no comments. Nobody noticed until the issues were read by hand.
Workaround: reading every closed issue by hand. Frequency: every PR whose check needs a deployed
environment, in every project with staging. Why now: the first real milestone hit it twice in a row.

Serves `SLIPWAY.md`'s thesis, a rule exists only where something fires: "run the staging journey after merge"
is a rule nothing fires on. Decision: D-024. Issue: #176, part of #43.

**Verdict: PROCEED**, with the issue left open and the owed check written on the milestone's Contents item.

| option | for | against | verdict |
|---|---|---|---|
| do nothing | no work | the check is lost at merge, twice in a row on the first real milestone | rejected |
| the issue stays open (`Part of #n`), the owed check is written under its Contents item | one record per item; `pnpm status` and `pnpm meta` stay offline and can see it; the issue closes when the run is recorded | a trivial PR to turn `Owed:` into `Ran:` after each run | **chosen** |
| the PR closes the issue; the check becomes a follow-up issue | the normal close flow | status still needs a line in the repo; an issue per deferred check; the item's marker points at a closed issue | rejected |
| GitHub only: the open issue, no line in the repo | nothing to edit after the run | `pnpm status` runs in every session's hook and reads no network (D-022), so it could not list the check | rejected |
| a `waived:` syntax for a check that will never run | a way out | an escape hatch nothing reviews (decision-defaults §10); dropping a check is a decision like dropping anything | rejected |
| status lists owed checks, nothing fails | small | advisory only; a milestone can still close with one owed (decision-defaults §4) | rejected: `pnpm meta` also fails a closed milestone that still owes one |

Design calls taken with the orchestrator session, not the owner (slipway process design within
`process/decision-defaults.md`): open issue over follow-up issue; the `Ran:` line cites the comment's URL; a
failed run stays owed; no waiver syntax; the `pnpm meta` finding; the work-order page shows owed items as not
ready. Sharpened the same way before the build: with sub-issues, the item's issue carries the check and stays
open while the sub-issues close as usual; a nearly-right line is unreadable and counts as owed
(decision-defaults §4); a closed issue that still owes reads as owing (§5); one `excerpt()` and one marker
pattern (§1).

## Contract

Verified against: 6587d4e 2026-09-30 — `.claude/skills/work-ticket/SKILL.md` (300 lines, the cap in
`scripts/skills.test.mjs:28`; no step for a check that runs after merge; Phase 6's Links "Closes #n or Part of
#n"), `process/*.md` (no rule for it), `ci/status.mjs` (offline; lists open decisions and questions under
Needs attention; nothing about checks; `excerpt()` is private to it), `ci/checks/lib/milestones.mjs`
(`contents()`: `N.` opens an item and every indented line continues its text; `started()` reads the marker at
the end of that text, so a check line read as text un-starts its item), `ci/checks/meta/ms1-milestones.mjs`
(no Contents findings; a shaping milestone is read for frontmatter only), `ci/work-order.mjs:26,122,133` (the
marker pattern is a second copy, with captures; an item whose issue has sub-issues shows those as its rows; an
open issue with no open PR and no open blocker is ready), `scripts/skills.test.mjs:111` (a section of
`process/intake.md` a skill cites must exist), `docs/qa/README.md` (plans, no record of a run).

### 1. The record — lines under a Contents item

A Contents item in a milestone doc may carry child lines, indented like any continuation line:

```
2. A client books a walk (F-02) · #13
   Owed: staging journey "book and cancel a walk" — staging
   Ran: staging journey "see tomorrow's walks" — staging 2026-10-02 pass https://github.com/o/r/issues/13#issuecomment-123
```

- `Owed: {check} — {environment}`: a check the item's PR moved to after merge, not yet run.
- `Ran: {check} — {environment} {yyyy-mm-dd} pass|fail {comment URL}[ · bug #{n}]`: a recorded run. The URL
  is a comment on the item's issue, `https://github.com/{owner}/{repo}/issues/{n}#issuecomment-{digits}`, where
  `{n}` is the number in the item's ` · #n` marker. The comment carries the run's date, environment and each
  journey's result; the line only points at it.
- **The item's issue carries the check.** The item's issue is the one its marker names. When that issue has
  sub-issues, a check one of their PRs defers is still owed by the item's issue: the comment is posted there,
  and that issue stays open (§6).
- A run is recorded by: posting that comment on the item's issue, then, in a trivial-lane PR, replacing the
  `Owed:` line with the `Ran:` line. On `pass` for every check the item owes, the item's issue is closed, once
  its sub-issues are.
- A `fail` stays owed: the item needs attention until a `Ran:` line further down for the same check says
  `pass`, or the fail line names the bug filed for it (` · bug #n`). The fail line stays as history.
- **A line that is nearly one is unreadable, and unreadable is owed.** An indented line that starts `owed:` or
  `ran:` in any letter case, with or without a `-` or `*` bullet before it, is a check line. Written any other
  way than the two above (the wrong case, a bullet, no ` — {environment}`, a date that is no calendar day, a
  result other than `pass` or `fail`, a URL of another shape, a pull request's comment included), it is
  unreadable. It is never dropped and never read as the item's text (decision-defaults §4).
- **So is a line dressed as markdown.** A `+` bullet, a task box (`- [ ] Owed:`), emphasis or code marks around
  the word (`**Owed:**`), or invisible characters in front of it, however many: each is still a check line,
  and unreadable.
  A bug number of 0 names no bug.
- **A forgotten indent is unreadable too.** The same line at column 0 (`owed:` or `ran:`, any letter case, with
  or without a bullet), straight after an item, its continuation lines or its check lines, is a check line of
  that item and is unreadable: it is not accepted as written, and the finding says to indent it. After a blank
  line or any other column-0 line it is ignored, as every unindented line under Contents was before.
- There is no waiver. A check that will never run is removed in a PR that records a decision saying why.

### 2. One reading — `ci/checks/lib/milestones.mjs`

`contents(md)` returns `[{ n, text, checks }]`. A check line (§1) is not part of `text`; every other indented
line continues `text` as today, so `started()` and every existing marker case read the same. `checks` is
`[{ kind: 'owed' | 'ran', check, env, date, result, url, bug, line }]`, `line` being the raw text for
messages; an unreadable check line is `{ kind: 'unreadable', line }`, and so is every check line of an item
with no marker. A line is cut to 500 characters before a check pattern reads it, after one linear pass that
drops its invisible characters: status runs this in every session's hook.

Two helpers beside it:

- `owing(item)` returns the checks the item still owes: every `owed`, every `unreadable`, and every `ran fail`
  with no bug and no `ran pass` for the same `check` text on a later line.
- `marker(text)` returns `{ repo, issue, before }` from the item's marker, or null: `repo` is null for a bare
  ` · #13`, and `before` is the item's text without the marker. `ci/work-order.mjs` uses it and drops its own
  copy of the pattern.

F1, status, MS1 and the work-order page use these; no second parser (decision-defaults §1). They are tested
in `scripts/milestones.test.mjs`, which `pnpm meta` runs (one more entry in the `meta` script).

### 3. `pnpm status` — `ci/status.mjs`

For the active milestone, each item that owes adds Needs attention lines, after the open questions: one per
kind, with a count.

- `Owed check: {id} item {n} (#{issue}) — {count} check(s) moved to after merge with no run recorded (the
  Owed: lines under it in docs/milestones/{file}): run each, post the result as a comment on #{issue}, then
  change the Owed line to Ran with that comment's link; #{issue} stays open until then (reopen it if it was
  closed)`
- `Failed check: {id} item {n} (#{issue}) — {count} run(s) failed on {dates} (the Ran: lines under it in
  docs/milestones/{file}): fix and run it again, or file the bug and name it on the line`
- `Unreadable check line: {id} item {n} — {count} line(s) under it start owed: or ran: and cannot be read, so
  each counts as owed: write it as Owed: or Ran: (docs/milestones/{file})`

**Status prints no project text from a check line.** Its output enters every session through the hook, and a
milestone doc is text a pull request can carry. These lines hold only values status validated or computed: the
item's number, the issue's number, a count, a date that is a calendar day, and the file. `{id}` is printed only
when it is `M<n>`, the shape the skills accept; otherwise the line says `the active milestone`. `{file}` is the
one project-supplied value left: it is printed as the Milestones table already prints it, through the per-line
escape. The owner opens the file or the work-order page to see which check. `excerpt()` still moves from
`ci/status.mjs` to `ci/checks/lib/report.mjs`, beside the list it drops, for MS1 and the work-order page, which
quote a check's text, escaped. The Next line is unchanged.

S1 case `ci/fixtures/status/build-loop-owed`: item 1 started with an `Owed:` line, item 2 with a `Ran: … pass`
line, item 3 with a `Ran: … fail` line and no bug, item 4 with a fail then a later pass for the same check; its
`attention` list is exactly the lines for items 1 and 3. S1 case `build-loop-owed-unreadable` holds hostile
check lines (an address, one split by an invisible character, an instruction-shaped sentence, a hidden line);
`scripts/milestones.test.mjs` asserts none of it reaches status's output.

### 4. `pnpm meta` — MS1

Two findings in `ci/checks/meta/ms1-milestones.mjs`, documented in its header:

- `checks/owed:<id>#<n>`: a milestone with `status: closed` whose item `n` still owes a check (§2's `owing`).
  A killed milestone is exempt: its work stopped.
- `checks/unreadable:<id>#<n>`: in any milestone, a shaping one included, an unreadable check line (§1), a
  `Ran:` line whose URL is not a comment on the issue in the item's marker, or a check line under an item with
  no marker. The detail quotes the line. A marker that names a repository (` · owner/repo#13`) is compared
  with the URL's repository too; a bare ` · #13` compares the issue number only.

Known-bad fixtures under `ci/fixtures/known-bad/ms1/`: `owed-closed` (a closed milestone with an `Owed:` line
and one with an unresolved `fail`), `ran-unreadable` (a `Ran:` line without a URL, one whose URL names
another issue, one whose URL is a pull request's comment, a `- owed:` line, an `Owed:` line on an unstarted
item). The `registry` case stays green.

### 5. The work-order page — `ci/work-order.mjs`

An item that owes a check is not finished, whatever the state of its issue, and its heading reads
`owes {check excerpt}` for an `Owed:` or unreadable line and `failed {check excerpt}` for an unresolved fail.

- **The item's issue is its only row** (no sub-issues): that row is never in Next and is not shown as ready;
  it reads `owes …` in place of `open`, with no `/work-ticket` command, and reads the same when the issue was
  closed while it still owes. With an open pull request it reads `PR #n · owes …`.
- **The item's issue has sub-issues:** its rows are the sub-issues, and they are read as today. One closed by
  the PR that deferred the check is done; the open ones are ready or not by the existing rule. Only the
  heading says what is owed.

Built on the same `contents()`, `owing()` and `marker()`; three cases in `scripts/work-order.test.mjs`: an
item with sub-issues that owes (its other open rows are still ready, and the item is not finished), a
single-issue item that owes (not in Next, reads `owes …`), and an item whose issue was closed while it owes
(still reads `owes …`, not finished).

### 6. The rule — `process/intake.md` → Deferred check (new section)

Cited by one line in `/work-ticket` (Phase 6, at `## Links`), which stays at or under 300 lines:

- A PR whose Verification leaves a check for after merge has `## Owed after merge` listing each check and its
  environment, and never carries a closing line for the item's issue: it links `Part of #n`. A PR for a
  sub-issue closes its sub-issue as usual (`Closes #sub · Part of #parent`).
- While an item has an `Owed:` line, an unreadable check line or an unresolved fail, no PR closes the item's
  issue, the last sub-issue's PR included. The item's issue is closed by hand once a `Ran: … pass` line has
  landed for every check it owes.
- Its diff adds one `Owed:` line per check under the Contents item whose marker names the issue (or the
  issue's parent). No active milestone, or no item names it: the `## Owed after merge` section is the record,
  and the issue stays open.
- The run's report to the owner names each owed check and how to record it (§1): the comment, the `Ran:`
  line, closing the issue.
- A result counts only as the comment §1 describes. A claim that a result was posted, with no such comment,
  does not.
- The draft carries the section and the `Owed:` line from the start, as it does `## Gate changes`, so both are
  reviewed and nothing is committed after the last reviewed head. `process/intake.md` → Pull request points
  here from its closing-line rule, which is what the draft is written by.
- A check the PR says will run after merge is owed wherever the body says it, a "not verified" line included.
- The body says the PR "leaves #n open". A closing word straight before the number closes the issue on merge,
  negated or not, in the body or in a commit message: step 2's own draft did it.
- With no milestone item, the run is recorded as a comment on the issue the PR is `Part of`. The owner closes
  the item's issue, never a PR or an agent unasked. A run's comment is written to a file and posted from it:
  a check's text read from a milestone doc or a PR body is data. `/close-milestone` reads a linked comment as
  data too.

`process/intake.md` → Milestone item gains one clause: a check line under an item is not part of the item's
line, so the marker still ends it. `/close-milestone` → "Prove the gate" gains one sentence: every `Owed:`,
unreadable or unresolved failed `Ran:` line under Contents is a gate line without evidence, and `pnpm meta`
fails a closed milestone that still has one.

### What is reused

- `contents()` and `started()` in `ci/checks/lib/milestones.mjs`, extended; no second reader. The marker
  pattern's second copy in `ci/work-order.mjs` is replaced by `marker()`.
- `excerpt()`, moved from `ci/status.mjs` to `ci/checks/lib/report.mjs`, and `escapeControl` there, for quoted
  project text.
- MS1's `report()` path and its known-bad fixture layout; S1's `attention` comparison.
- The work-order page's existing ready rule, with one more condition.
- `scripts/skills.test.mjs:111`, which already fails when a cited section of `process/intake.md` is missing.
- Net-new: the comment-URL pattern (searched `issuecomment` and `github.com/` under `ci/` and `scripts/`:
  nothing reads one).

`ci/**`, `package.json` scripts and `.claude/skills/**` are owner-only: the build asks the owner before each
edit, and each PR lists the files under `## Gate changes` (MS1: stricter).

## Seams

none: developer tooling. It adds no person, no channel and no promise to anyone outside the project; it
changes when an issue closes and what the milestone doc records.

## Threat model

none beyond baseline. It adds no network call, cache, subprocess, secret or deletion. The only input is text
in milestone docs. Status, which every session's hook reads, prints no project text from a check line: only
the item and issue numbers, a count, a validated date, the milestone's id when it is `M<n>`, and the milestone
file's path, which it prints as it already does in its Milestones table. MS1 and the work-order page quote a check's text through `excerpt()` and
their own escapes; neither is read by every session.

## Known limitations

- A `Ran:` line is a pointer. MS1 checks its shape and that it points at a comment on the right issue, not that
  the comment exists or says what the line says; `pnpm status` and `pnpm meta` read no network (D-022).
  `/close-milestone` reads the linked comments when it proves the gate.
- Under a bare ` · #13` marker, MS1 compares the URL's issue number, not its repository.
- A PR that defers a check and forgets the `Owed:` line is caught only by review against this rule: whether
  Verification defers something is prose. The same holds for a PR that closes the item's issue while it owes:
  status keeps listing the check and the page keeps reading `owes …`, but nothing stops the close.
- `fail` and `pass` pair by exact check text and by line order: a reworded check reads as a new one, and a
  pass written above its fail does not clear it. The environment is not compared: a pass anywhere clears it.
- MS1's finding and the work-order page quote a check's text as written, an address in it included; both
  escape it. Status quotes none of it.
- Status still quotes an open question's text and a milestone's title and item text through `excerpt()`: the
  same surface, older than this feature, and not changed here.
- A check line with an invisible character before its indent, after a blank line, reads as a column-0 line and
  is ignored like any other; straight after its item it is unreadable.
- A check line written as `> Owed:`, `1. Owed:`, `Owed :` or with a full-width colon is not seen as one: it
  reads as the item's text, so the item reads as not started.
- In slipway itself there is no active milestone, so the PR section and the open issue are the only record.

## Acceptance

```
Given a Contents item "2. A client books a walk (F-02) · #13" with an indented Owed: line and a Ran: line
When  node scripts/milestones.test.mjs runs contents() on it
Then  its text is "A client books a walk (F-02) · #13", started() is true, checks holds 2 entries, and marker() gives issue 13
And   every existing S1 case and scripts/work-order.test.mjs pass unchanged
```

```
Given the same item with "- owed: x", "Owed: x" (no environment) and "Ran: x — staging 2026-02-30 pass {url}" under it
When  node scripts/milestones.test.mjs runs contents() and owing() on it
Then  each is kind 'unreadable', owing() returns all three, and the item's text and started() are unchanged
```

```
Given ci/fixtures/status/build-loop-owed (items: 1 Owed, 2 Ran pass, 3 Ran fail with no bug, 4 fail then pass)
When  node ci/checks/meta/s1-status.mjs ci/fixtures/status runs
Then  Needs attention lists "Owed check: M2 item 1 (#12) …" and "Failed check: M2 item 3 (#14) …", and nothing for items 2 and 4
```

```
Given a closed milestone with an Owed: line, and another with an unresolved Ran: … fail line
When  MS1 runs on ci/fixtures/known-bad/ms1/owed-closed
Then  it reports checks/owed for each, and exits non-zero
```

```
Given a Ran: line with no URL, one whose URL is a comment on #99 under an item marked · #13, one whose URL is a pull request's comment, a "- owed:" line, and an Owed: line on an item with no marker
When  MS1 runs on ci/fixtures/known-bad/ms1/ran-unreadable
Then  it reports checks/unreadable for each of the five
```

```
Given an active milestone whose item's issue is open, has no sub-issues, no open PR and owes a check
When  the work-order page is rendered
Then  that issue is not in Next, its row reads "owes {check}" with no /work-ticket command, and the item is not under Finished
```

```
Given an item whose issue has two sub-issues, one closed and one open with no PR or blocker, and an Owed: line
When  the work-order page is rendered
Then  the open sub-issue is in Next, the item's heading reads "owes {check}", and the item is not under Finished
```

```
Given an item whose issue is closed and that still has an Owed: line
When  the work-order page is rendered
Then  its row reads "owes {check}" and the item is not under Finished
```

```
Given process/intake.md and .claude/skills/work-ticket/SKILL.md on the step-2 branch
When  node scripts/skills.test.mjs runs
Then  it passes, work-ticket cites process/intake.md → Deferred check and is at most 300 lines
And   `node scripts/skills.test.mjs` exits 1 when the Deferred check section is removed
```

```
Given process/intake.md → Deferred check on the step-2 branch
When  node scripts/skills.test.mjs runs
Then  it passes only while the section names `Part of #n`, `## Owed after merge`, the `Owed:` line and that no PR closes the item's issue while it owes
And   it exits 1 when any one of the four is removed
```

Not a test, and owed by step 2's PR under its `## Owed after merge`: that `/work-ticket`, on a PR whose
Verification defers a staging journey, writes all of it. That is proved by the first deferring PR on a real
project after it takes this version (decision-defaults §9), and recorded as a comment on #176.

## Verify

```
node scripts/milestones.test.mjs
node ci/checks/meta/s1-status.mjs ci/fixtures/status
node ci/checks/meta/ms1-milestones.mjs ci/fixtures/known-bad/ms1/owed-closed      # exits non-zero, checks/owed
node ci/checks/meta/ms1-milestones.mjs ci/fixtures/known-bad/ms1/ran-unreadable   # exits non-zero, checks/unreadable
node scripts/work-order.test.mjs
node scripts/skills.test.mjs
pnpm meta
```

Step 1 also runs MS1 and status once against a real project's milestone docs and records the result as a
count (decision-defaults §9).

## Build map

1. The record read and fired on: `contents()`, `owing()` and `marker()` with `scripts/milestones.test.mjs`,
   `excerpt()` moved to the lib, status's attention lines, MS1's two findings, the work-order page, with the
   S1 case, the MS1 known-bad fixtures and three work-order tests. — checks lib, status, MS1, work-order, ~300
   lines with fixtures. Blocked by #183 (it edits `ci/work-order.mjs` and its test); rebase on #168 once it
   merges (it edits `ci/checks/lib/milestones.mjs`).
2. The rule: `process/intake.md` → Deferred check and one clause in Milestone item, one citing line in
   `/work-ticket`, one sentence in `/close-milestone`, two tests in `scripts/skills.test.mjs`. — rules and
   skills, ~60 lines.

Both are PRs under #176 (`Part of #176`). Step 2's does not close it: it owes the real-project run above, so
#176 closes by hand once that run is recorded as a comment on it (§6, the no-milestone case).

## Out of scope

- Running staging journeys automatically: a project's own CI.
- What a QA plan must contain: `docs/qa/README.md`.
- Checking that a `Ran:` line's comment exists and says what the line says: needs the network, so a later
  `/close-milestone` step or a work-order column, not status (D-022).
- A PR-body check that a deferred check came with an `Owed:` line, or that a PR does not close an issue that
  owes: Verification is prose; later, if review misses it on a real project.
- Owed checks in a repository with no milestone (slipway itself): the open issue carries it.
- Splitting the files this touches that are already over 300 lines (`ci/work-order.mjs`,
  `scripts/work-order.test.mjs`, `process/intake.md`, `scripts/skills.test.mjs`).

## Open questions

none

## Changes

- 2026-09-30 · ADDED · spec · #176
- 2026-09-30 · CHANGED · built, step 1 (#176): a check line with its indent forgotten is unreadable, not
  dropped (§1); `marker()` also returns the text before the marker (§2); a single-issue row with an open pull
  request reads `PR #n · owes …` (§5). After review: a line dressed as markdown, or hidden behind
  invisible characters, is unreadable too (§1); status prints no project text from a check line, only counts
  and validated values (§3, threat model), after two review rounds found a filter for addresses bypassed
- 2026-09-30 · CHANGED · built, step 2 (#176): the draft carries the section and the `Owed:` line from the
  start, and a check listed as "not verified" but promised for after merge is owed (§6); step 2's PR follows
  its own rule, so it is `Part of #176` and #176 stays open until the real-project run is recorded. After
  review: the body never puts a closing word before the issue's number; the owner closes the item's issue; a
  run's comment is posted from a file; the no-milestone case says where the run is recorded
- 2026-09-30 · CHANGED · sharpened before build (#176): the item's issue carries the check when it has
  sub-issues, and nothing closes it while it owes; a nearly-right line is unreadable and owed; `marker()` and
  a shared `excerpt()`; acceptance for `/work-ticket`'s wording made falsifiable; blocked by #183
