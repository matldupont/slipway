# Walkbook — skill configuration

Agent instructions: `CLAUDE.md`.

## Skill Configuration

| Key | Value | What it controls |
|-----|-------|------------------|
| Product name | `Walkbook` | the product's name in issue and PR prose |
| Issue repo | `example-org/walkbook` | the repository every issue is filed in and every `gh` command targets |
| GitHub project | none | the board new issues are added to |
| PRD path | `docs/PRD.md` | where a feature's F-ID goes, and what intake checks a feature against |
| Feature docs dir | `docs/features/` | where feature docs and bug-fix stubs are written |
| Milestone roadmap | `docs/milestones/` — one file per milestone | where the active milestone is found |
| Product frame | `docs/product/FRAME.md` | the first challenge a new feature must pass |
| Change lanes | `process/slipway-rules.md#Lanes` — trivial, bounded, feature | the lane an issue and its PR are sized to |
| Marketing context | none | the positioning questions a new feature is asked |
| Domain invariants doc | none | the rules a change must not break |
| Conventions doc | `docs/conventions.md` | what new code must reuse |
| Testing strategy doc | `docs/testing-strategy.md` | which test type and path a missing test is filed under |
| Effort decision-tree | `process/designation.md` | the mode, model and effort line on every issue |
| Quality gate | `pnpm verify && pnpm meta` | the commands `/work-ticket` runs before a PR is called done |
| Timezone | `America/Toronto` | the day `pnpm status` calls "today" |
| Domain map | `apps/web/**` → web · `apps/api/**` → api | how `/work-ticket` splits a change into areas |
| Stack constraints | `CLAUDE.md`, then the nearest `AGENT.md` | the rules each area's code follows |
| Project field mapping | none | the board fields set on each new issue |
| Labels | `feature: enhancement · bug: bug · docs: documentation` | the label each kind of issue gets |
| Issue milestone | none | the GitHub milestone new issues are put in |
| QA plans | none | where a change a person would test gets its manual test journey |
| Cold review | `process/cold-review.md` | how `/work-ticket` reviews its own PR |
| Error tracker | none | the tracker a bug's repro and stack are pulled from first |
