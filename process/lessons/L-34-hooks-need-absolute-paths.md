---
id: L-34
date: 2026-09-21
rule: Every hook command uses an absolute path, and is tested with sh -c.
failure: A hook that fails silently (no PATH) looks identical to one that ran and printed nothing.
enforcement:
  status: prose
  pointer: process/harness/README.md#Hooks
  review-by: +90d
---

Hooks run under /bin/sh, which reads none of your shell configuration.
