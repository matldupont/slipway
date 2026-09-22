---
id: M1
status: shaping
kind: skeleton
appetite: 2026-01-01..2026-01-07
---

# M1 — Walking skeleton

> Pre-filled: every project's first milestone is the same shape. Replace the placeholders,
> set the appetite (a few days to a week), and set `status: active` when you start.

## Why

Prove the whole path works before any layer gets deep: a real user action travels UI → API →
storage → back, deployed to production by CI, behind the gates. This is also where the
decisions in `decisions.md` marked *(week 1)* stop being opinions — a stack choice that
cannot carry the skeleton is cheap to change now and expensive in month three.

## Contents

1. Scaffold the app (BOOTSTRAP §1) and deploy it through CI, `pnpm verify` on the exact tree
   that ships. (no feature: infrastructure)
2. Sign in, then the one core action of the product, thinnest possible: <…the smallest
   version of the answer to the question in FRAME.md…> (F-<…>)
3. Persist it and read it back, with the data model's one-way doors decided (IDs, money and
   time types, owner/tenant key). (F-<…>)
4. Error tracking and analytics wired, with consent: the events in `docs/product/metrics.md`
   for this path fire in production. (no feature: instrumentation)
5. One end-to-end test of that path, run by CI against the deployed tree. (no feature: gate)

## No-gos

- Styling beyond design tokens. No component library.
- A second feature, however small.
- Performance work, caching, admin tooling.

## Rabbit holes

- Deploy pipeline yak-shaving: use the platform default, promote the same build.
- Auth edge cases (reset, social providers): the provider's defaults only.

## Gate

- The end-to-end test passes against the production URL, in CI.
- An analytics event from that test is visible in production analytics.
- The acceptance run in BOOTSTRAP §3 is complete.

## Kill criteria

- The appetite ends with the path not deployed: the stack choice is wrong or too heavy.
  Revisit the week-1 decisions now, record the change, reshape M1.

## Retro
