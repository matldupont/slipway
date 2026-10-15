# Adversarial review — F-16 plain language 0.2

Reviewed: dev/features/plain-language.md @ ed9e8a5
Version line: Version: 0.2 (2026-10-14)
Supersedes: docs/reviews/2026-10-14-plain-language-0.1.md
Review date: 2026-10-15
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

ed9e8a5 is the head of `docs/feature-plain-language` (PR #463). This session did not write or edit the document.
F2 run on the tree at ed9e8a5 passes and names no line for this doc. D-046 makes this the last whole-document review
before the build: S0 and S1 findings go to the owner, and the rest ride the build as lines under the step issue in
the Blocks column.

F-16 has one ID and nine numbered Contract sections, so each finding is located by `F-16 §n` (or the section name)
and the line range at ed9e8a5.

**What was read.** In full: the target; the owner's research note of 2026-10-14 that the doc names as its source
(outside the repository, read on the owner's machine); the 0.1 review; `docs/reviews/TEMPLATE.md`. In part, at
ed9e8a5, to check a named claim: `decisions.md` D-004, D-016, D-046; `ci/status.mjs` (`next()` at `:269`–`303`,
`riskLine` and `riskFile` at `:126`–`133`); `ci/checks/lib/steps.mjs`; `ci/checks/lib/report.mjs` (header);
`ci/checks/meta/pc1-positive-control.mjs` (`:17`–`24`, `:83`–`90`, `:186`–`203`); `ci/verify.mjs` and `ci/ratchet.mjs`
(their `report()` calls); `scripts/steps.test.mjs:1`–`60`; the path table in `SLIPWAY.md` (`:19`–`28`); every
`expected.json` under `ci/fixtures/known-bad/`. With git: the diff from 8a5205c to `main` at 89529a8.
`docs/product/FRAME.md` in slipway's own tree is still the unfilled template, so the job is checked against D-016,
D-046 and the job the doc states.

**Verified, and how.**
- PC1 matches finding text as well as `where`: `pc1-positive-control.mjs:202` fails a fixture whose finding detail
  does not contain `details[k]`. 22 `expected.json` files pin 62 texts (counted with Node).
- §2's table checked against §2's four rules by a script filling each row with plausible values: 13 of 14 rows pass.
- `ci/verify.mjs` (2 sites) and `ci/ratchet.mjs` (1) build findings and print through `report()`. Neither is under
  `ci/checks/meta/`.
- `findings.push` and `warnings.push` sites under `ci/checks/meta/`: 113 at ed9e8a5, 114 on `main` at 89529a8
  (`grep -oE … | wc -l`; #443 added one to FO1).
- Lines matching `<` + lower-case words + `>`: 2 in `README.md`, 10 in `SLIPWAY.md`, 46 in
  `dev/features/owed-decisions.md`, 19 in `decisions.md`, 5 in this doc (`grep -cE '<[a-z][a-z ]*>'`).

**Not verified.** Vale was not run: no file holds it yet. AR-1 rests on Vale's documented meaning of `scope: raw`
(the file's text as written, code spans included). §5's question counts and §6's template counts were not re-read.

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
| AR-1 | The Placeholder error reads code spans, so a PR that writes a format like `<sha>` into a decision or feature doc fails | S1 | owner | #462 | |
| AR-2 | PC1 checks finding text too: 22 fixtures pin 62 texts that §3's rewrite breaks | S2 | owner | #457 | |
| AR-3 | §2's step 2 row fails §2's own last-sentence rule | S2 | owner | #456 | |
| AR-4 | The "Who, and how long" header labels the activities column; the who and time sit beside the step name | S2 | owner | #456 | |
| AR-5 | §3 leaves out `ci/verify.mjs` and `ci/ratchet.mjs`, which print findings through `report()` | S2 | owner | #457 | |
| AR-6 | §2 drops the step 2 line's `riskFile` tail and its "already underway" variant | S2 | owner | #456 | |
| AR-7 | §9's stop rule has nothing that fires: a flat reading stops nothing by itself | S2 | owner | #456 | |
| AR-8 | No row says which step's time fills `{time}` | S3 | owner | #456 | |
| AR-9 | One Next row keeps "lane", a word the source names as internal | S3 | owner | #456 | |
| AR-10 | The Next-form test does not say how it splits sentences | S3 | owner | #456 | |
| AR-11 | The 113 push sites are 114 on `main` | S3 | owner | #457 | |
| AR-12 | The source table misses three of the note's items | S3 | owner | — | |
| AR-13 | One acceptance says "When it is read": no command | S3 | owner | #461 | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — The Placeholder error reads code spans

**Where:** F-16 §8, lines 328–341 (the two file sets and `Placeholder.yml`).

§8 runs every error rule "with `scope: raw`, so a `<date>` is read as text". Raw scope is the file as written, so a
code span is read too. `Placeholder.yml` errors on "`<` + lower-case words + `>`" outside templates and seeded
files, and errors fail "on the lines a PR adds" in the diff set: `process/*.md`, `decisions.md`, `dev/features/*.md`.

Slipway writes formats that way all the time. At ed9e8a5, `dev/features/owed-decisions.md` has 46 such lines,
`decisions.md` 19, and this doc 5 (`` `<case>#next-form` ``, `` `<sha7>` ``, `` `<folder>` ``). The next feature doc,
decision or lesson that names a format fails the gate. D-046 says the opposite: "recording a decision or filing a
lesson must not turn the gate red". The held set fails on day one too: `README.md` has 2 such lines and `SLIPWAY.md`
10, and the held set must have 0 errors.

The §8 control line covers only "a `<date>` in a file named `TEMPLATE.md`". No control holds a placeholder inside a
code span in a diff-set file, so the fixture cannot catch this.

S1, raised from S2: it breaks a principle D-046 states.

**Proposed resolution.** Let Placeholder skip code spans and fenced blocks. Use Vale's markdown scope with a separate
raw-scope rule for bare `<word>` text, or strip code in `ci/prose.mjs` before passing the added lines. Add a control
line: `` `<sha>` `` inside a code span in a diff-set file raises nothing.

### AR-2 — PC1 checks finding text, not only `where`

**Where:** F-16 Fit, lines 88–90; §3, lines 222–224; Verified against, line 380.

The doc says "PC1 compares a finding's `where`, so a reworded message keeps every fixture green", and that PC1 "is
not touched". PC1 also fails a fixture when a finding's detail does not contain the text its `expected.json` pins
under `details` (`pc1-positive-control.mjs:19`, `:202`–`203`). 22 fixtures pin 62 texts: F2 5, ID1 2, LK1 5, P1 1,
R1 6, SK1 1, W1 2.

Several cannot survive §3's output test as they are. They hold "R1", or run past 160 characters with the fix inside
them: "does not exist: if the document moved, review it at its new path (/review-doc) and name this file in that
review's Supersedes: line; a review is not edited or deleted without the owner's yes". Text that moves into `fix`
leaves the field PC1 reads. Step 2's file list and size miss all 22 files.

**Proposed resolution.** Name the 22 `expected.json` files in §3 and step 2. Either let PC1's `details` match
`detail` or `fix`, or say that each pinned text is rewritten with its message, in the same commit.

### AR-3 — §2's step 2 row fails §2's form

**Where:** F-16 §2, lines 164–168 (the rules) and 183 (the row).

The last sentence must start with "`You`, `Yours`, `Agent`, `You and an agent` or `A fresh session`". The step 2 row
ends "Yours, {time}. An agent prepares the materials." Its last sentence starts "An agent". S1's new `#next-form`
check fails the fixture §2 itself specifies. The other 13 rows pass the four rules.

**Proposed resolution.** Put the who sentence last ("An agent prepares the materials. Yours, {time}."), or add
`An agent` to the list.

### AR-4 — The who-and-how-long column is not where the header says

**Where:** F-16 §2, lines 170–174; Fit, lines 93–94; Acceptance, lines 448–452.

In `SLIPWAY.md:19` the header reads "Step | Who, and how long | Produces | Done when". In every row the who and time
sit in the first cell, after the step name: "**0 · Bootstrap** · you + agent, ~1–2h". The second cell, under "Who,
and how long", holds the activities ("`new-project` (repo, harness, label, protection), then `/bootstrap`…").

"Rewrites the path table's 'Who, and how long' column" and "each row's who-and-how-long cell equals STEPS[n].who
and .time" can mean either cell. One reading wipes the activities. The other tests a cell that also holds the name.
`scripts/steps.test.mjs:18`–`20` compares each row's `{n, name}` with `STEPS` exactly, so it breaks once `STEPS`
gains `who` and `time`, and the doc does not say how it changes. Step 4's "runs in parallel with step 2" is in that
cell today and has no place in the new text.

**Proposed resolution.** Say which cell. Give who and time a column of their own, fix the header, and say that
`steps.test.mjs` compares `n`, `name`, `who` and `time`. Keep "runs in parallel with step 2" somewhere.

### AR-5 — §3 misses two scripts that print findings

**Where:** F-16 §3, lines 210–246; Build map step 2, lines 566–568.

§3 covers "every `ci/checks/meta/*.mjs`", and its static test reads only that folder. `ci/verify.mjs` also builds
findings and prints them through `report()`, and so does `ci/ratchet.mjs`. `pnpm verify` is the failure a project's
engineer reads most, after every step: "failed (exit n) — stopped; later tasks did not run. Fix it, then run pnpm
verify again". It stays in the old form, with no `fix`. §8's own ratchet prints through `ratchet.mjs`.

**Proposed resolution.** Add `ci/verify.mjs` and `ci/ratchet.mjs` to §3's files and to the static test's folders.

### AR-6 — §2 drops one of the step 2 tails

**Where:** F-16 §2, lines 183 and 195–198.

"The step 2 line's two tails today (where thresholds go; a decision to build ahead) move to Needs attention." Today
the line has three. `riskFile` (`ci/status.mjs:133`) adds "File the issue that runs each untested one and name it in
FRAME's Tracker column", and the active-milestone tail carries it too. That action is what moves step 2 to "in hand"
(`steps.mjs`, `scheduled`). The new text drops it.

Two more losses:
- The row names one `{RISK-n, "title"}`, while `riskLine` lists every untested risk. The doc does not say which risk
  is shown.
- `riskBlocks` has a variant for a milestone past the skeleton that is already active or closed: "underway with it
  untested — pnpm meta is red" (`:129`–`131`). The new row says "Nothing past the skeleton can start", which is false
  in that case.

**Proposed resolution.** Move `riskFile` to Needs attention with the other two tails. Say which risk the row names
(the first untested one, with "and n more"). Give the underway case its own row.

### AR-7 — §9's stop rule depends on someone remembering

**Where:** F-16 §9, lines 367–376; Acceptance, lines 532–536.

"A reading flat or worse than the one before stops the next stage until the doc is reshaped." No check reads the
`MEASURED` lines, and nothing stops `/work-ticket` from starting #459 when the reading after step 3 is missing or
flat. The acceptance ("the stage after a flat or worse reading has not started") has no command. This is the
feature's one outcome test, and it holds only while someone remembers it.

**Proposed resolution.** Have `pnpm status` read this doc's `MEASURED` lines and print a Needs attention line when a
reading is due or flat. Or have the step issues #459 and #462 carry a dependency `/work-ticket` already checks. Or say
in Known limitations that the stop rule rests on the owner.

### AR-8 — Which step's time fills `{time}`

**Where:** F-16 §2, lines 170–193.

`time` is per step, but no row says which step it reads. "Active, every item started" says "Agent, {time}" and runs
`/close-milestone`, which is step 6, "you, an afternoon". "Choose the next bet" and "nothing shaped" would read step 6
or 7, and step 7's time is "weekly".

**Proposed resolution.** Add a step column to the table.

### AR-9 — "Lane" in a Next row

**Where:** F-16 §2, line 190.

"Pick the next slice from {id}'s Contents and its lane." The source note lists "lane" with K1 and D-005 as words a
reader has to look up.

**Proposed resolution.** Say what the lane decides ("and how much process it needs"), or point to the lanes table.

### AR-10 — How the form test splits sentences

**Where:** F-16 §2, lines 160–168.

"2 to 4 sentences" and "the first sentence … ends with a period" depend on how sentences are split, and almost every
row holds a file name with a period in it (`AGENT.md`, `docs/PRD.md`, `FRAME.md`). Splitting on a period followed by
a space works for every row. The doc does not say so.

**Proposed resolution.** State the split: on `.`, `?` or `!` followed by white space or the end of the line.

### AR-11 — The push-site count has moved

**Where:** F-16 §3, lines 229 and 243.

"113 sites at 8a5205c." `main` is at 89529a8, and #443 added one to FO1: 114.

**Proposed resolution.** Re-count at the start of #457 and record the sha.

### AR-12 — Three of the note's items have no row

**Where:** F-16 Problem, source table, lines 59–70.

The note's Step 1, personal setup (the caveman plugin off, a short standard in the owner's own settings,
`prd-documentation` disabled, an old review fork deleted), has no row. "Point it at … the issue and PR bodies":
§8 drops issue bodies (line 355), but the Vale row does not say so. "Apply that to every template" (D-036's
section count): §1 pins only the feature template.

**Proposed resolution.** Add one row "the owner's machine, not this repository" and fill in the other two rows.

### AR-13 — "When it is read"

**Where:** F-16 Acceptance, lines 496–500.

"Given `.github/workflows/pr-body.yml` after §7 / When it is read / Then the title and commits files are written
only under if: github.event.repository.is_template". No command can fail this.

**Proposed resolution.** Make it a test that parses the workflow (`ci/checks/lib/workflow-yaml.mjs` already reads
workflows) and checks the guard on both steps.
