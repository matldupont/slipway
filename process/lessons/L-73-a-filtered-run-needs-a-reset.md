---
id: L-73
date: 2026-11-21
rule: Narrow a slow tests-can-fail run to the tests still open only with a reset of the project's state before each run that counts.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: 2026-12-18
  trigger: a project's run ends out-of-time with its limit at the top of the range
---

#681 built a run filtered to the new tests still open, to save time on slow test files. A filtered run skips the hooks of the tests it leaves out, so it can leave state behind, such as a row in a database, and a later whole-file run can read that state as a kill. Running the file whole and untouched in between shows only that the unchanged code tolerates the state, not that it is gone. Two review rounds in a row broke it on real Vitest 4 and 5, so the owner removed it in #691 and kept the time limit. If it comes back, it needs a reset the project declares, since the step cannot reset a project's database.
