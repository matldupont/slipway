---
id: L-12
date: 2026-09-21
rule: Before running a manual QA path, read the predicate that gates the behaviour.
failure: A manual QA step describes a sequence that cannot produce its expected result, and is ticked green anyway.
enforcement:
  status: prose
  pointer: docs/qa/README.md
  review-by: +90d
---

"Then immediately" asserts a timing window that usually does not exist.
