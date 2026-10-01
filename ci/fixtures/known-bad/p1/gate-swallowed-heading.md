## What
Lane: bounded. Tightens how a check reads a section.

## Verification
```
pnpm meta
```

## Gate changes
- `ci/checks/lib/markdown.mjs` — stricter: a test covers a `<!--` in inline code.

## Cold review
- The strip used to end at the first `-->` below its opener.
- `ci/verify.mjs` — the same: read, not changed.

## Links
Closes #12
