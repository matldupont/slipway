---
id: L-55
date: 2026-09-21
rule: Fail when a TypeScript file is in no typecheck program.
failure: deferred component, not yet built
enforcement:
  status: declined
  review-by: 2027-01-19
  trigger: the first TypeScript file outside every tsconfig include
---

Test files and CI code that sit outside every typecheck fail only at runtime.

Reviewed 2026-11-20 (#686): slipway has no typecheck program; the only TS is one skill helper and mutant fixtures, so no file escapes a tsconfig. Mechanise when slipway adds a tsconfig. Extended to 2027-01-19.
