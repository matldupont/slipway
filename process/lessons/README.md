# Lessons

A lesson is a rule that was paid for. Recorded lessons that nothing enforces get re-learned, so every
lesson here states where it lives, and **L1 checks that the statement is true.**

One file per lesson:

```yaml
---
id: L-44
date: 2026-10-02
rule: one sentence, testable
failure: the failure it prevents, in one sentence (cite the issue, PR or commit where it cost you)
enforcement:
  status: check | structural | artifact | prose | declined
  pointer: a check id (m1), a path, or path#Heading
  review-by: YYYY-MM-DD or +90d        # prose and declined
  trigger: the event that reopens it    # declined only
---

Why it matters, in two or three sentences.
```

| status | meaning |
|---|---|
| `check` | a mechanism fires on violation — a CI check, or harness config once installed |
| `structural` | the failure cannot happen once bootstrap is done |
| `artifact` | a template slot exists and a check requires it filled; the content is judgment |
| `prose` | judgment only; the pointer says where it is written, the review date brings it back |
| `declined` | deliberately not built yet: deferred work, with the trigger that should reopen it |

`+Nd` dates count from `process/anchor`, which bootstrap sets to the project's start. When a review date
passes, L1 fails until the lesson is mechanised, extended with a reason, or deleted.

The seed lessons L-01 to L-43 are failure patterns common to agent-assisted projects; L-50 to L-60 are
deferred components; L-61 onward came with the kickoff workflow (frame, milestones, the Stop gate, analytics).
