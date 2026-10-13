---
prd-ref: D-042
status: draft
---

# F-14 — Design before screens: a front-end project plans a design item before the screens that follow its skeleton, and accessibility is a gate line from the skeleton on

Version: 0.3 (2026-10-13)

## Problem

**Job:** when I plan a product that people use through screens, I want its design to be a piece of work with a
place and hours before the screens that follow the skeleton are built, and accessibility to be a line that can
go red in each milestone that builds screens, so the schedule is not found short where it is found last and no
audit at the end discovers what every component should have carried.

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

**Verdict: PROCEED**, as D-042 shapes it. Rejected: advice in a skill only (nothing fires, and `SLIPWAY.md`'s thesis
is that such a rule does not exist); a design milestone of its own (one more milestone every front-end project
must shape and close); a single
accessibility gate on the release milestone (the audit this names as the gap); folding in #94 (plan plus tool in
one feature, built beside a check that must not name it).

| option | for | against | verdict |
|---|---|---|---|
| do nothing | no new line, no new check | the gap was found by the owner asking; nothing fires | rejected |
| a sentence in `/kickoff` only | smallest change | advice: nothing fires when it is not followed | rejected |
| a design milestone (`kind: design`) | the clearest place | every front-end project shapes and closes one more milestone; a small product has one screen | rejected |
| one design item before the screens that follow the skeleton, a WCAG line per screen milestone, a check that reads both | the plan carries the work and the gate; a check holds presence, nothing more | one more Contents item and one more Gate line to write | **proceeds** |
| fold #94 in | the tool ships with the plan | several sessions more; the check would be built beside a skill it must not name | rejected |

## Contract

### 1. The frame says where people use the product — `docs/product/FRAME.md`

Under `## Job story`, after the job-story sentence and its note, one labelled line:

```markdown
Front end: <…where people use this: a web app, a phone app — or none, for an API or a tool with no screens…>
```

- Read by the check as the **front-end line**: the one line starting `Front end:` at column 0, in the file's
  prose (`prose()`, `ci/checks/lib/markdown.mjs`: comments and fenced code are not read, and a line of the header
  note starts with `>`). The template puts it under `## Job story`; the check finds it wherever the owner moved
  it. Its value is the text after the label, trimmed. A frame holds exactly one: with two or more the check
  cannot tell which is meant, and reads none.
- **Two states and one unknown.** A value whose first word is `none` (any case) means the product has no front
  end; what follows the word is for people (`Front end: none (a command-line tool)`). **Unrecorded** is no line,
  more than one, an empty value, or a value still holding a template placeholder (`PLACEHOLDER`,
  `ci/checks/lib/frontmatter.mjs:30`) or a `[NEEDS CLARIFICATION: …]`: the finding then says to write the line,
  not to plan a design. Any other value means the product has a front end, an unknown word and a `[PARKED: …]`
  question among them: a parked answer is a front end until it is answered (decision-defaults §4).
- `/kickoff` asks it in Phase 1, right after step 1, *the moment*: where people use this — screens (a web or phone
  app), a terminal, an API, nothing. The question offers the four, with the moment's own answer as the
  recommendation when it names one (a web app in the input is not asked again: "never ask what the input already
  answers"). It writes screens as the owner's words (`Front end: a web app`), and each of the other three as
  `none` with the answer after it (`Front end: none (an API)`). A product with both, an API and an admin page,
  has screens and is written so.
- K1 already fails a placeholder in the frame once a milestone is underway (`placeholder/present`), so a frame
  that never answered goes red by the rule that exists. The check below reports an unrecorded line too, the
  missing one K1 cannot see and the placeholder it can: one cause may show under both ids, since a check that
  cannot read the line never passes on it (decision-defaults §4).

### 2. The design item — a Contents item in `docs/milestones/`

A **design item** is a Contents item whose text, after its number, starts with `Design:`, in any letter case and
with emphasis marks around the word ignored (`**Design:**` counts; the text is compared after `plain()`,
`ci/checks/lib/markdown.mjs`). It is read by `contents()` (`ci/checks/lib/milestones.mjs:55`) like any item, so it
carries an F-ID or `(no feature: design)`
for F1 and a ` · #n` marker once started. Example, in a project's words:

```markdown
1. Design: a direction (type, colour, spacing, tone), the component set built to WCAG 2.2 AA, and the flows for
   the screens in M2 and M3 — by <who, or the design system the project adopts>. (no feature: design)
```

- **What it holds is the project's.** The item says what it delivers for the screens to be built to, and who or
  what does the work. Slipway names no method and no tool (D-042): a designer's handoff, an existing design
  system, a project's own skill, or direction plus an accessible component set plus flows all count. The check
  sees that the item exists, where it sits and that its text is not a placeholder; it does not read what is in it.
- **Where it sits.** Before the screens that follow the skeleton: in any milestone earlier than the first screen
  milestone past the skeleton (the skeleton included), at any position; or in that first one itself, as its
  item 1. Design does not have to come before the skeleton (D-042, amended): the skeleton builds and deploys the
  product's first screens, sign-in and the one core action, to prove the path, and those are rebuilt to the design
  item. `/kickoff` offers the usual answer, direction plus an accessible component set plus the flows, as a
  prompt, never as a requirement.
- **In a milestone already running.** Item 1, or any position when every item above it is started (each carries
  its ` · #n` marker, `started()` in `ci/checks/lib/milestones.mjs`): a milestone that was active when this rule
  arrived adds the item below the work already begun, and nothing is renumbered. The items still to start follow
  it.
- **Its hours.** Inside the appetite of the milestone that holds it. PRD §9 has one row per milestone, not per
  item, so the design item's hours are part of that milestone's row, and the row's Basis cell names the share
  (`includes design: 12–16 h`). `/kickoff` asks for them and writes them there. What is read is the milestone:
  MS1's `estimate/over-appetite` warns when its hours outrun its appetite. Nothing checks the share: a design
  item added with no hours added to the row reads the same as one that was estimated (Known limitations).
- **The skeleton's no-go names where design lands.** `docs/milestones/M1-walking-skeleton.md` → No-gos reads:

  ```markdown
  - Styling beyond design tokens, and no component library: these screens are rebuilt to the design, which lands in
    <…the milestone that holds the design item, and the item's number…>.
  ```

  When the design item sits in the skeleton itself, the line names that item: the skeleton's own screens are not
  built to it either way.

  The placeholder is written whole on one line, in the form `PLACEHOLDER` matches (`<…` to `>` with no line end
  between: a placeholder that wraps, or one with no `…`, is not one to any check). `/kickoff` fills it. A project
  with no front end deletes the line (it builds no screens). No check reads the no-go, and none is needed: MS1
  already fails a placeholder left under No-gos once the skeleton is active (`section/No-gos`), so the line is
  filled or deleted, never left. The skills test pins the sentence, and that its placeholder matches
  `PLACEHOLDER`.

### 3. A milestone that builds screens, and its accessibility line — `docs/milestones/TEMPLATE.md`

- **Screen milestone.** In a project with a front end, every milestone builds screens, the skeleton among them
  (its sign-in and core action are deployed to production), unless its frontmatter says `screens: none` (a data
  migration, a billing back end). Every screen milestone owes the accessibility line; every one but the skeleton
  owes a design item before it (§2). `screens:` is a new
  optional field in the template's frontmatter, documented in its header note beside `kind`; its value is trimmed
  and compared in any letter case, and any value other than `none` is a finding (`screens/unknown`), never a
  pass. A milestone with no `kind` is not a skeleton, so it owes both. MS1's `template/fields` is not extended:
  the field is optional, and a template that loses it loses nothing a check reads.
- **The accessibility line.** The template's `## Gate` carries one more bullet:

  ```markdown
  - Screens built here meet WCAG 2.2 AA, held by
    <…what goes red: an automated accessibility check in CI, a keyboard and screen-reader pass in docs/qa/…>.
    Delete this line, and set `screens: none`, when the milestone builds no screens.
  ```

  Read as the **accessibility line**: a bullet under `## Gate` (the section from `section()`,
  `ci/checks/lib/markdown.mjs`; a line starting `-` or `*` opens a bullet and its indented lines are joined to
  it with one space, as `noGos()` joins a no-go) whose joined text contains `WCAG 2.2 AA` and does not match
  `PLACEHOLDER`. So a line that wraps between "2.2" and "AA" is still read, and the template's line, unfilled,
  is no accessibility line. The placeholder is whole on one line, as for the no-go, so MS1 reads it as well: MS1
  already fails a placeholder under Gate once the milestone is active (`section/Gate`), and DS1 adds that a
  screen milestone has a filled line. The check sees the line exists; what holds it is the project's, and
  `/close-milestone` proves it like every other Gate line (its §2 needs no change: it already evidences every
  line).
- **The skeleton** (`kind: skeleton`) carries the line too: `docs/milestones/M1-walking-skeleton.md` → Gate gains
  the same bullet, without its last sentence. What it ships is small, a labelled form and one action, so the line
  is small at that size, and it says what holds it like any other (the template's own examples: an automated
  accessibility check in CI, a keyboard and screen-reader pass in `docs/qa/`). Nothing here says what meets the
  level: that is the standard's to say and the project's to hold. What is built accessible is not reworked for it
  later (D-042: per component as it is built). A project with no front end deletes the bullet.
- **Not held yet.** One dated entry in `ci/exceptions.yaml` stands in place of the line, for one milestone:

  ```yaml
  - id: docs/milestones#M2/accessibility
    reason: <what is not held yet, and what will hold it>
    owner: <who answers for it>
    expires: 2026-12-01
  ```

  `expires` is the "by when": the first day the entry no longer excuses, a real day still to come, judged by the
  rule the registry's other entries are judged by (`expiryProblem()`, `ci/checks/lib/exceptions.mjs`). It is the
  way out for a milestone that was already running when the rule arrived, whose screens are partly built and
  whose appetite is fixed. It replaces `accessibility: PD-<n>`, which is no longer a field (D-042, amended
  2026-10-13), and differs from it in three ways:
  - **The date is read.** An entry is **live** while it has a reason, an owner and a day still to come, and the
    milestone it names has no accessibility line. The day it passes, the entry is a finding
    (`accessibility/overdue`).
  - **Closing the milestone does not end it.** The entry is read whatever the milestone's status, so one that
    names a closed milestone with no accessibility line goes red on its day like any other. What closes it is
    the line written under that milestone's `## Gate` with what holds it, and the entry removed; or a later day
    with its reason.
  - **Each one is the owner's.** The registry is owner-only (`ci/**`), so an entry is the owner's yes for one
    milestone and one date, and the pull request names it under `## Gate changes`. One entry never covers two
    milestones.

  An entry that excuses nothing is a finding too (`accessibility/entry`): no reason, owner or real day, or a
  milestone that has the line, builds no screens, is shaping or killed, or is not there.

### 4. The check — DS1, `ci/checks/meta/ds1-design-before-screens.mjs`

Zero-dependency (D-004), reads committed files only: `docs/product/FRAME.md`, every milestone via
`readMilestones()` (`ci/checks/lib/milestones.mjs:29`), `decisions.md` for ids, as MS1 does, and
`ci/exceptions.yaml` through `loadRegistry()`, as LK1 does, with the day from `ci/checks/lib/clock.mjs`. A missing
`docs/milestones/` or a missing frame compares nothing and says nothing (the frame is K1's to require: K1 is
BROKEN without one). A milestone with no frontmatter, `id` or `status` is MS1's finding and DS1 leaves it.

**When it looks.** Only when a milestone is **active**, the skeleton included (it owes the accessibility line; K1
asks for a finished frame from the same moment). Shaping milestones are drafts (as for MS1 and K1), and closed
and killed ones are not reported: their screens were built and their gate proved under the rule of their time
(D-042, the sync answer). One thing is read in every milestone: a registry entry that names it (§3), so a date
set while a milestone ran is still read after it closes. With no active milestone and no such entry to report,
the check prints its view and exits 0.

**Findings**, each with the file, the id and what closes it in the project's words (D-016):

| id | when | what closes it |
|---|---|---|
| `frontend/unrecorded` | the front-end line is unrecorded (§1): none, more than one, empty or a placeholder | write the one line in `docs/product/FRAME.md`: where people use the product, or `none` |
| `screens/unknown:<id>` | `<id>` is active; `screens:` is set and not `none` | `screens: none`, or remove the field |
| `design/missing:<id>` | front end; `<id>` is active, builds screens and is not the skeleton; no design item in a milestone before it; none in `<id>` as item 1 or below started items only (§2); and it names no `design: PD-<n>` | a design item as item 1 of `<id>`, or below the items already started; or a decision in `decisions.md` saying why the screens are built without one, named in `<id>`'s frontmatter as `design: PD-<n>` |
| `design/unresolved:<id>` | `design:` holds a value that is not a decision id, or an id `decisions.md` does not hold (as MS1's `extended/unresolved`) | record the decision, or remove the field |
| `gate/accessibility:<id>` | front end; `<id>` is active, builds screens (the skeleton included); no accessibility line (§3); and no live entry in `ci/exceptions.yaml` names it | the line under `## Gate`, with what holds it; or, where that cannot be held yet, a dated entry in `ci/exceptions.yaml` with the id `docs/milestones#<id>/accessibility`, a reason and an owner: the owner's to approve |
| `accessibility/overdue:<id>` | an entry names `<id>`, active or closed; `<id>` has no accessibility line; the entry's `expires` is today or earlier | the line under `<id>`'s `## Gate`, with what holds it, and the entry removed; or a later day, with its reason |
| `accessibility/entry:<id>` | an entry names `<id>` and excuses nothing: it has no reason, no owner, or an `expires` that is missing or not a real day; or `<id>` has the line, builds no screens, is shaping or killed, or is not a milestone | complete the entry, or remove it |

- "Before" is by milestone number: `milestoneNumber(fm.id)` (`ci/checks/lib/risks.mjs`, the order K1 uses for the
  PRD's deadlines), so M2 is before M10. File order as `readMilestones()` returns it sorts names as text and
  puts `M10-…` ahead of `M2-…`; it is used only between two ids that are not `M<n>`, and an id that is not
  `M<n>` is after every one that is.
- A design item counts when its milestone is `closed` or `active`. One in a `killed` milestone (its work
  stopped) or in a `shaping` one (its work has not started) is not design before the screens: the owner moves
  the item, or records the decision (`design: PD-<n>`).
- A design item that is a placeholder (`PLACEHOLDER`) is no design item.
- A front-end line that says `none` closes every finding but `screens/unknown`: a project with no front end gets
  none of this, and no `screens:` field is needed.
- `design: PD-<n>` is read like `extended:` (MS1), with one hold added. The value must first be a decision id,
  `PD-<n>` or `D-<n>` and nothing else (`^P?D-\d+$`): any other text is unresolved, quoted in the finding, and
  is never looked up, so `design: .*` and `design: D` name no decision. Then the id must exist as a `## PD-<n>`
  or `### PD-<n>` heading in `decisions.md`, matched as text, never as a pattern. The resolver is one function
  in the lib and MS1's `extended:` is read through it, so `extended:` takes the same hold
  (decision-defaults §5). The template's header note documents `design:` beside `extended:`.
- **Its view says what it skipped.** One word in a committed file turns a finding off (`Front end: none`,
  `screens: none`, `design: PD-<n>`), and a pull request can carry that word (decision-defaults §3); a live
  entry in the registry turns off the accessibility line for its milestone. So DS1's
  printed view, on every run and at exit 0 too, names the front-end state it read and each milestone it
  did not hold to a finding, with the reason: `front end: none`, `M3: screens: none`, `M3: design: PD-4`, `M3:
  accessibility excused until 2026-12-01`, the last for a closed milestone too while its entry is live. No new
  gate: the off state is in every `pnpm meta` output and in the Verification of the pull request that set it.
- Exit 1 on any finding. Exit 2 (BROKEN) when `docs/product/FRAME.md` or a milestone file exists and cannot be
  read as a file (a folder in its place, a read error), or `docs/milestones/` cannot be listed, or
  `ci/exceptions.yaml` cannot be read as the registry (`process/decision-defaults.md` §4). Output through
  `report()` (`ci/checks/lib/report.mjs`).
- **Registered in three places.** PC1 (`ci/checks/meta/pc1-positive-control.mjs`) runs every `*.mjs` in the folder
  against `ci/fixtures/known-bad/<id>/`, so the fixture folder gives DS1 its positive control. Nothing runs a
  check on the tree by its filename: `pnpm meta` is a written chain in `package.json`, and CI runs `pnpm meta`.
  So `package.json`'s `meta` gains `node ci/checks/meta/ds1-design-before-screens.mjs .` and
  `node scripts/ds1.test.mjs` (W1 fails a check, or a slipway test, that no workflow runs). `package.json`'s
  scripts are owner-only and class `merged`: on sync a project whose `meta` line is unchanged gets the new one,
  and a project that changed its own keeps it and is told (`script kept, yours differs`). The check's file arrives
  all the same, so that project is red on W1 (a check no workflow runs) until the owner takes the line: it is
  told and it is red, never quietly without the check. In slipway's own tree the frame is the template with its
  placeholder and the only milestone is the shaping skeleton, so DS1 reports nothing there.

**Fixtures.** `ci/fixtures/known-bad/ds1/`, one case per finding id, each an `expected.json` naming its exit, every
finding id and a detail (PC1's `details`), so a check regressed to flagging everything does not pass. Three more
red cases, one per clause a finding id alone does not hold: the template's accessibility line left unfilled in
an active screen milestone (`gate/accessibility`); a design item that is a placeholder (`design/missing`); and
`docs/product/FRAME.md` as a folder (exit 2, with the start of its `broken` message). Two more for the running
milestone: a front-end project's active skeleton with no accessibility line (`gate/accessibility:M1`), and a
design item below an item that is not started (`design/missing`). Two more for 0.3: `design: .*` on an active
milestone (`design/unresolved`), and an entry whose day has passed naming a closed milestone with no
accessibility line (`accessibility/overdue`).

Controls, in `scripts/ds1.test.mjs` (the known-bad folder holds only red cases, so PC1 does not run these: #406
asked that it run the control, and its acceptance is edited to match when this Contract is embedded). Each
names the clause that dies without it (L-09):

- the design item in a closed M1, M2 active (0 findings);
- the item as M2's item 1 (0);
- the item as item 1 of a closed M2, M10 active (0: "before" is by number);
- `Front end: none` with M2 active and no design item (0), and `Front end: NONE (an API)` the same (0);
- `screens: none` on an active M2 with no design item and no accessibility line (0, and the view names it);
- `design: PD-<n>` naming a decision that exists, on an active M2 with no design item and no accessibility line
  (`gate/accessibility` only: the decision answers design and nothing else);
- an accessibility line that wraps between "2.2" and "AA" (0);
- an active skeleton with the accessibility line and no design item anywhere (0: the skeleton owes no design);
- a design item below two started items in an active M3, with no design item before M3 (0);
- a live entry for an active M2 with a design item and no line (0, and the view names the milestone and the day);
- a live entry for a closed M2 with no line, M3 active with its item and its line (0, and the view names M2);
- the frame unrecorded with no milestone active (0);
- a closed M2 with no item and a shaping M3 (0).

One test is proved to fail with its clause changed, as the acceptance asks of the sync answer: the frame with no
front-end line and an active screen milestone (`frontend/unrecorded`), which the template of every project synced
before this release has. DS1 is a new file, so reverting its commit fails every test and proves nothing of this
one; the clause is the one that reads a missing line as unrecorded and not as `none` (Verify).

**`pnpm status`.** A plan still being shaped is asked a planning question, not the check's. The check asks what
has been delivered or begun, so a design item in a shaping milestone does not count for it. Asked of a plan,
that rule reports every correct one, `/kickoff`'s own among them (the skeleton, the design item as item 1 of M2,
M3 after it, all shaping), and a line that is there on every correct plan is one nobody reads. So for each
shaping milestone that builds screens in a front-end project, Needs attention holds one line for each thing the
plan has no place for yet:

- **No design item before it** (past the skeleton only): none in an earlier milestone that is not killed, a
  shaping one included, none as its own item 1, and no `design: PD-<n>`. The line is written for planning and
  names every place §2 allows: `M3 has no design item before it: add one to an earlier milestone, or as its
  item 1`.
- **No accessibility line** under its Gate (§3): `M3's Gate does not say how its screens meet WCAG 2.2 AA: write
  the line with what holds it, or set screens: none`.

A frame with no front-end line (none, an empty one, or more than one) is shown too, before any milestone is
active, so the owner sees it while the plan can still take it: `docs/product/FRAME.md does not say where people
use the product: write its Front end: line`. A frame whose line still holds the template's placeholder gets no
line from this: the frame is unfinished, and status already sends its owner to `/kickoff`, which asks. With the
front end unrecorded, no milestone line is shown: there is nothing yet to hold a milestone to.

**One predicate.** "Is there a design item before this milestone" is one function in
`ci/checks/lib/milestones.mjs`, taking the milestone to ask about and which statuses of an earlier milestone
count: `closed` and `active` for DS1, every one but `killed` for status. DS1 and `ci/status.mjs` both call it, so
the two differ in that argument and nowhere else. It is computed over the same reader (a `designItems()` beside
`noGos()`, and a frame reader in `ci/checks/lib/risks.mjs`'s file or a new `frame.mjs`, whichever K1 already uses
for the frame's text). The lines are held by cases under `ci/fixtures/status/` (S1 compares its `attention`
list): a shaping M2 with no design item anywhere and no accessibility line (two lines); the design item as
item 1 of a shaping M2 with M3 shaping after it (no design line for either); a frame with no front-end line
(one line); a frame still the template (none).

### 5. The skills

- **`/kickoff`.** Phase 1: the front-end question after step 1 (§1). Phase 3 step 4, for a front-end project:
  place one design item before the first screen milestone past the skeleton, or as that milestone's item 1 (§2),
  ask who or what does the work and what it delivers,
  offer direction plus an accessible component set plus flows as the usual answer, ask its hours and add them to
  that milestone's §9 row with the share named in Basis, fill the
  skeleton's no-go with where design lands, and write the accessibility line in every screen milestone's Gate,
  the skeleton's first, with what holds it (ask: an automated check in CI, a recorded pass in `docs/qa/`). A
  project with no front end: delete the skeleton's design no-go and the accessibility line from each milestone,
  the skeleton's included. The readiness gate (step 5) asks of M2: is there a design to build its screens to?
- **`/review-doc`.** Step 2 gains one item, between *Sequencing* and *What is missing*: **Design and
  accessibility.** Who designs this and when: is there a design item before the screens that follow the skeleton,
  with hours? Does every milestone that builds screens, the skeleton included, carry an accessibility line in its
  Gate that can go red? Asked of a PRD and of a milestone; of a feature doc only when it adds a screen.
- **`/sync-slipway`.** §3, *Diffs of the project's files*: the frame's new line is a value only the project has.
  The skill asks every project one question, in the project's words (where do people use the product), and writes
  the line. A project with no front end sees nothing more. For a front end, what follows is about the project's
  own milestones, which no diff from slipway reaches (slipway ships only the template and the skeleton):
  - **A milestone running now that builds screens** gets a second question, about that milestone, in the
    project's words: how its screens meet WCAG 2.2 AA, or what is not held yet and by when; and, past the
    skeleton, what its screens are designed to and by whom. The skill writes each answer where the check reads
    it: the Gate line, or a dated entry in `ci/exceptions.yaml` (§3; the owner approves that edit, and the pull
    request names it under `## Gate changes`); a design item below the work already begun, or a decision named
    as `design: PD-<n>`. Both answers are owed before the sync's pull request opens: sync's own rule stands
    (`pnpm verify` and `pnpm meta` green first), and with either unanswered `pnpm meta` is red on that milestone
    (`gate/accessibility`, and `design/missing` past the skeleton). An owner who cannot yet say how the screens
    meet the level answers with the date.
  - **Milestones still being shaped** get nothing written: `pnpm status` shows what each will owe when it starts
    (§4), and the owner plans it there. No placeholder is written into a file the project owns.
  - **The template** is slipway's file: the sync replaces it whole, the Gate bullet and the header note with it,
    and asks nothing.
  - **The skeleton**, where the project kept slipway's text: the diff is taken (the Gate bullet, the no-go's
    sentence); a closed skeleton is left as it was built. **A skeleton already running** does not take the
    no-go's sentence: its placeholder is filled only by naming a design item, and the milestone that would hold
    one is still being shaped, where nothing is written. The skill declines that one sentence, records it under
    Decided by sync, and tells the owner in the sync's own output, in the project's words: the skeleton's no-go
    was left as it is because where design lands is not planned yet, and `pnpm status` shows the milestone that
    has no design item before it. No third question is asked.

  The PR's **Decided by sync** records each answer.
- **`/close-milestone`.** No change: §2 already proves every Gate line with evidence.
- **#94** gains a comment: the design item (D-042) is where its skill would be used; it stays parked with its
  trigger. No check or template names a skill.

Reuses (searched by behaviour): `contents()`, `noGos()` and `readMilestones()` in `ci/checks/lib/milestones.mjs`
(the one reader of a milestone's items and sections); `section()` in `ci/checks/lib/markdown.mjs`; `PLACEHOLDER`
in `ci/checks/lib/frontmatter.mjs` (the one definition of unfilled); MS1's `hasDecision` pattern for
`extended:` (`ci/checks/meta/ms1-milestones.mjs`), lifted into the lib and held to an id first (§4) so `design:`
and `extended:` resolve the same way; `loadRegistry()` and `expiryProblem()` in `ci/checks/lib/exceptions.mjs`
(the one rule for when an excuse has ended); `report()` and PC1's `expected.json` with `details`;
`scripts/skills.test.mjs` for every sentence a skill or template must keep. New: the front-end line and its
reader, the `Design:` item label, the `screens:` and `design:` fields, the accessibility line, the registry
entry that stands in for it, and DS1. Searched `ci/checks/lib/` for a reader of a labelled line in the frame: `readRisks()` reads the Risks table only, so a reader of one labelled line is new.

Verified against: a76c489 2026-10-12 — `.claude/skills/kickoff/SKILL.md` (Phase 1 steps 1–7, Phase 3 step 4,
readiness gate step 5, no design or accessibility wording), `.claude/skills/review-doc/SKILL.md` (step 2 items
1–8), `.claude/skills/sync-slipway/SKILL.md` §3 (a change that needs a project value is asked), `docs/milestones/
TEMPLATE.md` (Gate asks for something that goes red, no kind; frontmatter `id status kind appetite summary`),
`docs/milestones/M1-walking-skeleton.md:38` (the no-go), `docs/product/FRAME.md` (no front-end line; K1 reads
Job story, The question it answers, Risks), `ci/checks/lib/milestones.mjs` (`contents()`, `noGos()`,
`readMilestones()`, no design reader), `ci/checks/meta/ms1-milestones.mjs` (`extended/unresolved` via
`hasDecision`), `ci/checks/meta/pc1-positive-control.mjs` (runs each check in the folder against its fixtures,
`details`),
`package.json` (`meta` names each check and test; no `ds1`), `ci/checks/lib/risks.mjs` (`milestoneNumber()`),
`docs/PRD.md` §9 (one row per milestone), `docs/milestones/M1-walking-skeleton.md:16,25` (the skeleton builds a
screen), `ci/fixtures/known-bad/` (no `ds1`), `dev/ownership.yaml` (`docs/product/**` and `docs/milestones/**` seeded,
`.claude/skills/**` managed), #94 open and parked.

## Seams

none: no person, channel or payment is added. A promise is: slipway asks for the design work and the
accessibility gate up front, in the plan. The check holds that they are written, not that they are met.

## Threat model

DS1 reads committed markdown in the project's own tree, `decisions.md` and `ci/exceptions.yaml`; no network, no
subprocess, no secret, no deletion. A milestone, a frame or a registry that cannot be read is BROKEN, never a
pass.

One limit, stated as a class: the check is told what to hold by the files it reads, so a pull request's own
files can tell it to hold nothing (decision-defaults §3). It is not closed by a gate: the frame and a
milestone's frontmatter are the project's to edit. It is made visible: DS1's view names what it did not hold and
why on every run (§4), so the change shows in that pull request's own output, and a field that names a
decision `decisions.md` does not hold, or holds anything but a decision id, is a finding. The accessibility
line's way out is not such a word: it is a dated entry in an owner-only file (§3).

## Known limitations

- The check holds presence, not quality: a design item that says little and a Gate line held by nothing real
  pass it. `/review-doc` and `/close-milestone` are where those are argued and proved.
- The design item's hours are not held. PRD §9 is read per milestone, the item's share is a phrase in a Basis
  cell, and over-appetite is a warning on a table a PRD may leave out. The feature holds that design has a place;
  that it has hours rests on `/kickoff` asking and on the review.
- The skeleton's screens are built before the design and rebuilt to it. Nothing checks that they were rebuilt: the
  no-go says so, and the design item names the screens it covers.
- A design item added below started work, in a milestone that was running when the rule arrived, is not design
  before those screens. The check holds that the items still to start follow it.
- The dated entry is open to every milestone, a new project's skeleton included, and to each later one in turn:
  nothing tells a milestone that was running when the rule arrived from one that was not. What bounds it is that
  each entry is one milestone's, dated, the owner's to approve and red when its day passes, and that a later day
  is an edit to an owner-only file. DS1 does not read whether the reason says what will hold the line; its view
  shows the milestone as excused, and until when.
- `design: PD-<n>` passes on a decision's presence, as `extended:` does: whether it says why the screens are
  built without a design is read in review.
- "Builds screens" is a rule (every milestone in a front-end project) with one opt-out, not a reading
  of the Contents. A milestone that builds a screen under `screens: none` is the owner's mistake, not a finding;
  DS1's view names the milestone as skipped, so it is seen.
- A design item in a closed milestone counts as "before" without the check reading whether it was delivered; a
  closed milestone's Retro and its proved Gate are where that lives. One in a killed milestone does not count,
  delivered or not.
- Slipway's own tree never exercises the check beyond the control cases: it has no active milestone by design.
  Decision-defaults §9 is met by running DS1 once against a real project's files, the result recorded as a count.

## Acceptance

```
Given  decisions.md
Then   it records D-042 once, answering the six points of #406 (ID1 holds two of one id apart)

Given  a project whose frame says people use it through screens
When   /kickoff shapes its milestones
Then   one design item (Design: …) sits before the first screen milestone past the skeleton, its hours are
       asked and added to that milestone's row in PRD §9 with the share named in Basis, the skeleton's no-go
       names the milestone where design lands and says its own screens are rebuilt to it, and every milestone
       that builds screens, the skeleton first, carries a WCAG 2.2 AA line under Gate with what holds it
       (scripts/skills.test.mjs pins each sentence in kickoff/SKILL.md, TEMPLATE.md and M1-walking-skeleton.md,
       and that each template placeholder matches PLACEHOLDER on one line)

Given  a front-end project with an active milestone that builds screens and no design item before it
When   pnpm meta runs
Then   DS1 reports design/missing:<id>, naming the milestone and what closes it; a known-bad fixture under
       ci/fixtures/known-bad/ds1/ holds the case and PC1 runs it

Given  the same project with the design item as that milestone's item 1, or in an earlier closed milestone
Then   DS1 reports nothing for it (control, scripts/ds1.test.mjs)

Given  the design item as item 1 of a closed M2, and M10 active
Then   DS1 reports nothing for M10 (control: before is by milestone number)

Given  the only design item in a killed milestone, or written as a placeholder
Then   DS1 reports design/missing:<id> (fixture)

Given  a project whose frame says Front end: none, with an active milestone and no design item
Then   DS1 reports 0 findings (control)

Given  a front-end project with an active screen milestone whose Gate has no WCAG 2.2 AA line, or has the
       template's line with its placeholder unfilled
Then   DS1 reports gate/accessibility:<id> (one fixture each)

Given  a front-end project whose skeleton is active
Then   with no WCAG 2.2 AA line under its Gate DS1 reports gate/accessibility:M1 (fixture); with the line and
       no design item anywhere, 0 findings (control)

Given  an active screen milestone with no accessibility line, and an entry for it in ci/exceptions.yaml
Then   with a reason, an owner and a day still to come DS1 reports nothing for the line and its view names the
       milestone and the day (control); with the day passed, accessibility/overdue:<id> (fixture); with no
       reason, owner or real day, or naming a milestone that has the line, accessibility/entry:<id> (fixture)

Given  a closed milestone with no accessibility line, and an entry for it
Then   with a day still to come DS1 reports nothing and its view names the milestone (control); with the day
       passed, accessibility/overdue:<id> (fixture): closing a milestone does not end its entry

Given  an active milestone past the skeleton, no design item before it, and a design item in its own Contents
Then   below started items only, DS1 reports nothing for it (control); below an item not started,
       design/missing:<id> (fixture)

Given  an active milestone with screens: none, no design item and no accessibility line
Then   DS1 reports 0 findings and its view names the milestone and the field (control)

Given  an active screen milestone naming design: PD-<n>, with no design item and no accessibility line
Then   with the decision in decisions.md DS1 reports gate/accessibility:<id> only (control); without it,
       design/unresolved:<id> too (fixture)

Given  an active screen milestone naming design: .* (or any text that is not PD-<n> or D-<n>)
Then   DS1 reports design/unresolved:<id> whatever decisions.md holds (fixture); and MS1 reports
       extended/unresolved for extended: .* the same way (a red case of MS1's own)

Given  an active milestone whose screens: is any other word
Then   DS1 reports screens/unknown:<id> (fixture)

Given  docs/product/FRAME.md that cannot be read as a file
Then   DS1 exits 2, BROKEN (fixture)

Given  a front-end project in its skeleton (its own line written), M2 shaping with no design item anywhere and
       no accessibility line
When   pnpm status runs
Then   Needs attention holds one line for each, in planning words (where the item can go, what the Gate does
       not say); with the design item as item 1 of a shaping M2 and M3 shaping after it, no design line for
       either; with no front-end line in the frame, one line saying to write it; with the frame still the
       template, none (one case each under ci/fixtures/status/, S1)

Given  a project synced from before this release: a frame with no front-end line, an active milestone
When   pnpm meta runs
Then   DS1 reports frontend/unrecorded, and the test for it fails when a missing line is read as none while
       every control still passes (Verify; both runs pasted in the pull request); the pull request's ## What
       says in one sentence what such a project sees on the sync

Given  /review-doc reviewing a PRD or a milestone
Then   it asks who designs this and when, and whether accessibility is in a gate (skills.test.mjs pins it)

Given  /sync-slipway bringing this release to a project
Then   it asks the owner where people use the product and writes the frame's line; for a front end with a
       milestone running that builds screens it asks once more, about that milestone, before its pull request
       opens, and writes the answer as the line or a dated entry, the item or a named decision; it writes
       nothing into a milestone still being shaped; a skeleton already running keeps its no-go as it is, and
       the owner is told so in the sync's output (skills.test.mjs pins each sentence)

Given  slipway's own tree
When   pnpm meta runs
Then   it exits 0
```

## Verify

```
pnpm meta
node ci/checks/meta/ds1-design-before-screens.mjs .
node ci/checks/meta/pc1-positive-control.mjs
node ci/checks/meta/s1-status.mjs ci/fixtures/status
node scripts/ds1.test.mjs
node scripts/skills.test.mjs
```

The acceptance's "fails with the change reverted" is one mutation, made by hand on a committed tree and put back
with `git checkout` (L-04): in the frame reader, make a missing front-end line read as `none`. Then
`node scripts/ds1.test.mjs` must fail on the `frontend/unrecorded` test and on no control. The pull request pastes
that run and the clean one. Reverting DS1's commit is not this proof: with the check gone every test fails.

## Build map

Each step is one pull request. `.claude/**`, `ci/**` and `package.json`'s scripts are owner-only: steps 3 and 4
ask before they edit, and list each file under `## Gate changes`.

Steps 2 to 4 ship in one release, with no tag between them: a project created or synced between the steps goes
red on something it was never asked (after 2, a frame placeholder its `/kickoff` does not ask about; after 3,
`frontend/unrecorded` before `/sync-slipway` asks the question, the option D-042 declined). Each of the three
pull requests says "no tag until step 4" in its body.

1. This document and D-042 (docs, no build). Then `/review-doc` from a fresh session.
2. Templates: the front-end line in `docs/product/FRAME.md`; `screens:` and `design:` in
   `docs/milestones/TEMPLATE.md`'s header note and the accessibility line under its Gate;
   the skeleton's Gate gains the line and its no-go names where design lands. Pins in `scripts/skills.test.mjs`.
   Nothing new fires yet: no check reads these lines until step 3.
   - Carried from the 0.2 review: AR-6 point 1, check what class `docs/milestones/TEMPLATE.md` has
     (`classify()`, `dev/ownership.yaml`: the Contract's "Verified against" says seeded, §3 speaks of a template
     that loses the field) against the code and pin it with a test.
3. The check: `ci/checks/lib/milestones.mjs` gains `designItems()` and the decision resolver; the frame line
   reader; `ci/checks/meta/ds1-design-before-screens.mjs`; `ci/fixtures/known-bad/ds1/` (one case per id);
   `scripts/ds1.test.mjs` (controls, and the mutation run); `package.json`'s `meta` gains the check and the test;
   the `pnpm status` lines and their cases under `ci/fixtures/status/`. Run once against a real project's files
   before it ships (decision-defaults §9), the result recorded as a count.
   - Carried from the 0.2 review: AR-3, check the view's channel (what `report()` prints on a red run, what PC1
     compares in each `expected.json`, what DS1 counts as scanned, where DS1 sits in `meta`) against the code
     and pin it with a test.
   - Carried from the 0.2 review: AR-6 point 2, check that W1 reports a check file no workflow runs in a
     project as well as in slipway against the code and pin it with a test.
   - Carried from the 0.3 round: AR-1, check how FO1 treats a registry entry that is not its own (it reports
     one that matches no `continue-on-error` as stale, and skips only the lockfile's) against the code and pin
     with a test that an entry of DS1's class is not reported by FO1 or LK1; the registry's header comment
     gains the id's form.
   - The resolver's hold (§4) changes what MS1 passes: `ci/checks/meta/ms1-milestones.mjs` is a gate file, its
     callers are the two uses of `hasDecision` (L-15), and the pull request says so under `## Gate changes`.
4. The skills: `/kickoff` (the question, the item, the no-go, the Gate line, the readiness question),
   `/review-doc` (the step-2 item), `/sync-slipway` (the question on sync, and the one about a running milestone),
   each pinned in
   `scripts/skills.test.mjs`; the comment on #94.
   - Carried from the 0.2 review: AR-6 points 3 and 4, check sync's own rule (both gates green before its pull
     request opens) and how a declined change reaches the owner against `.claude/skills/sync-slipway/SKILL.md`
     and pin each sentence with a test.

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
- 2026-10-12 · CHANGED · 0.2, the sixteen findings of `docs/reviews/2026-10-12-design-before-screens-0.1.md`
  resolved. The owner's two picks, recorded as an amendment to D-042: the skeleton carries the accessibility line
  and design need not come before it (AR-1); a milestone already running says how its screens meet the level or
  names a decision, `accessibility: PD-<n>` (AR-5). By the orchestrator session's advice: hours stated as held
  per milestone only (AR-2), the front-end line's grammar (AR-6), the check's view names what it skipped (AR-9),
  steps 2 to 4 in one release (AR-11). The author's: placeholders in the form the checks read (AR-3), how DS1 is
  registered (AR-4), order by milestone number (AR-7), controls for each way out (AR-8), the mutation in Verify
  (AR-10), the status lines held by S1 (AR-12), and AR-13 to AR-16 · #406
- 2026-10-13 · CHANGED · 0.3, against `docs/reviews/2026-10-12-design-before-screens-0.2.md`, under the capped
  loop: six findings change the text (AR-6 in part), AR-3 and the rest of AR-6 are carried into the build as
  lines under Build map, and seven are tracker only. The owner's pick, recorded as a second amendment to D-042:
  "not held yet" is a dated entry in `ci/exceptions.yaml`, read after the milestone closes, in place of
  `accessibility: PD-<n>` (AR-1). By the
  orchestrator session's advice: the status line asks a planning question through one shared predicate, and a
  frame still the template gets no line (AR-5); the sync's two answers are owed before its pull request opens,
  and a skeleton already running keeps its no-go, with the owner told (AR-6). The author's: the four passages
  that said "before the first screen" (AR-2), a decision reference held to an id (AR-4), and no claim about
  what meets WCAG 2.2 AA at the skeleton (AR-11, withdrawn from D-042's amendment too) · #406
