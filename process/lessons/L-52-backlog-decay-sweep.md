---
id: L-52
date: 2026-09-21
rule: Make aged backlog visible.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: 2027-01-19
  trigger: 30 open issues, or the first issue open for 60 days
---

A scheduled sweep that labels issues untouched for 60 days. The label is the artefact; a silent sweep cannot be told from one that never ran, so it also records a heartbeat.

Reviewed 2026-11-20 (#686): trigger fired (84 open issues); built as #688. Extended to 2027-01-19.
