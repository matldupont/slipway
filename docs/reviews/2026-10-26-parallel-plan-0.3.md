# Adversarial review — F-17 parallel plan 0.3

Reviewed: dev/features/parallel-plan.md @ 4d51a3d
Version line: Version: 0.3 (2026-10-25)
Supersedes: docs/reviews/2026-10-23-parallel-plan-0.1.md
Supersedes: docs/reviews/2026-10-25-parallel-plan-0.2.md
Review date: 2026-10-26
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

4d51a3d is the head of PR #533's branch, `docs/feature-parallel-plan`. This session did not write or edit the
document. Both earlier reviews of this path are superseded. F-17 has one ID and ten numbered Contract sections, so
each finding is located by `F-17 §n` (or the section name) and the line range at 4d51a3d.

**The owner's rule for this review** (2026-10-25): "One last review of 0.3; what it finds goes into build tickets,
never a 0.4." So no finding proposes a new version. Each one names, in its Blocks column, the build step (1–5 of the
Build map) whose ticket carries it. Where a finding needs the owner's call, the ticket asks it, and the doc's text is
corrected in that step, as the Build map already says of the 0.2 review's wording.

The owner's answers recorded as D-050 are judged here as decided, a claim never released by age among them. A finding
below argues with how the doc carries them out, never with the choice itself. F-07 (`dev/features/work-order.md`) is
out of scope: its one-round review runs at build step 5.

**What was read.** In full at 4d51a3d: the doc, both earlier reviews, D-050 and its two dated lines under D-020 and
D-022 in `decisions.md`, `docs/reviews/TEMPLATE.md`, `process/harness/hooks/session-state.sh`. In part, at 4d51a3d:
`ci/work-order.mjs` (lines 20–60 and 85–200: `settings()`, `realGh()`, `collect()`, its ready and shaping rules),
`ci/checks/lib/issue-body.mjs` (`blockers()`, `touches()`, `overlap()`), `ci/checks/lib/steps.mjs` (`STEPS`,
`whoLine()`), `ci/checks/lib/review-header.mjs` (`quotedVersion()`), `.claude/skills/work-ticket/SKILL.md` (its
Phase 1 and the start of Phase 3), `.claude/skills/log-feature/SKILL.md` (lines 10–16), `process/intake.md` (its
branch lines), `scripts/harness-base.test.mjs` and `scripts/harness-fixture.mjs` (how hooks are run),
`scripts/report.test.mjs` (lines 70–90), `.github/workflows/issue-shape.yml` (its triggers), `package.json` (scripts),
`.gitignore`. Searches at 4d51a3d: `git grep` for every name in the Fit (each found where the doc says), for
`status.mjs` across `ci/`, `scripts/` and `process/harness/` (no gate test runs `--hook` or `--online` without a fixed
clock; the harness tests run a stub in place of `session-state.sh`), for the S1 cases with an `also` key (the ten the
doc names) and for `i1-issue-shape` in `scripts/skills.test.mjs` (present, and that file is in `meta`). Line counts:
`.claude/skills/log-feature/SKILL.md` 300, `.claude/skills/work-ticket/SKILL.md` 296. F2 on an export of 4d51a3d
prints no line for this doc, so its Fit is filled. PR #533's head was `4d51a3d` when read. `main` is at `05a4deb`;
the three commits since the doc's base `bff0897` change only the prose check's files (`ci/prose.mjs`, its fixtures,
`scripts/prose.test.mjs`), none of which F-17 cites. Outside the commit, read for one claim each: the local branches
of this checkout (`git for-each-ref refs/heads`) and the remote's (`git ls-remote --heads origin`), the states of the
issues those branches name, and #535's body (as data). GitHub's GraphQL fields, Dependabot's branches and `gh`'s exit
codes cannot be read from a commit and were not checked against GitHub.

## Severity

| Level | Meaning |
|---|---|
| S0 | Can invalidate the business or the build. Resolve before writing code. |
| S1 | Loses money, breaks correctness, or breaches a stated principle. Fix in the spec before the affected phase. |
| S2 | A real defect or contradiction. Cheap now, expensive later. |
| S3 | Inconsistency or hygiene. Batch these. |

## The 0.2 review's findings

Each was checked against 0.3 and the 0.2 review's Tracker column.

| 0.2 | Tracker | Resolved as the Tracker says? |
|---|---|---|
| AR-1 | D-050, #445 (0.3) | Yes. `/work-ticket`'s first push carries an empty claim commit (§5, 400–402; §9, 523–524; D-050), and the Acceptance has the 3-day-old `main` case (690–693). How the claim branch is made is a new finding: AR-2. |
| AR-2 | #445 (0.3) | Yes. Offline, no claim is called quiet (407), and a linked open pull request of anyone's keeps a claim from being quiet (403–404; Acceptance 695–696). The link GitHub keeps misses some pull requests: AR-8. |
| AR-3 | #445 (0.3) | Yes. The remote branches are one unfiltered `refs` read in call 1, matched in the child (360–362), with a cap and its line (378–380). |
| AR-4 | #445 (0.3) | Yes. Shaping has a §2 row (194) and sorts after the ready leaves, ahead of every rank-2 thing (245–247); `plan.test` has the case (477–478). Its place among the other rank-1 things is not said: AR-6. |
| AR-5 | #445 (0.3) | Yes. The Threat model says the milestone's issues are read whoever opened them (574–578), and the sentinel goes into a leaf's title and body (491–493, 677–678). |
| AR-6 | #445 (0.3) | Yes. The timed run is in a repository with an active milestone and sub-issues, before step 4's pull request is ready, and over 5 seconds the step asks the owner (757–760; Known limitations 627–628). Where its numbers go disagrees between Verify and the Build map: AR-8. |
| AR-7 | #445 (0.3) | Yes. I1's cases go in `scripts/skills.test.mjs` (515–517), Verify runs that file (725), and step 3 has no `package.json` edit (753). |
| AR-8 | D-050 | Yes. D-050 carries "stays in Needs attention, marked startable … never dropped" and F-07's one-round review, its trigger is `Reopens when: #535 closes`, and it now reads the active milestone's issues and the `needs-shape` issues, not every open issue. What the trigger line fires on is a new finding: AR-7. |
| AR-9 | D-050, #445 (0.3, step 5) | Yes. Step 5's ticket carries the owner's words as an Acceptance line (§10, 547–550; Build map 761–763). |
| AR-10 | #445 (0.3) | Yes. The mode lives in `.claude/skills/log-feature/issue-mode.md`, and `SKILL.md` gains the `#n` form on line 14 by joining lines 12 and 13 (527–530). At 4d51a3d those lines hold the usage paragraph, so the join is possible. |
| AR-11 | #445 (0.3) | Yes, as a Known limitation (622–624). |
| AR-12 | #445 (0.3) | Yes. Above 100, the first 100 are planned and the grouped line reads `and more` from `issueCount` (380–382). |
| AR-13 | #445 (0.3; wording in steps 1 and 4) | Yes. The three behaviour points are in 0.3: the Next row for leaves that cannot be offered (283), claims on the page (538–539) and an expired token (331). The four wording points ride steps 1 and 4 (766–769). One of those is already done in 0.3: AR-8. |

## Register

| ID | Finding | Sev | Owner | Blocks | Tracker |
|---|---|---|---|---|---|
| AR-1 | A finished ticket's leftover branch still claims it: it stays work in progress, holds back every leaf that overlaps it, and is called stale | S1 | shaping session | step 4 | |
| AR-2 | The claim branch's name breaks `process/intake.md`'s branch rule, which `/work-ticket` follows, and the claim is pushed before the start checks and never checked for | S2 | shaping session | step 3 | |
| AR-3 | Sessions that never build a ticket claim it: the app names a session's branch `<user>/i<n>-…` | S2 | owner | step 4 | |
| AR-4 | "Fewer than three builds are ready" is not work-order's rule, so shaping disappears while every ready build is taken | S2 | shaping session | step 1 | |
| AR-5 | A red check on the owner's pull request can never be offered in parallel: its files overlap the pull request itself | S2 | shaping session | step 4 | |
| AR-6 | Rank 1's order is said twice and differently, so `merge` against shaping is not defined | S3 | shaping session | step 1 | |
| AR-7 | The `other-account` line fires on Dependabot and on every collaborator's pull request, and nothing clears it | S2 | owner | step 4 (#535) | |
| AR-8 | Wording and residuals: line forms, the GitHub line, where the timed run is recorded, a stale Verified line, and links GitHub does not keep | S3 | shaping session | steps 1, 2 and 4 | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — A finished ticket's leftover branch still claims it

**Where:** F-17 §5 "Claims" (392–408), §2 "Work in progress" (204–206), §3 (219–225, 233–238), Known limitations
(611–613), Acceptance (690–696).

§5: "A branch claims leaf `#n` when its name matches `(^|/)i{n}-`", and "A claimed leaf is in progress, as one with an
open pull request is." §2: "A claim with no pull request has its issue's `Touches:`, or unknown." §3's `leaves` are
"the active milestone's leaves (ready or not …)". Nothing limits a claim to an open leaf.

Local branches are not deleted when a pull request merges. This checkout holds 465 local branches. 12 match the claim
pattern, and 11 of those name issues that are closed. GitHub deletes the remote one on merge (the remote has 4
branches), but a local branch stays until someone deletes it by hand. Read as 0.3 writes it, in a milestone's second
week:

1. Every merged leaf whose local branch remains is still claimed, so it is still work in progress, with its issue's
   `Touches:` as its files. By §3 rule 3 and the main-step rule, every ready leaf whose `Touches:` overlaps a finished
   one is never the main step and never a pick. A merged leaf whose `Touches:` is missing has unknown files, which
   overlap everything (`overlap()`, `issue-body.mjs:53`–`56`), so no ready leaf is offered at all. Next then reads
   "Finish the open work on M2 (#…)", naming work that is done.
2. Each such branch is quiet: its last commit is over 2 days old, no open pull request names the leaf, and its
   `closedByPullRequestsReferences(includeClosedPrs: false)` count is 0 because its pull request merged. So Needs
   attention prints "A stale branch holds #{n}: resume it or delete it" for every finished ticket of the milestone.

This is the default case on any machine that keeps its branches, not an edge. The feature's promise is to name the
ticket that can start now, and here it names finished work and hides the ready tickets. That breaks correctness, so S1.

**Proposed resolution.** A claim counts only for a leaf whose state is open (work-order's `statusOf()` gives `open`).
A branch naming a done or dropped leaf claims nothing, is never work in progress and is never called stale. A ticket
reopened later is claimed again by the same rule. Add to `scripts/github-state.test.mjs` and the Acceptance: a local
branch `i15-x`, 5 days quiet, for a closed #15 whose `Touches:` overlaps ready #16: #16 is offered, and no line names
#15. Carried by step 4's ticket (the claims live in `github-state.mjs`), with one `plan.test` case in step 1 if the
planner takes the open-leaf filter.

### AR-2 — The claim branch's name and timing do not fit `/work-ticket` as it is

**Where:** F-17 §9 "The skills" (523–524), §5 "Claims" (400–402), Build map step 3 (751–753), Acceptance (709–713);
`process/intake.md:200`; `.claude/skills/work-ticket/SKILL.md` Phase 1 (59–80) and Phase 3 step 2 (132–136).

§9: "`/work-ticket`'s first act, before any code, pushes a branch whose name starts `i{n}-` or has it right after a
`/`." Three things in the reviewed commit do not fit that.

1. **The name.** `/work-ticket` makes its branch in Phase 3 step 2, "per `process/intake.md` → Pull request". That
   rule is "`{type}/{scope}-{slug}`" (`process/intake.md:200`), as in `feat/checks-478-open-pr-ids`, the branch #528
   merged. A branch named by that rule never matches `(^|/)i{n}-`. Step 3 edits `process/intake.md` only for the
   `Touches:` sentence (518–519), so the skill's own rule and the claim's form disagree. The session follows one and
   breaks the other.
2. **The timing.** "First act" puts the push before Phase 1, whose checks can stop the run (a blocker open, a code
   claim refuted, the issue not ready, `needs-shape`). A claim is never released by age, so a run that stops in
   Phase 1 leaves a branch that holds the ticket until someone deletes it.
3. **No check for a claim already there.** Phase 1 step 7, "Someone else on it", reads open pull requests on the same
   paths. Nothing in F-17 adds a look for a branch that already claims `#n`. Two sessions started from one status
   (the 0.1 review's AR-7 case) both push a claim, and neither learns of the other. The claim keeps status from
   offering the ticket again, but `/work-ticket` is where the duplicate starts, and it does not look.

The Acceptance line (711) pins only that the branch is pushed, so all three would pass it.

**Proposed resolution.** In step 3's ticket: amend `process/intake.md`'s branch rule for a ticket branch (for example
`{type}/i{n}-{slug}`), and pin it in `scripts/skills.test.mjs`. Move the claim push to the end of Phase 1, once every
check passed and before any code. Have Phase 1 step 7 also look for a local or remote branch that claims `#n`, and
stop and say so when one exists. Say whether a session already on a branch of its own (a worktree the app made)
renames it or makes a new one. Count the lines against the 4 the skill has left.

### AR-3 — Sessions that never build a ticket claim it

**Where:** F-17 §5 "Claims" (392–397, 403–408), Known limitations (611–613), Threat model (585–586).

The pattern `(^|/)i{n}-` is the shape this desktop app already gives a session's branch when the session is named by
ticket. This review runs on `matldupont/i445-review-0-3-2878a2`, and the session that shaped this doc ran on
`matldupont/i445-shape-8cf89c`. Neither builds #445, and neither carries a claim commit. By §5 each claims #445 for as
long as it exists. Two days after the last commit of `main` it was cut from, each is quiet and prints "A stale branch
holds #445". The Known limitation covers "a branch made by hand with no claim commit". It does not say that every
review, shaping or question session the app opens about a ticket makes one. A local branch checked out in a worktree
cannot be deleted until that worktree is removed, so "delete it" is not one step.

The owner chose "a false claim is the safe mistake", and this does fail safe: the ticket is held back and a line says
so. But the line is then routine for every ticket anyone asked a question about, which teaches the reader to ignore
it, and the 0.2 review's evidence was an agent ignoring a list.

**Proposed resolution.** For the owner, in step 4's ticket: a local branch claims only when it holds the claim
commit (`git log --format=%s {base}..{branch}` has `claim #n`, read through `trustedGit()`, offline too). A remote
branch claims by name, since a branch is pushed only by work that means it. That keeps the claim strict where the
duplicate happens (a pushed branch another machine reads) and stops local sessions from claiming by name. Or keep
names alone and add this case, worded, to the Known limitations, with the stale line saying to remove the worktree
first. Add one recorded case either way.

### AR-4 — Shaping disappears while every ready build is taken

**Where:** F-17 §3 (224–228, 243–247), §9 unit tests (476–478); `ci/work-order.mjs:138` and `:147`.

§3: "Shaping takes a place only when fewer than three builds are ready … Shaping then sits among the three places as
work-order's shaping pick does today, so nothing is lost." Work-order's rule is not that. `ci/work-order.mjs:147`:
`const shape = next.length < PICKS && unstarted ? unstarted.n : null`, where `next` holds the builds actually picked:
ready and overlapping nothing in progress. And `:138` counts a leaf as ready only when its state is `open`, so a leaf
with an open pull request is never ready there.

0.3 adds branch claims, and `leaves` carry "whether it is claimed" beside readiness (221). Nothing says a claimed
leaf is not ready. Read literally, three ready leaves, each claimed by an agent session already working on it, are
"three builds ready": shaping is never offered, the main step is "Finish the open work", and the owner, who is free,
is given nothing while the milestone's next item waits to be shaped. The same holds for three ready leaves that each
overlap work in progress. Work-order today would offer shaping in both cases. `scripts/plan-shared.test.mjs` would
then hold the page to the new rule, though §3 says the rule did not change.

**Proposed resolution.** In step 1's ticket: shaping takes a place when fewer than three builds are offered (the main
step and the picks), as `ci/work-order.mjs:147` does, and a claimed leaf is not ready. Add to `scripts/plan.test.mjs`:
three ready leaves, all claimed, and an unstarted item; shaping is offered beside the "Finish the open work" step.

### AR-5 — A red check on the owner's pull request can never be offered in parallel

**Where:** F-17 §6 `red-check` row (425), §2 "Work in progress" (204–206), §3 rule 3 (237–238).

§6 gives `red-check` the files "that pull request's files" and the who `you or an agent`, so it is agent work that
could run beside the main step. §2 makes the same pull request work in progress, with "its issue's `Touches:` entries
together with its changed paths". §3 rule 3 takes a thing only when "its files overlap … none of any work in
progress". A pull request's files always overlap themselves, so `red-check` is never taken, whatever else is going on.
The doc's own example for In parallel is owed work an agent can do now, and fixing the owner's red pull request is the
plainest case of it.

**Proposed resolution.** In step 4's ticket: a thing that acts on one piece of work in progress (`red-check`, and
`review-owed` when its pull request changes a review) is tested against every other piece of work, never its own. Add
the case to `scripts/plan.test.mjs` or the recorded answers: the owner's red pull request, nothing else in progress, an
agent main step on other files: the `red-check` line is in In parallel.

### AR-6 — Rank 1's order is said twice, differently

**Where:** F-17 §1 "Ranks" (158–159), §2's table (172–197), §3 (243–247).

§1: "Within a rank, the order is §2's table order." §2's table lists `shape` (194) before `merge` and `needs-shape`
(197), and both of those can be rank 1 (§6, 423 and 426). §3: "A ready leaf ranks 1 … and sorts after the rank-1 owed
things … Shaping … sorts directly after the ready leaves". So a rank-1 `merge` comes before the ready leaves by §3,
and after shaping by §1's table order. `merge` is `you` and shaping is `you and an agent`, and the person rule takes
only one of them. Which one the owner is offered is not defined, and the page shares the answer (§10).

**Proposed resolution.** In step 1's ticket, one sentence in §3: rank 1 runs the owed things in §2's order without
`shape`, then the ready leaves, then shaping. Add a `plan.test` case with a rank-1 `merge`, a ready leaf as the main
step and an unstarted item.

### AR-7 — The `other-account` line fires on Dependabot and on collaborators, and nothing clears it

**Where:** F-17 §5 "Another account's pull requests" (410–413), §2 `other-account` row (196), §5 "Claims" (395–397),
Known limitations (617–619), Build map step 4 (756–757); D-050 (its last two paragraphs); #535.

The count is of open pull requests "from this repository's own branches (`isCrossRepository` false) whose author is
not the viewer". Two kinds of pull request the doc does not mean meet that test:

1. **Bots that are not the owner's agents.** Dependabot and Renovate push their branches to the repository itself,
   so `isCrossRepository` is false and the author is not the viewer. That is a claim about GitHub that cannot be read
   from a commit, so test it with a recorded answer. If it holds, every project with Dependabot on reads `N pull
   requests from this repo's branches were opened by another account: D-050 reopens; decide whether to trust it.` at
   every session start, about pull requests that have nothing to do with its agents.
2. **Collaborators.** §5 supports them: "a collaborator running `/work-ticket` claims a ticket this way". Their pull
   requests come from the repository's branches too, so each one counts.

Nothing in the doc, D-050 or #535's body says what the owner does once they have decided. The line stays while the
count is above 0, at rank 5 in Needs attention, every session, with no way to answer it. D-050's `Reopens when: #535
closes` fires once. After that, the line says "D-050 reopens" every time, while nothing reopens.

**Proposed resolution.** For the owner, in #535's ticket (it rides step 4 or follows it): say what an answer looks
like and where it lives, for example a list of accounts the owner has answered for, read from a file status already
reads, so the line names only accounts not yet answered. Decide whether bots that are GitHub Apps (`author {
__typename }`) are counted at all. Reword the line so it does not claim a reopening after the first. Add recorded
cases for a Dependabot pull request and a collaborator's.

### AR-8 — Wording and residuals, for the steps that touch them

**Where:** as given in each point.

- **The `other-account` line is not in §1's form** (step 4). §1 (143): every line prints `(who) {text} It blocks
  {words}. It waits on {…}.` §2 (196) gives it `you`, rank 5, waits nothing. §5 (411–412) and the Acceptance (683–684)
  quote it with no `(you)` and no closing sentences, and the Acceptance matches it whole.
- **"counted, not read"** (step 4). The GitHub line (269) says other people's pull requests are "counted, not read".
  §5 (348–351) and the Threat model (572–573) read their `author` and `isCrossRepository`. Say "counted" alone, or
  name the two fields.
- **Where the timed run is recorded** (step 4). Verify (728–730): "its time and counts pasted in the PR". Build map
  step 4 (757–759): "its time and counts in this doc's Changes". Pick one.
- **A wording point already done** (step 4). The Build map (768–769) has step 4 word "Verify's timed run … as above
  (AR-13)". Verify already says `time pnpm status` (728). Drop it from step 4's ticket so the session does not look
  for a change to make.
- **The Verified line** (step 1). "`main` has not moved since 2026-10-23" (104) was true at writing. `main` is now
  `05a4deb`; the commits since `bff0897` touch only the prose check, none of the files the Contract cites. Step 1
  re-reads its claims on `main` anyway (L-18) and writes its own `Verified against:`.
- **The shaping Next's last sentence** (step 2). §4 (281) ends shaping's Next with `You and an agent,
  {STEPS[5].time}.`, which prints `one issue per session` (`steps.mjs:14`): the build loop's time, not shaping's.
  The step line for step 5 (294–298) still prints `Agent.` beside a Next that says `You and an agent`. Say which
  time shaping takes, and whether step 5's line changes with it.
- **A permanent GitHub error says "Run pnpm status again"** (step 4). `GitHub answered with an error` (334) covers a
  token with no access to `Issue repo` and a repository that is not found, which a second run cannot fix. Give those
  their own fixed words, or word the action so it fits both ("Run pnpm status again; if it fails again, run gh auth
  status").
- **Links GitHub does not keep** (step 4; the residual of the 0.2 review's AR-2). A quiet claim is kept alive by
  `closedByPullRequestsReferences`. GitHub fills that from closing keywords and manual links, and, as far as can be
  told without reading GitHub, only for pull requests into the default branch. A collaborator's pull request that says
  `Part of #16`, or one stacked on another branch (L-21), is not linked, and its branch is called stale while it is
  under review. Check it in the recorded answers, and add the case to the Known limitations if it holds.

**Proposed resolution.** Fix each in the step named, with the doc's text corrected in that step's pull request, as
the Build map already does for the 0.2 review's wording.
