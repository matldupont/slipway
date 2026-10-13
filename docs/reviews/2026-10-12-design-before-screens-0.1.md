# Adversarial review — F-14 design before screens 0.1

Reviewed: dev/features/design-before-screens.md @ 8a2fdbb
Version line: Version: 0.1 (2026-10-12)
Review date: 2026-10-12
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`.

8a2fdbb is `main` at the time of the review (the merge of #407, which added the document). This session did not
write or edit the document. No earlier review in `docs/reviews/` names this path, so there is no `Supersedes:`.

**What was read.** In full: the target; `docs/reviews/TEMPLATE.md`; `decisions.md` D-042; issue #406 (body and
its one comment), the document's source; issue #94 (body); `docs/product/FRAME.md`; `docs/milestones/TEMPLATE.md`;
`docs/milestones/M1-walking-skeleton.md`; `docs/domain-invariants.md` (an empty table: nothing to check against);
`ci/checks/lib/milestones.mjs`; `ci/checks/lib/frontmatter.mjs`; `process/decision-defaults.md` §3, §4, §9, §10;
`process/lessons/L-09`. In part, to check a named claim: `ci/checks/meta/ms1-milestones.mjs` (lines 1–200),
`ci/checks/meta/k1-frame.mjs` (header, lines 76–126), `ci/checks/meta/pc1-positive-control.mjs` (header and the
check list), `ci/checks/meta/w1-declared-vs-invoked.mjs` (header), `ci/checks/lib/markdown.mjs` (`section()`),
`ci/checks/lib/risks.mjs` (`milestoneNumber`), `package.json` (`meta`), `.github/workflows/ci.yml` (which lines
run a check), `dev/ownership.yaml`, `docs/PRD.md` §9, `.claude/skills/kickoff/SKILL.md` (Phase 1 outline, Phase 3
steps 3–5), `.claude/skills/sync-slipway/SKILL.md` §3, `.claude/skills/close-milestone/SKILL.md` §2, D-037's
heading and rule, the titles of `process/lessons/`.

**What was run.** `PLACEHOLDER` (`ci/checks/lib/frontmatter.mjs:30`) against the three template lines the
Contract quotes, as written there: the front-end line matches; the accessibility line, wrapped over two lines as
the Contract shows it, does not, and matches once joined onto one line; the skeleton's no-go does not match
wrapped or joined (AR-3). `['M1-a.md','M2-b.md','M10-c.md','M3-d.md'].sort()` gives `M1, M10, M2, M3` (AR-7).

The Contract's "Verified against: c370056" claims I opened match their description, except the four findings
that say otherwise (AR-2, AR-3, AR-4, AR-7). `docs/product/FRAME.md` in slipway is the unfilled template, so there
is no FRAME question to test the feature against; the document cites `SLIPWAY.md`'s thesis ("a rule exists only
where something fires") instead, and AR-2, AR-3 and AR-12 are read against that. Not read: the private project
the Problem describes (it cannot be opened from here, so the five facts about it rest on #406's word); any
project built from slipway; `ci/status.mjs` beyond which reader it uses.

**Not argued.** D-042's six choices are the owner's decisions of 2026-10-12: the frame's line, one Contents item,
WCAG 2.2 AA per screen milestone, a check that holds presence and not quality, red only once a screen milestone
is active, #94 left parked. A finding below touches one only where the document's own text contradicts it, where
the code contradicts what the choice was built on, or where the Contract goes past it.

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
| AR-1 | The walking skeleton builds the product's first screens, and the Contract defines it as building none | S1 | owner | Build map 2 | |
| AR-2 | The design item's hours cannot be written per item in PRD §9, and nothing reads them | S1 | owner | Build map 2 | |
| AR-3 | Two of the three template placeholders are ones `PLACEHOLDER` does not match, so an unfilled accessibility line passes MS1 and DS1 | S1 | author | Build map 2 | |
| AR-4 | DS1 is not registered by its filename: `pnpm meta` is a written chain in `package.json`, an owner-only file the Build map does not name | S2 | author | Build map 3 | |
| AR-5 | On sync the Contract gives more than D-042's one question and one finding, and a running milestone has no honest way to close `gate/accessibility` | S2 | owner | Build map 3, 4 | |
| AR-6 | `/kickoff` offers four answers and the check knows two states: a terminal or an API, written as answered, is a front end | S2 | owner | Build map 2 | |
| AR-7 | "Before" is file order, which sorts M10 ahead of M2; killed and shaping milestones count as before | S2 | author | Build map 3 | |
| AR-8 | The paths that turn the check off (`screens: none`, `design: PD-<n>`) have no control case and no acceptance line | S2 | author | Build map 3 | |
| AR-9 | The threat model says none; a pull request's committed files can silence every finding with one word | S2 | owner | Build map 3 | |
| AR-10 | Verify's last line cannot be pasted, and a new check's test fails trivially when the check is reverted | S2 | author | Build map 3 | |
| AR-11 | The build order is safe only inside one release, and the document does not say so | S2 | owner | Build map 2–4 | |
| AR-12 | The `pnpm status` line is D-042's only signal before a milestone goes active, and has no acceptance, no Verify line and no case for an unrecorded frame | S2 | author | Build map 3 | |
| AR-13 | §1 says DS1 adds only the missing line; §4 fires on a placeholder too, beside K1 | S3 | author | — | |
| AR-14 | "Advice, skipped in the case that filed this": the document's own search shows there was no advice to skip | S3 | owner | — | |
| AR-15 | Acceptance line 1 is false as written (`main` holds D-042) and no Verify line proves it; the control moved out of PC1 without saying so | S3 | author | — | |
| AR-16 | Five readings the check depends on are not specified | S3 | author | Build map 3 | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — The walking skeleton builds the product's first screens, and the Contract defines it as building none

**Where:** F-14, Contract §2 "Where it sits" (lines 87–90), §2 the no-go (lines 94–99), §3 "The skeleton"
(lines 121–122); against `docs/milestones/M1-walking-skeleton.md` lines 16–17 and 25–26.

§3 says:

> **The skeleton** (`kind: skeleton`) is not a screen milestone: its no-go excludes styling, and design lands after
> it. Its Gate is unchanged.

The skeleton's own text says it builds a screen, deploys it and puts a user through it:

> Prove the whole path works before any layer gets deep: a real user action travels UI → API → storage → back,
> deployed to production by CI

> 2. Sign in, then the one core action of the product, thinnest possible

So in every project from this template the first screens (sign-in, and the core action) are built in M1, before
any design item the Contract requires and with no accessibility line. Three things follow:

1. The title's promise, "a design item before its first screen", is false by construction unless the item sits
   in M1 ahead of item 2. The Contract allows the item in M1 "at any position", so even then it is not held.
2. D-042 chose "per component as it is built" and declined "A before launch and AA after" because "the early
   components get reworked, the late-audit cost again". The skeleton's sign-in form and core action are the
   earliest components, they ship to production, and they are the one set exempt from the line.
3. §2 and §3 disagree. §2 lets the item sit "in any milestone earlier than the first screen milestone (the
   skeleton included)"; §3 says "design lands after it". When the item is in M1, the no-go reads "no component
   library: design lands in M1, item n", a no-go that points at its own milestone.

**Proposed resolution.** Pick one and write it down: (a) the skeleton's screens are throwaway, said in M1's
no-go ("these screens are rebuilt to the design item; nothing here is kept") and in Known limitations, with the
design item not allowed in M1; or (b) the skeleton carries the accessibility line for what it ships (a labelled
form and a keyboard pass is small at one screen) and the design item, when it is in M1, sits before item 2.
Either way remove "the skeleton included" or "design lands after it".

### AR-2 — The design item's hours cannot be written per item in PRD §9, and nothing reads them

**Where:** F-14, Problem (lines 12–15), Contract §2 (lines 74–76, 91–93), Acceptance (lines 241–246); against
`docs/PRD.md` §9, `ci/checks/meta/ms1-milestones.mjs` lines 41–53 and 174–200, `.claude/skills/kickoff/SKILL.md`
Phase 3 step 4.

The job is "a piece of work with a place and hours". The Contract says the item "carries … hours in PRD §9 for
MS1" and:

> **Its hours.** One row's worth in PRD §9, inside the appetite of the milestone that holds it, like any item.

No Contents item has hours in §9. The PRD says "One row per milestone; the first column is its id", `/kickoff`
writes "one row per milestone with its hours as a range and what they are made of", and MS1 warns
(`estimate/unknown/<id>`) on a row that names no milestone. A design item's hours can only be a phrase in a
milestone row's Basis cell, which no check reads. What is left is `estimate/over-appetite`: a warning, never red,
on a table MS1's header calls optional, comparing the milestone's total. A design item added with no hours
added to that total reads exactly like one that was estimated.

So the feature holds the place and not the hours, and the acceptance clause "with its hours inside that
milestone's appetite in PRD §9" cannot fail: it is pinned as a sentence in a skill. The case that filed this was
about the schedule ("a pretty serious gap for milestones and timing", #406), which is the half left unheld.

**Proposed resolution.** Say what is true: the item's hours are part of its milestone's §9 row and are named in
that row's Basis ("includes design: n–m h"), `/kickoff` asks for them and writes them there, and nothing fires.
Then either move "hours" to Known limitations beside "presence, not quality", or give DS1 something to read (the
Basis cell of the holding milestone's row names design) and add its finding, fixture and acceptance line. The
first is honest and cheap; the second is the only one that serves the thesis.

### AR-3 — Two of the three template placeholders are ones `PLACEHOLDER` does not match, so an unfilled accessibility line passes MS1 and DS1

**Where:** F-14, Contract §2 the no-go (lines 94–99), §3 "The accessibility line" (lines 108–120); against
`ci/checks/lib/frontmatter.mjs:30` and `ci/checks/meta/ms1-milestones.mjs:80,127–129`.

The Contract leans on MS1 twice:

> MS1 already fails a placeholder left under No-gos once the skeleton is active (`section/No-gos`), so the line
> is filled or deleted, never left.

> As with the no-go, MS1 already fails the template's placeholder under Gate once the milestone is active, so
> the line is filled or deleted; DS1 adds only that a screen milestone has one.

`PLACEHOLDER` is `/<…[^>\n]*>|\bTBD\b|\[NEEDS CLARIFICATION/`: it needs `<…` and cannot cross a line end. MS1
tests it on the raw section text. Run against the lines as the Contract writes them:

- The accessibility line's placeholder opens on one line and closes on the next (`held by <…what goes red: … a
  keyboard` / `and screen-reader pass recorded in docs/qa/…>`). No match. MS1 passes the Gate, and DS1's own
  test, "contains `WCAG 2.2 AA` and is not a placeholder", passes it too.
- The no-go's placeholder is `<the milestone that holds the design item, and its Contents item number>`: no `…`,
  and wrapped. No match, wrapped or joined.

The skills test pins these sentences, so the builder copies them. Then a milestone copied from the template and
set active, with nobody having said what holds accessibility, is green in both checks. That is the default path
for an owner who shapes a milestone by hand, and it is the one thing `gate/accessibility` exists to stop.

**Proposed resolution.** Write both placeholders in the form the check knows, each on one line (`<…what goes
red…>`, `<…the milestone and item where design lands…>`), and say in §3 that DS1 reads a Gate bullet with its
continuation lines joined, as `noGos()` does for a no-go. Add a known-bad case: the template's accessibility
line, unfilled, in an active screen milestone, expecting `gate/accessibility`.

### AR-4 — DS1 is not registered by its filename: `pnpm meta` is a written chain in `package.json`, an owner-only file the Build map does not name

**Where:** F-14, Contract §4 (lines 153–155), Acceptance (lines 248–251), Build map (lines 294–305); against
`package.json:20`, `.github/workflows/ci.yml:36`, `ci/checks/meta/w1-declared-vs-invoked.mjs` (header, rules 2
and 3), `dev/ownership.yaml`.

> Registered by its filename: PC1 (`ci/checks/meta/pc1-positive-control.mjs`) runs every `*.mjs` in the folder
> against `ci/fixtures/known-bad/<id>/`, so the fixture is the registration.

PC1 runs DS1 against its fixtures. Nothing runs DS1 against the tree. `meta` is one line of `node
ci/checks/meta/<check>.mjs . && …`, each check and each `scripts/*.test.mjs` written out, and CI runs `pnpm
meta`. A DS1 file that is not added to that line is run on no project's frame or milestones, so "When pnpm meta
runs Then DS1 reports `design/missing:<id>`" cannot happen. W1 would say so in slipway (rule 2, a check no
workflow runs; rule 3, a slipway test no workflow runs), which is how the builder finds out, late.

The edit is to `package.json`'s scripts: owner-only ("what the gate runs"), class `merged` in the ownership map,
so on sync a project whose `meta` differs keeps its own line and is told. The Build map says "`.claude/**` and
`ci/**` are owner-only: steps 3 and 4 ask before they edit" and names neither `package.json` nor
`ci/status.mjs`'s pinned output (`ci/fixtures/status`, S1), which the status line in step 3 changes.

**Proposed resolution.** Replace the sentence with what registers a check here: a `node
ci/checks/meta/ds1-design-before-screens.mjs .` step and `node scripts/ds1.test.mjs` in `package.json`'s `meta`,
the fixture for PC1, and the S1 status fixtures. Name `package.json` in the Build map's owner-only sentence and
under `## Gate changes`, and say what a project whose `meta` line differs sees on the sync.

### AR-5 — On sync the Contract gives more than D-042's one question and one finding, and a running milestone has no honest way to close `gate/accessibility`

**Where:** F-14, Contract §4 findings table (lines 137–143), §5 `/sync-slipway` (lines 185–188), Acceptance
(lines 262–265, 270–271); against D-042 "On sync", `.claude/skills/sync-slipway/SKILL.md` §3 and
`dev/ownership.yaml` (`docs/milestones/**` seeded).

D-042: "A front end with an active screen milestone and no design item: one finding, closed by a design item in
that active milestone or by a decision". The Contract, for the same project:

1. `frontend/unrecorded` until the question is answered; then
2. `design/missing:<id>`, and
3. `gate/accessibility:<id>`, which D-042's sync answer does not mention and for which there is no decision to
   name.

§5 says the one answer "settles whether the skeleton's no-go and each milestone's accessibility line are taken
or deleted". Sync's §3 works from `.slipway/upstream/<path>.diff`, and slipway ships only `TEMPLATE.md` and
`M1-walking-skeleton.md` under `docs/milestones/`. A project's M2…Mn have no diff to take a line from. So either
the skill gains an instruction to write a Gate line into each of the project's shaping and active screen
milestones (and must ask what holds each one: more than one question, and an unfilled line is AR-3), or it
writes nothing and the sync ends red on `gate/accessibility`. The Contract says neither.

For the active milestone the line is new scope in a running bet: its screens are partly built, and the line
says they "meet WCAG 2.2 AA". The template's own rule is that the appetite is fixed and scope bends. The only
field that closes the finding without doing that work is `screens: none`, which is false, and which Known
limitations calls "the owner's mistake, not a finding". The design half got a decision as its way out; the
accessibility half got a reason to mis-declare.

Smaller, same place: closing `design/missing` on a running milestone means "a design item as item 1", which
renumbers Contents items that already carry ` · #n` markers and whose numbers MS1's finding ids use
(`checks/owed:<id>#<n>`). D-042 says "a design item in that active milestone", with no position.

**Proposed resolution.** For the owner: does a milestone that was already active when the rule arrived owe the
accessibility line, or is it under "the rule of their time" like a closed one, with the line due from the next
milestone to go active? If it owes it, give it the same way out as design (`accessibility: PD-<n>`, a decision
saying what is not yet held and by when). Then write §5 to match: what the skill writes into the project's own
milestones, how many questions that is, and how many findings a synced project sees, in the sentence the
acceptance asks the PR's `## What` to carry. Let a design item close `design/missing` at any position in a
milestone that was active before the sync.

### AR-6 — `/kickoff` offers four answers and the check knows two states: a terminal or an API, written as answered, is a front end

**Where:** F-14, Contract §1 (lines 57–67), §3 the accessibility line (lines 111–113).

> where people use this — screens (a web or phone app), a terminal, an API, nothing — and writes the answer.

> `none` (any case) means the product has no front end. … Any other non-empty value means the product has a
> front end; the text itself is for people.

An owner who answers "a terminal" gets `Front end: a terminal` unless the skill translates it, and the Contract
says it "writes the answer". That project then owes a design item and a line saying its screens meet WCAG 2.2
AA. The template's placeholder hints at the mapping ("or none, for an API or a tool with no screens") and the
Contract never states it. A product that is an API with a small admin page, or a command-line tool with a
settings screen, has no stated answer either.

Two edges of the same reading: `Front end: [PARKED: web or CLI? · assume: … · if wrong: … · #12]` is a value the
frame's own rules allow and the Contract does not class (it would read as a front end); and for a phone app the
template's example holder, "an automated check in CI (axe)", is a web tool.

**Proposed resolution.** State the mapping in §1: which of the four answers `/kickoff` writes as `none`, with
what it was kept after it for people (`Front end: none (a command-line tool)`), so the value is the first word
and the rest is prose. Say that a parked value counts as a front end until answered, and give the accessibility
line's example a second holder that is not web-only.

### AR-7 — "Before" is file order, which sorts M10 ahead of M2; killed and shaping milestones count as before

**Where:** F-14, Contract §4 (lines 145–146), Known limitations (lines 229–230); against
`ci/checks/lib/milestones.mjs:32` and `ci/checks/lib/risks.mjs:173`.

> "Before" is file order as `readMilestones()` returns it (the order `pnpm status` shows), the same order
> `/kickoff` writes.

`readMilestones()` sorts file names as strings: `M1-…`, `M10-…`, `M2-…`. With the design item as item 1 of M2
(the Contract's second allowed place) and M10 active, M2 is not before M10 and DS1 reports `design/missing:M10`
on a project that did everything asked. `kind: bet` exists for milestones after launch, so a tenth is a
question of time. K1 already orders milestones by number for PRD deadlines (`milestoneNumber()`), so two checks
would disagree about which milestone comes first.

"A milestone before it" also has no status. A design item in a killed milestone (its work stopped) or in a
shaping one that sorts earlier counts. Known limitations covers a closed milestone only.

**Proposed resolution.** Order by `milestoneNumber(fm.id)`, falling back to file order for an id that is not
`M<n>`, and say so; add a control with M2 and M10. Say which statuses count as "before": closed and active, or
those plus killed, with the reason.

### AR-8 — The paths that turn the check off have no control case and no acceptance line

**Where:** F-14, Contract §4 "Fixtures" (lines 157–164), Acceptance (lines 248–265); against L-09.

The predicate for `design/missing` has six clauses (front end; active; builds screens; no item before; item 1
is not one; no `design: PD-<n>`). The five controls cover the item's two places, `Front end: none`, the
skeleton-only frame and a closed milestone. None has `screens: none` on an active milestone (which must silence
both `design/missing` and `gate/accessibility`), and none has `design: PD-<n>` naming a decision that exists
(which must silence `design/missing` and leave `gate/accessibility`). A `screens:` reader that never matches,
or a decision lookup that always resolves, passes every case listed. The fixtures for `screens/unknown` and
`design/unresolved` prove the two fields can go red, not that they do their job.

Also untested by anything named: a design item that is a placeholder "is no design item"; an accessibility
line that is a placeholder is no line (AR-3); `Front end: NONE`; exit 2 (no BROKEN case, and what "cannot be
read" means is not said, AR-16).

**Proposed resolution.** Add four controls and name them in Acceptance: `screens: none` (0 findings),
`design: PD-<n>` resolving (0 for design, the accessibility finding still reported when its line is missing), a
placeholder design item (`design/missing`), and a BROKEN case in `ci/fixtures/known-bad/ds1/` with the start of
its message. One line each; L-09 asks for the test that dies without each clause.

### AR-9 — The threat model says none; a pull request's committed files can silence every finding with one word

**Where:** F-14, Threat model (lines 218–221), Known limitations (lines 227–228); against
`process/decision-defaults.md` §3 and the owner-only list in `process/slipway-rules.md`.

> none beyond baseline. DS1 reads committed markdown in the project's own tree

Three edits turn the check off, each in a file that is not owner-only and none of them noticed by anything:
`Front end: none` in the frame (every finding), `screens: none` in a milestone (both of its findings), and
`design: PD-<n>` naming any heading in `decisions.md`, about design or not. §3's test is "can a pull request's
committed files cause it? Yes, and it is a fix". They can. The likeliest author is not hostile: it is an agent
whose turn is blocked on a red DS1 and for whom one word is the shortest way to green, which the rules call
weakening a gate.

`extended:` has the same shape, so this may be an accepted cost. The document does not say it was weighed.

**Proposed resolution.** For the owner to choose: accept it and write it under Known limitations with the
reason (the frame and a milestone's frontmatter are the project's to edit, and a review reads them); or make
the off state visible, by having DS1's printed view name each milestone it skipped and why (`M3: screens:
none`, `front end: none`) so the line is in every `pnpm meta` output and every PR's Verification. The second
costs one line of output and no new gate.

### AR-10 — Verify's last line cannot be pasted, and a new check's test fails trivially when the check is reverted

**Where:** F-14, Verify (lines 280–290), Contract §4 (lines 162–164), Acceptance (lines 262–265); against D-037
and L-04.

```
git revert --no-commit <the DS1 commit> && node --test scripts/ds1.test.mjs; git revert --abort
```

The line holds a placeholder, and the issue that embeds this Verify block will hold it too. More to the point:
DS1 is new. Reverting the commit that adds it removes the check (and, when they land in one commit, the test
file), so every test in `scripts/ds1.test.mjs` fails, for the reason that the file is gone. "The
`frontend/unrecorded` test must fail" is then true of any test whatever and proves nothing about the sync case.
#406's line ("1 test that fails with the change reverted") was written before the change was known to be a new
file.

**Proposed resolution.** Say what the reverted change is for this case: the clause that treats a missing line as
unrecorded and not as "no front end". The proof is a mutation of that clause (make a missing line read as
`none`): the `frontend/unrecorded` test fails and the five controls still pass. D-037's mutator runs on the pull
request's new tests already; name it as what holds this, or write the one-line mutation into Verify in a form
that can be pasted.

### AR-11 — The build order is safe only inside one release, and the document does not say so

**Where:** F-14, Build map (lines 298–311); against D-042 "On sync" and D-027.

> Machinery before surface: the templates and the check (2, 3) land before the skills that write what the check
> reads (4), so a skill never promises a line nothing holds.

The reverse gap is open. Each step is its own pull request, and a release is cut from a tag. A release between
steps does this:

- After 2, before 4: a new project's frame has `Front end: <…>` and its skeleton a new no-go placeholder, and
  the `/kickoff` it ships with asks neither. K1 reports `placeholder/present` once M1 is active, for a line the
  owner was never asked about. "Nothing fires yet" is true of a synced project and not of a new one.
- After 3, before 4: DS1 is live and `/sync-slipway` does not yet ask the question. A synced project with an
  active screen milestone is red on `frontend/unrecorded` until the owner writes the line by hand, which is the
  option D-042 declined in those words ("red on every synced project until the owner adds the line by hand").

**Proposed resolution.** One sentence in the Build map: steps 2 to 4 ship in one release, with no tag between
them; or reorder so the skill text that asks (kickoff's question, sync's question) lands with the templates in
step 2 and only the check waits.

### AR-12 — The `pnpm status` line is D-042's only signal before a milestone goes active, and has no acceptance, no Verify line and no case for an unrecorded frame

**Where:** F-14, Contract §4 "`pnpm status`" (lines 166–170), Acceptance (lines 236–276), Verify (lines 280–287).

D-042 keeps shaping milestones out of the check and gives them "a line in `pnpm status` only". That line is
therefore the one place a project learns, while it can still plan for it, that M2 has no design item: the moment
the feature exists for. The Contract describes it in one paragraph. No acceptance line names it, Verify runs
nothing for it, and S1 (which pins status output) is not mentioned.

It is also silent in the case that matters on sync. The line is for a shaping milestone "that would get
`design/missing` or `gate/accessibility` once active". Both need a front end. With the frame's line missing,
neither would fire, so a synced project in its skeleton with M2 shaping sees nothing in status, nothing in DS1,
and goes red on the day M2 is set active.

**Proposed resolution.** Add `frontend/unrecorded` to what status shows for a shaping screen milestone. Add an
acceptance line (given a front-end project, M1 active, M2 shaping with no design item, `pnpm status` shows one
line under Needs attention in the finding's words) with a status fixture, and `node
ci/checks/meta/s1-status.mjs ci/fixtures/status` in Verify.

### AR-13 — §1 says DS1 adds only the missing line; §4 fires on a placeholder too, beside K1

**Where:** F-14, Contract §1 (lines 68–70), §4 table (line 139).

> the check below adds only the case K1 cannot see, a missing line.

> `frontend/unrecorded` | the front-end line is missing or unrecorded (§1)

A frame whose line still holds the placeholder, with a screen milestone active, gets K1 `placeholder/present`
and DS1 `frontend/unrecorded` for one cause.

**Proposed resolution.** Keep §4 (failing closed on what it cannot read is §4 of the defaults) and correct §1's
sentence; or have DS1 leave the placeholder to K1 and say which.

### AR-14 — "Advice, skipped in the case that filed this": the document's own search shows there was no advice to skip

**Where:** F-14, Problem (lines 25–31, 37, 45).

The options table rejects "a sentence in `/kickoff` only" as "advice, skipped in the case that filed this". Six
lines up, the search over the kickoff, review-doc and close-milestone skills finds no design or accessibility
wording at all. Nothing was skipped; nothing was asked. The cheapest option was never tried, so the case is not
evidence against it.

This does not reopen D-042: the thesis is reason enough to want something that fires. It matters for what the
document claims the check buys over the three surfaces in this same feature that are advice (kickoff's prompt,
the review question, the status line).

**Proposed resolution.** Reword the rejection to the reason that holds: "advice; nothing fires, and SLIPWAY's
thesis is that such a rule does not exist".

### AR-15 — Acceptance line 1 is false as written and unproved; the control moved out of PC1 without saying so

**Where:** F-14, Acceptance (lines 237–239), Contract §4 "Fixtures" (lines 158–160); against #406 Acceptance.

> no other branch, open pull request or main holds a D-042

`main` holds D-042 since b845583. The meaning is "no second D-042"; no Verify line checks it (ID1 reads the
tree, not other branches). And #406 asks for "1 known-bad fixture and 1 control, and PC1 runs them"; the
Contract puts controls in `scripts/ds1.test.mjs` because "the known-bad folder holds only red cases". That is a
fair reason and a divergence from the source that the document does not flag.

**Proposed resolution.** Rewrite line 1 as what was done ("D-042 is recorded once: `main`, the open pull requests
and the remote's branches were read before the id was taken") or drop it now that it is merged. Note the PC1
divergence in one clause so the issue's acceptance is edited to match when the Contract is embedded.

### AR-16 — Five readings the check depends on are not specified

**Where:** F-14, Contract §1 (line 60), §2 (line 74), §3 (lines 103–107, 116–117), §4 (lines 128, 151–152).

1. `Design:` "after its number": is `design:` or `**Design:**` a design item? (A miss fails closed with a clear
   message; say which.)
2. `screens/unknown` "is set and not `none`": in which milestones (shaping, closed, the skeleton), and is `None`
   `none`? §1 says "any case" for the frame and nothing here.
3. The accessibility line is "a bullet … whose text contains `WCAG 2.2 AA`": with continuation lines joined, or
   per line? A bullet that wraps between "2.2" and "AA" is the difference (see AR-3).
4. The front-end line is "the first line of the file starting `Front end:`": anywhere, so one inside the header
   blockquote's prose, a comment or a code fence counts, while the template puts it under `## Job story`.
5. "exit 2 (BROKEN) when the frame or a milestone cannot be read", beside "a missing frame compares nothing and
   says nothing": what is unreadable, if not missing? A milestone with no frontmatter (MS1's
   `frontmatter/missing`) has no `kind`, so DS1 cannot tell whether it builds screens.

**Proposed resolution.** One line each in §4, and a case for the ones that change an answer (2, 3, 5).
