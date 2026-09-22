---
id: L-17
date: 2026-09-21
rule: Deleting a positional parameter shifts the rest into the freed slot; check the merged tree, and prefer an options object.
failure: Two branches, each green against main, break main when both merge.
enforcement:
  status: structural
  pointer: BOOTSTRAP.md#0. Owner-only
---

Requiring branches to be up to date runs the checks on the merged tree, which no single branch can do.
