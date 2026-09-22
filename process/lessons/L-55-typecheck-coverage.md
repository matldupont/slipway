---
id: L-55
date: 2026-09-21
rule: Fail when a TypeScript file is in no typecheck program.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: +60d
  trigger: the first TypeScript file outside every tsconfig include
---

Test files and CI code that sit outside every typecheck fail only at runtime.
