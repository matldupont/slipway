# Recorded Vitest outputs — F-13 §8

One real output of each thing the tests-can-fail step reads, one folder per Vitest major: `4` is 4.1.11 and `5` is
5.0.3, recorded by the probe in `dev/probes/tests-can-fail/` (#439) from its scratch project and moved here unedited.
`<copy>` stands for the temporary folder the run was in.

| file | what it is |
|---|---|
| `listing.json` | part of `vitest list --json --includeTaskLocation` |
| `result-passed.json` | a `--reporter=json` result of a file whose tests passed |
| `failure-AssertionError.json` | a failed test: an assertion failure (counts) |
| `failure-TestingLibraryElementError.json` | a failed test: a query that found no element (counts) |
| `failure-crash.json` | a failed test: a `TypeError` whose first frame is in the code (does not count) |
| `failure-TypeError-in-expect.json` | a failed test: a `TypeError` whose first frame is in the test file, inside an `expect` (counts) |
| `failure-Error.json` | a failed test: a plain `Error` from a matcher (counts) |

`ci/checks/lib/runner-output.mjs` is tested on these files (`scripts/mutation.test.mjs`), and the stand-in runner of
that test answers with them. A major with no folder here is one the step refuses before it runs anything
(`RECORDED_MAJORS`).
