---
prd-ref: D-016
status: draft
---

# F-11 — Landing page: a stranger learns what slipway does, why, and what to run

Version: 0.2 (2026-10-06) — this line is the one a `/review-doc` review cites; it moves when the Contract or
Verify below changes.

## Problem

`site/index.html` answers seven questions and reads well, but it describes slipway as it stood two weeks before
`use-slipway@0.1.1`; `latest` is `0.1.2` today. Three things are wrong with publishing it as it is (#252):

1. **Parts are out of date.** "What's proven so far" says a real project's first milestone has not started, scores
   one sync (two commands, about seven questions) when #43 records seven, and names as next something already
   shipped. "What does it ask of me?" says evidence from experience is "next on the list"; it shipped (F-05, #47).
   "Can I use it on a project I already have?" calls adopting a repository that did not start from slipway "in
   progress"; it is an open bet (#54). Since the page was written: releases are staged from CI and approved by the
   owner with a second factor (D-027); a real project has synced seven times, of which #43 scores two as meeting
   its yardstick, two as misses and three as not fully scored; a check that cannot run before merge is tracked
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

**Verdict: PROCEED**, as #252 shapes it and the review of 0.1 corrected it: fix now what is knowable now
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

Verified against: a2fcbdf 2026-10-06 — read in full on `main`: `site/index.html`, `site/css/base.css`,
`site/css/manual.css`, `site/design-direction.md`, `SLIPWAY.md`, `README.md`, `BOOTSTRAP.md` (requirements),
`dev/ownership.yaml` (`site/**` and `docs/reviews/**` internal), `decisions.md` (D-002, D-004, D-016, D-027),
`ci/checks/meta/k1-frame.mjs`, `ci/checks/meta/r1-review-provenance.mjs`, `.claude/skills/` (11 skills),
`process/harness/README.md` (the hooks table and what gets past), `scripts/new-project.mjs` (its first output
line), `ci/ratchet.mjs`, `docs/reviews/2026-10-06-landing-page-0.1.md`; `scripts/sync.mjs` read for its merge only; #43 (Acceptance and Order), #45, #48,
#49, #50, #54, #55, #91, #233; `npm view use-slipway dist-tags` (`latest: 0.1.2`) and `npm view slipway`
(another publisher's package).

### The reader

One primary reader, confirmed by the owner on 2026-10-06: **the solo builder shipping their own product with
Claude Code**, including the one engineer working beside co-founders who are not engineers. They arrive from
npm, GitHub or a link, have never heard of slipway, and have watched a coding agent report "done" on work that
was never run. The page is written to them in the owner's voice (the candid builder, first person, real
incidents: `site/design-direction.md`), and nobody else is written for.

**"Decides in about five minutes" means the first two screens.** From the hero through §01's answer line the
page carries what slipway is, that it is for engineers, why it exists, and the first command. The rest of the
page is for the reader who stays. The reader test checks this: one reader is given only those screens.

### The questions, in the order the reader asks them

Each answer is the intended answer, three sentences or fewer, with the section that carries it and what backs
it. One sentence of why slipway was built sits in the first screen (the headline), and the full account is last.

| # | the reader asks | carried by | the intended answer | backed by |
|---|---|---|---|---|
| Q1 | What is it, and is it for me? | hero (kicker, lede); the fuller "who" is §04 | A project framework for Claude Code: a path from a rough idea to a release that holds up, with checks that fail when a step is skipped. By an engineer, for engineers. | the owner's approved wording, 2026-09-24 (`site/design-direction.md` Revisions); `SLIPWAY.md` "Start here" |
| Q2 | What problem does it solve, and why bother? | headline; §01; the thesis line; Plate 1 | Agents made writing code cheap; they did not make it right, useful or coherent, and that part is still engineering. AI changed how we build software; it did not change what users expect from it. Slipway turns what the author learned into checks that fail where one can catch it and dated rules where it can't. | `SLIPWAY.md` thesis and "Lessons, and where each one lives"; #43 Problem |
| Q3 | What do I run first? | hero (the two commands and their notes) | `npx use-slipway acme --dry-run` prints every step and changes nothing; `npx use-slipway acme` creates `./acme` and a private GitHub repository. Then open Claude Code in it and run `/bootstrap`. The package is `use-slipway`; `slipway` on npm is unrelated. | `README.md` "Start a project"; the runs (Verify); `npm view slipway` |
| Q4 | What happens after that? | §02 | Eight steps from a rough idea to something people use: bootstrap, frame, test the risk, shape, skeleton, build, close, learn, then back to build. `pnpm status` reads the repository and prints which step you are on and what to do next; agent sessions get the same line when they start. One milestone is open at a time. | `SLIPWAY.md` path table and "Lost?"; `process/harness/hooks/session-state.sh`; MS1 |
| Q5 | What does a successful slipway project look like? | §03 | The state of the project lives in the repository, not in a head or a chat history. So after two weeks away, one command says what is next. | `SLIPWAY.md` "Lost? Run `pnpm status`" and "What is here" |
| Q6 | What does it ask of me? | §04; the hero's three notes; the prerequisites list in §05 "What it expects" | It asks why, before anything is built: what question the product answers, who is asking, and which part of that a feature serves. An afternoon to frame, days to weeks to test the riskiest assumption, a day or two to shape. It needs Claude Code, a GitHub account with the GitHub CLI logged in, Node 24, pnpm and git; protecting `main` on a private repository needs a paid GitHub plan. | `SLIPWAY.md` path table; `README.md` "You need" and "Branch protection"; `.claude/skills/kickoff/SKILL.md` |
| Q7 | Can I use it on a project I already have? | §05 | Not in one command yet: today slipway starts new projects and keeps them up to date with `/sync-slipway`, which prints a plan first and never edits the documents that are yours. Adopting a repository that did not start from slipway is a later bet. The checks, lessons and rules are plain files you can lift on their own. | `SLIPWAY.md` "Taking slipway updates"; D-015; #54 (open) |
| Q8 | What is proven so far? | §06 | Every check has been seen failing on a known-bad example before it was trusted. A private product with one engineer, a web app, has run the gates on real pull requests and taken slipway's updates by sync: some syncs met the yardstick, some missed it, and some were not fully scored, and the page gives all three counts. Its first milestone close with `/close-milestone` has not run yet; what has not been exercised is listed, dated, as unknown. | `SLIPWAY.md` "Exercised on a real project" and "Not verified here" after build step 1; PC1 |
| Q9 | Why was it built? | §07 | Twenty years of building software, most of it learned the hard way; agents changed how the author works, not what the people using the software expect. Quality, transparency and integrity, in the author's words. | the author's biography; rows 65–67 for the three values |

Q8's last sentence changes in build step 3, after the first real close, to what the close took and found. Until
then it reads as above, and the page says so.

### What "cost" means on the page

Time, discipline, prerequisites and the costs `README.md` already states, each sourced. No token or speed
figure: nobody has measured one, and a claim with no source is cut (#252). "No money figure" does not mean
leaving out a known, sourced cost: the hero's notes carry three (below). The one allowed speed claim stays as
#252 words it: slipway gets you to a release that holds up sooner. The clause "by cutting the rework and token
churn of under-planned features" is cut from §01: it is unmeasured.

**The hero's notes,** by the two commands, in the owner's words (2026-10-06), each a claims row citing
`README.md`. The first command stays above the fold at 390 px with them in place.

- Branch protection on a private repository needs a paid GitHub plan.
- The first CI run on `main` is red on purpose.
- The command installs session hooks.

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
yardstick (1 command, at most 3 questions, and the owner can say what changed), how many missed, and how many
were not fully scored, with "not recorded" wherever #43 has no count. Nothing is invented. At a2fcbdf #43
records seven: two met (the second and third), two missed (the first and fourth), three not fully scored (the
fifth: whether the owner could say what changed was not checked; the sixth and seventh: no command count). The
build recounts from #43 on the day it runs. The page never says "most", and never "releases" for what #43
records as ranges of commits.

#55's line, "the page claims nothing about how easy updating is until `SLIPWAY.md` records a real sync meeting
the yardstick", is met once step 1 writes the second sync's line; the page still says no more than the counts.

### Claims: one row per factual claim

The page carries only claims in this table; a claim with no row is cut. A row is one sentence as it will read,
or one **named block** whose entries are listed under Blocks below. The build checks each row against its
source at the sha the PR names, and the PR states the row count. **A row whose claim is stronger than its
source is a finding, not a pass.**

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
| 9 | hero note | the command installs session hooks | `README.md` "What it does" (the agent harness, `.claude/settings.json`) |
| 10 | hero | the package is `use-slipway`; `slipway` on npm is unrelated | `npm view use-slipway`; `npm view slipway` (another publisher) |
| 11 | numbers | 8 steps from a rough idea to a product people use | `SLIPWAY.md` path table, steps 0–7 |
| 12 | numbers | 1 command tells you what to do next | `SLIPWAY.md` "Lost? Run `pnpm status`" |
| 13 | numbers | 1 milestone open at a time | `SLIPWAY.md` gates table, MS1 |
| 14 | numbers | 0 packages to install for the checks to run | `decisions.md` D-004 |
| 15 | thesis | a rule only counts if something fails when it's broken | `SLIPWAY.md` thesis |
| 16 | §01, stage 4 | Everything that worked, with each thing I learned the hard way turned into a check that fails where one can catch it, and a dated rule where it can't, so the next project starts at stage four. (the owner's wording, 2026-10-06) | `SLIPWAY.md` "Lessons, and where each one lives" (the status table) |
| 17 | §01 | slipway gets you to a release that holds up sooner | the one allowed speed claim (#252, the owner's) |
| 18 | §01 | it won't get you to a one-shot MVP | #43 Problem ("not a one-shot tool for a weekend idea") |
| 19 | §01 | does it work: tests the agent is sent back to when they fail, and gates it has to ask before changing | `process/harness/README.md` (the ask rules, the Stop hook, and what it lists as getting past) |
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
| 36 | §02 | the agent looks for an existing helper first; duplicate code fails a ratchet that only lets the number go down | `process/slipway-rules.md` Working rules; `ci/ratchet.mjs` |
| 37 | §02 | the agent keeps going until `pnpm verify:fast` passes, or tells me why it can't | `process/harness/README.md` hooks table |
| 38 | §02 | CI runs the same `pnpm verify` the owner does; no second definition of green | `SLIPWAY.md` gates table, `verify`; `.github/workflows/ci.yml` |
| 39 | §03 | the state of the project lives in the repo; leave it for two weeks, come back, run one command and know what's next | `SLIPWAY.md` "Lost? Run `pnpm status`" |
| 40 | §03 | **block: the tree** (8 entries) | the paths themselves; `SLIPWAY.md` "What is here" |
| 41 | §03 | a live URL since the first week, with analytics checked to fire | `SLIPWAY.md` step 4 |
| 42 | §03 | pull requests that say what was verified, and what wasn't | P1; `.github/pull_request_template.md` |
| 43 | §03 | the skeleton ships in days, and each milestone is a bet you're allowed to lose | `SLIPWAY.md` path table step 4; step 3 ("each milestone is a bet … kill criteria") |
| 44 | §04 | `/kickoff` asks one question at a time | `.claude/skills/kickoff/SKILL.md` lines 9, 23 |
| 45 | §04 | a value risk can be settled by experience when you write what would prove you wrong | `ci/checks/meta/k1-frame.mjs`; F-05 |
| 46 | §04 | an afternoon to frame, days to weeks to test the riskiest assumption, a day or two to shape | `SLIPWAY.md` path table, steps 1–3 |
| 47 | §04 | **block: who it's for, and who it isn't** (5 entries) | per entry, under Blocks |
| 48 | §04 | a short path, a few skills, and checks that fail | `.claude/skills/` (11 skills at a2fcbdf); `SLIPWAY.md` path table |
| 49 | §05 | not in one command yet: slipway starts new projects and keeps them up to date | #54 (open) |
| 50 | §05 | `/sync-slipway` prints a plan before it touches anything, works on its own branch, merges instead of overwriting a file you changed, never edits the documents that are yours | `SLIPWAY.md` "Taking slipway updates"; D-015; `scripts/sync.mjs` |
| 51 | §05 | each release is staged by CI from a version tag, and goes public only when the owner approves that exact package at npm with a second factor | D-027 |
| 52 | §05 | adopting a repository that did not start from slipway is a later bet; help triaging an old backlog is another | #54, #50 (both open) |
| 53 | §05 | the checks are zero-dependency Node scripts, the lessons plain Markdown, the rules one page | D-004; `process/lessons/`; `process/slipway-rules.md` |
| 54 | §05 | what it expects: Node 24, pnpm 10, git, the GitHub CLI logged in, a GitHub account, Claude Code | `README.md` "You need"; `SLIPWAY.md` Requires |
| 55 | §05 | GitHub for issue forms, required checks and Actions; moving elsewhere means rewiring | D-002 |
| 56 | §05 | a default stack you can change in week one: TypeScript, React with Vite, Cloudflare | `SLIPWAY.md` Defaults; D-005–D-008 |
| 57 | §06 | every check is seen failing before it's trusted | PC1; `SLIPWAY.md` Validation |
| 58 | §06 | slipway was built on its own path: planning, reviews and lessons in the repo | `dev/features/`, `decisions.md`, `process/lessons/`, `docs/reviews/` |
| 59 | §06 | a private product with one engineer, a web app, has run the gates on real pull requests and issues | `SLIPWAY.md` "Exercised on a real project" (step 1; the owner's dated account where no public PR is cited) |
| 60 | §06 | **block: the syncs** (the count, then met, missed and not fully scored, together) | `SLIPWAY.md` sync lines (step 1, from #43 Acceptance) |
| 61 | §06 | that project's first milestone close with `/close-milestone` has not run yet | `SLIPWAY.md` "Not verified here" (step 1). **Replaced in step 3** by 3 lines or more on what the close took, what its retro produced and what it found |
| 62 | §06 | **block: not proven yet** (each line of the list, dated, and the link to it) | `SLIPWAY.md` "Not verified here" (step 1) |
| 63 | §06 | next: a fit check for features, and a pause at each milestone to reorganise what should be shared | #48, #49 (both open) |
| 64 | §06 | the whole plan, in order, is epic #43 | #43 |
| 65 | §07 | Quality: gates that can actually fail | PC1 |
| 66 | §07 | Transparency: every PR says what wasn't verified, and this page says what isn't proven | P1; §06 |
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

Sixty-eight rows carry (five of them blocks); nine are cut. Every source is a file in this repository, a
command against npm, an issue in the public repository, or the owner's dated word.

#### Blocks

| block | entries | each entry's source |
|---|---|---|
| the ramp (row 33) | 8: steps 0–7, each with its name, who does it, how long, and one line | `SLIPWAY.md` path table, columns 1–2, and that step's section. Durations as the table gives them: step 0 "1–2 h", step 1 "an afternoon", step 2 "days to weeks", step 3 "1–2 days", step 4 "days", step 5 "the milestone", step 7 "weekly". Step 6 carries no duration until step 3 of the build |
| the tree (row 40) | 8: `docs/product/FRAME.md`, `docs/product/evidence/`, `docs/PRD.md`, `docs/reviews/`, `decisions.md`, `docs/milestones/`, `docs/product/metrics.md`, `process/lessons/` | each path exists in a new project; its one-line role is `SLIPWAY.md` "What is here" |
| who it's for, and who it isn't (row 47) | 5: engineers who own the build, alone or as the only engineer beside people who own the problem; heads-down engineers who want a product mind next to them; not a weekend one-shot; not building without an engineer; not collectors of skills | the owner, 2026-10-06 (The reader); the owner's approved copy, 2026-09-24, and `.claude/skills/kickoff/SKILL.md`; #43 Problem ("not a one-shot tool for a weekend idea"); #43 Problem ("to an engineer"); #43 Problem ("not a pile of skills") |
| the syncs (row 60) | 1 sentence of counts, as "How the page reports the syncs" sets | one dated line per sync in `SLIPWAY.md` |
| not proven yet (row 62) | one bullet per kept line of the list, and the link | `SLIPWAY.md` "Not verified here", each with `Verified against:` |

### What it never says

The build greps `site/index.html` and the README's first screen (from its top through its first code block, which holds the two commands) for
each of these, case-insensitive, and expects 0 lines from each file: `supercharge`, `unlock`, `seamless`,
`effortless`, `AI-powered`, `10x`, `ship faster`, `build faster`, `faster than`, `x faster`,
`production-proven`, `production-ready`, `battle-tested`, `enterprise`, `guarantee`, `replaces`,
`no engineer`, `Cursor`, `Codex`, `Copilot`, `Gemini`, `Windsurf`, `works with any agent`. The bare word
`faster` is not on the list: the plate's "Make it faster", its example of a criterion that cannot fail, stays.
At a2fcbdf the grep prints 0 for both files. The design direction's own forbidden list
(`site/design-direction.md`) stays in force.

Private project names are not written in this repository, so no grep here can look for them. The owner greps
the page from their own list before the page PR is marked ready, and the PR says only that it was run.

### The first screen

At 390 px and at 1280 px, above the fold: what slipway is (the kicker and the lede), that it is for engineers
(the lede's last sentence), and the first command. The headline and the lede stay as the owner approved them on
2026-09-24; the fuller answer to "who is it for" is §04's.

**The README says the same,** tested: the kicker sentence `a project framework for Claude Code` and the two
command lines `npx use-slipway acme --dry-run` and `npx use-slipway acme` are each found by `grep -F` in
`site/index.html` and in the README's first screen. npm shows the README of the published package, not the
repository's, so the same three `grep -F` run against `npm view use-slipway readme` after a patch release that
carries the aligned README. That release is cut before #55 publishes, and it is #55's to check.

### Design and layout

The Manual direction and the steel ground stay (`site/design-direction.md`). `html { scrollbar-gutter: stable; }`
in `site/css/base.css`, and the same on any element the build gives `overflow: auto` or `overflow: scroll` (none
exists at a2fcbdf), so nothing shifts when a scrollbar appears. With the viewport emulated at 390 px,
`document.documentElement.scrollWidth <= document.documentElement.clientWidth`. No new section, page or visual
direction; the hero gains three notes and one line. `site/**` is internal (`dev/ownership.yaml`) and ships to
no project.

### `SLIPWAY.md` first

Build step 1 refreshes `SLIPWAY.md` on its own, now:

- **The syncs.** One dated line per real sync in #43's Acceptance, with its command count and question count,
  or "not recorded" where #43 has none, and how it scored: met, missed, or not fully scored and why. One
  sentence above them gives the counts. No project name, path or product incident. The orchestrator session
  holds the dated list.
- **"Exercised on a real project".** The private project's commit shas are removed. Each line cites a public
  slipway pull request or issue; a line with none is marked as the owner's account, with its date. The project
  is "a private product with one engineer, a web app".
- **"Not verified here".** Each line kept, with `Verified against: <sha> <date>` dated on or after the step's
  start and the BOOTSTRAP §3 probe that first exercises it, or moved out with the slipway PR or issue that
  exercised it. The `/close-milestone` line is kept: it has not run.

Step 3, after the first real close, moves that line out and writes 3 lines or more on what the close took, what
its retro produced and what it found. The page's "What's proven so far" matches `SLIPWAY.md` line for line at
each step: each bullet in §06 is a line in `SLIPWAY.md`, the PR shows the pairing, and the pairing covers every
sync line, not a selection.

### The reader test

**Readers.** Three fresh sessions, each started in a new empty folder outside the repository, so no project
instructions and no project memory load. Two on the strongest tier (Opus 5.5 today) are given the rendered
page's full text and the two first-screen screenshots, and answer all eight questions. One on the fast tier
(Haiku 4.5 today), the nearest thing to a reader who skims, is given only the first two screens (the hero
through §01's answer line) and answers the four those screens must carry: what is it, who is it for, why was it
built, what do I run first. None is given the repository, an issue or this doc. The page is written on the
standard tier (Sonnet 5.5 today), so no reader is the author's model.

**The eight questions:** what is it; who is it for; what does it cost me; what do I run first; what happens
after that; can I use it on a project I already have; what is proven so far; why was it built.

**The judge.** A separate fresh session, also outside the repository, that has seen neither the page nor this
doc. It is given the readers' answers and the required facts below, nothing else, and returns one verdict per
fact per reader: stated, or not. An answer matches when it states every required fact, in any words; a fact
stated wrongly is not stated.

| question | required facts |
|---|---|
| what is it | it is for building a product with Claude Code · it is a path from an idea to a release · its checks fail when a step is skipped |
| who is it for | engineers · (full readers only) one who owns the build alone or as the only engineer beside people who are not engineers |
| what does it cost me | it makes you answer why before building · it needs Claude Code and GitHub · framing and testing the risk take from an afternoon to weeks |
| what do I run first | `npx use-slipway acme`, with `--dry-run` first to change nothing · it creates a folder and a private GitHub repository · then `/bootstrap` in Claude Code |
| what happens after that | a fixed path of steps from framing to learning from users · `pnpm status` says what is next · one milestone at a time |
| can I use it on a project I already have | not in one command today · a project started from slipway takes updates by sync · the checks and rules can be lifted on their own |
| what is proven so far | every check has been seen failing on a known-bad example · one private project has used it, and its syncs did not all meet the bar · the first milestone close has not run (after step 3: it has, and what it found) |
| why was it built | agents made code cheap but not right · what users expect did not change (full readers: or the author's lessons became checks and dated rules) |

**The control comes first.** Before the page changes, the test runs once on today's page and its score is
recorded in the PR. Today's page is known to be wrong on "what is proven so far" and "can I use it on a project
I already have", so the control must miss at least one required fact there. If it misses none, the test cannot
tell a stale page from a true one: the required facts are sharpened and the control re-run before anything on
the page changes, and the PR says so.

**Rounds.** Every round is in the PR: the questions, each answer, each verdict. Every fact stated by every
reader passes. Otherwise the page changes and new sessions answer, up to 3 rounds after the control. A third
failed round stops the build and goes to the owner with the three records.

### The commands run

- **Run by the build session,** in a new empty folder made with `mktemp -d`: `npx use-slipway <name> --dry-run`,
  where `<name>` is a folder name unique to the run. The page prints `acme`; the folder name is the only thing
  changed.
- **Run by a person following only the page:** `npx use-slipway <name>` on their own GitHub account, then
  Claude Code and `/bootstrap` in the folder it made, then `pnpm status` there. If that person is the author,
  the PR says so in those words, and says that no stranger has tested the path. Their notes of every guess go
  in the PR, as the runner's own notes, and each is fixed on the page in the same PR. Afterwards the same person
  removes the folder and the repository (`gh repo delete <owner>/<name>`, which needs
  `gh auth refresh -s delete_repo` once).
- **Named on the page, not run:** `/kickoff`, `/close-milestone`, `/sync-slipway`, `pnpm verify`,
  `pnpm verify:fast` and `--adopt`. Today's page writes the update command as `sync`, which is not a command a
  reader can type: the build writes `/sync-slipway`.
- **The version that ran.** The first line of each run's output is `slipway <version> → …`. That version equals
  `npm view use-slipway dist-tags.latest` on the day, or the run does not count: `npx` may hold an older copy.
  No version number is printed on the page.

### Build order

Three steps. The first two run now; only the third waits. #55 publishes after the third, and there is no date
at which the page ships without it.

1. `SLIPWAY.md`, now.
2. The page, now: it says the first milestone close has not run, and gives step 6 no duration.
3. After a real project has closed its first milestone with `/close-milestone`: the close lines in
   `SLIPWAY.md`, row 61 and Q8's last sentence on the page, and step 6's time.

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

Not defended here: a typo other than the bare name; a reader who runs the command without reading the notes.
The page loads fonts from Google Fonts as it does today, which sends each visitor's address to a third party
once the page is public: #55's to settle.

## Known limitations

- **No stranger has run the path.** The run from the first command through `/bootstrap` is by a person
  following only the page, and that person is probably the author, who cannot unknow the CLI. The PR says who
  ran it. A run by an engineer who has not used slipway is a named follow-up under #252, with its date the
  owner's to set, and does not gate #55.
- An agent session is a more patient reader than a stranger: every fact from three sessions is a floor, not a
  proof of clarity. The judge scores required facts, not whether the page persuades.
- The time the page gives step 6, once step 3 writes it, is the first real close's: one data point.
- Private project names are checked by the owner against a list that lives outside the repository, so the
  repository cannot show that grep ran; the PR says it did.
- The author's biography has no source; it is signed. Lines in `SLIPWAY.md` about the real project that cite no
  public pull request are the owner's dated account, and are marked so.
- The word grep finds listed phrases, not every overclaim; the claims table is the check on those.

## Acceptance

```
A1   Given  this doc
     When   it is read
     Then   it names 1 primary reader, 9 questions in order, each with the section that carries it, an answer of
            3 sentences or fewer and a source, and a claims table in which every row is 1 sentence or 1 named
            block with its entries listed, 0 rows citing outside the public repository, npm or the owner's dated word

A2   Given  the doc, before the page changes
     When   docs/reviews/ is read
     Then   a review there names this doc and its current Version line, and R1 reports nothing for it

A3   Given  SLIPWAY.md after build step 1
     When   "Exercised on a real project" and "Not verified here" are read
     Then   every real sync in #43 has a dated line with its command and question counts, or "not recorded",
            and how it scored; 1 sentence gives the counts of met, missed and not fully scored; 0 commit shas
            of a private project remain; every "Not verified here" line carries Verified against: <sha> <date>

A4   Given  the page after build step 2
     When   §06 "What's proven so far" is compared with SLIPWAY.md
     Then   each bullet pairs with one line, every sync line is covered by the counts, and the pairing is in the PR

A5   Given  today's page, before it changes
     When   the reader test runs once as the control
     Then   its score is in the PR, and it misses 1 required fact or more on "what is proven so far" or
            "can I use it on a project I already have"

A6   Given  the rendered page after build step 2 and nothing else
     When   2 full readers answer the 8 questions and 1 fast-tier reader answers 4 from the first two screens,
            and a separate session scores them against the required facts
     Then   every required fact is stated by every reader within 3 rounds, and every round is in the PR

A7   Given  the page at 390 px and at 1280 px
     When   a screenshot of the first screen is taken
     Then   it shows what slipway is, that it is for engineers, and the first command; both are in the PR

A8   Given  a new empty folder and the published package
     When   the dry run is run by the build session, and the real run through /bootstrap and pnpm status by a
            person following only the page
     Then   each output is in the PR, its version line equals npm view use-slipway dist-tags.latest, the PR
            says who ran the real run, and every guess in the runner's notes is fixed on the page

A9   Given  site/index.html and the README's first screen after the build
     When   each is grepped for the listed words
     Then   0 lines match in each

A10  Given  the page PR before it is marked ready
     When   the owner greps the page from their own list of private names
     Then   the PR says it was run

A11  Given  site/index.html and the README's first screen after the build
     When   grep -F looks for the kicker sentence and each of the two command lines
     Then   each is found in both files

A12  Given  site/css after the build, with the viewport emulated at 390 px
     When   the page renders
     Then   document.documentElement.scrollWidth <= document.documentElement.clientWidth, and
            scrollbar-gutter: stable is set on html and on every scrolling container

A13  Given  SLIPWAY.md and the page after build step 3
     When   the first real close is looked for
     Then   SLIPWAY.md has 3 lines or more on it, each citing a slipway pull request, commit or issue or marked
            as the owner's dated account; the page's step 6 gives the time it took; §06 pairs with those lines

A14  Given  the repository after each build step
     When   pnpm meta runs
     Then   it exits 0
```

## Verify

```
pnpm meta                                                        # exit 0, each step
grep -l -F "$(grep -m1 '^Version:' dev/features/landing-page.md | cut -d' ' -f1-3)" docs/reviews/*landing-page*.md   # 1 file: a review of the current version
grep -n 'Verified against' SLIPWAY.md                            # only under "Not verified here", dated after step 1
sed -n '/^### Exercised on a real project/,/^### Not verified here/p' SLIPWAY.md | grep -c -E '\b[0-9a-f]{7,40}\b'   # 0 after step 1 (3 at a2fcbdf)
W='supercharge|unlock|seamless|effortless|AI-powered|10x|ship faster|build faster|faster than|x faster|production-proven|production-ready|battle-tested|enterprise|guarantee|replaces|no engineer|Cursor|Codex|Copilot|Gemini|Windsurf|works with any agent'
grep -c -i -E "$W" site/index.html                               # 0
awk '{print} /^```$/{exit}' README.md | grep -c -i -E "$W"   # 0
for s in 'a project framework for Claude Code' 'npx use-slipway acme --dry-run' 'npx use-slipway acme'; do grep -c -F "$s" site/index.html; awk '{print} /^```$/{exit}' README.md | grep -c -F "$s"; done   # every count 1 or more
grep -n 'scrollbar-gutter: stable' site/css/base.css site/css/manual.css   # the html rule, and one per scrolling container
npm view use-slipway dist-tags.latest                            # equals the version on each run's first line
cd "$(mktemp -d)" && npx use-slipway <unique-name> --dry-run     # build session; output pasted
npx use-slipway <unique-name>                                    # a person, their own account; then /bootstrap and pnpm status; then gh repo delete
# in the browser, viewport emulated at 390 px:
#   document.documentElement.scrollWidth <= document.documentElement.clientWidth   → true
# the reader test: control on today's page, then up to 3 rounds; readers and judge started outside the repository
```

## Build map

1. `SLIPWAY.md`, now: one dated line per real sync with its counts or "not recorded" and how it scored, and the
   sentence of counts; "Exercised on a real project" citing public slipway pull requests and issues, the
   private project's shas removed; "Not verified here" re-dated. Docs, ~80 lines. · #270
2. The page, now: the control round on today's page first; then the stale §04, §05 and §06 claims and the cut
   rows; the stage-4 sentence; the hero's three notes and the `use-slipway` line; the release sentence in §05;
   §06 with every sync outcome and "the close has not run"; step 6 without a duration; the scrollbar gutter;
   `README.md`'s first screen aligned and grepped; the dry run, the person-run path and its cleanup; the two
   screenshots; the scroll-width check; the reader test, up to 3 rounds. Site and docs, ~250 lines. Blocked by 1.
   · #271
3. After the first real `/close-milestone`: the close's lines in `SLIPWAY.md` (3 or more), row 61 and Q8's last
   sentence on the page, step 6's time, the pairing re-shown. Docs and site, ~30 lines. Blocked by 2.

Before #55 publishes, and #55's to check: step 3 has merged, and a patch release carries the aligned README
(`npm view use-slipway readme` passes the three `grep -F` of A11).

## Out of scope

- Publishing the page and its hosting, the patch release that carries the README, and whether a public page
  loads fonts from Google: #55.
- A run of the path by an engineer who has not used slipway: a follow-up under #252, its date the owner's.
- What else shipped since the page was written (a check deferred to after merge stays owed, F-09; a session
  cannot approve its own gate changes): not put on the page. Releases get one sentence (row 51); the rest is
  how slipway works inside, which the reader does not need to decide.
- A new visual direction, a second page, a documentation site, translation: #55's Out of scope.
- A token or speed figure for what slipway costs: a measurement nobody has taken.
- A script that generates "What's proven" from `SLIPWAY.md`: rejected above; reopen if the table drifts twice.
- Adopting an existing repository (#54) and backlog triage (#50): the page says they are later bets.

## Open questions

none open. Settled by the owner: the reader and the real-project wording (2026-10-06); the first line
(2026-09-24); the resolutions of the review of 0.1, AR-1 to AR-14 (2026-10-06, relayed by the review session).
Settled in shaping, and the owner's to move in this doc: the order of the nine questions, the required facts,
the wording of rows 19, 22 and 27, and that the two sentences in §01's stages 2 and 3 about what changed for
the author ("the quality I could expect changed overnight", "the results became consistent") are biography:
what happened on the author's own projects before slipway, in the past tense.

## Changes

- 2026-10-06 · ADDED · shaped for #252 (part of #55); the Contract and Verify above are embedded in #252's body; built by #270 then #271
- 2026-10-06 · MODIFIED · Version 0.1 → 0.2, resolving the review of 0.1 (`docs/reviews/2026-10-06-landing-page-0.1.md`, AR-1 to AR-14; AR-15 was settled in #273): the reader test has a judge, required facts, a control and a cap; the syncs are reported as all outcomes; biography only is exempt from a row; five rows reworded to their sources; the build splits into now and after the close; a ninth question; the real project is "a web app"; the person-run path says who ran it; three hero notes and the `use-slipway` line; the word list and the scroll check corrected. The Contract and Verify are re-copied into #252, #270 and #271
