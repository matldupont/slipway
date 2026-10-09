---
prd-ref: D-016
status: draft
companion-of: dev/features/landing-page.md
---

# F-11 — Landing page: the claims table and the required facts, as built

Verified against: 03cfb6a 2026-10-08 — the rewrite of #355; see "The copy rewrite of 2026-10-08" below. Before it:
1c3c929 2026-10-07 — the sources the rows cite, read by the claims check at the page's last text commit, 0179b94. Row 48's "11 skills" was counted at 9824e8f and holds at 1c3c929.

This file **supersedes the claims table and the required facts in `dev/features/landing-page.md` for the page as
built** (#271, review of 0.3 AR-2). The spec's Version line is unchanged; its `## Changes` names this file. Where
the two differ, this file wins. The page it describes is `site/index.html`; the README's first screen mirrors the
page's first screen.

## The copy rewrite of 2026-10-08 (#355)

The owner read the live page and approved a rewrite of its copy, section by section, in one session on
2026-10-08: the page did not say what slipway is in words a first reader can picture, half of it read as
catch-phrases, and the other half as an audit log. The rows below are as the rewritten page reads them.

- **Reworded, same source:** most carried rows. The page's plain words for slipway's own: "“will anyone want this?” risk" for
  a value risk, "pass mark" for the bar, "time budget" for the appetite, "the first thin version"
  and "step 4" for the walking skeleton, "check" for a gate.
- **Cut (8):** rows 11 to 14 (the row of four numbers), 17, 29, 30 and 43. Each says where its fact is still
  carried, or that it is gone.
- **Moved (2):** rows 7 and 8, from the notes under the commands to §05.
- **Added (5):** rows 91 to 95, the list of what the command creates, which replaced the row of numbers.
- **Row 64** names epic #312, which replaced #43 on 2026-10-07.

**96 rows: 78 carry** (five are blocks), 18 are cut. The required facts below are unchanged: 22 lines, F1.1 to
F8.2.

Verified against: 03cfb6a 2026-10-08 — the sources the rows cite, read twice by reviewers who wrote neither the
page nor this table (fresh sessions on the strongest tier):

1. **At the rewrite's first commit, 2b3f094,** every carried row against its source, every sentence against the
   table, and every row against the page. Eleven findings over 14 rows (19, 20, 21, 24, 28 and 45, 31, 32, 46, 58,
   63 and 64, 78 and 79), and three sentences with no row (the creates list's "the same way every time", §01's
   "That's where slipway puts its effort", and the heading "Three questions before anything ships"). All 18 cut
   rows were gone from the page, no carried row was missing, and all 22 required facts were found.
2. **At 9a7f494,** which reworded those and also changed rows 17, 52, 90 and 92: only that commit's changes. No carried
   row was missing and no cut sentence was back. Two changed sentences were still stronger than their source: row 28's "Building ahead anyway takes a
   written decision" (the check reads only that a result is filled; the decision is a written rule) and row 63's
   "every feature doc" (#48 exempts drafts). One clause had no entry (§04's answer line), row 58 cited no source
   for the sizes of change, and a note here quoted wording the page no longer had. Commit f53080d, on the
   follow-up branch, rewords both sentences and fixes the three notes; rows 28, 58 and 63 are as it leaves them.
3. **At f53080d,** only that commit's changes: no page sentence stronger than its source. Three notes in this
   file were corrected after it (a quote that was not word for word, a count with no stated unit, and which
   commit the fix was in), and the line naming epic #312 got a heading of its own, "In progress".

The required facts were counted at 2b3f094. Of their carriers, 9a7f494 changed two: F3.3 is still stated in §04's
third paragraph, and F5.1 ("a fixed path of steps") rests on "Eight steps, the same ones on every project" and the
ramp.

## How this table was corrected

The spec's table was a draft. The claims check ran twice by one reviewer who wrote neither the page nor the table
(a fresh session on the strongest tier), three lists each time, against the built page:

1. Every carried row against its source: **11 rows were stronger than their source** (rows 13, 22, 25, 26, 30, 33,
   36, 37, 40, 45, 52), row 61 had its source gone (the close ran) and row 62 left something out. Each was
   reworded to its source below.
2. Every sentence on the page against the table: one factual sentence had no row (rows 85, 86 added), and one in
   the README's first screen (row 87).
3. Every carried row against the page: all on it; all ten cut rows (69–77, 84) gone.

A second pass, on the sentences the first pass changed, found three of the rewordings still stronger than their
source (rows 40, 62, 86); they were reworded again. **90 rows: 80 carry** (rows 1–68, 78–83, 85–90; five are blocks), 10 are cut. Rows 88–90 were added after the owner ran the page's path and found the first-open prompts unmentioned. Rows are as the page reads them; wording that differs from the spec's table is the point.

## The required facts, as tested

Judge's copy, labels removed. One difference from the spec: the last fact of "what is proven so far" reads "the
page says what happened at the first real close" (the spec's "after step 3" form), because the close has run. The
control (today's page before it changed) used the spec's original form of that fact, "the first milestone is built
and its close has not run".

```
Q1 what is it
 F1.1 it is for building a product with Claude Code
 F1.2 it is a path from an idea to a release
 F1.3 its checks fail when a step is skipped
Q2 who is it for
 F2.1 engineers
 F2.2 (full readers only) one who owns the build alone or as the only engineer beside people who are not engineers
Q3 what does it cost me
 F3.1 it makes you answer why before building
 F3.2 it needs Claude Code and GitHub
 F3.3 framing and testing the risk take from an afternoon to weeks
Q4 what do I run first
 F4.1 `npx use-slipway acme`
 F4.2 it creates a folder and a private GitHub repository
 F4.3 then `/bootstrap` in Claude Code
Q5 what happens after that
 F5.1 a fixed path of steps from framing to learning from users
 F5.2 one command, `pnpm status`, says what is next
 F5.3 one milestone at a time
Q6 can I use it on a project I already have
 F6.1 not in one command today
 F6.2 adopting a repository that did not start from slipway is a later bet, not under way
 F6.3 a project started from slipway takes updates by sync
Q7 what is proven so far
 F7.1 every check has been seen failing on a known-bad example
 F7.2 there has been more than one sync, and the page says how many met the bar, missed it and were not fully scored
 F7.3 the page says what happened at the first real close: how long it took and what it found
Q8 why was it built
 F8.1 agents made code cheap but not right
 F8.2 what users expect did not change
```

## The table

| # | section | claim (as it will read) | source |
|---|---|---|---|
| 1 | head, hero, creates | a project framework for Claude Code (the kicker and the description); it takes you from a rough idea to a release, with checks that fail when you or the agent skip a step (the lede); one command sets up a repo with planning docs, eleven Claude Code skills and CI checks, and the skills take you through the work one step at a time (the line over the creates list) | `README.md` "Start a project"; `docs/`, `.claude/skills/` (11 folders at 03cfb6a), `ci/checks/meta/`; `SLIPWAY.md` "Start here" |
| 2 | hero | It assumes an engineer is reading the diffs (replaces "By an engineer, for engineers") | the owner, 2026-09-24, 2026-10-06 (The reader) and 2026-10-08; row 47's "building without an engineer" entry |
| 3 | hero | a slipway is the ramp a ship is built on | `README.md` line 5 |
| 4 | hero | `npx use-slipway acme --dry-run` prints every step it would take and changes nothing | `README.md` options table; run (Verify) |
| 5 | hero | `npx use-slipway acme` creates `./acme` and a private GitHub repository | `README.md` "Start a project"; run (Verify) |
| 6 | hero | then open Claude Code and run `/bootstrap` | `README.md`; `BOOTSTRAP.md` |
| 7 | §05 | a paid GitHub plan, if you want branch protection on a private repository (moved from the hero notes) | `README.md` "Branch protection on a private repository" |
| 8 | §05 | the first CI run on `main` is red on purpose (moved from the hero notes) | `README.md` "The first CI run on `main` is red, on purpose" |
| 9 | hero note | the command installs session hooks into the new project's `.claude/settings.json`; `--no-harness` skips it | `README.md` "What it does" (the agent harness, `.claude/settings.json`) |
| 10 | hero | the package is `use-slipway`; `slipway` on npm is unrelated | `npm view use-slipway`; `npm view slipway` (another publisher) |
| 11 | numbers | 8 steps from a rough idea to a product people use | *cut* (#355): the row of numbers is gone; row 31 carries the eight steps |
| 12 | numbers | 1 command tells you what to do next | *cut* (#355): the row of numbers is gone; rows 32 and 95 carry `pnpm status` |
| 13 | numbers | 1 milestone active at a time | *cut* (#355): the row of numbers is gone; rows 33 (step 5) and 40 (`docs/milestones/`) carry one milestone at a time |
| 14 | numbers | 0 packages to install for the checks to run | *cut* (#355): the row of numbers is gone; rows 21 and 53 carry "nothing to install" |
| 15 | band | a rule only counts if something fails when it's broken | `SLIPWAY.md` thesis |
| 16 | §01, stage 4 | I put what worked into one template. Most of what I learned the hard way is now either a check that fails or a written rule with a review date. A new project starts here instead of at stage one. (the owner's wording, 2026-10-08) | `SLIPWAY.md` "Lessons, and where each one lives" (the status table: a check, a dated rule, or not built yet) |
| 17 | §01 | Slipway is built to get you to a release that holds up sooner. (the owner's wording, 2026-10-06: what it is for, not a measured result) | *cut* (#355): "sooner" is unmeasured; "Slipway is my attempt at those three" replaces it, as the owner's account |
| 18 | §01 | it won't get you an MVP from one prompt | #43 Problem ("not a one-shot tool for a weekend idea") |
| 19 | §01 | does it work: CI runs the checks on every pull request; a hook runs `pnpm verify:fast` when the agent tries to finish, and sends it back once if that fails | `process/harness/README.md` hooks table (`stop-verify.sh`); `.github/workflows/ci.yml` |
| 20 | §01 | "does it fit" is not checked yet; it is planned | #48 (open; #312 lists it as not expected before that epic's goal) |
| 21 | table caption | each row is a script in CI or a hook in the Claude Code session; the CI scripts run on plain Node with nothing to install, so a broken dependency can't silently turn one off (the hook runs `pnpm verify:fast`, which needs the project's install, so the sentence is about the scripts only) | D-004; `SLIPWAY.md` gates table |
| 22 | table | when the agent tries to end its turn, a hook runs `pnpm verify:fast`; if it fails, the agent gets the output and is sent back once; if it stops again, it is told to say what is still failing | `process/harness/README.md` hooks table; `process/harness/hooks/stop-verify.mjs` (the second stop passes unchecked; the code asks, it does not verify) |
| 23 | table | each check ships with deliberately broken examples; if it doesn't fail on them, for exactly the expected reasons, the build fails | `ci/checks/meta/pc1-positive-control.mjs`; `ci/fixtures/known-bad/` |
| 24 | table | every script named `test`, `lint`, `check`, `build` or `typecheck` has to be called by a CI workflow, or the build fails | `ci/checks/meta/w1-declared-vs-invoked.mjs`; `ci/checks/lib/tasks.mjs` (`GATED`: those five names and their `:sub` forms) |
| 25 | table | the PR description has to say what was run, and link its issue or say why there isn't one | `ci/checks/meta/p1-pr-body.mjs` (accepts `none: <reason>`) |
| 26 | table | an issue whose acceptance is a bare adjective gets labelled `needs-shape`, and `/work-ticket` won't start on it | `ci/checks/meta/i1-issue-shape.mjs`; `.github/workflows/issue-shape.yml`; `.claude/skills/work-ticket/SKILL.md` Phase 1 |
| 27 | table | the PRD needs a written review that names the exact version it read | `ci/checks/meta/r1-review-provenance.mjs` |
| 28 | table | nothing past the first thin version starts until each "will anyone want this?" risk has a result written down: a test result against a pass mark set first, a note that you're relying on experience with what would prove you wrong, or a decision to build ahead (the page's plain form of a risk tagged value, the bar and the skeleton) | `ci/checks/meta/k1-frame.mjs` and `ci/checks/lib/risks.mjs` (a value risk needs a filled Result; a Result needs a Threshold; experience needs its "wrong if" line); `docs/product/FRAME.md` ("Write the Threshold **before** the test", and "To build ahead of the evidence, record a decision…"): that the pass mark comes first, and the decision to build ahead, are written rules, and the check reads only that the cells are filled |
| 29 | plate | one milestone active at a time; past its time budget it needs a written decision | *cut* (#355): the table row is gone; rows 33 (step 5) and 40 (`docs/milestones/`) carry one milestone at a time and its time budget. The page no longer says an overrun needs a written decision |
| 30 | plate | every lesson names where it's enforced or, if it isn't built yet, the event that reopens it; the judgment ones get a review date and fail when it passes | *cut* (#355): the table row is gone; row 40's `process/lessons/` entry carries it |
| 31 | §02 | eight steps, the same ones on every project; the early ones are mostly you deciding what to build; after that the agent writes most of the code and you review it | `SLIPWAY.md` path table, the "who" of each step |
| 32 | §02 | `pnpm status` reads the repo and prints the step you're on and what to do next; agent sessions get the same line when they start; before `/bootstrap` has run the line reads "**Next:** Step 0 (you + agent) — Bootstrap: run /bootstrap" | `ci/status.mjs`; `process/harness/hooks/session-state.sh`; `node ci/status.mjs` in slipway at 03cfb6a, which is the state every new project starts in (the third line it prints, cut at the bracket; no fixture pins this line) |
| 33 | §02 | **block: the ramp** (8 entries) | `SLIPWAY.md` path table and step sections |
| 34 | §02 | anything not in the active milestone goes to its "not doing" list or a later one | `process/slipway-rules.md` "One active milestone" |
| 35 | §02 | one sentence and no new behaviour is a plain PR; one session's work gets an issue; bigger gets a feature doc | `SLIPWAY.md` "Every change: pick a lane" |
| 36 | §02 | the agent looks for an existing helper before writing a new one (the duplication ratchet is no longer on the page) | `process/slipway-rules.md` Working rules |
| 37 | §02 | if `pnpm verify:fast` fails when the agent tries to finish, it's sent back once with the output; if it stops anyway, it's told to say what is failing | `process/harness/hooks/stop-verify.mjs`; `process/harness/README.md` hooks table |
| 38 | §02 | CI runs the same `pnpm verify` you run locally, so passing on your machine and passing in CI mean the same thing | `SLIPWAY.md` gates table, `verify`; `.github/workflows/ci.yml` |
| 39 | §03 | the state of the project lives in the repo; leave it for two weeks, come back, run one command and know what's next | `SLIPWAY.md` "Lost? Run `pnpm status`" |
| 40 | §03 | **block: the tree** (8 entries) | the paths themselves; `SLIPWAY.md` "What is here" |
| 41 | §03 | a live URL from step 4 on, with analytics checked to fire | `SLIPWAY.md` step 4 |
| 42 | §03 | pull requests that say what was tested; the template also asks what wasn't | P1 (fails a PR with no verification); `.github/pull_request_template.md` (asks what was not verified; nothing fails on it) |
| 43 | §03 | the skeleton ships in days, and each milestone is a bet you're allowed to lose | *cut* (#355): the closing line is gone; row 33 (step 4, "days") and row 40 (`docs/milestones/`) carry what it said |
| 44 | §04 | `/kickoff` asks one question at a time | `.claude/skills/kickoff/SKILL.md` lines 9, 23 |
| 45 | §04 | you can mark that risk (a doubt about demand) as settled by experience (you're the user, every product in the category has the feature, or you know the domain), as long as you write down what would prove you wrong | `ci/checks/meta/k1-frame.mjs`; F-05; D-019 |
| 46 | §04 | an afternoon to frame the product, days to weeks to test the riskiest assumption, a day or two to plan; the answer line says "days, sometimes weeks" | `SLIPWAY.md` path table, steps 1–3 |
| 47 | §04 | **block: who it's for, and who it isn't** (5 entries) | per entry, under Blocks |
| 48 | §04 | Slipway is eleven skills, one path and a set of checks | `.claude/skills/` (11 folders at 03cfb6a); `SLIPWAY.md` path table |
| 49 | §05 | not yet: slipway starts new projects and keeps them updated; it can't be added to an existing repo in one command | #54 (open) |
| 50 | §05 | `/sync-slipway` shows a plan first, works on its own branch, merges rather than overwrites files you changed, never edits your own documents | `SLIPWAY.md` "Taking slipway updates"; D-015; `scripts/sync.mjs` |
| 51 | §05 | CI stages each release from a version tag; it goes public only after the owner approves that exact package at npm with a second factor | D-027 |
| 52 | §05 | adopting a repo that didn't start from slipway is planned and not started; help sorting an old backlog is also planned, and comes before it | #54, #50 (both open); #54 Links ("after the triage child") |
| 53 | §05 | "The checks are Node scripts that run with no install step." The lessons plain Markdown, the rules one page | D-004 ("no install step"); `process/lessons/`; `process/slipway-rules.md` |
| 54 | §05 | what it expects: Node 24, pnpm 10, git, the GitHub CLI logged in, a GitHub account, Claude Code | `README.md` "You need"; `SLIPWAY.md` Requires |
| 55 | §05 | GitHub for issue forms, required checks and Actions; moving elsewhere means rewiring | D-002 |
| 56 | §05 | a default stack you can change in week one: TypeScript, React with Vite, Cloudflare | `SLIPWAY.md` Defaults; D-005–D-008 |
| 57 | §06 | every check has been seen failing; each has deliberately broken examples it must fail on, for exactly the expected reasons | PC1; `SLIPWAY.md` Validation |
| 58 | §06 | slipway's own changes go through the same three sizes of change it gives a project; its feature docs, decisions, lessons and reviews are in the repo; it has no product frame, PRD or milestone of its own | `dev/skill-configuration.md` (Change lanes: trivial, bounded, feature; PRD path: none; Milestone roadmap: none; its Product frame row points at `SLIPWAY.md`'s thesis, and `docs/product/FRAME.md` is the unfilled template); `dev/features/`, `decisions.md`, `process/lessons/`, `docs/reviews/` |
| 59 | §06 | one real product has used it: a private web app with one engineer; the checks ran on its real pull requests and issues | `SLIPWAY.md` "Exercised on a real project" (step 1; the owner's dated account where no public PR is cited) |
| 60 | §06 | **block: the syncs** (the count, then met, missed and not fully scored, together) | `SLIPWAY.md` sync lines (step 1, from #43 Acceptance) |
| 61 | §06 | one milestone closed: on 2026-10-06 `/close-milestone` took about seven minutes to open a pull request and about half an hour to merge, and asked one question; every item planned for the milestone had been built, and the retro was written from issues, pull requests and `git log`; timed once, on the strongest model at high effort; a feature doc is marked shipped whole even when one section still owes a check (#284, open). The fix made that day (#258, #264) is no longer on the page | `SLIPWAY.md` "Exercised on a real project", "The first milestone close" (the owner's account, 2026-10-06); #258, #264, #284 |
| 62 | §06 | **block: not proven yet** (four lines, each dated 2026-10-07, and the link to them); the hook that runs when the agent stops has only been seen blocking for a missing install, not for a failing test; the approval prompts have not been seen in a live session; the other hooks and the session-start status only on sample input | `SLIPWAY.md` "Not verified here" (each with `Verified against:`) |
| 63 | §06 | planned, not started: a check that a feature doc past draft says how it fits the product, and a pause at each milestone to list what should be shared and decide | #48 Acceptance (a check fails on a feature doc with `status` past `draft` whose `## Fit` is missing or unfilled), #49 (it lists and decides; it does not refactor); both open, and #312 lists them as not expected before its goal |
| 64 | §06 | the work under way, in order, is epic #312 | #312 Problem ("It orders the work that stands between today and that goal") and Order |
| 65 | §07 | checks that can fail (quality) | PC1 |
| 66 | §07 | pull requests that say what was tested, a page that says what isn't proven (transparency) | P1; §06 |
| 67 | §07 | never weakening a check to get past it (integrity) | `process/slipway-rules.md` Gates ("Never weaken a gate to pass it") |
| 68 | footer | Source, the guide, day zero | `README.md`, `SLIPWAY.md`, `BOOTSTRAP.md` |
| 69 | §01 (today) | "by cutting the rework and token churn of under-planned features" | *cut*: unmeasured |
| 70 | plate (today) | "It can't end a turn on red." | *cut*: stronger than its source; row 22 replaces it |
| 71 | §01 (today) | "Tests and gates the agent can't talk its way past." | *cut*: stronger than its source; row 19 replaces it |
| 72 | plate (today) | "a written review, from a fresh session" | *cut*: the check cannot tell which session wrote it; row 27 replaces it |
| 73 | §02 (today) | step 6, "an hour" | *cut*: no source until a real close has run; step 3 writes the time it took |
| 74 | §04, §06 (today) | "evidence from experience is next on the list" | *cut*: shipped; row 45 replaces it |
| 75 | §05 (today) | adoption is "in progress" | *cut*: row 52 replaces it |
| 76 | §06 (today) | one sync scored on its own ("two commands and about seven questions … a miss") | *cut* as a lone figure: it stays as one of the misses in row 60's counts |
| 77 | §06 (today) | "that project's first milestone hasn't started" | *cut*: row 61 replaces it |
| 78 | §04 | before any code, `/kickoff` asks what question the product answers and who is asking it; before a new feature, `/log-feature` asks whether it serves that question | `.claude/skills/kickoff/SKILL.md`; `.claude/skills/log-feature/SKILL.md` (Phase 2, challenge 1) |
| 79 | §01 | is it useful: `/kickoff` writes down the one question the product answers; `/log-feature` asks whether a new feature serves it; one that doesn't waits | `SLIPWAY.md` step 1; `.claude/skills/log-feature/SKILL.md` Phase 2, challenge 1 ("Does it serve the question in the `Product frame`? A feature that does not is a later bet."; a milestone item skips the phase, so the page says "a new feature") |
| 80 | §06 answer line | one engineer builds it in the open and uses it on real work | the public repository; `SLIPWAY.md` "Exercised on a real project"; "by one engineer" is biography. Today's "proven on real work" is stronger than §06's own list |
| 81 | §06 | the setup script protected its repository | `SLIPWAY.md` "Exercised on a real project" (the GitHub half of `new-project`) |
| 82 | §06 | `/kickoff` shaped its product | `SLIPWAY.md` "Exercised on a real project" |
| 83 | §06 | the hook that runs when the agent stops caught a problem in a live session that became a fix in slipway | `SLIPWAY.md` "Exercised on a real project"; PR #58 |
| 84 | §02 (today) | "**The agent can't stop on red.**" | *cut*: the claim row 70 cuts from the plate; row 37 carries the true version |
| 85 | §05 | the issue is written, with its acceptance criteria, and nothing is built | #54 (open, Acceptance); no feature doc in `dev/features/` |
| 86 | §05 | take a check along with the helpers it imports from `ci/checks/lib/`; the owner has no record of anyone doing this outside a project that started from slipway | the imports in `ci/checks/meta/*.mjs`; `SLIPWAY.md` "Exercised on a real project" |
| 87 | README | every step up to closing a milestone ends in something that goes red | `SLIPWAY.md` path table, steps 0–6, "Done when" (step 7 names nothing) |
| 88 | §05 | Claude Code asks whether you trust the new folder, and lists the permissions it pre-approves, when you open it the first time | the owner's run of the page's path, 2026-10-07, on Claude Code 2.1.287 (the owner's account) |
| 89 | §05 | the project pre-approves two permissions: `git stash list` and `git stash apply` | `process/harness/settings.json`, `permissions.allow` |
| 90 | §05 | `/bootstrap` then asks three things about the product, one at a time: which GitHub project board new issues go to ("none" skips the board), the timezone deadlines are read in, and whether the product has money or other math that must be exact | `.claude/skills/bootstrap/SKILL.md` lines 47-52; `AGENT.md` (the GitHub project, Timezone and Domain invariants doc rows) |
| 91 | creates | `docs/`: templates for the product frame, the PRD and the milestones, with the questions to answer already written in | `docs/product/FRAME.md`, `docs/PRD.md`, `docs/milestones/TEMPLATE.md` |
| 92 | creates | `.claude/skills/`: eleven skills, run as slash commands: `/kickoff`, `/log-feature`, `/work-ticket`, `/close-milestone` and seven more; each is a written procedure the agent follows | `.claude/skills/` (11 folders at 03cfb6a, each with a `SKILL.md`) |
| 93 | creates | `ci/checks/`: plain Node scripts that GitHub Actions runs on every pull request | `ci/checks/meta/`; `.github/workflows/ci.yml` (`on: pull_request`); D-004 |
| 94 | creates | `.claude/settings.json`: hooks for Claude Code sessions; one runs `pnpm verify:fast` when the agent tries to finish, and sends it back once if that fails | row 22's sources; `process/harness/settings.json` |
| 95 | creates | `pnpm status`: one command that reads the repo and prints which step you're on and what to do next | row 32's sources |
| 96 | footer | © 2026 matldupont · MIT licensed, with "MIT licensed" linking to the licence | `LICENSE` line 3 ("Copyright (c) 2026 matldupont"); the owner's choice of line, #351 |

## Sentences that are not factual claims

The owner's own account, opinion or framing, not claims about slipway or its method. Each stays on the page
without a row. Those marked (2026-10-08) are new with #355 and were approved by the owner in that session.

- Hero: "The agent said “done.” The tests were failing." and the lede's "the project template I built after too
  many days like that" (2026-10-08; §01's first stage tells the same days).
- §01's answer line: "Coding agents write code quickly. They also tell you it works when it doesn't, and build each
  feature as if the others didn't exist." (2026-10-08; the owner's stages 1 and 3).
- §01, the owner's account of his own stages, signed: stage 2's "Quality improved right away. None of this was new.
  It's how teams already work."; stage 3's "Every PR passed review on its own. Nothing checked that they added up
  to one product."; stage 4's "A rule that nothing checks gets skipped, by me as much as by the agent."; and
  "Writing the code was never the slow part. Deciding what to build, proving it works and keeping features
  consistent with each other were. Slipway is my attempt at those three. The third is the least finished."
  (2026-10-08; the last sentence is row 20's fact).
- §01's heading "Three questions I ask before shipping": the owner's questions, not three checks; row 20 says the
  third is not checked.
- §04: "This can feel like paperwork, and sometimes I've felt that too. Not every doubt about demand needs a test.
  Sometimes you're the user, or every product in the category has the feature, or you know the domain."
  (2026-10-08; opinion and experience, followed by row 45, which is the claim).
- §07: the owner's biography, "Agents made code cheap to write. They didn't make it correct, and the people using
  what I build still expect what they always did…", and "Agents make rewriting cheap, which makes it tempting to
  skip the thinking. Slipway is how I keep doing the thinking. I start every project from it now." (2026-10-08).
- Section headings written as questions, and the first clause of §04's answer line, "It makes you answer “why”
  before it builds" (row 78 is the claim it stands on).
- The share-card tags in `<head>` (#350): `og:title` and `og:description` repeat the page's `<title>` and
  `description` word for word, and the description says what row 1 says, so row 1's sources cover them;
  `og:image` (`site/assets/og-card.png`) is the logo lockup with no added words, so it makes no claim.

## Block entries, corrected

- **The ramp (row 33):** step 0 reads "`/bootstrap` adds the app, then runs each check against something broken to
  show it fails. It lists the ones you have to try yourself" (`BOOTSTRAP.md`); step 2's time is "days to weeks";
  step 3's review is "a fresh session reviews the plan and looks for holes" (`SLIPWAY.md` step 3: `/review-doc` in
  a fresh session; no check can tell which session wrote it, and the ramp describes the step, not a check); step
  5's time is "the rest of the milestone" (that step's heading in `SLIPWAY.md`); step 6's is "about 7 minutes to a
  pull request, timed once, on the strongest model" (`SLIPWAY.md` "The first milestone close", the owner's account,
  2026-10-06).
- **The tree (row 40):** `docs/product/evidence/` is "notes from interviews and tests, each with the pass mark
  written before the test ran"; `docs/milestones/` is "one active milestone, with a time budget and the conditions
  for abandoning it, both written before it started"; `process/lessons/` is "each saying where it's enforced or, if
  that isn't built yet, what would reopen it. Rules that need judgment carry a review date".
- **Who it's for, and who it isn't (row 47):** five entries, reworded; the last reads "anyone after a big library of
  agents or personas".
- **The syncs (row 60):** seven; one met, two missed, four "weren't recorded fully enough to score" (two with
  nothing on whether the owner could say what changed, two with no command count: the page no longer splits the
  four, and `SLIPWAY.md` does). Recounted from #43's Acceptance, read 2026-10-07.
