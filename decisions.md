# Decisions

A ruling that lives only in a closing comment or a chat transcript gets re-litigated. Record decisions here as they are made.

Each entry: ID · status · decision · why · consequences · supersedes. Superseded entries stay, struck through.

## D-001 — Can `main` be protected on this plan? *(open — owner, BOOTSTRAP §0)*

Required status checks may not be available for private repositories on every GitHub plan. **Decide by
attempting it**, not by reading documentation. If it is unavailable, record the accepted risk here. The
fallback already exists: CI runs on `push: main` as well as on pull requests, so a direct push is at least
detected.

## D-002 — The process leans on GitHub *(accepted)*

Issue forms, required checks, Actions workflows. Moving platform reopens intake, the merge gate and every
check wired to an event. Accepted concentration risk.

## D-003 — `verify` runs every task in every package, unfiltered *(decided 2026-09-10)*

No affected-package filtering at day 0. A filtered runner can skip dependents
(`--filter='[HEAD^1]'` without `...`) and exit 0 having run nothing when no package matches. Revisit when
CI time is a measured problem.

## D-004 — Meta checks are zero-dependency *(decided 2026-09-10)*

`ci/checks/` runs on bare Node with no install step, so the harness that proves the other gates cannot be
broken by a dependency. Cost: YAML is read as a declared subset, and anything outside it exits BROKEN.

## Week 1 — decide before M1 closes

The choices that are expensive to reverse. Each one changed after data and code depend on it — framework,
API layer, ORM, auth provider, time types, table names, the tenancy model — costs a migration. Decide each in week 1 — by
building the walking skeleton on it — or defer it explicitly with the event that reopens it.
Replace each stub with a normal entry when decided.

## D-005 — Frontend framework *(open — week 1)*

Template default: React + Vite, scaffolded at bootstrap (§1) so `verify` can run. Replacing it before M1
costs nothing; after, it costs a migration. One framework for every app in the repo.

## D-006 — API layer and hosting *(open — week 1)*

Template default: Cloudflare.

## D-007 — Database, ORM, and who owns migrations *(open — week 1)*

One package owns migrations; nothing else runs them.

## D-008 — Auth provider *(open — week 1)*

## D-009 — Money and time types *(open — week 1)*

Integer minor units plus a currency code, never floats; a date type for calendar days and a
timestamp-with-zone for instants. Property-test the math (`docs/domain-invariants.md`).

## D-010 — Identity and tenancy *(open — week 1)*

The owner key on every row — user, household, organisation — even if sharing ships much later.

## D-011 — Internationalisation *(open — week 1)*

Plumbing (message keys, `Intl` formatting, locale-aware routes) is cheap on day one and costly
to retrofit. Translations can wait for demand.

## D-012 — Analytics, error tracking and consent *(open — week 1)*

Which tools, where data is stored, and how consent is asked. Events: `docs/product/metrics.md`.

## D-013 — Deploy and promotion *(open — week 1)*

Build once, promote the same artifact; the deploy runs `pnpm verify` on the exact tree it ships.
