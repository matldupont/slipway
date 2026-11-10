---
id: L-04
date: 2026-09-21
rule: Mutation-test the specific test, not the suite, and commit before mutating.
failure: A new test that cannot fail reads as coverage; restoring files from HEAD to mutation-test destroys uncommitted work.
enforcement:
  status: check
  pointer: mt1
---

A red suite proves some test caught the mutation, not yours. Restoring from HEAD silently eats uncommitted work.

MT1 fires the rule (F-13, D-037), run by `pnpm tests-can-fail`: `/work-ticket` runs it with its gate (`process/intake.md` → Tests can fail), before a pull
request is marked ready, and it changes the code in a copy of the last commit, never the working tree. It is not in
CI: a pull request built another way is not checked, and a test the step names not judged is still reverted by
hand.
