# Adversarial review — F-17 parallel plan 0.2

Reviewed: dev/features/parallel-plan.md @ 03741fd
Version line: Version: 0.2 (2026-10-23)
Supersedes: docs/reviews/2026-10-23-parallel-plan-0.1.md
Review date: 2026-10-25
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

03741fd is the head of PR #533's branch. This session did not write or edit the document. The one earlier review of
this path, the 0.1 review, is superseded. F-17 has one ID and ten numbered Contract sections, so each finding is
located by `F-17 §n` (or the section name) and the line range at 03741fd.

The owner's answers to the 0.1 review's AR-1, AR-2, AR-3, AR-7, AR-8 and AR-11, and to Q1–Q4, are in PR #533's body
and recorded as D-050. They are judged here as decided. A finding below argues with how the doc carries them out,
never with the choice itself.

**What was read.** In full at 03741fd: the doc, the 0.1 review, D-050 and the two dated lines under D-020 and D-022 in
`decisions.md`, PR #533's body, `docs/reviews/TEMPLATE.md`, `process/harness/hooks/session-state.sh`. In part, at
03741fd: `ci/status.mjs` (lines 30–60, its existential and skeleton lines), `ci/work-order.mjs` (`realGh()` and
`collect()`, lines 45–49 and 91–130), `ci/checks/lib/steps.mjs` (`STEPS`), `ci/checks/lib/decision-lines.mjs` (its
`Reopens when:` reader), `.github/workflows/issue-shape.yml`, `scripts/report.test.mjs` (lines 60–95),
`scripts/harness-base.test.mjs` (its imports and lines 150–235), `package.json` (`meta`). Searches at 03741fd:
`git grep` for `trustedGit`, `escapeHtml`, `settings`, `riskBlocksSentence`, `owedReviews`, `quotedVersion`,
`SPEC_PATH` and `i1-issue-shape`, and `git ls-tree` of `scripts/`. Line counts: `.claude/skills/log-feature/SKILL.md`
300, `.claude/skills/work-ticket/SKILL.md` 296. F2 on an export of 03741fd prints no line for this doc, so its Fit is
filled. Every Fit name above was found where the doc says. GitHub's GraphQL fields and `gh`'s exit codes cannot be read
from a commit and were not checked against GitHub.

## Severity

| Level | Meaning |
|---|---|
| S0 | Can invalidate the business or the build. Resolve before writing code. |
| S1 | Loses money, breaks correctness, or breaches a stated principle. Fix in the spec before the affected phase. |
| S2 | A real defect or contradiction. Cheap now, expensive later. |
| S3 | Inconsistency or hygiene. Batch these. |

## The 0.1 review's findings

Each was checked against 0.2 and its Tracker column.

| 0.1 | Tracker | Resolved in 0.2? |
|---|---|---|
| AR-1 | D-050 | Yes. The shaping row's who is `you and an agent` (§4, 272), the person rule reads §4 (§1, 158–160), ready builds come first (§3, 217–221), and `plan.test` has the case (437–438). |
| AR-2 | D-050 | In F-17, yes: §10 lists the read, the PR limit, the failure rule and how a non-issue pick renders, and the shared test reads one reader (467–469). F-07's own review cannot run as planned: see AR-9. |
| AR-3 | D-050 | Yes. Only issues the owner opened are listed (§6, 384–386), and `/log-feature #n` gains the in-place mode (§9, 477–481). |
| AR-4 | #445 (0.2) | Yes. `parallel-existential`'s main step is the skeleton, with known files (423, 175). |
| AR-5 | #445 (0.2) | Yes. The read keys on `CI`, `CHECK_TODAY` and `CHECK_NOW` (299–301), and the recording-stub test holds it (463–465). `scripts/report.test.mjs:78` sets `CHECK_TODAY`. |
| AR-6 | #445 (0.2) | Yes, by the sentence on every offline pick (241–242). |
| AR-7 | D-050 | Taken in the owner's shape (§5, 372–380). How it is measured fails in two cases: AR-1 and AR-2. |
| AR-8 | D-050 | Yes for pull requests (§2, 199–201). The stale rule then misreads a collaborator's pull request: AR-2. |
| AR-9 | #445 (0.2) | Mostly. Blob overflow is per pull request, and each cap is said (354–362). The owner's `needs-shape` search above 100 is not: AR-12. |
| AR-10 | #445 (0.2) | Partly. The Acceptance wording is fixed (601–602). The timed run moved from before step 4 into step 4, and the run named cannot exercise the milestone part: AR-6. |
| AR-11 | D-050 | Yes in the owner's shape: recorded, pushed first, `prd-ref: D-050`, `Amends: F-17, F-07`, the dated lines, a Declined line. D-050's text misses some of the owner's conditions: AR-8. |
| AR-12 | #445 (0.2) | Yes. `prd-approve` is rank 2 (170), and the Acceptance line reads "rank 1 to 4" (578). |
| AR-13 | #445 (0.2) | For pull requests, yes (454–456). Folding `collect()` in brings issue text the test does not plant: AR-5. |
| AR-14 | #445 (0.2) | Mostly. Verify gains step 3, the offline test and the real run (644–655). Step 3's new test is not wired: AR-7. |
| AR-15 | #445 (0.2) | Yes, each of its six points. |
| AR-16 | #445 (0.2) | Mostly. One line names each step's owner-only files, and sync is said (660–664). Step 3's `package.json` edit is missing from it: AR-7. |
| AR-17 | #445 (0.2) | Yes. It is a Known limitation (557–558), a missing base line counts as moved (367), and the blob path has a safe pattern (351). |

## Register

| ID | Finding | Sev | Owner | Blocks | Tracker |
|---|---|---|---|---|---|
| AR-1 | A claim branch pushed before any code takes `main`'s commit date, so it can be stale the moment it is pushed | S1 | shaping session | step 3 | D-050, #445 (0.3) |
| AR-2 | The stale-claim line is false offline and for a collaborator's pull request, and tells the owner to delete a branch under review | S2 | shaping session | step 4 | #445 (0.3) |
| AR-3 | The per-leaf branch read cannot be in call 1: the leaves are what call 1 returns | S2 | shaping session | step 4 | #445 (0.3) |
| AR-4 | Shaping has no rank, so which owner thing takes the owner's one place is not defined | S2 | shaping session | step 1 | #445 (0.3) |
| AR-5 | The threat model says only the owner's issues are read, but every leaf's title and body are, and the sentinel plants none there | S2 | shaping session | step 4 | #445 (0.3) |
| AR-6 | The one timed run is on a repository with no active milestone, so the budget is never measured where it bites | S2 | shaping session | step 4 | #445 (0.3) |
| AR-7 | Step 3 adds `scripts/i1.test.mjs`, which W1 makes it wire into `meta`, so steps 1 and 3 share `package.json` | S2 | shaping session | step 3 | #445 (0.3) |
| AR-8 | D-050 misses two of the owner's conditions, and turns the owner's `Reopens when:` into a parenthesis without saying why | S2 | shaping session | spec ready | D-050 |
| AR-9 | F-07 has no filled Fit, so the one-round review of F-07 that step 5 needs cannot run, and no step fills it | S2 | owner | step 5 | D-050, #445 (0.3, step 5) |
| AR-10 | `/log-feature` is at its 300-line cap, and step 3 adds a whole mode "by rewording" | S3 | shaping session | step 3 | #445 (0.3) |
| AR-11 | `review-owed` compares the head with the base branch's tip, not where the pull request left it | S3 | shaping session | step 4 | #445 (0.3) |
| AR-12 | The owner's `needs-shape` issues above 100 have no stated behaviour | S3 | shaping session | step 4 | #445 (0.3) |
| AR-13 | Contract lines that contradict each other or a table they point at | S3 | shaping session | spec ready | #445 (0.3; wording in steps 1 and 4) |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — A fresh claim branch can be stale the moment it is pushed

**Where:** F-17 §5 "Claims" (372–380), §9 "The skills" (477–478), Acceptance (616–618), Known limitations (549–550).

§9: "`/work-ticket`'s first act, before any code, pushes a branch whose name starts `i{n}-`". §5: "A claim goes stale
when its branch's last commit is more than 2 days before status's now and no open pull request of the owner's names the
leaf". A branch pushed before any code has no commit of its own. Its last commit is the one it was cut from, `main`'s
tip, with `main`'s date. When nothing has merged to `main` for 2 days (a weekend, or a project between milestones),
every claim pushed that morning is stale at once. The ticket is offered again, which is AR-7 of the 0.1 review: three
sessions started a minute apart each read "Start #15". The owner's AR-7 answer exists for exactly that case.

Escalated to S1 because it breaks the one promise AR-7's answer added, in the case it was added for.

**Proposed resolution.** Date a claim by the first commit on the branch that `main` does not hold, and count a branch
with none as fresh. Or have `/work-ticket`'s first push carry an empty commit (`git commit --allow-empty -m "claim
#n"`), so the tip's date is the claim's. Add the Acceptance case: a branch `i15-x` whose tip is `main`'s 3-day-old
commit, pushed today, claims #15.

### AR-2 — The stale-claim line is false offline and for a collaborator's pull request

**Where:** F-17 §5 "Claims" (373–380), §5 "When" (302–304), §2 "Work in progress" (197–201), §6 (384–386).

Local branches "are read … online and offline", and the stale rule needs "no open pull request of the owner's names the
leaf". Offline, status has read no pull request, and every turn-end refresh is offline. The doc does not say whether
the stale rule runs offline. If it does, each turn-end STATE.md prints, for every local branch whose pull request has
waited 2 days on review: "(you) Resume or delete the branch that holds #{n}. It has had no commit for 2 days and has
no open pull request." The second sentence is false, and the action is to delete a branch with an open pull request.

Online, the same happens for a collaborator. The owner's AR-8 answer says a collaborator "claims the ticket" through
an `i<n>-` branch. Their pull request is not the owner's, so it never keeps the claim alive. Two days into review, the
claim goes stale, #n is offered again, and the owner is told to delete a collaborator's branch.

**Proposed resolution.** Offline, never mark a claim stale: a claim stays a claim until GitHub is read. Online, let
any open pull request whose head branch is the claiming branch keep the claim, whoever opened it. That reads the
branch name, which is never printed, and no text of theirs. Add both cases to §9's claims test.

### AR-3 — The per-leaf branch read cannot be in call 1

**Where:** F-17 §5 "What is read" (331–346), Threat model "Bounded" (529).

Call 1 holds "work-order's fields for the active milestone's item issues with `subIssues(first: 50)`", and also "for
each open leaf, `refs(… query: "i{n}-" …)` as an alias per leaf". The leaves are the sub-issues, and an item with
none is its own leaf (`ci/work-order.mjs:122`–`125`). Status learns which leaves are open only when call 1 returns.
So the per-leaf aliases need a call of their own, and "at most three calls" (331, 529) becomes four.

**Proposed resolution.** Read the remote branches once in call 1 with no per-leaf filter,
`refs(refPrefix: "refs/heads/", first: 100)` with names and commit dates, and match `(^|/)i{n}-` in the child.
Above 100 branches, say so as §5 says the other caps: every leaf counts as claimed, or the read reports a reason. Or
keep the aliases and count four calls in §5 and the Threat model.

### AR-4 — Shaping has no rank among the picks

**Where:** F-17 §3 (217–221, 236–238), §2's table (167–190), §1's person rule (156–160), §9 unit tests (440–441).

§3: "A ready leaf ranks 1 … and sorts after the rank-1 owed things … shaping is offered after the ready leaves." That
places shaping after the ready leaves. It does not say whether shaping comes before or after the rank-2 to rank-4 owed
things, and §2 has no row for it. That matters because shaping is `you and an agent`, so it takes the owner's one place.
Say the main step is a ready leaf, one more leaf is ready, an item is unstarted, and an existential risk is untested.
The second leaf takes a place. Then shaping or the risk takes the last place, and the person rule leaves the other out.
The doc does not say which. The page reads the same plan (§10), so its shaping pick depends on this unstated order too.

**Proposed resolution.** Give shaping a row in §2 with a rank and files, or say in §3 that shaping sorts directly after
the ready leaves, ahead of every rank-2 owed thing. Add the case above to `scripts/plan.test.mjs`.

### AR-5 — Issue text reaches the child, though the threat model says only the owner's is read

**Where:** F-17 Threat model (519–520), §5 (343–344, 369–370), §9 sentinel (454–456), Acceptance (608–610), Fit (63–65).

The Threat model: "Only the owner's own pull requests and issues are fetched beyond a count." Folding in `collect()`'s
first call reads every item issue and every sub-issue: title, body, `Touches:`, `Blocked by:` and designation
(`ci/work-order.mjs:108`, `:115`–`:119`). A sub-issue can be anyone's issue that the owner linked, and its author can
still edit its body. Its `Blocked by:` and `Touches:` then steer the plan: they hold a ticket back or make its files
unknown. Its title is read too, and §5 says only that no title "reaches status". The sentinel test plants text in a pull
request's body, a doc heading, a `Version:` line, a review, a path and a branch name. It plants none in an issue's title
or body, which is where the new text flows.

**Proposed resolution.** Correct the Threat model: the milestone's issues are read whoever opened them, as F-07 reads
them today, and their author can steer that leaf's place in the plan. That is the owner's call, since the owner linked
the issue. Add a leaf's title and body (a `Touches:` line and a `Blocked by:` line with the sentinel after valid
entries) to the sentinel test and its Acceptance line.

### AR-6 — The one timed run cannot measure the budget where it bites

**Where:** F-17 Build map step 4 (677–678), Verify (650–651), Known limitations (559–561); 0.1 review AR-10.

The 0.1 review asked for "one timed real run on slipway's own repository in the doc" before step 4. 0.2 moves it into
step 4 and keeps slipway's repository. But Known limitations says: "Slipway itself runs under an epic with no
milestone, so its own status names no ticket." With no active milestone, call 1 reads no item issues, no sub-issues and
no per-leaf branches, and call 2 reads no blockers. Those are the heaviest parts of the read. The run measures the pull
request search alone. The budget is then first tested in a project's build loop, where a miss shows in every session
as `timed out after 5 seconds`, and the only remedy is a new version.

**Proposed resolution.** Time the run in a repository with an active milestone and sub-issues. That can be a test
repository, or a project on slipway in its build loop, with only its numbers recorded and not its name. Record the
time before step 4's pull request is marked ready. Say what step 4 does if the run takes longer than 5 seconds: split
the read, or ask the owner to raise the budget.

### AR-7 — Step 3 adds a test, so steps 1 and 3 both edit `package.json`

**Where:** F-17 Verify (646), Build map (660–664, 672–674), Order and overlap (505–506).

Verify runs `node scripts/i1.test.mjs` as a step-3 line, and step 3 lists "I1's warning and its test". That file is
not in the reviewed commit. I1's cases today live in `scripts/skills.test.mjs`. If step 3 adds the file, W1 makes the
same step wire it into `meta`, as the Build map says of every new test. But the Build map lists `package.json`'s
scripts in steps 1, 2, 4 and 5 only. It also says "Steps 1 and 3 share no file and can run side by side". Both would
edit the one `meta` line. A plan whose subject is "what can safely run side by side" says so of two steps that collide.

**Proposed resolution.** Either put I1's warning cases in `scripts/skills.test.mjs`, where I1's cases are today, and
change the Verify line to match. Or list step 3 among the `package.json` steps and drop "Steps 1 and 3 share no file".

### AR-8 — D-050 misses some of the owner's conditions, and one was reworded without saying so

**Where:** `decisions.md` D-050 (1301–1346); F-17 §8 (408–415), Known limitations (554–556); PR #533's body, AR-11.3.

AR-11.3 asked D-050 to "Fold in every answer from this round as decided, each in the words I chose … including the
conditions I added to each." Measured against PR #533's body:

1. Q2.3 and Q4.1: whatever is startable but not picked "stays in Needs attention, marked startable … never dropped".
   D-050 does not say it. F-17 does (§3, 244–245).
2. AR-2.1: F-07's review covers only the amended sections, in one round, and anything else goes to a follow-up issue.
   D-050 does not say it. F-17 does (§10, 498–500).
3. AR-8.2: the owner asked for "Reopens when: a project's agents open PRs under another account" as the trigger. D-050
   writes it as a parenthesis in its Declined line. F-17 writes "What brings it back". There is a reason:
   `decision-lines.mjs` reads a `Reopens when:` line only as events from a closed list (line 9), so that sentence would
   print as an unreadable condition. But neither text says so, and L-39 asks that a change be said.

D-050 also says status "reads the repository's open issues" (1321). §5 reads the active milestone's issues and two
`needs-shape` searches, not every open issue.

Escalated from S3 because the owner set the rule for this entry's text in so many words.

**Proposed resolution.** Add points 1 and 2 to D-050 in a sentence each. For point 3, ask the owner whether a
`Reopens when:` line naming an event slipway reads would fit; one candidate is a pull request that closes a "trusted
accounts" issue. If not, add a sentence to D-050 saying why the trigger is prose. Correct "the repository's open
issues".

### AR-9 — F-07 has no filled Fit, so its one-round review cannot run

**Where:** F-17 §10 "F-07's doc" (498–500), Build map step 5 (679–680); `dev/features/work-order.md` (no `## Fit`).

Step 5 ends with "`dev/features/work-order.md` amended with its one-round review", and §10 scopes that review to the
amended sections (the owner, AR-2.1). F2 on an export of 03741fd reports `dev/features/work-order.md#fit/draft`: F-07
has no `## Fit`. `/review-doc` stops on that, because a review that names F-07 makes F2 count it as held, and the
review's own pull request goes red. So the review the owner asked for cannot run until someone fills F-07's Fit, and no
step of the Build map does. A Fit edit moves no `Version:`, so it does not touch the owner's "one round".

**Proposed resolution.** Add to step 5: fill F-07's Fit before its Contract is amended. Or file it now as a step-5
prerequisite on F-07's author. The owner decides whether it lands on #533 or in step 5.

### AR-10 — `/log-feature` has no room for the new mode

**Where:** F-17 §9 "The skills" (477–482), Contract's Verified line (110–111).

The Contract records `.claude/skills/log-feature/SKILL.md` at "300 lines; the cap is 300". Step 3 adds a mode that
takes an issue number, keeps its comments and links, rewrites its body, clears `needs-shape` only when I1 passes, and
asks before reading an issue the owner did not open. It also adds the paths-only `Touches:` sentence. "Both skills stay
within the 300-line cap by rewording" is a claim with no line budget behind it.

**Proposed resolution.** Name the passages step 3 shortens, or let the new mode live in a file the skill reads
(`/work-ticket` and `/review-doc` already point at process files), and say which.

### AR-11 — `review-owed` compares the head with the base branch's tip

**Where:** F-17 §5 (348–352, 366–368), §6 `review-owed` (391), Known limitations (557–558).

The child reads the doc "at the head and at the base", with `baseRefOid`, and counts the `Version:` line as moved when
they differ. `baseRefOid` is the base branch's current tip, not the commit the pull request branched from. A pull
request that edits a feature doc's prose, behind a `main` that has since moved the same doc's `Version:`, reads as
moved, and status prints `review-owed` for a version the pull request did not change. The Known limitation covers a
checkout behind `main`, not this.

**Proposed resolution.** Compare against the merge base, or add the case to the Known limitation: a pull request
behind `main` can show `review-owed` until it merges `main`.

### AR-12 — The owner's `needs-shape` issues above 100

**Where:** F-17 §5 (340–342, 354–362), §6 (395–398).

`search(query: $shape, … first: 100)` returns at most 100 numbers. §5's caps say what happens above every other limit,
as the 0.1 review's AR-9 asked, but not this one. A leaf that is one of the owner's `needs-shape` issues past the
hundredth loses its `needs-shape` line, and nothing says the list is cut. It is unlikely, so S3.

**Proposed resolution.** One sentence in "Caps": above 100, the line reads `and more`, using `issueCount`, or the read
reports a reason, as the owner's pull requests above 100 do.

### AR-13 — Contract lines that contradict each other or a table they point at

**Where:** F-17 §1 (130, 158), §4 (274, 280), §2 (190), §6 (388), §10 (489–490), §5 (322, 379–380), Verify (650–651).

- §1 reads the main step's who "from §4's table (never from `STEPS`)" (158). §4 gives every other case's who "from
  `STEPS`" (280). Say "from §4's table, which takes `STEPS` for the cases it does not list".
- §1's `who` list (130) has no `yours`, but the person rule tests for it (158), and `STEPS[2].who` is `yours`.
- §2 sends `waits` for `merge`, `review-owed`, `red-check` and `needs-shape` to §6 (190). §6's table has no waits
  column (388). Add one.
- §4's "none ready, some in progress" row says "No other issue of {id} is ready yet" (274). Ready leaves that each
  overlap work in progress, or whose `Touches:` is unknown, also land here, and then the sentence is false. Say which
  row they take and word it to fit.
- §10: "only the owner's pull requests and claims mark a leaf in progress" (489–490). §5 lets any branch on the
  repository claim, a collaborator's included (379–380). Say "the owner's pull requests and any claiming branch".
- §5 keys `gh is not signed in` on exit 4 (322). A stored token that has expired or been revoked fails as a request,
  not as "authentication required", and lands under `GitHub answered with an error`, whose action ("Run pnpm status
  again") cannot help. That is a claim about `gh` with no evidence line. Test it, or add the expired case to the reason.
- Verify: `pnpm status` "prints "GitHub: read" and the run's time" (650–651). Nothing in §4 or §5 prints a time. Say
  the run is timed with `time`.

**Proposed resolution.** Fix each in place.
