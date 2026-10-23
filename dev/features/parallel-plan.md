---
prd-ref: F-17
status: draft
---

# F-17 — Parallel plan: `pnpm status` names the work that can start now, who does it, and what waits on you

Version: 0.1 (2026-10-23)

The line above is the one a `/review-doc` review quotes. Any edit inside the Contract, Acceptance or Verify
below moves it, in the same commit, bar the sha and date of a `Verified against:` line; a single acceptance block the owner
confirmed (`/log-bug`) is the one change that leaves it.

## Problem

**Job:** when I or an agent sit down at a project on slipway and ask "what's next", I want status to name the
ticket I can start now, what else can run beside it and who does each, and what is waiting on me, so I don't
have to work out from memory what is safe to start and what is urgent.

`pnpm status` names one step of the path on its Next line (`ci/status.mjs:379`, `next()`). Anything else owed
lands in one of two places, and neither says what to do with it:

- **Also unblocked** (`:422`–`:435`) holds three fixed cases: the skeleton beside an untested value risk, the PRD
  with no review, open questions. Work that can be done now and blocks something later never appears there. Two
  of the three also print a second time under Needs attention (`:432` and `:468`; `:434` and `:480`).
- **Needs attention** (`:467`–`:484`) is one list in a fixed order of kinds. Most of its lines do not say who acts,
  what they block or whether they wait on anything. An existential risk that must have a result before the next
  milestone sits beside a parked question that needs nothing, and both read the same. Only the lines F-15 added
  (`ci/checks/lib/decision-lines.mjs`) and the feature-review lines say who acts and what they block.

**Evidence, in the owner's words and dates.**

- 2026-10-14 (#445): status should be clear about what can safely, and efficiently, be done next in parallel with
  its Next line.
- 2026-10-15 (#445): work parked in an open pull request is invisible to status. A spec whose review went stale sat
  in a draft pull request with its check red, and the owner learned it only by opening the pull request. Status
  reads files on `main`, offline (D-022), so nothing waiting on the owner in a pull request reaches them.
- 2026-10-23, on a project on slipway in its build loop: Next said only "finish the milestone's open issues", so
  neither a pane nor an agent asked "what's next" could name which ticket to pick up. Needs attention was a flat
  list, so the agent ignored it, though some lines were things the owner could do at once (owed checks on two
  issues).

**Why now:** #379's order puts this in the 0.1.7 group, and the owner asked on 2026-10-23 for the shape now so the
build starts right after 0.1.6. Workaround today: the owner reads `pnpm work-order` (F-07), which picks ready issues
from GitHub but knows nothing of what status owes, and Needs attention, which ranks nothing.

**Verdict: PROCEED**, as #445's six proposals in the shapes the owner picked on 2026-10-23 (Open questions).

| option | for | against | verdict |
|---|---|---|---|
| do nothing | nothing new | "what's next" stays the author's memory; agents ignore a flat list | rejected |
| one plan from status's owed list and a short GitHub read (the ask, shaped) | answers "which ticket, and what waits on me" in one place, at session start | one network read in the hook; one more module | **proceeds** |
| send people to `pnpm work-order` | exists; already picks ready issues | a page nobody opens at session start; it knows nothing status owes, so its picks and status's Next disagree | rejected: work-order reads the same picks instead (§3) |
| rank Needs attention, keep it offline | no network | the build loop's next ticket and every pull request waiting on the owner stay invisible | rejected |
| cache GitHub's answer in a file | works with no network | a stale list reads as current; one more file to keep safe | rejected (the owner, Q3) |

## Fit

What this feature takes from the product it joins.

Reuses:
- `collect()`, `realGh()` and their picks in `ci/work-order.mjs` (F-07): the active milestone's issues read through
  `gh` (fixed arguments, no shell, the trusted PATH), a leaf's state (open, done, dropped, in a pull request), its
  `Blocked by:` and its readiness. The picks move to one shared function both read (§3).
- `touches()`, `overlap()` and `blockers()` in `ci/checks/lib/issue-body.mjs`: the `Touches:` line and the overlap
  rule (a false overlap is the safe mistake; unknown overlaps everything).
- `decisionLines()` in `ci/checks/lib/decision-lines.mjs` (F-15 §6): the line form this feature extends to every
  line, who first, "It blocks …. It waits on …." last.
- `STEPS` and `whoLine()` in `ci/checks/lib/steps.mjs` (#385, F-16 §2): who does each step and how long; the main
  step's person is read from there.
- `nextFormBreaks()` in `ci/checks/lib/next-form.mjs` (F-16 §2): every new Next line holds the form.
- `owedReviews()` and `SPEC_PATH` in `ci/checks/lib/spec-review.mjs`, `reviewProvenance()` and `quotedVersion()` in
  `ci/checks/lib/review-header.mjs`: whether a feature doc's version has a current review, as P1 and R1 read it;
  applied here to the doc and review texts at a pull request's head.
- `owing()`, `contents()`, `marker()` and `started()` in `ci/checks/lib/milestones.mjs`: an item's owed checks and
  its issue.
- The `--refresh` pattern in `ci/status.mjs:43`–`48`: work in a child process killed at a limit, so a read that
  never returns cannot hold the hook.
- `escapeControl()` and `excerpt()` in `ci/checks/lib/report.mjs`, and status's `named()`: how status prints.
- S1's `expect.json` form (`ci/checks/meta/s1-status.mjs`) and work-order's stubbed `gh` in
  `scripts/work-order.test.mjs`: fixtures and recorded GitHub answers, so no test calls GitHub.

Numbers:
- The counts on the GitHub line (open pull requests, how many by other people, issues marked `needs-shape`) and the
  "and N more" counts are computed once, in `ci/checks/lib/github-state.mjs`; status prints them.
- The cap (3, the main step included) is one constant in `ci/checks/lib/plan.mjs`; work-order's `PICKS` becomes it.

New: `ci/checks/lib/plan.mjs`, the planner. Nothing today ranks what status owes, judges whether two pieces of
work collide, or tells the owner's work from an agent's: work-order judges collision for milestone issues only, and
status not at all. `ci/checks/lib/github-state.mjs`, the read of open pull requests: work-order reads the issues of
milestone items and which pull request names each, never a pull request's readiness, checks, author or changed
files.

## Contract

Verified against: bff0897 2026-10-23. The code-state claims below were re-read on `main` at that commit:
`ci/status.mjs` (`next()` at `:379`, Also unblocked at `:422`–`:435`, Needs attention at `:467`–`:484`, `--refresh`
at `:43`–`:48`, `--hook` at `:514`), `ci/work-order.mjs` (`PICKS = 3` at `:29`, `collect()` at `:91`, picks at
`:140`–`:147`), `ci/checks/lib/issue-body.mjs` (`touches()`, `overlap()`), `ci/checks/lib/decision-lines.mjs`,
`ci/checks/lib/steps.mjs`, `ci/checks/lib/next-form.mjs`, `ci/checks/lib/spec-review.mjs`,
`process/harness/hooks/session-state.sh` (runs `ci/status.mjs --hook`), `package.json` (`status` runs
`node ci/status.mjs --write`). On 2026-10-23 slipway had 63 open issues: 48 carry a `Touches:` line and 37 of those
parse (`touches()` returns entries).

Decisions this rests on, in words: status is computed, never hand-kept, and runs in every session's hook [D-020];
the work order is a local page over the milestone and live GitHub state, and parallel-safety is declared at intake on
the `Touches:` line [D-022]; status reads no network [D-022, D-020], which this feature amends for one read, by the
decision the owner records (§8); every status line says who acts, what it blocks and what it waits on [D-045, as
F-15 §6 wrote it]; status's text follows `process/writing.md` and the Next line holds its form [D-046]; owners get
product questions in the project's words [D-016]; project and GitHub text is printed only in safe shapes (#501).

### §1 An owed thing

Every line status prints for a person, bar the Next line and the state lines, comes from one owed thing:

```js
{
  kind,      // a key from §2's table
  key,       // unique in the run: kind plus the ids it names ("owed-check:M2:4")
  who,       // 'you' | 'agent' | 'you or an agent' | 'fresh session' | 'nobody'
  text,      // the action and the reason: one to three sentences, as process/writing.md has it
  blocks: { rank, words, date },   // rank 1–5 (below); words: what it blocks, said in the line
  waits,     // null, or the key of another owed thing, or a fixed phrase ("its doc", "GitHub")
  files,     // the paths and globs it writes: an array, [] for none, or null for unknown
}
```

The line is `(who) {text} It blocks {words}. It waits on {waits in words, or nothing}.` A thing that can start
now but was not picked adds `It can start now, after the steps above.` before `It blocks`. `who: 'nobody'` prints
no parenthesis: a parked question reads `Parked: … — nothing to do now. It blocks nothing. It waits on #12.`

**Ranks**, soonest first:

| rank | blocks |
|---|---|
| 1 | the active milestone closing |
| 2 | a milestone going active (a value or existential risk, a design item, the PRD's approval) |
| 3 | a feature's shaping, review or build, or a pull request going ready |
| 4 | a date (a lesson's review-by), earlier first |
| 5 | nothing status tracks; the words still say what it is for |

Within a rank, the order is §2's table order, the order status prints kinds today. For the owner's own work this
gives a fixed order (the owner, Q4): an untested value risk before an open question.

**Who and the person rule.** `you` is the owner. `agent`, `fresh session` and `you or an agent` are agent work:
agent sessions run side by side, so they collide by files only. The owner is one person: the owner is busy when
the main step's `who` (from `STEPS`, or the row in §4) is `you`, `yours` or `you and an agent`, and status never
offers two of the owner's things at once, the main step included (the owner, Q1).

### §2 Who, blocks and waits for every line

Each line status prints today keeps its action and reason, rewritten only where §4 says, and gains its facts. Paths
in this table are the files the thing writes.

| kind | the line today starts | who | blocks (rank) | waits on | files |
|---|---|---|---|---|---|
| `prd-review` | Run /review-doc docs/PRD.md | fresh session | the PRD's approval, which a milestone needs (2) | nothing | `docs/reviews/**` |
| `prd-approve` | Resolve the review's findings | you | the PRD leaving draft (5) | nothing | `docs/PRD.md` |
| `agent-rows` | Fill each unfilled AGENT.md row | you | the skills that read them (5) | nothing | `AGENT.md` |
| `risk-test` | (from Also unblocked) Test the untested value risks | you | what `riskBlocksSentence` names (2) | nothing | `docs/product/evidence/**`, `docs/product/FRAME.md` |
| `build-ahead` | To build ahead of the risk | you | nothing: it is a choice, not owed (5) | nothing | `decisions.md`, `docs/product/FRAME.md` |
| `risk-tracker` | File the issue that runs each untested value risk | you or an agent | the checks, once a milestone past the skeleton is underway (2) | nothing | `docs/product/FRAME.md` |
| `skeleton` | (from Also unblocked) Activate the walking skeleton | agent | the skeleton milestone, which every later milestone builds on (2) | nothing | the skeleton's milestone file, each workspace package folder `discoverWorkspace()` reports, `package.json`, `pnpm-lock.yaml` (the owner, Q4) |
| `register` | Review register / Review finding | you or an agent | the milestone its Blocks cell names when it is active (1); else nothing (5) | nothing | that review's file |
| `feature-review` | Run /review-doc {doc} | fresh session | the feature's build tickets (3) | the `owed-citation` for that feature, when one is listed | `docs/reviews/**` |
| `design` | {id} has no design item / {id}'s Gate | you or an agent | {id} going active (2) | nothing | `docs/milestones/**` |
| `design-frame` | docs/product/FRAME.md does not say where | you | every shaping milestone's design check (2) | nothing | `docs/product/FRAME.md` |
| `existential` | Existential risk | you | the first bet ({id}) going active (2) | nothing | `docs/PRD.md`, `docs/product/FRAME.md` |
| `open-decision` | Decide / Answer | you | nothing status reads (5) | nothing | `decisions.md` |
| `owed-citation` | (F-15) Write what the decision … changes | you or an agent | the feature's review and build (3) | nothing; "its doc" when no doc carries the feature | that doc, or the milestone file |
| `decision-reopens` | (F-15) Re-read the decision | you | anything new built on it (3) | nothing | `decisions.md` |
| `decision-closes`, `decision-unreadable`, `decision-stray`, `decision-folder` | (F-15) | as printed | nothing (5) | nothing | `decisions.md` |
| `open-question` | Open question: {file}:{line} | you | by file: the frame (2) for `docs/product/FRAME.md`; the PRD's approval (2) for `docs/PRD.md`; the feature's review (3) for a feature doc; else nothing (5) | nothing | that file |
| `owed-check`, `failed-check`, `unreadable-check` | Owed check / Failed check / Unreadable check line | you or an agent | the active milestone closing (1) | nothing | the active milestone's file |
| `parked` | Parked: | nobody | nothing (5) | its tracker | none |
| `lesson` | Review the lesson | you | its date (4) | nothing | that lesson's file |
| `github-unread` | (§5) | you | nothing (5) | GitHub | none |
| `merge`, `review-owed`, `red-check`, `needs-shape` | (§6) | §6 | §6 | §6 | §6 |

The F-15 lines keep their wording (three reviews fixed it); `decision-lines.mjs` returns each as an owed thing
whose `text` is today's line less its two closing sentences, which §1 rebuilds from `blocks` and `waits` to the same
words. Also unblocked's PRD review and open-questions summary are dropped: the `prd-review` and `open-question`
lines already say them (the owner, Q4).

**Files of agent work in progress.** A pull request's files are its issue's `Touches:` entries together with its
changed paths, once it is open (the owner, Q1: `Touches:` is a guess made at filing; the diff is what happened).
Paths read from GitHub feed the overlap test and are never printed (§7).

### §3 The planner — `ci/checks/lib/plan.mjs`

One zero-dependency module with no `process.exit`. Status and `ci/work-order.mjs` both call it, so the page and
status name the same work (the owner, Q2):

```js
plan({ main, owed, leaves, inProgress, shape }) → { main, parallel: [...owed], rest: [...owed] }
```

- `main`: the main step, `{ who, files, issue? }` (§4's table; `issue` when Next names a ticket).
- `owed`: §1's things. `leaves`: work-order's leaves of the active milestone (ready or not, with `touches`), empty
  offline. `inProgress`: the files of each open pull request (§2), empty offline. `shape`: the first unstarted
  Contents item, or null.

**The main step**, on an active milestone with a numbered id, in this order: the first unstarted Contents item
(`/log-feature M2#3`, as status names it today, so the online and offline Next agree); else the first ready leaf,
in Contents then sub-issue order, that overlaps nothing in progress; else what §4 says when none is ready.
Work-order today picks ready leaves before shaping; under one function it shapes first and builds beside it, so
the agent sessions that build run while the owner answers the shaping questions. This amends F-07's "Next" rule:
the decision of §8 carries `Amends: F-07`.

**Safe to run beside it**, all of these at once (the owner, Q1):

1. it waits on nothing open: its `waits` is null, or names a key no longer in the run;
2. its `files` are known (an array). Unknown is never offered in parallel; it can still be the main step;
3. its files overlap none of the main step's, none of any pull request in progress, and none of a thing already
   taken, by `overlap()`. `[]` overlaps nothing;
4. by the person rule (§1): a `you` thing is taken only when the owner is not busy and no `you` thing is taken yet;
5. its rank is 1 to 4. Rank 5 blocks nothing and stays in Needs attention.

Candidates are the owed things and the ready leaves other than the main step's, in rank order. A ready leaf ranks
1 (it blocks the active milestone closing) and sorts after the rank-1 owed things, in Contents then sub-issue order. **At most 3 in all, the main step included** (the
owner, Q2): In parallel holds at most 2. Work-order's page shows the same main step and parallel picks as its Next,
and `PICKS` becomes this module's `CAP = 3`.

`rest` is every owed thing not taken, in today's Needs attention order: a startable thing left out by the cap or the
person rule carries `It can start now, after the steps above.`; it is never dropped (the owner, Q2 and Q4).

### §4 What status prints

```
**Next:** {main step: 2 to 4 sentences, held to the form}

**In parallel:**
- (agent) Start #15 in a fresh session with /work-ticket 15. It is ready and shares no file with work in progress. It blocks M2 closing. It waits on nothing.
- (you) Run the owed check on M2 item 4 (#12) and post the result on #12. … It blocks M2 closing. It waits on nothing.

## Where things stand
- Step 0 · Bootstrap: done.
- Step 2 · Test the risk: in hand. Yours. It blocks every milestone past the skeleton. It waits on nothing.
…
- GitHub: read · 5 open pull requests, 2 of them by other people (counted, not listed) · 3 issues marked needs-shape

## Needs attention
- {rest, each line in §1's form}
```

**In parallel** replaces Also unblocked, which is removed (the owner, Q4). With nothing taken it is not printed.

**The Next line** keeps F-16 §2's text for every case, except on an active milestone with every item started:

| case | Next line | the main step's files |
|---|---|---|
| a ready leaf (online) | `Start #{n} in a fresh session with /work-ticket {n}. It is ready, and it shares no file with work in progress. {whoLine(5)}` | the issue's `Touches:`, or unknown |
| none ready, some in a pull request (online) | `Finish the open pull requests for {id} ({#a, #b and N more}). No other issue of {id} is ready yet. {whoLine(5)}` | those pull requests' files |
| none ready, none in a pull request (online) | `Clear what holds {id}'s open issues. None is ready, and the lines below say what each waits on. {whoLine(5)}` | unknown |
| every leaf done or dropped (online) | `Run /close-milestone for {id}. Every issue of it is closed. {whoLine(6)}` | `docs/**`, `decisions.md`, `process/lessons/**`, the feature docs folder |
| GitHub not read | `Finish {id}'s open issues, then run /close-milestone once its gate is green. Status did not read GitHub, so it cannot name the next issue. {whoLine(5)}` | unknown |

Each holds `nextFormBreaks()`; S1 holds the offline row and the tests of §9 the online rows. The other cases' main
step files: step 0, everything (`**`); step 1, `docs/**` and `decisions.md`; step 2, `docs/product/evidence/**` and
`docs/product/FRAME.md`; step 3, `docs/PRD.md` and `docs/reviews/**`; several active, choose the next bet and nothing
shaped, `docs/milestones/**` (the last with `docs/product/metrics.md`); appetite ended, as `/close-milestone` above;
shape an item, the milestone's file, the feature docs folder, `docs/PRD.md` and `decisions.md`; pick the next slice,
unknown; activate the skeleton, the `skeleton` row of §2.

**The step lines** (#385) gain the facts for a step that is not done: `- Step {n} · {name}: {state}. {Who}. It blocks
{words}. It waits on {words}.` Who is `STEPS[n].who`. Blocks: step 0, every other step; step 1, the PRD and every
milestone; step 2, `riskBlocks`'s words; step 3, a milestone going active; step 4, nothing status tracks; step 5, the
active milestone closing; steps 6 and 7 print `each milestone. {Who}.` and nothing more. Waits: step 2 `waiting` on
nothing; step 5 `waiting` on the value risks' results; else nothing. A `done` step prints `done.` only.

**Needs attention** keeps today's kind order, so a list reads as before with its facts added.

What every line prints: ids only in the shapes status validates today (`M<n>`, `RISK-n`, `F-n`, decision ids),
issue and pull request numbers, file paths from the tree through `named()`, fixed words, dates. Lines from GitHub
print less (§7).

### §5 The online part — `ci/checks/lib/github-state.mjs`

**When.** On `--hook` (every session start) and on `--online`, which the `status` script in `package.json` passes:
`node ci/status.mjs --write --online`. Never under `--refresh` (the Stop hook's turn-end rewrite), S1, `pnpm meta`,
`pnpm verify` or CI: no gate reads the network. STATE.md written by `--refresh` says `GitHub: not read (turn-end
refresh)`.

**How.** Status runs `node ci/checks/lib/github-state.mjs <root>` as a child with `spawnSync`, one budget of 5
seconds for every call together, killed with `SIGKILL` at the limit (the `--refresh` pattern). The child calls `gh`
through work-order's `realGh(root)`: a fixed argument array, never a shell, the PATH with the repository's and
`node_modules`' entries dropped, run from outside the repository, with the owner's own `gh` login; no new token.
`Issue repo` is read as work-order reads it (`settings(root)`).

**All or nothing** (the owner, Q3). The child prints one JSON object on stdout, and only when every call succeeded.
Any failure, a timeout part-way included, gives status no GitHub data at all: no GitHub line in In parallel or
Needs attention, no ticket in Next. A failure never fails the hook and never changes status's exit code. The reason
is one of fixed words, never `gh`'s own message:

| reason | when |
|---|---|
| `timed out after 5 seconds` | the child was killed at the limit |
| `gh is not installed` | `gh` was not found on the trusted PATH (`ENOENT`) |
| `gh is not signed in` | `gh` exited 4, its code for authentication required |
| `Issue repo is not set` | `settings(root)` found no `owner/name` |
| `more than 100 open pull requests` | `pullRequests.totalCount` above 100: a partial list would read as complete |
| `GitHub answered with an error` | any other non-zero exit, or output that is not the expected shape |

Status prints under Where things stand `- GitHub: not read ({reason})`, and in Needs attention one line:
`(you) {action}. Status did not read GitHub this time ({reason}), so open pull requests and issues are not listed. It
blocks nothing. It waits on GitHub.` The action, by reason: `Run pnpm status again`; `Install gh`; `Sign in with gh
auth login`; `Set Issue repo in AGENT.md`; `Open the pull requests on GitHub`; `Run pnpm status again`.

**What is read.** At most three calls:

1. `gh api graphql` with variables, never an interpolated value: `viewer { login }`; the repository's
   `pullRequests(states: OPEN, first: 100)` with `totalCount` and, per node, `number isDraft author { login }
   mergeable reviewDecision headRefOid baseRefOid body`, `closingIssuesReferences(first: 20) { nodes { number } }`,
   `files(first: 100) { totalCount nodes { path } }` and `commits(last: 1) { nodes { commit { statusCheckRollup {
   state } } } }`; `issues(states: OPEN, labels: ["needs-shape"], first: 100) { totalCount nodes { number } }`; and
   work-order's fields for the active milestone's item issues with their sub-issues (`collect()`'s first call,
   folded in). `body` is read only to match `Closes`/`Fixes`/`Resolves`/`Part of #n`, as work-order does today.
2. `state stateReason` of the `Blocked by` issues not already read (work-order's third call; skipped when none).
3. For each pull request by the viewer whose changed paths include a feature doc (`SPEC_PATH`) or a file under
   `docs/reviews/`: `object(expression: $e) { ... on Blob { text } }` for that doc at the head and at the base, and
   for each review the pull request changes at the head (skipped when none). Each expression is built from a commit
   id matching `^[0-9a-f]{40}$` and a path matching `SPEC_PATH` or `^docs/reviews/[A-Za-z0-9._-]{1,100}\.md$`, passed
   as a variable. At most 20 blobs; more makes the read `GitHub answered with an error`.

A pull request with more than 100 changed files has unknown files. `statusCheckRollup.state` `SUCCESS` is green,
`FAILURE` or `ERROR` red, anything else neither. The child keeps, per pull request: number, draft, whether the viewer
wrote it, mergeable, review decision, rollup, closing issue numbers, the issue numbers its body names, changed paths
and, for each doc, its `Version:` lines at base and head and whether a review at the head (the tree's own
`docs/reviews/` plus the ones the pull request changes) quotes the head's line as current (`quotedVersion()`). Text
is cut at 500 characters a line before a pattern reads it. Nothing else of a body, a title, a label, a branch or a
check reaches status.

**A session is on an issue** when an open pull request closes it or names it (`Part of #n`): that leaf is in
progress, as work-order's `pr` state.

### §6 Waiting on you: the closed list

Only pull requests the viewer wrote are listed (the owner, Q3). Pull requests by other people count on the GitHub
line and are never listed, so no line points an agent at another person's branch.

| kind | when | line | who | blocks (rank) | files |
|---|---|---|---|---|---|
| `merge` | not a draft, rollup green, `MERGEABLE`, review decision not `CHANGES_REQUESTED` | `Merge #{n}. It is ready and its checks are green. An agent asks you first and never merges it itself.` | you | what its closing issues block: the active milestone closing when one is a leaf (1); else nothing status tracks (5) | none |
| `review-owed` | a feature doc's `Version:` line at the head differs from the base's and no review at the head quotes it as current | `Run /review-doc in a fresh session on #{n}'s branch. Its feature doc ({F-id}) is at {version}, and no review names that version.` | fresh session | #{n} going ready, which the pull-request check holds (3) | `docs/reviews/**` |
| `red-check` | not a draft, rollup red | `Look at the red check on #{n}. It is marked ready and a check failed.` | you or an agent | as `merge` | that pull request's files |
| `needs-shape` | an open issue labelled exactly `needs-shape` | `Shape #{n} in a fresh session with /log-feature. It asks you its open questions.` | you | the issue's build: the active milestone closing when it is a leaf (1); else (3) | the feature docs folder, `docs/milestones/**`, `decisions.md` |

`{F-id}` prints only as `F-\d{1,9}` read from the doc's heading at the head, else `the doc`; `{version}` only as
digits and dots (`\d{1,4}(\.\d{1,4}){0,3}`), else `a version`. More than 3 `needs-shape` issues outside the active
milestone print as one line: `Shape the {k} issues marked needs-shape (#a, #b, #c and {k-3} more), each in a fresh
session with /log-feature.`

### §7 What status prints from GitHub

Numbers, the ids of §6 in their shapes, the closed list's fixed words and the reason words of §5. Never an issue or
pull request title, a label name, a file path, an author, a branch name, a check name or any other text GitHub
returns (the owner and #501). Paths read from GitHub feed only the overlap test. `Start #14 … /work-ticket 14` is
built from the number. Each line still goes through `escapeControl`.

### §8 The decision the owner records

Proposed here, recorded by the owner in `decisions.md` with the next free id before Build map step 4 merges. Its
text:

> **D-0nn — `pnpm status` reads open pull requests and issues from GitHub at session start, within five seconds,
> and says plainly when it did not** *(decided {date})*
>
> Amends: F-17, F-07
>
> A project's next ticket and what waits on its owner live on GitHub, so an offline status cannot name either.
>
> - **One read, on two occasions.** At session start (`--hook`) and on `pnpm status`, status reads the repository's
>   open pull requests and issues through the owner's own `gh` login, under one 5-second budget for every call.
>   It reads nothing else from the network. The turn-end refresh, every check, `pnpm verify` and CI stay offline.
> - **All or nothing.** A failure or a timeout part-way shows none of what was read, and one line says GitHub was
>   not read and why, in fixed words. It never fails the hook.
> - **Safe shapes only.** Status prints numbers, ids, fixed words and the reason; never a title, label, path,
>   author or branch. Pull requests by other people are counted, never listed.
> - **The page and status name the same work.** `pnpm work-order`'s picks come from the same function as status's
>   plan: the main step and at most two beside it.
>
> Amends D-022's "Declined: live state in `pnpm status`" and D-020's "Status stays offline" for this read only:
> status still works with no network and says when it has none. Spec: `dev/features/parallel-plan.md`.

### §9 Fixtures and tests

**Status fixtures** under `ci/fixtures/status/`, each the smallest copy of an existing root:

| case | holds | expects |
|---|---|---|
| `parallel-existential` | the skeleton M1 active (an agent main step), M2 shaping, an untested existential risk the PRD resolves at M3 | `parallel` lists `(you) …` scheduling that risk's test, naming M2 going active |
| `parallel-parked` | a parked question with a tracker | the Parked line in `attention` saying nothing is to do now and naming the tracker; nothing in `parallel` |
| `parallel-waits` | a decision amending F-06 whose doc does not name it, and F-06's doc with no current review | `parallel` lists the owed citation only; the review is in `attention`, waiting on that citation |
| `parallel-person` | an owner main step (a value risk to test) and an open decision and an open question in the PRD | no `(you)` line in `parallel`; the open question in `attention` marked startable |
| `parallel-owner-order` | an agent main step, an untested value risk and an open question in the PRD | `parallel` lists the risk test, not the question; the question in `attention` marked startable |
| `parallel-skeleton` | the skeleton shaping beside an untested value risk | the skeleton in `parallel` for an agent |

S1's `also` key is renamed `parallel` and compares the In parallel list whole. The ten cases with an `also` key today
(`appetite-ended`, `build-loop-owed-unreadable`, `deadlines-toronto`, `hostile-existential-and-name`,
`hostile-markers`, `hostile-risk-active`, `review-quoted-only`, `skeleton-active`, `step3-no-review`, `two-active`)
change by the rename and the dropped duplicates; their `attention` and `steps` lists change by the facts of §2 and
§4. Each other change to an expected output is named in the pull request, case by case (the owner, Q4).

**Unit tests**, `scripts/plan.test.mjs`: each rule of §3 alone (waits, unknown files, overlap, person, rank 5, the cap
with the main step counted, the order within a rank, startable leftovers marked).

**Recorded GitHub answers**, `scripts/github-state.test.mjs` with a stubbed `gh` answering from
`scripts/fixtures/github-state/*.json`, as `scripts/work-order.test.mjs` does; no test calls GitHub:

- a draft pull request by the viewer whose feature doc's `Version:` moved with no review naming it: one
  `review-owed` line naming the pull request, the F-id, the version and the action;
- each kind of §6 and its negative (another author's ready green pull request: counted, not listed; a red check on
  another author's: not listed);
- each reason of §5, and a second call failing after the first succeeded: no GitHub line but the not-read one, and
  status within the budget (a stub that sleeps past 5 s);
- a pull request whose title, label, branch, author and changed path hold a sentinel string: the sentinel appears
  nowhere in status's output;
- a ready leaf whose `Touches:` overlaps an open pull request's changed path that its own `Touches:` did not name:
  the next ready leaf is picked instead;
- the same recorded answer through `collect()` and through status: work-order's Next and status's main step and In
  parallel name the same picks.

**`Touches:` lines that parse** (the owner, Q1). I1 (`ci/checks/meta/i1-issue-shape.mjs`) warns, never fails, on a
`Touches:` segment `touches()` cannot read, naming the first entry that breaks the rule. `process/intake.md` →
Issue body → `Touches:` gains one sentence: the line holds paths and globs only, and any note goes outside it.
`/log-feature`, `/log-followup` and `/log-bug` say the same where they write the line. The pull request that ships
this step reports how many open issues have a readable `Touches:` line on its day.

### Order and overlap

#501 (open, no pull request) changes `ci/status.mjs` and the readers it calls; whichever builds second takes `main`
as it is, and this feature's lines are written to #501's rule from the start. `package.json`'s `meta` and `status`
lines change in step 4; each build pull request merges `main` before it is marked ready.

## Seams

none: what a project's own status prints from its own files and its own repository's open pull requests and
issues, read with the owner's own `gh` login. No person, channel or promise is added.

## Threat model

What this promises: the lines status prints from GitHub reach every session through the hook, and GitHub holds
other people's text (pull requests and issues from forks and strangers, their titles, bodies, branches, labels and
paths). Against that:

- **Nothing of theirs is printed** (§7). Only numbers, validated ids, fixed words and the reason words; paths feed
  the overlap test only. The sentinel test of §9 holds it.
- **No line points an agent at another person's work.** Their pull requests are counted, never listed; `merge` says
  an agent asks the owner and never merges.
- **No injection.** `gh` runs with a fixed argument array and no shell, on the trusted PATH, from outside the
  repository; the GraphQL query takes every value as a variable; a blob expression is built only from a 40-hex commit
  id and a path that passes `SPEC_PATH` or the review path pattern.
- **Bounded.** One 5-second budget, a killed child, at most three calls and 20 blobs, 100 pull requests, 100 files
  each, lines cut at 500 characters before any pattern, every pattern anchored or bounded. A slow or hostile answer
  costs the session five seconds and the GitHub lines, never the hook.
- **No gate reads it.** Checks, `pnpm verify` and CI stay offline, so nothing on GitHub can turn a gate green.

What it does not defend: the owner's own `gh` login and environment (D-023), and a pull request by the owner that
lies about its changed files (GitHub reports them; status trusts GitHub).

## Known limitations

- Offline, status cannot name the next ticket, and an agent main step with unknown files offers no file-writing
  thing beside it. The Next line says GitHub was not read.
- The turn-end refresh is offline, so STATE.md loses the GitHub lines until the next session start or `pnpm status`.
- `Touches:` is written at filing and can be wrong until a pull request exists; the changed paths correct it then.
  On 2026-10-23, 37 of slipway's 48 open issues with a `Touches:` line could be read; an unreadable line is unknown
  and never offered in parallel. I1's warning shows each one.
- The owner is treated as one person for the whole main step, so a long owner step ("yours, days to weeks") offers
  no owner work beside it for its whole length.
- `you or an agent` counts as agent work for the person rule; the line still says the owner may do it.
- The ticket pick needs an active milestone. Slipway itself runs under an epic with no milestone, so its own status
  names no ticket (F-07's epic deferral).
- More than 100 open pull requests: GitHub is not read at all, by the all-or-nothing rule.
- `needs-shape` is the only owner question status sees; a question in a comment is not read.
- Needs attention keeps today's kind order; only In parallel is ranked.

## Acceptance

```
Given the skeleton M1 active (an agent main step), M2 shaping, and an untested existential risk the PRD resolves
      after M2 starts
When  node ci/status.mjs <root>
Then  In parallel lists "(you)" scheduling that risk's test, naming M2 going active

Given a parked question with a tracker
Then  it is in Needs attention saying nothing is to do now and naming the tracker, and not in In parallel

Given two owed things where one waits on the other (an owed citation, and the review of the same feature)
Then  only the first is in In parallel; the second is in Needs attention, waiting on the first

Given an owner main step and owner things that wait on nothing
Then  no "(you)" line is in In parallel, and each is in Needs attention saying it can start now

Given an agent main step, an untested value risk and an open question in the PRD
Then  In parallel lists the risk test and not the question

Given the skeleton shaping beside an untested value risk
Then  In parallel lists activating the skeleton for an agent, judged by its file list

Given every existing case under ci/fixtures/status/
When  node ci/checks/meta/s1-status.mjs ci/fixtures/status
Then  it exits 0; the ten cases with an `also` key change by the rename to `parallel` and the dropped duplicates, and
      every other changed expected line is named in the pull request, case by case

Given a recorded GitHub answer with an open draft pull request by the viewer whose feature doc's Version: line
      moved with no review naming it
When  status reads it
Then  one line names the pull request, the F-id, the version and the action /review-doc in a fresh session

Given GitHub cannot be reached, gh is missing, gh is not signed in, or the second call fails after the first
Then  status prints its offline view, one line saying GitHub was not read with the reason in fixed words, no other
      GitHub line, and exits 0 within the 5-second budget

Given a ready green mergeable pull request by another author, and one with a red check by another author
Then  neither is listed; the GitHub line counts them

Given a recorded answer whose title, label, branch, author and changed path hold a sentinel
Then  the sentinel appears nowhere in status's output

Given an active milestone whose items are all started, two ready leaves, and an open pull request whose changed
      path overlaps the first leaf's Touches:
Then  Next is "Start #<second> in a fresh session with /work-ticket <second>. …" and it holds the Next form

Given an active milestone with an unstarted item and a ready leaf, online
Then  Next shapes the item with /log-feature, and In parallel lists the ready leaf for an agent

Given the same recorded answer
When  collect() and status run on it
Then  work-order's Next and status's main step and In parallel name the same work, at most 3 in all

Given an issue body whose Touches: line holds a note in words
When  node ci/checks/meta/i1-issue-shape.mjs on it
Then  a warning names the entry, and the exit code is unchanged

Given slipway's own tree
When  pnpm meta
Then  it exits 0
```

## Verify

```
node scripts/plan.test.mjs                                # §3's rules, one test each
node scripts/github-state.test.mjs                        # §5–§7 from recorded answers; no test calls GitHub
node scripts/work-order.test.mjs                          # work-order reads the shared picks
node ci/checks/meta/s1-status.mjs ci/fixtures/status      # every status case, the six new ones included
node ci/checks/meta/pc1-positive-control.mjs              # known-bad cases still fail as recorded
pnpm meta
```

## Build map

Each step merges on its own with the gate green. Steps 1 and 3 share no file and can run side by side.

1. **The planner and owed things as data** — `ci/checks/lib/plan.mjs`, status's owed list moved into
   `ci/checks/lib/owed.mjs` with §2's facts, `decision-lines.mjs` returning owed things; status prints what it
   prints today. `scripts/plan.test.mjs`. ~400 lines.
2. **Status prints the plan** — In parallel replaces Also unblocked, every line in §1's form, the step lines' facts;
   the six new fixtures; S1's `also` → `parallel`; every changed expected line named. Blocked by step 1. ~500 lines,
   most of them fixtures.
3. **`Touches:` lines that parse** — I1's warning, the `process/intake.md` sentence, the three `log-` skills;
   the count of readable lines on its day. Owner-only files, each asked for at its edit.
4. **The online part** — `ci/checks/lib/github-state.mjs`, the hook and `--online`, `package.json`'s `status`
   script, §6's kinds, the online Next rows, `ci/work-order.mjs` on the shared picks;
   `scripts/github-state.test.mjs`. Blocked by step 2, and by §8's decision being recorded. ~500 lines.

## Out of scope

- Starting anything in parallel automatically: status says what is safe; the owner or an agent starts it.
- A JSON output, or a file a pane reads: the plan is data exported from `ci/checks/lib/plan.mjs`, which a pane
  imports (the orchestrator session, Q5; as #385 left it).
- A cache of GitHub's answer (the owner, Q3).
- An epic as a source of tickets for a repository with no active milestone (F-07's deferral stands).
- Listing pull requests by other people, reading comments or review threads, or any owner question but
  `needs-shape`.
- Ranking Needs attention.

## Open questions

Each answered on 2026-10-23, brought one at a time with the orchestrator session's advice beside it.

- ~~Q1 (the owner): what "safe" reads for an agent's work before it starts.~~ The issue's `Touches:` line, plus a
  fixed file list per owed kind; unknown is never offered in parallel, and may still be the main step. Once a pull
  request is open, its changed paths count as well. Unreadable lines are made visible: intake writes paths only, I1
  warns, and the pull request reports how many parse. The owner is one person (§1–§3, §9).
- ~~Q2 (the owner): how many in parallel.~~ 3 in all, the main step counted, from one function work-order and status
  share; the rest stay in Needs attention marked startable (§3).
- ~~Q3 (the owner): how the online part reads GitHub, and what counts as waiting on the owner.~~ `gh` with the
  owner's login at every session start and on `pnpm status`, one 5-second budget, no cache, all or nothing, the
  reason in fixed words, never failing the hook; the four kinds, the owner's own pull requests only, `merge`
  addressed to the owner (§5–§7).
- ~~Q4 (the owner): fold Also unblocked into In parallel or keep it.~~ Folded, with a fixed order for the owner's
  work (a value risk before an open question), the ten `also` cases changing only by the rename and the duplicates
  bar what the pull request names, and a file list for the skeleton (§1–§2, §9).
- ~~Q5 (the orchestrator session): a form a pane can read.~~ The exported module; no new output.
- The decision of §8: the owner records it, with its id, before step 4 merges.

## Changes

- 2026-10-23 · ADDED · 0.1, shaped from #445
