---
prd-ref: D-016
status: shipped
---

# F-03 — Concept audit: what an engineer has to learn, and where slipway's machinery shows

## Problem

Slipway should teach engineering **practice** (frame before building, test the riskiest assumption,
time-box milestones, verify before calling work done) and never make an engineer learn its
**machinery** (ownership classes, manifests, overrides, `PL-`/`PD-` numbering, check ids, the formats
checks parse). D-016 sets the test: a check that fails, or a question a skill asks, makes sense to someone
who has never opened slipway's own docs — it names the project's own thing and the next action.

On the first real sync (2026-09-24) an experienced engineer said the questions "mean nothing to me" and
accepted every recommendation (#59, #62). Nobody had listed what a new user actually meets, so nobody
could say how much of it was machinery. This is that list, from #63: every concept on the surfaces a
new user meets first, labelled, with where it surfaces and what was done about it.

**Job:** when I start a project from slipway, I want every line it shows me or asks me to be about my
project, so I can act on it without learning how slipway works.

## Contract

### Method

Each surface was exercised, not read: `new-project` into a scratch directory; `pnpm status` on that
project and on the status fixtures; every check on every known-bad fixture (36 cases, output captured
before and after); every shipped skill read for the questions it puts to the owner; the issue forms, the PR
template, `CLAUDE.md` and `process/slipway-rules.md`. The labels were then refuted in a fresh session
(the review's corrections are folded in below; where it was wrong, the row says so).

Label rule: **practice** — an engineer is better at the job for knowing it, and the line names their own
thing and a next action. **machinery** — slipway's bookkeeping showing through.

Three rules the fixes follow:

- **Check ids stay as output prefixes** (`K1: …`) and in PR bodies. PC1 keys fixtures on the `file#key`
  locator, CI output is grepped by prefix, and the acceptance asks only that the sentence after the
  prefix stand alone. They leave `pnpm status`, the skills' owner-facing lines, the templates and the
  rules' prose.
- **`PD-`/`PL-` stay as a mechanism** (D-015) and leave every message. A project learns its own prefix
  in two places: the header of its `decisions.md` and `process/lessons/README.md`. L1's `id/format`
  finding points at the README; `process/slipway-rules.md` says "number the decisions you add
  `PD-1`, `PD-2`…", not "a project's own are `PD-<n>`; `D-<n>` is slipway's".
- **A message that asks for a decision says where it goes and what it must hold**: "record a decision
  in `decisions.md` to build ahead (cost if wrong, and what reopens it) and put its id in the risk's
  Result" — not "a `PD-<n>` override".

### 1. `new-project` output

| concept | label | why | done |
|---|---|---|---|
| "copied 411 paths **by class** (dev/ownership.yaml, listed by git ls-files); left out 41 **internal**" | machinery | ownership classes are sync's bookkeeping | "copied the template: 411 files" |
| "start the **lessons clock**", `process/anchor → date` | machinery | the anchor exists so lesson review dates can be relative | "record the start date"; "start date 2026-09-25 → process/anchor" |
| "Record what slipway wrote in .slipway/manifest.json — 412 paths with class, sha256 and blob id … **D1 checks the managed ones**" | machinery | hashes, classes, a check id | "Record what slipway installed … 412 files, so a later /sync-slipway can tell slipway's files from yours" |
| 40-character sha, three times; "(.slipway/manifest.json records what this run wrote)"; "the manifest records null … and every file's blob id" | machinery | sync finds its base by content; nobody types the sha | 12 characters; parentheticals dropped; "a later sync looks for the base by content" |
| "# harness, if wanted" | practice, line failed the test | the harness is a gate an agent cannot pass without asking; the comment said nothing about it | "# agent harness: asks before a push or a gate edit; a red verify stops a turn" |
| the `needs-shape` label's description "Issue failed the I1 shape check" | machinery | a check id where the author reads it | "Issue needs shaping: acceptance or seams missing" |
| Next: `/bootstrap`, BOOTSTRAP.md | practice | step 0 | kept |
| "sha: unknown — N file(s) differ from <sha> … a later sync finds the base by content" (an install from an edited checkout) | machinery, and a promise sync could not keep | the base is found by content only when the files match a commit | "finds the base only if those files match a slipway commit"; otherwise "looks for the base by content" |
| steps 4–6 with GitHub: "Create acme/acme and push main", "Create the needs-shape label", "Attempt to protect main (D-001)" → "protected" or "not available: <GitHub's reason>" | practice | D-001 is the project's own decision, decided by attempting it; the outcome is written into its `decisions.md` | kept |
| `decisions.md` in the new project holds D-015, D-016, D-017 | machinery | slipway's own records, with a `dev/` path and issue numbers no project has; seeded, so never updated | #78 |

### 2. `pnpm status`

| concept | label | why | done |
|---|---|---|---|
| "blocks every milestone past the skeleton **(K1)**", on every status | machinery | the sentence stands without the id | dropped; the past-skeleton case reads "M2 underway with it untested — pnpm meta is red until it has a Result" |
| "or record a **PD-<n> override** (cost if wrong, and what reopens it)" — step 2, existential risks | machinery | the prefix is D-015 bookkeeping; it also lost the step the check needs (the id in the risk's Result) | "record a decision in decisions.md to build ahead (…) and put its id in RISK-3's Result" |
| "(**R1** requires one once Status leaves draft)"; "(R1 turns red otherwise)"; "One at a time — MS1 is red"; "K1 then needs a tracker for RISK-2" | machinery | check ids | "(needed before the PRD leaves draft)"; "(the build goes red otherwise)"; "pnpm meta is red until then"; "then name where RISK-2 is being tested (FRAME's Tracker column)" |
| "Open question: docs/product/FRAME.md:16 — `<question>`" and "Parked: …:19 — `<question>` (#12)" on a fresh project | machinery leak | status read the template's own explanation of the marker syntax as real questions | a marker sitting whole inside inline code is skipped (both examples are in backticks); an escaped backtick is not code, and a backticked tracker inside a real marker still counts. K1 reads the same way, and both keep line numbers across multi-line comments. A marker between two code spans on one line is still a question. Pinned by controls in the `deadlines-toronto` status fixture (all four cases), in `k1/draft-underway` and `k1/past-skeleton`, and by two K1 cases of their own: `placeholder-in-code` (a backticked `TBD` or `<…>` must stay red) and `marker-in-code` (the template's backticked examples must not) |
| "no app package yet (§1)" | machinery | a bare section number | "no app yet" (the sentence already says to run /bootstrap) |
| "Bootstrap: AGENT.md filled" while the GitHub project, timezone and invariants rows were still `<…>` | machinery leak | status only looked for the two placeholders `new-project` fills, so Step 0 could end with product questions unasked | an unfilled owner row (product, repo, GitHub project, timezone, invariants) holds Step 0 while there is no app or no milestone is underway yet; a project with a milestone underway sees the rows under Needs attention instead |
| "Open decision: D-001 … (open — owner, BOOTSTRAP §0)" | practice | the text is the project's own `decisions.md` heading, and BOOTSTRAP.md §0 is the step it sends the owner to | kept |
| Step labels (you / agent / fresh session), circuit breaker, appetite "day 209 of 14", walking skeleton, lanes, open vs parked (assumption · cost · tracker), adversarial review, open decisions, RISK-n tested/scheduled/untested, windows | practice | each names the project's thing and the next action | kept |

### 3. Check failures on known-bad fixtures

Before and after for all 36 cases is in the PR for #63. The `K1:` prefix and the `file#key` locator stay
(see Method); the rows are about the sentence after them.

| check | label | what showed | done |
|---|---|---|---|
| D1 (6 cases) | machinery domain; the sentences must still pass | "install hash", "managed file", "manifest", "override", "adopt one with sync --adopt"; the PASS line printed a 40-character sha | "<path> is a file slipway maintains, and it was edited here; the next /sync-slipway would undo that. Revert it, or keep it by adding it to .slipway/overrides.yaml (path: and reason:)"; stale entries name the path; the missing manifest says what it is and "run /sync-slipway once"; unit "files slipway maintains" |
| F1 (3) | practice — every feature scheduled, every slice cites one | "item 2", "PRD §5", "§4 Out" | the item's text is quoted; sections named ("the PRD's Features (§5)", "Out, explicitly (§4)"); "add it to a milestone's Contents" |
| I1 (8) | practice — checkable acceptance, seams answered | "#ref"; "person, channel or promise?" with no lead-in | "issue reference (#12)"; "Seams — does this add a person, a channel or a promise? … answer `none` with one line of why, or name them". The author never sees it: #77 |
| K1 (20 lines) | practice — frame before build; risk tracked before the skeleton; result before later milestones | "K1 can find"; "PD-<n> override" ×3; tracker examples "(#n, PD-n, OD-n)", "(#12, OD-3, D-7, PD-7)"; "9 line(s) still hold a placeholder" named no line; the overdue-without-row case had no next action; "Tracked: line in its evidence file" | reworded; placeholders listed by line with "answer or park each (/clarify), then set status: framed"; "add one with its Threshold, then its Result"; "a `Tracked: #n` line in its docs/product/evidence/ file" |
| L1 (13) | practice — a lesson has a home and a review date | "process/anchor does not exist"; the id line; the status vocabulary bare | anchor: "counts from the project's start date in process/anchor, which is missing — write that date there"; id: "not a lesson id: this project's own are PL-<n>, slipway's are L-<n> (process/lessons/README.md)"; each status gets a few words |
| W1 (11) | practice — a declared gate must run | the three findings named no next action; the unit said "slipway tests" inside a project, where none exist; **the id collides with milestone M1** | each finding says where the step goes (ci.yml, or the meta script); unit is "gated scripts and check files" outside slipway; the collision is #75 |
| FO1 (7) | practice — no fail-open without a dated, keyed exception | "registry", "unregistered", "fail-open site", "keys a positional step"; "exempted by registry" | every line names `ci/exceptions.yaml`; "a failure here would not fail CI"; "names its step by position, which moves on any edit — give the step an id: and key the entry to it" |
| MS1 (29 lines) | practice — appetite, one active, retro, gate; the estimate warnings are the model | "(extended: PD-<n>)"; "§9"; "regenerate the row" (said neither how nor where) | "record an extension as a decision in decisions.md and name that decision in the milestone's `extended:` line"; "the PRD's estimate table (§9)"; "copy summary: into the PRD's Milestones table (§10)" |
| O1 (3) | machinery, slipway-internal | never runs in a project: `new-project` derives the `meta` script without it | nothing |
| P1 (4) | practice — evidence, not claims | "check id" listed as evidence | "names no command, code block or CI run" |
| R1 (7) | practice — a fresh review pinned to a version | four findings named no next action | "review the current version (/review-doc), or copy the line from the file"; "fix the Reviewed: line, or delete the review"; the two missing-line findings say what to add |
| S1 (9) | machinery, slipway-internal | shipped in every project's `pnpm meta` (the fixtures were managed), where it could only fire if `status.mjs` drifted, which D1 reports first | internal now (`dev/ownership.yaml`): a project never receives S1 or its fixtures, and its `meta` script drops the call |
| the `PASS — green proves:` lines | practice — a check states its claim | D1's and FO1's claims carried "managed file", "hash", "registry", "structurally keyed"; PC1's "registered checks" | reworded. L1's enforcement mix stays: it is the count a lesson author reads |
| findings that fired with no next action, in checks the first pass called unchanged | practice, line failed the test | F1's missing PRD; MS1 `extended/unresolved`, `id/duplicate`, `field/missing`; D1's control character; K1 `risk/no-threshold`; L1 `id/duplicate`, `pointer/unresolved`, `frontmatter/missing`; I1 `acceptance/missing`; FO1's next action was wrong for a job-level site | each names its action ("/kickoff writes it", "give one of them the next free number", "add id: and status: in its frontmatter", "write the Threshold it was measured against, or clear the Result", …); FO1 prints the exact `id:` the entry needs |

### 3b. `pnpm verify`, the shared report, PC1

| surface | label | why | done |
|---|---|---|---|
| VERIFY "no workspace packages — add an app (BOOTSTRAP.md §1) before verify can prove anything" | practice | names the file and the step | kept |
| VERIFY "no package declares `test` — verify cannot prove behaviour"; "failed (exit 1) — stopped; later tasks did not run" | practice, lines had no next action | the Stop hook shows these on every red turn | "add a `test` script to the app's package.json"; "Fix it, then run pnpm verify again" |
| `report.mjs` "BROKEN — denominator is 0, nothing was examined" | machinery | "denominator" is the check author's word | "nothing was examined (0 <unit>), so green would prove nothing" |
| PC1's own findings ("no known-bad fixture at …", "PASSED its known-bad fixture — the check cannot fail", "red for the wrong reasons — missed […]") | practice, for a check's author only | they fire when someone adds or breaks a check; each names the fixture path and what differs | kept |

### 4. Questions the shipped skills ask

| skill | asks | label | done |
|---|---|---|---|
| bootstrap | the AGENT.md rows still holding `<…>` | practice for the product rows, but only `GitHub project` was still a placeholder: Timezone defaulted to `local` (UTC in CI) and Domain invariants to a path (so the skills demanded property tests), and neither was ever asked | both rows are placeholders now; the skill names the three questions it asks (project, timezone, money math) and says every other row keeps its default — never asked |
| bootstrap | owner-run probes | practice — prove a gate can refuse | probe 2 "(under the D-001 fallback)" → "(where `main` could not be protected)"; probe 11 "needs the owner's intake skills" → "the intake skill (`/log-followup`, where installed)"; the skills themselves are #46 |
| clarify | each open question, with options and a recommendation; "file the tracker now?" | practice | kept |
| kickoff | the moment, job story, the question, four forces, non-users, press release, risks + threshold, week-1 decisions, capacity, story-map lines | practice | kept |
| kickoff | told "in these words": "…can start **(K1)** until … a recorded override **(PD-<n>)**"; hand-off "**R1** turns red once…"; readiness "→ OD-n / PD-n created"; "Fill PRD §9" | machinery | "until each value risk has a Result, or a decision in `decisions.md` to build ahead of it"; "The build goes red once…"; "→ recorded as an open question in the PRD (OD-n) or a decision in decisions.md"; "the PRD's estimates (§9)" |
| close-milestone | cut / kill / extend; the next bet | practice | kept |
| review-doc | nothing; hand-back "**R1** turns red when…" | machinery | "The build goes red when…" |
| sync-slipway | settle-or-ask per seeded change (#62, shipped): questions are in the project's terms | practice | kept |
| sync-slipway | adopt's keep / revert "for each managed file"; §4's confirmation of each `L-`→`PL-`, `D-`→`PD-` move | machinery | #76 (its acceptance names both questions) |

### 5. Issue forms and the PR template

| concept | label | done |
|---|---|---|
| Lane; Verification as evidence; Links; Problem; checkable Acceptance; Seams; Out of scope; Missing test | practice | kept |
| "**P1** fails a PR without one"; "commands, **check ids** or CI runs" | machinery | "CI fails a PR without one"; "commands, their output or CI runs" |
| "**I1** flags them" (feature), "I1 flags adjectives" (bug) | machinery | "CI flags them" |
| "Seams" with "Does this add a person, a channel, or a promise?" | practice, slipway's word | the description leads with "Who else does this touch —"; the label stays (I1 reads it) |
| "Decision: D-nnn" | machinery, and wrong in a project (its own are `PD-`) | "Decision: PD-n or D-nnn" |

### 6. `CLAUDE.md` and `process/slipway-rules.md`

| concept | label | done |
|---|---|---|
| Stack line; "until decisions.md D-005–D-008 are made" | practice | kept |
| Gates, lanes, one active milestone, embed the Contract, Verified against, decide when made, cold review, designation, reuse search, never rebase a stacked PR, the agent rules | practice | kept |
| "Managed by slipway (`dev/ownership.yaml` in slipway)" | machinery | "Slipway replaces this file when the project takes a newer version" |
| "(PC1)", "(W1)", "(FO1)", "(MS1)" | machinery | "a known-bad fixture under `ci/fixtures/known-bad/` and a step in `.github/workflows/ci.yml`"; "a dated entry in `ci/exceptions.yaml`"; "a decision in `decisions.md`" |
| "A project's own are `PD-<n>`; `D-<n>` is slipway's (D-015)" | machinery, and false in a project (D-001–D-014 are the project's to answer) | "Answer D-001–D-014 in place; number the decisions you add `PD-1`, `PD-2`…, so a slipway update never collides with them" |
| "id `PL-<n>` in a project (`L-<n>` is slipway's). L1 checks it." | machinery | "numbered `PL-1`, `PL-2`… (slipway's own are `L-<n>`); `pnpm meta` checks it" |
| "(L-18)" … 10 lesson citations | practice | a footnote to a lesson file the project ships and can open; each sentence stands without it, and D-016 governs failures and questions, not footnotes in agent rules |
| the Lanes row names `/log-feature`, `/work-ticket` | machinery until they ship | #46 |

### Also touched

- `docs/product/FRAME.md` — the first file `/kickoff` has the owner read. The guidance blockquote: "K1 checks it" → "A check reads it"; "an `OD-`/`D-` id" → "a decision's id". The Risks paragraph: "K1 fails …", "record a PD-<n> override … K1 counts it", "K1 requires it" → the build, a decision in `decisions.md`, its id in Result.
- `/kickoff`, `/clarify` and `/review-doc` told the agent to add "a `D-` entry" for a project decision; that number can collide with slipway's on a sync (D-015). Now `PD-`.
- `decisions.md` D-015: `merged` said "settings keys, marked blocks in `CLAUDE.md`"; sync narrowed it to `package.json` scripts and `CLAUDE.md` imports the rules instead. Corrected in place.

### Not audited here

`SLIPWAY.md` and `BOOTSTRAP.md` (the reference documents; they are read, not shown), `docs/milestones/TEMPLATE.md`, `docs/reviews/TEMPLATE.md`, and the sync plan itself (#59, #76).

Verified against: 4e1c52e 2026-09-25 — every surface above was run or read at that commit; the fixture outputs before and after are in the PR for #63.

## Seams

none: changes wording and what surfaces, not who is involved.

## Threat model

none beyond baseline. Wording only; no new input, network call, cache or deletion. One parser change:
status and K1 skip `[NEEDS CLARIFICATION]` / `[PARKED]` markers inside inline code. A marker an owner puts in
backticks on purpose is no longer counted; the template's own examples were the only such case found.

## Known limitations

- Check ids remain as output prefixes; a reader still meets `K1:` before the sentence. Removing them is
  the wrong trade: fixtures and CI grep key on them.
- The M-series ids still collide with milestone ids until #75.
- The sync plan, the adopt report and adopt's questions still use ownership classes until #76.
- A marker an owner deliberately puts whole inside inline code is not counted. Escaped backticks and a backticked
  tracker inside a marker are.
- No status fixture has unfilled owner rows: the Step 0 rule was exercised by hand on fixture copies (no app; app
  with no milestone underway; a milestone active), not pinned by S1.
- `SLIPWAY.md` and `BOOTSTRAP.md` cite check ids throughout; they are the manual, not a surface.

## Acceptance

```
Given a project created by new-project
When  its owner reads the creation output, `pnpm status`, a red check, a skill's question, an issue form or the PR template
Then  every line names the project's own thing and the next action, and none needs a check id, an ownership
      class, a manifest, an override or a PD-/PL- prefix to be understood — or the row above names the issue that fixes it
```

## Verify

```
pnpm meta                      # exit 0; PC1: every check red on its 36 fixtures for the expected reasons
node scripts/new-project.mjs /tmp/probe --name Acme --repo acme/acme --no-github --no-harness
node ci/status.mjs /tmp/probe  # no check id, no PD-<n>, no ownership class in the output
```

## Build map

1. This PR: the audit, every wording fix above, the parser change, the fixture expectations.
2. #75, #76, #77, #78 — what needs its own change.

## Out of scope

Removing checks or practices (the practice stays; only its presentation changes). Sync's questions (#62) and
its plan output (#59, #76). Shipping the intake skills (#46).

## Open questions

none.

## Changes

- 2026-09-25 · ADDED · the audit and its fixes · PR for #63
