# Adversarial review — F-14 design before screens 0.2

Reviewed: dev/features/design-before-screens.md @ 5719345
Version line: Version: 0.2 (2026-10-12)
Supersedes: docs/reviews/2026-10-12-design-before-screens-0.1.md
Review date: 2026-10-12
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`.

**How this review was run.** By a fresh-context agent (model id `claude-opus-5-5`, as the harness reports it)
spawned from the session that wrote version 0.2. `/review-doc` says to run it in a session that did not write the
document, opened by the owner; this is not that, and the owner should weigh it as such. The agent was given the
owner's instruction ("/review-doc dev/features/design-before-screens.md. Commit the review to that branch; it
supersedes docs/reviews/2026-10-12-design-before-screens-0.1.md"), the working path, and no account of what the
document says, what changed in it or what to look for. It asked the spawning session nothing. Two departures from
the skill's step 3, both relayed as the owner's instruction: the review is committed on the branch of pull request
#411 (`docs/design-before-screens-0.2-406`) with no branch or pull request of its own, and it is not pushed. One
earlier review in `docs/reviews/` names this path, the 0.1 review, and is superseded above. It was read, because
the tree holds it and the document's Changes entry cites it; its findings are not re-scored here, and where one
below overlaps one of them it says so.

**What was read.** In full: the target at 5719345; `.claude/skills/review-doc/SKILL.md`; `docs/reviews/TEMPLATE.md`;
`docs/reviews/2026-10-12-design-before-screens-0.1.md`; issue #406 (body and its one comment), the document's
source; `decisions.md` D-042 with its amendment, D-024 and D-027; `docs/product/FRAME.md`;
`docs/milestones/TEMPLATE.md`; `docs/milestones/M1-walking-skeleton.md`; `docs/domain-invariants.md` (an empty
table: nothing to check against); `process/decision-defaults.md`; `.claude/skills/kickoff/SKILL.md`;
`.claude/skills/sync-slipway/SKILL.md`; `ci/checks/lib/milestones.mjs`, `frontmatter.mjs`, `markdown.mjs`;
`ci/checks/meta/ms1-milestones.mjs`, `k1-frame.mjs` (lines 1–178), `pc1-positive-control.mjs`. In part, to check a
named claim: `ci/checks/lib/report.mjs` (lines 52–112), `ci/checks/lib/raw-output.mjs`, `ci/checks/lib/risks.mjs`
(`milestoneNumber`), `ci/checks/meta/w1-declared-vs-invoked.mjs` (header, lines 150–172), `s1-status.mjs`
(header), `r1-review-provenance.mjs` (header), `f1-feature-coverage.mjs` (the `no feature` rule), `ci/status.mjs`
(lines 56–125, 250–350), `scripts/sync.mjs` (lines 436–470), `dev/ownership.yaml`, `package.json` (`meta`),
`.github/workflows/ci.yml` (its `run:` lines), `docs/PRD.md` §9, `SLIPWAY.md` (the thesis line),
`.claude/skills/close-milestone/SKILL.md` §2 and §4, `process/intake.md` → Feature doc version, the titles of
`process/lessons/` and the heads of L-04, L-09, L-15 and L-43, the first 900 characters of issue #94.

**What was run.** Each from the working tree, none writing a file in it:

- `PLACEHOLDER` (`ci/checks/lib/frontmatter.mjs:30`) against the three template lines as the Contract writes
  them: all three match on their own line, and the accessibility bullet, joined, both matches and contains
  `WCAG 2.2 AA`. The Contract's claims about them hold.
- MS1's `hasDecision` pattern (`ms1-milestones.mjs:79`) against a `decisions.md` holding `## D-001 …`,
  `## Week 1 …` and `## PD-12 …`: `PD-12` resolves and `PD-1` does not; `.*`, `.`, `D`, `Week` and `PD-1|D` all
  resolve (AR-4).
- `frontmatter()` on a block with an empty `screens:` line: the value is `{}`, not a string (AR-14).
- `classify()` (`ci/checks/lib/ownership.mjs`) on the paths the Contract touches:
  `docs/milestones/TEMPLATE.md` is `managed`; the skeleton, the frame and `decisions.md` are `seeded`;
  `package.json` is `merged`; `ci/fixtures/status/**` and `scripts/ds1.test.mjs` are `internal` (AR-6).
- The Problem's search, over the files it names: the three hits it reports and no other. It holds.
- `grep -l '"attention"' ci/fixtures/status/*/expect.json`: 13 of 21 cases; `grep -rl '^Front end:' ci/fixtures
  docs`: none (AR-5).
- `node ci/status.mjs .` (no `--write`), `git log a76c489..HEAD`, `gh pr view 411`, `gh issue view 406`.
- `node ci/checks/meta/ms1-milestones.mjs <an empty folder>`: exit 2, "nothing was examined" (AR-3, point 4).
- `node ci/checks/meta/r1-review-provenance.mjs .` before this file existed: 1 finding, the 0.1 review stale.

**What held.** The Contract's "Verified against: a76c489" claims I opened match their description, with the one
exception in AR-6: the line numbers for `contents()`, `readMilestones()` and `PLACEHOLDER`; `prose()`, `section()`,
`noGos()`, `started()` and `plain()` as described; K1 BROKEN with no frame, and `placeholder/present` read over
the whole frame once a milestone is active or closed; MS1's `section/Gate` and `section/No-gos` on a placeholder
in an active milestone, and `estimate/over-appetite` as a warning; PC1 running every check file against
`ci/fixtures/known-bad/<id>/`, with `details`, a `broken` prefix and no green case; W1's rules 2 and 3;
`milestoneNumber()`; `(no feature: design)` as F1 reads it; PRD §9 one row per milestone; kickoff's Phase 1 steps
1–7, Phase 3 step 4 and step 5; review-doc's step 2 items 1–8; the `script kept, yours differs` path in sync.
a76c489 is `origin/main`, and the two commits on top of it change only `decisions.md` and the target.

**Not verified.** The private project the Problem describes (it rests on #406's word). WCAG 2.2's text: AR-11 is
from the reviewer's knowledge of the standard, not from a page opened in this run. `/work-ticket` and
`/log-feature` were not read, so what they do with an issue's `Touches:` line (AR-10) is not checked.
`scripts/new-project.mjs` beyond a search for `meta`, `ci/status.mjs` outside the lines named, `process/cold-review.md`
and `process/designation.md` were not read. `docs/product/FRAME.md` in slipway is the unfilled template, so there
is no FRAME question to test the feature against; the document cites `SLIPWAY.md`'s thesis ("a rule exists only
where something fires") instead, and AR-1, AR-3 and AR-5 are read against that.

**The eight passes.** The question: no feature drifts from the thesis the document cites; AR-1 is where it is left
unmet. Criteria that cannot fail: AR-9. Assumptions stated as facts: AR-11, and the two code claims in AR-3 and
AR-6. Contradictions: AR-2, AR-6, AR-7, AR-12. Source coverage: a feature doc has no coverage table, so #406's six
points and eight acceptance lines were walked by hand; all six points have a section, and AR-10 lists the
acceptance lines the Contract departs from. Scope: nothing is in that should be out. Sequencing: AR-12, AR-13.
What is missing: AR-1, AR-4, AR-5, AR-8, AR-14.

**Not argued.** D-042's six choices and the two picks of its amendment are the owner's decisions of 2026-10-12. A
finding below touches one only where the document's own text contradicts it, where the code contradicts what it
was built on, or where the Contract leaves it with nothing that fires.

No finding below is S0.

## Severity

| Level | Meaning |
|---|---|
| S0 | Can invalidate the business or the build. Resolve before writing code. |
| S1 | Loses money, breaks correctness, or breaches a stated principle. Fix in the spec before the affected phase. |
| S2 | A real defect or contradiction. Cheap now, expensive later. |
| S3 | Inconsistency or hygiene. Batch these. |

## Register

| ID | Finding | Sev | Owner | Blocks | Tracker |
|---|---|---|---|---|---|
| AR-1 | `accessibility: PD-<n>` defers the line to a date nothing reads, is open to every milestone, and leaves every surface when the milestone closes | S1 | owner | Build map 2, 3 | #406 · D-042 amended 2026-10-13 (the owner's pick: a dated entry in `ci/exceptions.yaml`) · F-14 0.3 §3, §4; the FO1 fact carried under Build map step 3 |
| AR-2 | Four passages still place design "before the first screen", the wording D-042's amendment replaced; two of them become pinned skill sentences | S2 | author | Build map 4 | #406 · F-14 0.3 Problem, §5 |
| AR-3 | DS1's view has no named channel in `report()`: the claim prints on a pass only, the controls assert the view only at exit 0, and `pnpm meta` stops before DS1 when an earlier check is red | S2 | author | Build map 3 | #406 · Build map step 3, carried: checked against the code and pinned with a test |
| AR-4 | The resolver lifted from MS1 takes any text: `design: .*` names a decision that exists | S2 | author | Build map 3 | #406 · F-14 0.3 §4; built in Build map step 3 |
| AR-5 | The `pnpm status` line asks what a shaping milestone "would get once active" and does not say what the other milestones are then; read with the check's own rule it reports a correct plan | S2 | owner | Build map 3 | #406 · F-14 0.3 §4 `pnpm status`; built in Build map step 3 |
| AR-6 | Four statements about what a sync does are not what sync does: the milestone template is managed, a kept `meta` line turns W1 red, the skill may not end red, and an active skeleton's no-go has no answer | S2 | author | Build map 4 | #406 · F-14 0.3 §4, §5 (points 2 to 4, and the pinned sentence of point 1) · the rest carried: Build map step 2 (point 1), step 3 (point 2), step 4 (points 3, 4) |
| AR-7 | The design item's place "in a milestone already running" is every milestone's, and the document says otherwise twice | S3 | author | — | #406 · Build map step 3: the limitation's sentence corrected in that pull request |
| AR-8 | Two more edits turn `design/missing` off, and the view names neither | S3 | owner | Build map 3 | #406 · Build map step 3, decided with AR-3's channel: the view says what satisfied each milestone, or both are accepted under Known limitations |
| AR-9 | The fixture list, the acceptance and the predicate disagree: one case named in one and not the other, five clauses with no case, two of `/kickoff`'s behaviours with no acceptance line | S3 | author | Build map 3, 4 | #406 · Build map step 3 (one case list, the killed case, the five clauses, the red test in `scripts/ds1.test.mjs`) and step 4 (the two `/kickoff` pins) |
| AR-10 | The Contract departs from three of #406's acceptance lines and its `Touches:`; the document flags one | S3 | author | — | #406 · its body, edited when the Contract of 0.3 was embedded (acceptance lines 2 and 7, `Touches:`), with a comment saying so |
| AR-11 | "Plain semantic markup with a keyboard pass meets the level" is asserted, and WCAG 2.2 AA asks more of a sign-in form | S3 | owner | Build map 2 | #406 · D-042 amended 2026-10-13 (the clause withdrawn) · F-14 0.3 §3 |
| AR-12 | The one-release hold lives in three merged pull request bodies, does not cover a sync from `main`, and sits beside "nothing new fires yet" | S3 | owner | Build map 2–4 | #406 · Build map step 2: its pull request rewords "nothing new fires yet" and has the hold written in #379 |
| AR-13 | The run on a real project's files reports at most one finding and reads no milestone | S3 | author | Build map 3 | #406 · Build map step 3: two runs on a scratch copy; nothing of a private project is recorded |
| AR-14 | Six readings the check depends on are not specified | S3 | author | Build map 3 | #406 · Build map step 3: one line each, and a case for readings 1, 2 and 3 |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — `accessibility: PD-<n>` defers the line to a date nothing reads, is open to every milestone, and leaves every surface when the milestone closes

**Where:** F-14, Contract §3 "Not held yet" (lines 163–166), §4 the findings table, `gate/accessibility` and
`accessibility/unresolved` (lines 188–189), §5 `/close-milestone` (line 296), Known limitations (lines 351–352);
against D-042 "Where accessibility is proved" and its amendment, `SLIPWAY.md:9`, L-43, D-024 and
`.claude/skills/close-milestone/SKILL.md` §2.

> **Not held yet.** A milestone names a decision in its frontmatter, `accessibility: PD-<n>`, in place of the
> line: the decision in `decisions.md` says what is not held yet and by when. It is the way out for a milestone
> that was already running when the rule arrived

Three things follow from the Contract as written.

1. **Nothing reads "by when".** DS1 resolves the heading and nothing else (Known limitations says so). When the
   date passes, no check, status line or skill says it has. L-43's rule is "Deferred work is only real if
   something other than memory fires it."
2. **Closing drops it.** DS1 looks "only when a milestone is active", closed milestones "are not reported", and
   the view names active milestones. `/close-milestone` §2 produces evidence "for every line under `## Gate`", and
   a milestone that named the decision has no such line; the Contract says of that skill "No change". The next
   milestone's line reads "Screens built here meet WCAG 2.2 AA": here, not there. So the screens built under the
   deferral leave every surface on the day their milestone closes, and what finds them afterwards is an audit.
   D-042: "A later audit confirms and does not discover."
3. **It is not only for a running milestone.** The check cannot tell which milestone was running when the rule
   arrived (the amendment says as much: "an exemption needs a marker a check can read anyway"), so the table
   offers the field to every `gate/accessibility` finding, a new project's skeleton included, and each later
   milestone can name the same decision. D-042 declined "A before launch and AA after"; one decision saying
   exactly that, named in each milestone, passes, with one line in the view.

S1 and not S2, for a stated reason: this is the path on which the feature reproduces the failure it was filed for
(accessibility put off to a point nothing checks), and the principle left unmet is the one the document cites for
itself, `SLIPWAY.md:9`, "a rule exists only where something fires".

**Proposed resolution.** Not a reopening of the pick: a running milestone needs a way out. Give the deferral a
detector, one of: (a) the field names the decision and the milestone it is due by (`accessibility: PD-4 by M4`),
and DS1 reports `accessibility/overdue:<id>` once that milestone or a later one is active or closed, as K1 holds
the PRD's `before Mn` (`risk/overdue`), which means reading this one field in closed milestones; (b) reuse D-024:
the deferred pass is an `Owed:` line under a Contents item, which MS1 already fails on a closed milestone
(`checks/owed`), so the milestone cannot close with it unrecorded, stricter than "by when" and the owner's to
choose; (c) at the least, `/close-milestone` gets a change (a milestone naming `accessibility:` closes only with
the pass recorded, or with the debt written by name into the next milestone's Gate), and Known limitations says
that the field is open to every milestone and that nothing reads its date.

### AR-2 — Four passages still place design "before the first screen", the wording D-042's amendment replaced; two of them become pinned skill sentences

**Where:** F-14, Problem, the Job line (lines 12–15) and the options table (line 48); Contract §5 `/kickoff`
(lines 267–268) and `/review-doc` (lines 275–276); against §2 "Where it sits" (lines 100–105), Acceptance (lines
368–375) and D-042's amendment.

The amendment: "The design item sits before the first screen milestone past the skeleton … This replaces 'before
the first item that builds a screen' above." §2 and the acceptance say so. Four passages do not:

> I want its design to be a piece of work with a place and hours before the first screen is built

> one design item before the first screen, a WCAG line per screen milestone, a check that reads both

> Phase 3 step 4, for a front-end project: place one design item before the first screen item (§2)

> is there a design item before the first screen, with hours?

The first screen item in every project is the skeleton's item 2 (`docs/milestones/M1-walking-skeleton.md:25`,
"Sign in, then the one core action"). A `/kickoff` written from §5's sentence places the design item in M1 ahead
of it, which is the option the owner declined in the amendment ("both applying to the skeleton (design work ahead
of proving the stack)"). A `/review-doc` written from §5's sentence asks of every PRD a question whose honest
answer is always no. Both sentences are ones `scripts/skills.test.mjs` is to pin, so the builder of step 4 copies
them. The 0.1 review's AR-1 was resolved in §2 and §3; these are what it left.

**Proposed resolution.** Reword all four to the amended place: "before the screens that follow the skeleton" in
the Job line and the options row, "before the first screen milestone past the skeleton, or as that milestone's
item 1" in `/kickoff`, and in `/review-doc` "is there a design item before the screens that follow the skeleton,
with hours? Does every milestone that builds screens, the skeleton included, carry an accessibility line".

### AR-3 — DS1's view has no named channel in `report()`: the claim prints on a pass only, the controls assert the view only at exit 0, and `pnpm meta` stops before DS1 when an earlier check is red

**Where:** F-14, Contract §4 first paragraph (lines 170–173), "When it looks" (line 178), "Its view says what it
skipped" (lines 203–209), "Exit" (lines 210–212), the controls (lines 239, 245–246), Threat model (lines
334–338); against `ci/checks/lib/report.mjs:65–100`, `ci/checks/lib/raw-output.mjs` and `package.json:20`.

> So DS1's printed view, on every run and at exit 0 too, names the front-end state it read and each active
> milestone it did not hold to a finding … No new gate: the off state is in every `pnpm meta` output

The view is the Threat model's whole answer to a one-word silence ("It is made visible"). Read against the code
it is to be printed through:

1. `report()` prints `claim` on a pass only (`PASS — green proves: <claim>`). On a red run it prints the scanned
   line, `exempted`, warnings and findings. A view built into the claim, which is where MS1 and K1 put theirs, is
   absent on every red run. The fields printed on every run that is not BROKEN are `unit`, `exempted` (with
   `exemptedBy`) and `warnings`; PC1 holds every other line to the `DS1: ` prefix. The Contract names none.
2. The controls assert the view in two cases, both at exit 0 (`screens: none`; `accessibility: PD-<n>` with a
   design item). The control that exits 1 with a silenced half (`design: PD-<n>`, `gate/accessibility` only) does
   not assert it. A claim-only view passes every case listed.
3. If the view goes through `exempted`, PC1 compares that set exactly in every known-bad case
   (`pc1-positive-control.mjs:187`), so each `expected.json` names it too. The Fixtures paragraph lists "its exit,
   every finding id and a detail".
4. `report()` returns BROKEN when `scanned` is 0. "A missing `docs/milestones/` or a missing frame compares
   nothing and says nothing" is not an exit it offers, and the Contract does not say what DS1 counts.
5. `meta` is one `&&` chain. When any check before DS1 in it is red, DS1 does not run, and its view is in no
   output: "every `pnpm meta` output" holds only on a run that reaches it. The Contract does not say where in the
   chain DS1 goes.

**Proposed resolution.** Name the channel: the skipped states go through `exempted` with `exemptedBy` set to
"the project's own files" (ID1 does this with `companion-of`), and the front-end state goes in `unit`, so both
print on red and green alike. Add the view to the `design: PD-<n>` control and to each fixture's `expected.json`.
Say what DS1 counts (the frame and each milestone document read) and that with nothing to count it is BROKEN,
as MS1 is with no milestone folder. Say that the view is in DS1's own output, and where DS1 sits in `meta`.

### AR-4 — The resolver lifted from MS1 takes any text: `design: .*` names a decision that exists

**Where:** F-14, Contract §4 (lines 201–202), Reuses (lines 302–304), Threat model (lines 337–338); against
`ci/checks/meta/ms1-milestones.mjs:79` and `process/decision-defaults.md` §3 and §4.

> `design: PD-<n>` and `accessibility: PD-<n>` are read like `extended:` (MS1): the id must exist as a
> `## PD-<n>` or `### PD-<n>` heading in `decisions.md`.

> and a field that names a decision `decisions.md` does not hold is a finding.

MS1's line is `new RegExp(`^#{2,3}\\s+${id}\\b`, 'm')`, with `id` the frontmatter value as written. It does not ask
for `PD-<n>`, and it does not escape. Run against a `decisions.md` with the headings every project has: `D`
resolves (`## D-001 …`), `Week` resolves (`## Week 1 — decide before M1 closes`), and `.*`, `.` and `PD-1|D`
resolve against anything. The Contract tells the builder to lift this pattern into the lib "so `design:` and
`extended:` resolve the same way". Then `design: .` on an active milestone is "a decision that exists": no
`design/missing`, no `design/unresolved`. The same for `accessibility:`.

Decision-defaults §3 asks one question, "can a pull request's committed files cause it? Yes, and it is a fix",
and §4 says a value that is not recognised never passes. The Threat model's last clause is the backstop the
0.1 review's AR-9 was resolved on, and for these values it does not fire. `extended:` has the hole today; this
feature copies it into two more fields.

**Proposed resolution.** The lifted resolver first holds the value to `^P?D-\d+$` (anything else is unresolved,
with the value quoted), then looks for the heading with the id escaped. One known-bad case, `design: .*`
expecting `design/unresolved`. The lift tightens MS1's `extended:` in the same change (decision-defaults §5,
stricter when both work); it is a gate file, so the Build map says so and L-15's list of callers is MS1 lines
107 and 124.

### AR-5 — The `pnpm status` line asks what a shaping milestone "would get once active" and does not say what the other milestones are then; read with the check's own rule it reports a correct plan

**Where:** F-14, Contract §4 "`pnpm status`" (lines 255–263) and "A design item counts when" (lines 195–197),
Acceptance (lines 423–427); against D-042 "A check, not advice" and `ci/fixtures/status/`.

> For a shaping milestone that would get `frontend/unrecorded`, `design/missing` or `gate/accessibility` once
> active, one line each under Needs attention … computed by the same reader … so the status line and the check
> never disagree.

> A design item counts when its milestone is `closed` or `active`. One in a `killed` milestone (its work
> stopped) or in a `shaping` one (its work has not started) is not design before the screens

D-042 gives shaping milestones "a line in `pnpm status` only", so this line is the one signal an owner has while
the plan can still take the work. Take the plan `/kickoff` is told to write: M1 the skeleton, the design item as
item 1 of M2, M3 after it, all `shaping`. What would M3 get once active? By the check's rule the item in M2 is in
a shaping milestone and does not count, so M3 shows `design/missing` under Needs attention from the day kickoff
ends until M2 starts. Put the item in the skeleton instead and M2 shows it until M1 starts. A line that is there
on every correct plan is one the owner learns to read past. The other reading (suppose every earlier milestone
closed by then) gives the right answer and is a different predicate from the check's, which the "same reader"
sentence rules out. The Contract does not choose, and its one acceptance case (M2 shaping with no item anywhere)
cannot tell the two apart.

Three smaller things in the same paragraph:

- The reader is shared; the predicate is not. "Before" by number, which statuses count, item 1 or below started
  items, the decision fields and `screens: none` live in DS1, a script that exits. Status needs them as a function.
- The line uses the finding's words. For a shaping M2 those are "a design item as item 1 of `<id>`, or below the
  items already started": the second half means nothing in a milestone not started, and the place §2 names
  first, an earlier milestone, the skeleton included, is not offered.
- "A frame with no front-end line is shown the same way, before any milestone is active." No fixture frame has
  the line, and 13 of the 21 cases under `ci/fixtures/status/` pin their whole `attention` list, so each gains a
  bullet or a line in its frame. Slipway's own tree and every project at step 0 show it too, once the template
  carries the placeholder. Neither is wrong; step 3 is larger than "their cases" reads.

**Proposed resolution.** Define the status question on its own: for a shaping milestone, a design item in any
earlier milestone that is not killed counts, shaping included, and the line is written for planning ("M3 has no
design item before it: add one to an earlier milestone, or as its item 1"). Put the predicate in the lib as one
function with the supposed-active id as an argument, called by DS1 and by status. Add the case that tells the
readings apart (item 1 of a shaping M2, M3 shaping: no line) to `ci/fixtures/status/` and to Acceptance, and say
whether a frame that is still the template shows the front-end line.

### AR-6 — Four statements about what a sync does are not what sync does

**Where:** F-14, Contract §3 (lines 139–141), §4 "Registered in three places" (lines 217–221), §5 `/sync-slipway`
(lines 286–289, 292–293), "Verified against" (lines 321–322); against `dev/ownership.yaml`,
`ci/checks/meta/w1-declared-vs-invoked.mjs:152–157`, `.claude/skills/sync-slipway/SKILL.md` §3 and §5.

1. **The milestone template is managed.**

   > `dev/ownership.yaml` (`docs/product/**` and `docs/milestones/**` seeded, `.claude/skills/**` managed)

   > **The template and the skeleton**, where the project kept slipway's text: the diff is taken

   The map is ordered, first match wins, and `docs/**/TEMPLATE.md` (managed) sits above `docs/milestones/**`.
   `classify()` returns `managed` for `docs/milestones/TEMPLATE.md`. A sync replaces it whole: there is no diff
   to take, no text the project "kept", and no question. Only the skeleton and the frame arrive as diffs. So
   every synced project gets the Gate bullet and the header note in its template with nothing asked, and §3's
   "a template that loses it" cannot happen in a project short of an override. The sentence in §5 is one the
   skill is to carry, pinned.
2. **A kept `meta` line turns W1 red.**

   > a project that changed its own keeps it and is told (`script kept, yours differs`), with DS1 not run there
   > until the owner takes the line.

   The check file is managed and arrives regardless. W1's rule 2 has no template condition: a check in
   `ci/checks/meta/` that no workflow runs is a finding in a project too. That project is red on
   `check:ds1-design-before-screens.mjs` from the sync, which is a better outcome than the one written and is
   what the pull request's `## What` sentence has to say.
3. **The skill may not end red.** "Unanswered, the project is red on at most two findings for that milestone."
   Sync's §5 says of `pnpm verify` and `pnpm meta`, "Both must be green", before it opens the pull request. The
   Contract does not say which gives: the skill stops and waits, or it opens red.
4. **An active skeleton's no-go has no answer.** A project in its skeleton that kept the no-go's words takes
   the new sentence, with its placeholder for where design lands. MS1 fails that placeholder in an active
   milestone (`section/No-gos`). Filling it needs a design item that exists, and "Milestones still being shaped
   get nothing written". That is a third question the Contract does not count, or a third red it does not name.

**Proposed resolution.** Correct "Verified against" (`docs/**/TEMPLATE.md` managed). Rewrite the third bullet:
the template is replaced by the sync; the skeleton's and the frame's changes arrive as diffs. Say what a kept
`meta` line gives (W1 red until the line is taken). Say that the two questions are owed before the sync's pull
request opens, or that it opens red and says so. For an active skeleton, ask where design will land and write
the no-go, or decline that one sentence and record it under Decided by sync.

### AR-7 — The design item's place "in a milestone already running" is every milestone's, and the document says otherwise twice

**Where:** F-14, Contract §2 "In a milestone already running" (lines 106–109), §4 `design/missing` (line 186),
Known limitations (lines 349–350).

> a milestone that was active when this rule arrived adds the item below the work already begun

> A design item added below started work, in a milestone that was running when the rule arrived, is not design
> before those screens.

The check reads "item 1, or any position when every item above it is started" of every active milestone. A
milestone shaped next year with three screen items carrying their ` · #n` markers and `4. Design: …` under them
passes. The rule is the price of having no marker for "was running" (the amendment says so), and the position
rule is the only thing that makes "design before screens" more than presence. This is the design half of AR-1's
third point, without a deferral: lower, and worth one honest sentence.

**Proposed resolution.** Drop "that was running when the rule arrived" from the limitation and say the rule
holds for any milestone: the check holds that the items still to start follow the design item, never that the
started ones did.

### AR-8 — Two more edits turn `design/missing` off, and the view names neither

**Where:** F-14, Contract §4 `design/missing` (line 186), "A design item counts when" (lines 195–197), "Its view
says what it skipped" (lines 203–209), Threat model (lines 334–338); against `ms1-milestones.mjs` and
`k1-frame.mjs:94`.

The view lists four words (`Front end: none`, `screens: none`, `design: PD-<n>`, `accessibility: PD-<n>`). Two
more edits in a pull request's own files do the same work:

- `kind: skeleton` on the active milestone. `design/missing` excepts "the skeleton", read by `kind`. MS1, read in
  full, has no rule on how many milestones carry the kind or which. (K1 already lets a second skeleton past its
  value-risk gate, so the word is not new; DS1 adds a second thing it opens.)
- A `Design:` item added to a closed milestone. It counts "without the check reading whether it was delivered",
  for every later milestone, and nothing reads a closed milestone's Contents changing. A pass by an honest item
  and a pass by one added last week print the same thing: nothing.

**Proposed resolution.** For the owner, as with the 0.1 review's AR-9: accept both under Known limitations, or
have the view say what satisfied each active milestone as well as what skipped it (`M3: design item M1#7`,
`M1: skeleton, no design owed`). One more line of output, and a reviewer sees a design item that appeared in a
closed file.

### AR-9 — The fixture list, the acceptance and the predicate disagree

**Where:** F-14, Contract §1 (lines 61–77), §4 Fixtures and Controls (lines 223–253), §5 `/kickoff` (lines
267–274), Acceptance (lines 368–375, 388–389, 429–433), Verify (lines 460–463); against L-09.

- Acceptance names a fixture for "the only design item in a killed milestone". §4's list is one case per id,
  three more and two more, and the killed case is not among them.
- Verify's mutation "must fail on the `frontend/unrecorded` test" in `node scripts/ds1.test.mjs`. §4 puts
  controls in that file and the red case for that id under `ci/fixtures/known-bad/ds1/`, which PC1 runs. If the
  red test is not also in `ds1.test.mjs`, the mutated run passes whole.
- Clauses of §1 and §4 that no listed case kills (L-09: "name the test that dies without it"): two front-end
  lines read as none; an empty value; a `[PARKED: …]` value read as a front end; `screens/unknown` still
  reported under `Front end: none`; a design item in an earlier shaping milestone not counting. A reader that
  takes the first of two lines, or treats a parked value as unrecorded, passes everything named.
- Two of `/kickoff`'s behaviours have no acceptance line: the Phase 1 question and its writing of a terminal, an
  API and nothing as `none (…)` (§1), and the deletions for a project with no front end (§5). The one kickoff
  line starts from "a project whose frame says people use it through screens". A skill that writes
  `Front end: a terminal` gives a command-line tool every finding in the table, and no line says it must not.

**Proposed resolution.** One list, in §4, that Acceptance points at by case name; the killed case added to it;
the `frontend/unrecorded` red test named as living in `scripts/ds1.test.mjs`; one case each for the five
clauses; two acceptance lines for `/kickoff` (the question and its `none` mapping; no front end deletes the
no-go and the lines), each pinned.

### AR-10 — The Contract departs from three of #406's acceptance lines and its `Touches:`; the document flags one

**Where:** F-14, Contract §4 Controls (lines 231–233), Verify (lines 460–463); against #406 Acceptance lines 2, 4
and 7 and its Links.

The document says once that #406 "is edited to match when this Contract is embedded" (the control PC1 cannot
run). #406 is labelled `needs-shape` for want of the embedded Contract and Verify, so that edit is the next
thing that happens to it. Two more of its lines will then contradict what is pasted beside them:

- line 2, "in a milestone before the first one that builds a screen" (the amendment: past the skeleton);
- line 7, "1 test that fails with the change reverted" (Verify: one mutation, and "Reverting DS1's commit is not
  this proof").

And `Touches:` names none of `docs/product/FRAME.md`, `.claude/skills/sync-slipway/SKILL.md`, `package.json`,
`ci/status.mjs`, `ci/checks/lib/**`, `ci/fixtures/status/**` or `scripts/ds1.test.mjs`, all of which the Build map
edits.

**Proposed resolution.** One sentence under Build map step 1 listing the three acceptance lines and the paths to
add when the Contract is embedded, so the issue and the document say one thing.

### AR-11 — "Plain semantic markup with a keyboard pass meets the level" is asserted, and WCAG 2.2 AA asks more of a sign-in form

**Where:** F-14, Contract §3 "The skeleton" (lines 159–162); D-042's amendment carries the same clause.

> What it ships is small, a labelled form and one action, and plain semantic markup with a keyboard pass meets
> the level

A claim about a third party's standard with no evidence line. From the reviewer's knowledge of WCAG 2.2 (not
re-read in this run), level AA at a sign-in form and one action also asks for contrast of text and of controls
(1.4.3, 1.4.11), a visible focus that is not hidden (2.4.7, 2.4.11), target size (2.5.8), reflow (1.4.10), error
identification and suggestion (3.3.1, 3.3.3), status messages (4.1.3), and Accessible Authentication (3.3.8),
which is new in 2.2 and is about sign-in. Contrast depends on the tokens the skeleton's own no-go allows. None
of it is large at one form; a keyboard pass alone does not show it. The sentence matters because it is what
tells an owner the skeleton's line is nearly free, and it may reach `/kickoff`'s prompt.

**Proposed resolution.** Say what is true: "small at that size", and let the template's own examples (an
automated check in CI, a keyboard and screen-reader pass) be what holds it. Leave the standard's content out of
the Contract.

### AR-12 — The one-release hold lives in three merged pull request bodies, does not cover a sync from `main`, and sits beside "nothing new fires yet"

**Where:** F-14, Build map (lines 470–473, 479); against D-027 and `.claude/skills/sync-slipway/SKILL.md` lines
25–27.

> Each of the three pull requests says "no tag until step 4" in its body.

A release is the owner's pull request setting `version`, then a tag (D-027). The body of a pull request merged a
week earlier is not what is open when that is done; an unrelated fix that wants a release between steps 3 and 4
meets the hold only if someone remembers it. And the sync skill documents `npx github:matldupont/slipway#<ref>
sync …` with `<ref>` as `main` for "a commit that is not released yet": a project synced that way between steps
gets the half state with no tag cut.

Step 2 also says "Nothing new fires yet: no check reads these lines until step 3", three lines under the
paragraph that says what fires after step 2 (K1 on the frame's placeholder; MS1 reads the two new placeholders
the same way).

**Proposed resolution.** Put the hold where a release is cut: one line in #379, or wherever the release pull
request is prepared (F-10, `dev/features/release.md`, not read in this run), removed by step 4's pull request; say
that a sync from `main` between the steps is the owner's own test and sees the half state. Reword step 2's sentence to "no new check; K1 and MS1 read the new
placeholders in a project created from this tree".

### AR-13 — The run on a real project's files reports at most one finding and reads no milestone

**Where:** F-14, Known limitations (lines 359–360), Build map step 3 (lines 483–484); against
`process/decision-defaults.md` §9.

§9's reason is "a fixture holds what its author expected; a real project holds what people wrote". No real
project has a front-end line yet. Run as it stands, DS1 stops at `frontend/unrecorded` (one finding, or none with
no milestone active), since `design/missing` and `gate/accessibility` need a front end. The count recorded is 0
or 1, and the readers of what people wrote (Contents items, Gate bullets, frontmatter) never run on it.

**Proposed resolution.** Two runs on a scratch copy, both recorded as counts: as the project stands, and with
the line written as its owner would answer.

### AR-14 — Six readings the check depends on are not specified

**Where:** F-14, Contract §1 (lines 61–71), §2 (lines 100–109), §3 (lines 137–141), §4 (lines 185–189, 201–202).

1. "Item 1": the number written, or the first item? `contents()` returns `n` as written, and its own comment
   says a list numbered `1. 1. 1.` gives three items numbered 1.
2. "A value whose first word is `none`": is `none.`, `none,` or `none(an API)` that word? Split on spaces, each
   reads as a front end, and the finding says to plan a design. The view shows the state, so it is found; say
   which.
3. An empty `screens:`, `design:` or `accessibility:` is not an empty string: `frontmatter()` returns `{}` for a
   key with no value (run). "Trimmed and compared" needs a line for it; `screens/unknown` is the right answer.
4. Does the template's frontmatter block carry `screens:`? "A new optional field in the template's frontmatter,
   documented in its header note" and "a template that loses it" read both ways, and the only value that is not
   a finding is the one that turns the check off.
5. `design/unresolved` and `accessibility/unresolved`: in an active milestone only, like `screens/unknown`, or
   in any? And when the field is set beside a design item or a filled line, does the view call the milestone
   not held?
6. `Front end:` is matched as written while `Design:` takes any case and emphasis. `**Front end:** a web app`
   and `Front-end: none` are unrecorded. That fails closed with a clear message; say it is meant.

**Proposed resolution.** One line each in §1 to §4, and a case for the ones that change an answer (1, 2, 3).
