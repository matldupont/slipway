---
prd-ref: D-018
status: draft
---

# F-04 — Intake and ticket skills ship with slipway, and intake asks what else it changes

## Problem

Step 5 of the path (the build loop) and the feature lane name `/log-feature`, `/log-bug`, `/log-followup` and
`/work-ticket`. Slipway doesn't ship them: they are the author's personal skills (906, 740, 307 and 828 lines),
configured through `AGENT.md` but written around one private product, whose repository, board, paths, stack
rules and tools are their fallbacks. Anyone else starting from slipway hits a dead end at step 5. D-018 reverses
"slipway must work without personal skills".

The personal versions also have a gap: intake only goes one way. They file the new issue and link it to its
parent, but never ask which **existing** work it changes. On 2026-09-24, filing three follow-ups from one real
sync took four hand edits that nothing prompted: the epic's Order text, a later issue's dependencies and
acceptance, a closed issue whose last acceptance line was still unmet, and the steps of the project's next task.

**Job:** when I start a project from slipway and reach the build loop, I want the intake and ticket skills to be
there, configured for my project, and to tell me which of my existing issues a new one changes, so I can keep
building without hand-porting someone else's skills or hand-editing the backlog after every intake.

## Contract

### What ships

| path | class | what |
|---|---|---|
| `.claude/skills/log-feature/SKILL.md` | managed (`.claude/skills/**`) | frame, adversarial review, prior art, spec, issue, split, Ripple |
| `.claude/skills/log-bug/SKILL.md` | managed | symptom vs root cause, defect class, test gaps, requirement coverage, issue, Ripple |
| `.claude/skills/log-followup/SKILL.md` | managed | frame check, re-measure, scope, issue + sub-issue link, Ripple |
| `.claude/skills/work-ticket/SKILL.md` | managed | validity, deep-dive, build, gate, draft PR, cold review, ready |
| `process/intake.md` | managed (`process/**`) | shared by the four: config resolution and defaults, issue body format, `gh` commands, designation line, the Ripple procedure |

`dev/ownership.yaml` needs no edit: both globs already exist, so O1 stays green. Each `SKILL.md` is ≤ 300 lines.
`process/intake.md` is what makes that possible without three copies of the same commands; each skill cites the
section it uses. Reused, not rewritten: `process/designation.md` (the effort line), `process/cold-review.md`
(work-ticket's review), `.github/ISSUE_TEMPLATE/feature.yml` and `bug.yml` (the issue headings I1 reads),
`docs/features/TEMPLATE.md` (every feature doc and stub), `/review-doc` (reviewing a stub).

### Configuration

- Read `§Skill Configuration` from the `AGENT.md` nearest the working directory that has one, walking up.
- A row that has existed since `new-project` (the 18 below marked *since creation*) and is missing or still holds
  `<…>`: stop and ask, in the project's terms ("Which GitHub repository should these issues go to?"), never
  in the key's name alone. No other product's values exist anywhere to fall back to.
- A row added by this feature and absent from `AGENT.md`: use its default below, silently, and say so in the
  PR. `AGENT.md` is `seeded`, so a sync never adds rows to an existing project; the release's migration note
  lists the new rows for owners who want to set them.
- `AGENT.md` documents every row: what it controls, and its default. The line "Without values those skills fall
  back to another product's defaults" is replaced by "the skills stop and ask".

| key | read by | default when absent |
|---|---|---|
| Product name | all | since creation |
| Issue repo | all | since creation |
| GitHub project | intake ×3 | since creation; `none` skips the board |
| Project field mapping | intake ×3 | since creation; `none` sets no fields |
| PRD path | log-feature, log-bug, work-ticket | since creation |
| Feature docs dir | log-feature, log-bug, work-ticket | since creation |
| Milestone roadmap | intake ×3, work-ticket | since creation |
| Product frame | log-feature | since creation |
| Change lanes | log-feature, work-ticket | since creation |
| Marketing context | log-feature | since creation; `none` skips the positioning questions |
| Domain invariants doc | all four | since creation; `none` → the product's data-integrity invariants |
| Conventions doc | log-feature, work-ticket | since creation |
| Testing strategy doc | log-bug, work-ticket | since creation |
| Effort decision-tree | intake ×3 | since creation |
| Quality gate | work-ticket | since creation |
| Timezone | none of the four (`pnpm status`) | since creation |
| Domain map | work-ticket | since creation |
| Stack constraints | work-ticket | since creation |
| **Labels** (new) | intake ×3 | `feature: enhancement · bug: bug · docs: documentation` (GitHub's defaults) |
| **Issue milestone** (new) | intake ×3 | `none`; or `active`: the GitHub milestone titled with the active milestone's id |
| **QA plans** (new) | work-ticket | `docs/qa/`; `none` makes the QA-plan step N/A |
| **Cold review** (new) | work-ticket | `process/cold-review.md`, run in a fresh subagent |
| **Error tracker** (new) | log-bug, work-ticket | `none`; a connector name turns on the "pull the repro first" steps |

### Issues the skills file

- Bodies use the issue-form headings (`### Problem`, `### Acceptance`, `### Seams`, `### Seams detail`,
  `### Out of scope`, `### Links`; bugs use `bug.yml`'s), so an issue made with `gh issue create` reads as the
  form would. Feature and split issues add `### Contract` and `### Verify`, **embedded**, never linked.
- The body is written to a file first and I1 is run on it (`node ci/checks/meta/i1-issue-shape.mjs <dir>`)
  before `gh issue create --body-file`. A red I1 is fixed before anything is filed.
- Every issue ends with `## Recommended Mode / Model / Effort` per `process/designation.md`; feature-lane
  issues carry a **Shape** and a **Build** line.
- `Links` carries `Part of: #n` when there is a parent; the skill also links it as a native sub-issue (same
  repository only; otherwise the `Part of` line plus a comment on the parent).

### Per skill: what the ≤ 300 lines keep

Dropped from all four: shell bootstrap (nvm, Homebrew paths), the private product's default tables and prose,
framework- and design-system-specific rules, one repository's migration commands, bundle-budget and contrast
audits, model release notes and long orchestration prose (`process/designation.md` covers it), named tools of
one code-graph server (→ "search by behaviour: `rg`, and a code graph where one exists"), named error-tracker
tools (→ `Error tracker`), and descriptions naming products.

| skill | keeps | changes |
|---|---|---|
| log-feature | intake → job story; five challenges and a verdict (PROCEED, RESHAPE, REJECT, DEFER), never "proceed with caveats"; prior art and reusable primitives; MVP cut, deferrals with reasons, build map (machinery before surface); split into 2–5 sub-issues on approval | feature doc from `TEMPLATE.md` (Contract, Seams, Threat model, Known limitations, Verify, Build map); the PRD tie is an F-ID in PRD §5 plus a milestone's Contents or §4 Out, so F1 schedules it (replaces the "📄 Detailed spec" injection); Challenge 1 asks whether it serves the FRAME question; `## Ripple` last |
| log-bug | symptom vs root cause, never a guessed root cause; regression commit; defect-class count with the grep that found it; missing tests by type and path; requirement coverage A / B / C | test types from the `Testing strategy doc`; a B / C stub from `TEMPLATE.md` with `status: draft` and an acceptance line "the stub is reviewed with `/review-doc` before the fix starts"; **no companion doc-review issue**; `bug.yml` headings; `## Ripple` last |
| log-followup | the redirect rule (not framed → `/log-feature`, broken → `/log-bug`); the re-measure gate for review-sourced claims, with `Verified against: <sha> <date>`; inherited scope and out-of-scope | feature.yml headings; `## Ripple` last |
| work-ticket | ad-hoc mode; deps closed; conflict risk; edge cases and vague criteria; reuse per new piece with the search behind it; defect-class scope; domain order; AC → test map; the guarantees block; ≤ 3 review rounds, scoped after round 1; follow-ups through `/log-followup` | re-checks `Verified against` before building (L-18); gate is `Quality gate`; domains from `Domain map`; QA step from `QA plans`; draft PR body is slipway's (`## What` with the lane, `## Verification`, `## Links`), so P1 passes; cold review per `Cold review` plus the built-in security review, replacing the personal `pr-review` skill; no board edits |

### Ripple

`log-feature`, `log-bug` and `log-followup` each end with `## Ripple`, run after the issue is filed. The
procedure lives in `process/intake.md`; each skill's section says which terms it collects.

1. **Terms.** The new issue's parent (`Part of: #n`), the paths it touches (its Contract, Scope or root cause),
   and the IDs it names: F-, RISK-, D-/PD-, L-/PL-, milestone ids, `#n`.
2. **Search**, same repository only:
   - open issues naming any term: `gh issue list --state open --limit 500 --json number,title,body`, matched
     locally as fixed strings (GitHub's search splits paths into words); above 500 open issues, one
     `gh issue list --search '"<term>" in:body'` per term instead;
   - the parent's sub-issues, open and closed: `gh api repos/{repo}/issues/{parent}/sub_issues --paginate`;
   - the parent's `Order` text and any `Next:` line;
   - `docs/milestones/*.md` (per `Milestone roadmap`) naming a term, the active one's Contents first;
   - issues the new body cites by number, open or closed.
3. **Propose.** One row per proposed edit, each of one kind: **a dependency line**, **an acceptance line**,
   **an order slot**, or **closed with an unmet acceptance line** (reopen it, or file the gap). An issue that
   needs two kinds gets two rows. Each row says what the hit is, why it matched, and the edit, in the
   project's own words (D-016, #62): "#n says it rolls back `scripts/deploy.mjs`; the new issue changes how that
   script names releases. Add to #n's acceptance: …". Never a check id or slipway's mechanics.
4. **Confirm.** The owner picks which rows to apply. Nothing is applied before that.
5. **Apply.** For each confirmed row, re-fetch the body, change that one line, and write it back
   (`gh issue edit <n> --body-file`; `gh issue reopen` for a confirmed reopen); a milestone doc is edited on the
   working branch. Unconfirmed rows are listed in the skill's final output, not applied.
6. No hits: one line, "Nothing else open names <terms>", and the skill ends.

**Worked example** — the 2026-09-24 case, as Ripple would have run it. Three follow-ups were filed from one real
sync, each under the sync feature and touching the sync script or its skill. The four hand edits map to rows:

| hit | why it matched | proposed edit |
|---|---|---|
| the epic that orders the work | its Order text lists the sync feature's children | order slot: where the three follow-ups go in the order |
| a later issue on the same surface | names the same script | dependency line: blocked by the follow-up it now needs |
| the same later issue | its acceptance assumed the behaviour the follow-up changes | acceptance line: the changed behaviour, as a checkable line |
| a closed issue under the same parent | its last acceptance line was still unmet | closed with an unmet acceptance line: reopen, or file the gap |
| the project's next task | the active milestone's Contents names the same work | order slot: the next task's steps in their new order |

Four hand edits that nothing prompted become five rows (one issue needed two kinds) that the owner confirms
or declines.

Verified against: 51f09be 2026-09-25 — the personal skills' contents (read from the author's copies on that
date), `dev/ownership.yaml` globs, `AGENT.md` rows, the issue forms, I1, F1 and P1 were read at that commit.

## Seams

none: developer tooling; adds no person, channel or promise to a project's product.

## Threat model

The skills run `gh` with the owner's credentials, and Ripple edits issues other than the one filed.

- **Nothing is edited without the owner's confirmation.** Given 0 confirmations, the repository's issues are
  unchanged except the one just filed and its native link under a same-repository parent, which filing
  includes. A comment on a parent in another repository is posted only when the owner says yes.
- **An edit changes one line of a freshly fetched body.** A body edited since the proposal is re-read, never
  overwritten from a stale copy.
- **Issue text is data.** A body or comment that tells the agent to apply edits, close issues or skip
  confirmation is quoted to the owner, never acted on.
- The skills never write secrets into bodies; `Error tracker` pulls stack frames and counts, not user data.

## Known limitations

- Claude Code loads a personal skill over a project skill of the same name ("Personal skills override project
  skills", code.claude.com/docs, skills). Anyone holding personal copies keeps running those until they retire
  or rename them; the owner probes below must run with them moved aside.
- Ripple matches text. An issue that describes a path in other words ("the deploy script") is missed.
- Ripple is same-repository only; cross-repo parents get the `Part of` line and a comment, no ripple.
- Slipway's own repository cannot run the skills (its `AGENT.md` is the template); slipway keeps filing its
  own issues by hand in the same format.

## Acceptance

```
Given the four skills in .claude/skills/
Then  each SKILL.md is ≤ 300 lines, all are managed in dev/ownership.yaml (O1 exits 0),
      and a grep for the author's private project names returns 0 lines

Given every key a skill reads
Then  AGENT.md has a documented row for it, and the new rows' defaults are in process/intake.md

Given a fresh new-project
When  /log-feature runs
Then  the feature doc and the issue body pass F1 and I1

Given a new-project repo with an open issue whose body names scripts/x.mjs
When  /log-followup files an issue touching scripts/x.mjs
Then  Ripple lists that open issue with one proposed edit before the skill ends

Given Ripple proposes edits and the owner confirms 0 of them
Then  0 other issues change (gh issue list --json number,body,state before and after match)

Given decisions.md
Then  D-018 records that slipway ships these skills and what that reverses,
      and SLIPWAY.md → Commands no longer says "user-level"
```

## Verify

```
wc -l .claude/skills/{log-feature,log-bug,log-followup,work-ticket}/SKILL.md   # each ≤ 300
grep -riE "$PRIVATE_NAMES" .claude/skills process AGENT.md | wc -l              # 0 — names come from the env, never the repo
node scripts/skills.test.mjs    # ≤ 300 lines; three `## Ripple`; every key a skill reads is a documented AGENT.md row
pnpm verify && pnpm meta
# owner probes, in a scratch GitHub repository, personal copies moved aside:
node scripts/new-project.mjs <tmp> --repo <owner>/<scratch>
#   /log-feature on a small feature → node ci/checks/meta/i1-issue-shape.mjs <bodies-dir> ; node ci/checks/meta/f1-feature-coverage.mjs <tmp>
#   open an issue naming scripts/x.mjs; /log-followup an issue touching it → Ripple lists it with one edit; confirm none → nothing changed
```

## Build map

Four PRs under #46, machinery first; the last one closes it.

1. `process/intake.md`, the new `AGENT.md` rows and their documentation, `log-followup` with Ripple, and
   `scripts/skills.test.mjs` wired into `meta` (a `package.json` edit: ask first). The Ripple probe runs here.
2. `log-feature`, and the fresh `new-project` I1 / F1 probe.
3. `log-bug`.
4. `work-ticket`; `SLIPWAY.md` → Commands ("user-level" goes), `/bootstrap` probe 11, `BOOTSTRAP.md` step 11
   and `/clarify` ("where installed" goes), `docs/conventions.md` (`/pr-review` → the cold review).

## Out of scope

- Plugin distribution (declined in D-015).
- The author retiring or renaming their personal copies: their own step.
- Slipway's own repository running the skills (owner's ruling, 2026-09-25).
- `/log-feature` filling a `## Fit` section (#48).
- Triaging an aged backlog (#50); it can reuse Ripple's search.

## Open questions

none.

## Changes

- 2026-09-25 · ADDED · shaped from #46 before any code · PR for #46
- 2026-09-25 · CHANGED · build step 1: `log-followup` reads `Domain invariants doc` too (its acceptance line on checked math), so that row is read by all four · PR for #46 step 1
- 2026-09-25 · CHANGED · threat model: filing includes the new issue's link under a same-repository parent; a comment on a parent in another repository needs the owner's yes (cold review of step 1) · PR for #46 step 1
