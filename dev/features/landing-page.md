---
prd-ref: D-016
status: draft
---

# F-11 — Landing page: a stranger learns what slipway does, why, and what to run

Version: 0.1 (2026-10-06) — this line is the one a `/review-doc` review cites; it moves when the Contract or
Verify below changes.

## Problem

`site/index.html` answers seven questions and reads well, but it describes slipway as it stood two weeks before
`use-slipway@0.1.1`; `latest` is `0.1.2` today. Three things are wrong with publishing it as it is (#252):

1. **Parts are out of date.** "What's proven so far" says a real project's first milestone has not started, that a
   sync took two commands and about seven questions, and that the whole plan's next step is something already
   shipped. "What does it ask of me?" says evidence from experience is "next on the list"; it shipped (F-05, #47).
   "Can I use it on a project I already have?" calls adopting a repository that did not start from slipway "in
   progress"; it is an open bet (#54). Since the page was written: releases are staged from CI and approved by the
   owner with a second factor (D-027); sync has run seven times on a real project and met #43's yardstick on
   most of them; a check that cannot run before merge is tracked until it has (F-09); a session cannot approve
   its own changes to the gates; a real project has built every item of its first milestone through these rules.
2. **Nobody has tested whether it is clear.** The page was reviewed by its author and for its design. No reader
   who knows nothing about slipway has been asked what it says.
3. **Its first command now reaches a stranger.** `npx use-slipway acme` is public. The page's commands have not
   been run, end to end, from the published package by someone following only the page.

`SLIPWAY.md` is the page's source for what is proven (#55's acceptance ties the two), and its own "Not verified
here" list is dated 2026-09-24 and 2026-09-25. The sync results that meet #43's yardstick are not written in it.
`site/css/` reserves no scrollbar gutter.

**Job:** when I land on slipway's page from npm or GitHub knowing nothing about it, I want to learn what it is,
whether it is for me, what it asks of me and what to run, so I can decide in five minutes whether to try it and
run the first command without guessing.

**Evidence:** `site/index.html` §06 against #43's Acceptance (seven scored syncs, the best at 1 command and 0
questions); §04 against `ci/checks/meta/k1-frame.mjs` (`experience:` settles a value risk); `npm view
use-slipway dist-tags` (`latest: 0.1.2`); `grep scrollbar-gutter site/css/*.css` (nothing). Workaround: none.
Why now: #43's Order says #252, then the first real `/close-milestone`, then #55 publishes.

Serves the thesis in `SLIPWAY.md` (a rule exists only where something fires): a front page with unsourced
claims contradicts it. Decisions it rests on: the page never shows slipway's machinery and the owner is asked
only product questions (D-016); commands name the published package at `latest` (D-027).

**Verdict: PROCEED**, as #252 shapes it: refresh `SLIPWAY.md` first, give every claim a source, test the page on
readers who know nothing, run every command from the published package, and start the steps that write what is
proven only after a real project has closed its first milestone.

| option | for | against | verdict |
|---|---|---|---|
| do nothing: publish the page as it is | no work | publishes claims the repository contradicts | rejected |
| the ask: refresh, source, test, run | every line checkable; the test is on the reader, not the author | two steps wait for the first real close | **proceeds** |
| generate "What's proven" from `SLIPWAY.md` by script | can never drift | machinery for one page (decision-defaults §10); a claims table per release is enough, a check only if drift recurs | rejected |
| cut the page to the README's first screen | less to keep true | answers none of the reader's "why" questions; #55 exists because the README is a reference | rejected |

## Contract

Verified against: 80f2a46 2026-10-06 — read in full on `main`: `site/index.html`, `site/css/base.css`,
`site/css/manual.css`, `site/design-direction.md`, `SLIPWAY.md`, `README.md` (first screen), `BOOTSTRAP.md`
(requirements), `dev/ownership.yaml` (`site/**` internal), `decisions.md` (D-002, D-004, D-016, D-027),
`ci/checks/meta/k1-frame.mjs` and `ci/checks/lib/risks.mjs` (`experience`), `.claude/skills/` (11 skills),
`process/harness/README.md` (the Stop hook), `ci/ratchet.mjs`; #43 (Acceptance and Order), #45, #48, #50,
#54, #55, #91, #233; `npm view use-slipway dist-tags` (`latest: 0.1.2`, `next: 0.1.0-rc.1`).

### The reader

One primary reader, confirmed by the owner on 2026-10-06: **the solo builder shipping their own product with
Claude Code**, including the one engineer working beside co-founders who are not engineers. They arrive from
npm, GitHub or a link, have never heard of slipway, and have watched a coding agent report "done" on work that
was never run. They decide in about five minutes. The page is written to them in the owner's voice (the candid
builder, first person, real incidents: `site/design-direction.md`), and nobody else is written for.

### The questions, in the order the reader asks them

Each answer is the intended answer, three sentences or fewer, with what backs it. The page's sections carry
these answers in this order; the first screen previews two of them (what it is, and the first command), because
the acceptance wants both above the fold. One sentence of why slipway was built sits in the first screen (the
headline), and the full account is last.

| # | the reader asks | the intended answer | backed by |
|---|---|---|---|
| 1 | What is it, and is it for me? | A project framework for Claude Code: a path from a rough idea to a release that holds up, with checks that fail when a step is skipped. For an engineer who owns the build, alone or as the only engineer beside people who own the problem. By an engineer, for engineers. | `README.md` lines 1–11; `SLIPWAY.md` "Start here"; `site/design-direction.md` Job |
| 2 | What problem does it solve, and why bother? | Agents made writing code cheap; they did not make it right, useful or coherent, and that part is still engineering. Slipway is ordinary engineering discipline applied to agents, so the next project starts where the author's fourth attempt ended. AI changed how we build software; it did not change what users expect from it. | `SLIPWAY.md` thesis; #43 Problem; author's account (testimony, see Claims) |
| 3 | What do I run first? | `npx use-slipway acme --dry-run` prints every step and changes nothing; `npx use-slipway acme` creates `./acme` and a private GitHub repository. Then open Claude Code in it and run `/bootstrap`. | `README.md` "Start a project"; `BOOTSTRAP.md` §0; run as written (Verify) |
| 4 | What happens after that? | Eight steps from a rough idea to something people use: bootstrap, frame, test the risk, shape, skeleton, build, close, learn, then back to build. `pnpm status` reads the repository and prints which step you are on and what to do next; agent sessions get the same line when they start. One milestone is open at a time. | `SLIPWAY.md` path table and "Lost?"; `process/harness/hooks/session-state.sh`; MS1 |
| 5 | What does it ask of me? | It asks why, before anything is built: what question the product answers, who is asking, and which part of that a feature serves. It needs Node 24, pnpm, git, the GitHub CLI, a GitHub account and Claude Code. An afternoon to frame, days to test the riskiest assumption, a day or two to shape. | `README.md` "You need"; `SLIPWAY.md` Requires and path table; `.claude/skills/kickoff/SKILL.md` (one question at a time) |
| 6 | Can I use it on a project I already have? | Not in one command yet: today slipway starts new projects and keeps them up to date with `sync`, which prints a plan first and never edits the documents that are yours. Adopting a repository that did not start from slipway is an open bet, not in progress. The checks, lessons and rules are plain files you can lift on their own. | `SLIPWAY.md` "Taking slipway updates"; D-015; #54 (open) |
| 7 | What is proven so far? | Every check has been seen failing on a known-bad example before it was trusted. A private product with one engineer has run its gates on real pull requests, taken seven slipway releases by sync, and closed its first milestone with `/close-milestone`; what that took is listed, dated. What has not been exercised is listed too, as unknown. | `SLIPWAY.md` "Exercised on a real project" and "Not verified here", refreshed in build step 1; PC1 |
| 8 | Why was it built? | Twenty years of building software, and most of it learned the hard way; agents changed how the author works, not what the people using the software expect. Quality, transparency and integrity, in the author's words. | author's account (testimony) |

The six questions the three-reader test asks map onto these: what is it (1), who is it for (1), what does it
cost me (5), what do I run first (3), what happens after that (4), why was it built (2 and 8).

### What "cost" means on the page

Time, discipline and prerequisites, each sourced. No token, money or speed figure: nobody has measured one, and
a claim with no source is cut (#252). The one allowed speed claim stays as the issue words it: slipway gets you
to a release that holds up sooner. The clause "by cutting the rework and token churn of under-planned
features" is cut from §01: it is unmeasured.

### How the page describes the real project

Set by the owner on 2026-10-06: **"a private product with one engineer"**, plus its kind in two words. Never its
name, domain, size, numbers or incidents (#252). Every row about it cites `SLIPWAY.md`, dated; nothing on the
page about that project has another source.

### Claims: one row per factual claim

The page carries only claims in this table; a claim with no row is cut. The build checks each row against its
source at the sha the PR names, and the PR states the row count. Rows marked *refresh* take their wording from
`SLIPWAY.md` after build step 1; rows marked *cut* leave the page.

**Testimony is not a claim.** The author's account in §01 (the four stages) and §07 (twenty years, the three
values) is first-person testimony, signed, and makes no claim about what slipway does. It has no rows. A
sentence inside it that claims a product behaviour gets a row like any other.

| # | section | claim (as it will read) | source |
|---|---|---|---|
| 1 | head, hero | a project framework for Claude Code; a path from a rough idea to a release that holds up, with checks that fail when a step gets skipped | `README.md` 1–11; `SLIPWAY.md` "Start here" |
| 2 | hero | a slipway is the ramp a ship is built on | `README.md` 5 |
| 3 | hero | `npx use-slipway acme --dry-run` prints every step it would take and changes nothing | `README.md` "Start a project"; run (Verify) |
| 4 | hero | `npx use-slipway acme` creates `./acme` and a private GitHub repository | `README.md`; run (Verify) |
| 5 | hero | then open Claude Code and run `/bootstrap` | `README.md`; `BOOTSTRAP.md` |
| 6 | numbers | 8 steps from a rough idea to a product people use | `SLIPWAY.md` path table, steps 0–7 |
| 7 | numbers | 1 command tells you what to do next | `SLIPWAY.md` "Lost? Run `pnpm status`" |
| 8 | numbers | 1 milestone open at a time | `SLIPWAY.md` gates table, MS1 |
| 9 | numbers | 0 packages to install for the checks to run | `decisions.md` D-004; `SLIPWAY.md` "All checks are zero-dependency" |
| 10 | thesis | a rule only counts if something fails when it's broken | `SLIPWAY.md` thesis |
| 11 | §01 | slipway gets you to a release that holds up sooner | the allowed claim (#252); the "token churn" clause is *cut* |
| 12 | §01 | it won't get you to a one-shot MVP | #43 Problem ("not a one-shot tool for a weekend idea") |
| 13 | §01 | tests and gates the agent can't talk its way past | `SLIPWAY.md` gates table; `process/harness/README.md` |
| 14 | §01 | "does it feel right" is not checked yet; it is next | #48 (open) |
| 15 | plate | a hook runs `pnpm verify:fast` when the agent tries to stop; it can't end a turn on red | `process/harness/README.md`; `process/harness/hooks/stop-verify.sh` |
| 16 | plate | every check has a known-bad example it must go red on, for exactly the expected reasons | `ci/checks/meta/pc1-positive-control.mjs`; `ci/fixtures/known-bad/` |
| 17 | plate | every gated script has to be invoked by a CI workflow | `ci/checks/meta/w1-declared-vs-invoked.mjs` |
| 18 | plate | the PR description has to say what was verified and link its issue | `ci/checks/meta/p1-pr-body.mjs` |
| 19 | plate | issues can't use a bare adjective as a criterion | `ci/checks/meta/i1-issue-shape.mjs` |
| 20 | plate | the PRD needs a written review from a fresh session that names the version it read | `ci/checks/meta/r1-review-provenance.mjs` |
| 21 | plate | no milestone past the first skeleton starts until each value risk has a result against a bar written first, or is settled by experience with what would prove it wrong written down | `ci/checks/meta/k1-frame.mjs` (*refresh*: adds the experience clause) |
| 22 | plate | one milestone active at a time; past its time budget it needs a written decision | `ci/checks/meta/ms1-milestones.mjs` |
| 23 | plate | every lesson names where it's enforced; judgment ones get a review date and fail when it passes | `ci/checks/meta/l1-lessons.mjs` |
| 24 | plate | the checks run on plain Node with nothing to install | D-004 |
| 25 | §02 | `pnpm status` reads the repo and prints which step you're on; agent sessions get the same line when they start | `ci/status.mjs`; `process/harness/hooks/session-state.sh` |
| 26 | §02 | each step's owner and rough duration, as the ramp lists them | `SLIPWAY.md` path table, column 2; step 6's "an hour" is *refresh*: taken from the first real close, and until then the page says the step has never run |
| 27 | §02 | anything not in the active milestone goes to its no-gos or a later one | `process/slipway-rules.md` "One active milestone" |
| 28 | §02 | one sentence and no new behaviour is a plain PR; one session's work gets an issue; bigger gets a feature doc | `SLIPWAY.md` "Every change: pick a lane" |
| 29 | §02 | the agent looks for an existing helper first; duplicate code fails a ratchet that only lets the number go down | `process/slipway-rules.md` Working rules; `ci/ratchet.mjs` |
| 30 | §02 | CI runs the same `pnpm verify` the owner does; no second definition of green | `SLIPWAY.md` gates table, `verify`; `.github/workflows/ci.yml` |
| 31 | §03 | each file in the tree exists in a new project, with the role the page gives it | `docs/product/FRAME.md`, `docs/product/evidence/`, `docs/PRD.md`, `docs/reviews/`, `decisions.md`, `docs/milestones/`, `docs/product/metrics.md`, `process/lessons/`; `SLIPWAY.md` "What is here" |
| 32 | §03 | a live URL since the first week, with analytics checked to fire | `SLIPWAY.md` step 4 |
| 33 | §03 | pull requests that say what was verified, and what wasn't | P1; `.github/pull_request_template.md` |
| 34 | §04 | `/kickoff` asks one question at a time | `.claude/skills/kickoff/SKILL.md` 9, 23 |
| 35 | §04 | a value risk can be settled by experience when the owner writes what would prove them wrong | `ci/checks/meta/k1-frame.mjs`; F-05 (*refresh*: replaces "next on the list") |
| 36 | §04 | what it needs: Node 24, pnpm, git, the GitHub CLI, a GitHub account, Claude Code | `README.md` "You need"; `SLIPWAY.md` Requires |
| 37 | §04 | who it is for, and who it is not for | `site/design-direction.md` Job; the owner, 2026-10-06 (this doc) |
| 38 | §04 | it isn't a pack of hundreds of agents: a short path and a few skills | `.claude/skills/` (11 skills at 80f2a46) |
| 39 | §05 | not in one command yet: slipway starts new projects and keeps them up to date | #54 (open) |
| 40 | §05 | `sync` prints a plan before it touches anything, works on its own branch, merges instead of overwriting a file you changed, never edits the documents that are yours | `SLIPWAY.md` "Taking slipway updates"; D-015 |
| 41 | §05 | adopting a repository that did not start from slipway is a later bet; help triaging an old backlog is another | #54, #50 (*refresh*: replaces "in progress") |
| 42 | §05 | the checks are zero-dependency Node scripts, the lessons plain Markdown, the rules one page | D-004; `process/lessons/`; `process/slipway-rules.md` |
| 43 | §05 | GitHub for issue forms, required checks and Actions; moving elsewhere means rewiring | D-002 |
| 44 | §05 | a default stack you can change in week one: TypeScript, React with Vite, Cloudflare | `SLIPWAY.md` Defaults; D-005–D-008 |
| 45 | §06 | every check is seen failing before it's trusted | PC1; `SLIPWAY.md` Validation |
| 46 | §06 | slipway was built on its own path: planning, reviews and lessons in the repo | `dev/features/`, `decisions.md`, `process/lessons/` |
| 47 | §06 | a private product with one engineer has run the gates on real pull requests and issues | `SLIPWAY.md` "Exercised on a real project" (*refresh*) |
| 48 | §06 | that project has taken slipway releases by sync; how many commands and questions each took | `SLIPWAY.md` sync yardstick lines (*refresh*, from #43 Acceptance, dated) |
| 49 | §06 | that project closed its first milestone with `/close-milestone`: what the close took, what its retro produced, what it found | `SLIPWAY.md` (*refresh*: 3 rows or more, written after the first real close) |
| 50 | §06 | what is not proven, dated, with a link to the list | `SLIPWAY.md` "Not verified here" (*refresh*) |
| 51 | §06 | next: a fit check for features; the whole plan is epic #43 | #48; #43 |
| 52 | §07 | every PR says what wasn't verified, and this page says what isn't proven | P1; §06 |
| 53 | footer | Source, the guide, day zero | `README.md`, `SLIPWAY.md`, `BOOTSTRAP.md` |
| 54 | §06 (today) | "a sync took two commands and about seven questions" | *cut*: superseded by row 48 |
| 55 | §06 (today) | "that project's first milestone hasn't started" | *cut*: superseded by row 49 |
| 56 | §04, §06 (today) | "evidence from experience is next on the list" | *cut*: superseded by row 35 |

Fifty-three rows carry; three are cut. Every source is a file in this repository, a command against npm, or an
issue in the public repository.

### What it never says

The build greps `site/index.html` for each of these, case-insensitive, and expects 0 lines: `supercharge`,
`unlock`, `seamless`, `effortless`, `AI-powered`, `10x`, `ship faster`, `faster`, `production-proven`,
`production-ready`, `battle-tested`, `enterprise`, `guarantee`, `replaces`, `no engineer`, `Cursor`, `Codex`,
`Copilot`, `Gemini`, `Windsurf`, `works with any agent`. The design direction's own forbidden list
(`site/design-direction.md`) stays in force. Private project names are not written in this repository: the
owner greps for them from their own list before the page PR is marked ready, and the PR says the grep was run,
never what it looked for.

### The first screen

At 390 px and at 1280 px, above the fold: what slipway is (the kicker and the lede), who it is for (the lede's
last sentence), and the first command. The headline and the lede stay as the owner approved them on 2026-09-24.
The README's first screen (its first heading, lede and the two commands) says the same thing as the page's.

### Design and layout

The Manual direction and the steel ground stay (`site/design-direction.md`). `html { scrollbar-gutter: stable; }`
in `site/css/base.css`, and the same on any element the build gives `overflow: auto` or `overflow: scroll` (none exists at 80f2a46), so nothing
shifts when a scrollbar appears. At 390 px `document.documentElement.scrollWidth` equals the viewport width.
No new section, page or visual direction. `site/**` is internal (`dev/ownership.yaml`) and ships to no project.

### `SLIPWAY.md` first

Build step 1 refreshes `SLIPWAY.md` on its own: "Exercised on a real project" and "Not verified here" as of the
release current then, each kept line with `Verified against: <sha> <date>` (the method of #45), and one dated
line per real sync with its command and question counts against #43's yardstick (the orchestrator session holds
that list, with no project named). The page's "What's proven so far" then matches it line for line: each bullet
in §06 is a line in `SLIPWAY.md`, and the PR shows the pairing.

### The three-reader test

Three fresh-context agent sessions, each given only the rendered page (its text and the two screenshots), no
repository, no issue, no this doc; on a model other than the author's, one of them on the fast tier as the
nearest thing to a reader who skims. Each answers the six questions in its own words. A verdict per answer: it
matches the intended answer in the table above, or it does not. Six of six for each reader, or the page changes
and the test runs again with new sessions. The questions, the answers and the verdicts go in the PR.

### The commands run

Every command printed on the page is run as written, in a clean folder, against `use-slipway@latest`, and the
output is pasted in the PR. The path from `npx use-slipway acme` through `/bootstrap` is run once from the
published package by a person following only the page; anything they had to guess is a finding fixed on the
page in the same PR. No version number is printed on the page: the commands name `@latest`, so nothing goes
stale with the next release.

### Build order

The shaping (this doc, `/review-doc`) runs now. The steps that write what is proven start only after a real
project has closed its first milestone with `/close-milestone`, which has not happened at 80f2a46: the page
names that step, gives it the time the first close took, and until then says it has never run.

## Seams

One person added: the outside reader, who has never heard of slipway and whose first command creates a
repository on their account. No channel. No promise beyond what the page states; every statement on it is a
promise about what the commands and checks do, which is why each one has a source and each command is run.

## Threat model

none beyond baseline. The page adds no network call, cache, subprocess, stored secret, user input or deletion.
Its commands are shown exactly as `README.md` documents them, and do nothing the README does not say; the page
fetches fonts from Google Fonts as it does today, and nothing else.

## Known limitations

- An agent session is a more patient reader than a stranger: six of six from three sessions is a floor, not a
  proof of clarity. A human running the path from the page alone is the second check, and the owner may add a
  human reader.
- The time the page gives step 6 is the first real close's, one data point.
- Private project names are checked by the owner against a list that lives outside the repository, so the
  repository cannot show that grep ran; the PR says it did.
- The author's account is testimony and has no source; it is signed, and the page says so by its voice.
- Claims about the real project are only what `SLIPWAY.md` records; a reader cannot check them further, by
  design (#252).

## Acceptance

```
Given  this doc at dev/features/landing-page.md
When   it is read
Then   it names 1 primary reader, 8 questions in order with an answer of 3 sentences or fewer each and a source,
       and a claims table with 1 row per factual claim on the page, 0 rows citing outside the public repository or npm

Given  the doc, before the page changes
When   /review-doc runs on it from a fresh context
Then   a review file in docs/reviews/ names this doc and its Version line

Given  SLIPWAY.md after build step 1
When   "Exercised on a real project" and "Not verified here" are read
Then   every kept line carries Verified against: <sha> <date>, every real sync has a dated line with its
       command and question counts, and the first close has 3 lines or more

Given  the page after build step 2
When   §06 "What's proven so far" is compared with SLIPWAY.md
Then   each bullet pairs with one line, and the pairing is in the PR

Given  the rendered page and nothing else
When   3 fresh agent sessions answer the 6 questions
Then   6 of 6 verdicts match for each, or the page changes and 3 new sessions answer again

Given  the page at 390 px and at 1280 px
When   a screenshot of the first screen is taken
Then   it shows what slipway is, who it is for, and the first command; both screenshots are in the PR

Given  a clean folder and use-slipway@latest
When   each command on the page runs as written
Then   its output is in the PR, and the person-run path through /bootstrap has 0 unfixed guesses

Given  site/index.html after the build
When   it is grepped for the listed words
Then   0 lines match, and no private project name, number or incident is on it

Given  site/css after the build
When   the page renders at 390 px
Then   document.documentElement.scrollWidth equals the viewport width, scrollbar-gutter: stable is set on html
       and on every scrolling container, and the README's first screen says what the page's does

Given  the repository after each build step
When   pnpm meta runs
Then   it exits 0
```

## Verify

```
pnpm meta                                                        # exit 0, each step
ls docs/reviews/ | grep landing-page                             # 1 review, before step 2
grep -n 'Verified against' SLIPWAY.md                            # one per kept line, dated after step 1
grep -c -i -E 'supercharge|unlock|seamless|effortless|AI-powered|10x|ship faster|faster|production-proven|production-ready|battle-tested|enterprise|guarantee|replaces|no engineer|Cursor|Codex|Copilot|Gemini|Windsurf|works with any agent' site/index.html   # 0
grep -n 'scrollbar-gutter: stable' site/css/base.css site/css/manual.css   # html rule, and one per scrolling container
npm view use-slipway dist-tags.latest                            # the version the commands ran against
mkdir -p "$(mktemp -d)/run" && cd "$_" && npx use-slipway acme --dry-run   # output pasted
npx use-slipway acme                                             # output pasted; then /bootstrap by a person
# in the browser at 390 px: document.documentElement.scrollWidth === window.innerWidth   → true
# three fresh sessions, page text + two screenshots only: 6 answers each, verdicts in the PR
```

## Build map

1. Refresh `SLIPWAY.md`: "Exercised on a real project", the sync yardstick lines (one per real sync, dated,
   counts only) and "Not verified here" as of the release current then, each kept line verified against
   `main`; the first close's lines. Docs, ~80 lines. **After the first real `/close-milestone`.**
2. The page and what it mirrors: §04, §05 and §06 rewritten from the claims table; the §01 clause cut; the
   scrollbar gutter in `site/css/base.css`; `README.md`'s first screen aligned with the page's; the word grep;
   then the commands run from `use-slipway@latest`, the person-run path, the two screenshots, the scroll-width
   check and the three-reader test, with findings fixed in the same PR. Site and docs, ~200 lines. Blocked by 1.

## Out of scope

- Publishing the page and its hosting: #55.
- A new visual direction, a second page, a documentation site, translation: #55's Out of scope.
- A token or money figure for what slipway costs: a measurement nobody has taken; a later ticket if the owner
  wants one.
- A script that generates "What's proven" from `SLIPWAY.md`: rejected above; reopen if the table drifts twice.
- Adopting an existing repository (#54) and backlog triage (#50): the page says they are open bets.

## Open questions

none. The first line stays as approved on 2026-09-24; the reader and the real-project wording were set by the
owner on 2026-10-06; the question order, what "cost" means and the reader test's method were settled in
shaping (advice from the orchestrator session, 2026-10-06) and are the owner's to move in this doc.

## Changes

- 2026-10-06 · ADDED · shaped for #252 (part of #55); the Contract and Verify above are embedded in #252's body
