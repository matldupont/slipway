---
id: L-69
date: 2026-10-12
rule: List the changes to a pull request's own lines that no test noticed, with someone named to act on the list.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: 2027-01-12
  trigger: a bug that reached `main` is traced to a changed line no test noticed, or a project asks for the list
---

F-13 first shipped this list as warnings in a job log (D-037, 2026-10-08). Nothing read them, and the listing spent the time the step's limit is racing, so the amendment of 2026-10-12 withdrew it: the step fails a new test that cannot fail, and does nothing else. If it comes back, it needs a reader and a way to mark a change no test can notice; failing a pull request on one is the stricter form F-13 keeps out of scope.
