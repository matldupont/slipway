# The tests-can-fail measurement — F-13 Build map step 0

A probe, not the step. `dev/**` is `internal` in `dev/ownership.yaml`: nothing here ships, no workflow on
`main` runs it, and `pnpm meta` does not read it. It answers the three questions
`dev/features/tests-can-fail.md` asks before the build starts: the time on a hosted runner, the share of new
tests left not judged, and whether Vitest's output reads as §8 assumes. D-037 holds the figures.

## What is here

| path | what it is |
|---|---|
| `measure.mjs` | the Contract's rule applied to one change; prints a record as JSON |
| `scratch/base.patch` | the scratch project's base: the default app (Vite, React, TypeScript, Vitest with jsdom) with tests, as a diff against an empty tree |
| `scratch/change.patch` | the change measured: 10 source files (5 edited, 5 new) and their tests |
| `scratch/vitest-4.patch` | moves the base from Vitest 5.0.3, which it pins, to Vitest 4.1.11 (`package.json` and the lockfile) |
| `recorded/` | one real output of each thing the step reads from the runner, for Vitest 4.1.11 and 5.0.3: a listing, a passed result, and a failed test of each kind. Step 3 moves what it needs to `scripts/fixtures/vitest/`. `<copy>` stands for the temporary folder the run was in |

The scratch project is the one D-037 measured on 2026-10-08, kept as text a person can read. Left out of it:
the one binary image of the scaffold, which no test loads, and the Stryker packages and their configs. Added
to it: a root `.gitignore`, and one planted test in `inventory.test.ts` whose only failure is a `TypeError` on
a line inside its `expect` (§8's fourth kind), so the change is not byte for byte the one of 2026-10-08.
Three tests are planted so the rule has something to find: one never calls the code, one swallows what the
code does, one asserts only on its own input.

## Run it

```bash
tmp=$(mktemp -d) && git -C "$tmp" init -q -b main
git -C "$tmp" apply "$PWD/dev/probes/tests-can-fail/scratch/base.patch"     # then vitest-4.patch, for Vitest 4
git -C "$tmp" add -A && git -C "$tmp" commit -q -m base
git -C "$tmp" apply "$PWD/dev/probes/tests-can-fail/scratch/change.patch"
git -C "$tmp" add -A && git -C "$tmp" commit -q -m change
(cd "$tmp" && pnpm install --frozen-lockfile)                               # fills the store the copy installs from
node dev/probes/tests-can-fail/measure.mjs "$tmp" HEAD~1 HEAD
```

`--counts-only` prints no test name, path or commit, and an error it did not foresee prints one fixed line.
`failureKinds` still names the error classes the project's code throws. `--record <folder>` saves the runner
outputs, test names and failure messages included, whatever else is passed: on a private project, point it
outside any repository, never under this one. `--no-setup` skips `ci/before-verify.sh`. `--call "<words>"`
adds words to every runner call.

`--run-limit <s>` sets the time limit of one runner call, a whole number of seconds (120 when not given).

**It leaves nothing running** (#439). Step 0's runs left two test-runner processes at about 80% of a core for
days. The probe starts the test runner by its path inside its copy (`tests-can-fail-probe-*` in the temporary
directory), so the runner and its workers name that folder in their command lines. After each call, and on
exit, it kills each of this user's processes whose command line names the folder (the path escaped, since
`pgrep` reads a regular expression). A process started by plain name from inside the copy (`pnpm`, `bash`, a
`node server.mjs &` in `ci/before-verify.sh`) does not name it, and is neither stopped nor counted: a
`leftProcesses` of 0 says only that nothing naming the folder is left. What `ci/before-verify.sh` leaves running
is a service the tests need, as F-13 §1 has it: it is kept until the run ends. The script's output is not
piped, so a service it starts with `&` does not hold the probe at setup. Then `pgrep -f` on the folder
must find none: the record's `leftProcesses` is that count, a run that leaves one is exit 2, and a `pgrep` that
cannot answer is exit 2 too, never a zero. `PROBE_NO_SWEEP=1` turns the killing off, to see the check go red;
what the run started is then left running, the folder is kept, and both are stopped and removed by hand as
below.

Ctrl-C, or a closed terminal, reaches the runner too: the call in flight ends, and the probe cleans up and
exits 130. A TERM to the probe alone is held until the run ends, which then cleans up as usual. A SIGKILL to the
probe can leave the copy and what runs in it. The probe names its folder on stderr when it makes it
(`tests-can-fail probe: copy in <folder>`); with `--counts-only` it does not, so list the candidates with
`ls -dt "$(cd "${TMPDIR:-/tmp}" && pwd -P)"/tests-can-fail-probe-*`, which prints the resolved path the
processes carry (a plain `$TMPDIR` on macOS ends in `/` and gives `//`, which matches nothing). Take your own
run's folder, never simply the newest: another session's may be newer. Then stop that one run's processes with
`pkill -f '<that folder>'`, escaping any `+ ( ) [ ] { } . ^ $ | ? * \` in it, and remove the folder. Never
`pkill -f tests-can-fail-probe-` alone: it stops another session's run too. The project's own checkout is never written.

## What it applies, and what it leaves out

Applied: §3.1 (the diff, hunks that only remove lines), §3.2, §3.4 (a copy of the commit outside the project,
an offline install, `ci/before-verify.sh`), §3.5, §3.6 whole (the support list included), §3.8, and from §3.9
both caps of 30, what a failure counts for and the untouched run after; its order with the departure below.

Where the probe departs from the Contract beyond the cut below (a reviewer's reading at the step 0 pull
request; none moves the not-judged share): a group of rows (`it.each`) is credited when any row's failure
counts, not the first listed; every `body` change is tried before any other kind, and the pull request's own
lines come first within each kind; and `expect.any(…)` and the like count as `expect` spans. Each of those can
move the seconds. A file is in `outsideAnyTest` only when none of its tests is new, which moves that count
alone.

Left out, and what each could move:

- **The parser.** It reads source with the judged package's own TypeScript compiler API, not the
  `@babel/parser` file step 1 vendors. The count of changes a file gets can differ, and so the seconds.
- **`runnerCall()`.** The runner is `node_modules/.bin/vitest` in the package; the `test` script is not read.
  A project whose script passes arguments gives them with `--call`.
- **`ci/tests-can-fail.yaml` and `ci/exceptions.yaml`.** Nothing is kept out, excused or mechanical, so no
  test is `kept-out`, `excused` or `mechanical`, and a package on another runner is always `other-runner`.
- **The stop at 600 seconds.** It runs to the end and reports `notFinishedAt600s`, the tests a stop would
  have left.
- **Every exit 2 of §3.** A new test that is red in the clean copy is counted as `red-in-copy` and the run
  goes on. That reason is not one of the Contract's: it is kept apart so a project whose tests need setup the
  copy lacks does not show a not-judged share the rule did not cause. The summary gives the share with and
  without it.
- **AR-8's direction** (the 0.3 review): a failure whose first word is not an error's name counts for
  nothing here, and is tallied under `failureKinds`.
