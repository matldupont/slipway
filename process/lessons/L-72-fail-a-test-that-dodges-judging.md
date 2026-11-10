---
id: L-72
date: 2026-11-09
rule: Fail a pull request whose new test is not judged because of how it imports its subject, not only list it.
failure: deferred component, not yet built — a test that imports its subject by a path alias or a dynamic import is named not judged and passes, so a weak test can dodge the check (F-13, Known limitations)
enforcement:
  status: declined
  review-by: +90d
  trigger: a project's not-judged share for a reason the step causes stays under the quarter D-037 holds, and its owner asks to fail on it
---

`pnpm tests-can-fail` lists a test it could find no code for, and fails nothing on it: the owner chose that over
failing tests that were fine (D-037). Nothing measures a project's not-judged share after F-13's one run on a real
project, so this date brings it back. The stricter rule is a later ticket, built only on that ask.
