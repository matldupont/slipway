# Adversarial review — F-14 design before screens 0.4

Reviewed: dev/features/design-before-screens.md @ 4cc56c4
Version line: Version: 0.4 (2026-10-21)
Supersedes: docs/reviews/2026-10-12-design-before-screens-0.1.md
Supersedes: docs/reviews/2026-10-12-design-before-screens-0.2.md
Supersedes: docs/reviews/2026-10-13-design-before-screens-0.3.md
Review date: 2026-10-22
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

**How this review was run.** In a session the orchestrator session started for it (model id `claude-opus-5-5`, as
the harness reports it), which wrote and edited no version of the document. No agent was spawned. The document
exists only on the branch of pull request #516, so it was read at that branch's head,
4cc56c4bbadd880cf949d97077e9a01901639df0, with `git show`; the session's own checkout is `main`, which holds 0.3.
One departure from the skill's step 3: this file is committed by the step 4 session on #516's branch, with no
branch or pull request of its own, since a review committed beside `main`'s 0.3 fails R1. Three earlier reviews
name this path; all are superseded above. The 0.3 review was read in full and each of its findings checked against
0.4; the 0.1 and 0.2 reviews were read only through the Build map lines that carry them.

**What was read.** In full: the target at 4cc56c4; `docs/reviews/TEMPLATE.md`; the 0.3 review;
`ci/checks/lib/design.mjs`; `ci/checks/lib/frame.mjs`; `ci/checks/lib/decision-ref.mjs`;
`ci/checks/meta/ds1-design-before-screens.mjs`. In part, to check a named claim: `ci/checks/lib/milestones.mjs`
(its exports and their lines), `ci/checks/lib/frontmatter.mjs` (where `PLACEHOLDER` is), `ci/checks/lib/exceptions.mjs`
(`MILESTONE_PREFIX`, `said()`), `ci/checks/lib/report.mjs` (the scanned line, BROKEN on nothing scanned, `@@json`),
`ci/checks/meta/fo1-fail-open.mjs` (the prefix skip), `ci/checks/meta/k1-frame.mjs` (when it reads a placeholder),
`ci/status.mjs` (the frame state and the design lines), `.claude/skills/sync-slipway/SKILL.md` (the section F-14
§5 adds), `.claude/skills/kickoff/SKILL.md` and `.claude/skills/review-doc/SKILL.md` (the new wording),
`docs/product/FRAME.md`, `docs/milestones/TEMPLATE.md`, `docs/milestones/M1-walking-skeleton.md`,
`ci/exceptions.yaml`'s header, `dev/ownership.yaml` (the template and registry rows), `package.json` (`meta`),
`.github/workflows/ci.yml` (it runs `pnpm meta`), the `ci/fixtures/known-bad/ds1/entries` case and MS1's `circuit`
case. Issues #513 and #406 (state and title only).

**What was run.** On a scratch copy of the tree at 4cc56c4 (`git archive`), never in a checkout:

- `node scripts/ds1.test.mjs`: 33 pass, 0 fail.
- `node ci/checks/meta/ds1-design-before-screens.mjs .`: exit 0, "scanned 3 documents (the frame, 1 milestone,
  ci/exceptions.yaml) · front end: not recorded". The Acceptance's last line holds for DS1.
- The Verify mutation, by hand on the copy and put back: `frontEnd()` returning `none` for a missing line. Three
  tests fail: the `frontend/unrecorded` test, "two front-end lines are none read … a label written another way is
  no line", and "a front-end line in a comment or a code fence is not read". No 0-finding control fails (AR-6).
- `node ci/checks/meta/pc1-positive-control.mjs`: one finding, on W1's own fixture (exit 2, expected 1), none on
  DS1's. The copy has no `.git`; the W1 result is taken as the copy's and not argued.

**What held.** The claims 0.4 adds, against the code: `frontEnd()` reads one column-0 line from `prose()`, with
`none\b` in any case, and returns `missing`, `several`, `empty` or `placeholder` as unrecorded; `designItems()`
counts items as rendered and marks an item `first` when every item above it is started, so the own-milestone rule
is the shared one (0.3 AR-6 in the code); `designBefore()` takes the statuses to count, `closed`/`active` for DS1 and
every one but `killed` for status; `resolveDecision()` holds `^P?D-\d{1,9}$` first and, with `decided`, reads
`parseDecisions()`; MS1's `circuit` case holds `extended: .*` as `extended/unresolved`; FO1 skips every
`docs/milestones#` id and DS1 judges each, a malformed one included (the `entries` case holds nine clauses, 0.3
AR-1 and AR-8); an entry both incomplete and past its day is `accessibility/entry` only; `report()` prints the
scanned line on red and green and is BROKEN at 0 scanned; `docs/**/TEMPLATE.md` is managed above the seeded
`docs/milestones/**`, and `ci/exceptions.yaml` is seeded; `package.json`'s `meta` runs DS1 and its test, and CI runs
`pnpm meta`; the three skills carry the wording §5 names. 0.3's AR-1, AR-3, AR-4, AR-5, AR-7 and AR-8 are made.

**Not verified.** The private project the Problem describes, and the step 3 run against its files (a count in a
note outside the repository). WCAG 2.2's text. `scripts/skills.test.mjs` and `node ci/checks/meta/s1-status.mjs`
were not run; `/kickoff`'s wording was read only where it names the front end, the design item and WCAG.
`docs/domain-invariants.md` and the lessons in `process/lessons/` were not read in this run.

**The passes.** The question: no part drifts from `SLIPWAY.md`'s thesis the Problem cites. Criteria that cannot
fail: none new; AR-6 is a Verify sentence that a run cannot hold to one reading. Assumptions stated as facts: AR-2
and AR-5 (claims about the code the commit does not bear out). Contradictions: AR-1, AR-4. Source coverage: a
feature doc has no table. Scope: nothing is in that should be out. Sequencing: steps 2 to 4 are built; the Build
map now reads as history (AR-5). Design and accessibility (the step this feature adds): F-14 adds no screen, so
it is not asked. What is missing: AR-3.

**Read with the cap in mind.** 0.4 is the one revision 0.3 AR-4 allowed before the release. So each proposed
resolution says whether it moves the `Version:` line (Contract, Acceptance or Verify, D-041) or can be made in
the Build map, Known limitations or a skill without it.

No finding below is S0 or S1.

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
| AR-1 | The sync asks a screen question of every milestone DS1's `@@json` names, and calls each one running; DS1 also names closed, shaping and killed milestones, and ids that are not milestones, through its entry findings | S2 | author | — | |
| AR-2 | "Status already sends its owner to `/kickoff`" for a frame whose line holds the placeholder: not when the frame is `framed`, so that project hears nothing until a milestone starts and goes red | S3 | author | — | |
| AR-3 | A named follow-up and four carried items have no tracker: the status line for live entries (0.3 AR-2) and 0.3 AR-9's items 1, 2, 3 and 5 | S3 | owner | — | |
| AR-4 | `**Design:**` is read and `**Front end:**` is not, and the finding for a bold label says the frame "has no Front end: line" | S3 | owner | — | |
| AR-5 | Claims about the code that 4cc56c4 does not bear out: three line numbers, where the readers live, and "holds no milestone to anything" | S3 | author | — | |
| AR-6 | Hygiene: two lists of what the build reuses, a "Verified against" line holding 0.4 text, the template note on `design:`, the status bullet's "own item 1", and Verify's "no control" | S3 | author | — | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — The sync's question list is DS1's findings, and not every finding is a running milestone

**Where:** F-14, Contract §5 `/sync-slipway`, "A milestone running now that builds screens" (lines 397–408) and
"Never a placeholder" (lines 409–411); §4 the rows `screens/unknown`, `accessibility/overdue`,
`accessibility/entry` (lines 261, 265–266); Acceptance, the `/sync-slipway` block (lines 608–615); against
`ci/checks/meta/ds1-design-before-screens.mjs` (the registry loop and `where()`) and
`.claude/skills/sync-slipway/SKILL.md`, the section "Where people use the product, and what a running milestone
owes", item 2.

> Which milestones these are is DS1's to say, not the skill's … taking from each finding's `where` the file and
> the id after `#` … Each milestone named gets one question … how its screens meet WCAG 2.2 AA, or what is not
> held yet and by when; and, past the skeleton, what its screens are designed to and by whom.

The skill's text adds: "Each milestone named there is running and builds screens." DS1's findings do not say
that.

1. **The entry findings name milestones that are not running.** `accessibility/overdue` names a closed milestone
   by design (§3, "closing the milestone does not end it"). `accessibility/entry` names a shaping or killed one, a
   milestone under `screens: none`, a milestone that does not exist, and, for an id of the wrong form, the text
   after `docs/milestones#` cut to 40 characters (`accessibility/entry:M2/accesibility` in the `entries` case).
   Read as the passage says, a later sync asks a shaping milestone how its screens meet WCAG 2.2 AA and writes
   the answer under its Gate, where the next bullet says "Milestones still being shaped get nothing written and
   nothing asked". It asks a killed one and a missing one the same. The first sync to this release meets none of
   these, since no `docs/milestones#` entry exists before it; every later sync can.
2. **`screens/unknown` is answered by the field, not by a WCAG answer.** The question asked is the wrong one.
3. **The design question is asked of a milestone whose design is already answered.** A running M3 whose only
   finding is `gate/accessibility` has its design item; the passage still asks "what its screens are designed to
   and by whom". `/kickoff`'s own rule is never to ask what the input already answers.
4. **"The id after `#`"** is `design/missing:M2`, the finding id with the milestone after its colon, and for a
   registry finding the file is `ci/exceptions.yaml`, not the milestone's.

S2 and not S3: the passage is what the skill does to a project's files on sync, and in case 1 it contradicts the
rule beside it. Not S1: every case it mishandles is already red in `pnpm meta`, so nothing passes that should not.

**Proposed resolution.** Contract §5, which moves the version, or a skill-only change if the owner reads §5's
"Which milestones these are is DS1's to say" as already allowing it: the skill asks only for the findings that
name a running milestone and are answered by the owner — `gate/accessibility`, `design/missing`,
`design/unresolved` and `accessibility/overdue` on an active milestone — one question per milestone, holding
only the parts its findings name. `accessibility/entry`, `screens/unknown` and an overdue entry on a closed
milestone are quoted to the owner as what keeps `pnpm meta` red, with what closes each (DS1's own text), and
nothing is written for them without the owner's answer. The milestone id is the text after the finding's colon.
One `skills.test.mjs` pin for the list.

### AR-2 — A framed frame with a placeholder line is not sent to `/kickoff`

**Where:** F-14, Contract §4 "`pnpm status`" (lines 361–366) and §1 (lines 107–113, 117–120); against
`ci/status.mjs` (the design lines, and `Next`, which sends to `/kickoff` while the frame's status is not
`framed`) and `ci/checks/meta/k1-frame.mjs` (`placeholder/present` only once a milestone is underway).

> A frame whose line still holds the template's placeholder gets no line from this: the frame is unfinished, and
> status already sends its owner to `/kickoff`, which asks.

Status sends the owner to `/kickoff` while the frame's frontmatter is not `status: framed`. A frame set `framed`
with the template's `Front end:` line left in it gets no `/kickoff` line, no design line (the design lines return
nothing for `placeholder`), and no milestone line. K1 reads a placeholder only once a milestone is underway. So
that project hears nothing while it plans, and the first it learns is K1 and DS1 red together when its next
milestone starts: the moment F-14 exists to move earlier. How a frame reaches that state is narrow (`/kickoff`
asks the question, and K1 holds the rest of the frame at start), so S3.

**Proposed resolution.** A Contract edit in §4 (it moves the version), or in the next revision: the status line
for an unrecorded front end is shown for a placeholder too once the frame is `framed`; or the sentence says what
is true, that a framed frame with the placeholder is first reported when a milestone starts. One case under
`ci/fixtures/status/` either way.

### AR-3 — A named follow-up and four carried items have no tracker

**Where:** F-14, Known limitations (lines 512–513), Seams (lines 467–470), Out of scope (line 716), Contract §3
the template bullet (line 189) and the example entry (lines 209–213), Changes, the 0.4 entry (lines 745–754);
against the 0.3 review's register, AR-2 and AR-9.

> A `pnpm status` line for live entries is a follow-up (0.3 AR-2).

No issue carries it, and the 0.3 review's Tracker cell for AR-2 names Known limitations and the same words. 0.3
AR-9 had no tracker and five items. The 0.4 Changes entry does not mention it, and four of the five are as they
were:

1. Seams: "no person … is added"; an entry names an `owner:`, "who answers for it", and nothing tells that person
   when its day passes.
2. Out of scope: "A project's own milestones: each re-plans from the rule, on its next kickoff or sync", beside a
   §5 that writes a Gate line, a design item, `design:` or an entry into a project's running milestone.
3. The template bullet: "Delete this line, and set `screens: none`", which a project with `Front end: none` follows
   to set a field nothing asks for (§4).
5. The example entry's `reason: <what is not held yet, and what will hold it>` and `owner: <who answers for it>`.
   `said()` passes both (a letter, and no leading indicator in `[\s|>&*!%@\`[{]`), so the example copied as written
   is a live excuse. The registry's own header example is written in words; only the Contract's is not.

Item 4 ("Verified against") is answered by 0.4's second line (but see AR-6).

**Proposed resolution.** For the owner: file the status line for live entries as an issue and write its number
into Known limitations, so it surfaces by itself rather than by being remembered. Items 1 and 2 are outside the
versioned sections and can be corrected at any time. Items 3 and 5 are Contract text: batch them with the next
revision, or record here that they are accepted as they are.

### AR-4 — `Design:` reads past emphasis and `Front end:` does not, and the finding hides why

**Where:** F-14, Contract §1 (lines 107–109) and §2 (lines 126–128); against `ci/checks/lib/frame.mjs` and the
`frontend/unrecorded` text in `ci/checks/meta/ds1-design-before-screens.mjs`.

> The label is read exactly: `**Front end:**` and `Front-end:` are no line, which fails closed with a finding
> that says to write it.

> with emphasis marks around the word ignored (`**Design:**` counts; the text is compared after `plain()`

One feature has two rules for a bold label. A frame whose owner wrote `**Front end:** a web app` is told
"docs/product/FRAME.md has no Front end: line … write one line saying where people use the product": the owner
reads the line they wrote and is told it is not there. Failing closed is right; the message does not say why.

**Proposed resolution.** For the owner. Either read the front-end label after `plain()` as the design item is
(a Contract edit: one sentence in §1, one case), or keep it exact and have the `missing` message name the
spellings that are not read when the frame holds one (`**Front end:**`, `Front-end:`): a code change with no
version move, since §1 already says the finding "says to write it".

### AR-5 — Claims about the code that 4cc56c4 does not bear out

**Where:** F-14, Contract §1 (line 110), §2 (line 128), §4 (lines 242, 245–246), Build map step 3 (line 662);
against `ci/checks/lib/frontmatter.mjs`, `ci/checks/lib/milestones.mjs`, `ci/checks/lib/design.mjs`,
`ci/checks/lib/decision-ref.mjs` and `ci/checks/meta/ds1-design-before-screens.mjs`.

1. `PLACEHOLDER` is cited at `ci/checks/lib/frontmatter.mjs:30`; it is at line 69. `contents()` at
   `ci/checks/lib/milestones.mjs:55` is at line 112 (55 is `milestoneKey()`); `readMilestones()` at `:29` is at line
   79. 0.4's Fit says each line was "checked against the tree"; these three were not moved with it.
2. Build map step 3: "`ci/checks/lib/milestones.mjs` gains `designItems()` and the decision resolver". Fit and
   the code put them in `ci/checks/lib/design.mjs` and `ci/checks/lib/decision-ref.mjs`.
3. §4: "With the frame missing and milestones present, DS1 holds no milestone to anything". With no frame DS1
   still reports `screens/unknown` and `design/unresolved` on an active milestone, and judges every registry entry,
   live and overdue included. The code's behaviour is the better one; the sentence is wider than it.

**Proposed resolution.** Item 3 is Contract text: "holds no milestone to a design item or an accessibility line".
Items 1 and 2 are references: drop the line numbers or correct them, and make step 3's line match Fit. All three
batch with the next revision; none changes what is built.

### AR-6 — Hygiene

**Where:** F-14, Contract §5 closing paragraph "Reuses (searched by behaviour)" (lines 434–442), "Verified
against: a76c489" (lines 444–458), §4 status bullet (lines 354–357), Verify (lines 633–637); against
`docs/milestones/TEMPLATE.md`'s header note (lines 28–29) and the mutation run above.

1. **Two lists of what the build reuses.** Fit (0.4) and §5's closing paragraph (0.1–0.3). The second still says
   `hasDecision` is "lifted into the lib" and that only `readRisks()` was searched, and omits `bullets()`,
   `compareMilestones()`, `said()` and `clock.mjs`. One list, Fit's.
2. **"Verified against: a76c489 2026-10-12"** carries 0.4 text ("corrected in 0.4", "gone by 0.4"), so it reads
   as verified at a sha that predates what it says.
3. **The template's note on `design:`** says it "Names a decision in decisions.md"; §4 now asks for one marked
   decided or accepted. A project naming its open `PD-7` learns that from DS1's finding, not from the template.
4. **The status bullet** says "none as its own item 1"; the shared predicate counts item 1 or below started items
   (as the code does, and as "One predicate" says).
5. **Verify** says the mutation "must fail on the `frontend/unrecorded` test and on no control". It fails three
   tests; the other two are reading tests, not 0-finding controls, so the sentence holds, but a reader of the
   pasted run cannot tell which failures were expected. Name them, or say "and on no 0-finding control".

**Proposed resolution.** Items 1, 2 and 4 are outside the versioned sections or are wording within them that
changes nothing built; item 3 is a template sentence (owner-only, `docs/**/TEMPLATE.md`); item 5 is Verify text
and moves the version. Batch all five with the next revision, or record them as accepted.
