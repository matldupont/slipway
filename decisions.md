# Decisions

A ruling that lives only in a closing comment or a chat transcript gets re-litigated. Record decisions here as they are made.

Each entry: ID · status · decision · why · consequences · supersedes. Superseded entries stay, struck through.
Slipway's decisions are `D-<n>`; add this project's own as `PD-<n>` (`PD-1`, `PD-2`…), so a slipway sync
never collides with them (D-015).

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

## D-015 — Projects take slipway updates by a locked, declared sync *(decided 2026-09-23)*

A project must be able to take a newer slipway without losing anything, and without a merge that needs
judgment on every file. Most of what slipway ships is prose, where a three-way merge is least reliable.

- **Ownership is declared.** Every shipped path has a class: `managed` (slipway's; replaced on sync),
  `seeded` (written once at creation, never touched again — the PRD, FRAME, the answers to D-001–D-014),
  or `merged` (structured: `package.json` scripts, settings keys, marked blocks in `CLAUDE.md`). A check
  fails on a shipped path with no class.
- **Managed files are locked; projects extend, not edit.** Each project records the version it is on and
  a hash per installed file. A check fails when a managed file differs from its hash, unless the path is in
  an overrides list with a reason. Slipway provides extension points (local checks, a project section in
  `CLAUDE.md`, project skills beside the shipped ones), so an override is the exception, not the way to
  customise.
- **IDs are owned by prefix.** Slipway keeps `L-` and `D-`, so existing citations stay valid; a project's
  own lessons and decisions are `PL-` and `PD-`. The sync never renumbers: that would break every old link.
- **Script plus skill.** A zero-dependency script does the sync — refuses a dirty tree, works on a branch,
  lands through a PR, prints a plan first, merges instead of overwriting any file that changed, never
  touches `seeded` files, and keeps a removed file the project edited. A skill wraps it for what needs
  judgment: conflicts in prose, migrations written as steps, and the PR's `## Verification`.

Consequences: releases are tagged, with a changelog and per-version migrations. Projects created before
this adopt it once, taking their base version from the `chore: start from slipway <sha>` commit, and
move their own lessons and decisions (the ones slipway does not ship) to `PL-`/`PD-`; slipway's own
`L-`/`D-` IDs, `L-57` onward included, stay as they are. Declined: free edits with a merge on every sync (drift makes
each sync costlier until projects stop syncing), and shipping skills and checks as a plugin and a package
(it conflicts with SLIPWAY.md's self-containment; revisit if the merge surface stays large).

## D-016 — Project state for non-technical readers is a generated page, not a board *(decided 2026-09-24)*

A project's non-technical members need to see where things stand without reading issues or `STATE.md`.

- **Generated, read-only.** A static page built from `docs/milestones/` by the same lib `pnpm status`, MS1
  and K1 read. Nobody edits it, so it cannot drift. A GitHub Projects board was declined: a second,
  hand-kept source of truth goes stale, which is what `pnpm status` exists to prevent.
- **Built, not served.** CI rebuilds it on every push to `main` and once a day, for the day count.
  Rendering per request (a Worker) was declined: `main` changes only on a push, so it adds a runtime, a
  token and a second reader of the repo for no fresher content. Reopen it if the page ever shows live
  GitHub state (open PRs, CI).
- **Opt-in, and an allowlist.** Off unless AGENT.md turns it on. Only milestone-level fields are
  published; decisions, risks, questions and issues never are.

Consequences: the first host is GitHub Pages, public but `noindex`, which is not access control. A
private page (Cloudflare Access) is a later value of the same AGENT.md key. Spec: `dev/features/roadmap-page.md`.

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

## D-014 — Code health: dead code, duplication, boundaries *(open — week 1)*

Agents duplicate by default and rarely refactor unasked, so cohesion needs something that fires.
Template defaults, installed in M1 and run in CI as `check:*` scripts (M1 fails one no workflow
runs): **knip** (unused files, exports, dependencies) and **jscpd** (duplicated blocks), each
through `ci/ratchet.mjs` so existing debt never blocks work but new debt fails; and
**dependency-cruiser** for boundaries (packages never import apps, features do not reach into
each other's internals, one data layer). Recurring choices go in `docs/conventions.md`.

## D-013 — Deploy and promotion *(open — week 1)*

Build once, promote the same artifact; the deploy runs `pnpm verify` on the exact tree it ships.
