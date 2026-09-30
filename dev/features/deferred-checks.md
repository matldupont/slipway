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
ready.

## Contract

Verified against: b41ae05 2026-09-30 — `.claude/skills/work-ticket/SKILL.md` (300 lines, the cap in
`scripts/skills.test.mjs:28`; no step for a check that runs after merge; Phase 6's Links "Closes #n or Part of
#n"), `process/*.md` (no rule for it), `ci/status.mjs` (offline; lists open decisions and questions under
Needs attention; nothing about checks), `ci/checks/lib/milestones.mjs` (`contents()`: `N.` opens an item and
every indented line continues its text; `started()` reads the marker at the end of that text),
`ci/checks/meta/ms1-milestones.mjs` (no Contents findings), `ci/work-order.mjs:75,120` (an open issue with no
open PR and no open blocker is ready), `docs/qa/README.md` (plans, no record of a run).

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
- A run is recorded by: posting that comment on the issue, then, in a trivial-lane PR, replacing the `Owed:`
  line with the `Ran:` line. On `pass` for every check the item owes, the issue is closed.
- A `fail` stays owed: the item needs attention until a later `Ran:` line for the same check says `pass`, or
  the fail line names the bug filed for it (` · bug #n`). The fail line stays as history.
- There is no waiver. A check that will never run is removed in a PR that records a decision saying why.

### 2. One reading — `ci/checks/lib/milestones.mjs`

`contents(md)` returns `[{ n, text, checks }]`. An indented line whose first word is `Owed:` or `Ran:` is a
check, not part of `text`; every other indented line continues `text` as today, so `started()` and every
existing marker case read the same. `checks` is `[{ kind: 'owed' | 'ran', check, env, date, result, url,
bug, line }]`, `line` being the raw text for messages; an unreadable `Ran:` line is `{ kind: 'unreadable',
line }`. A helper `owing(item)` returns the checks the item still owes: every `owed`, every `unreadable`, and
every `ran fail` with no bug and no later `ran pass` for the same `check` text. F1, status, MS1 and the
work-order page use these two; no second parser (decision-defaults §1).

### 3. `pnpm status` — `ci/status.mjs`

For the active milestone, each owing check adds a Needs attention line, after the open questions:

- `Owed check: {id} item {n} (#{issue}) — {check excerpt} on {env}: run it, post the result as a comment on
  #{issue}, then change the Owed line to Ran with that comment's link`
- `Failed check: {id} item {n} (#{issue}) — {check excerpt} failed on {date}: fix and run it again, or file
  the bug and name it on the line`
- `Unreadable check line: {id} item {n} — write it as Owed: or Ran: (docs/milestones/{file})`

`{check excerpt}` goes through `excerpt()` (60 characters, control and format characters dropped); a URL is
never printed. The Next line is unchanged. S1 case `ci/fixtures/status/build-loop-owed`: item 1 started with
an `Owed:` line, item 2 with a `Ran: … pass` line, item 3 with a `Ran: … fail` line and no bug, item 4 with a
fail then a later pass for the same check; its `attention` list is exactly the lines for items 1 and 3.

### 4. `pnpm meta` — MS1

Two findings in `ci/checks/meta/ms1-milestones.mjs`, documented in its header:

- `checks/owed:<id>#<n>`: a milestone with `status: closed` whose item `n` still owes a check (§2's `owing`).
  A killed milestone is exempt: its work stopped.
- `checks/unreadable:<id>#<n>`: in any milestone, a `Ran:` line that does not parse, or whose URL is not a
  comment on the issue in the item's marker, or an `Owed:`/`Ran:` line under an item with no marker.

Known-bad fixtures under `ci/fixtures/known-bad/ms1/`: `owed-closed` (a closed milestone with an `Owed:` line
and one with an unresolved `fail`), `ran-unreadable` (a `Ran:` line without a URL, one whose URL names
another issue, an `Owed:` line on an unstarted item). The `registry` case stays green.

### 5. The work-order page — `ci/work-order.mjs`

An item whose issue is open and that owes a check is never in Next and is not shown as ready. Its row reads
`owes {check excerpt}` for an `Owed:` line and `failed {check excerpt}` for an unresolved fail. Built on the
same `contents()`; a case in `scripts/work-order.test.mjs`.

### 6. The rule — `process/intake.md` → Deferred check (new section)

Cited by one line in `/work-ticket` (Phase 6, at `## Links`), which stays at or under 300 lines:

- A PR whose Verification leaves a check for after merge links `Part of #n`, never a closing line, and has
  `## Owed after merge` listing each check and its environment.
- Its diff adds one `Owed:` line per check under the Contents item whose marker names the issue (or the
  issue's parent). No active milestone, or no item names it: the `## Owed after merge` section is the record,
  and the issue stays open.
- The run's report to the owner names each owed check and how to record it (§1): the comment, the `Ran:`
  line, closing the issue.
- A result counts only as the comment §1 describes. A claim that a result was posted, with no such comment,
  does not.

`/close-milestone` → "Prove the gate" gains one sentence: every `Owed:` or unresolved failed `Ran:` line under
Contents is a gate line without evidence, and `pnpm meta` fails a closed milestone that still has one.

### What is reused

- `contents()` and `started()` in `ci/checks/lib/milestones.mjs`, extended; no second reader.
- `excerpt()` and `escapeControl` in `ci/status.mjs` for quoted project text.
- MS1's `report()` path and its known-bad fixture layout; S1's `attention` comparison.
- The work-order page's existing ready rule, with one more condition.

`ci/**` and `.claude/skills/**` are owner-only: the build asks the owner before each edit, and each PR lists
the files under `## Gate changes` (MS1: stricter).

## Seams

none: developer tooling. It adds no person, no channel and no promise to anyone outside the project; it
changes when an issue closes and what the milestone doc records.

## Threat model

none beyond baseline. It adds no network call, cache, subprocess, secret or deletion. The only input is text
in milestone docs, which status already quotes through `excerpt()` into every session's hook: a check's text
goes through the same path, and its URL is never printed.

## Known limitations

- A `Ran:` line is a pointer. MS1 checks its shape and that it points at a comment on the right issue, not that
  the comment exists or says what the line says; `pnpm status` and `pnpm meta` read no network (D-022).
  `/close-milestone` reads the linked comments when it proves the gate.
- A PR that defers a check and forgets the `Owed:` line is caught only by review against this rule: whether
  Verification defers something is prose.
- `fail` and `pass` pair by exact check text: a reworded check reads as a new one.
- In slipway itself there is no active milestone, so the PR section and the open issue are the only record.

## Acceptance

```
Given a Contents item "2. A client books a walk (F-02) · #13" with an indented Owed: line and a Ran: line
When  contents() reads it
Then  its text is "A client books a walk (F-02) · #13", started() is true, and checks holds 2 entries
And   every existing S1 case and scripts/work-order.test.mjs pass unchanged
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
Given a Ran: line with no URL, one whose URL is a comment on #99 under an item marked · #13, and an Owed: line on an item with no marker
When  MS1 runs on ci/fixtures/known-bad/ms1/ran-unreadable
Then  it reports checks/unreadable for each of the three
```

```
Given an active milestone whose item's issue is open, has no open PR and owes a check
When  the work-order page is rendered
Then  that issue is not in Next, and its row reads "owes {check}"
```

```
Given process/intake.md and .claude/skills/work-ticket/SKILL.md on the step-2 branch
When  node scripts/skills.test.mjs runs
Then  it passes, work-ticket cites process/intake.md → Deferred check and is at most 300 lines
And   `node scripts/skills.test.mjs` exits 1 when the Deferred check section is removed
```

```
Given a PR whose Verification defers a staging journey
When  /work-ticket opens and readies it
Then  its Links say "Part of #n", its body has ## Owed after merge, its diff adds the Owed: line, and the report tells the owner how to record the run
```

## Verify

```
node ci/checks/meta/s1-status.mjs ci/fixtures/status
node ci/checks/meta/ms1-milestones.mjs ci/fixtures/known-bad/ms1/owed-closed      # exits non-zero, checks/owed
node ci/checks/meta/ms1-milestones.mjs ci/fixtures/known-bad/ms1/ran-unreadable   # exits non-zero, checks/unreadable
node scripts/work-order.test.mjs
node scripts/skills.test.mjs
pnpm meta
```

## Build map

1. The record read and fired on: `contents()` and `owing()`, status's attention lines, MS1's two findings, the
   work-order page, with the S1 case, the MS1 known-bad fixtures and a work-order test. — checks lib, status,
   MS1, work-order, ~250 lines with fixtures. Blocked by #177 (it edits `ci/work-order.mjs` and its test).
2. The rule: `process/intake.md` → Deferred check, one citing line in `/work-ticket`, one sentence in
   `/close-milestone`. — rules and skills, ~40 lines.

Both are PRs under #176 (`Part of #176`); step 2's closes it.

## Out of scope

- Running staging journeys automatically: a project's own CI.
- What a QA plan must contain: `docs/qa/README.md`.
- Checking that a `Ran:` line's comment exists and says what the line says: needs the network, so a later
  `/close-milestone` step or a work-order column, not status (D-022).
- A PR-body check that a deferred check came with an `Owed:` line: Verification is prose; later, if review
  misses it on a real project.
- Owed checks in a repository with no milestone (slipway itself): the open issue carries it.

## Open questions

none

## Changes

- 2026-09-30 · ADDED · spec · #176
