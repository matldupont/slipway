# Adversarial review — F-13 tests can fail, as drafted 2026-10-08

Reviewed: dev/features/tests-can-fail.md @ a4ee842
Version line: - 2026-10-08 · ADDED · the spec, from #51 · #370
Review date: 2026-10-09
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`.

a4ee842 is `main` at the time of the review. This session did not write or edit the document. The document has
no `Version:` line (AR-15), so the line quoted above is its only `## Changes` entry; it is the closest thing the
file has.

**What was read.** In full: the target; `docs/reviews/TEMPLATE.md`; `decisions.md` D-037 with its measurements;
`process/decision-defaults.md`; `process/lessons/L-04`, `L-43`, `L-57`; `docs/testing-strategy.md`; issue #51
(body, as filed). In part, to check a named claim: `ci/checks/meta/r1-review-provenance.mjs`,
`ci/checks/lib/workspace.mjs`, `ci/checks/lib/exceptions.mjs`, `ci/checks/lib/yaml-list.mjs`,
`ci/checks/lib/tasks.mjs`, `ci/checks/meta/pc1-positive-control.mjs` (the fixture env list),
`.github/workflows/ci.yml`, `.github/workflows/pr-body.yml`, `dev/ownership.yaml`, `.claude/skills/bootstrap/SKILL.md`.
Every file the Contract's "Verified against: 51b9c5e" line names that I opened matches its description, and
`git diff 51b9c5e HEAD -- ci .github` is empty. `docs/product/FRAME.md` in slipway is the unfilled template, so
there is no FRAME question to test the feature against; the document cites `SLIPWAY.md`'s thesis ("a rule exists
only where something fires") instead, and AR-4, AR-11 and AR-12 are read against that. Not read: the codebase of
any project built from slipway; Vitest's own output format (AR-9 asks for it).

**Not argued.** D-037's picks (no stored score, a small mutator, a pinned parser, 5 and 10 minutes, a test with no
findable code is named and not failed) are the owner's decisions of 2026-10-08. A finding below touches one only
where the document's own text contradicts it, or where the Contract goes past it.

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
| AR-1 | "Failed once" credits a crash, so the commonest cannot-fail test (it calls the code and asserts nothing) passes | S1 | owner | build step 2 | |
| AR-2 | A subject that parses and has no change to make (a barrel, a types or constants file) ends in exit 2 "contradicts itself" | S1 | owner | build step 4 | |
| AR-3 | The judged set is what bare `vitest` lists, not what CI runs; a new test file nothing runs is a warning | S1 | owner | build step 4 | |
| AR-4 | The 10-minute stop fails correct pull requests; the budget rests on a prototype that differs from the Contract | S1 | owner | build step 4 | |
| AR-5 | The threat model promises what Known limitations take back | S2 | owner | build step 3 | |
| AR-6 | The job is red on every pull request of a project without Vitest, and pays the copy and install on pull requests that change no test | S2 | owner | build step 4 | |
| AR-7 | The copy holds only tracked files; `ci/before-verify.sh`, the sanctioned setup, writes untracked ones | S2 | owner | build step 4 | |
| AR-8 | Four acceptance lines cannot fail | S2 | owner | build steps 1–5 | |
| AR-9 | "Tied to no runner version" is asserted; the step reads two of Vitest's JSON formats and slipway tests neither | S2 | owner | build step 4 | |
| AR-10 | What counts as a new test breaks on `it.each`, loops, shared helpers and mechanical edits | S2 | owner | build step 4 | |
| AR-11 | A flaky test is credited with a kill | S2 | owner | build step 4 | |
| AR-12 | The survivors listing fires nothing, spends the budget, and its deferral has no detector | S2 | owner | build step 4 | |
| AR-13 | The riskiest assumptions are measured last, after four build steps, and the figure behind "named, not failed" is unrecorded | S2 | owner | build map | |
| AR-14 | Outside `pnpm verify`, nothing in the agent's loop fires; the job also departs from `ci.yml`'s "both triggers, always" without saying so | S2 | owner | build step 5 | |
| AR-15 | The document has no `Version:` line, so a later review can never go stale | S3 | owner | the next review | |
| AR-16 | Hygiene: a stale epic, minutes against seconds, an undeclared knob, a job added twice, one argument set per package | S3 | owner | — | |

## Findings

### AR-1 — "Failed once" credits a crash, so the commonest cannot-fail test passes

**Where:** F-13 Contract §3.8 (the judging loop) and §2 (the `body` kind, "tried first"); Known limitations ("A weak
test passes"); Problem (the job story).

The job is: "each new test shown to fail when the code it covers is changed, so I can read a green suite as 'this
works'". §3.8 credits a test with a kill when it "fails", and §2 tries `body` (a function's block body becomes
`{}`) first, then stops "as soon as every new test in it has failed once". Nothing says what the failure was.

Take the test that calls the code and asserts nothing:

```ts
beforeEach(() => { cart = makeCart(); });
it('adds an item', () => { cart.add(item); });
```

Change `makeCart`'s body to `{}`: `cart` is `undefined`, `cart.add` throws `TypeError`, the test fails, and the
first change tried is credited as a kill. The test asserts nothing and could not have failed on any wrong
*answer*. The Contract's own list of what the step catches is "a tautology, a subject mocked away, an error
swallowed"; it does not catch this one, and it is the likeliest shape of a test that cannot fail, because the
author ran the code and saw no error. D-037's measurement says the same thing in one case: "the planted test that
asserts only on its own input was credited with a change that made the code throw". The Contract adopted the
prototype's order and its credit rule unchanged. A failure in a `beforeEach`/`beforeAll` hook fails every test in
the file, so one broken setup also credits a new test that sits beside a good one.

**Proposed resolution.** Credit a kill only when the test's own body fails with an assertion error (Vitest's JSON
result carries the error name and message), not a `TypeError`/`ReferenceError`, not a hook, not a timeout. A
test whose only failures are the other kinds is `kills-nothing` with that said in the message ("it failed only
because the code threw: add an assertion on what it returns"). Try the non-crashing kinds (`condition`,
`operator`, `literal`) before `body` for a test that is not killed by them, or keep the order and record which
kind did the killing so the warning can say "killed only by emptying a function". Add the case above to the
acceptance with the stand-in runner: a test with no assertion, in a file whose setup uses the subject, is named.

### AR-2 — A subject with nothing to change ends in exit 2 "contradicts itself"

**Where:** F-13 Contract §3.5 (subjects), §3.8 (judging), §4 (the exit 2 rule: "a `judged` test has `failedOn` null
and `tried` 0 … the record contradicts itself").

§3.5 sends a test with no subject to `notJudged` for three reasons: `no-subject`, `could-not-be-parsed`,
`other-language`. It has no reason for a subject that exists, parses, and returns zero changes from `mutants()`:
a barrel (`index.ts` of `export * from './add'`), a types file, a constants file, a file of re-exports. That test
is `judged` with nothing to try, `tried` is 0, `failedOn` is null, and §4 turns it into exit 2 with the message
that the record contradicts itself. The author of the pull request sees a fault in the tool, with no next action
(D-016, and §5's own rule that every line names the next action). The workspace-package branch of §3.5 follows
the entry file's re-exports "by relative path"; the relative-import branch does not, so `import { add } from './utils'`
with `utils/index.ts` as a barrel has a subject that cannot be changed. A project built on the default app, with
components behind `index.ts` files, will hit this on its first pull request.

**Proposed resolution.** Follow relative re-exports the same way for both branches (one level, or to a fixed depth,
stated). A subject with no change to make is dropped like an unreadable one and the test is `not judged`, reason
`no-change-to-make`, with the file named; add it to §3.5, §5's list of reasons and the `notJudged` record. Keep the
exit 2 in §4 for a record that really contradicts itself, which the run can then never produce. Add a barrel and
a types-only file to the second acceptance block.

### AR-3 — The judged set is what bare `vitest` lists, not what CI runs

**Where:** F-13 Contract §3.3 (`pnpm exec vitest`, "the arguments `ci/tests-can-fail.yaml` gives"), §3.4 (a changed
test file not on the list is `not-listed`), §4 (not judged is a warning), Known limitations ("Browser and server
tests are not judged"); `docs/testing-strategy.md` (Layers).

Two things make a test that runs nowhere pass this step.

1. **The step does not run the package's `test` script.** It starts `vitest` itself, with arguments from a
   second file. `docs/testing-strategy.md` says integration tests run "as `test`, or a `test:<sub>` script CI
   invokes", and e2e through `test:e2e`. A package whose `test` script is `vitest run -c vitest.unit.config.ts`
   (or sets an environment variable) is judged under a configuration it does not run under. And
   `ci/tests-can-fail.yaml` holds one `args:` per package, so a package with a `test` and a `test:integration`
   script cannot describe both.
2. **A new test file the runner does not list is a warning.** `not-listed` is meant for tests a project keeps out
   on purpose (a server, a browser). It is equally what a `foo.spec.ts` looks like when the project's `include`
   is `*.test.ts`, or a file placed outside `include`. Both `pnpm verify` and this step skip it, both are green,
   and it reads as coverage: the very failure L-04 records, and the one the step was written to stop. The
   document says it is the `ci/tests-can-fail.yaml` file that takes a test out of the set; for this case nothing
   did, so the owner is never shown.

D-037's pick covers "a test the step can find no code for". It does not cover "a test nobody runs"; this is the
session's own call (the "Design calls taken" paragraph) and it points the wrong way.

**Proposed resolution.** Run what the package's `test` script runs: read the script and take the `vitest`
arguments from it, or run `pnpm test` with the reporter and list flags appended, and say which in §3.3. Make a
changed test file the runner does not list a finding (`never-run`) *unless* an entry in `ci/tests-can-fail.yaml`
names it or its folder as kept out, so the owner sees the exclusion in the pull request that makes it. Let the
yaml hold more than one `args:` per package, or say it cannot and what to do.

### AR-4 — The 10-minute stop fails correct pull requests; the budget rests on a different program

**Where:** F-13 Contract §7 (budget), §3.8 ("Every `body` change is tried, then up to 30 more"), §3.7 (a baseline
run per file), §3.2 (the install), §5 (`out-of-time`), Known limitations (last two bullets); D-037's measurement
table; Acceptance (the wall-time line).

D-037 timed a prototype at 186 s on an Apple M4 with 10 cores, one run, "a hosted CI runner was not measured".
The Contract differs from that prototype in four ways, each adding time: all `body` changes are tried before the
30 (the prototype capped at 30 changes per file in total), a baseline run per test file, an offline install of the
whole workspace into the copy, and the `listing` pass. A hosted runner is commonly two to four times slower than
that laptop. 186 s becomes well over 5 minutes before the added work, so the warning is the normal case and the
10-minute stop is a short step away, on a pull request whose tests are fine. At 10 minutes §7 and §5 mark every
test "not judged yet" and *fail*: "it is never a pass". The author of a correct pull request is told to run it
again, then to read "BOOTSTRAP.md, Tests can fail", whose only lever is `ci/tests-can-fail.yaml`, which takes tests
out of the judgment. A gate whose failure mode on a slow runner is to push people to exclude their tests is the
opposite of the thesis.

The acceptance has no number that can turn the build red: "records the wall time on a branch touching 10 source
files, read against D-037's budget" (see AR-8).

**Proposed resolution.** Decide before step 4, not after: either (a) time the prototype's loop with the Contract's
caps on a hosted runner (a draft pull request on a scratch repository is enough) and set the budget from that,
or (b) change `out-of-time` from a failure to a named, counted *not judged* with its own warning, and fail only
when a *new test that was reached* kills nothing. If the owner wants out-of-time to stay a failure, cap the work
that is unbounded (`body` changes per file) and run files in an order the record states, so the test that is
dropped is the one that has had the fewest tries. The 5- and 10-minute figures are D-037's; this finding is
that the evidence under them is another program's.

### AR-5 — The threat model promises what Known limitations take back

**Where:** F-13 Threat model ("a pull request cannot make the step pass by what it commits, short of a change the
owner is shown"); Known limitations ("A test can avoid being judged by how it imports"); Threat model ("Not
defended: a pull request whose tests, while they run, interfere with the run itself").

The first sentence is the only promise the section makes beyond the baseline. The limitation says a test whose
file imports its subject through an alias, a dynamic import, or a package outside the workspace is not judged,
and §4 makes that a warning that never changes the exit code. So a pull request passes by what it commits: it
changes `import { cart } from './cart'` to `await import('./cart')`. And the line three bullets down concedes that
a test running inside the job can rewrite the record: `node_modules/.cache/tests-can-fail/run.json` lies in the
project, and the verdict only checks `head`. "Not defended" for something `pnpm verify` also cannot defend does
not carry over: `verify` trusts tests to *pass*; this step exists because tests are not trusted to be able to
fail.

**Proposed resolution.** Restate the promise to what holds: "a pull request cannot pass by changing a file the
owner is not shown, *or* by a test the step names as not judged; those it names." Say the dynamic-import and
alias routes are accepted under D-037, with their trigger. For the record, write it from the job into a path the
copy's tests cannot reach (outside the project, or a name with a random suffix passed to the verdict on the same
command line); that costs a line in `check:mutation`.

### AR-6 — Red on every pull request without Vitest, and a copy and install for a pull request with no test change

**Where:** F-13 Contract §1 (the job runs "on pull requests only", every pull request), §3.2 (copy and install),
§3.3 ("No such package: exit 2"), §3.4 (changed test files, after the copy); Known limitations ("Vitest only").

Order of the steps in §3: the copy and the install (2), then "which packages" and the exit 2 (3), then which tests
changed (4). A dependency bump, a docs change or a pull request that changes no test therefore pays for a full
install into a temporary folder, and in a project whose tests use another runner is exit 2 "this step needs
Vitest" on every one of them. "A project is never green because the step had nothing to look at" is right for a
pull request that adds tests the step cannot see; it is wrong for one that adds none. The only way a project on
another runner clears the red job is to edit `ci.yml` (a gate it must not weaken, `process/slipway-rules.md`) or
to take on Vitest. The document says the stack is Vitest by default (D-005–D-008 not yet decided in `CLAUDE.md`).

**Proposed resolution.** Move §3.4's diff step first: no changed test file (by the pattern, in any language),
exit 0 and say "no tests were added or changed". Do the copy and the install only when there is something to
judge. Exit 2 "needs Vitest" only when a changed file looks like a test and no package uses Vitest, and say which
file. Decide what a project on another runner does (an `ci/exceptions.yaml` entry for the job, dated, is the
existing mechanism) and write it in BOOTSTRAP's "Tests can fail".

### AR-7 — The copy holds tracked files only; `before-verify.sh` writes untracked ones

**Where:** F-13 Contract §1 (the job runs `ci/before-verify.sh`), §3.2 (`git read-tree` and `checkout-index`),
§3.7 (a red baseline is exit 2), Known limitations (the last-but-one).

`ci.yml` says `ci/before-verify.sh` is where "what the project's tests need before verify (a database service, an
env var)" goes. The job runs it, in the project. The copy is made from git's index of `HEAD`, so anything that
script writes (generated client code, a seeded file, a `.env.test`) is not in the copy, and neither is anything
in `.gitignore`. The Known limitation treats "a local `.env`, generated code" as the owner's machine. In CI it is
the *sanctioned* path, and the remedy offered is `ci/tests-can-fail.yaml`, which removes those tests from the
judgment, so the projects with the most setup are the ones whose tests go unjudged.

**Proposed resolution.** Run `ci/before-verify.sh` (when it exists) inside the copy too, with the same
environment, or copy the working tree's ignored-but-built files with an explicit rule. State which, and add an
acceptance line with a project whose test needs a generated file. If neither is wanted, say in BOOTSTRAP that a
project with setup should expect a large `not judged` count.

### AR-8 — Four acceptance lines cannot fail

**Where:** F-13 Acceptance (the last five blocks, and the second).

- "the pull request that adds the run records the wall time on a branch touching 10 source files, **read against**
  D-037's budget": any number records. With AR-4 this is the only measurement of the step's cost on a runner.
- "the last build step's pull request records the result as a pass or as counts": a run that judged none of a
  real project's tests and named all of them *not judged* records "counts". D-037 chose "named, not failed" on a
  measurement that "failing them … fail[ed] ordinary pull requests"; this is the line that would show how often,
  and it has no pass mark (AR-13).
- "Given every message … When read without slipway's docs Then each names a file or a test of the project and the
  next action, and none needs 'MT1' to be understood (the expected.json `details` hold the wording)": nobody is
  named as the reader; the fixture text is compared with itself.
- "Then each returns the body, condition, operator and literal changes of §2, in that order of kind": an
  implementation that returns one `body` change and nothing else, or never the `false` of a condition, is in order.

**Proposed resolution.** Wall time: a pass mark ("under 300 s on the hosted runner, or an owner decision citing
the number"). Real project: "at least one test judged, and not judged under X% of the new tests, or a decision".
Messages: a mechanical check (the detail contains the test file, the test name and a verb from §5's list, and not
the string `MT1`), plus a reading by someone who did not write them. `mutants()`: the exact expected list
for a short fixture source, held as a file.

### AR-9 — "Tied to no runner version" is asserted, not shown

**Where:** F-13 Contract §3.4 (`vitest list --json --includeTaskLocation`), §3.8 (`--reporter=json`), §3.9
(`vitest related … --run --bail 1`); D-037 ("it reads the test runner through its command line only, so it is
tied to no runner version"); Acceptance (the stand-in runner).

The step reads two output formats of Vitest and three flags. D-037's own findings are that Stryker "gives a
wrong answer with the newest Vitest and exits 0" because of changes between majors. Neither document names the
Vitest versions the step was run with: the measured prototype is recorded against 4.1.11 and 5.0.3, but the
Contract says nothing about which it supports. Slipway's gate (`pnpm meta`) installs nothing, so no check there
touches the real format; the stand-in runner is written by the same author as the parser of its output. If a
Vitest release moves a field, every pull request in every project goes to exit 2 ("did not say where each test
is"), after the release rather than before it.

**Proposed resolution.** Say the range the step was written against, in the Contract and in BOOTSTRAP. Hold one
recorded real output of each command (from the scratch project) as a fixture the verdict side reads, so a
reader of the format is tested on the real format. Put the range in the exit 2 message ("this step was written for
Vitest 4 and 5; you have {v}"), so a drift is named.

### AR-10 — What counts as a new test breaks on parameterised tests, helpers and mechanical edits

**Where:** F-13 Contract §3.4 ("A test is *new* when a line the pull request added or changed falls between its
first line and the next test's first line"); Known limitations ("Lines after a test's last line … count as that
test's"); Acceptance (the rename block).

- `it.each([...])('adds %i', …)` and a loop that calls `it` give many tests with the same first line. The next
  test's first line is that same line, so the range is empty, and the rows are either all new or none. Not stated.
- A change to a `beforeEach`, a helper, an import or a `describe` line sits between two tests and is attributed to
  the one above it. An edit to a shared helper marks one arbitrary test new and leaves the ones it affects alone.
- "A test it adds *or edits*": a formatter run, a codemod or a rename of a fixture across a test file makes every
  test in it new, so a pull request that edits no behaviour is judged on old tests that never could fail, and is
  red for it. The only exit is an `ci/exceptions.yaml` entry per file.

**Proposed resolution.** State each case. For `each` and loops: judge the group once, by the first row, and say so.
For helper/hook lines: they mark nothing new. For mechanical edits: ignore whitespace (`git diff -w`) and say the
step judges tests whose *assertion lines* changed, or accept the cost and write it down in Known limitations.

### AR-11 — A flaky test is credited with a kill

**Where:** F-13 Contract §3.7 (the baseline: each file run "once, untouched"), §3.8 (a failing new test "has
failed once").

A test that fails one run in twenty (a timer, an ordering, a network stub) fails on some change by chance and is
credited as a kill, with a change that has nothing to do with it. The baseline runs once, so a flaky test is not
seen either way. UI tests under jsdom are the default app's tests.

**Proposed resolution.** Cheap and enough: when a test is credited, re-run the same file once more *without* the
change and require the test to pass; if it does not, it is `flaky` and not judged, named. With AR-1's rule a flake
that fails by assertion still gets here, so this is not covered by it.

### AR-12 — The survivors listing fires nothing, spends the budget, and its deferral has no detector

**Where:** F-13 Contract §3.9 (listing), the record's `survivors` and `survivorsNotTried`, §4 (warnings); Out of
scope (the first bullet); Problem (the options table: "surviving changes are listed"); `process/lessons/L-43`.

The rule D-037 picked fails on a test that cannot fail. The survivors are a second product: changes to the pull
request's own lines that no related test noticed, printed as warnings in a job log. A warning "never changes the
exit code" and, by the document's own Out of scope, goes to no comment on the pull request. Nothing reads it;
the thesis is that a rule exists "only where something fires". It also takes the leftover budget (so on a slow
runner it is what the 10-minute stop is racing, AR-4), adds a second way to run the tests (`vitest related`) to
get right, and two record fields. The deferral beside it, failing on a survivor, "comes back when a bug that reached
`main` is traced to a survivor the step had listed": nothing makes anyone look at the log, and L-43's rule is that
"deferred work is only real if something other than memory fires it" (here: a declined lesson, whose clock L1
reads). decision-defaults §10: machinery nobody needs.

**Proposed resolution.** Cut §3.9 and the two record fields from this ticket; file survivors as the follow-up it
already names, with a declined lesson (`status: declined`, `review-by`, `trigger`) so L1 holds the deferral. If the
owner wants the listing, put the count of survivors in the summary line only and say who is expected to act on it.

### AR-13 — The riskiest assumptions are measured last

**Where:** F-13 Build map (steps 1–5; the real-project run and the scratch run are in step 5); Acceptance (the
last block); D-037 ("The same measurement was run on a private product … its figures … are not recorded");
Known limitations ("What brings the stricter rule back: a project whose not-judged list stays near zero").

Three things decide whether this feature is worth its ~1,300 lines and a 481 KB vendored parser: how long it takes
on a hosted runner (AR-4), what fraction of a real project's new tests end up *not judged* (AR-2, AR-3, AR-6),
and whether the Vitest formats read as the Contract assumes (AR-9). All three are first measured in step 4 or 5,
after the parser, the mutator, the verdict and the runner exist. The figure that rejected "fail a test the step
found no code for" ("measured to fail ordinary pull requests for tests that were fine") is on a product whose
numbers are "not recorded", so the one decision the owner made on a figure cannot be re-checked, and
"near zero" has no baseline.

**Proposed resolution.** Add a step 0 before the parser: the prototype loop, as a script outside `ci/`, run once
on the scratch project and on a real project through a draft pull request on a hosted runner. Record, as counts
that name nothing (decision-defaults §9): seconds, tests new, tests judged, tests not judged by reason. Start
step 1 only on that. Record the real-project count in D-037, which also gives "near zero" a number.

### AR-14 — Outside `pnpm verify`, nothing in the agent's loop fires; the job drops "both triggers"

**Where:** F-13 Contract §1 ("Not in `pnpm verify`"; "on pull requests only"), Build map step 5; `ci.yml`'s
header ("Both triggers, always. CI on pull_request only means a direct push to the deploy branch runs none of it");
`process/slipway-rules.md` (Gates: "`pnpm verify` is the gate … work is not done until it is green"; the Stop
hook).

The cost argument for keeping it out of `verify` is sound. The consequence is that the gate every agent and
human is told to run no longer proves the tests can fail, and the Stop hook, which runs `verify:fast`, cannot see
it. The step then fires only on a pull request in CI; the agent finds out after it has opened one. Step 5 edits
`docs/testing-strategy.md` and `process/cold-review.md` to "point at the step", which is prose again, the state
L-04 is in now. And `if: github.event_name == 'pull_request'` is a deliberate break from the header comment of the
same file; the workflow checks may or may not accept it, and the document does not say it checked. A
direct push to `main` is untouched by this job.

**Proposed resolution.** Say where the agent runs it: add `pnpm check:mutation` to `/work-ticket`'s quality gate
step before the PR is marked ready (a skill file, so owner-only), and say in the document that a commit is needed
first (it judges the last commit, AR-16). Write the departure from "both triggers" as a one-line decision in
D-037 and check the workflow checks accept it by running `pnpm meta` with the job added, as the acceptance
already does.

### AR-15 — No `Version:` line, so a later review can never go stale

**Where:** F-13 front matter and `## Changes`; `.claude/skills/review-doc/SKILL.md` §3–4; R1.

The document carries `status: draft` and `prd-ref: D-037` and no `Version:` line, unlike
`dev/features/landing-page.md`. R1 needs a line of the document to quote. This review quotes the only
`## Changes` entry. That entry stays in the file when later entries are appended below it, so the review is never
reported as stale, whatever the owner changes in the Contract. The check cannot see the revision it is there for.

**Proposed resolution.** Add `Version: 0.1 (2026-10-08)` under the title, move it with every substantive change to
the Contract, and have the next review quote it. Then this review goes stale on the first revision, as it should,
and the fresh one names it in `Supersedes:`.

### AR-16 — Hygiene

**Where:** the IDs and passages named in each line.

- **Problem**: "Issue: #51, part of #312" and "#312 orders it before the next real milestone goes active". #51's
  body says `Part of: #379` (open); #312 is the earlier epic. One of the two lines is stale.
- **§5 and the time limit acceptance**: the message reads "({limit} minutes)" and the acceptance sets "a limit set
  to 5 seconds for the test". The record's `limit` has a unit the Contract never states, and the knob that lets
  a test shrink it appears nowhere in the Contract (an environment variable? an argument?). Name it, and say
  who can set it (decision-defaults §3).
- **Build map 3 and 4**: both add "the job" to `ci.yml`; step 3's job would call a verdict with no run behind
  it, and step 4's `check:mutation` script. Say the job is added once, in step 4, with W1's acceptance moved
  there.
- **§3.8**: the loop runs `vitest run <file> --reporter=json` without saying it carries the package's
  `args:` of §3.3.
- **§1**: a run that is interrupted leaves a full copy with `node_modules` in the temporary directory; a developer
  who presses Ctrl-C a few times has several. A sweep of `tests-can-fail-*` folders older than a day at the start
  of each run costs three lines.
- **Open questions: None** while Known limitations says the hosted-runner time and the real-project count are
  not known. Say they are open, with their trigger.

**Proposed resolution.** One edit pass over the lines above.
