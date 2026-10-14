# Adversarial review — F-16 plain language 0.1

Reviewed: dev/features/plain-language.md @ 3e532a9
Version line: Version: 0.1 (2026-10-14)
Review date: 2026-10-14
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

3e532a9 is the head of `docs/feature-plain-language` (PR #463). This session did not write or edit the document. No
earlier review names its path. F2 run on the tree at 3e532a9 passes and does not name this doc.

F-16 has one ID and nine numbered Contract sections, so each finding is located by `F-16 §n` (or the section name)
and the line range at 3e532a9.

**What was read.** In full: the target; the owner's research note of 2026-10-14 that the doc quotes (outside the
repository, read on the owner's machine; see AR-11); `docs/reviews/TEMPLATE.md`. In part, to check a named claim, all
at 3e532a9: `decisions.md` D-004, D-016, D-035, D-036; `process/lessons/L-54-docs-lint.md` and L-43's rule;
`ci/status.mjs` `next()` (`:270`–`308`), its marker walk (`:206`–`225`) and `riskLine` (`:132`);
`ci/checks/lib/report.mjs` (header, `excerpt()`); `ci/checks/lib/steps.mjs`; `ci/ratchet.mjs` and
`ci/checks/lib/ratchet.mjs` (`mayRecord`); `ci/baselines.json`; `dev/ownership.yaml`; `ci/checks/meta/o1-ownership.mjs`;
`.github/workflows/ci.yml`, `pr-body.yml`, `issue-shape.yml`; `package.json` `meta`; the path table and the counts below
in `SLIPWAY.md`; `docs/features/TEMPLATE.md`; `.github/ISSUE_TEMPLATE/feature.yml`; `process/intake.md` (`:118`–`140`);
`process/designation.md:6`; the three skills §5 names; `scripts/f2.test.mjs`, `r1.test.mjs`, `lk1.test.mjs`. With `gh`:
the titles of #455 to #462, the body of #451, the open pull requests and their files (#452, #453, #454, #463: none
touches a file F-16's build map names except #454's `package.json`).
`docs/product/FRAME.md` in slipway's own tree is still the unfilled template, so the job is checked against D-016 and
the job the doc states.

**Verified, and how.**
- `next()` has the branches §2's table lists (`ci/status.mjs:270`–`308`, read).
- `report()` prints `{where, detail}` findings id first, and `@@json` carries them (`report.mjs` header, read).
- 113 `findings.push` and `warnings.push` sites under `ci/checks/meta/` (`grep -o | wc -l`).
- `TEMPLATE.md` has 12 `## ` sections. `feature.yml` has `seams` and `seams-detail`.
- 167 of the last 200 subjects on `main` at 8a5205c are over 72 code points (`git log --format=%s -200 8a5205c`,
  counted in Node). The longest is 448, not 198 (AR-21).
- `ci.yml`'s `verify` is guarded by `!github.event.repository.is_template`, so §8's guard is its inverse.
- `pr-body.yml` runs on `pull_request` with `fetch-depth: 0`, so `base..head` can be read.

**Not verified.** How Vale treats `<date>` in markdown (AR-10 says what follows if it is read as HTML); the 28-of-34
open-issue count; anything about Vale's install or pinning, which no file holds yet.

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
| AR-1 | The prose ratchet counts files that grow, so recording a decision or a feature doc turns the gate red | S1 | owner | #462 | |
| AR-2 | P1's title and subject rules and the body's Vale step ship to every project, against Out of scope and Seams | S1 | owner | #461, #462 | |
| AR-3 | §9, the feature's one outcome test, cannot fail and has no place in slipway to be recorded | S1 | owner | #459 | |
| AR-4 | §2's own table breaks §2's form rules in four rows, and project text breaks them at run time | S2 | owner | #456 | |
| AR-5 | Stage 1 reads `who` and `time` from a column stage 3 rewrites; steps 5 and 6 have no time | S2 | owner | #456, #458 | |
| AR-6 | `SLIPWAY.md` at 0 warnings is out of reach: 117 bare check ids, and §4 keeps the gate table's | S2 | owner | #458, #462 | |
| AR-7 | §2 and §8 define "an id beside its meaning" in opposite orders | S2 | owner | #456, #462 | |
| AR-8 | The `fix` shape test sees only findings a fixture triggers, so a missing `fix` can stay hidden | S2 | owner | #457 | |
| AR-9 | §5's test reads only questions written in quotes; `/close-milestone` has none | S2 | owner | #459 | |
| AR-10 | The Placeholder error either fails slipway's seeded templates or never fires | S2 | owner | #462 | |
| AR-11 | The source note's items have no coverage: two P1 extensions dropped unrecorded, L-54 not named | S2 | owner | #461, #462 | |
| AR-12 | Three "review later" promises have no detector (L-43) | S2 | owner | #456, #460, #462 | |
| AR-13 | §6 cuts before its evidence is read, and old issue bodies under I1 are not covered | S2 | owner | #460 | |
| AR-14 | `.vale.ini` has no ownership class, and the new `ci/` files ship to projects unnamed | S2 | owner | #462 | |
| AR-15 | Two Contract sections, §1 and §2's other lines, have no acceptance | S2 | owner | #456 | |
| AR-16 | The "seven PRs" acceptance cannot fail by a command, and this branch already breaks it | S2 | owner | — | |
| AR-17 | §3 names one reader of the old output form; tests and a skill read it too | S3 | owner | #457 | |
| AR-18 | The designation trailer §6 cuts from `process/intake.md` is not in that file | S3 | owner | #460 | |
| AR-19 | The Build map says only steps 6 and 7 get the strongest review; D-035 covers 1 to 5 too | S3 | owner | — | |
| AR-20 | "Under 72" and "over 72" disagree at 72; the merge and revert skip is scoped to one rule | S3 | owner | #461 | |
| AR-21 | The longest subject is 448 code points, not 198 | S3 | owner | — | |
| AR-22 | In slipway itself, a `[NEEDS CLARIFICATION]` marker in `dev/features/` is read by nothing | S3 | owner | #460 | |
| AR-23 | "Vale runs nothing" overstates it; a PR can rewrite the rules that read its own body | S3 | owner | #462 | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — The prose ratchet counts files that grow, so normal work turns it red

**Where:** F-16 §8, lines 283–291 (the warning rules and the ratchet), with line 274–275 (what it reads).

The warning count covers `decisions.md`, `process/lessons/*.md`, `dev/features/*.md` and `process/*.md`. Those are the
files slipway adds to every week, and each new entry is full of what the warnings count. A decision heading is
`## D-046 — …`: a bare decision id with its meaning after an em dash, not in brackets, so `DecisionId.yml` flags it. A
feature doc names check ids in prose (this one does, e.g. "PC1 compares", line 70). `ci/ratchet.mjs` exits 1 when the
count is "higher than the baseline", and `mayRecord` (`ci/checks/lib/ratchet.mjs:48`) refuses `--update` to a higher
value. So the PR that records a decision, files a lesson or adds a feature doc fails, unless it rewrites unrelated
text to pay the count back down, or hand-edits `ci/baselines.json`. The second is weakening a gate to pass it
(`process/slipway-rules.md` → Gates). The first makes "record decisions when they are made" cost a rewrite each time.

The doc's own scope line says agent text is not held to the form (line 98–99), and `decisions.md` is written for the
agent (the source note says so of skills, `intake.md` and `decisions.md`).

**Proposed resolution.** Count warnings only on the lines a PR adds (a diff-scoped count, printed, never failing), and
keep the global ratchet to the surfaces a person reads: `README.md`, `SLIPWAY.md`, `BOOTSTRAP.md`, the templates and
`process/writing.md`. Or exclude `decisions.md`, `dev/features/` and `process/lessons/` from the count and say why.

### AR-2 — P1's new rules and the body's Vale step reach every project

**Where:** F-16 §7, lines 250–264; §8 "PR bodies", lines 292–293; Seams, lines 315–318; Out of scope, lines 471–472.

`.github/**` and `ci/**` are `managed` in `dev/ownership.yaml`, so a sync replaces `pr-body.yml` and
`ci/checks/meta/p1-pr-body.mjs` in every project. Two consequences follow, and the doc names neither:

- P1's `title/long`, `commit/long`, `commit/id` and `commit/review-round` run on every project PR. `pr-body` is a
  required status (its own header: "The job name is the required status context"). A project's open branches carry
  subjects written before the sync, and `base..head` reads them all, so the first push after the sync turns those
  PRs red. A dependency bot's title ("chore(deps): bump … from … to … in /apps/web") is often over 72.
- §8 guards the `prose` job with `is_template` but says nothing to guard the Vale step added to `pr-body.yml`. That
  step installs Vale and fails a project PR body on `Of course!`. Out of scope says the prose check is not shipped to
  projects "until a real project's docs have been measured once".

Seams says "none: no person, channel or promise is added". A new failing rule on every project PR changes what each
project's engineer meets, and nothing says who is told. The evidence for §7 (167 of 200 subjects) is slipway's own
history, not a project's.

**Proposed resolution.** Guard both by `is_template` until a decision ships them, as §8 does for the job. Or ship them
to projects as warnings for one release, with the sync PR body naming the new rules, and list that in Seams.

### AR-3 — §9 cannot fail and cannot be recorded in slipway

**Where:** F-16 §9, lines 301–304; Acceptance, lines 421–425. Escalated to S1: this is the feature's only measure of
its outcome, and L-01 (acceptance criteria are checkable) is a stated rule.

§9 asks the owner, at each `/close-milestone`, "could I tell what is next and what each PR did in under a minute",
and records "yes or no, and how much of the agent's writing was edited". Three problems:

- Nothing follows from the answer. A "no" changes nothing, and "how much … was edited" has no unit and no baseline to
  compare with. The source note's version had a direction: "If the edits don't fall, the rules aren't working,
  whatever the linter says." The doc drops it.
- Slipway runs no milestone of its own (`docs/milestones/` holds only the seeded M1 template; work runs under epic
  #379). The close §9 waits for is a project's, and its retro lives in the project's repository. The answer never
  reaches slipway's.
- The retro line is added to `/close-milestone`, which ships to every project, so every project's retro gains a
  question about slipway's text.

**Proposed resolution.** Take a baseline before stage 1: the owner's edit count on a fixed set (for example the last
five agent PR bodies and one `pnpm status` read cold), with the unit named. Repeat it after stage 3 and after stage 7,
in slipway's repository, as a dated line in this doc's Changes or a `docs/qa/` note. Name what a worse or flat result
triggers (stop after the current stage and re-shape). Keep the retro question optional, worded for the project.

### AR-4 — §2's table breaks §2's rules

**Where:** F-16 §2, lines 132–136 (the rules) against lines 146–159 (the table) and 161–164.

The test holds "every S1 fixture" to four rules. The table's own text breaks them:

- Step 2: `Yours, {time}; an agent prepares the materials.` holds `;`.
- Step 3, reviewed: `{version} has its review; a milestone can go active…` holds `;`.
- Choose the next bet: `Choose the next bet: activate one of {ids} with appetite dates, or shape a new one.` is 16
  words with one id, over the 14-word first sentence.
- Skeleton shaping: `Agent, {time}.` with step 4's time from the path table, today "days — **runs in parallel with
  step 2**", brings ` — ` in.

Project text breaks them at run time, where no fixture is. `"{excerpt}"` quotes a milestone item, and step 2's
`{RISK-n, title}` comes from `riskLine` (`ci/status.mjs:132`, joined with ` · `). Either can carry `;`, ` — `, a
decision id or a period, which changes the sentence count. The rule says "no sentence holds…", but only fixtures are
tested.

Line 140 says the Next line reads who and time from `STEPS` "and never spells one itself", yet every row spells its
who ("You", "Agent", "Yours").

**Proposed resolution.** Fix the four rows. Say that the form rules exclude the quoted excerpt, or strip `;` and ` — `
in `excerpt()` for this line. Either read who from `STEPS` or drop the "never spells one itself" sentence.

### AR-5 — Stage 1 reads a column stage 3 rewrites

**Where:** F-16 §2, lines 138–140; §4, line 213; Build map steps 1 and 3, lines 446–450.

Stage 1 copies `who` and `time` into `STEPS` "from the path table's 'Who, and how long' column", and
`scripts/steps.test.mjs` holds the table to them. Today that column reads `you + agent, ~1–2h`, `**yours**, days to
weeks`, `agent, days — **runs in parallel with step 2**`, `agent` (step 5, no time) and `you with /close-milestone`
(step 6, no time). The doc's own target says "1 to 2 hours". §4, stage 3, is where the column is rewritten "to the form
`steps.mjs` holds". So stage 1 either ships `~1–2h` and the bold markup into the Next line, or edits `SLIPWAY.md`'s
column itself, which is stage 3's file.

**Proposed resolution.** Move the column's rewording into stage 1, which already owns `steps.mjs` and its test, and
state a time for steps 5 and 6 or say the line has none.

### AR-6 — `SLIPWAY.md` at 0 warnings is out of reach

**Where:** F-16 §4, lines 210–217; §8 "The ratchet", lines 290–291; Acceptance, lines 403–406.

At 3e532a9, `SLIPWAY.md` holds 117 bare check ids outside code spans and 9 decision ids (counted with code spans
removed). §4 keeps the gate table's ids on purpose ("that table is the lookup"), and `CheckId.yml` flags "a bare check
id as a word, outside code". The file also runs well past the path table: Reference, Validation, "Exercised on a real
project". §4 rewrites the path table and one README section in about 120 lines, yet requires the whole of
`SLIPWAY.md` at 0 warnings. That requirement is only measured in stage 7, when Vale lands, so stage 7 inherits the
rewrite.

**Proposed resolution.** Hold only the path table and the README's sections to 0, or write the gate table's ids in
code spans and count what remains before setting the target. Put the measured number in the doc.

### AR-7 — "An id beside its meaning" in opposite orders

**Where:** F-16 §1 rule 2, line 107; §2, lines 166–168; §8 `DecisionId.yml`, lines 283–287.

§2's form is meaning first, id in brackets after: `Decide the frontend framework (D-005, open since week 1)`. §8's
rule flags a decision id "not followed by a plain meaning on the same line in brackets", which is the id first and the
meaning in brackets. The same sentence then says "the rule flags every bare one", which is a third definition. A
line written to §2 is a warning under §8's first reading.

**Proposed resolution.** Pick one order (§2's reads better) and state the rule once, in `writing.md`, with the regex
`DecisionId.yml` uses.

### AR-8 — The `fix` shape test sees only what fixtures trigger

**Where:** F-16 §3, lines 192–206; Acceptance, lines 361–365.

The test runs "over every finding every check emits on every known-bad fixture". There are 113 push sites. A finding
no fixture triggers is never emitted, so a missing `fix`, a 200-character `detail` or an id in a message there is
never seen. "The shape test lists the checks still owed, so the gap is visible, never silent" holds only for findings
a fixture reaches.

**Proposed resolution.** Add a static half: every `findings.push` and `warnings.push` call passes a `fix` key, read
from the source. Keep the fixture half for the form of the text.

### AR-9 — §5's test can pass with nothing to read

**Where:** F-16 §5, lines 223–228; Acceptance, lines 379–383.

The test holds "every quoted question ending ?"". At 3e532a9, `/kickoff` has 5 such, `/bootstrap` 1 and
`/close-milestone` 0, while the three mention asking 8, 11 and 2 times. Most questions are described ("ask the owner
which…"), not quoted. For `/close-milestone` the test reads nothing and passes. "Skill phase name" is not defined.

**Proposed resolution.** Require each owner question to be quoted, and give the test a floor (at least one per skill,
or the count recorded in the test). Define "phase name" as a list, or drop it.

### AR-10 — The Placeholder error fails seeded templates or never fires

**Where:** F-16 §8 `Placeholder.yml`, lines 280–281, with the read set, lines 274–275.

Slipway's seeded templates are in the read set and are placeholders by design: `docs/PRD.md` holds `<name>`,
`<question>`, `<phase or gate>`, `<n>`; `docs/product/FRAME.md` `<habit>`; `docs/milestones/M1-walking-skeleton.md`
`<date>`. All are outside code. The exemption covers only names holding `TEMPLATE`. If Vale sees them, the error
fails on files that must keep them, and 30 more hits sit in `dev/features/` docs. If Vale renders markdown first,
`<date>` and `<main sha>` parse as inline HTML tags and the rule never sees them (not run here). The known-bad fixture
would catch the second case. Nothing catches the first until the PR runs.

**Proposed resolution.** Exempt the seeded files by their ownership class, or leave them out of the read set. Say
which Vale scope the rule uses (`raw`) and keep the fixture.

### AR-11 — The source has no coverage table, and two of its items vanished

**Where:** F-16 Problem, lines 44 and 59 (the note is cited); the whole Contract and Out of scope.

The doc quotes "the owner's research note of 2026-10-14" and its "Don't" list, but names no `Source:` and has no
coverage table. The note is outside the repository, so a later reviewer cannot open it. Read against the note:

- Its step 3 extends P1 two ways: fail when `## What` runs over about 150 words, and fail when the body names a file
  the diff does not touch. The note calls the second "the most common way agent PR descriptions go wrong", and its
  appendix gives the evidence (28% against 80% merge rate). Neither is in the Contract or Out of scope.
- It puts Vale "in `pnpm verify`"; the doc puts it in a CI job in slipway only, for a good reason (D-004), with no
  divergence written down.
- It says the prose check "revives L-54 (docs lint), which was declined". L-54 is `declined` with `review-by: +60d`
  from 2026-09-21. The doc does not name L-54, so L-54's status does not move.

**Proposed resolution.** Add `Source:` and a short coverage table, each row naming the § that holds the item or a DIV
saying where it went. Put the P1 extensions in Out of scope with a tracker, or in §7. Say what happens to L-54.

### AR-12 — Three "review later" promises have no detector

**Where:** F-16 §8, lines 296–297; §1, lines 119–120; §6, lines 240–241; Out of scope, lines 471–472.

- The rule files' `review-by` date (2027-04-14) sits in a header comment. "L1's reviewer line in
  `process/lessons/README.md` names it." L1 reads lessons' frontmatter, not `ci/prose/`. A line naming a date is not
  a check.
- `writing.md`'s last line says a template section count "a sync may lower and never raise". Nothing checks it. The
  doc rejects "a prompt rule only" because "a rule with no check drifts" (line 59).
- "Then a decision on the baseline sync records" has no trigger either.

L-43 says deferred work needs a detector.

**Proposed resolution.** Put the date in a file a check reads (an `ci/exceptions.yaml` entry, or a lesson whose
`review-by` L1 already reads). Have `steps.test.mjs` or F2's test pin the section count. Give the shipping question a
tracker issue.

### AR-13 — §6 cuts before it reads its evidence

**Where:** F-16 §6, lines 232–248; Acceptance, lines 385–389.

The cut is justified by counts "the PR records … before the cut". No threshold says what count keeps a section, so the
evidence cannot change the outcome. `seams-detail` merges into `seams`, and I1 "reads the merged field". Open issues
filed on the old form carry both `### Seams` and `### Seams detail`. `issue-shape.yml` runs on `edited`, so editing
one of them runs the new I1. Acceptance covers `dev/features/` docs under F1, F2 and R1, not old issue bodies under
I1.

**Proposed resolution.** State the threshold (for example: a section filled with `none` or a restatement in 18 of 20).
Add an acceptance line: an old-form body with both headings still passes I1.

### AR-14 — `.vale.ini` has no class, and the new files ship unnamed

**Where:** F-16 §8 heading, line 266; Build map step 7, lines 455–456.

`dev/ownership.yaml` has no glob for a root `.vale.ini`, so O1 reports `unclassified/.vale.ini` and new-project
refuses. `dev/ownership.yaml` is owner-only and not in step 7's file list. `ci/prose/**`, `ci/prose.mjs` and
`ci/fixtures/known-bad/prose/**` match `ci/**` (managed) and ship to every project. `ci/baselines.json` is seeded, so a
project created after step 7 starts with slipway's `prose` count for a job it never runs.

**Proposed resolution.** Add `dev/ownership.yaml` to step 7. Class `.vale.ini`, `ci/prose/**` and `ci/prose.mjs`
`internal` while the check is slipway-only, and keep `prose` out of the seeded baselines.

### AR-15 — §1 and §2's other lines have no acceptance

**Where:** F-16 §1, lines 101–125; §2, lines 166–170; Acceptance, lines 349–425.

No acceptance line covers `process/writing.md` ("under 600 words, eight rules", one pair per rule) or the two pointer
lines. Rules 4 to 7 name no pair. §2's "every other line status prints for a person … starts with the action or the
state" has no test. The option table calls the standard "tested on itself" (line 62); nothing does that.

**Proposed resolution.** Add a test that `writing.md` exists, is under 600 words, and has eight numbered rules, each
with a pair. Either add a form test for Needs attention and Also unblocked or say that only the Next line is tested.

### AR-16 — The "seven PRs" acceptance cannot fail by a command

**Where:** F-16 Acceptance, lines 415–419; §3, lines 203–206; Known limitations, line 343.

"The first PRs by hand" has no command, and §3 may be two PRs, making eight. The shaping branch already breaks it:
3e532a9's subject, "docs(features): plain language build map numbered #456 to #462, filed as #455", is 77 code
points. The issue titles #455 to #462 are 58 to 71, so they pass.

**Proposed resolution.** Run P1's new rules as a script on each stage's PR by hand (the script exists from stage 6),
or drop the line and let P1 hold it from stage 6.

### AR-17 — More readers of the old output form than §3 names

**Where:** F-16 §3, lines 187–201.

§3 names `issue-shape.yml`. Tests assert the old text too: `scripts/f2.test.mjs:62` (`^F2: PASS — green proves:`),
`:70` (an exact `F2: warning: …` line), `scripts/r1.test.mjs:56` and `scripts/lk1.test.mjs:22` (`R1: PASS`,
`LK1: PASS`). `/review-doc`'s step 1 reads F2's lines by their tags. They will be found when the tests go red, but the
diff estimate and file list miss them.

**Proposed resolution.** List them in §3 and in step 2's files.

### AR-18 — The trailer §6 cuts is not in `process/intake.md`

**Where:** F-16 §6, lines 242–243.

"Per `process/designation.md` (L-31): is there ground truth…" appears in issue bodies (#451), but no file at 3e532a9
holds it. `process/intake.md`'s designation block (`:123`–`140`) words the question differently, and
`process/designation.md:6` holds the question itself. Cutting it from intake.md's block removes nothing.

**Proposed resolution.** Find where agents take it from, or replace the line with a rule in `intake.md`: the
designation block is the code block only, with no trailer.

### AR-19 — D-035 covers steps 1 to 5 too

**Where:** F-16 Build map, lines 458–461.

"Steps 6 and 7 change what the gate runs, so `/work-ticket` reviews them on the strongest tier." Steps 1 to 5 also
change gate files: `ci/status.mjs`, S1, `report.mjs` (which every check prints through), I1, the package scripts.
D-035 reruns on the strongest tier for any gate file in the diff, computed by `gate-files.mjs`. The sentence implies
the first five are reviewed on the standard tier only.

**Proposed resolution.** Say that every step carries gate files and D-035 applies to all seven.

### AR-20 — The 72 boundary and the skip rule

**Where:** F-16 §1 rule 8, line 115; §7, lines 256–258; Acceptance, lines 391–395.

Rule 8 says "under 72", which fails 72. P1 fails "over 72", which passes it. The merge and revert skip is written under
`title/id` only, while the acceptance expects merge and revert subjects to trip no rule, `commit/long` included. A
revert subject quotes the original, so it is often over 72.

**Proposed resolution.** "72 or fewer" in both places, and a skip that covers all three subject rules.

### AR-21 — The longest subject is 448, not 198

**Where:** F-16 Problem, lines 35–36.

`git log --format=%s -200 8a5205c`, counted in code points: 167 over 72 (confirmed), longest 448, then 317, 245.

**Proposed resolution.** Correct the number.

### AR-22 — A marker in `dev/features/` is read by nothing in slipway

**Where:** F-16 §6, lines 238–239.

"A `[NEEDS CLARIFICATION]` marker … which `/clarify` and `pnpm status` already read." `ci/status.mjs` walks `docs/`
only (`:215`). In a project that covers `docs/features/`. In slipway, `dev/features/` docs are not read, so a question
moved out of Open questions there disappears from status.

**Proposed resolution.** Say the marker is read in projects, and keep `## Open questions` in slipway's own docs, or
walk `dev/features/` in slipway.

### AR-23 — "Vale runs nothing" overstates it

**Where:** F-16 Threat model, lines 326–328.

Vale supports script rules (Tengo, sandboxed) in a styles folder, and `pr-body.yml` runs on `pull_request` with the
PR's own tree. A PR can rewrite `ci/prose/` and `.vale.ini`, the rules that check its own body. P1 has the same
property today, and the gate-change rule names the edit, so the risk is low. The sentence should say so, not that
Vale runs nothing.

**Proposed resolution.** Reword to: Vale runs only the rule files in the tree, a change to them is a gate change, and
no script rule is used.
