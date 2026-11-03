---
prd-ref: D-037
status: draft
---

# F-13 — Tests can fail: a pull request's new tests must each fail on a change to the code

Version: 0.5 (2026-11-02)

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
test, in every project. Why now: it is the one of the three questions with no check behind it, and #379
orders it before the next real milestone goes active.

Serves `SLIPWAY.md`'s thesis, a rule exists only where something fires. Decision: D-037, amended 2026-11-02.
Issue: #51, part of #379; revised by #439.

**Verdict: RESHAPE.** The problem is real; the ask's first line is not buildable. #51 asked for a mutation
score held by the existing ratchet on the files a pull request changes. `ci/ratchet.mjs` fails a number that
rises, a score is better when higher, and "the files this pull request changed" is a different set every
time, so one stored number compares unlike things. What proceeds: no stored number. A pull request fails when
a test it adds or edits never fails, whatever is changed in the code its test file imports (the owner's
picks, 2026-10-08 and 2026-10-12, D-037).

| option | for | against | verdict |
|---|---|---|---|
| do nothing | no work, no CI minutes | the rule stays prose; L-04 already records it failing | rejected |
| the ask: a mutation score under the ratchet, per pull request | one number | cannot be built as written (above) | rejected: reshaped |
| a stored count of surviving changes per source file, down never up | keeps the ask's wording | every pull request that adds a source file edits `ci/baselines.json`, a file that needs the owner's yes; a file's count rises as code is added | rejected by the owner |
| new tests must fail once, and any surviving change on a changed line fails too | strictest | a comment in the code for every change that cannot be noticed (a log message, an equivalent rewrite) | deferred: Out of scope, with its trigger |
| new tests must fail once; surviving changes are listed | catches the test that cannot fail; old untested code never blocks work | nothing reads a list of warnings, and listing spends the time the step's limit is racing | chosen 2026-10-08; the listing withdrawn 2026-10-12 (L-69) |
| **new tests must fail once, by something other than a plain crash** | also catches the test that calls the code and asserts nothing | a test with no assertion still passes when the code's own error is what fails it | **chosen** |
| only an assertion failure counts | one line to state | measured to fail tests that were fine: on the scratch project, 2 of 38 that assert on an element a change removes, so the query throws first | rejected by the owner (D-037, measured 2026-10-12) |
| StrykerJS as the tool | maintained, more kinds of change, 60 s on the measured change | wrong and green with the newest Vitest today; two dev dependencies per project; a full analysis where one failure per test is needed | rejected (D-037) |
| run the new tests against the base version of the changed source | no new code, one test run | every test of a new file fails on the base because the import is missing, so it is blind where most new tests are | rejected (D-037) |

Design calls taken with the orchestrator session, not the owner (slipway process design within
`process/decision-defaults.md`): a pull request that only adds tests is judged against the files those tests
import; the verdict refuses a record that is not for the commit under review; a test left unjudged is always
named with a reason the step can state. Its first advice, that a new test with nothing to be judged against
fails, was changed after the measurement and put to the owner. Taken by this session under decision-defaults
§1, §4 and §10 and D-004: a script with no dependencies gives the verdict; the code is changed in a copy
outside the project, never in the working tree; the step runs outside `pnpm verify`; a
test that cannot be judged for good is excused in `ci/exceptions.yaml`, the registry that already holds dated
exceptions.

Changed on 2026-10-12, answering the review of the draft
(`docs/reviews/2026-10-09-tests-can-fail-unversioned.md`). The owner's picks, recorded in D-037: what counts
as failing; a test file nothing runs fails; the judged tests are what the package's `test` script runs, not
what a bare runner lists; out of time stays a failure and is timed on a hosted runner before the build; a pull
request that changes no test passes; the listing is withdrawn. Taken by this session under decision-defaults
§3, §4 and §5: the record never leaves the process that made it; a new test that fails with nothing changed
is a finding, not a test left unjudged; a mechanical edit to a test still makes it new.

Changed on 2026-10-13, answering the review of 0.2 (`docs/reviews/2026-10-12-tests-can-fail-0.2.md`) under the
owner's cap of the same day: 0.3 changes what nine findings need and nothing else, and the others are carried
into the build as a line under the Build map step that touches each. The owner's picks, recorded in D-037:
lines removed from a test edit it; a pull request whose new tests are all unjudged fails; a mechanical change
across many test files takes one dated line that counts only in the pull request that adds it, which replaces
this session's call of 2026-10-12 that such a pull request stays red; a test's support files are left out of
its subjects by a closed list of names; step 0's stop line. Taken with the orchestrator session: the job
checks out the pull request's head commit, so one commit is diffed, copied and held to; `never-run` is for a
file a runner could list; a deleted test file and a change outside every test are counted and are not
findings; the run is built before the verdict, so the job is added once with the run behind it.

Changed on 2026-11-02, after Build map step 0 crossed its stop line (#439). Step 0 timed the scratch change at
84 s on a hosted runner, and a real project left more than a third of its new tests not judged. The owner's
pick of 2026-10-14, recorded in D-037: no `mutation` job in CI, because a job on every pull request that
changes a test spends the project's Actions minutes each time. `/work-ticket` runs the step on the machine
building the pull request, before it is marked ready, and copies its result into the pull request. The cost
taken: the rule fires only where `/work-ticket` runs. 0.4 removes the job and the hosted-runner budget, sets
the figures from a re-run on the building machine (D-037, amended 2026-11-02), says the step stops every
process it starts, and re-splits the Build map. Taken by this session under decision-defaults §1: MT1's
fixture form runs in the `meta` script on a green record, so W1 holds with no job.

## Fit

Nothing here is built yet: each line says what the spec plans to reuse, checked against the tree, not what a
build was found to use.

Reuses:
- Planned: will report through `report()` in `ci/checks/lib/report.mjs`, with PC1's `expected.json` layout
  (`ci/checks/meta/pc1-positive-control.mjs`) for the known-bad cases under `ci/fixtures/known-bad/mt1/`.
- Planned: will read git through `trustedGit` in `ci/checks/lib/manifest.mjs`, and a workspace's packages
  through `discoverWorkspace()` in `ci/checks/lib/workspace.mjs`.
- Planned: will read dated excuses with `loadRegistry()` and `expiryProblem()` in `ci/checks/lib/exceptions.mjs`
  from `ci/exceptions.yaml`, and `ci/tests-can-fail.yaml` with `readList()` in strict mode
  (`ci/checks/lib/yaml-list.mjs`).
- Planned: will run its fixture form in the `meta` script on a green record, as `s1-status.mjs` runs on
  `ci/fixtures/status`, so W1 finds it run with no job of its own.
- Planned: will read a package's root scripts as W1 does (`ci/checks/meta/w1-declared-vs-invoked.mjs`).
- Planned: the vendored parser goes in `ci/checks/lib/vendor/`, recorded in its `README.md` table and held by a
  hash test, `scripts/mutants.test.mjs`, as `scripts/workflow-yaml.test.mjs` holds `js-yaml.mjs`.

Numbers:
- How many changes were made to the code a test's file imports, and whether the test failed on one, will be
  counted once, by the run (`ci/mutation.mjs`, §3), into its record; the verdict reads them and adds nothing.
- The summary's counts (new tests, passed, failed, not judged, and the lines under it) will be calculated once,
  by the verdict (`ci/checks/meta/mt1-tests-can-fail.mjs`, §4), from that record.
- The time spent, against the budget and the limit, will be measured once, by the run, and written to the
  record as `seconds` beside `budget`; the verdict compares them.

New: the run (`ci/mutation.mjs`), the change list (`ci/checks/lib/mutants.mjs` with its vendored parser), the
reader of the runner's output (`ci/checks/lib/runner-output.mjs`) and the verdict MT1. Searched with
`rg -i "mutation|mutant|stryker"` and for a reader of a test run or of a `test` script's words: under `ci/` and
`scripts/`, nothing; the one code hit is step 0's probe, `dev/probes/tests-can-fail/measure.mjs` (#433), which
builds changes and reads Vitest's output to measure, and is not shipped. So each is new.

## Contract

Verified against: 66a455b 2026-11-02 — `ci/ratchet.mjs` (fails a number above its baseline; one named number
per baseline; `ci/baselines.json` holds `feature-fit` and `prose`, nothing per file), `ci/verify.mjs` and
`ci/checks/lib/tasks.mjs` (verify runs `check`, `lint`, `test`, `build` in every package, prints a count of
skipped-test markers, and runs nothing else), `.github/workflows/ci.yml` (`verify` runs `ci/before-verify.sh`
after the install when the file exists), the `meta` script in `package.json` (it runs
`node ci/checks/meta/s1-status.mjs ci/fixtures/status`, a check on a fixture of its own),
`ci/checks/meta/` (PC1 runs each check as `node <check> <fixture folder>`, fails a case that passes, and lets a
fixture set only `CHECK_TODAY`, `CHECK_NOW` and `SLIPWAY_TEMPLATE_FIXTURE`),
`ci/checks/meta/w1-declared-vs-invoked.mjs` (two clauses: every gated script, a name matching `GATED` in
`ci/checks/lib/tasks.mjs`, `^(check|lint|test|build|typecheck)(:[\w:-]+)?$`, and every check under
`ci/checks/meta/`, must be run by a workflow that runs on a pull request or a push; a root script such a
workflow calls counts, followed up to 3 levels; a `node ci/checks/meta/<check>.mjs` line counts for that
check; `check:prose` is run by `ci.yml` for the first clause), `ci/checks/lib/report.mjs` (exit 0, 1, 2;
warnings never change the exit code; project text is escaped), `ci/checks/lib/manifest.mjs` (`trustedGit`),
`ci/checks/lib/workspace.mjs` (`discoverWorkspace`), `ci/checks/lib/vendor/` (one parser, `js-yaml.mjs`, its
licence and a README table; its hash is pinned by `scripts/workflow-yaml.test.mjs`), `ci/exceptions.yaml` and
`ci/checks/lib/exceptions.mjs` (dated entries by id; FO1 judges every entry whose id does not start
`pnpm-lock.yaml#`), `ci/checks/lib/yaml-list.mjs` (`readList`: one list of flat mappings, the first key opens
an item; strict mode throws on a key it was not given), `ci/checks/lib/gate-files.mjs` (the files the harness
asks about), `dev/ownership.yaml` (`ci/before-verify.sh` and `ci/exceptions.yaml` are `seeded`), `docs/testing-strategy.md`
and `process/cold-review.md` (the L-04 prose), `.claude/skills/bootstrap/SKILL.md` (the default app: Vite,
React, TypeScript, a `test` script of `vitest run`), `.gitignore` (`node_modules/`).

The step has two parts. `ci/mutation.mjs` changes the code and runs the tests, and returns a record of what
happened. `ci/checks/meta/mt1-tests-can-fail.mjs` reads that record and gives the verdict. The verdict, the
list of changes a source text gets, the parser, the reader of a `test` script and the reader of the test
runner's output all run on bare Node with nothing installed, so `pnpm meta` proves them in slipway (D-004,
D-037); only the call to a real test runner is proven in a project.

**The test runner.** Vitest 4 and 5: the step was measured on 4.1.11 and 5.0.3 (D-037). It reads three things
the runner prints: the listing of `vitest list --json --includeTaskLocation`, the result of
`--reporter=json`, and in a failed test's `failureMessages` the error's name and the first line of its stack.
Nothing else ties it to a version, and §8 says how each of the three is held.

### 1. Where it runs

- A root script, `tests-can-fail`: `node ci/checks/meta/mt1-tests-can-fail.mjs --run`. Its name is outside
  W1's gated pattern (`check`, `lint`, `test`, `build`, `typecheck` and their `:sub` forms), on purpose: W1
  fails a gated script no workflow runs, and this one is run by `/work-ticket`, not by a workflow (AR-1 of
  the 0.4 review). With `--run` the
  verdict imports `ci/mutation.mjs`, runs it, and judges the record it returns, in the same process. The
  record is never a file and never crosses a pipe (Threat model).
- **`/work-ticket` runs it, on the machine building the pull request** (D-037, amended 2026-10-14). At its
  quality gate, after the work is committed and before the pull request is marked ready, `/work-ticket` runs
  `pnpm tests-can-fail` beside `Quality gate`. Exit 1 or 2 is a red gate: the pull request is not marked
  ready, and the run is fixed and run again as any red gate is. Its result goes into the pull request's
  `## Verification`: the summary line, each count line that is not zero, and each test named not judged.
  A pull request that adds or changes no test copies the one line "No tests were added or changed."
- **No CI job.** No workflow runs `tests-can-fail`, and a project's Actions minutes are never spent on it.
  The rule fires where `/work-ticket` runs, and nowhere else (Known limitations).
- **Not in `pnpm verify`.** `VERIFY_TASKS` does not change, so `pnpm verify:fast` and the Stop hook cost what
  they cost today.
- **MT1's fixture form runs in `pnpm meta`.** W1 fails a check under `ci/checks/meta/` that no workflow runs.
  The `meta` script runs `node ci/checks/meta/mt1-tests-can-fail.mjs ci/fixtures/mt1-green`, a record of a run
  that passes, as it runs `s1-status.mjs` on `ci/fixtures/status`; PC1 runs the known-bad ones. Neither starts
  a test runner, so `pnpm meta` costs what it did.
- Slipway itself has no app: run there, the step has no package with Vitest, and a pull request that changes
  a `scripts/*.test.mjs` is a changed test file no package runs. `/work-ticket` in slipway does not run it
  (build step 5).
- **No file of the project is ever changed, and none is written.** The code is changed in a copy of the
  commit, in a new folder under the system's temporary directory (§3.4). So the step judges the last commit:
  uncommitted changes are not judged, and it says how many files that leaves out. An interrupted run leaves
  that one folder in the temporary directory, and nothing in the project: no changed file, no registered
  worktree, no folder a later `pnpm meta` could trip on (the #347 class). Each run first removes any
  `tests-can-fail-*` folder there that is more than a day old.
- **It leaves nothing running** (#439). Step 0's measurement left two test-runner processes at about 80% of a
  core for days after the session ended: a runner killed at its time limit leaves its workers behind. Each
  call the step makes (the install, `ci/before-verify.sh`, every runner call) starts in a process group of its
  own. The group of the install and of each runner call is killed when that call ends, at its time limit, or
  on an error. The group of `ci/before-verify.sh` is kept until the run ends, since a service it starts is
  what the tests need (`dev/ownership.yaml` gives the file that use). Every group still alive is killed when
  the run ends: on its last line, on exit 2, at the limit of §7, and on SIGINT, SIGTERM and SIGHUP to the
  step. Before the record is returned, no process whose
  command line names the copy's folder is alive (`pgrep -f <folder>` finds none); one that is, after the
  groups are killed, is killed and the run is exit 2: "{n} processes this check started were still running
  and were stopped. Run `pnpm tests-can-fail` again; if it says this again, a test starts a process that
  leaves its group." A SIGKILL to the step itself cannot be caught: it can leave the folder and its
  processes, and the next run's clean-up removes the folder (Known limitations).

### 2. The parser and what it gives — `ci/checks/lib/vendor/`, `ci/checks/lib/mutants.mjs` (new)

- `ci/checks/lib/vendor/babel-parser.mjs` is one file of `@babel/parser`, byte-identical to the published
  file, with `babel-parser.LICENSE` beside it and a table in the vendor README as `js-yaml` has. Its sha256
  is pinned by `scripts/mutants.test.mjs`. The version is the newest published release at least 14 days old
  on the day it is added. The pin moves only to such a release, in a pull request that replaces the file
  whole, moves the hash and the table, and changes nothing else (D-033's terms, D-037).
- `ci/checks/lib/mutants.mjs` is the only file that imports it. It reads `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`,
  `.tsx`, `.mts`, `.cts`; any other file is `{ unreadable: 'not JavaScript or TypeScript' }`.
- `mutants(path, text)` returns the changes that text can get, each `{ start, end, replacement, kind, line }`,
  or `{ unreadable: reason }` when the parser cannot read it.
- `spans(path, text)` returns, for a test file, the first and last line of each test call (`it`, `test`, and
  their `.each`, `.only`, `.skip`, `.todo`, `.concurrent` forms) and of each `expect(...)` call (the call
  itself, from `expect` to the parenthesis that closes its argument; not the matcher after it), or
  `{ unreadable: reason }`. §3.5 and §3.9 use them.
- `reExports(path, text)` returns the relative paths a file re-exports from (`export * from`,
  `export { a } from`), for §3.6.

| kind | the change | tried |
|---|---|---|
| `body` | a function's or method's block body becomes `{}`; an arrow function's expression body becomes `undefined` | first |
| `condition` | the test of an `if` or of `a ? b : c` becomes `true`, then `false` | second |
| `operator` | `===`↔`!==`, `==`↔`!=`, `<`↔`<=`, `>`↔`>=`, `&&`↔`\|\|`, `+`↔`-`, `*`↔`/` | third |
| `literal` | `true`↔`false` | third |

Nothing is changed inside an import, a re-export (`export … from`), a type, or a string. An exported function
or constant is changed like any other: the code a test imports is the exported code.

### 3. The run — `ci/mutation.mjs` (new)

Zero dependencies of its own; it starts the project's test runner. It exports the function the verdict
calls. Run as a script (`node ci/mutation.mjs`) it prints the record as JSON and what it is doing on stderr,
which is how `scripts/mutation.test.mjs` reads it. Its one argument is `--limit-seconds <n>` (§7).

1. **The change.** From the merge base of `HEAD` with the default branch (`origin/<default>`, fetched by
   `/work-ticket` before it runs the step) to `HEAD`. One commit is diffed, copied and held to: `HEAD`.
   Added and changed lines per file come from `git diff -U0 -M -w base...head` through `trustedGit`, so a
   line whose only change is whitespace is not a changed line. The same diff gives the place of each hunk
   that only removes lines (`@@ -12,2 +11,0 @@` sits after line 11 of the new file), which §3.5 uses.
2. **Which test files changed.** A changed file that looks like a test (`*.test.*`, `*.spec.*`, under
   `__tests__/`), in any language. A file under `__snapshots__/`, or whose name ends `.snap`, is never one:
   the runner writes it. A test file the pull request deletes, or renames to a name outside the pattern, is
   not a changed test file either: the record counts them, for the summary's "{n} test files were removed or
   renamed away" (§4). **None: the run ends here**, the record says so, and the verdict passes
   with "No tests were added or changed." Nothing is copied and nothing is installed.
3. **How each package's tests are run.** A workspace package (`discoverWorkspace`) is judged when `vitest` is
   among its dependencies. Its runner call is read from its `test` script by `runnerCall()`
   (`ci/checks/lib/runner-call.mjs`, new), so the step judges what CI runs. Two forms are read, and no other:

   | the `test` script | read as |
   |---|---|
   | `vitest [run] [arguments]` | the runner, with those arguments |
   | `node [flags] <a path ending in vitest.mjs> [run] [arguments]` | `node` with those flags, that path, and those arguments |

   The second is what a package writes when its tests need something from `node` itself, an environment
   file for one: `node --env-file-if-exists=<path> node_modules/vitest/vitest.mjs run`. The flags are kept
   as written, and a relative path in one is resolved in the package's folder of the copy.

   The script is split on spaces and nothing more. A word holding anything but letters, digits and
   `. _ / = : @ -` (a quote, `&&`, `|`, `;`, `$`, `>`), a first word that is neither `vitest` nor `node`, or
   a `node` call whose path does not end in `vitest.mjs`, is not read: exit 2, "`{package}`'s `test` script
   is not a plain call to the test runner, so this step cannot tell which tests it runs: `{script}`. Write
   the call in `ci/tests-can-fail.yaml`: `- package: {package}` and `run: vitest run …` or
   `run: node … node_modules/vitest/vitest.mjs run …`." This is not a shell parser and does not become one:
   a script it cannot read is the project's to state. The `run` word, `--watch`, `--reporter` and
   `--outputFile` are dropped from what is read, since the step gives its own.

   `ci/tests-can-fail.yaml`, when it exists (§6), is one list read by `readList` in strict mode:

   ```yaml
   entries:
     - package: api
       run: node --env-file-if-exists=.env.test node_modules/vitest/vitest.mjs run
     - package: api
       run: vitest run --project integration
     - package: web
       keep-out: e2e/
       reason: browser tests; test:e2e runs them
   ```

   A `run:` is held to the same two forms and the same characters. A package with one or more `run:` entries
   is run by those and its `test` script is not read: this is how a package with a `test` and a
   `test:integration` script has both judged. A `keep-out:` names a file or a folder of that package, with a
   `reason:`. An entry with both or neither, an unknown package, or a key not named here is exit 2.

   A changed test file in a package that does not depend on `vitest` is **not judged**: `other-runner`.
   When no package depends on it, exit 2: "`{file}` was added or changed, and no package here uses Vitest,
   the only test runner this step can judge." An unexpired entry `tests-can-fail#other-runner` in
   `ci/exceptions.yaml` turns that exit into the same warning, by name, for a project on another runner: a
   dated exception its owner is asked about.
4. **The copy.** The tree of `HEAD` is written out by git into `<tmp>/tests-can-fail-<random>/`
   (`git read-tree HEAD` into an index file of its own there, then `git checkout-index -a --prefix`), so
   nothing is registered in the project's `.git` and its index is not touched. Dependencies are installed
   there with `pnpm install --frozen-lockfile --offline`; a failed install is exit 2 with its last lines.
   Then `ci/before-verify.sh` is run in the copy, when the commit has one, with the step's environment and
   `GITHUB_ENV` set to a file in the temporary folder; each `NAME=value` line it appends there is added to
   the environment of every runner call. A script that fails is exit 2 with its last lines. So what a
   project's tests need that git does not track (generated code, an environment file, a seeded file) is in
   the copy by the same script that puts it there for `verify`. Every run of the test runner below happens
   in the copy, and the folder is removed on every exit path the step controls, after every process the step
   started is stopped (§1). Measured 2026-10-08: 0.2 s to write the tree and 1.4 s to install on the scratch
   project of D-037.
5. **Which tests are judged.** For each runner call, `list --json --includeTaskLocation` gives the tests it
   runs, each with its file, name and first line; a listed test with no line is exit 2 ("the test runner did
   not say where each test is": §8). A changed test file no call lists, whose name is `*.test.<ext>` or
   `*.spec.<ext>` with one of §2's eight extensions, is a **finding**, `never-run`, unless
   a `keep-out:` entry names it or a folder above it, in which case it is **not judged**: `kept-out`, with
   the entry's reason. Any other changed test file no call lists is not a test (a helper or a data file
   under `__tests__/`, a `*.test.*` file in another language in a package that uses Vitest): it is no
   finding, and the record names it for the summary's "{n} changed files under a test name or folder are not
   tests".

   A test is *new* when a changed line falls inside its own call, from `spans()`, or when lines were removed
   from inside it: a hunk that only removes lines marks the test whose call holds both the line the hunk
   sits after and the line below it (D-037: removed lines edit a test as changed lines do). A test removed
   whole lies inside no call, and marks none. So a changed import, hook,
   helper or `describe` line marks no test new, and neither does a line between two tests; a test file with
   such a change is named in the record, for the summary's "{n} test files changed outside any test" (Known
   limitations). Tests the runner
   lists on one line (`it.each`, a loop that calls `it`) are one group: new when a changed line falls inside
   that call, judged once by the first one listed, and named by the call's line. A test file `spans()`
   cannot read has every test in it treated as new. A test the pull request did not touch is never judged.
6. **Its subjects**, the source files that may be changed for a test file:
   - each file it imports by relative path, and the file beside it with the same name (`cart.test.ts` →
     `cart.ts`), when that file is tracked, inside the repository and not itself a test;
   - for an import of a workspace package by its name, that package's source files this pull request
     changed, or, when it changed none, the package's entry file;
   - and from each of those, the files it re-exports by relative path (`reExports()`), followed 3 levels
     deep, the depth W1 follows a root script. A test that imports `./utils`, where `utils/index.ts` only
     re-exports, has the files behind it as subjects.

   **Test support is not a subject** (D-037). A file under a folder named `__tests__`, `__mocks__`,
   `__fixtures__`, `test`, `tests`, `fixtures` or `mocks`, or whose name up to its first dot is `test-utils`,
   `factories` or `setup`, is code written for the tests: a test that fails when it is changed has shown
   nothing about the product. It is dropped from the subjects and named, for the summary's "{n} test support
   files were left out of the code under test". The list is closed: it changes by an edit to this Contract
   and no other way.

   A subject `mutants()` cannot read is dropped and named. So is one that reads and has no change to make
   (a file of types, of constants, of re-exports past the third level). A test file left with no subject
   has its new tests **not judged**, with the reason: `no-subject` (it imports no source the step follows),
   `support-only` (every source file it imports is test support),
   `could-not-be-parsed`, `other-language`, or `no-change-to-make` (its subjects were read and hold nothing
   this step changes), each naming the file.
7. **Excused.** An unexpired entry in `ci/exceptions.yaml` with the id `tests-can-fail#<test file>` leaves
   that file's tests not judged, `excused`, with the entry's reason and date. This is for a test that checks
   something other than what code does (it reads source text, a list of migrations), and it is the second
   way out the `only-crashes` message names (§5). An expired or undated entry excuses nothing and is
   reported. FO1 leaves ids with this prefix to this step, as it leaves `pnpm-lock.yaml#` to LK1.

   **A mechanical change** (D-037). A pull request that reformats or renames across many test files, and
   changes nothing they check, takes one entry: `tests-can-fail#mechanical`, with a reason and a date. It
   counts only in the pull request that adds it: when this pull request's diff adds the line holding that
   id to `ci/exceptions.yaml`, and the entry is unexpired, every new test of the pull request is **not
   judged**, `mechanical`, with the entry's reason and date, and steps 8 and 9 do not run. Step 5 has run,
   so each test is named as the runner lists it and a `never-run` file is still a finding. In any other
   pull request the entry excuses nothing, and the verdict warns that it is spent (§5) until it is removed
   or its date makes it `excuse-expired`.
8. **The baseline.** Each test file with new tests is run once in the copy, untouched. When a new test is
   red, the same test files are run once more, in the same order, still untouched (D-037, amended
   2026-11-02). Red both times is exit 2: "`{file}` › "{test}" is red in a clean copy of this commit, before
   anything is changed. If it passes in your checkout, it needs a file that git does not track and
   `ci/before-verify.sh` does not make, or a service that script starts and that did not come up." Red, then
   green, is **not judged**: `flaky`. Its runs under the
   changes of step 9 are not made, so it is neither a test that can fail nor a pass, and the run goes on
   with the others. One that is skipped or `todo` is not judged: `skipped`. A test red once in the copy and
   green on its next run was seen on a real project.
9. **Judging, one test file at a time**, the file with the fewest changes to try first; the record keeps
   the order, so at the stop of §7 the tests not reached are the ones that would have cost most. The changes
   a file's subjects can get are put in order: the pull request's own lines first, then by kind as in §2,
   taking turns across the subjects. At most 30 `body` changes are tried, then at most 30 more (D-037,
   amended 2026-11-02: on the scratch project no new test was tried against more than 14 changes,
   while 3 had more than 60 to try, so neither cap was reached). A file that stops at a cap with changes left is
   **capped**: the record keeps how many `body` changes, and how many others, were not tried, and the
   verdict names the file and both counts. A capped file is never reported as fully checked. For each:
   write the changed file in the copy, run that one test file there with its package's runner call
   (`run <file> --reporter=json`), put the file back.

   **What a failure counts for** (D-037, amended). A new test's failure counts, and the change (`file`,
   `line`, `kind`) is recorded for it, unless it is a plain crash:

   | the failure | counts |
   |---|---|
   | an assertion failure, or any error not named below (a query that found no element, a property test's failure, the code's own `throw`) | yes |
   | a `TypeError`, `ReferenceError` or `RangeError` whose failing line is in the test's own file, inside the line span of an `expect(...)` call there | yes: the test was reading the result it checks |
   | a `TypeError`, `ReferenceError` or `RangeError` anywhere else | no: a plain crash |
   | the test timed out | no |

   The error's name is the first word of the failure's first `failureMessages` entry. The failing line is
   the first frame of that entry's stack, and no other frame: when that frame is not in the test's own
   file, or cannot be read, the crash does not count. That is the whole rule. No helper is followed and
   nothing is read a second time, so a result read on the line before the `expect` is a crash that does not
   count (Known limitations). A crash that does not count is kept for the test: how many, and the last
   one's type, file and line.

   - The test file no longer loads, or the run hangs past its limit: the change broke the file or hung it,
     and says nothing about a test. It is dropped and not counted.
   - The runner writes no result: exit 2 with its last lines.

   The file stops as soon as every new test in it has a failure that counts. A test that cannot fail costs
   the whole list.

   **Then the file is run once more, untouched.** A new test that fails there failed with nothing changed:
   its state is `flaky`, whatever it was credited with, and that is a finding (decision-defaults §4: a
   failure the step cannot attribute to a change proves nothing).
10. **The record**, returned to the verdict: `head`, `base`, `seconds`, `budget`, `limit` (the last three in
    seconds), `outOfTime`, `stopped` (null, or the message of an exit 2 above), `changedTestFiles`, `runs`
    (`{ package, call, version }`), `order`, `tests` (`{ package, file, name, line, subjects, tried,
    failedOn, crashes, lastCrash, state }`: `failedOn` null or the change with what the failure was,
    `crashes` a count, `lastCrash` null or `{ type, file, line }`, `state` one of `judged`, `flaky`,
    `out-of-time`), `neverRun` (`{ file }`), `notJudged` (`{ file, name, why, detail }`), `unreadable`
    (`{ file, reason }`), `support`, `notTests` and `outsideAnyTest` (`{ file }` each), `removedTestFiles` (a
    count), `mechanical` (true when the entry of step 7 counted), `capped` (`{ file, untriedBody,
    untriedOther }`), `leftProcesses` (the count §1 found and stopped).
    It is complete on every exit path, the time limit and an exit 2 included.

### 4. The verdict — `ci/checks/meta/mt1-tests-can-fail.mjs` (new)

`node ci/checks/meta/mt1-tests-can-fail.mjs --run` runs the step and judges its record (§1).
`node ci/checks/meta/mt1-tests-can-fail.mjs <folder>` reads `<folder>/run.json` instead, and reports through
`ci/checks/lib/report.mjs` either way: that form is for its fixtures, recorded runs under
`ci/fixtures/known-bad/mt1/`. What it must not report is held by `scripts/mt1.test.mjs` (PC1 fails a case
that passes).

With `--run`, the commit under review is `HEAD`, read through `trustedGit`. A fixture has no commit of its own,
so it pins one with `CHECK_HEAD`, as `CHECK_TODAY` pins the date: PC1's list of names a fixture may set gains
it. The `<folder>` form with no `CHECK_HEAD` does not hold the record to a commit: that is how the `meta`
script runs it on `ci/fixtures/mt1-green` (§1). It judges a recorded run and is never the gate: only `--run`
is what `/work-ticket` runs.

| in the record | result |
|---|---|
| no changed test file | passes: "No tests were added or changed." |
| a test `judged`, `failedOn` set | passes |
| a test `judged`, `failedOn` null, `crashes` 0, `tried` at least 1 | **finding** `kills-nothing` |
| a test `judged`, `failedOn` null, `crashes` at least 1 | **finding** `only-crashes` |
| a test `flaky` | **finding** `flaky` |
| a test `out-of-time` | **finding** `out-of-time` |
| a file in `neverRun` | **finding** `never-run` |
| in `notJudged` | warning, by name, with its reason |
| at least one new test, none in `tests`, and one in `notJudged` for a reason the owner did not give | **finding** `nothing-judged` |

A new test is one in `tests` or in `notJudged`. The reasons the owner gave never make `nothing-judged`:
`excused`, `kept-out`, `mechanical`, and `other-runner` while `tests-can-fail#other-runner` is unexpired in
`ci/exceptions.yaml`, which the verdict reads as it does for `excuse-expired`. Neither does `skipped`, which
is the test's own text. `flaky` from §3.8 does: a pull request whose only new tests are flaky in the copy is
not a pass. So one unjudged test beside a judged one stays a warning, and
a pull request the step could judge nothing of is not a pass (D-037).

Also a finding: an entry `tests-can-fail#…` in `ci/exceptions.yaml` that is expired or undated
(`excuse-expired`). Warnings, which never change the exit code: each `unreadable` file; `seconds` over
`budget`; a `tests-can-fail#mechanical` entry in a run whose record has `mechanical` not true. The summary
line gives the counts: new tests, passed, failed, not judged. Then two shares, always, the second even when
it is zero (D-037, amended 2026-11-02): the share of new tests not judged for a reason the rule causes
(`no-subject`, `support-only`, `could-not-be-parsed`, `other-language`, `no-change-to-make`, and
`other-runner` with no unexpired entry), and the share not judged for any reason. The reasons the owner
gave, `skipped`, and `flaky` (a test red in the copy, as the owner set it) count in the second only. After them comes one line for each of these that is not
zero, in the words of §3: test files stopped at a cap, each with the changes not tried; test files removed or
renamed away; changed files that are not tests; test files changed outside any test; test support files left
out.

Exit 2, each with its own message (decision-defaults §4): the run stopped (`stopped`, with its message,
processes left running among them, §1);
`run.json` is missing, is not JSON, or lacks a field; its `head` is not the commit under review; a `judged`
test has `failedOn` null, `crashes` 0 and `tried` 0. A test with nothing tried belongs in `notJudged`, and §3.6
puts it there, so the last is a fault in the record and never an ordinary pull request.

### 5. What a failure says (D-016)

Every line names the project's own thing and the next action, and reads without knowing a check id. Test
names and paths are a pull request's text and are printed through the report's escape.

- `kills-nothing`: `` `{file}` › "{test}" passes whatever the code does: {n} changes were made to the code
  its file imports ({subjects}), and it failed on none of them. Assert on what the code returns or does,
  then run `pnpm tests-can-fail`. ``
- `only-crashes`: `` `{file}` › "{test}" only ever failed by crashing: {n} changes were made to the code its
  file imports, and its only failures were crashes, the last a {type} at `{file}:{line}`. A crash shows the
  code broke, not that the test checks anything. It counts only on a line inside an `expect(...)` of the
  test's own file: a result read on the line before the `expect` does not. Either assert on what the code
  returns or does, or excuse the test in `ci/exceptions.yaml` with a date (id `tests-can-fail#{file}`).
  Then run `pnpm tests-can-fail`. ``
- `flaky`: `` `{file}` › "{test}" failed with nothing changed, after passing once in the same copy. A test
  that fails by chance cannot show it notices a change. Make it pass every time, then run
  `pnpm tests-can-fail`. ``
- `never-run`: `` `{file}` was added or changed, and none of this project's test runs picks it up
  ({calls}). A test nothing runs is not coverage. Rename or move it so a run finds it, or keep it out on
  purpose in `ci/tests-can-fail.yaml` (`keep-out:`, with a reason). ``
- `out-of-time`: `` The check that new tests can fail ran out of time ({limit} minutes) before it reached
  `{file}` › "{test}". It was not judged, so this is not a pass. Run `pnpm tests-can-fail` again; if it
  stops here every time, the pull request's tests are too slow for the step: see BOOTSTRAP.md, "Tests can
  fail". ``
- `nothing-judged`: `` None of the {n} tests this pull request adds or edits was judged, so this is not a
  pass: {each reason, with its count}. Each is named above. Import the code under test by a relative path,
  which this step follows, or excuse a test file in `ci/exceptions.yaml` with a date (id
  `tests-can-fail#{file}`, for the first of them). Then run `pnpm tests-can-fail`. ``
- not judged: `` Not judged: `{file}` › "{test}" — {reason}. `` with the reasons: "it imports no source file
  this step follows"; "every source file it imports is test support (`{file}`)"; "this pull request is
  excused as a mechanical change until {date}: {reason}";
  "it was red, then green, in a clean copy with nothing changed: it is flaky, so this step cannot tell what
  it notices";
  "its subject `{file}` could not be parsed"; "its subject `{file}` is not JavaScript or
  TypeScript"; "there is nothing this step can change in `{file}`, which is all it imports"; "it is kept out
  in `ci/tests-can-fail.yaml`: {reason}"; "its package {package} does not use Vitest"; "it is skipped";
  "excused until {date}: {reason}".
- another commit: `` This record is for commit {a}, not the one being checked ({b}). Run
  `pnpm tests-can-fail` again. ``
- processes left: `` {n} processes this check started were still running and were stopped. Run
  `pnpm tests-can-fail` again; if it says this again, a test starts a process that leaves its group. ``
- a capped file (a count line): `` `{file}` stopped at the cap of 30 changes: {n} body changes and {m}
  others were not tried, so it is not fully checked. ``
- a spent entry (a warning): `` `tests-can-fail#mechanical` in `ci/exceptions.yaml` counted only in the pull
  request that added it, and excuses nothing now. Remove it. ``
- the runner's output is not as expected: `` The test runner did not {say where each test is | write a
  result this step can read}. This step was written for Vitest 4 and 5; {package} has {version}. ``

### 6. What a project holds

Nothing new is installed. A project may hold `ci/tests-can-fail.yaml` (§3.3), its own file: slipway ships
none, and `dev/ownership.yaml` gives the path the class `ci/before-verify.sh` has. It says how a package's
tests are run when its `test` script cannot be read, and which test files are kept out, and carries no
dates. `ci/exceptions.yaml` is the one place a test is excused, with a date. Both are under `ci/`, so the
harness asks before an agent edits either and a pull request that changes one says so under
`## Gate changes`. Taking a test out of the judged set is then a change the owner sees.

### 7. The budget (D-037)

**2 minutes** of wall time, and a stop at **10** (D-037, amended 2026-11-02: the owner's pick). The budget is
about twice the slowest run of the scratch change of D-037 on the machine building the pull request, the
step's own workload as the probe applies it. The owner set it with a real project's re-run in front of them
too. The stop is the figure of
0.3, kept so a slower machine is not red for time.

Past the budget the verdict warns with both numbers. At the limit the run stops, marks every new test it has
not finished `out-of-time`, and the verdict fails naming each: it is never a pass. The limit is
`--limit-seconds`, 600 when not given, and `tests-can-fail` gives none; `scripts/mutation.test.mjs` passes a
small one to prove the stop. So the limit changes only by editing a root script, a file the harness asks
about, or D-037.

### 8. What ties it to the test runner

`scripts/fixtures/vitest/` holds, for Vitest 4 and for Vitest 5, one real output of each thing the step
reads, recorded from the scratch project: a listing, a result with a passed test, and a failed test of each
kind in §3.9's table (an assertion failure, a query that found no element, a crash in the code, a crash on
a line inside an `expect`). The functions that read them (`ci/checks/lib/runner-output.mjs`, new) are tested
on those files, so a reader of the format is tested on the format. The stand-in runner of
`scripts/mutation.test.mjs` answers with the same files.

A listing with no line for a test, a result that is not the shape recorded, or a failed test with no
`failureMessages` is exit 2 with the last message of §5, which names the range and the version found, so a
runner release that moves a field is named as that and not as a fault in the pull request.

### What is reused

- `ci/checks/lib/report.mjs`, `trustedGit`, `discoverWorkspace`, `loadRegistry` and `expiryProblem`
  (`ci/checks/lib/exceptions.mjs`), `readList` in strict mode (`ci/checks/lib/yaml-list.mjs`) for
  `ci/tests-can-fail.yaml`; PC1 and its fixture layout; W1's reading of root scripts; the vendor folder's
  README table and hash test; `ci/before-verify.sh`, the project's one place for what its tests need.
- `s1-status.mjs ci/fixtures/status` in the `meta` script as the precedent for a check run on a fixture of
  its own, so W1 finds MT1 run with no workflow of its own (§1).
- The probe's way of stopping what it starts (`dev/probes/tests-can-fail/measure.mjs`, #439) as the measured
  case for §1's process groups; the probe is not shipped, so the step's code is new.
- Searched and found nothing: no mutation code and no reader of a test run or of a `test` script's words
  (`rg -i "mutation|mutant|stryker"` outside `dev/`, the reviews and `decisions.md`: prose in
  `docs/testing-strategy.md` and L-04, and one comment in `scripts/ds1.test.mjs`). One `check:*` root
  script exists, `check:prose`, so `tests-can-fail` follows a name already in use.

## Seams

A promise, and a cost. Every project that takes this slipway promises its contributors one more thing a pull
request built by `/work-ticket` must pass: a test it adds has to be able to fail, and has to be run by
something. Who pays: the machine building the pull request, once before it is marked ready, at most the limit
of §7; a project's Actions minutes are not spent on it (D-037, amended 2026-10-14). Who is told: the session
building the pull request, by test name, and the pull request's reader, in its `## Verification`. No new
person and no new channel. Slipway takes on a second third-party file to keep current.

## Threat model

The step runs a pull request's own tests and source on the machine building it, as `pnpm verify` already
does there, from a copy outside the project. Beyond the baseline it promises one thing: **a pull request
cannot make the step pass by changing a file the owner is not shown. A test it does not judge is named, with
the reason, in every run; naming is all it promises for those, but for one case: a pull request with new
tests and none judged fails (§4).**

What carries the result is the session that ran it: `/work-ticket` copies it into `## Verification`, as it
does `Quality gate`'s, and no workflow runs it again. The step defends the run, not the report of it: a
pull request built without `/work-ticket`, or one whose author edits the copied lines, is not checked by
this step (Known limitations).

- There is no record to forge in a file: the run hands it to the verdict inside one process (§1). The
  verdict still refuses a record that is not for `HEAD`, which is what a fixture's is held to.
- The files that can take a test out (`ci/tests-can-fail.yaml`, `ci/exceptions.yaml`) and the root script
  that sets the limit are files the harness asks about.
- A test left unjudged is named in every run, with its reason and a count. A test file nothing runs is a
  finding, not a name on that list.
- A pull request can excuse its own new tests by adding `tests-can-fail#mechanical` (§3.7), the owner's pick.
  What holds it: `ci/exceptions.yaml` asks the owner before it changes, the pull request lists it under
  `## Gate changes`, and the run names and counts every test it let through.
- The step runs no shell: the runner is started with an argument list, a `test` script and a `run:` entry
  are read word by word against a fixed set of characters and two forms, and paths come from git and are
  kept inside the repository.
- Test names, paths and the runner's messages are a pull request's text: printed only through the report's
  escape.
- The vendored parser is never edited, its hash is pinned by a test, and it only reads text handed to it.

Accepted under D-037, and named when they happen: a test can leave the judged set by how it imports its
subject (a path alias, a dynamic import, a package outside the workspace). It is listed as not judged and
the pull request is not failed, unless none of its new tests is judged.
The trigger that brings the stricter rule back is in Known limitations.

Not defended: a pull request whose tests, while they run, attack the run's own process (stop it, change a
file in the copy, write into its memory, start a process outside its group), which holds for anything
`pnpm verify` runs too; the owner's own machine (decision-defaults §3); a test written to pass this step and
nothing else; and a result copied into a pull request by hand.

## Known limitations

- **A test with no assertion can still pass.** A plain crash does not count, but the code's own error does:
  a test that asserts nothing passes when some change makes the code throw an error of its own. Measured
  (D-037, 2026-10-12): of the scratch project's 38 new tests, the rule fails 1 that the first rule passed,
  the planted test that asserts only on its own input.
- **A result read on the line before the `expect` is a crash that does not count.**
  `const total = cart.total(); expect(total).toBe(5)` crashes on its first line when `cart` is undefined,
  outside any `expect`. Such a test passes on any other change that fails its assertion, which is the usual
  case; when a crash is all it ever does, it is `only-crashes` and the message says why. The rule reads one
  line of one stack and stays that small (the owner's pick).
- **A failure in a setup hook is read by the same rule.** The runner's output does not mark it apart, so a
  hook that fails by an error that counts credits every test of the file that ran after it.
- **A mechanical edit makes a test new.** A rename applied across a test file, or a codemod, changes lines
  inside old tests, and each is then judged; one that never could fail turns the pull request red. Only
  whitespace is ignored. In a few files: fix the test, or excuse the file with a date. Across many, every
  touched test is new and the run reaches its limit, so the pull request takes the one dated line of §3.7
  (the owner's pick, D-037), and none of its tests is judged.
- **It fires only where `/work-ticket` runs** (D-037, amended 2026-10-14: the owner's pick). A pull request
  built another way, or by hand, is not checked by it, and no CI job catches it later. The owner chose this
  over spending Actions minutes on every pull request that changes a test.
- **It judges the branch as committed, not as merged.** A test that can fail on the branch and not once
  merged with a newer base is not seen here; `verify` runs the merge in CI. The step's own files, and the two
  files that take tests out (`ci/exceptions.yaml`, `ci/tests-can-fail.yaml`), are read from the branch: a
  branch cut before a project took the step has no `tests-can-fail` script until the base branch is merged
  in.
- **A change outside every test marks none new.** A helper, a hook, a mock or an import line in a test file
  changes what every test there can notice, and none of them is judged. Such files are counted in every run.
- **An updated snapshot marks no test new.** A snapshot file changes what a test asserts without a line of
  the test changing, and it is not counted.
- **A pull request whose only new tests are of code this step has no change for fails until each is
  excused, and the excuse expires.** A schema declared as data, a table of routes, a map of constants: the
  subject reads and holds nothing §2 changes, so its test is `no-change-to-make`, and alone in a pull request
  that is `nothing-judged`. The same holds for `support-only`, `other-language` and `could-not-be-parsed`.
  The rule is the owner's pick (D-037); this is its cost.
- **A test the runner lists under another name is never seen.** A changed test file is told by its name
  (`*.test.*`, `*.spec.*`, under `__tests__/`) before any runner is asked. A project whose runner includes
  other names (`tests/**/*.ts`, `*.unit.ts`, tests inside source files) has tests the step does not judge,
  name or count, and a file renamed to such a name reads as "removed or renamed away" while its tests run.
- **A test under `__tests__/` that nothing runs is counted as not a test.** `never-run` is for
  `*.test.<ext>` and `*.spec.<ext>`; `__tests__/cart.ts`, another runner's habit, is one of the "changed
  files under a test name or folder [that] are not tests".
- **Lines removed whole are not judged.** A test deleted from a file, or a deleted test file, is counted and
  nothing more: the step judges tests that exist.
- **Test support is told by name.** A helper under a name off the list of §3.6 is still changed, and a test
  that asserts only on its data is credited. A product file under a name on the list is not changed, and a
  test of that file alone is named not judged, `support-only`.
- **A test can avoid being judged by how it imports.** A test whose file imports its subject in a way the
  step does not follow (a path alias, a dynamic import, a package outside the workspace) is listed as not
  judged, not failed, while another new test of the pull request is judged.
  This is a class, not a bug: the owner chose it over failing tests that were fine
  (D-037). What brings the stricter rule back: a project whose rule-caused not-judged share stays under the
  quarter D-037 holds (§4 prints it on every run) can ask to fail on it, in a later ticket.
- **A test that reads files, not code, fails** when its file also imports source: the step cannot tell. It
  is excused in `ci/exceptions.yaml`, with a date.
- **Browser and server tests are judged only when a `test` script or a `run:` entry runs them** and they
  import their subject. A project that runs them another way keeps their folder out, by name and with a
  reason; a test file in neither place is `never-run`.
- **Vitest 4 and 5 only**, and only JavaScript and TypeScript source. A Svelte or Vue component is not
  changed.
- **A `test` script that is more than a plain call is not read.** One that chains commands, sets a variable
  in front, or goes through another tool stops the step until `ci/tests-can-fail.yaml` states the call.
- **A change that breaks the test file's loading, or hangs it, counts for nothing.** A test whose only effect
  on a change is one of those is named `kills-nothing`.
- **Tests on one line are judged as one.** The rows of an `it.each`, or of a loop, pass or fail on the first
  one listed.
- **Fewer kinds of change than a mutation tool makes.** Enough for "can this test fail"; not a measure of how
  good the tests are.
- **The time is the building machine's.** §7's figures were measured on one laptop with the probe, which
  reads source with the TypeScript compiler API, not the vendored parser: a slower machine, or the parser's
  different count of changes, moves the seconds. The stop at 10 minutes leaves room for both.
- **A SIGKILL to the step can leave processes running.** It cannot be caught: the copy's folder and the
  processes started in it are left until the next run removes the folder, and its processes are stopped by
  hand, by the folder's name. A process outside the step's groups is stopped, and the run is exit 2, when its
  command line names the copy's folder; one that does not is not seen (Threat model).
- **A service `ci/before-verify.sh` starts outside its process group is the project's to stop** (the owner's
  pick, answering the review of 0.5). `docker compose up -d`, or a server that daemonizes, leaves the script's
  group, so the step does not stop it. If its command line names the copy's folder, §1's check stops it and the
  run is exit 2; if not, it stays running, and on a fixed port the next run's script fails. `BOOTSTRAP.md`
  says how a project stops it, and the step's messages name it as a possible cause (build steps 3 and 5).
- **A stacked pull request is diffed from the default branch.** The parent's tests are judged again in the
  child, and a `tests-can-fail#mechanical` line the parent adds counts in the child. Taking the pull
  request's base branch from `/work-ticket` would be a Contract change (AR-9 of the 0.4 review, arguing with
  this session's reading).
- **Whether a flaky test fails the pull request is chance.** One that flakes in the baseline is named, not
  failed (§3.8); one that flakes in the run after judging is a `flaky` finding (§3.9).
- **A capped file is judged on part of its changes.** Past the caps of §3.9 the rest are not tried; the
  verdict names the file and the counts, and a test that failed on none of the tried ones is still
  `kills-nothing`.
- **`ci/before-verify.sh` runs in the copy, so locally it runs beside whatever is already running.** A script
  that starts a service on a fixed port fails there when the developer's own is up. A test that needs a file neither git nor that script provides is red in the copy, and the step stops
  and names it.
- **The copy costs an install.** Offline and from the store the project's own install filled, but on a large
  workspace it is tens of seconds of the budget. A pull request that changes no test pays none of it.

## Acceptance

```
Given ci/checks/lib/vendor/babel-parser.mjs
When  node scripts/mutants.test.mjs runs
Then  its sha256 equals the pinned one, and the test fails when one byte of the file changes
```

```
Given a TypeScript source, a TSX source, a plain JavaScript source and a JSX source under scripts/fixtures/mutants/, each with a function, an if, a comparison and a boolean, and beside each a file holding the changes expected of it
When  scripts/mutants.test.mjs calls mutants() on each
Then  the result equals that file exactly: every change, its kind, line and replacement, in order
And   each applies to give a text the parser reads again, and 0 changes are returned inside an import, a type annotation or a string
```

```
Given a file that is not valid JavaScript or TypeScript, and a .svelte file
When  mutants() reads each
Then  the first is { unreadable } with the parser's reason and the second { unreadable: 'not JavaScript or TypeScript' }
```

```
Given a test file with two tests, a beforeEach, a helper function, an it.each of three rows, an expect whose argument runs over three lines, and a file that only re-exports from ./a and ./b
When  scripts/mutants.test.mjs calls spans() on the first and reExports() on the second
Then  spans() gives the first and last line of each of the three test calls and of each expect call, and no span for the hook or the helper
And   reExports() gives 2 paths, ./a and ./b
```

```
Given the test scripts `vitest run`, `vitest`, `vitest run --project unit`, `node --env-file-if-exists=.env.test node_modules/vitest/vitest.mjs run`, `cross-env CI=1 vitest run`, `vitest run && tsc`, `node build.mjs`, `vitest run "a b"`
When  scripts/mutation.test.mjs calls runnerCall() on each
Then  the first four are read, the fourth with its node flag kept, and the last four are not, each with a reason
```

```
Given the recorded Vitest 4 and Vitest 5 outputs under scripts/fixtures/vitest/
When  scripts/mutation.test.mjs reads each with ci/checks/lib/runner-output.mjs
Then  the listing gives each test's file, name and line; the results give passed and failed tests
And   the 4 failures read as: counts (assertion), counts (a query that found no element), does not count (a TypeError whose first frame is in the code), counts (a TypeError whose first frame is in the test file, on a line inside an expect)
And   with the line field removed from a listing, or failureMessages from a failure, the reader throws the message of §5 with the range and the version
```

```
Given ci/fixtures/known-bad/mt1/findings: a record with a judged test whose failedOn is null after 14 changes and no crash, one whose failedOn is null with 3 crashes and a lastCrash, a flaky test, a test marked out-of-time, a file in neverRun, four tests in notJudged (no-subject, could-not-be-parsed, no-change-to-make, kept-out), two judged tests with failedOn set, and an expired tests-can-fail# entry in its ci/exceptions.yaml
When  node ci/checks/meta/pc1-positive-control.mjs runs MT1 on it
Then  it exits 1 with exactly kills-nothing, only-crashes, flaky, out-of-time, never-run and excuse-expired, and the warnings for the four unjudged tests
And   each detail holds the test's file, its name and the wording of §5; the only-crashes detail holds the crash's type, file and line, "a result read on the line before", and "ci/exceptions.yaml"
```

```
Given ci/fixtures/known-bad/mt1/ cases, one folder each: no run.json; a run.json that is not JSON; one whose head is not CHECK_HEAD; one with stopped set; one with a judged test that has failedOn null, crashes 0 and tried 0
When  PC1 runs MT1 on each
Then  each exits 2, and the message starts as §4 and §5 give it
```

```
Given a record where every new test has failedOn set, with an unjudged test and seconds over the budget; and a record with no changed test file
When  node scripts/mt1.test.mjs runs MT1 on each
Then  the first exits 0, its summary gives the counts, and it holds the two warnings; the second exits 0 with "No tests were added or changed."
And   in a temporary git repository, a record whose head is that repository's HEAD is accepted and any other is exit 2
```

```
Given a temporary project with a stand-in test runner that fails a named test only when a given line of its subject is changed
When  node scripts/mutation.test.mjs runs ci/mutation.mjs on a commit that adds that test and one that never fails
Then  the record holds the first as judged with failedOn at that line, and the second as judged with failedOn null, crashes 0 and tried at least 1
And   the stand-in runner, which records the project's `git status` and `git worktree list` on every call, saw no change and one worktree each time, and no file exists under the project that the run made
```

```
Given the same project, and a commit that adds three tests: one that asserts nothing, in a file whose beforeEach builds the subject; one whose only failure is a TypeError on a line inside its expect; one whose only failure is a TypeError on the line before its expect
When  ci/mutation.mjs runs, the stand-in runner answering with the recorded failures of §8
Then  the first and third are judged with failedOn null, crashes at least 1 and lastCrash naming the type, file and line; the second is judged with failedOn set
And   MT1 on that record exits 1 with only-crashes for the first and third and nothing for the second
```

```
Given the same project, and a commit that changes only a test file importing ./cart, ./utils (an index.ts that re-exports from ./a, which re-exports from ./b), ./types (types only), ./factories, ../mocks/handlers and a workspace package by name
When  ci/mutation.mjs lists the subjects
Then  they are cart's file, a's and b's, and that package's entry file with what it re-exports by relative path; ./types is dropped and named, ./factories and ../mocks/handlers are in the record's support, and nothing else is a subject
And   a test file importing only ./types has its new tests in notJudged as no-change-to-make, one importing only ./factories has them as support-only, and 0 of them are in tests
```

```
Given a test file whose only subject cannot be parsed, one that imports nothing but the test runner, one with an unexpired tests-can-fail# entry, one in a folder a keep-out entry names, and one the stand-in runner does not list
When  ci/mutation.mjs runs
Then  the record's notJudged names the first four with could-not-be-parsed, no-subject, excused and kept-out, none is in tests, and the fifth is in neverRun
And   with a changed __snapshots__/cart.test.tsx.snap, __tests__/fixtures/order.json and __tests__/helpers.ts that the runner does not list, 0 of the 3 are in neverRun: the first is not a changed test file, and the other 2 are in notTests
```

```
Given a commit that changes no test file; then one whose test file changes only in a describe line, a beforeEach and whitespace inside a test; then one that changes one row of an it.each of three
When  ci/mutation.mjs runs on each
Then  the first ends with no changed test file, the stand-in runner is never called and no copy is made; the second has no new test and the file in outsideAnyTest; the third has one new test, the group, named by the call's line
```

```
Given a project whose test needs a file that ci/before-verify.sh writes and git does not track
When  ci/mutation.mjs runs
Then  the test is green in the baseline and is judged; with the script removed from the commit it exits 2 with the message of §3.8
```

```
Given a stand-in runner that fails a new test once on a change and again on the untouched run after it
When  ci/mutation.mjs runs
Then  the record holds that test as flaky, and MT1 on it exits 1 with flaky
```

```
Given a stand-in runner that takes 2 seconds a run, three new test files with 2, 5 and 9 changes to try, and --limit-seconds 5
When  ci/mutation.mjs runs
Then  it stops within the limit, the record's order is the 2, the 5, then the 9, it has outOfTime true and each unfinished test as out-of-time, and MT1 on that record exits 1 naming each, with "ran out of time" and "not a pass" in the detail
```

```
Given a tracked file with an uncommitted change; a workspace where no package depends on vitest and a commit that adds a test file; the same with an unexpired tests-can-fail#other-runner entry; a package whose test script is `cross-env CI=1 vitest run`; the same with a run: entry for it
When  ci/mutation.mjs runs on each
Then  the first judges the last commit and says one file's changes were not judged; the second exits 2 naming the test file; the third names it not judged, other-runner; the fourth exits 2 with the message of §3.3 quoting the script; the fifth is judged by the entry
```

```
Given a run killed (SIGKILL) while a changed file is in the copy
When  the project is looked at afterwards
Then  `git status` shows nothing the run made, `git worktree list` shows one worktree, and `pnpm meta` gives the result it gave before the run
And   the next run removes a tests-can-fail-* folder in the temporary directory that is more than 1 day old and leaves a newer one
```

```
Given a test file renamed with one line changed inside one test
When  ci/mutation.mjs lists the new tests
Then  only that test is listed
```

```
Given a temporary repository with a default branch that changed a test file after a branch was cut, and the branch, which changed one test of the same file, checked out
When  ci/mutation.mjs runs
Then  the diff is from the merge base to HEAD: the one test the branch changed is the one judged, the default branch's change marks no test new, and the record's head is HEAD
```

```
Given a commit that only deletes the one expect line of an existing test; one that deletes a whole test from a file of three; one that deletes a test file; and one that renames cart.test.ts to cart.tst.ts
When  ci/mutation.mjs runs on each, the stand-in runner never failing the first's test, and MT1 on each record
Then  the first has one new test, that one, judged with failedOn null, and MT1 exits 1 with kills-nothing; the second has no new test
And   the third and the fourth end with no changed test file and removedTestFiles 1, and MT1 exits 0 with "No tests were added or changed." and "1 test files were removed or renamed away"
```

```
Given a commit that changes a line inside one test in each of three test files and adds an unexpired tests-can-fail#mechanical entry to ci/exceptions.yaml; then a commit on top of it, judged against it, that changes one more test and leaves the entry in the file
When  ci/mutation.mjs runs on each, and MT1 on each record
Then  the first has its three new tests in notJudged as mechanical with the entry's reason and date, the stand-in runner was called for the listing and no more, and MT1 exits 0 naming each
And   the second judges its test as if the entry were not there, and MT1 warns that the entry is spent, with "Remove it"
```

```
Given ci/fixtures/known-bad/mt1/nothing-judged: a record with three new tests, none in tests, in notJudged as no-subject, no-subject and support-only
When  PC1 runs MT1 on it
Then  it exits 1 with exactly nothing-judged, and the detail holds the count, each reason with its count, "not a pass" and "ci/exceptions.yaml"
And   scripts/mt1.test.mjs holds what must not report it: the same record with one more test, judged with failedOn set, exits 0; a record whose new tests are all excused, kept-out, skipped or mechanical exits 0 with each named; one whose new tests are all other-runner exits 0 beside an unexpired tests-can-fail#other-runner entry and 1 without it
```

```
Given the meta script running node ci/checks/meta/mt1-tests-can-fail.mjs ci/fixtures/mt1-green, and no workflow naming tests-can-fail
When  pnpm meta runs
Then  MT1 exits 0 on that fixture with its summary line, W1 counts MT1 as run, W1 lists no gated script for the tests-can-fail root script, and pnpm meta exits 0
And   with that line removed from the meta script, W1 fails naming MT1; and no file under .github/workflows/ names the tests-can-fail script, held by a test pnpm meta runs
And   in a project made by scripts/new-project.mjs, the meta line and ci/fixtures/mt1-green/ are present and W1 exits 0
```

```
Given a scratch project made by scripts/new-project.mjs with the default app, and a branch that adds a test asserting only on its own fixture, built in a factories.ts beside it
When  pnpm tests-can-fail runs there
Then  it exits 1 and names that test; with the assertion changed to read the code's result, it exits 0
And   on the machine building the pull request, on a branch touching 10 source files, the wall time is under the budget D-037 holds (2 minutes); a time over it is not accepted without a decision of the owner's that cites the number
```

```
Given a ci/before-verify.sh that starts a background process a new test needs, and returns
When  ci/mutation.mjs runs
Then  the test is green in the baseline and is judged, and `pgrep -f` on the copy's folder finds nothing after the run
```

```
Given a stand-in runner that starts a worker of its own and is killed at its time limit, and a test that starts a detached process from inside the copy
When  ci/mutation.mjs runs, and once with SIGTERM sent to it mid-run
Then  after each, `pgrep -f` on the copy's folder finds nothing; the first record has leftProcesses 1 and the run is exit 2 with "were still running and were stopped"
And   with the killing of the group removed from ci/mutation.mjs, the same case leaves the worker running and the test fails
```

```
Given a new test red in the first baseline run and green in the second; and one red in both
When  ci/mutation.mjs runs on each
Then  the first is in notJudged as flaky, no change of step 9 was run against it, and the other tests of the pull request are judged; the second exits 2 with the message of §3.8
And   MT1 on the first record, where that test is the only new one, exits 1 with nothing-judged
```

```
Given a test file whose subjects hold 40 body changes and 35 others, and a new test that fails on none of them
When  ci/mutation.mjs runs, and MT1 on the record
Then  60 changes were tried, the record's capped names the file with untriedBody 10 and untriedOther 5, and MT1 prints the capped line of §5 with both counts beside kills-nothing
```

```
Given a record with 8 new tests: 4 judged, 2 no-subject, 1 skipped, 1 flaky
When  MT1 runs on it
Then  the summary prints both shares, 2 of 8 rule-caused and 4 of 8 in all, and with no unjudged test it still prints both, each 0
```

```
Given every message MT1 and ci/mutation.mjs print in the cases above (the expected.json `details` hold the wording)
When  scripts/mt1.test.mjs checks each
Then  each holds a file of the project, a test's name where it is about a test, and one of the next actions of §5 ("Assert on", "excuse", "Rename or move", "keep it out", "Make it pass", "Run `pnpm tests-can-fail`", "Write the call", "Remove it"), and none holds "MT1"
And   the step-5 pull request names a reader who did not write them, and records what they could not act on
```

```
Given a real project built from slipway
When  the step is run once on one of its pull requests before it ships
Then  at least 1 new test is judged, and the share not judged for a reason the rule causes (§4) is under the quarter D-037 holds; either one missed is not accepted without a decision of the owner's
And   the last build step's pull request records the result as a pass or a miss against each of the 2, with no name, path, figure or content of that project: its figures are shown to the owner and not recorded
```

```
Given Build map step 0 and #439's re-run
When  F-13 0.4 is on main
Then  D-037 holds the scratch project's figures from the building machine (the seconds per Vitest version, the tests new, judged and not judged by reason), that the same was run on a real project with its figures shown to the owner and not recorded, and the budget, the limit, the two caps of §3.9 and the not-judged share the owner set from both
And   step 1 has not started before that edit is on main
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
default app: `pnpm tests-can-fail` on a branch with a test that cannot fail (exit 1, the test named), on the
same branch fixed (exit 0), on a branch that changes no test (exit 0, "No tests were added or changed."), and
with an uncommitted change (it says so, and `git status` is the same before and after). After each,
`pgrep -f tests-can-fail-` prints nothing. Paste each result line, both shares and the wall time.

## Build map

0. **The measurement** — done. The probe in `dev/probes/tests-can-fail/` (#433) measured the scratch project
   and a real project; the real project crossed the stop line, and the owner reshaped the step (D-037,
   amended 2026-10-14). #439 re-ran it on the building machine, on the scratch project and on a real project
   (its figures shown to the owner and not recorded), made the probe stop every process it starts, and the
   owner set §7, §3.9's caps, §3.8's second baseline run and the not-judged share from it (D-037, amended
   2026-11-02). Its carried lines (0.2 AR-6; 0.3 AR-5, AR-10) were met there: D-037 says what the probe
   leaves out beside each figure, a real project's figures are not in it, and the recordings of §8 are in
   `dev/probes/tests-can-fail/recorded/`.
1. **The parser** — `ci/checks/lib/vendor/babel-parser.mjs`, its licence, the README table, and the hash pin
   in `scripts/mutants.test.mjs` (added to the `meta` script). A third-party file and nothing else, so it can
   be read alone. Checks, ~40 lines beside the file. Step 0 is done, so nothing blocks it.
2. **What the parser gives** — `ci/checks/lib/mutants.mjs` (`mutants`, `spans`, `reExports`) and the rest of
   `scripts/mutants.test.mjs` with its expected files. Checks, ~320 lines. Blocked by 1.

   Carried from the 0.2 review: AR-13, check that an exported function and an exported constant get their
   changes against the code and pin it with a test (export each fixture's function).
3. **The run** — `ci/mutation.mjs`, `ci/checks/lib/runner-call.mjs`, `ci/checks/lib/runner-output.mjs`,
   `scripts/fixtures/vitest/**`, `scripts/mutation.test.mjs` with its stand-in runner, the
   `ci/tests-can-fail.yaml` row in `dev/ownership.yaml`. It holds §1's process groups and the check that
   nothing is left running, §3.8's second baseline run, §3.9's `capped` and the record's new fields.
   Nothing is added under `ci/checks/meta/`, so W1 asks for nothing. Where an acceptance block of the run
   ends "and MT1 on that record", that half is proven in step 4. Checks, ~650 lines. Blocked by 2.

   Its acceptance blocks: the ones that run `ci/mutation.mjs` (the stand-in runner's, the subjects', the
   not-judged reasons', the commits that change no test, a test, a row; `ci/before-verify.sh`; flaky; the
   time limit; the uncommitted change and the runner calls; SIGKILL; the rename; the merge base; the deleted
   tests; the mechanical entry; the processes left; the second baseline run; the capped file).

   Carried from the 0.2 review:
   - AR-8, a Vitest major with no recording under `scripts/fixtures/vitest/` is exit 2 before anything
     runs, and a failure entry whose first word is not an error's name counts for nothing and is named; pin
     both with a test.
   - AR-9, check what one changed run adds to `tried`, `crashes` and `failedOn` when the test file does not
     load, when the test times out, and when the change leaves the test skipped, against the code and pin
     it with a test.
   - AR-12, none of these arguments of a `test` script leaves a word behind as a filter or changes which
     tests a single-file run executes (`--reporter verbose` as two words, `--coverage`, `--outputFile=x`,
     `--shard`, `--changed`, `--bail`, `-t`): each is dropped with its value, or is exit 2 with "Write the
     call"; pin each with a test.
   - AR-13, check each of these against the code and pin it with a test: every `NAME=value` line of
     `GITHUB_ENV` reaches every runner call (§3.4); a `ci/tests-can-fail.yaml` entry with both keys or
     neither, an unknown package or an unknown key is exit 2, and two `run:` entries for one package are
     both judged (§3.3); a test file `spans()` cannot read has every test new (§3.5); a skipped or `todo`
     new test is `skipped`, and `other-language` is reached (§3.8, §3.6); the order of changes and the two
     caps (§3.9).

   Carried from the 0.3 review:
   - AR-3, a hunk that only removes lines and marks no test puts its file in `outsideAnyTest`; pin it in
     the block that deletes a whole test, and with a hook that loses a line. A hunk that only adds or
     removes blank lines marks no test; pin it in the block that changes whitespace inside a test.
   - AR-4, check each of these against the code and pin it with a test: a changed data file under
     `__tests__/` in a package that does not use Vitest is not a test, as §3.5 has it for one that does; a
     changed test file at the root, outside every package, is named and counted and is no finding by
     itself; a `keep-out:` that names a folder of a package on another runner gives `kept-out`.
   - AR-9, check what counts as "adds" for a moved or re-touched `tests-can-fail#mechanical` line and for
     one that arrives by a merge, and that `ci/exceptions.yaml` and `ci/tests-can-fail.yaml` are read from
     the commit, against the code and pin each with a test.
   - AR-10, the support list's folder names (§3.6) are matched on the path inside the repository, so a
     checkout under a folder named `test` makes no file support; pin it with a test.

   Carried from the 0.4 review:
   - AR-6, say how `<default>` is found: `origin/<default>`; with no `origin`, the local default branch, as
     `/work-ticket` does with its `{base}`; with neither, exit 2 naming the action. Pin it in the merge-base
     block, and run Verify's scratch project, which has no `origin`, through that path.
   - AR-7, the check that nothing is left running fails closed: `pgrep` exit 1 means none, and any other exit,
     or no `pgrep`, is exit 2. Every process the step starts is started by an absolute path inside the copy,
     so its command line names the folder. The step takes the probe's lesson, not its `catch`. Pin both with
     a test.
   - AR-11, the processes block names which record has `leftProcesses` 1, and starts the detached process by
     a path inside the copy.

   Carried from the 0.5 review, as acceptance lines of this step's issue (the owner's rule for the last
   review):
   - AR-1, the owner's pick: a service `ci/before-verify.sh` starts outside its process group is the
     project's to stop (Known limitations). Two lines, each with a fixture: a port already in use when
     `ci/before-verify.sh` runs gives a message that says a service from an earlier run may still be running
     and how to stop it, not a generic script failure; every new test red in the clean copy, or failing on a
     connection error, gives a message that names `ci/before-verify.sh`'s services as a possible cause before
     it blames any test.
   - AR-2, the `ci/before-verify.sh` block's "`pgrep -f` finds nothing" can fail: its background process is
     started with the copy's folder in its command line, and the AR-7 line above asks the absolute path only
     of what the step itself starts, the install included as `pnpm` run from inside the copy.
   - AR-3, §1's kill says its signal and that it waits: SIGTERM to each group, a bounded wait, then SIGKILL,
     and the check of what is left runs after the wait; pin it with a stand-in that takes a moment to stop.
   - W1's third clause: `scripts/mutation.test.mjs` is added to the `meta` script, as every
     `scripts/**/*.test.mjs` in slipway must be.

   Carried from the security review of #614 (the probe's own defects, fixed there), as acceptance lines of
   this step's issue:
   - the copy's folder is escaped before `pgrep -f` or `pkill -f` reads it as a regular expression; pin it
     with a test whose temporary directory holds a `+` and a `(`;
   - SIGINT, SIGTERM and SIGHUP to the step end the run within a set time, not at the end of the run: the
     step is not synchronous where the probe is, so its handlers run (a listener on a synchronous process
     only swallows the signal); the processes block holds that time;
   - `ci/before-verify.sh` runs with its output not held by a pipe a background service inherits, or a
     service started with `&` holds the step at setup; pin it in the block of a service that script starts;
   - the processes listed and killed are this user's only (`pgrep -U`);
   - the probe stopped processes by the folder's name, not by process group, so §1's groups are measured
     first in this step, against a runner that leaves its workers behind.
4. **The verdict** — `ci/checks/meta/mt1-tests-can-fail.mjs` in both forms (`<folder>` and `--run`),
   `ci/fixtures/known-bad/mt1/**`, `ci/fixtures/mt1-green/` and its line in the `meta` script,
   `scripts/mt1.test.mjs`, `CHECK_HEAD` in PC1's list, FO1 leaving `tests-can-fail#` ids alone, and the
   `tests-can-fail` root script. No workflow is added or changed: W1 finds MT1 in the `meta` script (§1).
   The run is already on `main`, so `tests-can-fail` arrives with what it calls. The W1 block, the two-shares
   block, the messages block, and the "MT1 on that record" halves of step 3's blocks are proven here. Checks,
   ~450 lines with fixtures. Blocked by 3.

   Carried from the 0.2 review:
   - AR-9, check that a test whose every change was dropped never reaches the verdict's exit 2 for `tried`
     0 against the code and pin it with a test.
   - AR-13, give the fixture record the not-judged reasons it lacks (`support-only`, `other-language`,
     `excused`, `skipped`, `flaky`, `other-runner`), and pin it with a test.

   Carried from the 0.3 review:
   - AR-2, reworded for 0.4: before step 5 starts, `pnpm tests-can-fail` is run on the scratch project: on a
     branch that changes a test, on the same branch after its base moved and was merged in, and on one that
     changes no test; the 3 result lines, with both shares, go in this step's pull request.
   - AR-4, the not-judged line for `other-runner` names the entry `tests-can-fail#other-runner`.
   - AR-5, `nothing-judged` gives the next action for each reason it lists, and only `no-subject` is told
     to import by a relative path.
   - AR-10, `excuse-expired` gets its wording in the message, for an entry that names no test file too
     (`#mechanical`, `#other-runner`); the message block is scoped to findings, exits and warnings, not the
     count lines or "No tests were added or changed."; the count lines print the names the record holds,
     through the escape.

   Carried from the 0.4 review:
   - AR-11, `flaky` names two outcomes, a `notJudged` reason (§3.8) and a `tests` state (§3.9): the fixtures
     and the messages tell them apart by wording, and the two-shares block says its "1 flaky" is the
     `notJudged` one.

   Carried from the 0.5 review, as acceptance lines of this step's issue:
   - AR-4, the `flaky` finding's message (§5) does not say "by chance" when the test may have failed on state
     a shared service kept from an earlier run of its file; it names that cause beside chance.
   - AR-6, What is reused says the name is outside the `check:*` pattern on purpose (§1), not that it follows
     `check:prose`.
   - AR-7, the test that no workflow runs the step reads each workflow's run lines for the `tests-can-fail`
     root script and for `mt1-tests-can-fail.mjs --run`, not the text `tests-can-fail` anywhere (which
     `ci/tests-can-fail.yaml` would match).
   - W1's third clause: `scripts/mt1.test.mjs` is added to the `meta` script.

   Dropped with the job (D-037, amended 2026-10-14): 0.2 AR-13's check of the job's `if:`, `permissions` and
   `timeout-minutes`; 0.3 AR-1's message of the job on a commit with no script, which moves to step 5 as
   `/work-ticket`'s; 0.3 AR-2's fork pull request; 0.3 AR-10's clause on the job's checkout step.
5. **Where it fires, and what a project is told** — `/work-ticket` runs `pnpm tests-can-fail` at its quality
   gate, after the work is committed and before the pull request is marked ready, treats exit 1 or 2 as a red
   gate, and copies the result into `## Verification` as §1 says; `BOOTSTRAP.md` "Tests can fail" (the two
   files, what a project on another runner does, what to do when the step runs out of time, and that the
   step runs in `/work-ticket` and not in CI) and the `/bootstrap` step that runs it once;
   `docs/testing-strategy.md` and `process/cold-review.md` point at the step where they say "revert the
   mechanism"; L-04's enforcement becomes the check; the scratch-project run, the run on a real project, and
   the reading of the messages by someone who did not write them. Skills and docs, ~180 lines. Blocked by 4.

   Carried from the 0.2 review:
   - AR-10, check where `/work-ticket` runs the step (the project's `Quality gate` row, or the skill), that
     a project made before this is told, and that the step does not turn `/work-ticket` red in slipway on a
     pull request that changes a `scripts/*.test.mjs`, against the code and pin it with a test.
   - AR-7, nothing measures a project's not-judged share after this step's one run: file the stricter rule
     of Known limitations as a declined lesson with a `review-by` and a trigger, as L-69, so L1 holds the
     date.
   - AR-13, the reader of the messages is given the messages and nothing else, and a miss is an action
     they could not name: record both in this step's pull request.

   Carried from the 0.3 review:
   - AR-1, the sync and `BOOTSTRAP.md` tell the owner that a branch cut before the step arrived needs the
     base branch merged in; `/work-ticket` on such a branch, which has no `tests-can-fail` script, says that
     and names the action (merge the base branch into this branch), pinned with a test.
   - AR-2, reworded for 0.4: the run on a real project is `/work-ticket`'s own run of `pnpm tests-can-fail`,
     on the machine building that pull request.
   - AR-9, `BOOTSTRAP.md` names the mechanical line, when it is for, and that it counts once.
   - AR-10, `/work-ticket` copies each count of the summary that is not zero, and both shares, into the pull
     request's `## Verification`.

   Carried from the 0.4 review:
   - AR-4, `/work-ticket` starts the step so the harness never ends it first: in the background with its exit
     read when it ends, or with a timeout above the 10-minute stop plus the install and the clean-up. A run
     that ends without the step's own exit is a red gate, and `/work-ticket` then checks for the copy's
     processes. Pin both in `scripts/skills.test.mjs`.
   - AR-5, the real project's run is made from this step's branch, with the owner asked first, and recorded
     in this step's pull request; or, if the owner prefers, after this step merges and before the next version
     tag, in a pull request the real-project block then names in place of "the last build step's".
   - AR-11, what `/work-ticket` copies into `## Verification` is §1's list plus both shares, inside a fenced
     code block, so a test name with an `@name` in it notifies nobody; pin it in `scripts/skills.test.mjs`.
   - AR-11, L-04's pointer names `/work-ticket`'s line as well as MT1, and the lesson's body says the step is
     not in CI.
   - AR-11, `BOOTSTRAP.md`'s hand clean-up command names the one folder, never `tests-can-fail-` alone, which
     stops another session's run.
   - AR-11, D-037's heading, or a line under it, says the figures are in its latest amendment.
   - AR-11, the Threat model's "A test file nothing runs is a finding" reads "A test file under a test name
     that nothing runs is a finding" (the 0.3 review's AR-6).
   - From the cold review of #614: Verify's "`pgrep -f tests-can-fail-` prints nothing" names the run's own
     folder when this step's pull request runs it, since the bare prefix matches another session's run.

   Carried from the 0.5 review, as acceptance lines of this step's issue:
   - AR-1, the owner's pick: `BOOTSTRAP.md` says a service `ci/before-verify.sh` starts outside its process
     group is the project's to stop, and how (the script records what it started; the project stops it by
     that record). The two messages of step 3's AR-1 line are run once, each from its fixture, and pasted in
     this step's pull request.
   - AR-4, `BOOTSTRAP.md` says a test that needs a service from `ci/before-verify.sh` must leave it as it
     found it: one service serves every run of a test file.
   - AR-5, D-037's next amendment says `ci/before-verify.sh`'s group is kept until the run ends, as F-13 §1
     does, where its 2026-11-02 amendment says each call's group is killed on exit.

**At the split** (carried from the 0.3 review, AR-8). When #51 is split, each step's issue embeds that step's
carried lines as acceptance lines, each naming the test file that holds it (`scripts/mutation.test.mjs`,
`scripts/mt1.test.mjs`, `scripts/skills.test.mjs`). The bullets of the 0.2 review's AR-14 that have a step
get a line under that step, as the lines above did.

No step adds a CI job. `tests-can-fail` arrives in step 4 with the run behind it, and `/work-ticket` calls it
from step 5, so at no commit does `main` hold a skill that calls a script that cannot run, whether a project
takes a tag or `main` by ref. Steps 1 to 5 still land before the next version tag, so a project that takes a
tagged release gets the step with what it is told about it. Every step from 1 touches files that need the
owner's yes (`ci/**`, package scripts, skills) and says so under `## Gate changes`.

## Out of scope

- **Listing the changes no test noticed.** In the draft, withdrawn on 2026-10-12 (D-037, amended): nothing
  read the list and it spent the budget. L-69 holds it as declined work with a review date; no issue is
  filed before that date brings it back.
- **A surviving change on a changed line fails the pull request.** Deferred with the listing it depends on;
  it would also need a way to mark a change that cannot be noticed, with a reason.
- **Failing a test the step could find no code for.** The owner's pick; see Known limitations for what
  brings it back.
- **Following a crash past the test's own line**: a helper the test calls, a result read before the
  `expect`. One rule, one line (the owner's pick).
- **A CI job.** Declined 2026-10-14 (D-037): it spends a project's Actions minutes on every pull request that
  changes a test. The step runs where `/work-ticket` runs.
- **Whole-codebase runs**, and any stored baseline or score.
- **Test runners other than Vitest; Svelte, Vue and other languages' source.**
- **Reading a `test` script that is more than a plain call; following path aliases; running changes side by
  side to save time.** Each is a follow-up when a project needs it.

## Open questions

None. Step 0 and #439 answered both of 0.3's: the time was measured on the machine that now runs the step,
and the owner set the budget, the limit, the caps and the not-judged share from it (D-037, amended
2026-11-02).

## Changes

- 2026-10-08 · ADDED · the spec, from #51 · #370
- 2026-10-12 · MODIFIED · Version 0.1 → 0.2, resolving the review of the draft (`docs/reviews/2026-10-09-tests-can-fail-unversioned.md`, AR-1 to AR-16), with D-037 amended the same day. A plain crash no longer counts as a test failing, except on a line inside an `expect` of the test's own file, and a test that only crashes is a finding (measured first, on the code D-037 used). Re-exports are followed 3 levels, and a subject with nothing to change is named, not a fault. The judged tests are what a package's `test` script runs, read in two plain forms, and a changed test file nothing runs is a finding. A pull request that changes no test passes before anything is copied. `ci/before-verify.sh` runs in the copy. The record stays inside one process. A new test is one whose own call changed; rows on one line are one group; a test that fails with nothing changed is a finding. The listing of unnoticed changes is withdrawn (L-69). Out of time stays a failure, the figures are provisional, and a step 0 measures on a hosted runner before the parser. Four acceptance lines that could not fail have a pass mark. The Vitest range is stated and its output is held by recorded files. The `Version:` line was added in the commit before this one
- 2026-10-13 · MODIFIED · Version 0.2 → 0.3, resolving nine findings of the review of 0.2 (`docs/reviews/2026-10-12-tests-can-fail-0.2.md`: AR-1 to AR-7, AR-11, and the §2 sentence of AR-13) under the owner's cap of the same day, with D-037 amended. The job checks out the pull request's head commit, and a checkout that is not that commit stops the step. Lines removed from inside a test make it new. A pull request with new tests and none judged fails (`nothing-judged`). A mechanical change takes one dated entry that counts only in the pull request that adds it. Test support files, by a closed list of names, are not subjects. `never-run` is for a file a runner could list; a snapshot is never a test file. Deleted test files, files that are not tests, changes outside every test and support files left out are counted in the summary. §2 says a re-export, not an export. Step 0 has a stop line. The Build map builds the run (step 3) before the verdict and the job (step 4). AR-8, AR-9, AR-10, AR-12 and the rest of AR-13 are carried into the build as lines under their steps. Five older Acceptance lines are reworded to state a count, with no assertion changed, so #51's shape check reads them (the owner's exception to the cap); no other Contract, Acceptance or Verify text changed
- 2026-10-13 · MODIFIED · the review of 0.3 (`docs/reviews/2026-10-13-tests-can-fail-0.3.md`, AR-1 to AR-10) carried in as that review sorts each finding: lines under the Build map steps it names, a line for the split, and Known limitations lines. Four lines carried from the 0.2 review are reworded to hold what their findings asked (the review's AR-7). Version stays 0.3: no Contract, Acceptance or Verify text changed
- 2026-11-02 · MODIFIED · Version 0.3 → 0.4 (#439), after Build map step 0 crossed its stop line and the owner moved the step out of CI (D-037, amended 2026-10-14 and 2026-11-02). The `mutation` job, its checkout of the head commit, `BASE_SHA`/`HEAD_SHA` and the hosted-runner budget are removed: `/work-ticket` runs `pnpm check:mutation` before a pull request is marked ready and copies its result into `## Verification`, and MT1's fixture form runs in the `meta` script so W1 holds. The step stops every process it starts and fails a run that leaves one. A test red in the copy is run again once: red twice stops the step, red then green is not judged, `flaky`. A file stopped at a cap is named with the changes not tried. The verdict prints two not-judged shares, the rule-caused one and the total; the acceptance line holds the rule-caused one under a quarter. §7 is 2 minutes and a stop at 10, set from a re-run on the building machine. Steps 1 to 5 are re-split with no job, each with its carried lines; the lines that only applied to the job are dropped and named under step 4. The listing of unnoticed changes stays declined (L-69)
- 2026-11-02 · MODIFIED · Version 0.4 → 0.5, resolving the three findings of the review of 0.4 (`docs/reviews/2026-11-02-tests-can-fail-0.4.md`) that break a guarantee, on the owner's pick of the same day: the root script is `tests-can-fail`, outside W1's gated names (AR-1); `ci/before-verify.sh`'s process group is kept until the run ends, with an acceptance block for a service it starts (AR-2); no real project's figure or run finding beyond one sentence, and §7's budget is said against the scratch runs (AR-3). AR-4 to AR-11 are carried as lines under build steps 3, 4 and 5 and in Known limitations. The review of 0.5 is scoped to these fixes and is the last: a finding from it becomes an acceptance line in the matching build issue, and only one that changes the Contract's guarantees goes back to the owner
- 2026-11-02 · MODIFIED · the review of 0.5 (`docs/reviews/2026-11-02-tests-can-fail-0.5.md`, the last) carried in by the owner's rule: its AR-1, which changed a guarantee, went to the owner, who narrowed it to a Known limitations line with two fixture-backed lines under steps 3 and 5; its AR-2 to AR-7, and W1's third clause it named, are acceptance lines under steps 3, 4 and 5. Version stays 0.5: no Contract, Acceptance or Verify text changed
