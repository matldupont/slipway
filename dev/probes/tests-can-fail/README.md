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

`--counts-only` prints no test name, path or commit. `--record <folder>` saves the runner outputs.
`--no-setup` skips `ci/before-verify.sh`. `--call "<words>"` adds words to every runner call.

## What it applies, and what it leaves out

Applied: §3.1 (the diff, hunks that only remove lines), §3.2, §3.4 (a copy of the commit outside the project,
an offline install, `ci/before-verify.sh`), §3.5, §3.6 whole (the support list included), §3.8, and §3.9 (the
order, both caps of 30, what a failure counts for, the untouched run after).

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
