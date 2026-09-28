## What
Lane: bounded. Adds a package.

## Verification
```
pnpm verify
```

## Gate changes
- `packages/api/tsconfig.json` — the same: copied from `apps/web/tsconfig.json` with only the paths changed.
- `ci/exceptions.yaml` — loosens: one job may fail open until 2026-12-31, D-016 allows it.
- `package.json` scripts — stricter: `test` now runs the new package's tests.
## Links
Closes #12
