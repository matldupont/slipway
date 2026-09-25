# <Product> — skill configuration

Agent instructions: `CLAUDE.md`.

## Skill Configuration

Read by `/log-feature`, `/log-bug`, `/log-followup` and `/work-ticket`. **Fill every `<…>` at bootstrap.**
Without values those skills fall back to another product's defaults — its repository, board and paths.

| Key | Value |
|-----|-------|
| Product name | `<Product>` |
| Issue repo | `<owner/repo>` |
| GitHub project (`--add-project`) | `<project name>`, or none |
| PRD path | `docs/PRD.md` |
| Feature docs dir | `docs/features/` |
| Milestone roadmap | `docs/milestones/` — one file per milestone; the active one is named by `pnpm status` |
| Product frame | `docs/product/FRAME.md` — the question every feature must serve |
| Change lanes | `process/slipway-rules.md#Lanes` — trivial, bounded, feature |
| Marketing context | none |
| Domain invariants doc | `<docs/domain-invariants.md, or none>` — none if the product has no money or other correctness-critical math; a path here makes the skills require property tests on that math |
| Conventions doc | `docs/conventions.md` — the one way to do each recurring thing; duplicates and violations are `[FIX]` in review |
| Testing strategy doc | `docs/testing-strategy.md` |
| Effort decision-tree | `process/designation.md` |
| Quality gate | `pnpm verify && pnpm meta` |
| Timezone | `<local, or an IANA zone like America/Toronto>` — `pnpm status` and the date checks read "today" in it; CI runs in UTC, so `local` there is UTC |
| Domain map | `apps/web/**` → frontend · `packages/**` → shared |
| Stack constraints | `CLAUDE.md`, then the nearest `AGENT.md` walking up from the working directory |
| Project field mapping | none — add board fields only when a check or a person actually reads them |
