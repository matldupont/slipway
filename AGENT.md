# <Product> — skill configuration

Agent instructions: `CLAUDE.md`.

## Skill Configuration

Read by `/log-feature`, `/log-bug`, `/log-followup` and `/work-ticket`. **Fill every `<…>` at bootstrap.**
A row left as `<…>` or deleted, the skills stop and ask for it. A row added in a later slipway and missing here
takes the default in `process/intake.md` → Configuration; add the row to change it.

| Key | Value | What it controls |
|-----|-------|------------------|
| Product name | `<Product>` | the product's name in issue and PR prose |
| Issue repo | `<owner/repo>` | the repository every issue is filed in and every `gh` command targets |
| GitHub project | `<project name>`, or none | the board new issues are added to (`gh issue edit --add-project`); none skips the board |
| PRD path | `docs/PRD.md` | where a feature's F-ID goes, and what intake checks a feature against |
| Feature docs dir | `docs/features/` | where feature docs and bug-fix stubs are written |
| Milestone roadmap | `docs/milestones/` — one file per milestone; the active one is named by `pnpm status` | which milestone a new issue belongs to, and the milestone docs intake checks for work the new issue changes |
| Product frame | `docs/product/FRAME.md` — the question every feature must serve | the first challenge a new feature must pass |
| Change lanes | `process/slipway-rules.md#Lanes` — trivial, bounded, feature | the lane an issue and its PR are sized to |
| Marketing context | none | the positioning questions a new feature is asked; none skips them |
| Domain invariants doc | `<docs/domain-invariants.md, or none>` — none if the product has no money or other correctness-critical math | the rules a change must not break; a path here makes the skills require property tests on that math, none makes them check data integrity instead (who owns a row, quantities never negative, locked states, retries that repeat nothing) |
| Conventions doc | `docs/conventions.md` — the one way to do each recurring thing | what new code must reuse; duplicates and violations are `[FIX]` in review |
| Testing strategy doc | `docs/testing-strategy.md` | which test type and path a missing test is filed under |
| Effort decision-tree | `process/designation.md` | the mode, model and effort line on every issue |
| Quality gate | `pnpm verify && pnpm meta` | the commands `/work-ticket` runs before a PR is called done |
| Timezone | `<local, or an IANA zone like America/Toronto>` | the day `pnpm status` and the date checks call "today"; CI runs in UTC, so `local` there is UTC |
| Domain map | `apps/web/**` → frontend · `packages/**` → shared | how `/work-ticket` splits a change into areas and orders them |
| Stack constraints | `CLAUDE.md`, then the nearest `AGENT.md` walking up from the working directory | the rules each area's code follows |
| Project field mapping | none | the board fields set on each new issue; none sets none. Add fields only when a check or a person actually reads them |
| Labels | `feature: enhancement · bug: bug · docs: documentation` | the label each kind of issue gets; the defaults are the labels GitHub creates in every repository |
| Issue milestone | none | the GitHub milestone new issues are put in: none, or `active` for the one titled with the active milestone's id (`M2`) |
| QA plans | `docs/qa/` | where a change a person would test gets its manual test journey; none skips that step |
| Cold review | `process/cold-review.md` | how `/work-ticket` reviews its own PR, from a fresh context, before marking it ready |
| Error tracker | none | the tracker a bug's repro and stack are pulled from first; none skips that step |
