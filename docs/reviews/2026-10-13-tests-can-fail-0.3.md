# Adversarial review — F-13 tests can fail 0.3

Reviewed: dev/features/tests-can-fail.md @ 90a0ca6
Version line: Version: 0.3 (2026-10-13)
Supersedes: docs/reviews/2026-10-12-tests-can-fail-0.2.md
Supersedes: docs/reviews/2026-10-09-tests-can-fail-unversioned.md
Review date: 2026-10-13
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`.

90a0ca6 is the head of pull request #419 (`matldupont/tests-can-fail-0-3-revision-fea08c`), not `main`; it was
still the head when this review started and when it was written. This session did not write or edit the
document. Two earlier reviews name this path, and both are superseded above.

**The brief.** The owner capped the review loop on 2026-10-13 (D-037, amended): this is the last review of the
whole document before the build. Every finding below is sorted into one of three, and says which:

- **breaks a guarantee**: must be fixed in the spec before the build;
- **carry**: a line under the Build map step that touches it, no Contract change;
- **known limitation**: a line in Known limitations.

**No finding below breaks a guarantee, and none is S0 or S1.** Nothing here asks for another revision of the
Contract, Acceptance or Verify, or for another review.

**What was read.** In full: the target at 90a0ca6; `git diff b502570 90a0ca6` over it; both earlier reviews;
`docs/reviews/TEMPLATE.md`; `decisions.md` D-037 with its three amendments and both measurements;
`process/decision-defaults.md`; `process/lessons/L-69`; `.github/workflows/ci.yml`; `ci/checks/lib/workspace.mjs`;
pull request #419's body. In part, to check a named claim: `.github/workflows/pr-body.yml` (the two names),
`dev/ownership.yaml` (the classes of `scripts/**`, `ci/**`, `package.json`), `package.json` (the root scripts),
`.claude/skills/bootstrap/SKILL.md` (where the default app goes), `ci/checks/meta/w1-declared-vs-invoked.mjs`
(it reads no `ci/exceptions.yaml`), `ci/checks/meta/l1-lessons.mjs` (a declined lesson must carry `review-by`),
issue #51's body (what it embeds, and that it has no sub-issue). `git diff 2259472 90a0ca6` over the paths the
Contract's `Verified against:` line cites is empty. `docs/product/FRAME.md` in slipway is the unfilled template,
so the document is read against `SLIPWAY.md`'s thesis, as it cites it.

**Run for this review.** `git diff -U0 -w` in a scratch repository, on a test file with one blank line removed
inside a test and one added inside another: both are hunks (AR-3). The tracked files whose names match the
document's test pattern, and their ownership class (AR-4).

**Not verified.** Vitest was not run. What GitHub does on a `pull_request` event (which commit's workflow file
runs, what a checkout by commit fetches, what `base.sha` holds) is its documented behaviour, not a run made for
this review (AR-1, AR-2). One thing was looked at after the fact, through the API and not an event payload: of
two merged pull requests of this repository, the one that had merged `main` into its branch (#408) has a base
commit equal to the tip `main` had when it merged, and the one that had not (#411) has an older one. That is
one observation each. No project built from slipway was read.

**Not argued.** D-037's picks, the 2026-10-13 amendment included: removed lines edit a test; a pull request with
new tests and none judged fails; the one mechanical line; support files by a closed list of names; step 0's
stop line. A finding touches one only where the document contradicts it or the Contract does not deliver it.

**Skipped, by the brief.** The five Acceptance lines #419's body lists as reworded to state a count. No finding
of the 0.2 review that was carried is raised again, unless its carried line does not hold what it asked (AR-7).

## Against the 0.2 review

The nine fixes, each checked against its finding. All nine hold what was asked; what each leaves is a finding
below, none of them a reason to reopen the fix.

| 0.2 finding | fixed in | holds what was asked | leaves |
|---|---|---|---|
| AR-1, `HEAD` is the merge commit | §1 (121–127), §3.1 (182–184), the block at 717–722 | yes: one commit is diffed, copied and held to; a checkout that is not it is exit 2; the block asked for is there | AR-1, AR-2 |
| AR-2, a deleted assertion | §3.1 (186–187), §3.5 (260–266), the block at 724–729 | yes: the rule marks the right test in every case tried by hand (first, middle and last line of a body removed; a test removed whole between two tests, and inside a `describe`); the three neighbours are stated | AR-3 |
| AR-3, a mechanical pull request | §3.7 (298–305), §4, §5, the block at 731–736 | yes: put to the owner, one line, counted once | AR-9 |
| AR-4, files that are not tests | §3.2 (189–190), §3.5 (252–258), the line at 671 | yes for `never-run` | AR-4, AR-6 |
| AR-5, support code as a subject | §3.6 (279–284), the blocks at 660–665 and 752–757 | yes: the list is stated, both sides of its cost are in Known limitations | AR-5, AR-10 |
| AR-6, the stop line | Build map step 0 (810–813), the line at 778 | yes: written before the run | AR-7, AR-10 |
| AR-7, a pull request with nothing judged | §4 (375–381), §5 (419–422), the block at 738–743 | yes: the row, its exemptions and both sides of its test | AR-4, AR-5 |
| AR-11, a job that cannot run | Build map steps 3 and 4 (826–853), the closing paragraph (876–880) | yes: the window is removed, not guarded | AR-1 |
| AR-13, the §2 sentence | §2 (172–173) | yes | — |

#419's claim that nothing else in Contract, Acceptance or Verify changed holds: every other changed line of the
diff belongs to one of the nine (the `Verified against:` line, the next actions "Check out" and "Remove it" at
762, `outsideAnyTest` at 677, `factories.ts` at 753).

The carried lines, each checked against its finding:

| carried line | holds what was asked |
|---|---|
| step 0, AR-6 (815–817) | yes for the script and the workload; not for the share the stop line now reads (AR-7) |
| step 2, AR-13 (824–825) | yes |
| step 3, AR-8 (833–834) | no: the two cases, without the direction (AR-7) |
| step 3, AR-9 (835–837) | yes: any pinned answer ends the ambiguity |
| step 3, AR-12 (838–840) | no: the arguments, without the direction (AR-7) |
| step 3, AR-13 (841–846) | yes, every bullet |
| step 4, AR-9 (856–857) | yes; it is met by counting a dropped change in `tried`, which Known limitations (569–570) already implies |
| step 4, AR-13 (858–859) | yes |
| step 5, AR-10 (868–870) | yes, all three parts |
| step 5, AR-7 (871–872) | no: a date said in prose, where the finding asked for something that fires (AR-7) |
| step 5, AR-13 (873–874) | yes |

## Severity

| Level | Meaning |
|---|---|
| S0 | Can invalidate the business or the build. Resolve before writing code. |
| S1 | Loses money, breaks correctness, or breaches a stated principle. Fix in the spec before the affected phase. |
| S2 | A real defect or contradiction. Cheap now, expensive later. |
| S3 | Inconsistency or hygiene. Batch these. |

## Register

| ID | Finding | Sev | Owner | Blocks | Tracker |
|---|---|---|---|---|---|
| AR-1 | The job runs the merge's workflow on the branch's files: a branch cut before a project took the step has no `check:mutation` script, and is red with pnpm's own error. **Carry**, and a known limitation | S2 | owner | build steps 4, 5 | steps 4, 5; known limitation |
| AR-2 | No acceptance block runs the `mutation` job; what the AR-1 fix assumes of GitHub is stated as fact. **Carry** | S2 | owner | build step 4 | steps 4, 5 |
| AR-3 | Lines removed outside every test are on no list, where D-037 and Known limitations say counted; a removed blank line makes a test new. **Carry** | S2 | owner | build step 3 | step 3 |
| AR-4 | `other-runner` kept the wide pattern and can now fail a pull request: a data file, a file at the root, a package on another runner for good. **Carry** | S2 | owner | build steps 3, 4 | steps 3, 4 |
| AR-5 | `nothing-judged` fails a pull request whose only new tests are of code the step has no change for, and its two actions fit neither that nor three other reasons. **Known limitation**, and a carry for the wording | S2 | owner | build step 4 | known limitation; steps 0, 4 |
| AR-6 | The name pattern is the only gate at both ends: a test the runner lists under another name is never seen, and a test under `__tests__/` that nothing runs is counted as not a test. **Known limitation** | S2 | owner | — | known limitation |
| AR-7 | Four carried lines do not hold what their findings asked: AR-8, AR-12, the detector of AR-7, and AR-6 for the share. **Carry**: reword the lines | S2 | owner | build steps 0, 3, 5 | steps 0, 3, 5 |
| AR-8 | Nothing holds a build step to its carried lines: #51 embeds no Build map, no step has an issue, and the lines are not worded as acceptance. **Carry**, at the split | S2 | owner | build steps 0 to 5 | steps 0 to 5, at the split |
| AR-9 | "The pull request whose diff adds it": a moved line, a merge into a stacked branch, an uncommitted entry; and nothing tells an author the line exists. **Carry** | S3 | owner | build steps 3, 5 | steps 3, 5 |
| AR-10 | Hygiene: `excuse-expired` has no wording, the count lines against the message block, the support list's path, a step-4 proof in a step-3 block, the stop line's record, the recordings step 0 owes §8. **Carry** | S3 | owner | build steps 0, 3, 4, 5 | steps 0, 3, 4, 5; known limitation |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — The job runs the merge's workflow on the branch's files

**Sort: carry (build steps 4 and 5), and one sentence in Known limitations.**

**Where:** F-13 Contract §1 (lines 118–130); Known limitations (543–544); Build map step 4 (847–853) and the
closing paragraph (876–880).

§1: "One step differs from `verify`'s: the checkout names the pull request's head commit". That fixes the
0.2 review's AR-1. It also splits the job in two. On a `pull_request` event GitHub takes the workflow file from
the merge of the branch into its base; the checkout now takes every other file from the branch as pushed. So
the job's steps are the base's and the files they run are the branch's.

The first time that matters is the day a project takes the step. The sync's pull request merges; `main` now
has the `mutation` job and the `check:mutation` script. Every pull request already open was cut before it:
the merge has the job, the branch's `package.json` has no such script, and the job's last line fails with
pnpm's missing-script error. That is exit 1 on a pull request that may change no test, in words that name
nothing of the project (§5: "Every line names the project's own thing and the next action"). It stays red
until the base branch is merged into each one. `verify`, on the merge, is green throughout.

The Build map's closing paragraph promises the neighbouring thing: "at no commit does `main` hold a job that
fails on every pull request". For the pull requests open across a sync, it does.

The same split outlives the first day. `verify`'s steps before the install run three files of the tree
(`ci/verify.mjs --plan`, `n1-node-modules.mjs`, `lk1-lockfile.mjs`). A later slipway that adds a step there
breaks the `mutation` job, and only that job, on every branch older than the sync. And `ci/exceptions.yaml`
and `ci/tests-can-fail.yaml` are read as the branch has them: a `run:` or `keep-out:` entry the project added
on `main` yesterday does not exist for a branch cut the day before.

Known limitations says "The job judges the branch as pushed, not as merged", and gives one consequence, about
a test. These are the others.

**Proposed resolution.** Not a return to the merge checkout: the orchestrator's reasons stand. Under step 4,
one line: check what the job prints on a commit with no `check:mutation` script, and that it names the action
(merge the base branch into this branch), and pin it with a test. Under step 5: the sync and `BOOTSTRAP.md`
tell the owner that pull requests open when the step arrives need the base merged in. In Known limitations:
the step's own files, and the two files that take tests out, are the branch's, not the base's.

### AR-2 — No acceptance block runs the `mutation` job

**Sort: carry (build step 4).**

**Where:** F-13 Contract §1 (120–127), §3.4 (239–242); Known limitations (581–582); Acceptance (717–722,
752–757, 766–771); Verify (792–796); Build map step 0 (800–808) and step 5 (860–865).

The 0.2 review's AR-1 ended: "Nothing in the plan would show it before a project's first pull request." The
fix adds a block in a temporary repository, and a test that the workflow's text names
`github.event.pull_request.head.sha`. Both are right, and neither runs the job. Three things §1 states about
GitHub are still facts by assertion:

- "`fetch-depth: 0` as there, which holds the history the diff to `BASE_SHA` needs". For a branch of the same
  repository it should. For a pull request from a fork, the head commit is on no branch the checkout fetches;
  whether a checkout by commit with full history fetches it was not shown. The Threat model defends against
  other people's pull requests, so the fork case is in scope.
- `BASE_SHA` is `github.event.pull_request.base.sha`, "as `pr-body.yml` passes them". The step diffs
  `base...head`, which is the pull request's own change only while that base commit is not older than a
  `main` the branch has since merged in. If it can be older, the diff holds other people's tests, and
  §3.7's "this pull request's diff adds the line" holds another pull request's line. One merged pull request
  of this repository, read after the fact, had the newer base (above); that is not a rule.
- §3.4's offline install in the copy finds everything in the store "the job's own install just filled"
  (Known limitations), now at the branch's lockfile.

Where each could be seen: Verify's scratch project is made with `--no-github` and run locally. The scratch
block (756) asks for a time "on a hosted runner" and names no repository that has one. The real-project block
(767–768) says "the step is run once on one of its pull requests", which a local `pnpm check:mutation`
satisfies. Step 0 runs through a draft pull request, with the prototype and no job.

**Proposed resolution.** Under step 4: before step 5 starts, the job is run on the scratch repository step 0
already asked the owner for, on a pull request that changes a test, on the same one after its base moved and
was merged in, and on one that changes no test; the three result lines go in step 4's pull request. Say
whether a fork's pull request was tried, and if not, list it in Known limitations as not run. Under step 5:
the run on a real project is the job's, on a hosted runner.

### AR-3 — Lines removed outside every test are on no list

**Sort: carry (build step 3).** D-037 says counted and the Contract's words admit that reading; the line fixes
which reading is built.

**Where:** F-13 Contract §3.1 (185–187), §3.5 (260–266), §3.10 (350–351); Known limitations (538–540, 545–546,
549–550); Acceptance (674–678, 724–727); D-037, amended 2026-10-13 ("A test deleted whole, and a deleted test
file, are counted and are not findings").

§3.1 keeps two things apart: "Added and changed lines per file", and "the place of each hunk that only removes
lines". §3.5 then feeds `outsideAnyTest` from the first only: "a changed import, hook, helper or `describe`
line marks no test new … a test file with such a change is named in the record". A hunk that only removes
lines and falls inside no test call is not a changed line. By the letter its file is on no list:

- **A test deleted whole from a file.** "A test removed whole lies inside no call, and marks none." Known
  limitations: "A test deleted from a file, or a deleted test file, is counted and nothing more." The record
  has a count for deleted files (`removedTestFiles`) and none for this. The block at 724–727 asks only that
  "the second has no new test".
- **Lines deleted from a hook or a helper.** The 0.2 review's third neighbour was "a pull request that empties
  a shared assertion helper". Emptied by deleting its `expect` lines, it is a removal-only hunk outside every
  test. Known limitations says of this class "Such files are counted in every run."

So the answer 0.3 gives to deletion inside a test stops at the test's edge, and the two sentences that say
the rest is counted are not delivered by a field.

A neighbour, run for this review: `git diff -U0 -w` reports a blank line removed inside a test as a hunk that
only removes lines, and a blank line added as an added line. `-w` ignores space within a line, not a line of
space. So "Only whitespace is ignored" (540) is half true, the block at 675 ("whitespace inside a test" gives
no new test) holds for a re-indent and not for a blank line, and under 0.3 a formatter that closes up blank
lines makes every test it touches new.

**Proposed resolution.** Under step 3: a hunk that only removes lines and marks no test puts its file in
`outsideAnyTest`; pin it in the block that deletes a whole test, and with a hook that loses a line. And: a
hunk that only adds or removes blank lines marks no test (`--ignore-blank-lines`, or the same by hand); pin it
in the block at 675.

### AR-4 — `other-runner` kept the wide pattern, and can now fail a pull request

**Sort: carry (build step 3 for the three cases, step 4 for the wording).**

**Where:** F-13 Contract §3.2 (188–190), §3.3 (194–195, 234–238), §3.5 (252–258), §4 (375–381), §5 (419–429);
Acceptance (698–701, 742); `ci/checks/lib/workspace.mjs`; the 0.2 review's AR-4 and AR-14.

Two fixes meet here. The answer to AR-4 narrowed `never-run` to "a file a runner could list" and left
`other-runner` on the wide pattern, as that finding proposed. The answer to AR-7 then made `other-runner` a
reason that fails: it never makes `nothing-judged` only "while `tests-can-fail#other-runner` is unexpired".
In 0.2 a wrong `other-runner` was a warning. In 0.3 it is exit 1.

- **A data file is a new test.** §3.3: "A changed test file in a package that does not depend on `vitest` is
  **not judged**: `other-runner`", and "test file" is §3.2's pattern, "in any language". §3.5's "is not a
  test" covers only a file in a package that uses Vitest. So `__tests__/fixtures/order.json`, or a `README.md`
  under `__tests__/`, in a package on another runner is in `notJudged`; "A new test is one in `tests` or in
  `notJudged`"; changed alone, it is `nothing-judged`: "None of the 1 tests this pull request adds or edits
  was judged". With no package on Vitest at all it is exit 2, as in 0.2.
- **A file at the root is in no package.** `discoverWorkspace` returns the root apart from `packages`. The 0.2
  review's AR-14 asked whether the root is judged; it is tracker-only, with no line in the Build map (AR-8).
  The answer now decides an exit code. A project holds slipway's own files there: of the tracked files that
  match the pattern, two are under `ci/`, in the tree a sync writes
  (`ci/fixtures/known-bad/w1/wiring/scripts/own.test.mjs`, `ci/fixtures/known-bad/sk1/markers/a.test.ts.txt`). The first is `never-run` or `other-runner` when a sync
  changes it, by a reading nobody has chosen. A project's own root-level `e2e/` is the same question.
- **A package on another runner for good.** Browser tests in a folder of a package that uses Vitest take a
  `keep-out:`, which "carries no dates" (§6). The same tests in a package of their own are `other-runner`, and
  a pull request that changes only them fails until the project holds a dated entry, renewed for as long as
  the package exists. Whether a `keep-out:` naming that package's folder wins is not said: §3.3 gives
  `other-runner` before §3.5 reads `keep-out:`.
- **No message names the entry.** §3.3 gives `tests-can-fail#other-runner` one use: it turns the exit 2 of a
  project with no Vitest into a warning. §4 gives it a second, in a workspace that has Vitest. The not-judged
  line says "its package {package} does not use Vitest", and `nothing-judged` says "Import the code under test
  by a relative path … or excuse a test file" (AR-5). Neither says the entry exists.
- An `other-runner` file has no listing, so no test names: `nothing-judged`'s "{n} tests" counts files.

**Proposed resolution.** Under step 3, check each against the code and pin it with a test: a changed data file
under `__tests__/` in a package that does not use Vitest is not a test, as §3.5 has it for one that does; a
changed test file at the root, outside every package, is named and counted and is no finding by itself; a
`keep-out:` that names a folder of a package on another runner gives `kept-out`. Under step 4: the not-judged
line for `other-runner` names the entry.

### AR-5 — `nothing-judged` fails a pull request whose tests are of code the step has no change for

**Sort: known limitation (the rule is the owner's pick, delivered as picked), and a carry under build step 4
for the wording.**

**Where:** F-13 Contract §2 (165–173), §3.6 (279–291), §4 (375–381), §5 (419–422); Known limitations (551–559);
D-037 ("Failing them was measured to fail ordinary pull requests for tests that were fine").

§4 fails a pull request with new tests and none judged, unless every reason is one "the owner gave". Three
reasons that are not the owner's can be all a correct pull request has:

- `no-change-to-make`. §2 changes a function body, a condition, seven pairs of operators and a boolean, and
  nothing "inside … a string". A schema declared as data, a table of routes, a map of constants, a set of
  design tokens: each "reads and has no change to make". A pull request that adds one of these and its test,
  and no other test, is red.
- `support-only`, for product code under a listed name. Known limitations has the case ("a test of that file
  alone is named not judged"); it does not say that alone in a pull request it is a failure.
- `other-language`, and `could-not-be-parsed`.

The message gives two actions for all of them: "Import the code under test by a relative path, which this step
follows, or excuse a test file in `ci/exceptions.yaml` with a date". The first fits `no-subject` only; a
`no-change-to-make` test already imports by a relative path. The second is a dated entry, asked of the owner
and renewed when it expires, for a test that will never be judgeable and has nothing wrong with it. D-037's
first reason for naming and not failing was that failing "was measured to fail ordinary pull requests for
tests that were fine"; this is that cost, back for the pull request that has nothing else in it.

Nothing in step 0 would show how often. Its second figure is a share of tests; this is a property of a pull
request.

**Proposed resolution.** In Known limitations, one line in these words: a pull request whose only new tests
are of code this step has no change for fails until each is excused, and the excuse expires. Under step 4:
`nothing-judged` gives the next action for each reason it lists, and only `no-subject` is told to import by a
relative path. Under step 0, beside the share: whether the measured pull request would itself have been
`nothing-judged`, shown to the owner with the rest.

### AR-6 — The name pattern is the only gate, at both ends

**Sort: known limitation.**

**Where:** F-13 Contract §3.2 (188–193), §3.5 (252–258); Threat model (495–498, 504–505); Known limitations
(562–566).

§3.2 decides what a changed test file is by its name, before any runner is asked: "`*.test.*`, `*.spec.*`,
under `__tests__/`". "**None: the run ends here**". The runner's own list is read only after that.

- **A test the runner lists under another name is never seen.** A project whose runner is configured to
  include `tests/**/*.ts`, or `*.unit.ts`, or tests written inside source files, has tests in files the
  pattern does not match. A pull request full of them ends at §3.2 with "No tests were added or changed." They
  are not judged, not named and not counted. The Threat model's bold sentence is "A test it does not judge is
  named, with the reason, in every run." And a file renamed from `cart.test.ts` to such a name is reported as
  "removed or renamed away" while its tests still run.
- **A test under `__tests__/` that nothing runs is counted as not a test.** 0.3 narrows `never-run` to
  `*.test.<ext>` and `*.spec.<ext>`. `__tests__/cart.ts`, the habit of another runner's defaults, is then one
  of "{n} changed files under a test name or folder are not tests", when it is a test and nothing runs it.
  The Threat model still says "A test file nothing runs is a finding, not a name on that list."

Neither should touch the default app: Vitest documents its default as the two name patterns and no folder (not
run here). Both are the case §5 names, "A test nothing runs is not coverage", in a project that has moved off
the defaults.

**Proposed resolution.** Two lines in Known limitations, in those words, and the Threat model's sentence takes
"under a test name" after "A test file". If the second is worth closing in the build: `spans()` already tells
a file that holds a test call from one that does not, and step 3 can use it for a file under `__tests__/`.

### AR-7 — Four carried lines do not hold what their findings asked

**Sort: carry.** Each is a rewording of a Build map line; none changes the Contract.

**Where:** F-13 Build map step 0 (800–817), step 3 (833–834, 838–840), step 5 (871–872); Contract §3.9
(320–331); `process/decision-defaults.md` §4; L-69.

Most carried lines read "check … against the code and pin it with a test", and for most any pinned answer is
enough. For four it is not.

- **AR-8, step 3.** The finding asked for a direction: a runner the step was not recorded against is refused,
  and a failure entry whose first word is not a recognised error name "counts for nothing and is named", so
  drift "fails toward `only-crashes`, which is loud". The line asks to "check what the step does". What it
  does is in §3.9's table: "any error not named below" counts. A test that pins that satisfies the line and
  keeps the hole: one release that puts a word before the error's name, and every crash counts, and the
  2026-10-12 rule is silently off. decision-defaults §4 covers it ("a value is not recognised … It never
  passes"). §8's recordings hold the two versions recorded, not the next minor.
- **AR-12, step 3.** The line lists the arguments and asks which "reach the listing and each changed run". The
  finding's harm was specific: `--reporter verbose` leaves `verbose` behind as a file filter, the listing is
  empty, every changed test file is `never-run`. A pin of what happens is not a pin of what should.
- **AR-7, step 5.** The finding: "'can ask' is memory", and "Give the stricter rule a declined lesson with a
  `review-by` and a trigger, as L-69." The line: "say here what brings the stricter rule of Known limitations
  back, and the date it is looked at again". A date said in a pull request or in `BOOTSTRAP.md` fires nothing.
  L1 fails a declined lesson with no `review-by`; that is the thing that fires.
- **AR-6, step 0.** The line asks which parts of the Contract's workload the script leaves out, "beside the
  number", which is the seconds. Since 0.3 the stop line reads a second number, the share not judged, and that
  is decided by §3.6: relative imports, re-exports to three levels, workspace packages, the support list. The
  support list is new in 0.3, so the prototype D-037 timed cannot hold it. A script without it counts a test
  of support code as judged, and the share it gives the owner is lower than the built step's will be. Step 0
  says "this Contract's rule and caps", one rule.

**Proposed resolution.** Reword each. AR-8: "a Vitest major with no recording under `scripts/fixtures/vitest/`
is exit 2 before anything runs, and a failure entry whose first word is not an error's name counts for nothing
and is named; pin both". AR-12: "none of these leaves a word behind as a filter or changes which tests a
single-file run executes: each is dropped with its value, or is exit 2 with 'Write the call'; pin each". AR-7:
"file the stricter rule as a declined lesson with a `review-by` and a trigger, as L-69". AR-6: "the script
applies §3.6 whole, the support list included; a part of §3.6 it leaves out is said beside the share".

### AR-8 — Nothing holds a build step to its carried lines

**Sort: carry, at the split.** A line of process, not of the spec.

**Where:** F-13 Build map (800–880); issue #51's body (its `### Acceptance`, `### Contract`, `### Verify`,
`### Out of scope`, and the one sentence that points at the Build map); `process/slipway-rules.md` ("Execution
issues **embed** the feature doc's Contract and `Verify` block; they do not link to it"); the 0.2 review's
register, AR-14.

The cap moves work out of the Contract and into lines under build steps. What makes a build session do them
is the issue it is given. Today:

- #51 embeds Acceptance, Contract, Verify and Out of scope. Of the Build map it holds one sentence: "Build
  map, in the spec: six steps". It has no sub-issue.
- The carried lines are worded for a reader of the spec: "check … against the code and pin it with a test".
  None names a test file, a command or a count. #419's body says what #51's shape check wants of an
  acceptance line ("a number, a command or a comparison") and that seven lines failed it. Embedded as
  acceptance, the carried lines would be the same finding; left as prose, the cold review of a step has no
  promise to hold it to.
- AR-14 of the 0.2 review is "tracker only": its bullets have steps in a Tracker cell of a review this one
  supersedes, and no line in the Build map. Two of them now decide an exit code (the root, AR-4 here;
  `excuse-expired` and the spent warning when no test changed, §4 at 383–385).

So the nine fixes are held by blocks, and everything carried is held by a reader remembering to open the spec.

**Proposed resolution.** When #51 is split, each step's issue embeds its carried lines as acceptance lines,
each naming the test file that holds it (`scripts/mutation.test.mjs`, `scripts/mt1.test.mjs`,
`scripts/skills.test.mjs`). The AR-14 bullets with a step get a line under that step. The findings of this
review sorted "carry" go the same way.

### AR-9 — "The pull request whose diff adds it"

**Sort: carry (build step 3 for the first three, step 5 for the last).**

**Where:** F-13 Contract §3.7 (298–305), §5 (415–418, 432–433); Threat model (506–508); Build map step 5
(860–865).

"It counts only in the pull request that adds it: when this pull request's diff adds the line holding that
id". The rule is one line of a diff, and three things make that line appear:

- **A touched line.** Reordering the file's entries, or a comment added after the id, shows the id's line as
  added. The entry counts again. The owner is asked, as for any change to the file, and sees an edit that
  looks like tidying.
- **A merge into a stacked branch.** A pull request whose base is another branch, and which merges `main` into
  itself after the entry landed there, has the line in its diff against that base. Its tests are not judged.
- **An uncommitted entry.** The diff is of commits; "the entry is unexpired" is read from a file. §1 says
  uncommitted changes are not judged; say that both files that take tests out are read from the commit.

And nothing tells an author the line exists. A pull request that needs it meets `out-of-time`, whose message
sends them to `BOOTSTRAP.md`; step 5's list for that section is "the two files, what a project on another
runner does, what to do when the step runs out of time".

**Proposed resolution.** Under step 3: check what counts as "adds" for a moved or re-touched line and for a
line that arrives by a merge, and that `ci/exceptions.yaml` and `ci/tests-can-fail.yaml` are read from the
commit, against the code, and pin each with a test. Under step 5: `BOOTSTRAP.md` names the mechanical line,
when it is for, and that it counts once.

### AR-10 — Hygiene

**Sort: carry, each under the step named.**

**Where:** the sections and lines named in each bullet.

- **§4 (383–384), §5, Acceptance (629–630), step 4:** `excuse-expired` is a finding with no wording in §5, and
  the block asks that "each detail holds the test's file, its name and the wording of §5" for it among six. An
  expired `tests-can-fail#mechanical` or `#other-runner` names no test file at all.
- **§4 (385–388), Acceptance (728, 759–762), step 4:** the four count lines, and "No tests were added or
  changed.", hold no file and no next action; the message block asks that "every message MT1 and
  `ci/mutation.mjs` print in the cases above" holds both. Scope the block to findings, exits and warnings.
- **§4 (386–388), §3.6 (282–283), step 4:** the count lines give a number where the record holds names. For
  "test support files were left out" the name is the point: a product file under a listed name, dropped from a
  test that has other subjects, is seen nowhere else. Print the names, through the escape.
- **Problem (options table, line 42), step 5:** "nothing reads a list of warnings" was the reason the listing
  went. The four counts are lines on a green run. The one reader a green run has is `/work-ticket`: say there
  that it copies each count that is not zero into the pull request's `## Verification`.
- **Known limitations (547–548):** an updated snapshot is the one neighbour of AR-2 with no count. Say "and is
  not counted", or count it.
- **§3.6 (279–281), step 3:** "under a folder named `test`" is matched on which path is not said. On anything
  but the path inside the repository, a checkout under a folder of that name makes every file support.
- **Acceptance (721), Build map step 4 (852–853):** the last clause of the head-commit block ("the `mutation`
  job's checkout step … names `github.event.pull_request.head.sha`") is proven in step 4. The Build map moves
  only the "MT1 on that record" halves there.
- **Acceptance (778), Build map step 0 (810–813):** a decision "that cites which line was crossed", when it is
  the share, writes into D-037 that more than a third of a real project's new tests were not judged. Step 0's
  own rule is that a real project's figures "are shown to the owner and not recorded". Say what the decision
  may hold: that a line was crossed, and for the share no more.
- **§8 (461–464), Build map step 0 (806–807), D-037's table of 2026-10-12:** the recordings are for Vitest 4
  and for Vitest 5 and hold "a crash on a line inside an `expect`"; they "come from this run", which is one
  run on the scratch project, whose measured tests had no failure of that kind. Step 0 runs both versions and
  plants the fourth kind, or step 3 records them.

**Proposed resolution.** One line under each step named, in the pass that takes AR-1 to AR-9.
