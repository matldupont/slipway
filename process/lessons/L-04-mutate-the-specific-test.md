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

MT1 fires the rule (F-13, D-037), run by `pnpm tests-can-fail`. `/work-ticket` runs it with its gate (`process/intake.md`
→ Tests can fail), before a pull request is marked ready. It changes the code in a copy of the last commit, never the
working tree. It is not in
CI: a pull request built another way is not checked. Each new or changed test it did not judge is still reverted by
hand: the list is `process/intake.md` → Tests can fail, What it does not cover. It includes every new or changed test in
the diff that the step does not name as judged, whatever count it prints: find them in the diff, never from the step's
count.
