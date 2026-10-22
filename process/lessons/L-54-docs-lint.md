---
id: L-54
date: 2026-09-21
rule: Lint docs for a declared reader, resolving citations, and generated-or-frozen status.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: +60d
  trigger: the first doc that cites code paths, or the first generated doc
---

Every doc declares who reads it or lives in an archive folder; every cited path resolves; a generated doc is regenerated in CI and diffed, or marked frozen at a sha. A doc nobody reads rots, and misleads the agent that does read it.
