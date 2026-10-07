---
prd-ref: D-016
status: draft
---

# F-11 — Landing page: a stranger learns what slipway does, why, and what to run

Version: 0.3 (2026-10-06) — this line is the one a `/review-doc` review cites; it moves when the Contract or
Verify below changes.

## Problem

`site/index.html` answers seven questions and reads well, but it describes slipway as it stood two weeks before
`use-slipway@0.1.1`; `latest` is `0.1.2` today. Three things are wrong with publishing it as it is (#252):

1. **Parts are out of date.** "What's proven so far" says a real project's first milestone has not started, scores
   one sync (two commands, about seven questions) when #43 records seven, and names as next something already
   shipped. "What does it ask of me?" says evidence from experience is "next on the list"; it shipped (F-05, #47).
   "Can I use it on a project I already have?" calls adopting a repository that did not start from slipway "in
   progress"; it is an open bet (#54). Since the page was written: releases are staged from CI and approved by the
   owner with a second factor (D-027); a real project has synced seven times, of which #43 records one as meeting
   its yardstick, two as misses and four as not fully scored; a check that cannot run before merge is tracked
   until it has (F-09); a session cannot approve its own changes to the gates; a real project has built every
   item of its first milestone through these rules.
2. **Nobody has tested whether it is clear.** The page was reviewed by its author and for its design. No reader
   who knows nothing about slipway has been asked what it says.
3. **Its first command now reaches a stranger.** `npx use-slipway acme` is public. The page's commands have not
   been run, end to end, from the published package by someone following only the page.

`SLIPWAY.md` is the page's source for what is proven (#55's acceptance ties the two), and its own "Not verified
here" list is dated 2026-09-24 and 2026-09-25. Its yardstick line says "each later sync is scored here"; six
syncs since are not. `site/css/` reserves no scrollbar gutter.

**Job:** when I land on slipway's page from npm or GitHub knowing nothing about it, I want to learn what it is,
whether it is for me, what it asks of me and what to run, so I can decide in five minutes whether to try it and
run the first command without guessing.

**Evidence:** `site/index.html` §06 against #43's Acceptance (seven syncs, scored as above); §04 against
`ci/checks/meta/k1-frame.mjs` (`experience:` settles a value risk); `npm view use-slipway dist-tags`
(`latest: 0.1.2`); `grep scrollbar-gutter site/css/*.css` (nothing). Workaround: none. Why now: #43's Order
puts #252 before #55 publishes.

Serves the thesis in `SLIPWAY.md` (a rule exists only where something fires): a front page with unsourced
claims contradicts it. Decisions it rests on: the page never shows slipway's machinery and the owner is asked
only product questions (D-016); a release is staged by CI and approved by the owner at npm (D-027).

**Verdict: PROCEED**, as #252 shapes it and the reviews of 0.1 and 0.2 corrected it: fix now what is knowable now
(`SLIPWAY.md`'s sync lines, the stale claims, the gutter, the command runs, the reader test with a control
round), and leave only the lines about the first milestone close for after it.

| option | for | against | verdict |
|---|---|---|---|
| do nothing: publish the page as it is | no work | publishes claims the repository contradicts | rejected |
| the ask: refresh, source, test, run | every line checkable; the test is on the reader, not the author | the close lines wait on an event nobody schedules | **proceeds** |
| hold all of it until the first real close (0.1 of this doc) | one pass | the two riskiest assumptions (is it clear, do the commands work) tested last; `SLIPWAY.md` stays stale in public | rejected (review of 0.1, AR-5) |
| generate "What's proven" from `SLIPWAY.md` by script | can never drift | machinery for one page (decision-defaults §10); a claims table per release is enough, a check only if drift recurs | rejected |
| cut the page to the README's first screen | less to keep true | answers none of the reader's "why" questions; #55 exists because the README is a reference | rejected |

## Contract

Verified against: 9824e8f 2026-10-06 — read in full on `main`: `site/index.html`, `site/css/base.css`,
`site/css/manual.css`, `site/design-direction.md`, `SLIPWAY.md`, `README.md`, `BOOTSTRAP.md` (requirements),
`dev/ownership.yaml` (`site/**` and `docs/reviews/**` internal), `decisions.md` (D-002, D-004, D-016, D-027),
`ci/checks/meta/k1-frame.mjs`, `ci/checks/meta/r1-review-provenance.mjs`, `.claude/skills/` (11 skills),
`process/harness/README.md` (the hooks table and what gets past), `scripts/new-project.mjs` (its first output
line), `ci/ratchet.mjs`, `docs/reviews/2026-10-06-landing-page-0.1.md` and `-0.2.md`,
`process/harness/settings.json` (no rule names `gh`); `scripts/sync.mjs` read for its merge only; #43
(Acceptance and Order), #45, #48, #49, #50, #54, #55, #91, #233; `npm view use-slipway dist-tags` (`latest: 0.1.2`) and `npm view slipway`
(another publisher's package). Not rendered by this session: where a line lands on the page is taken from the
review of 0.2, which measured it in a browser at 390×844 and 1280×800 (L-23).

### The reader

One primary reader, confirmed by the owner on 2026-10-06: **the solo builder shipping their own product with
Claude Code**, including the one engineer working beside co-founders who are not engineers. They arrive from
npm, GitHub or a link, have never heard of slipway, and have watched a coding agent report "done" on work that
was never run. The page is written to them in the owner's voice (the candid builder, first person, real
incidents: `site/design-direction.md`), and nobody else is written for.

**"Decides in about five minutes" means the page from the hero through §01's answer line.** That stretch
carries what slipway is, that it is for engineers, why it exists, and the first command. It is about two and a
half phone screens today, so it is named by its content, not counted in screens. The rest of the page is for
the reader who stays. The reader test checks this: one reader is given only that stretch.

### The questions, in the order the reader asks them

Each answer is the intended answer, three sentences or fewer, with the section that carries it and what backs
it. One sentence of why slipway was built sits in the first screen (the headline), and the full account is last.

| # | the reader asks | carried by | the intended answer | backed by |
|---|---|---|---|---|
| Q1 | What is it, and is it for me? | hero (kicker, lede); the fuller "who" is §04 | A project framework for Claude Code: a path from a rough idea to a release that holds up, with checks that fail when a step is skipped. By an engineer, for engineers. | the owner's approved wording, 2026-09-24 (`site/design-direction.md` Revisions); `SLIPWAY.md` "Start here" |
| Q2 | What problem does it solve, and why bother? | headline; §01; the thesis line; Plate 1 | Agents made writing code cheap; they did not make it right, useful or coherent, and that part is still engineering. AI changed how we build software; it did not change what users expect from it. Slipway turns most of what the author learned into checks that fail where one can catch it and dated rules where it can't. | `SLIPWAY.md` thesis and "Lessons, and where each one lives"; #43 Problem |
| Q3 | What do I run first? | hero (the two commands and their notes) | `npx use-slipway acme --dry-run` prints every step and changes nothing; `npx use-slipway acme` creates `./acme` and a private GitHub repository. Then open Claude Code in it and run `/bootstrap`. The package is `use-slipway`; `slipway` on npm is unrelated. | `README.md` "Start a project"; the runs (Verify); `npm view slipway` |
| Q4 | What happens after that? | §02 | Eight steps from a rough idea to something people use: bootstrap, frame, test the risk, shape, skeleton, build, close, learn, then back to build. `pnpm status` reads the repository and prints which step you are on and what to do next; agent sessions get the same line when they start. One milestone is open at a time. | `SLIPWAY.md` path table and "Lost?"; `process/harness/hooks/session-state.sh`; MS1 |
| Q5 | What does a successful slipway project look like? | §03 (no question of its own in the reader test: its answer is a required fact of "what happens after that") | The state of the project lives in the repository, not in a head or a chat history. So after two weeks away, one command says what is next. | `SLIPWAY.md` "Lost? Run `pnpm status`" and "What is here" |
| Q6 | What does it ask of me? | §04; the hero's three notes; the prerequisites list in §05 "What it expects" | It asks why, before anything is built: what question the product answers, who is asking, and which part of that a feature serves. An afternoon to frame, days to weeks to test the riskiest assumption, a day or two to shape. It needs Claude Code, a GitHub account with the GitHub CLI logged in, Node 24, pnpm and git; protecting `main` on a private repository needs a paid GitHub plan. | `SLIPWAY.md` path table; `README.md` "You need" and "Branch protection"; `.claude/skills/kickoff/SKILL.md` |
| Q7 | Can I use it on a project I already have? | §05 | Not in one command yet: today slipway starts new projects and keeps them up to date with `/sync-slipway`, which prints a plan first and never edits the documents that are yours. Adopting a repository that did not start from slipway is a later bet. The checks, lessons and rules are plain files you can lift on their own. | `SLIPWAY.md` "Taking slipway updates"; D-015; #54 (open) |
| Q8 | What is proven so far? | §06 | Every check has been seen failing on a known-bad example before it was trusted. A private product with one engineer, a web app, has run the gates on real pull requests, built every item of its first milestone, and taken slipway's updates by sync; the page says how many syncs met the yardstick, how many missed it and how many were not fully scored. That milestone's close with `/close-milestone` has not run yet; what has not been exercised is listed, dated, as unknown. | `SLIPWAY.md` "Exercised on a real project" and "Not verified here" after build step 1; PC1 |
| Q9 | Why was it built? | §07 | Twenty years of building software, most of it learned the hard way; agents changed how the author works, not what the people using the software expect. Quality, transparency and integrity, in the author's words. | the author's biography; rows 65–67 for the three values |

Q8's last sentence changes in build step 3 to what happened at the close: what it took and found, or that the
milestone was killed, or that `/close-milestone` failed on its first real run. Until then it reads as above.

### What "cost" means on the page

Time, discipline, prerequisites and the costs `README.md` already states, each sourced. No token or speed
figure: nobody has measured one, and a claim with no source is cut (#252). "No money figure" does not mean
leaving out a known, sourced cost: the hero's notes carry three (below). The one speed claim is worded as what
slipway is for, not as a result anyone measured, in the owner's words (2026-10-06): "Slipway is built to get
you to a release that holds up sooner." The clause "by cutting the rework and token churn of under-planned
features" is cut from §01: it is unmeasured.

**The hero's notes,** by the two commands, in the owner's words (2026-10-06), each a claims row citing
`README.md`. They sit below the two commands, so they never push the first command down.

- Branch protection on a private repository needs a paid GitHub plan.
- The first CI run on `main` is red on purpose.
- The command installs session hooks into the new project's `.claude/settings.json`; `--no-harness` skips it.

And one line of trust beside them: **the package is `use-slipway`; `slipway` on npm is unrelated.**

The prerequisites list stays where it is today, in §05 under "What it expects"; §04 does not repeat it.

### How the page describes the real project

Set by the owner on 2026-10-06: **"a private product with one engineer, a web app"**: its form, never its
subject. Never its name, subject, size, business figures or product incidents. Slipway's own counts and
findings on it (how many commands a sync took, what a sync or a close found in slipway) are slipway's, and are
allowed.

In `SLIPWAY.md` "Exercised on a real project", the private project's commit shas go. Each line cites a public
slipway pull request or issue; a line with none is marked as the owner's account, with its date. `Verified
against: <sha> <date>` stays only on "Not verified here", where a slipway sha shows the code path is still as
described.

### How the page reports the syncs

All outcomes together, never a best case alone: how many real syncs there have been, how many met #43's
yardstick, how many missed, and how many were not fully scored, with "not recorded" wherever #43 has no count.
Nothing is invented.

**One source: #43's Acceptance,** quoted in the PR with the date it was read, since the issue is edited in
place and has no sha to pin. A list a session holds is a convenience; where it and #43 differ, #43 wins and the
PR says so.

**How a sync is scored.** The yardstick has three parts: 1 command, at most 3 questions, and the owner can say
what changed. A sync is "met" only when #43 says all three held. A part #43 says nothing about makes it "not
fully scored", never "met". Extra commands or questions #43 records for the same day are written on that sync's
line. Read on 2026-10-06, #43 records seven: one met (the second, the only entry that says so), two missed (the
first and the fourth), four not fully scored (the third and the fifth: nothing on whether the owner could say
what changed; the sixth and the seventh: no command count). The third's line also carries the 2 more commands
and 3 questions that re-pointing cost that day. The build recounts from #43 on the day it runs. The page never
says "most", and never "releases" for what #43 records as ranges of commits.

#55's line, "the page claims nothing about how easy updating is until `SLIPWAY.md` records a real sync meeting
the yardstick", is met once step 1 writes the second sync's line; the page still says no more than the counts.

### Claims: one row per factual claim

The page carries only claims in this table; a claim with no row is cut. A row is one sentence as it will read,
or one **named block** whose entries are listed under Blocks below. **A row whose claim is stronger than its
source is a finding, not a pass.**

**This table is a draft the build corrects, not a proof.** Two reviews each found rows stronger than their
sources, the second after checking about 25 of 68. So the table is not perfected here: the page step checks it
("The claims check", below), and what that check finds is fixed in the page's PR, not in a fourth version of
this doc. The rows the reviews named are fixed below; nothing else was hunted for.

**Where a row cites the owner's word of 2026-10-06,** the record is the body of PR #275, which lists those
decisions and which the owner merged, and for decisions made after it (the fold, rows 16 and 17), the pull
request that carries this version.

**Biography is not a claim.** The author's own history in §01 and §07 (dates, the kinds of company, what
happened to the author on their own projects before slipway) has no rows: it is first-person, signed, and
nobody else can check it. Every sentence about what slipway or its method does has a row, in the testimony or
out of it. `README.md` mirrors the page's first screen; it is a source only where a row cites a section of it
that the build does not edit.

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
| 13 | numbers | 1 milestone open at a time | `SLIPWAY.md` gates table, MS1 |
| 14 | numbers | 0 packages to install for the checks to run | `decisions.md` D-004 |
| 15 | thesis | a rule only counts if something fails when it's broken | `SLIPWAY.md` thesis |
| 16 | §01, stage 4 | Everything that worked, with most of what I learned the hard way turned into a check that fails where one can catch it, and a dated rule where it can't, so the next project starts at stage four. (the owner's wording, 2026-10-06) | `SLIPWAY.md` "Lessons, and where each one lives" (the status table: a check, a dated rule, or not built yet) |
| 17 | §01 | Slipway is built to get you to a release that holds up sooner. (the owner's wording, 2026-10-06: what it is for, not a measured result) | the owner's statement of purpose; #43 Problem ("a release that works, is useful, and fits the product") |
| 18 | §01 | it won't get you to a one-shot MVP | #43 Problem ("not a one-shot tool for a weekend idea") |
| 19 | §01 | does it work: tests the agent is sent back to when they fail, and CI that runs the same checks on every pull request | `process/harness/README.md` hooks table (`stop-verify.sh`); `.github/workflows/ci.yml` |
| 20 | §01 | "does it feel right" is not checked yet; it is next | #48 (open) |
| 21 | plate caption | each row is a check in CI or a hook in the agent's session; the checks run on plain Node with nothing to install, so a broken dependency can't quietly switch one off | D-004; `SLIPWAY.md` gates table |
| 22 | plate | a hook runs `pnpm verify:fast` when the agent tries to stop; it is sent back once with the failure, and if it still stops red it has to say what is failing | `process/harness/README.md` hooks table (`stop-verify.sh`) |
| 23 | plate | every check has a known-bad example it must go red on, for exactly the expected reasons | `ci/checks/meta/pc1-positive-control.mjs`; `ci/fixtures/known-bad/` |
| 24 | plate | every gated script has to be invoked by a CI workflow | `ci/checks/meta/w1-declared-vs-invoked.mjs` |
| 25 | plate | the PR description has to say what was verified and link its issue | `ci/checks/meta/p1-pr-body.mjs` |
| 26 | plate | issues can't use a bare adjective as a criterion | `ci/checks/meta/i1-issue-shape.mjs` |
| 27 | plate | the PRD needs a written review that names the exact version it read | `ci/checks/meta/r1-review-provenance.mjs` |
| 28 | plate | no milestone past the first skeleton starts until each value risk has a result against a bar written first, or is settled by experience with what would prove it wrong written down | `ci/checks/meta/k1-frame.mjs` |
| 29 | plate | one milestone active at a time; past its time budget it needs a written decision | `ci/checks/meta/ms1-milestones.mjs` |
| 30 | plate | every lesson names where it's enforced; judgment ones get a review date and fail when it passes | `ci/checks/meta/l1-lessons.mjs` |
| 31 | §02 | eight steps from a rough idea to something people use; you do the thinking, the agent does the building | `SLIPWAY.md` path table, the "who" of each step |
| 32 | §02 | `pnpm status` reads the repo and prints which step you're on; agent sessions get the same line when they start | `ci/status.mjs`; `process/harness/hooks/session-state.sh` |
| 33 | §02 | **block: the ramp** (8 entries) | `SLIPWAY.md` path table and step sections |
| 34 | §02 | anything not in the active milestone goes to its "not doing" list or a later one | `process/slipway-rules.md` "One active milestone" |
| 35 | §02 | one sentence and no new behaviour is a plain PR; one session's work gets an issue; bigger gets a feature doc | `SLIPWAY.md` "Every change: pick a lane" |
| 36 | §02 | the agent looks for an existing helper first; once a project wires a duplication check, a ratchet only lets its number go down | `process/slipway-rules.md` Working rules; `ci/ratchet.mjs`; D-014 (the project's week-1 choice) |
| 37 | §02 | the agent keeps going until `pnpm verify:fast` passes, or tells me why it can't | `process/harness/README.md` hooks table |
| 38 | §02 | CI runs the same `pnpm verify` the owner does; no second definition of green | `SLIPWAY.md` gates table, `verify`; `.github/workflows/ci.yml` |
| 39 | §03 | the state of the project lives in the repo; leave it for two weeks, come back, run one command and know what's next | `SLIPWAY.md` "Lost? Run `pnpm status`" |
| 40 | §03 | **block: the tree** (8 entries) | the paths themselves; `SLIPWAY.md` "What is here" |
| 41 | §03 | a live URL from the walking skeleton on, with analytics checked to fire | `SLIPWAY.md` step 4 |
| 42 | §03 | pull requests that say what was verified; the template also asks what wasn't | P1 (fails a PR with no verification); `.github/pull_request_template.md` (asks what was not verified; nothing fails on it) |
| 43 | §03 | the skeleton ships in days, and each milestone is a bet you're allowed to lose | `SLIPWAY.md` path table step 4; step 3 ("each milestone is a bet … kill criteria") |
| 44 | §04 | `/kickoff` asks one question at a time | `.claude/skills/kickoff/SKILL.md` lines 9, 23 |
| 45 | §04 | a value risk can be settled by experience when you write what would prove you wrong | `ci/checks/meta/k1-frame.mjs`; F-05 |
| 46 | §04 | an afternoon to frame, days to weeks to test the riskiest assumption, a day or two to shape | `SLIPWAY.md` path table, steps 1–3 |
| 47 | §04 | **block: who it's for, and who it isn't** (5 entries) | per entry, under Blocks |
| 48 | §04 | a short path, a dozen or so skills, and checks that fail | `.claude/skills/` (11 skills at 9824e8f); `SLIPWAY.md` path table |
| 49 | §05 | not in one command yet: slipway starts new projects and keeps them up to date | #54 (open) |
| 50 | §05 | `/sync-slipway` prints a plan before it touches anything, works on its own branch, merges instead of overwriting a file you changed, never edits the documents that are yours | `SLIPWAY.md` "Taking slipway updates"; D-015; `scripts/sync.mjs` |
| 51 | §05 | each release is staged by CI from a version tag, and goes public only when the owner approves that exact package at npm with a second factor | D-027 |
| 52 | §05 | adopting a repository that did not start from slipway is a later bet; help triaging an old backlog is another | #54, #50 (both open) |
| 53 | §05 | the checks are zero-dependency Node scripts, the lessons plain Markdown, the rules one page | D-004; `process/lessons/`; `process/slipway-rules.md` |
| 54 | §05 | what it expects: Node 24, pnpm 10, git, the GitHub CLI logged in, a GitHub account, Claude Code | `README.md` "You need"; `SLIPWAY.md` Requires |
| 55 | §05 | GitHub for issue forms, required checks and Actions; moving elsewhere means rewiring | D-002 |
| 56 | §05 | a default stack you can change in week one: TypeScript, React with Vite, Cloudflare | `SLIPWAY.md` Defaults; D-005–D-008 |
| 57 | §06 | every check is seen failing before it's trusted | PC1; `SLIPWAY.md` Validation |
| 58 | §06 | slipway's own work goes through its lanes: its feature docs, decisions, lessons and reviews are in the repo | `dev/features/`, `decisions.md`, `process/lessons/`, `docs/reviews/` (slipway has no frame, PRD or milestone of its own, so the row claims no more) |
| 59 | §06 | a private product with one engineer, a web app, has run the gates on real pull requests and issues | `SLIPWAY.md` "Exercised on a real project" (step 1; the owner's dated account where no public PR is cited) |
| 60 | §06 | **block: the syncs** (the count, then met, missed and not fully scored, together) | `SLIPWAY.md` sync lines (step 1, from #43 Acceptance) |
| 61 | §06 | that project has built every item of its first milestone; the close with `/close-milestone` has not run yet | `SLIPWAY.md` "Not verified here" (step 1 rewrites the line; the owner's dated account). **Replaced in step 3** by 3 lines or more on what happened at the close |
| 62 | §06 | **block: not proven yet** (each line of the list, dated, and the link to it) | `SLIPWAY.md` "Not verified here" (step 1) |
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

Seventy-four rows carry (five of them blocks); ten are cut. Rows 78 to 84 were added in 0.3 and keep the
earlier numbers stable. Every source is a file in this repository, a command against npm, an issue or pull
request in the public repository, or the owner's dated word.

**For §06 the pairing with `SLIPWAY.md` decides what may be said, and every paired bullet is a row.** A bullet
that has a `SLIPWAY.md` line and no row gets its row in the claims check; it is not cut.

#### Blocks

| block | entries | each entry's source |
|---|---|---|
| the ramp (row 33) | 8: steps 0–7, each with its name, who does it, how long, and one line | `SLIPWAY.md` path table, columns 1–2, and that step's section. Durations as the table gives them: step 0 "1–2 h", step 1 "an afternoon", step 2 "days to weeks", step 3 "1–2 days", step 4 "days", step 5 "the milestone", step 7 "weekly". Step 6 carries no duration until step 3 of the build |
| the tree (row 40) | 8: `docs/product/FRAME.md`, `docs/product/evidence/`, `docs/PRD.md`, `docs/reviews/`, `decisions.md`, `docs/milestones/`, `docs/product/metrics.md`, `process/lessons/` | each path exists in a new project; its one-line role is `SLIPWAY.md` "What is here" |
| who it's for, and who it isn't (row 47) | 5: engineers who own the build, alone or as the only engineer beside people who own the problem; heads-down engineers who want a product mind next to them; not a weekend one-shot; not building without an engineer; not collectors of skills | the owner, 2026-10-06 (The reader); the owner's approved copy, 2026-09-24, and `.claude/skills/kickoff/SKILL.md`; #43 Problem ("not a one-shot tool for a weekend idea"); #43 Problem ("to an engineer"); #43 Problem ("not a pile of skills") |
| the syncs (row 60) | 1 sentence of counts, as "How the page reports the syncs" sets | one dated line per sync in `SLIPWAY.md` |
| not proven yet (row 62) | one bullet per kept line of the list, and the link | `SLIPWAY.md` "Not verified here", each with `Verified against:` |

### The claims check, in the page step

Run by a reviewer who wrote neither the page nor this table: a fresh session on the strongest tier, or the
owner. Three lists, each in the page's PR, at the PR's sha:

1. **Every carried row against its source:** holds, stronger than its source, or source gone. A row that does
   not hold is reworded to its source or cut, in that PR.
2. **Every sentence on the built page against the table:** its row number, "biography", or "not a factual
   claim". A factual sentence with no row gets one, with a source, or leaves the page.
3. **Every carried row against the built page:** on it, or the row is marked cut.

The PR states the count of rows that carry. The page is not ready while list 1 holds a row that is stronger
than its source or list 2 holds a factual sentence with no row.

### What it never says

The build greps `site/index.html` and the README's first screen (from its top through its first code block, which holds the two commands) for
each of these, case-insensitive, and expects 0 lines from each file: `supercharge`, `unlock`, `seamless`,
`effortless`, `AI-powered`, `10x`, `ship faster`, `build faster`, `faster than`, `x faster`,
`production-proven`, `production-ready`, `battle-tested`, `enterprise`, `guarantee`, `replaces`,
`no engineer`, `Cursor`, `Codex`, `Copilot`, `Gemini`, `Windsurf`, `works with any agent`. The bare word
`faster` is not on the list: the plate's "Make it faster", its example of a criterion that cannot fail, stays.
At 9824e8f the grep prints 0 for both files. The design direction's own forbidden list
(`site/design-direction.md`) stays in force.

Private project names are not written in this repository, so no grep here can look for them. The owner greps
the page from their own list before the page PR is marked ready, and the PR says only that it was run.

### The first screen

Two viewports, with heights: **390×844** and **1280×800**. At each, with the page scrolled to the top, the
first screen shows what slipway is (the kicker and the lede), that it is for engineers (the lede's last
sentence), and the first command. Set by the owner on 2026-10-06: the first command is above the fold at both.

- **The rule is a measurement.** The bottom edge of the first command's line is at or above the fold: 844 px
  at 390 wide, 800 px at 1280 wide. Only that line. The second command, the three notes and the `use-slipway`
  line may sit below it.
- **Today it fails at both.** Measured by the review of 0.2: the first command ends at 1099 px on the phone and
  940 px on the laptop.
- **This is a layout change to the hero, and it is stated here.** On the phone the two commands move ahead of
  the ramp image. On the laptop the hero gives up about 140 px above the command: the name note and the image
  may move below the commands, and spacing may tighten. The headline and the lede keep their words and their
  order, and stay above the command. No element is added except the notes and the one line.
- A screenshot at each viewport goes in the PR beside the two numbers.

**The README says the same,** tested by whole lines: the kicker sentence `a project framework for Claude Code`
is found by `grep -F`, the dry-run line by `grep -F 'npx use-slipway acme --dry-run'`, and the second command by
a pattern that the dry-run line cannot satisfy (`npx use-slipway acme` followed by the end of the line, a
comment or a tag), each in `site/index.html` and in the README's first screen. npm shows the README of the
published package, not the repository's, so the same three run against `npm view use-slipway readme` after a
patch release that carries the aligned README. That release is cut before #55 publishes, and it is #55's to
check.

### Design and layout

The Manual direction and the steel ground stay (`site/design-direction.md`). `html { scrollbar-gutter: stable; }`
in `site/css/base.css`, and the same on any element the build gives `overflow: auto` or `overflow: scroll` (none
exists at 9824e8f), so nothing shifts when a scrollbar appears. With the viewport emulated at 390×844,
`document.documentElement.scrollWidth <= document.documentElement.clientWidth`, and no element inside `main`
has a right edge past the viewport's: `main > section` clips what overflows (`site/css/base.css`), so the first
check alone cannot see content that is too wide. No new section, page or visual
direction; the hero gains three notes and one line, and its order changes as "The first screen" says. `site/**` is internal (`dev/ownership.yaml`) and ships to
no project.

### `SLIPWAY.md` first

Build step 1 refreshes `SLIPWAY.md` on its own, now. `SLIPWAY.md` is public and a sync copies it into every
project, so this step is where text about the private project is written, and where it is checked.

- **The syncs.** One dated line per real sync in #43's Acceptance, with its command count and question count,
  or "not recorded" where #43 has none, and how it scored by the rule above. One sentence above them gives the
  counts. No project name, path or product incident.
- **"Exercised on a real project".** The private project's commit shas are removed. Each line cites a public
  slipway pull request or issue; a line with none is marked as the owner's account, with its date. The project
  is "a private product with one engineer, a web app".
- **"Not verified here".** A line about a slipway code path is kept with `Verified against: <sha> <date>`, dated
  on or after the step's start, and the BOOTSTRAP §3 probe that first exercises it, or moved out with the
  slipway PR or issue that exercised it. A line about the state of a private repository cannot be verified
  against a slipway sha: it is rewritten to what is true and marked as the owner's account, with its date. The
  `/close-milestone` line is one: today it says the first project's milestone is still being shaped; step 1
  writes that every item of it is built and the close has not run.
- **The name check.** Before step 1's PR is marked ready, the owner greps `SLIPWAY.md` from their own list of
  private names, and the PR says only that it was run. This guards the rule that no private project's name
  reaches this repository.
- **The link.** The page links to `SLIPWAY.md#not-verified-here--read-as-unknown`; step 1 keeps that heading's
  text, so the link still resolves.

Step 3 moves the close line out and writes 3 lines or more on what happened at the close. The page's "What's
proven so far" matches `SLIPWAY.md` line for line at each step: each bullet in §06 is a line in `SLIPWAY.md`,
the PR shows the pairing, and the pairing covers every sync line, not a selection.

### The reader test

**Readers.** Three fresh sessions, each started in a new empty folder outside the repository, so no project
instructions and no project memory load. Two on the strongest tier (Opus 5.5 today) are given the rendered
page's full text and the two first-screen screenshots, and answer all eight questions. One on the fast tier
(Haiku 4.5 today), the nearest thing to a reader who skims, is given only the page from the hero through §01's
answer line and answers the four that stretch must carry: what is it, who is it for, why was it built, what do
I run first. None is given the repository, an issue or this doc. The page is written on the standard tier
(Sonnet 5.5 today), so no reader is the author's model.

**The prompt,** the same words for every reader: "Answer each question from this page only. Include everything
the page says that bears on the question. If the page does not say, say so."

**The eight questions:** what is it; who is it for; what does it cost me; what do I run first; what happens
after that; can I use it on a project I already have; what is proven so far; why was it built. Q5 has no
question of its own: its answer is the second fact of "what happens after that".

**The judge.** A separate fresh session on the strongest tier (Opus 5.5 today), also outside the repository,
that has seen neither the page nor this doc. It is given the readers' answers and the required facts below,
nothing else, and returns one verdict per fact per reader: stated, or not. An answer matches when it states
every required fact, in any words; a fact stated wrongly is not stated.

| question | required facts |
|---|---|
| what is it | it is for building a product with Claude Code · it is a path from an idea to a release · its checks fail when a step is skipped |
| who is it for | engineers · (full readers only) one who owns the build alone or as the only engineer beside people who are not engineers |
| what does it cost me | it makes you answer why before building · it needs Claude Code and GitHub · framing and testing the risk take from an afternoon to weeks |
| what do I run first | `npx use-slipway acme` · it creates a folder and a private GitHub repository · then `/bootstrap` in Claude Code |
| what happens after that | a fixed path of steps from framing to learning from users · one command, `pnpm status`, says what is next · one milestone at a time |
| can I use it on a project I already have | not in one command today · **control:** adopting a repository that did not start from slipway is a later bet, not under way · a project started from slipway takes updates by sync |
| what is proven so far | every check has been seen failing on a known-bad example · **control:** there has been more than one sync, and the page says how many met the bar, missed it and were not fully scored · **control:** the first milestone is built and its close has not run (after step 3: what happened at the close) |
| why was it built | agents made code cheap but not right · what users expect did not change |

**The control comes first.** Before the page changes, the test runs once on today's page and its verdicts are
recorded in the PR. The three facts marked **control** are the ones today's page gets wrong: it reports one
sync, calls adoption "in progress", and says the first milestone "hasn't started". The control passes when
neither full reader states any of the three. If either states one, the test cannot tell a stale page from a
true one and the build stops there, before the page changes.

**The facts are fixed here, and the build never edits them.** If the control fails, the owner re-tunes the
facts once, in the page PR's body, where that PR's reviewer reads them; this doc is not changed in the middle
of the build, and a second failure goes back to the owner with both records.

**Rounds.** Every round is in the PR: the questions, each answer, each verdict. Every fact stated by every
reader passes. Otherwise the page changes and new sessions answer, up to 3 rounds after the control. A third
failed round stops the build and goes to the owner with the three records. The control's verdicts on the facts
today's page already carries are shown beside each round as the noise floor, so a reviewer can tell what the
edit caused from what a reader leaves out anyway.

### The commands run

- **Run by the build session,** in a new empty folder made with `mktemp -d`: `npx use-slipway <name> --dry-run`,
  where `<name>` is a folder name unique to the run. The page prints `acme`; the folder name is the only thing
  changed.
- **Run by a person following only the page:** `npx use-slipway <name>` on their own GitHub account, then
  Claude Code and `/bootstrap` in the folder it made, then `pnpm status` there. The run stops when `/bootstrap`
  has opened its first pull request and `pnpm status` prints a Next line; the acceptance probes that follow are
  not part of it. If that person is the author, the PR says so in those words, and says that no stranger has
  tested the path. Their notes of every guess go in the PR, as the runner's own notes, and each is fixed on the
  page in the same PR.
- **Cleaning up.** The same person removes the folder, and deletes the test repository from its Settings page
  on GitHub. No session runs a command that deletes a repository, and the GitHub CLI's token is not given a
  new permission for it.
- **Named on the page, not run:** `/kickoff`, `/close-milestone`, `/sync-slipway`, `pnpm verify`,
  `pnpm verify:fast` and `--adopt`. Today's page writes the update command as `sync`, which is not a command a
  reader can type: the build writes `/sync-slipway`.
- **The version that ran.** The first line of each run's output is `slipway <version> → …`. That version equals
  `npm view use-slipway dist-tags.latest` on the day, or the run does not count: `npx` may hold an older copy.
  No version number is printed on the page.

### Build order

Three steps. The first two run now; only the third waits. Neither starts before the Contract, Verify and
Acceptance of this version are copied into #252, #270 and #271.

1. `SLIPWAY.md`, now.
2. The page, now: it says the first milestone is built and its close has not run, and gives step 6 no duration.
3. After the first real run of `/close-milestone`, whatever it turns out to be: the milestone closed, the
   milestone killed, or the command failed on its first real use. Step 3 writes what happened, dated, in
   `SLIPWAY.md`; row 61 and Q8's last sentence on the page follow it; step 6 gets the time a close took, or
   keeps none.

#55 publishes after step 3. It waits for an outcome, not for a success, and there is no date at which the page
ships without one. What fires step 3 is its own sub-issue under #252, filed in the same change as the copy
into the issues and named in #43's Order, so it does not rest on anyone's memory (L-43).

## Seams

One person added: the outside reader, who has never heard of slipway and whose first command creates a
repository on their account. No channel. No promise beyond what the page states; every statement on it is a
promise about what the commands and checks do, which is why each one has a source and each command is run.

## Threat model

The HTML adds no network call, cache, subprocess, stored secret, user input or deletion. What the page does is
put a command in front of a stranger that runs code from npm and creates a repository on their account, so
three things are named:

- **A lookalike package.** `slipway` on npm is another publisher's package. The page's brand says "slipway" and
  its command says `use-slipway`; a reader who types the shorter name runs unrelated code. The page says so
  beside the commands (row 10), and every command on it is spelled `use-slipway`.
- **What the reader is running.** One sentence says how a release is made (row 51, D-027), which is the answer
  to the question a careful engineer asks before `npx`.
- **The README npm shows** is the published package's. Until a release carries the aligned README, npm and the
  page disagree; that release is cut before #55 publishes.

- **The build's own cleanup.** The person-run path creates a real repository and then removes it. It is
  deleted from its Settings page on GitHub, so no token gains a permission and no session runs a deleting
  command. That the agent harness has no rule asking before such a command is #279, not this feature.

Not defended here: a typo other than the bare name; a reader who runs the command without reading the notes.
The page loads fonts from Google Fonts as it does today, which sends each visitor's address to a third party
once the page is public: #55's to settle.

## Known limitations

- **No stranger has run the path.** The run from the first command through `/bootstrap` is by a person
  following only the page, and that person is probably the author, who cannot unknow the CLI. The PR says who
  ran it. A run by an engineer who has not used slipway is a named follow-up under #252, with its date the
  owner's to set, and does not gate #55.
- An agent session is a more patient reader than a stranger: every fact from three sessions is a floor, not a
  proof of clarity. The judge scores required facts, not whether the page persuades. Three rounds that each
  need every fact stated can favour a page that repeats itself; the noise floor is there to show it.
- The time the page gives step 6, once step 3 writes it, is the first real close's: one data point.
- Private project names are checked by the owner against a list that lives outside the repository, so the
  repository cannot show that grep ran; the PR says it did.
- The author's biography has no source; it is signed. Lines in `SLIPWAY.md` about the real project that cite no
  public pull request are the owner's dated account, and are marked so.
- The word grep finds listed phrases, not every overclaim; the claims check is the check on those.
- The hero's three notes are not required facts, so the reader test does not show that a reader saw them.
- The claims table here is known to be imperfect: two reviews found rows stronger than their sources. The
  claims check in the page step is where that is settled.
- The fold is two fixed viewports. A shorter window still puts the first command below it.

## Acceptance

```
A1   Given  this doc
     When   it is read
     Then   it names 1 primary reader, 9 questions in order, each with the section that carries it, an answer of
            3 sentences or fewer and a source, and a claims table in which every row is 1 sentence or 1 named
            block with its entries listed, 0 rows citing outside the public repository, npm or the owner's dated word

A2   Given  the doc, before #270 or #271 starts
     When   docs/reviews/ is read
     Then   a review there names this doc and its current Version line, R1 reports nothing for it, and every
            S0 and S1 in it has a tracker or a resolution in this doc. R1 checks only the first two

A3   Given  SLIPWAY.md after build step 1
     When   "Exercised on a real project" and "Not verified here" are read
     Then   every real sync in #43 has a dated line with its command and question counts, or "not recorded",
            and how it scored; 1 sentence gives the counts of met, missed and not fully scored; 0 commit shas
            of a private project remain; every "Not verified here" line carries Verified against: <sha> <date>
            or is marked as the owner's dated account; the /close-milestone line says built, not yet closed

A4   Given  step 1's PR before it is marked ready
     When   the owner greps SLIPWAY.md from their own list of private names
     Then   the PR says it was run

A5   Given  the page after build step 2
     When   §06 "What's proven so far" is compared with SLIPWAY.md
     Then   each bullet pairs with one line, every sync line is covered by the counts, and the pairing is in the PR

A6   Given  today's page, before it changes
     When   the reader test runs once as the control
     Then   its verdicts are in the PR, and neither full reader states any of the 3 control facts; otherwise the
            build stops before the page changes

A7   Given  the rendered page after build step 2 and nothing else
     When   2 full readers answer the 8 questions and 1 fast-tier reader answers 4 from the hero through §01's
            answer line, and a separate session scores them against the required facts
     Then   every required fact is stated by every reader within 3 rounds, and every round is in the PR

A8   Given  the page at 390×844 and at 1280×800, scrolled to the top
     When   the first command's line is measured
     Then   its bottom edge is at or above 844 px and 800 px, the lede is above it, and both numbers and a
            screenshot of each are in the PR

A9   Given  a new empty folder and the published package
     When   the dry run is run by the build session, and the real run by a person following only the page,
            through /bootstrap's first pull request and a pnpm status that prints a Next line
     Then   each output is in the PR, its version line equals npm view use-slipway dist-tags.latest, the PR
            says who ran the real run, every guess in the runner's notes is fixed on the page, and the test
            repository was deleted from its Settings page

A10  Given  site/index.html and the README's first screen after the build
     When   each is grepped for the listed words
     Then   0 lines match in each

A11  Given  the page PR before it is marked ready
     When   the owner greps the page from their own list of private names
     Then   the PR says it was run

A12  Given  site/index.html and the README's first screen after the build
     When   the kicker sentence, the dry-run line and the second command are each looked for, the second by a
            pattern the dry-run line cannot satisfy
     Then   each is found in both files

A13  Given  site/css after the build, with the viewport emulated at 390×844
     When   the page renders
     Then   document.documentElement.scrollWidth <= document.documentElement.clientWidth, no element inside
            main has a right edge past the viewport's, and scrollbar-gutter: stable is set on html and on every
            scrolling container

A14  Given  the page PR before it is marked ready
     When   a reviewer who wrote neither the page nor the claims table runs the claims check
     Then   the PR holds a verdict for every carried row against its source at the PR's sha, a row number,
            "biography" or "not a factual claim" for every sentence on the built page, the count of rows that
            carry, 0 rows stronger than their source and 0 factual sentences with no row

A15  Given  SLIPWAY.md and the page after build step 3
     When   the first real run of /close-milestone is looked for
     Then   SLIPWAY.md has 3 lines or more on what happened, each citing a slipway pull request, commit or issue
            or marked as the owner's dated account; the page's step 6 and §06 follow those lines

A16  Given  the repository after each build step
     When   pnpm meta runs
     Then   it exits 0
```

## Verify

```
pnpm meta                                                        # exit 0, each step
grep -l -F "$(grep -m1 '^Version:' dev/features/landing-page.md | cut -d' ' -f1-3)" docs/reviews/*landing-page*.md   # 1 file: a review of the current version
grep -n 'Verified against\|owner.s account' SLIPWAY.md           # every "Not verified here" line has one or the other after step 1
sed -n '/^### Exercised on a real project/,/^### Not verified here/p' SLIPWAY.md | grep -c -E '\b[0-9a-f]{7,40}\b'   # 0 after step 1 (3 at 9824e8f); a sha step 3 adds must pass: git cat-file -e <sha>
grep -c '^### Not verified here — read as unknown$' SLIPWAY.md   # 1: the page's link still resolves
W='supercharge|unlock|seamless|effortless|AI-powered|10x|ship faster|build faster|faster than|x faster|production-proven|production-ready|battle-tested|enterprise|guarantee|replaces|no engineer|Cursor|Codex|Copilot|Gemini|Windsurf|works with any agent'
F() { awk '{print} /^```$/{exit}' README.md; }                   # the README's first screen
grep -c -i -E "$W" site/index.html; F | grep -c -i -E "$W"       # 0 and 0
grep -c -F 'a project framework for Claude Code' site/index.html; F | grep -c -F 'a project framework for Claude Code'   # 1 or more, each
grep -c -F 'npx use-slipway acme --dry-run' site/index.html; F | grep -c -F 'npx use-slipway acme --dry-run'             # 1 or more, each
C='npx use-slipway acme( *$| +#|<)'                              # the second command; the dry-run line does not match it
grep -c -E "$C" site/index.html; F | grep -c -E "$C"             # 1 or more, each (1 and 1 at 9824e8f)
grep -n 'scrollbar-gutter: stable' site/css/base.css site/css/manual.css   # the html rule, and one per scrolling container
npm view use-slipway dist-tags.latest                            # equals the version on each run's first line
cd "$(mktemp -d)" && npx use-slipway <unique-name> --dry-run     # build session; output pasted
npx use-slipway <unique-name>                                    # a person, their own account; then /bootstrap to its first PR, then pnpm status
# in the browser, scrolled to the top, at 390×844 and again at 1280×800:
#   document.querySelector('.start .cmd').getBoundingClientRect().bottom <= window.innerHeight      → true
#   document.querySelector('.lede').getBoundingClientRect().bottom <= document.querySelector('.start .cmd').getBoundingClientRect().top   → true
# at 390×844:
#   document.documentElement.scrollWidth <= document.documentElement.clientWidth                    → true
#   [...document.querySelectorAll('main *')].every(e => e.getBoundingClientRect().right <= document.documentElement.clientWidth)   → true
# the reader test: control on today's page, then up to 3 rounds; readers and judge started outside the repository
# the claims check: three lists in the page PR, by a reviewer who wrote neither the page nor the table
```

## Build map

**Changed after 0.3, see Changes:** step 3 is folded into steps 1 and 2, and there is no third sub-issue. The
lines below are 0.3's as reviewed; #270 and #271 hold what is built.

No step starts until this version has a review and its Contract, Verify and Acceptance are copied into #252,
#270 and #271, and #55's scroll line is brought into line with A13.

1. `SLIPWAY.md`, now: one dated line per real sync from #43, with its counts or "not recorded" and how it
   scored, and the sentence of counts; "Exercised on a real project" citing public slipway pull requests and
   issues, the private project's shas removed; "Not verified here" re-dated, the close line rewritten; the
   owner's name check before ready. Docs, ~80 lines. · #270
2. The page, now: the control round on today's page first; then the stale §04, §05 and §06 claims and the cut
   rows; rows 16 and 17 in the owner's words; the hero's three notes and the `use-slipway` line; the hero
   reordered so the first command clears the fold at both viewports; the release sentence in §05; §06 with
   every sync outcome and "built, not yet closed"; step 6 without a duration; the scrollbar gutter;
   `README.md`'s first screen aligned and grepped; the dry run, the person-run path and its cleanup; the two
   measurements and screenshots; the overflow checks; the reader test, up to 3 rounds; the claims check by a
   reviewer who wrote neither. Site and docs, ~300 lines. Blocked by 1. · #271
3. After the first real run of `/close-milestone`: what happened, in `SLIPWAY.md` (3 lines or more), row 61 and
   Q8's last sentence on the page, step 6's time if there is one, the pairing re-shown. Docs and site,
   ~30 lines. Blocked by 2. Closes #252. Its sub-issue is filed with the copy into the issues.

Before #55 publishes, and #55's to check: step 3 has merged, and a patch release carries the aligned README
(`npm view use-slipway readme` passes the three checks of A12).

## Out of scope

- Publishing the page and its hosting, the patch release that carries the README, and whether a public page
  loads fonts from Google: #55.
- A run of the path by an engineer who has not used slipway: a follow-up under #252, its date the owner's.
- What else shipped since the page was written (a check deferred to after merge stays owed, F-09; a session
  cannot approve its own gate changes): not put on the page. Releases get one sentence (row 51); the rest is
  how slipway works inside, which the reader does not need to decide.
- That the agent harness asks before a command that deletes a repository or changes the GitHub CLI's token:
  #279.
- A new visual direction, a second page, a documentation site, translation: #55's Out of scope.
- A token or speed figure for what slipway costs: a measurement nobody has taken.
- A script that generates "What's proven" from `SLIPWAY.md`: rejected above; reopen if the table drifts twice.
- Adopting an existing repository (#54) and backlog triage (#50): the page says they are later bets.

## Open questions

none open. Settled by the owner, with where each is recorded:

- The first line and the candid voice (2026-09-24): `site/design-direction.md`.
- The reader; "a private product with one engineer, a web app"; the resolutions of the review of 0.1; the three
  hero notes; that the person who runs the path may be the author; that §01's stage 2 and 3 sentences stay as
  biography; that the after-close step gets its own sub-issue (2026-10-06): the body of PR #275, which lists
  them and which the owner merged.
- The first command above the fold at 390×844 and 1280×800; the wording of rows 16 and 17; that the harness gap
  gets an issue, #279 (2026-10-06, to the shaping session): the pull request that carries this version.
- That this is the last spec round: after the review of 0.3, a finding below S0 goes to a sub-issue's
  acceptance or to a tracker, and there is no 0.4 for S1 to S3 (2026-10-06, relayed by the orchestrator
  session; the same pull request records it).

Settled in shaping, and the owner's to move in this doc: the order of the nine questions, the required facts
and the three control facts, the wording of rows 19, 22, 27, 36, 41, 42, 48, 58, 61, 66 and 78 to 83, and the
models named for the reader test.

## Changes

- 2026-10-06 · ADDED · shaped for #252 (part of #55); the Contract and Verify above are embedded in #252's body; built by #270 then #271
- 2026-10-06 · MODIFIED · Version 0.1 → 0.2, resolving the review of 0.1 (`docs/reviews/2026-10-06-landing-page-0.1.md`, AR-1 to AR-14; AR-15 was settled in #273): the reader test has a judge, required facts, a control and a cap; the syncs are reported as all outcomes; biography only is exempt from a row; five rows reworded to their sources; the build splits into now and after the close; a ninth question; the real project is "a web app"; the person-run path says who ran it; three hero notes and the `use-slipway` line; the word list and the scroll check corrected. The Contract and Verify are re-copied into #252, #270 and #271
- 2026-10-06 · MODIFIED · Version 0.2 → 0.3, the last spec round, resolving the review of 0.2 (`docs/reviews/2026-10-06-landing-page-0.2.md`, AR-1 to AR-12): the fold has two heights and the first command clears both, a stated change to the hero; three control facts that today's page gets wrong, fixed here and re-tuned at most once by the owner; the claims table is checked in the page step by a reviewer who wrote neither it nor the page, in both directions, and the rows the review named are reworded (rows 78 to 84 added); the syncs are recounted by a written rule from #43 alone; a private-name check on `SLIPWAY.md`; the close line is rewritten, not re-dated; step 3 writes whatever the close's outcome is; the test repository is deleted from its Settings page (#279 holds the harness gap); two checks that could not fail are replaced. **Correction to the entry above:** nothing was re-copied at 0.2. The copy happens once, after the review of 0.3: the Contract, Verify and Acceptance of #252, #270 and #271, and #55's scroll line. #270 and #271 do not start before it
- 2026-10-06 · MODIFIED · the build's shape, not the Contract; the Version line does not move. The first real run of `/close-milestone` happened on 2026-10-06, after 0.3 was written, so the third step has nothing to wait for: its lines are folded into #270 (`SLIPWAY.md`) and #271 (the page), by the owner's decision of that day. No third sub-issue; #271 closes #252. The Contract, Verify and Acceptance of 0.3 were copied into #252, #270 and #271 that day, each saying where it differs; the seven findings of the review of 0.3 are acceptance lines in #270 and #271, and that review's register names them. The run by an engineer who has not used slipway is #287, under #55. #271 will add `dev/features/landing-page-claims.md`, the claims table as corrected and the facts as tested, which supersedes the table above for the page as built
- 2026-10-07 · MODIFIED · built by #271; the page differs from the Contract in these places, and `dev/features/landing-page-claims.md` supersedes the claims table and the required facts for the page as built (the Version line does not move). The third step is folded in: Q8's last sentence, row 61 and the third control fact say what happened at the first real close, and step 6 on the ramp gives its time. The ramp's step 5 reads "the rest of the milestone", from its heading in `SLIPWAY.md`, and step 2 "days to weeks". The hero order is the kicker, headline, lede, the two commands, then the three notes, the `use-slipway` line and the name note, then the image (on the phone the commands come before the image). Rows 13, 22, 25, 26, 30, 33, 36, 37, 40, 45, 52, 61 and 62 are reworded to their sources, and rows 85 to 87 are added, by the claims check. The release sentence (row 51) sits in §05 under "What it expects". The README's first sentence and its step sentence are aligned with the page's.
