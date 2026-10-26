---
prd-ref: D-050
status: draft
---

# F-17 — Parallel plan: `pnpm status` names the work that can start now, who does it, and what waits on you

Version: 0.3 (2026-10-25)

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

**Verdict: PROCEED**, as #445's six proposals in the shapes the owner picked on 2026-10-23, recorded as D-050 (Open
questions).

| option | for | against | verdict |
|---|---|---|---|
| do nothing | nothing new | "what's next" stays the author's memory; agents ignore a flat list | rejected |
| one plan from status's owed list and a short read of the owner's GitHub work (the ask, shaped) | answers "which ticket, and what waits on me" in one place, at session start | one network read in the hook; one more module | **proceeds** |
| send people to `pnpm work-order` | exists; already picks ready issues | a page nobody opens at session start; it knows nothing status owes, so its picks and status's Next disagree | rejected: the page reads the same plan instead (§3, §10) |
| rank Needs attention, keep it offline | no network | the build loop's next ticket and every pull request waiting on the owner stay invisible | rejected |
| cache GitHub's answer in a file | works with no network | a stale list reads as current; one more file to keep safe | rejected (the owner, Q3) |

## Fit

What this feature takes from the product it joins.

Reuses:
- `collect()`, `realGh()` and their picks in `ci/work-order.mjs` (F-07): the active milestone's issues read through
  `gh` (fixed arguments, no shell, the trusted PATH), a leaf's state (open, done, dropped, in a pull request), its
  `Blocked by:` and its readiness. The picks move to one shared function both read (§3, §10).
- `touches()`, `overlap()` and `blockers()` in `ci/checks/lib/issue-body.mjs`: the `Touches:` line and the overlap
  rule (a false overlap is the safe mistake; unknown overlaps everything).
- `trustedGit()` in `ci/checks/lib/manifest.mjs`: how a check runs git on the repository; the local branches are read
  through it (§5).
- `decisionLines()` in `ci/checks/lib/decision-lines.mjs` (F-15 §6): the line form this feature extends to every
  line, who first, "It blocks …. It waits on …." last.
- `STEPS` and `whoLine()` in `ci/checks/lib/steps.mjs` (#385, F-16 §2): who does each step and how long.
- `nextFormBreaks()` in `ci/checks/lib/next-form.mjs` (F-16 §2): every new Next line holds the form.
- `owedReviews()` and `SPEC_PATH` in `ci/checks/lib/spec-review.mjs`, `reviewProvenance()` and `quotedVersion()` in
  `ci/checks/lib/review-header.mjs`: whether a feature doc's version has a current review, as P1 and R1 read it;
  applied here to the doc and review texts at a pull request's head.
- `owing()`, `contents()`, `marker()` and `started()` in `ci/checks/lib/milestones.mjs`: an item's owed checks and
  its issue.
- The `--refresh` pattern in `ci/status.mjs:43`–`48`: work in a child process killed at a limit, so a read that
  never returns cannot hold the hook.
- `escapeControl()` and `excerpt()` in `ci/checks/lib/report.mjs`, status's `named()`, and `escapeHtml()` in
  `ci/checks/lib/html.mjs` for the page: how each prints.
- The `needs-shape` label `.github/workflows/issue-shape.yml` sets on an issue whose body fails I1.
- S1's `expect.json` form (`ci/checks/meta/s1-status.mjs`) and work-order's stubbed `gh` in
  `scripts/work-order.test.mjs`: fixtures and recorded GitHub answers, so no test calls GitHub.

Numbers:
- The counts on the GitHub line (the owner's open pull requests, everyone else's, the owner's and everyone else's
  issues marked `needs-shape`) and the "and N more" counts are computed once, in `ci/checks/lib/github-state.mjs`;
  status and the page print them.
- The cap (3, the main step included) is one constant in `ci/checks/lib/plan.mjs`; work-order's `PICKS` becomes it.
- The 2 days after which a quiet claiming branch is named stale is one constant in `ci/checks/lib/github-state.mjs`.
- The count of open pull requests from this repository's own branches by another account (#535) is computed once, in
  `ci/checks/lib/github-state.mjs`.

New: `ci/checks/lib/plan.mjs`, the planner. Nothing today ranks what status owes, judges whether two pieces of
work collide, or tells the owner's work from an agent's: work-order judges collision for milestone issues only, and
status not at all. `ci/checks/lib/github-state.mjs`, the read of the owner's open pull requests and branches:
work-order reads the issues of milestone items and which pull request names each, never a pull request's
readiness, checks or changed files, nor a branch.

## Contract

Verified against: bff0897 2026-10-25 (`main` has not moved since 2026-10-23). The code-state claims below were re-read
on `main` at that commit, and `gh help exit-codes` (4: "requires authentication") on 2026-10-25:
`ci/status.mjs` (`next()` at `:379`, Also unblocked at `:422`–`:435`, Needs attention at `:467`–`:484`, `--refresh`
at `:43`–`:48`, `--hook` at `:514`), `ci/work-order.mjs` (`PICKS = 3` at `:29`, `collect()` at `:91`, `gh pr list`
at `:109`, picks at `:140`–`:147`), `ci/checks/lib/issue-body.mjs` (`touches()`, `overlap()`: null overlaps all),
`ci/checks/lib/decision-lines.mjs`, `ci/checks/lib/steps.mjs` (`STEPS[4]` and `STEPS[5]` are `agent`),
`ci/checks/lib/next-form.mjs`, `ci/checks/lib/spec-review.mjs`, `.github/workflows/issue-shape.yml` (labels any
opened or edited issue whose body fails I1), `process/harness/hooks/session-state.sh` (runs `ci/status.mjs --hook`),
`scripts/report.test.mjs:78` and `scripts/harness-base.test.mjs:221` (gate tests that run `--hook`), `package.json`
(`status` runs `node ci/status.mjs --write`), `.claude/skills/work-ticket/SKILL.md` (296 lines),
`.claude/skills/log-feature/SKILL.md` (300 lines; the cap is 300). On 2026-10-23 slipway had 63 open issues: 48
carry a `Touches:` line and 37 of those parse (`touches()` returns entries).

Decisions this rests on, in words: status is computed, never hand-kept, and runs in every session's hook [D-020];
the work order is a local page over the milestone and GitHub state, and parallel-safety is declared at intake on the
`Touches:` line [D-022]; status reads the owner's GitHub work once at session start and on `pnpm status`, for the plan
only, all or nothing, and lists and steers by the owner's work alone; a claim is never released by age; what brings
the bot case back is a count status prints, never a sentence to remember [D-050, amending D-020 and D-022 for that
read; it reopens when #535 closes];
every status line says who acts, what it blocks and what it waits on [D-045, as F-15 §6 wrote it]; status's text
follows `process/writing.md` and the Next line holds its form [D-046]; owners get product questions in the project's
words [D-016]; project and GitHub text is printed only in safe shapes (#501).

### §1 An owed thing

Every line status prints for a person, bar the Next line and the state lines, comes from one owed thing:

```js
{
  kind,      // a key from §2's or §6's table
  key,       // unique in the run: kind plus the ids it names ("owed-check:M2:4")
  who,       // 'you' | 'you and an agent' | 'agent' | 'you or an agent' | 'fresh session' | 'nobody'
  text,      // the action and the reason: one to three sentences, as process/writing.md has it
  blocks: { rank, words, date },   // rank 1–5 (below); words: what it blocks, said in the line
  waits,     // null, or the key of another owed thing, or a fixed phrase ("its doc", "GitHub")
  files,     // the paths and globs it writes: an array, [] for none, or null for unknown
}
```

Status prints `(who) {text} It blocks {words}. It waits on {waits in words, or nothing}.` A thing of rank 1 to 4
that waits on nothing and was not taken adds `It can start now, after the steps above.` before `It blocks`; rank 5
never does. `who: 'nobody'` prints no parenthesis: a parked question reads `Parked: … — nothing to do now. It blocks
nothing. It waits on #12.` The page (§10) renders the same things in its own form.

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
agent sessions run side by side, so they collide by files only. `you and an agent` is both. The owner is one person:
the owner is busy when the main step's who, read from §4's table (never from `STEPS`), is `you`, `yours` or `you and
an agent`. Status never offers two of the owner's things at once, the main step included (the owner, Q1). Shaping a
Contents item is the owner's work and an agent's: the owner answers `/log-feature`'s questions (the owner, AR-1).

### §2 Who, blocks and waits for every line

Each line status prints today keeps its action and reason, rewritten only where §4 says, and gains its facts. Paths
in this table are the files the thing writes.

| kind | the line today starts | who | blocks (rank) | waits on | files |
|---|---|---|---|---|---|
| `prd-review` | Run /review-doc docs/PRD.md | fresh session | the PRD's approval, which a milestone needs (2) | nothing | `docs/reviews/**` |
| `prd-approve` | Resolve the review's findings | you | the PRD's approval, which the next milestone needs (2) | nothing | `docs/PRD.md` |
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
| `shape` | (§3) Shape item {k} of {id} with /log-feature {id}#{k} | you and an agent | the milestone's next builds (1, sorted as §3 says) | nothing | the milestone's file, the feature docs folder, `docs/PRD.md`, `decisions.md` |
| `github-unread`, `stale-claim`, `unplannable`, `review-unchecked`, `branches-unread` | (§5) | you | nothing (5), or §5's words | GitHub, or nothing | none |
| `other-account` | (§5, #535) N pull requests from this repo's branches were opened by another account | you | nothing (5) | nothing | none |
| `merge`, `review-owed`, `red-check`, `needs-shape` | (§6) | §6 | §6 | §6 | §6 |

The F-15 lines keep their wording (three reviews fixed it); `decision-lines.mjs` returns each as an owed thing
whose `text` is today's line less its two closing sentences, which §1 rebuilds from `blocks` and `waits` to the same
words. Also unblocked's PRD review and open-questions summary are dropped: the `prd-review` and `open-question`
lines already say them (the owner, Q4).

**Work in progress** is an open pull request by the owner, or a ticket a branch claims (§5). An open pull request's
files are its issue's `Touches:` entries together with its changed paths (the owner, Q1: `Touches:` is a guess made at
filing; the diff is what happened). A claim with no pull request has its issue's `Touches:`, or unknown. Pull requests
by anyone else are counted only: never read for files or text, and never in progress (the owner, AR-8). Paths read
from GitHub feed the overlap test and are never printed (§7).

### §3 The planner — `ci/checks/lib/plan.mjs`

One zero-dependency module with no `process.exit`. Status and `ci/work-order.mjs` both call it, so the page and
status name the same main step and picks in the same order (the owner, Q2 and AR-2):

```js
plan({ main, owed, leaves, inProgress, shape, online }) → { main, parallel: [...picks], rest: [...owed] }
```

A pick is an owed thing or a ready leaf. `main`: the main step as §4 gives it, `{ who, files, issue? }`. `owed`: §1's
things. `leaves`: the active milestone's leaves (ready or not, each with `touches` and whether it is claimed), empty
offline. `inProgress`: the files of each piece of work in progress (§2), empty offline. `shape`: the first unstarted
Contents item, or null. `online`: whether GitHub was read.

**The main step, online,** on an active milestone with a numbered id, by work-order's order (the owner, AR-1): the
first ready leaf, in Contents then sub-issue order, that nothing claims and that overlaps no work in progress. Shaping
takes a place only when fewer than three builds are ready: with no ready leaf, the main step shapes the first unstarted
item; with one or two, shaping is offered beside them while the owner is free. Shaping then sits among the three
places as work-order's shaping pick does today, so nothing is lost.

**The main step, offline,** is today's: shape the first unstarted item when there is one, since readiness cannot be
read; else §4's "GitHub not read" row.

**Safe to run beside it**, all of these at once (the owner, Q1):

1. it waits on nothing open: its `waits` is null, or names a key no longer in the run;
2. its `files` are known (an array). Unknown is never offered in parallel; it can still be the main step;
3. its files overlap none of the main step's, none of any work in progress, and none of a pick already taken, by
   `overlap()`. `[]` overlaps nothing;
4. by the person rule (§1): a thing whose who is `you` or `you and an agent` is taken only when the owner is not busy
   and no such thing is taken yet;
5. its rank is 1 to 4. Rank 5 blocks nothing and stays in Needs attention.

Candidates are the owed things and the ready, unclaimed leaves other than the main step's, in rank order. A ready leaf
ranks 1 (it blocks the active milestone closing) and sorts after the rank-1 owed things, in Contents then sub-issue
order. Shaping (§2's `shape` row) sorts directly after the ready leaves and ahead of every rank-2 owed thing, so it
takes the owner's one place before a risk test or an open question does (AR-4 of the 0.2 review): work-order's
shaping pick, which this plan replaces, came straight after its builds. **At most 3 in all, the main step included** (the owner, Q2): In
parallel holds at most 2. `PICKS` in `ci/work-order.mjs` becomes this module's `CAP = 3`.

**Offline,** work in progress is not known. A pick offered while `online` is false ends with `Status did not read open
pull requests, so check them for the same files first.` before `It blocks`.

`rest` is every owed thing not taken, in today's Needs attention order; a startable thing left out by the cap or the
person rule carries `It can start now, after the steps above.`, and is never dropped (the owner, Q2 and Q4).

### §4 What status prints

```
**Next:** {main step: 2 to 4 sentences, held to the form}

**In parallel:**
- (agent) Start #15 in a fresh session with /work-ticket 15. It is ready, and it shares no file with work in progress. It blocks M2 closing. It waits on nothing.
- (you or an agent) Run the owed check on M2 item 4 (#12) and post the result on #12. … It blocks M2 closing. It waits on nothing.

## Where things stand
- Step 0 · Bootstrap: done.
- Step 2 · Test the risk: in hand. Yours. It blocks every milestone past the skeleton. It waits on nothing.
…
- GitHub: read · 5 open pull requests of yours, 2 by other people (counted, not read) · 3 issues of yours marked needs-shape, 4 by other people

## Needs attention
- {rest, each line in §1's form}
```

**In parallel** replaces Also unblocked, which is removed (the owner, Q4). With nothing taken it is not printed.

**The Next line** keeps F-16 §2's text for every case but these. The who column is what the person rule reads (§1):

| case | Next line | who | the main step's files |
|---|---|---|---|
| shape an item (online and offline) | F-16's text, its last sentence `You and an agent, {STEPS[5].time}.` | you and an agent | the milestone's file, the feature docs folder, `docs/PRD.md`, `decisions.md` |
| a ready leaf (online) | `Start #{n} in a fresh session with /work-ticket {n}. It is ready, and it shares no file with work in progress. {whoLine(5)}` | agent | the issue's `Touches:`, or unknown |
| no leaf can be offered, some work in progress (online): every ready leaf is claimed, overlaps that work, or has unknown files | `Finish the open work on {id} ({#a, #b and N more}). No other issue of {id} can start beside it yet. {whoLine(5)}` | agent | that work's files |
| no leaf is ready, none in progress (online) | `Clear what holds {id}'s open issues. None is ready, and the lines below say what each waits on. {whoLine(5)}` | agent | unknown |
| every leaf done or dropped (online) | `Run /close-milestone for {id}. Every issue of it is closed. {whoLine(6)}` | you | `docs/**`, `decisions.md`, `process/lessons/**`, the feature docs folder |
| GitHub not read | `Finish {id}'s open issues, then run /close-milestone once its gate is green. Status did not read GitHub, so it cannot name the next issue. {whoLine(5)}` | agent | unknown |

Each holds `nextFormBreaks()`; S1 holds the offline rows and the tests of §9 the online rows. The other cases, with
who from `STEPS` and these files: step 0, everything (`**`); step 1, `docs/**` and `decisions.md`; step 2,
`docs/product/evidence/**` and `docs/product/FRAME.md`; step 3, `docs/PRD.md` and `docs/reviews/**`; several active,
choose the next bet and nothing shaped, `docs/milestones/**` (the last with `docs/product/metrics.md`); appetite
ended, as `/close-milestone` above; pick the next slice, unknown; activate the skeleton, the `skeleton` row of §2.

**The step lines** (#385) gain the facts for a step that is not done: `- Step {n} · {name}: {state}. {Who}. It blocks
{words}. It waits on {words}.` Who is `STEPS[n].who`. Blocks: step 0, every other step; step 1, the PRD and every
milestone; step 2, `riskBlocks`'s words; step 3, a milestone going active; step 4, nothing status tracks; step 5, the
active milestone closing; steps 6 and 7 print `each milestone. {Who}.` and nothing more. Waits: step 5 `waiting` on
the value risks' results; else nothing. A `done` step prints `done.` only.

**Needs attention** keeps today's kind order, so a list reads as before with its facts added.

What every line prints: ids only in the shapes status validates today (`M<n>`, `RISK-n`, `F-n`, decision ids),
issue and pull request numbers, file paths from the tree through `named()`, fixed words, dates. Lines from GitHub
print less (§7).

### §5 The online part — `ci/checks/lib/github-state.mjs`

**When.** On `--hook` (every session start) and on `--online`, which the `status` script in `package.json` passes:
`node ci/status.mjs --write --online`. **Never** when `CI`, `CHECK_TODAY` or `CHECK_NOW` is set (every status test fixes
the clock with one of the last two), whatever the flags, and never under `--refresh` (the Stop hook's turn-end
rewrite): no gate and no test reads the network. A run that skips the read for these reasons prints `- GitHub: not read
(offline run)` and no Needs attention line for it. STATE.md written by `--refresh` says `GitHub: not read (turn-end
refresh)`.

**How.** Status runs `node ci/checks/lib/github-state.mjs <root>` as a child with `spawnSync`, one budget of 5
seconds for every call together, killed with `SIGKILL` at the limit (the `--refresh` pattern). Status's own offline
work runs before and after it, so a run takes at most 5 seconds more than the same root offline. The child calls `gh`
through work-order's `realGh(root)`: a fixed argument array, never a shell, the PATH with the repository's and
`node_modules`' entries dropped, run from outside the repository, with the owner's own `gh` login; no new token.
`Issue repo` is read as work-order reads it (`settings(root)`).

**All or nothing** (the owner, Q3). The child prints one JSON object on stdout, and only when every call succeeded.
Any failure, a timeout part-way included, gives status no GitHub data at all: no GitHub line in In parallel or
Needs attention, no remote claim, no ticket in Next. A failure never fails the hook and never changes status's exit
code. The reason is one of fixed words, never `gh`'s own message:

| reason | when | action |
|---|---|---|
| `timed out after 5 seconds` | the child was killed at the limit | `Run pnpm status again` |
| `gh is not installed` | `gh` was not found on the trusted PATH (`ENOENT`) | `Install gh` |
| `gh is not signed in` | `gh` exited 4, its code for authentication required (`gh help exit-codes`), or exited 1 with `HTTP 401` in its stderr, which an expired or revoked token gives; the stderr is matched, never printed | `Sign in with gh auth login` |
| `Issue repo is not set` | `settings(root)` found no `owner/name` | `Set Issue repo in AGENT.md` |
| `more than 100 open pull requests of yours` | the owner's own open pull requests number above 100 | `Open your pull requests on GitHub` |
| `GitHub answered with an error` | any other non-zero exit, or output that is not the expected shape | `Run pnpm status again` |

Status prints under Where things stand `- GitHub: not read ({reason})`, and in Needs attention one line:
`(you) {action}. Status did not read GitHub this time ({reason}), so open pull requests and issues are not listed. It
blocks nothing. It waits on GitHub.`

**What is read.** At most three calls:

1. `gh api graphql` with variables, never an interpolated value:
   - `viewer { login }`;
   - the owner's open pull requests, `search(query: $mine, type: ISSUE, first: 100)` with `$mine` = `repo:{repo} is:pr
     is:open author:@me`, its `issueCount` and, per node, `number isDraft mergeable reviewDecision headRefOid
     baseRefOid body`, `closingIssuesReferences(first: 20) { totalCount nodes { number } }`, `files(first: 100) {
     totalCount nodes { path } }` and `commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }`;
   - `repository { pullRequests(states: OPEN, first: 100) { totalCount nodes { isCrossRepository author { login } } }
     }`: everyone's count, so the others' is the difference, and for #535 the two fields the owner allowed, from which
     the child counts the pull requests from this repository's own branches (`isCrossRepository` false) whose author is
     not the viewer. Nothing else of those pull requests is read. Above 100, the count is of the first 100 and its line
     reads `100 or more`; it never switches the read off;
   - the owner's `needs-shape` issues, `search(query: $shape, type: ISSUE, first: 100)` with `$shape` =
     `repo:{repo} is:issue is:open label:needs-shape author:@me`, numbers and `issueCount`; and everyone's,
     `issues(states: OPEN, labels: ["needs-shape"]) { totalCount }`;
   - work-order's fields for the active milestone's item issues with `subIssues(first: 50) { totalCount nodes {…} }`
     (`collect()`'s first call, folded in), and for each issue and sub-issue
     `closedByPullRequestsReferences(includeClosedPrs: false) { totalCount }`: how many open pull requests, anyone's,
     are linked to close it, a count and nothing else (§5 Claims);
   - `refs(refPrefix: "refs/heads/", first: 100, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) { totalCount
     nodes { name target { ... on Commit { committedDate } } } }`: the remote branches, once, unfiltered; the child
     matches each leaf's claim pattern against them (AR-3 of the 0.2 review), so the read stays three calls.
2. `state stateReason` of the `Blocked by` issues not already read (work-order's third call; skipped when none).
3. For each of the owner's pull requests whose changed paths include a feature doc or a file under `docs/reviews/`:
   `object(expression: $e) { ... on Blob { text } }` for that doc at the head and at the base, and for each review the
   pull request changes at the head (skipped when none). Each expression is a commit id matching `^[0-9a-f]{40}$`, a
   colon, and a path matching `^[A-Za-z0-9._/-]{1,200}$` and also `SPEC_PATH` or `^docs/reviews/[A-Za-z0-9._-]{1,100}\.md$`,
   passed as a variable. At most 20 blobs a pull request.

**Caps, each said, never silent** (AR-9). The owner's pull requests above 100: the read fails, with its reason, since
a partial list would read as complete. Everyone else's are only counted, so their number never switches the read off.
A pull request with more than 100 changed files has unknown files. A pull request with more than 20 closing issues
blocks what its first 20 block, and its line says `and more`. A pull request needing more than 20 blobs is not checked
for `review-owed`, and one `review-unchecked` line says so: `(you) Check by hand that #{n}'s feature doc has a current
review. Status would have to read too many of its files. It blocks nothing. It waits on nothing.` An item whose issue
has more than 50 sub-issues has unknown leaves, and one `unplannable` line says so: `(you or an agent) Split {id} item
{k}. Its issue has more than 50 sub-issues, so status cannot plan it. It blocks nothing status tracks. It waits on
nothing.` More than 100 remote branches: every open leaf counts as claimed, so no ticket is offered, and one
`branches-unread` line says `(you) Delete the merged branches on GitHub. The repository has more than 100 branches, so
status cannot tell which tickets are free. It blocks every ticket being offered. It waits on nothing.` More than 100
of the owner's `needs-shape` issues: the first 100 are planned, and the grouped line's count reads from `issueCount`
with `and more` (AR-12 of the 0.2 review).

`statusCheckRollup.state` `SUCCESS` is green, `FAILURE` or `ERROR` red, anything else neither. The child keeps, per
pull request: number, draft, mergeable, review decision, rollup, closing issue numbers, the issue numbers its body
names (`Closes`, `Fixes`, `Resolves`, `Part of #n`, as work-order reads them), changed paths and, for each feature doc,
whether its `Version:` line at the head differs from the base's (a doc with no line at the base counts as moved) and
whether a review at the head quotes the head's line as current (`quotedVersion()`). The reviews at the head are those
the pull request changes and those in the session's own `docs/reviews/`. Text is cut at 500 characters a line before
a pattern reads it. Nothing else of a body, a title, a label, a branch name or a check reaches status.

**Claims** (the owner, AR-7). A branch claims leaf `#n` when its name matches `(^|/)i{n}-` (so `i15-` never matches
`i150-` or a word that contains it). Local branches are read with `git for-each-ref refs/heads` through `trustedGit()`,
online and offline, with each branch's last commit date. Remote branches are the ones call 1 returns, inside the
budget and the all-or-nothing rule. A claimed leaf is in progress, as one with an open pull request is. Only an
account with write access can push a branch to the repository, so a collaborator running `/work-ticket` claims a
ticket this way (the owner, AR-8).

**A claim is never released by age** (the owner, 2026-10-25): "a stale branch keeps claiming its ticket … #15 is never
offered again until the branch is deleted. A false claim is the safe mistake." `/work-ticket`'s first push carries an
empty claim commit (`git commit --allow-empty -m "claim #n"`), so a fresh claim is dated by that commit, never by the
`main` commit it was cut from (AR-1 of the 0.2 review). A claim is **quiet** when its branch's last commit is more than
2 days before status's now, no open pull request of the owner's names the leaf, and the leaf's
`closedByPullRequestsReferences` count is 0, so no one's open pull request is linked to it (AR-2). A quiet claim keeps
claiming, and one `stale-claim` line, in the owner's words, says `(you) A stale branch holds #{n}: resume it or delete
it. It has had no commit for 2 days, and no open pull request is linked to #{n}. It blocks #{n} being offered. It
waits on nothing.` Offline, no claim is ever called quiet, since status has read no pull request. No branch name is
printed.

**Another account's pull requests** (the owner, AR-8 of the 0.2 review; #535). When the count call 1 makes is above 0,
Needs attention prints one `other-account` line in the owner's words: `{N} pull requests from this repo's branches were
opened by another account: D-050 reopens; decide whether to trust it.` With the count 0, or GitHub not read, nothing.
This is what brings back D-050's declined trust of other accounts, so no trigger rests on memory.

### §6 Waiting on you: the closed list

Only the owner's own pull requests, and the `needs-shape` issues the owner opened, are listed (the owner, Q3, AR-3,
AR-8). Everyone else's are counted on the GitHub line and never read, so no line points an agent at another person's
work.

| kind | when | line | who | blocks (rank) | files |
|---|---|---|---|---|---|
| `merge` | not a draft, rollup green, `MERGEABLE`, review decision not `CHANGES_REQUESTED` | `Merge #{n} yourself. It is ready and its checks are green. An agent asks you and never merges it.` | you | what its closing issues block: the active milestone closing when one is a leaf (1); else nothing status tracks (5) | none |
| `review-owed` | a feature doc's `Version:` line moved (§5) and no review at the head quotes it as current | `Run /review-doc in a fresh session on #{n}'s branch. Its feature doc ({F-id}) is at {version}, and no review names that version.` | fresh session | #{n} going ready, which the pull-request check holds (3) | `docs/reviews/**` |
| `red-check` | not a draft, rollup red | `Look at the red check on #{n}. It is marked ready and a check failed.` | you or an agent | as `merge` | that pull request's files |
| `needs-shape` | an open issue the owner opened, labelled exactly `needs-shape` | `Shape #{n} in a fresh session with /log-feature #{n}. It reshapes #{n} in place and asks you its open questions.` | you and an agent | the issue's build: the active milestone closing when it is a leaf (1); else (3) | the feature docs folder, `docs/milestones/**`, `decisions.md` |

`{F-id}` prints only as `F-\d{1,9}` read from the doc's heading at the head, else `the doc`; `{version}` only as
digits and dots (`\d{1,4}(\.\d{1,4}){0,3}`), else `a version`. More than 3 of the owner's `needs-shape` issues
outside the active milestone print as one line: `Shape the {k} issues of yours marked needs-shape (#a, #b, #c and
{k-3} more), each in a fresh session with /log-feature #n.`

### §7 What status prints from GitHub

Numbers, the ids of §6 in their shapes, the closed list's fixed words and the reason words of §5. Never an issue or
pull request title, a label name, a file path, an author, a branch name, a check name or any other text GitHub
returns (the owner and #501). Paths read from GitHub feed only the overlap test. `Start #14 … /work-ticket 14` is
built from the number. Each line still goes through `escapeControl`. These rules govern what reaches a session start;
the page keeps its own display (§10).

### §8 The decision: D-050

Recorded by the owner on 2026-10-23, in this feature's pull request (AR-11 of the 0.1 review): status reads the
owner's GitHub work once at session start and on `pnpm status`, within five seconds, for the plan only, all or
nothing, and lists and steers by the owner's work alone; the page and status name the same work from one function;
it amends D-020's "Status stays offline" and D-022's "Declined: live state in `pnpm status`" for that read, each of
which carries a dated line pointing at D-050. It carries `Amends: F-17, F-07`: this doc names it here and in
`prd-ref:`; F-07's doc names it in its Open questions now, and in its Contract at Build map step 5 (§10). On
2026-10-25 the owner's answers on the 0.2 review went into it: a claim is never released by age, and `Reopens when:
#535 closes`, the issue that builds the `other-account` line (§5) in place of a prose trigger. Status reads that
condition at the pull request that closes #535 (F-15 §3), and the line is the trigger after that.

### §9 Fixtures and tests

**Status fixtures** under `ci/fixtures/status/`, each the smallest copy of an existing root:

| case | holds | expects |
|---|---|---|
| `parallel-existential` | frame framed, PRD approved with a Resolves by column, every value risk tested, the skeleton M1 shaping (an agent main step: activate it), M2 shaping, an untested existential risk the PRD resolves at M3 | `parallel` lists `(you) …` scheduling that risk's test, naming M2 going active, with the offline sentence |
| `parallel-parked` | a parked question with a tracker | the Parked line in `attention`, saying nothing is to do now and naming the tracker; no `parallel` |
| `parallel-waits` | a draft PRD with no review (an owner main step), a decision amending F-06 whose doc does not name it, and F-06's doc with no current review | `parallel` lists the owed citation (`you or an agent`); the review is in `attention`, waiting on that citation |
| `parallel-person` | an untested value risk with no milestone underway (an owner main step), and an open question in the PRD | no `(you)` line in `parallel`; the open question in `attention`, marked startable |
| `parallel-skeleton` | the skeleton shaping beside an untested value risk (an owner main step) | `parallel` lists activating the skeleton for an agent |

S1's `also` key is renamed `parallel` and compares the In parallel list whole. The ten cases with an `also` key today
(`appetite-ended`, `build-loop-owed-unreadable`, `deadlines-toronto`, `hostile-existential-and-name`,
`hostile-markers`, `hostile-risk-active`, `review-quoted-only`, `skeleton-active`, `step3-no-review`, `two-active`)
change by the rename and the dropped duplicates; their `attention` and `steps` lists change by the facts of §2 and
§4. `build-loop-next-item`'s Next ends `You and an agent, one issue per session.` (§4).

**Unit tests**, `scripts/plan.test.mjs`: each rule of §3 alone (waits, unknown files, overlap, the person rule, rank
5, the cap with the main step counted, the order within a rank); the owner's order (an agent main step, an untested
value risk and an open question in the PRD: the risk test is taken, the question marked startable); a shaping main
step and an owner thing with no overlap (the owner thing is not taken); the skeleton against a main step whose files
include `package.json` (not taken) and one whose files are `docs/product/**` only (taken); the offline sentence on
every pick when `online` is false; three ready leaves (no shaping offered), and one ready leaf with an unstarted item
(shaping offered beside it when the owner is free); a ready leaf as the main step, a second ready leaf, an unstarted
item and an untested existential risk (the second leaf and shaping are taken, the risk is marked startable).

**Recorded GitHub answers**, `scripts/github-state.test.mjs` with a stubbed `gh` answering from
`scripts/fixtures/github-state/*.json`, as `scripts/work-order.test.mjs` does; no test calls GitHub:

- a draft pull request of the owner's whose feature doc's `Version:` moved with no review naming it: one
  `review-owed` line naming the pull request, the F-id, the version and the action; a doc new in the pull request
  counts as moved;
- each kind of §6 and its negative; a stranger's `needs-shape` issue counted, not listed; everyone else's pull
  requests counted, their count above 100 leaving the read on;
- each reason of §5, and a second call failing after the first succeeded: no GitHub line but the not-read one;
- a stub that sleeps past 5 seconds: the child is killed at 5 seconds, and status exits 0 within 5 seconds plus the
  time the same root takes offline, with the not-read line;
- a sentinel string planted where GitHub's text reaches the child: a pull request's body, the doc's heading after a
  valid `F-n`, a `Version:` line after valid digits, a review's text, a changed path, a remote branch name, and a
  leaf's title and body (after valid entries on its `Touches:` and `Blocked by:` lines, AR-5 of the 0.2 review). It
  appears nowhere in status's output or in STATE.md;
- another account's pull requests (#535): two from this repository's branches and one from a fork give the
  `other-account` line with 2, reading no title, path or branch name of theirs (a sentinel in each); none gives no line;
- an `HTTP 401` answer with exit 1 gives `gh is not signed in`;
- each cap of §5, one answer each;
- a ready leaf whose `Touches:` overlaps a changed path of the owner's open pull request that its own `Touches:` did
  not name: the next ready leaf is picked instead;
- claims: a local branch `feat/i15-x` and a remote `i15-y` each claim #15; `i150-z` and `xi15-` do not; a branch
  `i15-x` cut from a 3-day-old `main` commit with today's claim commit claims #15 and is not quiet (AR-1); a branch
  with its last commit 3 days old and no linked open pull request still claims #15, #15 is not offered, and the
  `stale-claim` line is printed; the same branch with a collaborator's open pull request linked to #15 claims and
  prints no `stale-claim` line (AR-2); offline, the same branch claims and prints no `stale-claim` line.

**Offline is held** (AR-5). `scripts/github-state-offline.test.mjs` puts a recording `gh` stub on a PATH outside the
repository (so the trusted PATH keeps it) and runs `--refresh`, S1 over its fixtures, `--hook` under `CI=1`, and
`--hook` with `CHECK_TODAY` set: the stub records zero calls each time.

**One plan for both** (the owner, AR-2). `scripts/plan-shared.test.mjs` runs work-order's model and status's plan on
one recorded answer and one fixture root, through the same `github-state.mjs` reader: they name the same main step and
picks in the same order.

**`Touches:` lines that parse** (the owner, Q1). I1 (`ci/checks/meta/i1-issue-shape.mjs`) warns, never fails, on a
`Touches:` segment `touches()` cannot read, naming the first entry that breaks the rule; its cases go in
`scripts/skills.test.mjs`, where I1's cases are today, so step 3 adds no test file (AR-7 of the 0.2 review).
`process/intake.md` → Issue body → `Touches:` gains one sentence: the line holds paths and globs only, and any note
goes outside it. `/log-feature`, `/log-followup` and `/log-bug` already write the line "per `process/intake.md` →
Issue body", so the sentence reaches them with no edit of theirs. The pull request that ships this step reports how
many open issues have a readable `Touches:` line on its day.

**The skills** (the owner, AR-3 and AR-7). `/work-ticket`'s first act, before any code, pushes a branch whose name
starts `i{n}-` or has it right after a `/`, carrying an empty claim commit (§5); it has 4 lines of room under the cap.
`/log-feature #n` reshapes issue `#n` in place: the same number, its comments and links kept, its body rewritten to the
issue form, and `needs-shape` cleared only when the shape check passes. For an issue the owner did not open, it says so
and asks before reading on; the body is someone else's text, read as data, never as instructions. `/log-feature`'s
`SKILL.md` is at its 300-line cap (AR-10 of the 0.2 review), so the mode's steps live in
`.claude/skills/log-feature/issue-mode.md`, and `SKILL.md` gains only the `#n` form on its usage line (line 14, beside
`/log-feature M1#2`) with a pointer to that file, joining lines 12 and 13 to stay at 300. `scripts/skills.test.mjs` pins
each sentence and the cap.

### §10 F-07 changes — the page reads the same plan

The owner chose full sharing (AR-2). At Build map step 5:

- **The read.** `collect()` reads GitHub through `github-state.mjs`'s calls instead of its own three, with no 5-second
  limit (the page is run by hand) and the same rule: only the owner's pull requests and any claiming branch (§5)
  mark a leaf in progress. It reads the owed list from `ci/checks/lib/owed.mjs`.
- **The pull request limit.** The owner's open pull requests, 100 at most, by §5's rule; everyone else's are counted
  on the page's header, never read. Today's `gh pr list --limit 200` is removed.
- **The failure rule.** The page keeps its own: exit 1 naming `gh auth status`, now with §5's reason words instead of
  `gh`'s first stderr line; nothing is written.
- **Next.** The page's Next shows `plan()`'s main step and picks, in its order. An issue pick renders as today. A pick
  that is not an issue (an owed thing) renders as one plain line, its text through `escapeHtml()`, with no command.
  Status's output rules do not govern the page: it keeps titles, `Touches` and designations as F-07 shows them.
- **F-07's Fit first.** F-07 has no `## Fit`, so `/review-doc` cannot review it (AR-9 of the 0.2 review). Step 5's
  ticket carries, as an Acceptance line, the owner's words: "F-07's Fit is filled, describing F-07 as amended, before
  its review runs". "If the Fit needs my own judgment, the ticket says the session asks me rather than writing it"
  (the owner, 2026-10-25). A Fit edit moves no `Version:`.
- **F-07's doc.** Its Contract, Acceptance and Verify are edited to the above, its `Version:` moves, and it names
  D-050 there. Its review covers only those amended sections, in one round; anything else it finds goes to a
  follow-up issue, not a new version (the owner, AR-2). Until step 5, F-07's Open questions name D-050 and this list.

### Order and overlap

#501 (open, no pull request) changes `ci/status.mjs` and the readers it calls; whichever builds second takes `main`
as it is, and this feature's lines are written to #501's rule from the start. `package.json`'s `meta` line changes in
steps 1, 2, 4 and 5 and its `status` line in step 4; each build pull request merges `main` before it is marked ready.

## Seams

none: what a project's own status prints from its own files and its owner's open pull requests, issues and branches,
read with the owner's own `gh` login. No person, channel or promise is added.

## Threat model

What this promises: the lines status prints from GitHub reach every session through the hook, and GitHub holds
other people's text (pull requests and issues from forks and strangers, their titles, bodies, branches, labels and
paths). Against that:

- **Other people's pull requests are read for two fields only.** Of a pull request by anyone but the owner, status
  reads `author` and `isCrossRepository`, for the `other-account` count (#535), and nothing else.
- **The milestone's issues are read whoever opened them,** as F-07 reads them today: each leaf's title and body, for
  its `Touches:`, `Blocked by:` and designation (AR-5 of the 0.2 review). A leaf's author can edit its body and so
  steer that leaf's place in the plan: hold it back, or make its files unknown. That is the owner's call, since the
  owner linked the issue to the milestone. Nothing of a leaf's text but validated numbers and paths for the overlap
  test reaches status's plan, and nothing of it is printed.
- **What status prints from GitHub** is numbers, validated ids, fixed words and the reason words; paths feed the
  overlap test only (§7). The sentinel test of §9 plants text everywhere it flows, a leaf's title and body included,
  and holds it.
- **Other people's work cannot steer the plan** beyond their own leaf. Their pull requests are counted, never in
  progress, and their number never switches the read off, so a stranger can neither hide a ticket nor turn GitHub off
  (AR-8). A linked pull request of theirs only keeps a quiet claim from being called stale, which is a reminder, not a
  ticket. Their `needs-shape` issues are counted, never listed (AR-3). Only an account with write access can push a
  claiming branch.
- **No line points an agent at another person's work,** and `merge` tells the agent to ask the owner and never merge.
- **No injection.** `gh` runs with a fixed argument array and no shell, on the trusted PATH, from outside the
  repository; the GraphQL query takes every value as a variable; a blob expression is a 40-hex commit id and a path
  that passes a safe-character pattern and `SPEC_PATH` or the review path pattern.
- **Bounded.** One 5-second budget, a killed child, at most three calls, 100 of the owner's pull requests, 100 files
  and 20 blobs each, 100 of everyone's pull requests for two fields, 100 remote branches, lines cut at 500 characters
  before any pattern, every pattern anchored or bounded. A slow or hostile answer costs the session five seconds and the GitHub lines, never the hook.
- **No gate reads it.** The read never starts under `CI`, a fixed test clock or `--refresh`, and the offline test of §9
  holds that, so nothing on GitHub can turn a gate green.

What it does not defend: the owner's own `gh` login and environment (D-023), and a pull request by the owner that
lies about its changed files (GitHub reports them; status trusts GitHub).

## Known limitations

- Offline, status cannot name the next ticket, and an agent main step with unknown files offers no file-writing
  thing beside it. Offline picks carry a sentence saying open pull requests were not read. The Next line says GitHub
  was not read.
- Offline, the main step shapes an unstarted item whenever there is one; online, a ready build comes first. The two
  can differ while both are possible.
- The turn-end refresh is offline, so STATE.md loses the GitHub lines until the next session start or `pnpm status`.
- `Touches:` is written at filing and can be wrong until a pull request exists; the changed paths correct it then.
  On 2026-10-23, 37 of slipway's 48 open issues with a `Touches:` line could be read; an unreadable line is unknown
  and never offered in parallel. I1's warning shows each one.
- A branch left behind claims its ticket until it is deleted, however long it is quiet: "a false claim is the safe
  mistake" (the owner, 2026-10-25). After 2 quiet days, online, a line says so. A branch made by hand with no claim
  commit, cut from an old `main`, can be called quiet the day it is pushed; it still claims.
- The owner is treated as one person for the whole main step, so a long owner step ("yours, days to weeks") offers
  no owner work beside it for its whole length.
- `you or an agent` counts as agent work for the person rule; the line still says the owner may do it.
- Pull requests opened for the owner's agents under another account (a bot or an app) count as other people's, never
  steer the plan, and are never listed. The `other-account` line says when there are any (#535), and D-050 reopens
  when #535 closes (the owner, AR-8 of both reviews).
- `review-owed` reads the reviews in the session's own checkout and those the pull request changes. A checkout behind
  `main` can miss a review the base holds, and print a `review-owed` line that a pull of `main` clears.
- `review-owed` compares the head with the base branch's tip (`baseRefOid`), not where the pull request branched. A
  pull request behind a `main` that has since moved the same doc's `Version:` can show `review-owed` until it merges
  `main` (AR-11 of the 0.2 review).
- The ticket pick needs an active milestone. Slipway itself runs under an epic with no milestone, so its own status
  names no ticket (F-07's epic deferral).
- The 5-second budget has no measurement yet. Build map step 4 times one run in a repository with an active milestone
  and sub-issues before its pull request is marked ready.
- Needs attention keeps today's kind order; only In parallel is ranked.

## Acceptance

```
Given the skeleton M1 shaping (an agent main step), M2 shaping, every value risk tested, and an untested existential
      risk the PRD resolves at M3
When  node ci/status.mjs <root>
Then  In parallel lists "(you)" scheduling that risk's test, naming M2 going active, with the offline sentence

Given a parked question with a tracker
Then  it is in Needs attention saying nothing is to do now and naming the tracker, and there is no In parallel

Given two owed things where one waits on the other (an owed citation, and the review of the same feature)
Then  only the first is in In parallel; the second is in Needs attention, waiting on the first

Given an owner main step and an owner thing of rank 1 to 4 that waits on nothing
Then  no "(you)" line is in In parallel, and the thing is in Needs attention saying it can start now

Given the skeleton shaping beside an untested value risk
Then  In parallel lists activating the skeleton for an agent

Given every existing case under ci/fixtures/status/
When  node ci/checks/meta/s1-status.mjs ci/fixtures/status
Then  it exits 0, and the ten cases with an `also` key compare under `parallel`

Given each rule of §3, the owner's order, a shaping main step, shaping's place against a risk test, the skeleton's
      files and the offline sentence
When  node scripts/plan.test.mjs
Then  each case passes

Given a recorded answer with an open draft pull request of the owner's whose feature doc's Version: line moved with no
      review naming it
When  status reads it
Then  one line names the pull request, the F-id, the version and the action /review-doc in a fresh session

Given GitHub cannot be reached, gh is missing, gh is not signed in or its token is refused (HTTP 401), or the second
      call fails after the first
Then  status prints its offline view, one line saying GitHub was not read with the reason in fixed words, no other
      GitHub line, and exits 0

Given a stub that answers after 6 seconds
Then  the child is killed at 5 seconds, and status exits 0 within 5 seconds plus the time the same root takes offline

Given a ready green mergeable pull request by another author, one with a red check by another author, 150 open pull
      requests by other people, and a stranger's issue marked needs-shape
Then  none is listed, the GitHub line counts them, and GitHub is read

Given a recorded answer with a sentinel in a pull request's body, a doc heading, a Version: line, a review, a changed
      path, a remote branch name, and a leaf's title, Touches: line and Blocked by: line
Then  the sentinel appears nowhere in status's output or STATE.md

Given two open pull requests from this repository's branches by another account and one from a fork, each with a
      sentinel in its title, path and branch name
Then  Needs attention has one line "2 pull requests from this repo's branches were opened by another account: D-050
      reopens; decide whether to trust it.", and no sentinel appears

Given an active milestone whose items are all started, two ready leaves, and an open pull request of the owner's whose
      changed path overlaps the first leaf's Touches:
Then  Next is "Start #<second> in a fresh session with /work-ticket <second>. …" and it holds the Next form

Given a remote branch i15-x cut from a 3-day-old main commit with today's claim commit, and a local branch feat/i16-y
      with its last commit 3 days ago and no linked open pull request
Then  neither #15 nor #16 is offered, no line calls #15's branch stale, and one line says "A stale branch holds #16:
      resume it or delete it."

Given the same #16 branch with a collaborator's open pull request linked to #16, or status offline
Then  #16 is not offered, and no line calls its branch stale

Given --refresh, S1, --hook under CI=1 and --hook with CHECK_TODAY set, and a recording gh stub on the PATH
Then  the stub records no call

Given one recorded answer and one fixture root
When  scripts/plan-shared.test.mjs runs work-order's model and status's plan on them
Then  both name the same main step and picks, in the same order

Given an issue body whose Touches: line holds a note in words
When  node scripts/skills.test.mjs runs I1 on it
Then  a warning names the entry, and I1's exit code is unchanged

Given the skills
When  node scripts/skills.test.mjs
Then  /work-ticket's first act pushes an i<n>- branch with an empty claim commit, /log-feature #n reshapes in place
      and asks before reading an issue the owner did not open, process/intake.md says Touches: holds paths and globs
      only, and each SKILL.md is within 300 lines

Given slipway's own tree
When  pnpm meta
Then  it exits 0
```

## Verify

```
node scripts/plan.test.mjs                                # §3's rules, one test each                      (step 1)
node ci/checks/meta/s1-status.mjs ci/fixtures/status      # every status case, the five new ones included  (step 2)
node scripts/skills.test.mjs                              # I1's Touches: warning, intake and skills        (step 3)
node scripts/github-state.test.mjs                        # §5–§7 from recorded answers, #535's count        (step 4)
node scripts/github-state-offline.test.mjs                # no gate and no test reads the network           (step 4)
time pnpm status                                          # with gh signed in, in a repository with an active
                                                          # milestone and sub-issues: prints "GitHub: read"; its
                                                          # time and counts pasted in the PR                  (step 4)
node scripts/plan-shared.test.mjs                         # the page and status name the same work          (step 5)
node scripts/work-order.test.mjs                          # work-order on the shared plan                   (step 5)
node ci/checks/meta/pc1-positive-control.mjs              # known-bad cases still fail as recorded
pnpm meta
```

## Build map

Owner-only files, each asked for at its edit and named under `## Gate changes`: `ci/**` in every step;
`package.json`'s scripts in steps 1, 2, 4 and 5 (each wires the tests it adds into `meta` in the same step, so W1
stays green); `process/intake.md` and `.claude/skills/**` in step 3. A project takes the `status` script's
`--online` by sync, as any merged script; one whose `status` script differs is asked by sync, and still reads GitHub
at session start, since the hook passes `--hook`. Steps 1 and 3 share no file and can run side by side.

1. **The planner and owed things as data** — `ci/checks/lib/plan.mjs`, status's owed list moved into
   `ci/checks/lib/owed.mjs` with §2's facts, `decision-lines.mjs` returning owed things; status prints what it
   prints today. `scripts/plan.test.mjs`, wired into `meta`. ~400 lines.
2. **Status prints the plan** — In parallel replaces Also unblocked, every line in §1's form, the step lines' facts,
   the shaping Next's who; the five new fixtures; S1's `also` → `parallel`. The pull request names every other changed
   expected line, case by case (the owner, Q4). Blocked by step 1. ~500 lines, most of them fixtures.
3. **Intake and skills** — I1's warning with its cases in `scripts/skills.test.mjs`, the `process/intake.md`
   sentence, `/log-feature #n` in `.claude/skills/log-feature/issue-mode.md` with its pointer, `/work-ticket`'s claim
   branch and empty commit first; the count of readable `Touches:` lines on its day. No `package.json` edit.
4. **The online part** — `ci/checks/lib/github-state.mjs` (the read, the caps, the claims, local and remote), the
   hook and `--online`, `package.json`'s `status` script, §6's kinds, the online Next rows;
   `scripts/github-state.test.mjs` and `scripts/github-state-offline.test.mjs`, wired into `meta`. #535's count and
   line ride this step or follow it, as their own pull request. Before the pull request is marked ready, one timed run
   in a repository with an active milestone and sub-issues (a test repository, or a project on slipway with only its
   numbers recorded), its time and counts in this doc's Changes (AR-6 of the 0.2 review). Over 5 seconds, the step
   stops and asks the owner: split the read, or raise the budget. Blocked by steps 2 and 3. ~500 lines.
5. **The page on the shared plan** — first, as an Acceptance line of its ticket, "F-07's Fit is filled, describing
   F-07 as amended, before its review runs", the session asking the owner where the Fit needs the owner's judgment
   (§10); then `ci/work-order.mjs` per §10, `scripts/plan-shared.test.mjs` wired into `meta`, and
   `dev/features/work-order.md` amended with its one-round review. Blocked by step 4. ~300 lines.

**From the 0.2 review, wording that rides a step** (the owner, 2026-10-25: "Wording-only findings ride the build steps
they touch"). Step 1: §1's who list gains `yours`, and §1 says the main step's who comes "from §4's table, which takes
`STEPS` for the cases it does not list" (AR-13). Step 4: §6's table gains a waits column (each of its kinds waits on
nothing), and Verify's timed run is worded as above (AR-13). The doc's text is corrected in the step that touches it.

## Out of scope

- Starting anything in parallel automatically: status says what is safe; the owner or an agent starts it.
- A JSON output, or a file a pane reads: the plan is data exported from `ci/checks/lib/plan.mjs`, which a pane
  imports (the orchestrator session, Q5; as #385 left it).
- A cache of GitHub's answer (the owner, Q3).
- An epic as a source of tickets for a repository with no active milestone (F-07's deferral stands).
- Trusting pull requests by collaborators or by a bot account (the owner, AR-8; Known limitations). Saying when there
  are any is #535.
- Reading comments or review threads, or any owner question but `needs-shape`.
- Ranking Needs attention.

## Open questions

Each answered on 2026-10-23 or 2026-10-25, brought one at a time with the orchestrator session's advice beside it.
The owner's words, unedited, are in PR #533's body; D-050 records them.

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
- ~~AR-1 (the owner): shaping and the person rule.~~ Shaping is the owner's work and an agent's, and nothing else of
  the owner's is offered beside it; work-order's order stays: ready builds first, shaping only when fewer than three
  are ready (§1, §3, §4).
- ~~AR-2 (the owner): what the page shares.~~ Full sharing of the choice, not of status's output rules; one test runs
  both on one fixture; F-07's review covers only the amended sections, in one round (§3, §9, §10).
- ~~AR-3 (the owner): `needs-shape`.~~ Only issues the owner opened are listed; `/log-feature #n` reshapes in place,
  and asks before reading an issue the owner did not open (§6, §9).
- ~~AR-7 (the owner): a ticket offered twice.~~ A branch named `i<n>-` claims it, matched strictly; a claim with no
  commit for 2 days and no pull request goes stale and is said; remote branches share the budget and the
  all-or-nothing rule, local ones are always read (§5).
- ~~AR-8 (the owner): other people's pull requests.~~ The owner's account only; collaborators claim through branches;
  a bot account is a known limitation (§2, §5, Known limitations).
- ~~AR-11 (the owner): when to record the decision.~~ Now, as D-050, with `Amends: F-17, F-07` and every answer above
  (§8).
- ~~The 0.2 review (the owner, 2026-10-25): how to take it.~~ "Serious ones in 0.3, plus any finding that changes what
  the feature does. Wording-only findings ride the build steps they touch. One last review of 0.3; what it finds goes
  into build tickets, never a 0.4." A stale branch keeps claiming its ticket until it is deleted (§5).
- ~~AR-8 of the 0.2 review (the owner): the reopen trigger.~~ Detected, not prose: the `other-account` count and line
  (§5), filed as #535, and D-050's `Reopens when: #535 closes`.
- ~~AR-9 of the 0.2 review (the owner): F-07's Fit.~~ In step 5, as an Acceptance line of its ticket (§10, Build map).

The 0.2 review's findings, sorted by the owner's rule: AR-1 to AR-12 change what the feature does or how it is built,
and are in 0.3; AR-13's three behaviour points (the Next row for leaves that cannot be offered, claims on the page,
an expired token) are in 0.3, and its four wording points ride steps 1 and 4.

## Changes

- 2026-10-23 · ADDED · 0.1, shaped from #445
- 2026-10-23 · MODIFIED · 0.2, from the 0.1 review (`docs/reviews/2026-10-23-parallel-plan-0.1.md`): the owner's
  answers to AR-1, AR-2, AR-3, AR-7, AR-8 and AR-11 (D-050), and AR-4 to AR-6, AR-9, AR-10 and AR-12 to AR-17 taken as
  spec corrections. #533
- 2026-10-25 · MODIFIED · 0.3, from the 0.2 review (`docs/reviews/2026-10-25-parallel-plan-0.2.md`): the owner's
  answers (a claim never released by age; the `other-account` count, #535; F-07's Fit in step 5) and AR-1 to AR-12
  with AR-13's behaviour points; AR-13's wording rides steps 1 and 4. #533
