# Adversarial review — F-13 tests can fail 0.2

Reviewed: dev/features/tests-can-fail.md @ b502570
Version line: Version: 0.2 (2026-10-12)
Supersedes: docs/reviews/2026-10-09-tests-can-fail-unversioned.md
Review date: 2026-10-12
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`.

b502570 is `main` at the time of the review (the merge of #413). This session did not write or edit the
document. One earlier review names this path, and it is superseded above.

**What was read.** In full: the target; `docs/reviews/TEMPLATE.md`; the earlier review; `decisions.md` D-037 with
its amendment and both measurements, D-004, D-033, D-040, D-041; `process/decision-defaults.md`;
`process/lessons/L-04` and `L-69`; `.github/workflows/ci.yml` and `pr-body.yml`; `package.json`;
`ci/checks/lib/workspace.mjs`. In part, to check a named claim: `ci/checks/lib/yaml-list.mjs` (`readList`, lines
1–60), `ci/checks/meta/w1-declared-vs-invoked.mjs` (its header), `ci/checks/meta/fo1-fail-open.mjs` (the
`pnpm-lock.yaml#` skip), `ci/checks/lib/exceptions.mjs` (its exports), `dev/ownership.yaml` (the two `ci/` rows),
`.claude/skills/bootstrap/SKILL.md` (where the default app goes and its `test` script),
`.claude/skills/work-ticket/SKILL.md` (how the gate is named), `AGENT.md` and `dev/skill-configuration.md` (the
`Quality gate` row), `.claude/skills/sync-slipway/SKILL.md` (what a sync takes), `scripts/release.mjs` (what a
tag is held to), `docs/features/TEMPLATE.md` (Open questions), issue #51 (state and the head of its body).
`git diff a76c489 b502570` over `ci`, `.github`, `scripts`, `dev/ownership.yaml`, `docs/testing-strategy.md`,
`process/cold-review.md`, the bootstrap skill, `.gitignore` and `package.json` is empty, so the Contract's
`Verified against:` line still describes the tree. A search of `ci/`, `scripts/` and `dev/probes/` for the
measured prototype found nothing (AR-6). `docs/product/FRAME.md` in slipway is the unfilled template, so there
is no FRAME question; the document cites `SLIPWAY.md`'s thesis ("a rule exists only where something fires") and
the findings are read against that. `docs/domain-invariants.md` has nothing this document touches.

**Not verified.** Vitest 4 and 5 were not run. Two claims about the runner's output were read in a copy of Vitest
3.2.4, outside the stated range: its JSON reporter writes `failureMessages` as each error's raw `stack`, or its
message when there is none, and gives a test with no result the status `skipped`. What a pull-request checkout holds on GitHub (AR-1) is GitHub's documented behaviour,
not a run made for this review. No project built from slipway was read.

**Not argued.** D-037's picks, as amended on 2026-10-12, are the owner's: what counts as a failure, a test nothing
runs fails, the `test` script is what is judged, out of time is a failure, green when no test changed, the
listing withdrawn, named and not failed for a test with no findable code. A finding touches one only where the
document's own text contradicts it, or where the Contract does not deliver it.

**Against the earlier review.** Its sixteen findings are each answered in 0.2. Four of the answers open something
new: AR-10's (what is new) leaves a pure deletion out (AR-2 here); AR-3's (`never-run`) catches files that are
not tests (AR-4); AR-4, AR-8 and AR-13's (step 0) set the pass marks from the run they judge (AR-6); AR-14's
(`/work-ticket`) does not say where the line lives (AR-10).

No finding below is S0.

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
| AR-1 | In CI `HEAD` is the pull request's merge commit, not `HEAD_SHA`; the Contract treats them as one commit, and no acceptance block has them differ | S1 | owner | build steps 0, 3, 4 | #51; fixed in 0.3 (§1, §3.1) |
| AR-2 | A test whose assertion is deleted is neither new nor named: only added and changed lines mark a test | S1 | owner | build step 4 | #51; fixed in 0.3 (§3.5); D-037 |
| AR-3 | A pull request that mechanically touches many test files cannot go green: every old test is new, out of time is a failure, and the excuse is one dated entry per file | S2 | owner | build step 4 | #51; fixed in 0.3 (§3.7); D-037 |
| AR-4 | "Looks like a test, in any language" takes in snapshot files and anything under `__tests__/`, and each is `never-run` | S2 | owner | build step 4 | #51; fixed in 0.3 (§3.2, §3.5) |
| AR-5 | A test's own support code is a subject, so a test that asserts on its own fixture is credited when the fixture is built in another file | S2 | owner | build step 4 | #51; fixed in 0.3 (§3.6); D-037 |
| AR-6 | Step 0 sets the pass marks from the run they then judge, names no result that stops the build, and runs a program the repository does not hold | S2 | owner | build step 0 | #51; stop line fixed in 0.3, D-037; the rest: build step 0 |
| AR-7 | Not judged is a warning in a job log, which the document says nothing reads; a pull request whose new tests are all unjudged passes, and the deferral has no detector | S2 | owner | build step 3 | #51; fixed in 0.3 (§4), D-037; the detector: build step 5 |
| AR-8 | A Vitest outside 4 and 5 is run and judged, not refused; an error name the reader does not recognise counts as a failure | S2 | owner | build step 4 | #51; build step 3 |
| AR-9 | Three outcomes of a changed run have no row: a load failure in `tried`, a timeout in `crashes`, a new test skipped by the change | S2 | owner | build steps 3, 4 | #51; build steps 3 and 4 |
| AR-10 | Where `/work-ticket` runs the step is not said: the configured gate row leaves existing projects out, a line in the skill is exit 2 in slipway itself | S2 | owner | build step 5 | #51; build step 5 |
| AR-11 | Between build steps 3 and 5 `main` holds a job that exits 2 on every pull request, and only a sentence keeps a project from taking it | S2 | owner | build step 3 | #51; fixed in 0.3 (Build map) |
| AR-12 | The arguments kept from a `test` script go to the listing and to every changed run unread; a flag with its value as a second word leaves a filter behind | S2 | owner | build step 4 | #51; build step 3 |
| AR-13 | Contract lines no acceptance block holds, and one sentence of §2 that, as written, leaves exported code unchanged | S2 | owner | build steps 2, 4 | #51; §2 fixed in 0.3; the rest: build steps 2, 3, 4 and 5 |
| AR-14 | Hygiene: who pays, "runs no shell", the expect exception unmeasured, the workspace root, small gaps in the record | S3 | owner | — | #51; build step 0 (a count for the `expect` exception, the open questions, the pull request on a real project), step 3 (the workspace root, a flaky test at the baseline, one run's limit, `version` and two `run:` entries, `-w`, "no shell", the `meta` script) and step 4 (who pays, `excuse-expired` with no test changed, the `meta` script) |

## Findings

### AR-1 — In CI `HEAD` is the merge commit, not `HEAD_SHA`

**Where:** F-13 Contract §1 (lines 106–111, the job), §3.1 (161–163), §3.4 (212–215), §3.10 (291, `head`), §4
(307–308 and 325–326); Acceptance (552, 556–560); Verify (671–675); Build map step 0 (679–687).

§1 gives the job "`verify`'s steps up to and including the install, then `pnpm check:mutation` with `BASE_SHA` and
`HEAD_SHA` from the pull request, as `pr-body.yml` passes them". `verify`'s checkout step has `fetch-depth: 0` and
no `ref:`. On a `pull_request` event that checks out `refs/pull/<n>/merge`: `HEAD` is a merge of the pull request
into the base branch, a commit that is neither `HEAD_SHA` nor on the branch. `pr-body.yml` passes the same two
names and never reads `HEAD` or the working tree, so the precedent does not carry.

The Contract then uses both as if they were one commit:

- §3.1: the changed lines come from `git diff … base...head`, with `HEAD_SHA` as head.
- §3.4: "The tree of `HEAD` is written out by git": the merge commit's tree.
- §4: "The commit under review is `HEAD`, read through `trustedGit`", and exit 2 when the record's "`head` is not
  the commit under review".

Read one way, the record's `head` is `HEAD_SHA`, the verdict compares it with the merge commit, and every pull
request in CI is exit 2 with "This record is for commit {a}, not the one being checked ({b}). Run
`pnpm check:mutation` again." Read the other way, line numbers taken from `HEAD_SHA`'s diff are laid over test
files from the merge tree: when the base branch has changed the same test file since the branch was cut, a
"changed line" falls in another test, and the wrong test is judged or none is.

Nothing in the plan would show it before a project's first pull request. Every acceptance block runs in a
temporary repository or a local checkout, where the two are the same commit; line 552 accepts "a record whose
head is that repository's HEAD". Verify's scratch-project run is local. Step 0 runs through a draft pull request
on a hosted runner, but with the prototype, which D-037 says "edited the scratch project in place" and has no
verdict.

**Proposed resolution.** Pick one commit and say it in §1, §3.1, §3.4 and §4. Either the job checks out the pull
request's head (`ref: ${{ github.event.pull_request.head.sha }}`, a change to `verify`'s steps that §1 then
states), or the step copies the tree of `HEAD_SHA` when it is given and the verdict compares the record with
`HEAD_SHA`, not with `HEAD`. Judging the merge tree is the third choice (it is what `verify` runs); the diff is
then the merge commit against its first parent, and `HEAD_SHA` is not used. Add an acceptance block in a
temporary repository where `HEAD` is a merge commit and `HEAD_SHA` its second parent, with the base having
changed the same test file.

### AR-2 — A test whose assertion is deleted is neither new nor named

**Where:** F-13 Contract §3.1 (161–163), §3.2 (164–166), §3.5 (229–233); Problem (lines 32–34, "a test it adds
or edits"); Threat model (421–424); Known limitations (460–463).

D-037's rule is "a pull request fails when a test it adds or edits never fails". The Contract narrows "edits" to
added lines: §3.1, "Added and changed lines per file come from `git diff -U0 -M -w base...head`", and §3.5, "A
test is *new* when a changed line falls inside its own call". A hunk that only removes lines has no line on the
new side. So a pull request that deletes `expect(total).toBe(5)` from an existing test, and changes nothing
else in the file, has no new test; if that is its only test change, §3.2 ends the run with "No tests were added
or changed." The test now asserts nothing. It is not judged, and it is not named: the Threat model's promise
is "A test it does not judge is named, with the reason, in every run", and this one is on no list.

Deleting the assertion that fails is the shortest way to turn a red test green, and it is the edit an agent
under a red gate makes. The same edit made by commenting the line out is caught (a changed line, then
`kills-nothing`); only the cleaner form escapes.

Three neighbours share the cause, and none is stated:

- **A deleted test file.** §3.2's "changed file that looks like a test" does not say whether a deletion counts.
  If it does, §3.5 makes it `never-run` ("no call lists" a file that is gone) and the pull request fails with
  "Rename or move it so a run finds it". If it does not, say so.
- **A test file renamed out of the pattern** (`cart.test.ts` → `cart.tst.ts`). By its new name it is not a test,
  so nothing is changed and nothing runs it.
- **An edit to a helper, a hook or a `vi.mock` line.** §3.5 says these mark no test new. That answers the earlier
  review's AR-10, and it is right for attribution; the cost is that a pull request that empties a shared
  assertion helper, or mocks the subject away at the top of an old file, changes what every test in the file
  can notice and has none judged. Known limitations does not list it.

**Proposed resolution.** A hunk that only removes lines marks the test whose span holds its position on the new
side (`@@ -12 +11,0 @@` falls after line 11). State the deleted file and the rename: either is a line in the
summary ("1 test file was removed") and not a finding, or the owner picks otherwise. For helpers, hooks and
mocks, either a changed line in a test file outside every test marks all of that file's tests new (strict, and
it feeds AR-3), or it is a Known limitation with those words. Add a block: a commit that only deletes one
`expect` line has one new test, and it is `kills-nothing`.

### AR-3 — A mechanical pull request across many test files cannot go green

**Where:** F-13 Known limitations (460–463); Problem (lines 62–64, "a mechanical edit to a test still makes it
new", taken under decision-defaults §5); Contract §3.7 (248–252), §7 (380–384), §5 (350–353).

"A rename applied across a test file, or a codemod, changes lines inside old tests, and each is then judged; one
that never could fail turns the pull request red. Only whitespace is ignored. The stricter reading is kept
(decision-defaults §5)."

§5 reads: "take the looser one only when the stricter would prompt on ordinary work". A formatter setting
changed (quotes, trailing commas, a line width that re-wraps: none is whitespace to `-w`), an import renamed
across the suite, a codemod for a runner upgrade: each is ordinary, and each touches lines inside most tests of
most test files. The default cited points the other way on its own wording, and a question two readings of a
default split on goes to the owner (decision-defaults, first paragraph). The earlier review offered "accept the
cost and write it down"; the cost written down is one red test, and the real one is larger:

1. Every test in every touched file is new. Each that cannot be killed "costs the whole list" (§3.9), 60 runs
   at the provisional caps.
2. The run reaches the limit. "At the limit the run stops, marks every new test it has not finished
   `out-of-time`, and the verdict fails naming each: it is never a pass."
3. The way out is `tests-can-fail#<test file>`, one dated entry for each file, each needing the owner's yes, in
   a pull request that changed no behaviour. `out-of-time`'s own message sends the author to BOOTSTRAP, whose
   levers take tests out.

So the pull request cannot pass by fixing anything in reach, and the exits are all the kind the rules call
weakening a gate. The step also now judges old tests the author did not write, which the Problem excludes ("old
untested code never blocks work").

**Proposed resolution.** Put it to the owner as one question: what does a pull request that touches many test
files without changing what they check do? Options to argue with: a single dated entry `tests-can-fail#mechanical`
that turns the run into named, counted not-judged for that pull request (one owner-seen line, expiring); or a
test is new only when a changed line falls inside an `expect(...)` span or adds a test call (`spans()` already
gives both), which leaves renames and re-wraps of setup lines out; or the cost stands and BOOTSTRAP says to
land such changes in slices under the limit. Whichever: move the choice out of "taken by this session".

### AR-4 — "Looks like a test" takes in files that are not tests

**Where:** F-13 Contract §3.2 (164–166), §3.5 (225–227), §5 (347–349).

"A changed file that looks like a test (`*.test.*`, `*.spec.*`, under `__tests__/`), in any language." And: "A
changed test file no call lists is a **finding**, `never-run`".

- A snapshot written by `toMatchSnapshot()` is `__snapshots__/cart.test.tsx.snap`, beside the test. It matches
  `*.test.*`. The runner lists tests, never snapshot files, so every pull request that adds or updates a
  snapshot has a `never-run` finding: "`…/cart.test.tsx.snap` was added or changed, and none of this project's
  test runs picks it up … Rename or move it so a run finds it". The default app is React with jsdom, where
  snapshots are common. `keep-out:` names one folder, and `__snapshots__/` folders sit beside each test folder.
- Anything under `__tests__/` that is not a test file: `__tests__/helpers.ts`, `__tests__/fixtures/order.json`,
  a `README.md` there.
- §3.6 excludes a subject that is "itself a test" by the same pattern, so a helper under `__tests__/` is a test
  for both rules: `never-run` when changed, and never a subject.

"In any language" was added so a project on another runner is seen (§3.3's `other-runner`). It does that, and it
also makes the pattern the only thing between a data file and a red job.

**Proposed resolution.** Say what the pattern is for at each use. For `never-run`: a file a runner could list
(the eight extensions of §2), with `.snap` and files under `__snapshots__/` never counted. For "a project on
another runner": the wide pattern, but a file with no judged-language extension can only be `other-runner` or
ignored, never `never-run`. Add a `.snap` and a `__tests__/fixtures/x.json` to the acceptance block that lists
changed test files, expecting neither to be a finding.

### AR-5 — A test's own support code is a subject

**Where:** F-13 Contract §3.6 (234–241), §3.9 (257–260 and the table at 267–272); Acceptance (633–635, the
scratch-project block); Known limitations (449–452).

A subject is "each file it imports by relative path … when that file is tracked, inside the repository and not
itself a test". That takes in `./test-utils`, `./factories`, `../mocks/handlers`, `./setup`: code written for
the tests. The step changes it and credits the test for noticing.

The acceptance's own planted case shows the cost. "A branch that adds a test asserting only on its own fixture"
must be named. With the fixture inline, it is. Move the fixture one file away:

```ts
// factories.ts
export const makeUser = () => ({ name: 'Ann' });
// user.test.ts
it('has a name', () => { expect(makeUser().name).toBe('Ann'); });
```

`body` is tried first, and "the pull request's own lines first". `makeUser`'s body becomes `undefined`,
`makeUser().name` is a `TypeError` in the test's own file, inside an `expect(...)` span: "yes: the test was
reading the result it checks". The test passes the step and reads no product code. A subject mocked away with
its stand-in data imported from a fixtures file is the same case, and "a subject mocked away" is one of the
three shapes D-037 says the step catches.

**Proposed resolution.** A subject is product code. Options: drop an imported file that no non-test file imports
(a helper only tests use), which the step can tell from the import lines it already reads; or drop by name
(`test-utils`, `factories`, `fixtures`, `mocks`, `setup`, a `test/` folder) and say the list; or keep the rule
and add the case to Known limitations in these words. Then the scratch-project block plants the fixture in a
second file.

### AR-6 — Step 0's pass marks are set from the run they judge

**Where:** F-13 Build map step 0 (679–687); Contract §7 (375–378); Acceptance (636, 649–650, 654–657); Open
questions (733–741); Known limitations (484–485).

Step 0 is the answer to three findings of the earlier review, and it is the right shape: measure before the
parser. Three things keep it from being able to fail.

1. **The marks follow the measurement.** "§7's figures, §3.9's caps and the not-judged share of the acceptance are
   set there, by the owner, from both." The later blocks then read "under the budget D-037 holds after step 0"
   and "under the figure D-037 holds after step 0". A figure set after reading a project's count, then tested
   on "a real project" in step 5, passes unless the build is worse than the prototype. No number written today
   can turn step 0 red.
2. **No result stops the build.** "The three things that decide whether the rest is worth building are measured
   here." The document names no result for which it is not worth building. The acceptance for step 0 (654–657)
   holds that D-037 was edited and that step 1 waited, not that anything was decided.
3. **The program is not kept.** Step 0 runs "the prototype's loop with this Contract's rule and caps, as a script
   outside `ci/` that does not ship". D-037's two tables come from that prototype; a search of `ci/`, `scripts/`
   and `dev/probes/` finds no mutation code. The figures that set the budget, the caps and the share cannot be
   run again by a reviewer, and neither can the recorded outputs of §8, which "come from this run".

The prototype also is not this Contract: it uses the TypeScript compiler API, edits in place, has no copy, no
install, no `ci/before-verify.sh` in the copy, no `runnerCall()`, and no verdict. Known limitations says the
first of these. So the hosted-runner time step 0 gives is again another program's, less than it was, and AR-1
and AR-12 are first met in step 4.

**Proposed resolution.** Write the stop line now, as the owner's, before the number exists: for example "over N
minutes on the scratch change, or more than X in 10 new tests not judged on the real project, and the build
does not start: the feature goes back to the owner with both figures". Any figure will do; the point is that it
is written before the run. Keep the step-0 script in the repository where it does not ship (`dev/probes/`, as
`conflicting-decisions` is), so D-037's figures have a program behind them. Say which parts of the Contract's
workload step 0 leaves out, in D-037 beside the number.

### AR-7 — Not judged is a warning nothing reads

**Where:** F-13 Problem (options table, line 42: "nothing reads a list of warnings"); Contract §4 (319, 321–323);
Threat model (423–424, 439–441); Known limitations (464–468); Open questions (739–741); L-69; D-037 ("It never
passes for having nothing to look at").

The listing of unnoticed changes was withdrawn because "nothing reads a list of warnings, and listing spends the
time the step's limit is racing". `notJudged` is a list of warnings: "in `notJudged` | warning, by name, with its
reason", and warnings "never change the exit code". The Threat model rests on it: "naming is all it promises
for those". The reason that took the listing out applies to what was kept.

Two consequences:

- **A pull request whose new tests are all not judged passes.** §4 has no row for "new tests, none judged". A
  project whose tests sit in a `tests/` folder and import through an alias (`@/…`) has `no-subject` for every
  one (the same-name rescue of §3.6 needs the test beside its source). Every pull request is green with a
  warning. D-037 says of the step "It never passes for having nothing to look at"; this is that, for a pull
  request that did change tests. The Open question says so: "the step is green on tests it never judged".
- **The stricter rule's return has no detector.** "A project whose not-judged share stays under the figure D-037
  holds after step 0 can ask to fail on it, in a later ticket." Nothing measures a project's share after the
  one run of step 5, and "can ask" is memory. L-69 gave the listing a declined lesson with a review date for
  this reason; this deferral has none.

**Proposed resolution.** Add the row: a pull request with at least one new test and none judged is a finding
(`nothing-judged`), with the reasons, unless every one is `excused`, `kept-out` or `skipped`. That keeps "named,
not failed" for the single unjudged test, which is what the owner picked on, and fails the case where the step
saw nothing. Give the stricter rule a declined lesson with a `review-by` and a trigger, as L-69. If the owner
prefers the warning, say in the Threat model that the promise is a line in a job log.

### AR-8 — A Vitest outside the range is judged, and an unread error name counts

**Where:** F-13 Contract, "The test runner" (96–99), §3.9 (269, 274–276), §8 (395–397), §5 (361–362); Known
limitations (474).

"Vitest 4 and 5 … Nothing else ties it to a version." Known limitations: "Vitest 4 and 5 only". Nothing refuses
any other version. The version appears in one message, printed when a field is missing. A project on Vitest 3,
or on a later major, is run and judged for as long as the three shapes hold.

A shape check catches a field that moved. It does not catch a field that kept its place and changed what it
holds, which is the failure D-037 found in StrykerJS ("wrong and green"). The rule that reads the failure fails
open on exactly that: "an assertion failure, or any error not named below" counts, and the name is "the first
word of the failure's first `failureMessages` entry". If a release puts anything before the name (a prefix, a
colour code, the test's title), no entry starts with `TypeError`, every crash is "not named below", and every
crash counts: the amended rule is silently the first rule again, and green. In the one copy read for this review
(3.2.4, outside the range) the entry is the error's raw `stack`, or its message when it has none, so the first
word is whatever the thrown value's `stack` starts with.

**Proposed resolution.** Refuse a major the step was not recorded against: exit 2 with the §5 message, before
anything is run, and an entry in `ci/exceptions.yaml` (dated) for a project that takes the risk. Read the name
by a pattern (`^[A-Za-z]*Error\b`, or what the recorded files show) and treat an entry that does not match as
unread: it counts for nothing and is named, as §3.9 already does for a first frame that "cannot be read". Then
drift fails toward `only-crashes`, which is loud.

### AR-9 — Three outcomes of a changed run have no row

**Where:** F-13 Contract §3.9 (271–272, 278–283), §3.10 (293–296), §4 (314–315, 325–328), §5 (338–343); Known
limitations (478–479).

- **A change that stops the file loading.** §3.9: "It is dropped and not counted." Known limitations: "A test
  whose only effect on a change is one of those is named `kills-nothing`", which needs `tried` at least 1. If
  dropped changes are not in `tried`, a test file whose few changes all break loading (a subject whose top level
  calls the function whose body was emptied) has `tried` 0, `failedOn` null, `crashes` 0, and §4 makes that exit 2,
  of which it says "a fault in the record and never an ordinary pull request". It is an ordinary pull request.
  If they are in `tried`, "not counted" is wrong and `kills-nothing`'s "{n} changes were made … and it failed on
  none of them" tells the author to add an assertion to a test that never ran.
- **A timeout.** The table says it does not count. Whether it is a `crash` is not said. "A crash that does not
  count is kept for the test: how many, and the last one's type, file and line": a timeout has no type, file or
  line, and `only-crashes` prints "the last a {type} at `{file}:{line}`".
- **A new test the change skips.** A change that fails a `beforeAll` leaves the tests under it skipped, not
  failed (the reporter's status for a test with no result). The baseline's rule for `skipped` (§3.8) is about
  the untouched run. A test that is skipped on every change is not `kills-nothing` in any stated way.

**Proposed resolution.** One table in §3.9 with a row for each outcome of one changed run and what it adds to
`tried`, `crashes` and `failedOn`: passed, failed and counts, failed and does not count, timed out, skipped,
absent from the result, file did not load, run hung. Give `lastCrash` a `type` of `timeout`. A test whose every
change was dropped is `notJudged` with its own reason ("every change this step made stopped the file loading"),
so §4's exit 2 really is unreachable.

### AR-10 — Where `/work-ticket` runs the step is not said

**Where:** F-13 Contract §1 (115–120); Build map step 5 (706); `.claude/skills/work-ticket/SKILL.md` ("Run
`Quality gate` exactly as written"); `AGENT.md` and `dev/skill-configuration.md` (the `Quality gate` row).

"`/work-ticket` runs `pnpm check:mutation` at its quality gate … Without that line the first place the rule
fires is CI". `/work-ticket` has no command of its own at that step: it runs the `Quality gate` row of the
project's configuration. So the line lands in one of two places, and each has a cost the document does not
name.

- **In the row's default** (`pnpm verify && pnpm meta`). `AGENT.md` is the project's own file and owner-only; a
  sync does not rewrite a row a project has. Every existing project keeps its gate, and the rule fires in CI
  only, which is the state this line was written to end.
- **In the skill.** Then it runs in slipway too, where the row is `pnpm meta`. Slipway has no package that
  depends on Vitest, and most code changes in slipway touch a `scripts/*.test.mjs`, which "looks like a
  test". §3.3: "When no package depends on it, exit 2", and `/work-ticket` "treats exit 1 or 2 as a red gate".
  §1's "Slipway itself has no app: the job is skipped there" covers the CI job, not the local command.

**Proposed resolution.** Say which. If the skill: the line runs only when the root has a `check:mutation` script
and the project is not the template (the test `ci.yml` already uses), and the skill wording is held by
`scripts/skills.test.mjs`. If the row: the sync asks the owner, in project terms, to add it, and the document
says existing projects are told. Either way add an acceptance line that `/work-ticket` in slipway does not go
red on a pull request that changes a `scripts/*.test.mjs`.

### AR-11 — Between steps 3 and 5, `main` holds a job that exits 2

**Where:** F-13 Build map step 3 (695–698), step 4 (702–703), and the closing paragraph (711–713).

Step 3 adds the job with a last line "which exits 2 saying the run is not built. No project sees that (below)."
Below: "Steps 1 to 5 land before the next version tag: a project takes a tagged release, so none sees the job
without the run behind it."

Two things are asserted. A project takes a tagged release by default; the sync skill also documents the other
path, "For a commit that is not released yet, or a named ref, use `npx github:matldupont/slipway#<ref> sync …`,
where `<ref>` is `main`, a tag or a sha", and that is how a fix is tried on a project before it is released.
And nothing holds the tag: `scripts/release.mjs` checks that a tag equals the package version, not what `main`
contains. Slipway has other work in flight, and a release cut for it between steps 3 and 5 ships a job that is
exit 2 on every pull request of every project, whether or not it changes a test, since the part that says "no
tests were changed" is the part not built.

**Proposed resolution.** Remove the window, not guard it. Build the verdict's `<folder>` form in step 3 with no
job, and excuse W1 for that one check with a dated entry (the registry exists for this) that step 4 removes; or
land steps 3 and 4 as stacked pull requests merged together. If the window stays, have something fire: a line
in the release test that fails while `--run` reports "not built".

### AR-12 — The arguments kept from a `test` script are passed on unread

**Where:** F-13 Contract §3.3 (180–187), §3.5 (223–225), §3.9 (260–262); Acceptance (521–525).

"The script is split on spaces and nothing more … The `run` word, `--watch`, `--reporter` and `--outputFile` are
dropped from what is read, since the step gives its own." Everything else is kept and given to both
`list --json --includeTaskLocation` and `run <file> --reporter=json`.

- `vitest run --reporter verbose` is two words. `--reporter` is dropped and `verbose` stays, as a file filter.
  The listing is empty, every changed test file is `never-run`, and the message tells the author to rename
  files. The same for `--outputFile out.json`.
- `vitest run --coverage` is common. It is kept, so each of up to 60 runs for a file collects coverage, and a
  coverage threshold in the config fails the run's exit code on a single file. Whether the step reads the exit
  code or only the result file is not said.
- `--shard`, `--changed`, `--bail`, `-t` each change which tests a single-file run executes.
- Whether `list` accepts every argument `run` does was not shown; the measurement used the prototype, which
  does not read a `test` script.

The eight scripts of the acceptance block hold none of these.

**Proposed resolution.** Keep a stated list of arguments (the ones that choose tests and configuration:
`--config`, `--project`, `--dir`, `--root`, `--mode`, `--environment`), drop a stated list with their values in
both spellings, and send any other to exit 2 with the "Write the call" message, which is the rule §3.3 already
has for what it cannot read. Add `--reporter verbose`, `--coverage` and `--outputFile=x` to the block.

### AR-13 — Contract lines no acceptance block holds

**Where:** F-13 Contract §2 (line 153), §3.3 (202–205), §3.4 (216–218), §3.5 (231–233), §3.8 (256), §3.9
(258–260); Acceptance (502–506 and the blocks named below).

One is a contradiction. §2: "Nothing is changed inside an import or export declaration, a type, or a string."
`export function total() { … }` and `export const total = () => …` are export declarations, and the functions a
test imports are the exported ones. Read as written, the code under test gets no change, most subjects are
`no-change-to-make`, and the step is green. The acceptance block says "nothing is returned inside an import, a
type annotation or a string": no "export", and its fixtures are "a function, an if, a comparison and a boolean"
with nothing said about exporting them. The intent is clearly the `export … from` forms.

The rest are promises with no block:

- §3.4: each `NAME=value` line of `GITHUB_ENV` reaches every runner call. The one `before-verify` block tests a
  file the script writes. `ci.yml` tells projects this is the way to set a variable.
- §3.3: "An entry with both or neither, an unknown package, or a key not named here is exit 2", and two `run:`
  entries for one package both being judged.
- §3.5: "A test file `spans()` cannot read has every test in it treated as new."
- §3.8: a skipped or `todo` new test is not judged, `skipped`; and `other-language` (the fixture record holds
  four of the eight reasons).
- §3.9: the order of changes ("the pull request's own lines first, then by kind … taking turns across the
  subjects") and the two caps. The limit block holds the order of files only.
- §1: the job's `timeout-minutes`, permissions and `if:`.
- The message block's last line, "the step-5 pull request names a reader who did not write them, and records
  what they could not act on", passes on "nothing".

**Proposed resolution.** Reword §2 to "an import, a re-export (`export … from`), a type or a string", export
each fixture's function, and add a line or a fixture case for each bullet. For the reader: name what they are
given (the messages and nothing else) and what counts as a miss (an action they could not name).

### AR-14 — Hygiene

**Where:** the sections and lines named in each bullet.

- **Seams (413–416):** "one more job on each pull request that changes a test". §1's job runs on every pull
  request, with checkout and install, before the step can see there is no test. The cost is per pull request;
  or run the diff before the install.
- **Threat model (432–434):** "The step runs no shell". §3.4 runs `ci/before-verify.sh` and an install with its
  lifecycle scripts. Say "starts the runner without a shell".
- **§3.9 (270) and D-037's 2026-10-12 table:** the 38 tests split 2, 33, 2 and 1, so no measured test needed the
  `expect` exception. It also credits `expect(cart.items.length).toBeGreaterThanOrEqual(0)` when `cart` is
  undefined. One line in Known limitations, and a count from step 0.
- **§3.3 (167–168) and `ci/checks/lib/workspace.mjs`:** `discoverWorkspace` returns the root apart from
  `packages`, and a count of dependencies, not their names. Say whether the root is judged, and that the
  function gains the names. A package whose `vitest` is the root's is `other-runner` as written.
- **§3.8 (253–256):** a flaky test red at the baseline is exit 2 with "it needs a file that git does not track";
  the same test red at the last run is `flaky`.
- **§4 (321–322):** whether `excuse-expired` is reported when no test file changed; FO1 leaves these ids alone,
  so otherwise an expired excuse is seen only by the next pull request that changes a test.
- **§3.9 (281):** "the run hangs past its limit": the limit of one run is not given.
- **§3.10 (292–293):** where `version` is read from; and which call judges a file two `run:` entries both list.
- **Build map steps 3 and 4:** `scripts/mt1.test.mjs` and `scripts/mutation.test.mjs` are not said to join the
  `meta` script, as step 1 says of `scripts/mutants.test.mjs`. W1 will say it; the map should.
- **§3.1 (163):** `-w` also hides a changed space inside an expected string.
- **Open questions (733–741):** each has an owner, an assumption and a cost, and no tracker; step 0 has no issue
  named.
- **Build map step 0 (682, 687):** the owner is asked before a scratch repository is made; the draft pull
  request on a real project is also outside this repository and is not mentioned.

**Proposed resolution.** One edit pass over the lines above.
