---
prd-ref: D-016
status: draft
---

# F-11 — Landing page: the claims table and the required facts, as built

Verified against: 1c3c929 2026-10-07 — the sources the rows cite, read by the claims check at the page's last text commit, 0179b94. Row 48's "11 skills" was counted at 9824e8f and holds at 1c3c929.

This file **supersedes the claims table and the required facts in `dev/features/landing-page.md` for the page as
built** (#271, review of 0.3 AR-2). The spec's Version line is unchanged; its `## Changes` names this file. Where
the two differ, this file wins. The page it describes is `site/index.html`; the README's first screen mirrors the
page's first screen.

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
| 1 | head, hero | a project framework for Claude Code: a path from a rough idea to a release that holds up, with Claude Code doing the building and checks that fail when a step gets skipped | the owner's approved wording, 2026-09-24 (`site/design-direction.md` Revisions); `SLIPWAY.md` "Start here" |
| 2 | hero | By an engineer, for engineers | the owner, 2026-09-24 and 2026-10-06 (The reader) |
| 3 | hero | a slipway is the ramp a ship is built on | `README.md` line 5 |
| 4 | hero | `npx use-slipway acme --dry-run` prints every step it would take and changes nothing | `README.md` options table; run (Verify) |
| 5 | hero | `npx use-slipway acme` creates `./acme` and a private GitHub repository | `README.md` "Start a project"; run (Verify) |
| 6 | hero | then open Claude Code and run `/bootstrap` | `README.md`; `BOOTSTRAP.md` |
| 7 | hero note | branch protection on a private repository needs a paid GitHub plan | `README.md` "Branch protection on a private repository" |
| 8 | hero note | the first CI run on `main` is red on purpose | `README.md` "The first CI run on `main` is red, on purpose" |
| 9 | hero note | the command installs session hooks into the new project's `.claude/settings.json`; `--no-harness` skips it | `README.md` "What it does" (the agent harness, `.claude/settings.json`) |
| 10 | hero | the package is `use-slipway`; `slipway` on npm is unrelated | `npm view use-slipway`; `npm view slipway` (another publisher) |
| 11 | numbers | 8 steps from a rough idea to a product people use | `SLIPWAY.md` path table, steps 0–7 |
| 12 | numbers | 1 command tells you what to do next | `SLIPWAY.md` "Lost? Run `pnpm status`" |
| 13 | numbers | 1 milestone active at a time | `SLIPWAY.md` gates table, MS1 (it counts active milestones; step 3 creates 3–5) |
| 14 | numbers | 0 packages to install for the checks to run | `decisions.md` D-004 |
| 15 | thesis | a rule only counts if something fails when it's broken | `SLIPWAY.md` thesis |
| 16 | §01, stage 4 | Everything that worked, with most of what I learned the hard way turned into a check that fails where one can catch it, and a dated rule where it can't, so the next project starts at stage four. (the owner's wording, 2026-10-06) | `SLIPWAY.md` "Lessons, and where each one lives" (the status table: a check, a dated rule, or not built yet) |
| 17 | §01 | Slipway is built to get you to a release that holds up sooner. (the owner's wording, 2026-10-06: what it is for, not a measured result) | the owner's statement of purpose; #43 Problem ("a release that works, is useful, and fits the product") |
| 18 | §01 | it won't get you to a one-shot MVP | #43 Problem ("not a one-shot tool for a weekend idea") |
| 19 | §01 | does it work: tests the agent is sent back to when they fail, and CI that runs the same checks on every pull request | `process/harness/README.md` hooks table (`stop-verify.sh`); `.github/workflows/ci.yml` |
| 20 | §01 | "does it feel right" is not checked yet; it is next | #48 (open) |
| 21 | plate caption | each row is a check in CI or a hook in the agent's session; the checks run on plain Node with nothing to install, so a broken dependency can't quietly switch one off | D-004; `SLIPWAY.md` gates table |
| 22 | plate | a hook runs `pnpm verify:fast` when the agent tries to stop; it is sent back once with the failure, and told to say what is failing if it stops red anyway | `process/harness/README.md` hooks table; `process/harness/hooks/stop-verify.mjs` (the second stop passes unchecked; the code asks, it does not verify) |
| 23 | plate | every check has a known-bad example it must go red on, for exactly the expected reasons | `ci/checks/meta/pc1-positive-control.mjs`; `ci/fixtures/known-bad/` |
| 24 | plate | every gated script has to be invoked by a CI workflow | `ci/checks/meta/w1-declared-vs-invoked.mjs` |
| 25 | plate | the PR description has to say what was verified, and link its issue or say why there is none | `ci/checks/meta/p1-pr-body.mjs` (accepts `none: <reason>`) |
| 26 | plate | an issue that uses a bare adjective as a criterion is labelled `needs-shape`, and `/work-ticket` won't start it | `ci/checks/meta/i1-issue-shape.mjs`; `.github/workflows/issue-shape.yml`; `.claude/skills/work-ticket/SKILL.md` Phase 1 |
| 27 | plate | the PRD needs a written review that names the exact version it read | `ci/checks/meta/r1-review-provenance.mjs` |
| 28 | plate | no milestone past the first skeleton starts until each value risk has a result against a bar written first, or is settled by experience with what would prove it wrong written down | `ci/checks/meta/k1-frame.mjs` |
| 29 | plate | one milestone active at a time; past its time budget it needs a written decision | `ci/checks/meta/ms1-milestones.mjs` |
| 30 | plate | every lesson names where it's enforced or, if it isn't built yet, the event that reopens it; the judgment ones get a review date and fail when it passes | `ci/checks/meta/l1-lessons.mjs` (declined lessons are exempt from a clock) |
| 31 | §02 | eight steps from a rough idea to something people use; you do the thinking, the agent does the building | `SLIPWAY.md` path table, the "who" of each step |
| 32 | §02 | `pnpm status` reads the repo and prints which step you're on; agent sessions get the same line when they start | `ci/status.mjs`; `process/harness/hooks/session-state.sh` |
| 33 | §02 | **block: the ramp** (8 entries) | `SLIPWAY.md` path table and step sections |
| 34 | §02 | anything not in the active milestone goes to its "not doing" list or a later one | `process/slipway-rules.md` "One active milestone" |
| 35 | §02 | one sentence and no new behaviour is a plain PR; one session's work gets an issue; bigger gets a feature doc | `SLIPWAY.md` "Every change: pick a lane" |
| 36 | §02 | the agent looks for an existing helper first; once a project wires a duplication check, a ratchet never lets its number go up | `process/slipway-rules.md` Working rules; `ci/ratchet.mjs` (an equal number passes); D-014 |
| 37 | §02 | when `pnpm verify:fast` is red, the agent is sent back once to fix it, and told to say what's failing if it stops anyway | `process/harness/hooks/stop-verify.mjs`; `process/harness/README.md` hooks table |
| 38 | §02 | CI runs the same `pnpm verify` the owner does; no second definition of green | `SLIPWAY.md` gates table, `verify`; `.github/workflows/ci.yml` |
| 39 | §03 | the state of the project lives in the repo; leave it for two weeks, come back, run one command and know what's next | `SLIPWAY.md` "Lost? Run `pnpm status`" |
| 40 | §03 | **block: the tree** (8 entries) | the paths themselves; `SLIPWAY.md` "What is here" |
| 41 | §03 | a live URL from the walking skeleton on, with analytics checked to fire | `SLIPWAY.md` step 4 |
| 42 | §03 | pull requests that say what was verified; the template also asks what wasn't | P1 (fails a PR with no verification); `.github/pull_request_template.md` (asks what was not verified; nothing fails on it) |
| 43 | §03 | the skeleton ships in days, and each milestone is a bet you're allowed to lose | `SLIPWAY.md` path table step 4; step 3 ("each milestone is a bet … kill criteria") |
| 44 | §04 | `/kickoff` asks one question at a time | `.claude/skills/kickoff/SKILL.md` lines 9, 23 |
| 45 | §04 | a value risk can be settled by experience (it's table stakes, you're the user, or you know the domain) when you write what would prove you wrong | `ci/checks/meta/k1-frame.mjs`; F-05; D-019 |
| 46 | §04 | an afternoon to frame, days to weeks to test the riskiest assumption, a day or two to shape | `SLIPWAY.md` path table, steps 1–3 |
| 47 | §04 | **block: who it's for, and who it isn't** (5 entries) | per entry, under Blocks |
| 48 | §04 | a short path, a dozen or so skills, and checks that fail | `.claude/skills/` (11 skills at 9824e8f); `SLIPWAY.md` path table |
| 49 | §05 | not in one command yet: slipway starts new projects and keeps them up to date | #54 (open) |
| 50 | §05 | `/sync-slipway` prints a plan before it touches anything, works on its own branch, merges instead of overwriting a file you changed, never edits the documents that are yours | `SLIPWAY.md` "Taking slipway updates"; D-015; `scripts/sync.mjs` |
| 51 | §05 | each release is staged by CI from a version tag, and goes public only when the owner approves that exact package at npm with a second factor | D-027 |
| 52 | §05 | adopting a repository that did not start from slipway is a later bet, not under way; help triaging an old backlog is another later bet, ahead of it | #54, #50 (both open); #43 Order |
| 53 | §05 | the checks are zero-dependency Node scripts, the lessons plain Markdown, the rules one page | D-004; `process/lessons/`; `process/slipway-rules.md` |
| 54 | §05 | what it expects: Node 24, pnpm 10, git, the GitHub CLI logged in, a GitHub account, Claude Code | `README.md` "You need"; `SLIPWAY.md` Requires |
| 55 | §05 | GitHub for issue forms, required checks and Actions; moving elsewhere means rewiring | D-002 |
| 56 | §05 | a default stack you can change in week one: TypeScript, React with Vite, Cloudflare | `SLIPWAY.md` Defaults; D-005–D-008 |
| 57 | §06 | every check is seen failing before it's trusted | PC1; `SLIPWAY.md` Validation |
| 58 | §06 | slipway's own work goes through its lanes: its feature docs, decisions, lessons and reviews are in the repo | `dev/features/`, `decisions.md`, `process/lessons/`, `docs/reviews/` (slipway has no frame, PRD or milestone of its own, so the row claims no more) |
| 59 | §06 | a private product with one engineer, a web app, has run the gates on real pull requests and issues | `SLIPWAY.md` "Exercised on a real project" (step 1; the owner's dated account where no public PR is cited) |
| 60 | §06 | **block: the syncs** (the count, then met, missed and not fully scored, together) | `SLIPWAY.md` sync lines (step 1, from #43 Acceptance) |
| 61 | §06 | the first real close ran on 2026-10-06: about seven minutes to an open pull request and about half an hour to merge, on the strongest model at high effort, one run; every planned item shipped and every gate line shown; one question asked; a feature doc is marked shipped whole even when a section owes a check (#284, open) | `SLIPWAY.md` "Exercised on a real project", "The first milestone close" (the owner's account, 2026-10-06); #258, #264, #284 |
| 62 | §06 | **block: not proven yet** (four lines, each dated 2026-10-07, and the link to them); the approval prompts have not been seen in a live session, the other hooks and the session-start status only on sample input | `SLIPWAY.md` "Not verified here" (each with `Verified against:`) |
| 63 | §06 | next: a fit check for features, and a pause at each milestone to reorganise what should be shared | #48, #49 (both open) |
| 64 | §06 | the whole plan, in order, is epic #43 | #43 |
| 65 | §07 | Quality: gates that can actually fail | PC1 |
| 66 | §07 | Transparency: every PR says what was verified, and this page says what isn't proven | P1; §06 |
| 67 | §07 | Integrity: you never weaken a gate to get past it | `process/slipway-rules.md` Gates ("Never weaken a gate to pass it") |
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
| 78 | §04 | before it builds anything, slipway asks what question the product answers and who's asking; before a feature, it asks which part of that question the feature serves | `.claude/skills/kickoff/SKILL.md`; `.claude/skills/log-feature/SKILL.md` (Phase 2, challenge 1) |
| 79 | §01 | is it useful: it answers the question the product exists to answer, for the person asking it | `SLIPWAY.md` step 1 ("Every MVP feature must serve that question"); `.claude/skills/log-feature/SKILL.md` (Phase 2, challenge 1) |
| 80 | §06 answer line | slipway is being built in the open, by one engineer, and used on real work | the public repository; `SLIPWAY.md` "Exercised on a real project"; "by one engineer" is biography. Today's "proven on real work" is stronger than §06's own list |
| 81 | §06 | that project's repository was protected by the setup script | `SLIPWAY.md` "Exercised on a real project" (the GitHub half of `new-project`) |
| 82 | §06 | `/kickoff` shaped its product | `SLIPWAY.md` "Exercised on a real project" |
| 83 | §06 | the Stop hook caught a problem in a live session that became a fix in slipway | `SLIPWAY.md` "Exercised on a real project"; PR #58 |
| 84 | §02 (today) | "**The agent can't stop on red.**" | *cut*: the claim row 70 cuts from the plate; row 37 carries the true version |
| 85 | §05 | adopting a project that did not start from slipway is filed, with its acceptance written, and not built | #54 (open, Acceptance); no feature doc in `dev/features/` |
| 86 | §05 | a check brings the helpers in `ci/lib/` it imports, and slipway records none used outside a project that started from it | the imports in `ci/checks/meta/*.mjs`; `SLIPWAY.md` "Exercised on a real project" |
| 87 | README | every step up to closing a milestone ends in something that goes red | `SLIPWAY.md` path table, steps 0–6, "Done when" (step 7 names nothing) |
| 88 | §05 | Claude Code asks whether you trust the new folder, and lists the permissions it pre-approves, when you open it the first time | the owner's run of the page's path, 2026-10-07, on Claude Code 2.1.287 (the owner's account) |
| 89 | §05 | the project pre-approves two permissions: `git stash list` and `git stash apply` | `process/harness/settings.json`, `permissions.allow` |
| 90 | §05 | `/bootstrap` then asks three things about the product, one at a time: which GitHub project board new issues go to ("none" skips the board), the timezone deadlines are read in, and whether the product has money or other math that must be exact | `.claude/skills/bootstrap/SKILL.md` lines 46-50; `AGENT.md` lines 15 and 22 |

## Sentences that are not factual claims

The claims check's list 2 labels these, by their words, as framing or opinion, not as claims about slipway or its
method; each stays on the page without a row:

- §01 plate caption: "A test suite nobody runs has a 100% pass rate." (a rhetorical line; its point is made by rows
  21 to 30).
- §04: "That can feel like a barrier, and I've felt it too." and "Nobody trusts a finance app with half its
  features. Some products can't be tested by hand in a spreadsheet first." (the author's opinion and experience,
  signed; row 45 covers the sentence after them, which is the claim).
- §01: "Agents made writing code cheap. They didn't make it right, useful or coherent." (the section's answer line),
  "None of it was new. It was ordinary engineering discipline, applied to agents." and "The agent's coding was never
  the bottleneck. Everything around it was…" (the author's account of his own stages, signed).
- §04: "Plenty of good features start as experience: you're the user, or it's table stakes in the domain." (opinion,
  followed by row 45).
- Section answers and headings written as questions or framing ("It will ask you why. That's the cost, and most of
  the point.", "Refactoring has never been cheaper, and debt still compounds.").

## Block entries, corrected

- **The ramp (row 33):** step 0 reads "`/bootstrap` adds the app and runs the probes that show each gate can go red,
  listing the ones you run yourself" (`BOOTSTRAP.md`); step 2's time is "days to weeks"; step 5's is "the rest of
  the milestone" (that step's heading in `SLIPWAY.md`); step 6's is "about 7 minutes to a pull request, once, on
  the strongest model" (`SLIPWAY.md` "The first milestone close", the owner's account, 2026-10-06).
- **The tree (row 40):** `docs/product/evidence/` is "interview logs and risk-test results, each against a bar
  written before the test"; `process/lessons/` is "each saying where it's enforced or, if it isn't built yet, the
  event that reopens it; the judgment ones carry a review date".
- **The syncs (row 60):** seven; one met, two missed, four not fully scored (two with nothing on whether the owner
  could say what changed, two with no command count). Recounted from #43's Acceptance, read 2026-10-07.
