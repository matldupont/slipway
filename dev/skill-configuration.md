# slipway — skill configuration

Slipway's own settings for `/log-feature`, `/log-bug`, `/log-followup`, `/work-ticket` and `/pr-review`,
read first by `process/intake.md` → Configuration. The root `AGENT.md` is the template every new project
fills in, so its placeholders stay; this file is `internal` in `dev/ownership.yaml` and no project receives
it. `scripts/skills.test.mjs` fails when a key `process/intake.md` lists is missing here, or a value is still
`<…>`. `Timezone` is not a skill key: `pnpm status` reads it from `AGENT.md`.

## Skill Configuration

| Key | Value | What it controls |
|-----|-------|------------------|
| Product name | `slipway` | the product's name in issue and PR prose |
| Issue repo | `matldupont/slipway` | the repository every issue is filed in and every `gh` command targets |
| GitHub project | none | the board new issues are added to; none skips the board |
| PRD path | none — slipway has no PRD of its own (`docs/PRD.md` is the template); each feature doc in `dev/features/` carries its F-ID and the decision in `decisions.md` behind it | where a feature's F-ID goes, and what intake checks a feature against |
| Feature docs dir | `dev/features/` | where feature docs and bug-fix stubs are written |
| Milestone roadmap | none — no milestone is active in slipway by design (`docs/milestones/` is the template); work runs under epic #43, in the order its body gives | where the active milestone is found, and the milestone docs intake checks for work the new issue changes |
| Product frame | `SLIPWAY.md` — its thesis: a rule exists only where something fires | the first challenge a new feature must pass |
| Change lanes | `process/slipway-rules.md#Lanes` — trivial, bounded, feature | the lane an issue and its PR are sized to |
| Marketing context | none | the positioning questions a new feature is asked; none skips them |
| Domain invariants doc | none | the rules a change must not break; none makes the skills check data integrity instead |
| Conventions doc | `CLAUDE.md` → Working rules, and the lessons in `process/lessons/` (`docs/conventions.md` is the template) | what new code must reuse; review makes the PR fix a duplicate or a violation |
| Testing strategy doc | `CLAUDE.md` → Gates — tests are `*.test.mjs` and `*.test.ts` files and `ci/checks/**`, each run by `pnpm meta`; a new check needs a known-bad fixture under `ci/fixtures/known-bad/` | which test type and path a missing test is filed under |
| Effort decision-tree | `process/designation.md` | the mode, model and effort line on every issue |
| Quality gate | `pnpm meta` — `pnpm verify` exits 2 here ("no workspace packages") by design | the commands `/work-ticket` runs before a PR is called done |
| Domain map | `ci/**` → checks · `scripts/**` → new-project and sync · `.claude/skills/**` → skills · `process/**` → rules · `dev/**` → planning · `site/**` → site | how `/work-ticket` splits a change into areas and orders them |
| Stack constraints | `CLAUDE.md`, then the nearest `AGENT.md` walking up from the working directory | the rules each area's code follows |
| Project field mapping | none | the board fields set on each new issue; none sets none |
| Labels | `feature: enhancement · bug: bug · docs: documentation` | the label each kind of issue gets |
| Issue milestone | none | the GitHub milestone new issues are put in |
| QA plans | none | where a change a person would test gets its manual test journey; none skips that step |
| Cold review | `process/cold-review.md` | how `/work-ticket` reviews its own PR, from a fresh context, before marking it ready |
| Error tracker | none | the tracker a bug's repro and stack are pulled from first; none skips that step |
