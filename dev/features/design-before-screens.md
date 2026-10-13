---
prd-ref: D-042
status: draft
---

# F-14 — Design before screens: a front-end project plans a design item before its first screen, and accessibility is a gate line

Version: 0.1 (2026-10-12)

## Problem

**Job:** when I plan a product that people use through screens, I want its design to be a piece of work with a
place and hours before the first screen is built, and accessibility to be a line that can go red in each milestone
that builds screens, so the schedule is not found short where it is found last and no audit at the end discovers
what every component should have carried.

Slipway plans a project with a front end and never asks who designs it or when. In a private product with one
engineer, a web app, planned with a released slipway (#406): `/kickoff` shaped its milestones with no design item
in any of them; the walking skeleton's no-go said no styling beyond tokens and no component library, and named no
later place where design would land; the milestones that build the product's screens had no direction, component
set or flows to build to; accessibility appeared once, as an outside audit in the last milestone, a step that can
only discover after everything is built. The adversarial review of the PRD did not raise it, and no check did. It
was found because the owner asked which milestone does the UI.

On `main` the gap is in the template. Searched `wcag|accessib|a11y|design (phase|direction|item)|usability|component
(set|library)` over the kickoff, review-doc and close-milestone skills, `docs/milestones/`, `docs/PRD.md`,
`docs/product/`, `SLIPWAY.md`, `BOOTSTRAP.md`, `process/intake.md`, `docs/reviews/TEMPLATE.md` and the K1 and MS1
checks: the only hits are "usability" as a kind of risk (`.claude/skills/kickoff/SKILL.md:47`,
`docs/product/FRAME.md:70`) and the skeleton's no-go, "Styling beyond design tokens. No component library."
(`docs/milestones/M1-walking-skeleton.md:38`). The milestone template's Gate section asks for something that goes
red and names no kind.

Workaround today: the owner notices. Why now: the next real project's milestones are shaped from this template,
and a design phase missing from a plan costs the most where it is found last. Serves `SLIPWAY.md`'s thesis, a rule
exists only where something fires. Decision: D-042 (the owner's six choices, 2026-10-12). Issue: #406, part of #379.

**Verdict: PROCEED**, as D-042 shapes it. Rejected: advice in a skill only (what was skipped in the case that filed
this); a design milestone of its own (one more milestone every front-end project must shape and close); a single
accessibility gate on the release milestone (the audit this names as the gap); folding in #94 (plan plus tool in
one feature, built beside a check that must not name it).

| option | for | against | verdict |
|---|---|---|---|
| do nothing | no new line, no new check | the gap was found by the owner asking; nothing fires | rejected |
| a sentence in `/kickoff` only | smallest change | advice, skipped in the case that filed this | rejected |
| a design milestone (`kind: design`) | the clearest place | every front-end project shapes and closes one more milestone; a small product has one screen | rejected |
| one design item before the first screen, a WCAG line per screen milestone, a check that reads both | the plan carries the work and the gate; a check holds presence, nothing more | one more Contents item and one more Gate line to write | **proceeds** |
| fold #94 in | the tool ships with the plan | several sessions more; the check would be built beside a skill it must not name | rejected |

## Contract

### 1. The frame says where people use the product — `docs/product/FRAME.md`

Under `## Job story`, after the job-story sentence and its note, one labelled line:

```markdown
Front end: <…where people use this: a web app, a phone app — or none, for an API or a tool with no screens…>
```

- Read by the check as the **front-end line**: the first line of the file starting `Front end:`. Its value is the text after the label, trimmed.
  `none` (any case) means the product has no front end. A value still holding a template placeholder
  (`PLACEHOLDER`, `ci/checks/lib/frontmatter.mjs:30`) or a `[NEEDS CLARIFICATION: …]` is **unrecorded**, and so is
  a missing line. Any other non-empty value means the product has a front end; the text itself is for people.
- `/kickoff` asks it in Phase 1, right after step 1, *the moment*: where people use this — screens (a web or phone
  app), a terminal, an API, nothing — and writes the answer. The question offers the four, with the moment's own
  answer as the recommendation when it names one (a web app in the input is not asked again: "never ask what the
  input already answers").
- K1 already fails a placeholder in the frame once a milestone is underway (`placeholder/present`), so a frame
  that never answered goes red by the rule that exists; the check below adds only the case K1 cannot see, a
  missing line.

### 2. The design item — a Contents item in `docs/milestones/`

A **design item** is a Contents item whose text, after its number, starts with `Design:`. It is read by
`contents()` (`ci/checks/lib/milestones.mjs:55`) like any item, so it carries an F-ID or `(no feature: design)`
for F1, hours in PRD §9 for MS1, and a ` · #n` marker once started. Example, in a project's words:

```markdown
1. Design: a direction (type, colour, spacing, tone), the component set built to WCAG 2.2 AA, and the flows for
   the screens in M2 and M3 — by <who, or the design system the project adopts>. (no feature: design)
```

- **What it holds is the project's.** The item says what it delivers for the screens to be built to, and who or
  what does the work. Slipway names no method and no tool (D-042): a designer's handoff, an existing design
  system, a project's own skill, or direction plus an accessible component set plus flows all count. The check
  sees that the item exists, where it sits and that its text is not a placeholder; it does not read what is in it.
- **Where it sits.** Before the first item that builds a screen: in any milestone earlier than the first screen
  milestone (the skeleton included), at any position; or in the first screen milestone itself, as its item 1. In
  the project's own words, `/kickoff` offers the usual answer, direction plus an accessible component set plus the
  flows, as a prompt, never as a requirement.
- **Its hours.** One row's worth in PRD §9, inside the appetite of the milestone that holds it, like any item.
  Nothing new is counted: MS1's `estimate/over-appetite` already warns when the milestone's hours outrun its
  appetite.
- **The skeleton's no-go names where design lands.** `docs/milestones/M1-walking-skeleton.md` → No-gos reads
  `Styling beyond design tokens, and no component library: design lands in <the milestone that holds the design
  item, and its Contents item number>.` `/kickoff` fills the placeholder. A project with no front end deletes the
  line (it builds no screens). No check reads the no-go, and none is needed: MS1 already fails a placeholder left
  under No-gos once the skeleton is active (`section/No-gos`), so the line is filled or deleted, never left. The
  skills test pins the sentence.

### 3. A milestone that builds screens, and its accessibility line — `docs/milestones/TEMPLATE.md`

- **Screen milestone.** In a project with a front end, every milestone whose `kind` is not `skeleton` builds
  screens, unless its frontmatter says `screens: none` (a data migration, a billing back end). `screens:` is a new
  optional field in the template's frontmatter, documented in its header note beside `kind`; any value other than
  `none` is a finding (`screens/unknown`), never a pass. MS1's `template/fields` is not extended: the field is
  optional, and a template that loses it loses nothing a check reads.
- **The accessibility line.** The template's `## Gate` carries one more bullet:

  ```markdown
  - Screens built here meet WCAG 2.2 AA, held by <…what goes red: an automated check in CI (axe), a keyboard
    and screen-reader pass recorded in docs/qa/…>. Delete this line, and set `screens: none`, when the milestone
    builds no screens.
  ```

  Read as the **accessibility line**: a bullet under `## Gate` (read by `section()`, `ci/checks/lib/markdown.mjs`)
  whose text contains `WCAG 2.2 AA` and is not a placeholder. The check sees the line exists; what holds it is
  the project's, and `/close-milestone` proves it like every other Gate line (its §2 needs no change: it already
  evidences every line). As with the no-go, MS1 already fails the template's placeholder under Gate once the
  milestone is active, so the line is filled or deleted; DS1 adds only that a screen milestone has one.
- **The skeleton** (`kind: skeleton`) is not a screen milestone: its no-go excludes styling, and design lands after
  it. Its Gate is unchanged.

### 4. The check — DS1, `ci/checks/meta/ds1-design-before-screens.mjs`

Zero-dependency (D-004), reads committed markdown only: `docs/product/FRAME.md`, every milestone via
`readMilestones()` (`ci/checks/lib/milestones.mjs:29`), and `decisions.md` for ids, as MS1 does. A missing
`docs/milestones/` or a missing frame compares nothing and says nothing (the frame is K1's to require).

**When it looks.** Only when some milestone with `kind` other than `skeleton` is **active**. Shaping milestones are
drafts (as for MS1 and K1), and closed and killed ones are not reported: their screens were built and their gate
proved under the rule of their time (D-042, the sync answer). With no such active milestone, the check prints its
view and exits 0.

**Findings**, each with the file, the id and what closes it in the project's words (D-016):

| id | when | what closes it |
|---|---|---|
| `frontend/unrecorded` | the front-end line is missing or unrecorded (§1) | write the line in `docs/product/FRAME.md`: where people use the product, or `none` |
| `screens/unknown:<id>` | `screens:` is set and not `none` | `screens: none`, or remove the field |
| `design/missing:<id>` | front end; `<id>` is active, builds screens; no design item in a milestone before it, and its item 1 is not one; and it names no `design: PD-<n>` | a design item as item 1 of `<id>`, or a decision in `decisions.md` saying why the screens are built without one, named in `<id>`'s frontmatter as `design: PD-<n>` |
| `design/unresolved:<id>` | `design: PD-<n>` names a decision `decisions.md` does not hold (as MS1's `extended/unresolved`) | record the decision, or remove the field |
| `gate/accessibility:<id>` | front end; `<id>` is active, builds screens; no accessibility line (§3) | the line under `## Gate`, with what holds it |

- "Before" is file order as `readMilestones()` returns it (the order `pnpm status` shows), the same order
  `/kickoff` writes. A design item that is a placeholder (`PLACEHOLDER`) is no design item.
- A front-end line that says `none` closes every finding but `screens/unknown`: a project with no front end gets
  none of this, and no `screens:` field is needed.
- `design: PD-<n>` is read like `extended:` (MS1): the id must exist as a `## PD-<n>` or `### PD-<n>` heading in
  `decisions.md`. The template's header note documents it beside `extended:`.
- Exit 1 on any finding, exit 2 (BROKEN) when the frame or a milestone cannot be read
  (`process/decision-defaults.md` §4). Output through `report()` (`ci/checks/lib/report.mjs`).
- Registered by its filename: PC1 (`ci/checks/meta/pc1-positive-control.mjs`) runs every `*.mjs` in the folder
  against `ci/fixtures/known-bad/<id>/`, so the fixture is the registration. In slipway's own tree the frame is the
  template with its placeholder and the only milestone is the shaping skeleton, so DS1 reports nothing there.

**Fixtures.** `ci/fixtures/known-bad/ds1/`, one case per finding id, each an `expected.json` naming its exit, every
finding id and a detail (PC1's `details`), so a check regressed to flagging everything does not pass. Controls, in
`scripts/ds1.test.mjs` (the known-bad folder holds only red cases): a front-end project whose design item sits in
M1 with M2 active (0 findings); the same with the item as M2's item 1 (0); `Front end: none` with M2 active and no
design item (0); the frame unrecorded with only the skeleton active (0); a closed M2 with no item and a shaping M3
(0). One case fails with the change reverted, as the acceptance asks of the sync answer: the frame with no
front-end line and an active screen milestone (`frontend/unrecorded`), which the template of every project synced
before this release has.

**`pnpm status`.** For a shaping milestone that would get `design/missing` or `gate/accessibility` once active, one
line under Needs attention, in the same words as the finding's "what closes it", computed by the same reader
(`ci/checks/lib/milestones.mjs`, a `designItems()` beside `noGos()`, and a frame reader in
`ci/checks/lib/risks.mjs`'s file or a new `frame.mjs`, whichever K1 already uses for the frame's text) so the status
line and the check never disagree.

### 5. The skills

- **`/kickoff`.** Phase 1: the front-end question after step 1 (§1). Phase 3 step 4, for a front-end project:
  place one design item before the first screen item (§2), ask who or what does the work and what it delivers,
  offer direction plus an accessible component set plus flows as the usual answer, give it hours in §9, fill the
  skeleton's no-go with where design lands, and write the accessibility line in every screen milestone's Gate
  with what holds it (ask: an automated check in CI, a recorded pass in `docs/qa/`). A project with no front end:
  delete the skeleton's design no-go and the template's accessibility line from each milestone. The readiness
  gate (step 5) asks of M2: is there a design to build its screens to?
- **`/review-doc`.** Step 2 gains one item, between *Sequencing* and *What is missing*: **Design and
  accessibility.** Who designs this and when: is there a design item before the first screen, with hours? Does
  every milestone that builds screens carry an accessibility line in its Gate that can go red? Asked of a PRD and
  of a milestone; of a feature doc only when it adds a screen.
- **`/sync-slipway`.** §3, *Diffs of the project's files*: the frame's new line is a value only the project has.
  The skill asks the owner once, in the project's words (where do people use the product), and writes the line;
  the same answer settles whether the skeleton's no-go and each milestone's accessibility line are taken or
  deleted. A project with no front end sees nothing more. The PR's **Decided by sync** records the answer.
- **`/close-milestone`.** No change: §2 already proves every Gate line with evidence.
- **#94** gains a comment: the design item (D-042) is where its skill would be used; it stays parked with its
  trigger. No check or template names a skill.

Reuses (searched by behaviour): `contents()`, `noGos()` and `readMilestones()` in `ci/checks/lib/milestones.mjs`
(the one reader of a milestone's items and sections); `section()` in `ci/checks/lib/markdown.mjs`; `PLACEHOLDER`
in `ci/checks/lib/frontmatter.mjs` (the one definition of unfilled); MS1's `hasDecision` pattern for
`extended:` (`ci/checks/meta/ms1-milestones.mjs`), lifted into the lib so `design:` and `extended:` resolve the
same way; `report()` and PC1's `expected.json` with `details`; `scripts/skills.test.mjs` for every sentence a
skill or template must keep. New: the front-end line and its reader, the `Design:` item label, the `screens:` and
`design:` fields, the accessibility line, and DS1. Searched `ci/checks/lib/` for a reader of a labelled line in
the frame: `readRisks()` reads the Risks table only, so a reader of one labelled line is new.

Verified against: c370056 2026-10-12 — `.claude/skills/kickoff/SKILL.md` (Phase 1 steps 1–7, Phase 3 step 4,
readiness gate step 5, no design or accessibility wording), `.claude/skills/review-doc/SKILL.md` (step 2 items
1–8), `.claude/skills/sync-slipway/SKILL.md` §3 (a change that needs a project value is asked), `docs/milestones/
TEMPLATE.md` (Gate asks for something that goes red, no kind; frontmatter `id status kind appetite summary`),
`docs/milestones/M1-walking-skeleton.md:38` (the no-go), `docs/product/FRAME.md` (no front-end line; K1 reads
Job story, The question it answers, Risks), `ci/checks/lib/milestones.mjs` (`contents()`, `noGos()`,
`readMilestones()`, no design reader), `ci/checks/meta/ms1-milestones.mjs` (`extended/unresolved` via
`hasDecision`), `ci/checks/meta/pc1-positive-control.mjs` (registration by folder, `details`), `ci/fixtures/
known-bad/` (no `ds1`), `dev/ownership.yaml` (`docs/product/**` and `docs/milestones/**` seeded,
`.claude/skills/**` managed), #94 open and parked.

## Seams

none: no person, channel or payment is added. A promise is: slipway asks for the design work and the
accessibility gate up front, in the plan. The check holds that they are written, not that they are met.

## Threat model

none beyond baseline. DS1 reads committed markdown in the project's own tree and `decisions.md`; no network, no
subprocess, no secret, no deletion. A milestone or frame that cannot be read is BROKEN, never a pass.

## Known limitations

- The check holds presence, not quality: a design item that says little and a Gate line held by nothing real
  pass it. `/review-doc` and `/close-milestone` are where those are argued and proved.
- "Builds screens" is a rule (every non-skeleton milestone in a front-end project) with one opt-out, not a reading
  of the Contents. A milestone that builds a screen under `screens: none` is the owner's mistake, not a finding.
- A design item in a closed milestone counts as "before" without the check reading whether it was delivered; a
  closed milestone's Retro and its proved Gate are where that lives.
- Slipway's own tree never exercises the check beyond the control cases: it has no active milestone by design.
  Decision-defaults §9 is met by running DS1 once against a real project's files, the result recorded as a count.

## Acceptance

```
Given  decisions.md on this branch
Then   it records D-042, answering the six points of #406, and no other branch, open pull request or main holds
       a D-042

Given  a project whose frame says people use it through screens
When   /kickoff shapes its milestones
Then   one design item (Design: …) sits before the first item that builds a screen, with its hours inside that
       milestone's appetite in PRD §9, the skeleton's no-go names the milestone where design lands, and every
       milestone that builds screens carries a WCAG 2.2 AA line under Gate with what holds it
       (scripts/skills.test.mjs pins each sentence in kickoff/SKILL.md, TEMPLATE.md and M1-walking-skeleton.md)

Given  a front-end project with an active milestone that builds screens and no design item before it
When   pnpm meta runs
Then   DS1 reports design/missing:<id>, naming the milestone and what closes it; a known-bad fixture under
       ci/fixtures/known-bad/ds1/ holds the case and PC1 runs it

Given  the same project with the design item as that milestone's item 1, or in an earlier milestone
Then   DS1 reports nothing for it (control, scripts/ds1.test.mjs)

Given  a project whose frame says Front end: none, with an active milestone and no design item
Then   DS1 reports 0 findings (control)

Given  a front-end project with an active screen milestone whose Gate has no WCAG 2.2 AA line
Then   DS1 reports gate/accessibility:<id> (fixture)

Given  a project synced from before this release: a frame with no front-end line, an active screen milestone
When   pnpm meta runs
Then   DS1 reports frontend/unrecorded, and the test for it fails with DS1 reverted; the pull request's ## What
       says in one sentence what such a project sees on the sync

Given  /review-doc reviewing a PRD or a milestone
Then   it asks who designs this and when, and whether accessibility is in a gate (skills.test.mjs pins it)

Given  /sync-slipway bringing this release to a project
Then   it asks the owner once where people use the product and writes the frame's line (skills.test.mjs pins it)

Given  slipway's own tree
When   pnpm meta runs
Then   it exits 0
```

## Verify

```
pnpm meta
node ci/checks/meta/ds1-design-before-screens.mjs .
node ci/checks/meta/pc1-positive-control.mjs
node --test scripts/ds1.test.mjs
node --test scripts/skills.test.mjs
git revert --no-commit <the DS1 commit> && node --test scripts/ds1.test.mjs; git revert --abort
```

The last line is the acceptance's "fails with the change reverted": run with the check's commit reverted, the
`frontend/unrecorded` test must fail; the PR pastes both runs.

## Build map

Each step is one pull request. `.claude/**` and `ci/**` are owner-only: steps 3 and 4 ask before they edit, and
list each file under `## Gate changes`.

1. This document and D-042 (docs, no build). Then `/review-doc` from a fresh session.
2. Templates: the front-end line in `docs/product/FRAME.md`; `screens:` and `design:` in
   `docs/milestones/TEMPLATE.md`'s header note and the accessibility line under its Gate; the skeleton's no-go
   names where design lands. Pins in `scripts/skills.test.mjs`. Nothing fires yet: a project that syncs this step
   alone sees new template text and no red.
3. The check: `ci/checks/lib/milestones.mjs` gains `designItems()` and the decision resolver; the frame line
   reader; `ci/checks/meta/ds1-design-before-screens.mjs`; `ci/fixtures/known-bad/ds1/` (one case per id);
   `scripts/ds1.test.mjs` (controls, and the reverted-change test); the `pnpm status` line. Run once against a
   real project's files before it ships (decision-defaults §9), the result recorded as a count.
4. The skills: `/kickoff` (the question, the item, the no-go, the Gate line, the readiness question),
   `/review-doc` (the step-2 item), `/sync-slipway` (the one question on sync), each pinned in
   `scripts/skills.test.mjs`; the comment on #94.

Machinery before surface: the templates and the check (2, 3) land before the skills that write what the check
reads (4), so a skill never promises a line nothing holds.

## Out of scope

- A design tool, skill or component library: #94, parked, independent of this (D-042).
- Judging a design, or whether WCAG 2.2 AA is met: the check sees that the item and the line exist. Proving the
  line is `/close-milestone`'s; arguing the item is `/review-doc`'s.
- A project's own milestones: each re-plans from the rule, on its next kickoff or sync.
- Reading which Contents items build a screen: "builds screens" is per milestone with an opt-out (§3).

## Open questions

- Owner: none. The six choices are D-042.
- Build (step 3): whether the frame reader lives in `ci/checks/lib/risks.mjs`'s file or a new `frame.mjs`; take
  what K1 and `ci/status.mjs` already share, so there is one reader of the frame.

## Changes

- 2026-10-12 · ADDED · shaped from #406 and D-042 before any code · PR for #406
