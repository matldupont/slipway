---
prd-ref: D-037
status: draft
---

# F-13 — Tests can fail: a pull request's new tests must each fail on a change to the code

## Problem

**Job:** when a pull request adds tests, I want each new test shown to fail when the code it covers is
changed, so I can read a green suite as "this works" and not as "something ran".

Slipway proves its own checks can fail: every check has a known-bad fixture, and `pnpm meta` fails a check
that no longer goes red on it. A product's tests get prose only. `docs/testing-strategy.md` says "a test must
be able to fail", and the cold review asks the reviewer to revert the mechanism and run that one test (L-04,
enforcement status `prose`). Nothing fires. A test that cannot fail reads as coverage, and of the three
questions asked before anything ships, "does it work?" rests on the tests.

Evidence: L-04 was written from a real miss (a new test that could not fail read as coverage). Workaround
today: a reviewer changes the code by hand, when they remember. Frequency: every pull request that adds a
test, in every project. Why now: it is the one of the three questions with no check behind it, and #312
orders it before the next real milestone goes active.

Serves `SLIPWAY.md`'s thesis, a rule exists only where something fires. Decision: D-037. Issue: #51, part of
#312.

**Verdict: RESHAPE.** The problem is real; the ask's first line is not buildable. #51 asked for a mutation
score held by the existing ratchet on the files a pull request changes. `ci/ratchet.mjs` fails a number that
rises, a score is better when higher, and "the files this pull request changed" is a different set every
time, so one stored number compares unlike things. What proceeds: no stored number. A pull request fails when
a test it adds or edits never fails, whatever is changed in the code its test file imports (the owner's
picks, 2026-10-08, D-037).

| option | for | against | verdict |
|---|---|---|---|
| do nothing | no work, no CI minutes | the rule stays prose; L-04 already records it failing | rejected |
| the ask: a mutation score under the ratchet, per pull request | one number | cannot be built as written (above) | rejected: reshaped |
| a stored count of surviving changes per source file, down never up | keeps the ask's wording | every pull request that adds a source file edits `ci/baselines.json`, a file that needs the owner's yes; a file's count rises as code is added | rejected by the owner |
| new tests must fail once, and any surviving change on a changed line fails too | strictest | a comment in the code for every change that cannot be noticed (a log message, an equivalent rewrite) | deferred: Out of scope, with its trigger |
| **new tests must fail once; surviving changes are listed** | catches the test that cannot fail; old untested code never blocks work | a weak test that only fails when the code throws still passes | **chosen** |
| StrykerJS as the tool | maintained, more kinds of change, 60 s on the measured change | wrong and green with the newest Vitest today; two dev dependencies per project; a full analysis where one failure per test is needed | rejected (D-037) |
| run the new tests against the base version of the changed source | no new code, one test run | every test of a new file fails on the base because the import is missing, so it is blind where most new tests are | rejected (D-037) |

Design calls taken with the orchestrator session, not the owner (slipway process design within
`process/decision-defaults.md`): the step judges the tests the test runner itself lists and says by name what
it does not judge; a pull request that only adds tests is judged against the files those tests import; the
verdict is read from a record of the commit under review and refuses any other; a test left unjudged is
always named with a reason the step can state. Its first advice, that a new test with nothing to be judged
against fails, was changed after the measurement and put to the owner. Taken by this session under
decision-defaults §1, §4 and §10 and D-004: the run writes a record and a script with no dependencies gives
the verdict; the code is changed in a copy outside the project, never in the working tree; the step is its own pull-request job, outside `pnpm verify`; a test that cannot be judged for
good is excused in `ci/exceptions.yaml`, the registry that already holds dated exceptions.

## Contract

Verified against: 51b9c5e 2026-10-08 — `ci/ratchet.mjs` (fails a number above its baseline; one named number
per baseline; `ci/baselines.json` does not exist), `ci/verify.mjs` and `ci/checks/lib/tasks.mjs` (verify runs
`check`, `lint`, `test`, `build` in every package and nothing else), `.github/workflows/ci.yml` (two jobs,
`meta` and `verify`; `verify` is skipped on a repository marked as a template), `ci/checks/meta/` (`i1` and
`p1` live there and are run by their own workflows, not by `pnpm meta`; PC1 runs each check as
`node <check> <fixture folder>`, fails a case that passes, and lets a fixture set only `CHECK_TODAY`,
`CHECK_NOW` and `SLIPWAY_TEMPLATE_FIXTURE`), `ci/checks/meta/w1-declared-vs-invoked.mjs` (a root script a
pull-request workflow calls counts, followed up to 3 levels; a `node ci/checks/meta/<check>.mjs` line counts
for that check), `ci/checks/lib/report.mjs` (exit 0, 1, 2; warnings never change the exit code; project text
is escaped), `ci/checks/lib/manifest.mjs` (`trustedGit`), `ci/checks/lib/workspace.mjs` (`discoverWorkspace`),
`ci/checks/lib/vendor/` (one parser, `js-yaml.mjs`, its licence and a README table; its hash is pinned by
`scripts/workflow-yaml.test.mjs`), `ci/exceptions.yaml` and `ci/checks/lib/exceptions.mjs` (dated entries by
id; FO1 judges every entry whose id does not start `pnpm-lock.yaml#`), `ci/checks/lib/gate-files.mjs` (the
files the harness asks about), `docs/testing-strategy.md` and `process/cold-review.md` (the L-04 prose),
`.claude/skills/bootstrap/SKILL.md` (the default app: Vite, React, TypeScript, `vitest run`), `.gitignore`
(`node_modules/`).

The step has two parts. `ci/mutation.mjs` changes the code and runs the tests, and writes a record of what
happened. `ci/checks/meta/mt1-tests-can-fail.mjs` reads that record and gives the verdict. The verdict, the
list of changes a source text gets, and the parser all run on bare Node with nothing installed, so `pnpm meta`
proves them in slipway (D-004, D-037); only the call to a real test runner is proven in a project.

### 1. Where it runs

- A root script, `check:mutation`:
  `node ci/mutation.mjs && node ci/checks/meta/mt1-tests-can-fail.mjs node_modules/.cache/tests-can-fail`
- Its own job, `mutation`, in `.github/workflows/ci.yml`, on pull requests only
  (`if: github.event_name == 'pull_request' && !github.event.repository.is_template`), with `verify`'s steps up
  to and including the install and `ci/before-verify.sh`, then `pnpm check:mutation` with `BASE_SHA` and
  `HEAD_SHA` from the pull request, as `pr-body.yml` passes them. `permissions: contents: read`, no secrets,
  `timeout-minutes: 15`: the step stops itself at 10 (§7), and the job's limit is only the backstop.
- **Not in `pnpm verify`.** `VERIFY_TASKS` does not change, so `pnpm verify:fast` and the Stop hook cost what
  they cost today.
- Slipway itself has no app: the job is skipped there, as `verify` is.
- Locally, `pnpm check:mutation` does the same against the merge base with the default branch.
- **No file of the project is ever changed.** The code is changed in a copy of the commit, in a new folder
  under the system's temporary directory (§3.2), in CI and locally alike. So the step judges the last
  commit: uncommitted changes are not judged, and it says how many files that leaves out. An interrupted
  run leaves that one folder in the temporary directory, and nothing in the project: no changed file, no
  registered worktree, no folder a later `pnpm meta` could trip on (the #347 class).

### 2. The parser and the changes — `ci/checks/lib/vendor/`, `ci/checks/lib/mutants.mjs` (new)

- `ci/checks/lib/vendor/babel-parser.mjs` is one file of `@babel/parser`, byte-identical to the published
  file, with `babel-parser.LICENSE` beside it and a table in the vendor README as `js-yaml` has. Its sha256
  is pinned by `scripts/mutants.test.mjs`. The version is the newest published release at least 14 days old
  on the day it is added. The pin moves only to such a release, in a pull request that replaces the file
  whole, moves the hash and the table, and changes nothing else (D-033's terms, D-037).
- `ci/checks/lib/mutants.mjs` is the only file that imports it. `mutants(path, text)` returns the changes that
  text can get, each `{ start, end, replacement, kind, line }`, or `{ unreadable: reason }` when the parser
  cannot read it. It reads `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts`, `.cts`; any other file is
  `{ unreadable: 'not JavaScript or TypeScript' }`.

| kind | the change | tried |
|---|---|---|
| `body` | a function's or method's block body becomes `{}`; an arrow function's expression body becomes `undefined` | first |
| `condition` | the test of an `if` or of `a ? b : c` becomes `true`, then `false` | second |
| `operator` | `===`↔`!==`, `==`↔`!=`, `<`↔`<=`, `>`↔`>=`, `&&`↔`\|\|`, `+`↔`-`, `*`↔`/` | third |
| `literal` | `true`↔`false` | third |

Nothing is changed inside an import or export declaration, a type, or a string.

### 3. The run — `ci/mutation.mjs` (new)

Zero dependencies of its own; it starts the project's test runner.

1. **The change.** `BASE_SHA` and `HEAD_SHA`, or the merge base of `HEAD` with the default branch and `HEAD`.
   Added and changed lines per file come from `git diff -U0 -M base...head` through `trustedGit`.
2. **The copy.** The tree of `HEAD` is written out by git into `<tmp>/tests-can-fail-<random>/`
   (`git read-tree HEAD` into an index file of its own there, then `git checkout-index -a --prefix`), so
   nothing is registered in the project's `.git` and its index is not touched. Dependencies are installed
   there with `pnpm install --frozen-lockfile --offline`; a failed install is exit 2 with its last lines.
   Every run of the test runner below happens in the copy, and the folder is removed on every exit path the
   step controls. Measured 2026-10-08: 0.2 s to write the tree and 1.4 s to install on the scratch project
   of D-037.
3. **Which packages.** A workspace package (`discoverWorkspace`) is judged when `vitest` is among its
   dependencies. No such package: exit 2, "Nothing here can be checked: this step needs Vitest, and no
   package uses it." A project is never green because the step had nothing to look at (decision-defaults §4).
   The runner is started in the package's folder as `pnpm exec vitest`, with the arguments
   `ci/tests-can-fail.yaml` gives for that package when the file exists (`- package: <name>`,
   `args: --project unit`): how a project keeps tests that need a server or a browser out of the judged set.
   An argument holding anything but letters, digits and `. _ / = : -` is exit 2.
4. **Which tests are judged.** `vitest list --json --includeTaskLocation` under those arguments is the
   judged set, with each test's file, name and first line. A changed file that looks like a test
   (`*.test.*`, `*.spec.*`, under `__tests__/`) and is not on that list is **not judged**: `not-listed`. A
   listed test with no line is exit 2 ("the test runner did not say where each test is").
   A test is *new* when a line the pull request added or changed falls between its first line and the next
   test's first line in that file. A test the pull request did not touch is never judged.
5. **Its subjects**, the source files that may be changed for a test file:
   - each file it imports by relative path, and the file beside it with the same name (`cart.test.ts` →
     `cart.ts`), when that file is tracked, inside the repository and not itself a test;
   - for an import of a workspace package by its name, that package's source files this pull request
     changed, or, when it changed none, the package's entry file and the files that entry re-exports by
     relative path.
   A subject `mutants()` cannot read is dropped and named. A test file left with no subject has its new
   tests **not judged**, with the reason: `no-subject` (it imports no source the step follows),
   `could-not-be-parsed`, or `other-language`.
6. **Excused.** An unexpired entry in `ci/exceptions.yaml` with the id `tests-can-fail#<test file>` leaves
   that file's tests not judged, `excused`, with the entry's reason and date. This is for a test that checks
   something other than what code does (it reads source text, a list of migrations). An expired or undated
   entry excuses nothing and is reported. FO1 leaves ids with this prefix to this step, as it leaves
   `pnpm-lock.yaml#` to LK1.
7. **The baseline.** Each test file with new tests is run once in the copy, untouched. A new test that is
   red is exit 2: "`{file}` › "{test}" is red in a clean copy of this commit, before anything is changed. If
   it passes in your checkout, it needs a file git does not track." One that is skipped or `todo` is
   not judged: `skipped`.
8. **Judging, one test file at a time.** The changes its subjects can get are put in order: the pull
   request's own lines first, then by kind as in §2, taking turns across the subjects. Every `body` change
   is tried, then up to 30 more. For each: write the changed file in the copy, run that one test file
   there (`vitest run <file> --reporter=json`), put the file back.
   - A new test that fails has failed once: the change (`file`, `line`, `kind`) is recorded for it.
   - The test file no longer loads, or the run hangs past its limit: the change broke the file or hung it,
     and says nothing about a test. It is dropped and not counted.
   - The runner writes no result: exit 2 with its last lines.
   The file stops as soon as every new test in it has failed once. A test that cannot fail costs the whole
   list.
9. **Listing.** With the time left before the budget (§7), each change on the pull request's own source
   lines is tried against the tests related to that file (`vitest related <file> --run --bail 1`). One no
   test notices is a survivor, kept as `file`, `line`, `kind`. Changes not tried for lack of time are counted.
10. **The record**, `node_modules/.cache/tests-can-fail/run.json` at the project's root: the one file the step
   writes in the project, in a folder git already ignores, replaced on every run: `head`, `base`, `seconds`, `budget`, `limit`, `outOfTime`, `changedTestFiles`,
   `tests` (`{ package, file, name, line, subjects, tried, failedOn, state }`, `failedOn` null or the
   change, `state` `judged` or `out-of-time`), `notJudged` (`{ file, name, why, detail }`),
   `unreadable` (`{ file, reason }`), `survivors`, `survivorsNotTried`. It is written on every exit path
   that got as far as step 4, the time limit included.

### 4. The verdict — `ci/checks/meta/mt1-tests-can-fail.mjs` (new)

`node ci/checks/meta/mt1-tests-can-fail.mjs <folder>` reads `<folder>/run.json` and reports through
`ci/checks/lib/report.mjs`. Its fixtures are recorded runs under `ci/fixtures/known-bad/mt1/`; what it must
not report is held by `scripts/mt1.test.mjs` (PC1 fails a case that passes).

The commit under review is `HEAD`, read through `trustedGit`. A fixture has no commit of its own, so it pins
one with `CHECK_HEAD`, as `CHECK_TODAY` pins the date: PC1's list of names a fixture may set gains it.

| a test in the record | result |
|---|---|
| `judged`, `failedOn` set | passes |
| `judged`, `failedOn` null, `tried` at least 1 | **finding** `kills-nothing` |
| `out-of-time` | **finding** `out-of-time` |
| in `notJudged` | warning, by name, with its reason |

Also a finding: an entry `tests-can-fail#…` in `ci/exceptions.yaml` that is expired or undated
(`excuse-expired`). Warnings, which never change the exit code: each `unreadable` file; the survivors as
`file:line` grouped by file, the first 10 and a count, with the number not tried; `seconds` over `budget`.
The summary line gives the counts: new tests, passed, failed, not judged.

Exit 2, each with its own message (decision-defaults §4): `run.json` is missing, is not JSON, or lacks a
field; its `head` is not the commit under review; a `judged` test has `failedOn` null and `tried` 0 (a test
with nothing tried belongs in `notJudged`, so the record contradicts itself).

### 5. What a failure says (D-016)

Every line names the project's own thing and the next action, and reads without knowing a check id. Test
names and paths are a pull request's text and are printed through the report's escape.

- `kills-nothing`: `` `{file}` › "{test}" passes whatever the code does: {n} changes were made to the code
  its file imports ({subjects}), and it failed on none of them. Assert on what the code returns or does,
  then run `pnpm check:mutation`. ``
- `out-of-time`: `` The check that new tests can fail ran out of time ({limit} minutes) before it reached
  `{file}` › "{test}". It was not judged, so this is not a pass. Run `pnpm check:mutation` again; if it
  stops here every time, the pull request's tests are too slow for the step: see BOOTSTRAP.md, "Tests can
  fail". ``
- not judged: `` Not judged: `{file}` › "{test}" — {reason}. `` with the reasons: "it imports no source file
  this step follows"; "its subject `{file}` could not be parsed"; "its subject `{file}` is not JavaScript or
  TypeScript"; "it is not among the tests `vitest {args}` runs in {package}"; "it is skipped"; "excused until
  {date}: {reason}".
- survivors: `` {n} changes to the lines this pull request touches went unnoticed by every test:
  {file}:{lines} … They do not fail the pull request. ``
- another commit: `` This record is for commit {a}, not the one being checked ({b}). Run
  `pnpm check:mutation` again. ``

### 6. What a project holds

Nothing new is installed. A project may hold `ci/tests-can-fail.yaml` (§3.3), its own file: slipway ships
none, and `dev/ownership.yaml` gives the path the class `ci/before-verify.sh` has. It and `ci/exceptions.yaml`
are under `ci/`, so the harness asks before an agent edits either and a pull request that changes one says
so under `## Gate changes`. Taking a test out of the judged set is then a change the owner sees.

### 7. The budget (D-037)

5 minutes of wall time on a pull request touching 10 source files, on the project's CI runner. Judging runs
first. Listing (§3.9) uses only what is left of the 5 minutes. Past 5 minutes the verdict warns with both
numbers. At 10 minutes the run stops, marks every new test it has not finished `out-of-time`, writes the
record, and the verdict fails naming each: it is never a pass. Changing either number is an edit to D-037.

### What is reused

- `ci/checks/lib/report.mjs`, `trustedGit`, `discoverWorkspace`, `loadRegistry` and `expiryProblem`
  (`ci/checks/lib/exceptions.mjs`), `readList` (`ci/checks/lib/yaml-list.mjs`) for `ci/tests-can-fail.yaml`,
  and the `BASE_SHA`/`HEAD_SHA` pattern of `pr-body.yml`; PC1 and its fixture layout; W1's reading of root
  scripts; the vendor folder's README table and hash test.
- `i1` and `p1` as the precedent for a check under `ci/checks/meta/` that a workflow of its own runs.
- Searched and found nothing: no mutation code, no reader of a test run, no `check:*` root script in
  slipway today (`rg -i "mutation|mutant|stryker"`: prose in `docs/testing-strategy.md`, L-04 and L-01 only).

## Seams

A promise, and a cost. Every project that takes this slipway promises its contributors one more thing a pull
request must pass: a test it adds has to be able to fail. Who pays: the project's CI minutes, one more job
per pull request, at most 10 minutes. Who is told: the pull request's author, in the job's output, by test
name. No new person and no new channel. Slipway takes on a second third-party file to keep current.

## Threat model

The step runs a pull request's own tests and source in CI, as `pnpm verify` already does, under the same
`contents: read` token and with no secrets. Beyond the baseline it promises one thing: **a pull request
cannot make the step pass by what it commits, short of a change the owner is shown.**

- The record is not a committed file: it is written under `node_modules/`, which git ignores and N1 keeps
  untracked, and the verdict refuses one that is not for `HEAD`.
- A test left out of the judged set is named in every run, with its reason and a count. The two files that
  can take one out (`ci/tests-can-fail.yaml`, `ci/exceptions.yaml`) are files the harness asks about.
- A subject the parser cannot read, a test file that imports nothing the step follows: named, never silent.
- The step runs no shell: the runner is started with an argument list, a project's arguments are checked
  character by character, and paths come from git and are kept inside the repository.
- Test names, paths and the runner's messages are a pull request's text: printed only through the report's
  escape.
- The vendored parser is never edited, its hash is pinned by a test, and it only reads text handed to it.

Not defended: a pull request whose tests, while they run, interfere with the run itself (rewrite the record,
or a file in the copy), which holds for anything `pnpm verify` runs too; the owner's own machine
(decision-defaults §3); and a test written to pass this step and nothing else.

## Known limitations

- **A weak test passes.** A test that only fails when the code throws fails on some change and is not named.
  The step catches the test that cannot fail at all: a tautology, a subject mocked away, an error swallowed.
  Measured (D-037): of two planted tests, both were named; a third that asserted only on its own input was
  credited with a change that made the code throw.
- **A test can avoid being judged by how it imports.** A test whose file imports its subject in a way the
  step does not follow (a path alias, a dynamic import, a package outside the workspace) is listed as not
  judged, not failed. This is a class, not a bug: the owner chose it over failing tests that were fine
  (D-037). What brings the stricter rule back: a project whose not-judged list stays near zero can ask to
  fail on it, in a later ticket.
- **A test that reads files, not code, fails** when its file also imports source: the step cannot tell. It
  is excused in `ci/exceptions.yaml`, with a date.
- **Browser and server tests are not judged** unless the runner lists them and they import their subject.
  A project keeps them out with `ci/tests-can-fail.yaml`; they are then named `not-listed`.
- **Vitest only**, and only JavaScript and TypeScript source. A Svelte or Vue component is not changed.
- **A change that breaks the test file's loading, or hangs it, counts for nothing.** A test whose only effect
  on a change is one of those is named `kills-nothing`.
- **Lines after a test's last line** and before the next test count as that test's.
- **Fewer kinds of change than a mutation tool makes.** Enough for "can this test fail"; not a measure of how
  good the tests are, and the survivors listed are a lower bound.
- **The runtime was measured on a laptop, with a prototype** that used the TypeScript compiler API and tried
  at most 30 changes per test file. The first project to run the job records its runner's time; the budget in
  D-037 is revisited with that number.
- **A test that needs a file git does not track** (a local `.env`, generated code) is red in the copy. The
  step stops and names it; the project keeps such tests out with `ci/tests-can-fail.yaml`.
- **The copy costs an install.** Offline and from the store the job's own install just filled, but on a large
  workspace it is tens of seconds of the budget.

## Acceptance

```
Given ci/checks/lib/vendor/babel-parser.mjs
When  node scripts/mutants.test.mjs runs
Then  its sha256 equals the pinned one, and the test fails when one byte of the file changes
```

```
Given a TypeScript source, a TSX source, a plain JavaScript source and a JSX source, each with a function, an if, a comparison and a boolean
When  scripts/mutants.test.mjs calls mutants() on each
Then  each returns the body, condition, operator and literal changes of §2, in that order of kind, each applying to give a text the parser reads again
And   nothing is returned inside an import, a type annotation or a string
```

```
Given a file that is not valid JavaScript or TypeScript, and a .svelte file
When  mutants() reads each
Then  the first is { unreadable } with the parser's reason and the second { unreadable: 'not JavaScript or TypeScript' }
```

```
Given ci/fixtures/known-bad/mt1/findings: a record with a judged test whose failedOn is null after 14 changes, a test marked out-of-time, three tests in notJudged (no-subject, could-not-be-parsed, not-listed), two judged tests that failed once, 3 survivors, and an expired tests-can-fail# entry in its ci/exceptions.yaml
When  node ci/checks/meta/pc1-positive-control.mjs runs MT1 on it
Then  it exits 1 with exactly kills-nothing, out-of-time and excuse-expired, and the warnings for the three unjudged tests and the survivors
And   each detail holds the test's file, its name and the wording of §5
```

```
Given ci/fixtures/known-bad/mt1/ cases, one folder each: no run.json; a run.json that is not JSON; one whose head is not CHECK_HEAD; one with a judged test that has failedOn null and tried 0
When  PC1 runs MT1 on each
Then  each exits 2, and the message starts as §4 and §5 give it
```

```
Given a record where every new test failed once, with survivors, an unjudged test and seconds over the budget
When  node scripts/mt1.test.mjs runs MT1 on it
Then  it exits 0, its summary gives the counts, and it holds the three warnings
And   in a temporary git repository, a record whose head is that repository's HEAD is accepted and any other is exit 2
```

```
Given a temporary project with a stand-in test runner that fails a named test only when a given line of its subject is changed
When  node scripts/mutation.test.mjs runs ci/mutation.mjs on a commit that adds that test and one that never fails
Then  the record holds the first as judged with failedOn at that line, and the second as judged with failedOn null and tried at least 1
And   the stand-in runner, which records the project's `git status` and `git worktree list` on every call, saw no change and one worktree each time
```

```
Given the same project, and a commit that changes only a test file importing ./cart and a workspace package by name
When  ci/mutation.mjs lists the subjects
Then  they are cart's file, and that package's entry file with what it re-exports by relative path, and nothing else
```

```
Given a test file whose only subject cannot be parsed, one that imports nothing but the test runner, one with an unexpired tests-can-fail# entry, and one the stand-in runner does not list
When  ci/mutation.mjs runs
Then  the record's notJudged names each with could-not-be-parsed, no-subject, excused and not-listed, and none is in tests
```

```
Given a stand-in runner that takes 2 seconds a run and a limit set to 5 seconds for the test
When  ci/mutation.mjs runs on a commit with three new test files
Then  it stops within the limit, the record has outOfTime true and each unfinished test as out-of-time, and MT1 on that record exits 1 naming each, with "ran out of time" and "not a pass" in the detail
```

```
Given a tracked file with an uncommitted change; then a workspace where no package depends on vitest
When  ci/mutation.mjs runs on each
Then  the first judges the last commit and says one file's changes were not judged; the second exits 2 with the message of §3.3
```

```
Given a run killed (SIGKILL) while a changed file is in the copy
When  the project is looked at afterwards
Then  `git status` shows nothing the run made, `git worktree list` shows one worktree, and `pnpm meta` gives the result it gave before the run
```

```
Given a test file renamed with one line changed inside one test
When  ci/mutation.mjs lists the new tests
Then  only that test is listed
```

```
Given .github/workflows/ci.yml with the mutation job
When  pnpm meta runs
Then  W1 counts check:mutation and MT1 as run on pull requests, and pnpm meta exits 0
And   with the job removed, W1 fails naming MT1
```

```
Given a scratch project made by scripts/new-project.mjs with the default app, and a branch that adds a test asserting only on its own fixture
When  pnpm check:mutation runs there
Then  it exits 1 and names that test; with the assertion changed to read the code's result, it exits 0
And   the pull request that adds the run records the wall time on a branch touching 10 source files, read against D-037's budget
```

```
Given every message MT1 and ci/mutation.mjs print in the cases above
When  read without slipway's docs
Then  each names a file or a test of the project and the next action, and none needs "MT1" to be understood (the expected.json `details` hold the wording)
```

```
Given a real project built from slipway
When  the step is run once on one of its pull requests before it ships
Then  the last build step's pull request records the result as a pass or as counts, with no name, path, figure or content of that project
```

## Verify

```
pnpm meta
node ci/checks/meta/pc1-positive-control.mjs
node scripts/mutants.test.mjs
node scripts/mt1.test.mjs
node scripts/mutation.test.mjs
node ci/checks/meta/w1-declared-vs-invoked.mjs .
```

And in a scratch project made by `node scripts/new-project.mjs <dir> --no-github --no-harness` with the
default app: `pnpm check:mutation` on a branch with a test that cannot fail (exit 1, the test named), on the
same branch fixed (exit 0), and with an uncommitted change (it says so, and `git status` is the same before
and after). Paste each result line and the wall time.

## Build map

1. **The parser** — `ci/checks/lib/vendor/babel-parser.mjs`, its licence, the README table, and the hash pin
   in `scripts/mutants.test.mjs` (added to the `meta` script). A third-party file and nothing else, so it can
   be read alone. Checks, ~40 lines beside the file.
2. **The changes** — `ci/checks/lib/mutants.mjs` and the rest of `scripts/mutants.test.mjs`. Checks, ~250
   lines. Blocked by 1.
3. **The verdict** — `ci/checks/meta/mt1-tests-can-fail.mjs`, `ci/fixtures/known-bad/mt1/**`,
   `scripts/mt1.test.mjs`, `CHECK_HEAD` in PC1's list, FO1 leaving `tests-can-fail#` ids alone, and the
   `mutation` job in `ci.yml` calling the check (W1 fails a check no workflow runs). Checks and CI, ~400
   lines with fixtures. Independent of 1 and 2.
4. **The run** — `ci/mutation.mjs`, `scripts/mutation.test.mjs` with its stand-in runner, the `check:mutation`
   root script, the job calling it, the `ci/tests-can-fail.yaml` row in `dev/ownership.yaml`. Checks and CI,
   ~450 lines. Blocked by 2 and 3.
5. **What a project is told** — `BOOTSTRAP.md` "Tests can fail" and the `/bootstrap` step that runs it once;
   `docs/testing-strategy.md` and `process/cold-review.md` point at the step where they say "revert the
   mechanism"; L-04's enforcement becomes the check; the scratch-project run and the run on a real project.
   Skills and docs, ~150 lines. Blocked by 4.

The five land before the next version tag: a project takes a tagged release, so none sees the job without
the run behind it. Every step touches files that need the owner's yes (`ci/**`, the workflow, package
scripts, skills) and says so under `## Gate changes`.

## Out of scope

- **A surviving change on a changed line fails the pull request.** Deferred. It comes back when a bug that
  reached `main` is traced to a survivor the step had listed, or when a project asks for it; it then needs a
  way to mark a change that cannot be noticed, with a reason.
- **Failing a test the step could find no code for.** The owner's pick; see Known limitations for what
  brings it back.
- **Whole-codebase runs**, and any stored baseline or score.
- **Test runners other than Vitest; Svelte, Vue and other languages' source.**
- **Following path aliases; running changes side by side to save time; a comment on the pull request listing
  survivors.** Each is a follow-up when a project needs it.

## Open questions

None.

## Changes

- 2026-10-08 · ADDED · the spec, from #51 · this PR
