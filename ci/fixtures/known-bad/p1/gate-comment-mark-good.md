## What
Lane: bounded. Tightens how a check reads a section.

## Verification
```
pnpm meta
```

## Gate changes
- `ci/verify.mjs` — the same: a comment reworded.
- `ci/checks/lib/markdown.mjs` — stricter: a test covers a `<!--` in inline code.

## Cold review
- The strip used to end at the first `-->` below its opener.
- `ci/verify.mjs`: nothing loosened.

## Links
Closes #12
