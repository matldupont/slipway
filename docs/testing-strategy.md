# Testing strategy

Read by `verify` (it runs `test` in every package), by cold review, and by anyone writing a test.

## Layers

| Layer | Where | Runs in |
|---|---|---|
| Unit | beside the code, `*.test.ts` | `pnpm verify` (`test`) |
| Integration | `tests/` in the package | `pnpm verify` as `test`, or a `test:<sub>` script CI invokes (M1 fails it otherwise) |
| Browser / e2e | `apps/web/e2e/` | a `test:e2e` script CI invokes (M1 fails it otherwise) |

## A test must be able to fail

Revert the mechanism and run that file, that case: a red suite proves some test caught it, not yours.
Commit before mutating — restoring from HEAD eats uncommitted work (L-04).

## Fixtures

A regression fixture must disagree on the axis the bug lives on: units, origin, timezone, ordering, id
namespace. Name the axis before writing the test, and generate at the boundary before generating volume (L-07).

## Rollback

A rollback or abort test asserts the pre-state, which an operation that never ran also satisfies. End each
case by releasing the block, re-running the call, and asserting the mutation lands (L-08).

## Layout

Behaviour that depends on a scroll range — sticky, scroll-linked — is measured in a real browser at two
scroll depths. Component tests have no scrollport (L-25).

## Instruments

A component-test harness paints no page around the component. Assert behaviour there; take composited
measurements (contrast, overlap) in the real page, and say which instrument owns which (L-41).
