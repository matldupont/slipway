# Adversarial review — F-15 owed decisions 0.3

Reviewed: dev/features/owed-decisions.md @ 5915170
Version line: Version: 0.3 (2026-10-14)
Supersedes: docs/reviews/2026-10-14-owed-decisions-0.1.md
Supersedes: docs/reviews/2026-10-14-owed-decisions-0.2.md
Review date: 2026-10-14
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

5915170 is the head of `docs/feature-owed-decisions`, where 0.3 places the eight findings of the 0.2 review. This
session did not write or edit the document. Two earlier reviews name its path; both are superseded above. The owner
has said this is the last whole-document review before the build: a finding that changes no guarantee rides the
build as a line under the Build map step named in its register row.

F-15 has one ID and ten numbered Contract sections, so each finding is located by `F-15 §n` and the line range at
5915170.

**What was read.** In full: the target; the 0.2 review; `decisions.md` D-045 with both amendments. The owner's picks
marked in D-045 and in the doc's Open questions are taken as settled; nothing below re-argues them. In part, to check
a named claim: the entries the prose pattern matches (D-003, D-015, D-017); `ci/status.mjs` at `main` (9d2ef31,
`:119`, `:366`, `:230`–`244`); `ci/checks/meta/r1-review-provenance.mjs` (what a stale review does);
`ci/checks/meta/pc1-positive-control.mjs` (how it starts a check); `ci/checks/lib/milestones.mjs` and
`ci/checks/lib/feature-docs.mjs` (which files are read); `.github/workflows/pr-body.yml` (its triggers and P1's
call); `scripts/sync.mjs` (`fitCount()`'s callers, package.json scripts merged key by key);
`.claude/skills/close-milestone/SKILL.md` (what it closes or kills, the commands it runs); `process/designation.md`
(cases 4 and 5, the Review surfaces); `wc -l` of the five skills §9 edits; the open pull requests and their files.
`docs/product/FRAME.md` in slipway's own tree is still the unfilled template, so the job is checked, as at 0.1 and
0.2, against the owner's principle the doc quotes (#440) and D-016.

**Verified, and how.** Each of the 0.2 review's eight findings was checked against 0.3's text: AR-1 (§1 lines
126–138, §9 `/clarify`, fixture `decisions-heading-cleared`), AR-3 (Acceptance 501–504, §9), AR-4 (§2 lines 160–165),
AR-5 (§3 line 193, §6 lines 284–291), AR-6 (Acceptance 570, §5 line 245, steps 1 and 5, §10), AR-7 (Order and
overlap, `Verified against:`) and AR-8 (§2 line 163, §6 lines 275–283) are resolved as the Changes entry says. AR-2
is resolved as written and reappears below as AR-1, through R1. §7's prose pattern and §5's five shapes were run over
`decisions.md` at 5915170 under §2's span rule (paragraph spans, fences masked, quoted text removed, labelled lines
skipped): the prose count is 3 (D-003 line 24, D-015 line 59, D-017 line 95), no position shape is exposed, and the
only labelled line is D-045's `Amends: F-15`. §10's mapping holds: each named doc names its decision, and neither
F-04's doc (`dev/features/intake-skills.md`) nor F-06's (`dev/features/next-slice.md`) names D-044; neither has a
`Version:` line or a review, so citing D-044 there turns no R1 finding. `pr-body.yml` runs on `synchronize`, so a
commit that writes the outcome re-runs P1. Skill sizes: work-ticket 300, log-feature 297, kickoff 164,
close-milestone 86, clarify 67. #447 is open and also edits `process/intake.md`; #443 shares no file.

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
| AR-1 | On a green tree every reviewed doc has a current review (R1), so `Amends: F-07` with `Reopens when: F-07 is reviewed` fires the run after it is written, before the amendment is in the doc, and the line says the review "already covers it" | S1 | owner | steps 1, 3 | |
| AR-2 | `M<n> is active` does not fire on a killed milestone, and `/close-milestone` kills the active one: a fired condition goes silent with no outcome | S2 | owner | step 1 | |
| AR-3 | A decision the re-read reopens but does not re-decide has no form: its heading keeps `decided`, the outcome line silences status, and the open question is listed nowhere | S2 | owner | steps 2, 3 | |
| AR-4 | A condition in a heading written another way ("revisit when", or after ` — `) is neither read nor counted, while Known limitations says it is "prose and counted" | S2 | owner | — (build line, steps 1 and 4) | |
| AR-5 | Fixtures that cannot hold what they say: `decisions-owed` counts two lines and names one; `decisions-fired-reviewed` needs two review sets in one root; the killed-milestone case has no fixture; the first-run chain's review quotes a line earlier than 0.1 | S3 | owner | — (build line, step 3) | |
| AR-6 | Wiring the steps leave out: PC1 passes no root (step 5), `/close-milestone` has no command for its count (step 4), the issue count before step 5 (step 4), #447 also edits `process/intake.md` (step 2) | S3 | owner | — (build lines, steps 2, 4, 5) | |
| AR-7 | A file path is text a pull request carries: print one only in a plain shape | S3 | owner | — (build line, step 3) | |

AR-1 is S1, escalated from the S2 the 0.2 review gave the same mechanism, for a stated reason: then it was a past,
stale review; now it is the current review R1 guarantees on every green tree, and the status line tells the owner
something false ("already covers it") that steers them to the outcome that discards the wait. AR-1, AR-2 and AR-3
each change when a status line prints or what it tells the owner, so each changes a guarantee and is the owner's to
place: in the spec, or as a line under the step named, by an explicit yes. AR-4 to AR-7 change no guarantee: AR-4
makes the reader do what Known limitations already promises, and the rest are fixture and wiring corrections; each
rides the build as a line under the step named.

## Findings

### AR-1 — `is reviewed` fires before the amendment it waits for

**Where:** F-15 §3 table, `is reviewed` row (line 188); §1 example (lines 105–111); §3 lines 195–198; Acceptance lines
524–526 and the first-run chain (580–588); status fixture `decisions-fired-reviewed` (line 307).

0.3 took (b) of the 0.2 review's AR-2: the event fires on a review "**and is current**: the version line it quotes is
the doc's `Version:` line", and

> one that moved no `Version:` fires at once, and the line says why ("F-07's current review already covers it").

R1 makes a stale review a red finding until a fresh review supersedes it (`provenance/stale`,
`ci/checks/meta/r1-review-provenance.mjs:223`–`224`). So on any green tree, every feature doc that has ever been
reviewed has a current review. The §1 example, which the skills will copy, pairs `Amends: F-07` with
`Reopens when: F-07 is reviewed`. The decision is written first, in `decisions.md`; F-07's doc is amended after, in
the same pull request or a later one. On the run after the decision lands, F-07's existing review is current, so the
condition fires, and status prints "Decision reopens: … F-07's current review already covers it" beside the Owed
citation line that says F-07's doc does not yet name the decision. Both cannot be true. The owner, told the review
covers it, writes `Reviewed <date>: stands`; the condition is gone, and when F-07's Contract later moves and its
fresh review lands, nothing reopens the decision. That is the 0.2 review's AR-2 loss, reached through the review R1
keeps current instead of through an old one.

Status cannot see the premise the line asserts. "Written by a decision that moved no `Version:`" (Acceptance 525)
is a fact about a future edit to another file; status sees only that a current review exists. The first-run chain
avoids the case by giving F-07 no current review ("none quoting 0.1"), which a green tree never has for a reviewed
doc, so the Acceptance passes while the common case fails.

**Proposed resolution.** In §3's row: when the decision also has `Amends: F-<n>` for the same feature, `F-<n> is
reviewed` does not fire while that citation is owed (§4). Once the doc names the decision, a current review fires
it: if the citation moved the `Version:`, R1 has already forced the fresh review into that pull request, which is the
re-read the author meant; if it moved none, the line's "already covers it" is then true of a doc that names the
decision. Without an `Amends:` for that feature the rule is unchanged (born fired, as lines 195–198 say). Everything
the rule reads is already in §2 and §4. Add the case to `decisions-fired-reviewed`: `Amends: F-07` and
`Reopens when: F-07 is reviewed`, a current review of F-07, the doc not naming the decision — the Owed citation line
and no reopens line; and give the first-run chain a current review of F-07's doc before PD-3 is rewritten.

### AR-2 — A killed milestone silences `M<n> is active`

**Where:** F-15 §3 table, `M<n> is active` row (line 190); Known limitations (line 488); fixture
`decisions-fired-milestone` (line 309).

> a milestone whose `id:` is `M<n>` … has `status: active` or `closed` (closed came through active)

`/close-milestone` closes or kills the active milestone (its description: "Close (or kill) the active milestone";
frontmatter `status: closed` (or `killed`)). A killed milestone came through active as surely as a closed one. Every
event in §3 is read as a state, not an edge, so the condition fires while M2 is active and stops firing the day M2
is killed. A `Reopens when: M2 is active` that the owner had not yet answered disappears from status with no outcome
written: the silent clear the outcome lines exist to prevent. A milestone killed before it went active is rarer, and
the re-read is still due then: the milestone the decision waited for will never run.

**Proposed resolution.** `M<n> is active` fires on `active`, `closed` or `killed`, and the line says which, as
`M<n> is closed` already does for `killed`. Known limitations line 488 and the `decisions-fired-milestone` fixture
gain the killed case.

### AR-3 — A reopened decision that is not re-decided

**Where:** F-15 §1 "The outcome" (lines 119–125); §6 fired condition (lines 274–283); §9 `/clarify` (lines 399–401);
D-045 "A fired condition is cleared by its outcome".

The three outcomes are `Reopened YYYY-MM-DD: <what changed, or the decision that supersedes>`, `Closed …` and
`Reviewed …: stands`. Each assumes the re-read ends in an answer. The likeliest answer to "does D-17 still hold?" on
the day it fires is "no, and I do not know yet what replaces it". The doc gives that state no form. Writing
`Reopened <date>: …` silences status ("Outcome lines are read as nothing"); the heading keeps `decided` ("its heading
keeps `decided`" is said of Closed, and nothing says otherwise for Reopened), and status lists only headings whose
status starts `open` (`ci/status.mjs:119`). The question is open and listed nowhere: left to memory, the one thing the
feature removes. Leaving the condition in place instead keeps "Decision reopens" printing an instruction that has
already been followed.

**Proposed resolution.** One sentence in §1, the same in §6's instruction and in step 2's rules: when the re-read
leaves the decision open, its heading's status becomes `open — reopened YYYY-MM-DD` and the condition becomes
`Reopened YYYY-MM-DD: open again`; status's existing Open decision line then carries it until it is decided. No new
reader, status or heading word: `open` is the status slipway already reads, so D-045's declined "new heading status"
is not reopened. A status fixture for it (the Open decision line only) joins `decisions-outcome` or stands alone.

### AR-4 — Heading conditions outside the five spellings are silent

**Where:** F-15 §1 heading clauses (lines 126–132); §7 prose pattern (lines 332–335); Known limitations (lines
486–487).

> A heading clause is read in five spellings; one written another way ("revisit when") is not a clause, so it is
> prose and counted.

The prose pattern is "applied to an entry's body lines" (§7), and the body is "the lines up to the next heading" (§2),
which excludes the heading. A heading `*(decided 2026-03-01 · revisit when M2 is activated)*` is therefore not a
clause, not body, and not counted. The same holds for a clause after another separator,
`*(decided 2026-03-01 — reopens when M2 is activated)*`: there is no ` · `, so the whole suffix is the first clause,
the status, and nothing reads the rest. These are the headings the Problem says projects already write; a ` — `
inside a suffix is slipway's own style (`*(open — week 1)*`).

**Proposed resolution.** Build line under step 1: the prose pattern also reads the heading's status suffix, outside
any readable clause, for an entry with no readable condition; step 4's note counts it like body prose. This makes
the reader do what Known limitations already promises, so no guarantee changes. A green case in
`scripts/decisions.test.mjs` for each of the two headings above.

### AR-5 — Fixtures that cannot hold what they say

**Where:** F-15 §6 status fixtures (lines 302–319); Acceptance lines 509–510 and 580–588.

- **`decisions-owed`** (line 304) expects "two Owed citation lines (F-06 with the path; F-08's line is absent: the
  Contents line names it); nothing for F-07". That is one line, for F-06.
- **`decisions-fired-reviewed`** (line 307) holds two decisions with "one review quoting 0.1 (stale) and, for the
  second decision's root, one quoting 0.2". A status fixture is one root, which S1 runs once; in one root both
  decisions see both reviews, so both fire or neither does. Two features (F-07 with only the stale review, F-08 with a
  current one) or two cases give the intended result. With AR-1, the gated case joins it.
- **Acceptance 509–510**, "given the milestone is killed, one line": no fixture holds a Contents line in a killed
  milestone.
- **The first-run chain** (580–582) gives F-07's doc `Version: 0.1` and "one review quoting an earlier line of it".
  Under D-041 a doc is born at 0.1; there is no earlier line. Put the doc at 0.2 with a review of 0.1, or, with AR-1,
  at 0.1 with a current review.

**Proposed resolution.** Build lines under step 3: `decisions-owed` expects one line; `decisions-fired-reviewed`
splits its decisions across two features; `decisions-owed` gains an `Amends:` whose only Contents line is in a killed
milestone (one more line); the chain's doc and review are restated. If a case is split, "Thirteen cases" (line 318)
and Verify's "the thirteen" move with it.

### AR-6 — Wiring the steps leave out

**Where:** F-15 §8 (lines 369–377); §7 (lines 342–352); Fit "Numbers" (lines 85–87); Order and overlap (lines
422–428); Build map steps 2, 4, 5.

- **PC1 passes no root.** §8: "PC1 passing the fixture folder as the root too". PC1 starts every check as
  `spawnSync(process.execPath, [check.file, target])` (`ci/checks/meta/pc1-positive-control.mjs:151`): one argument.
  Without a change to PC1, P1 has no root, the finding never fires, and `closes-awaited` fails PC1. Step 5 does not
  list `ci/checks/meta/pc1-positive-control.mjs`, a gate file, nor say whether the second argument goes to P1 only
  (it should: other checks would read a stray argument).
- **`/close-milestone` has no reader.** The Fit section says DC1, status, sync "and the skill call it". A skill runs
  commands; it cannot import a module, and `fitCount()`, the precedent, is called only by `scripts/sync.mjs` and
  `scripts/new-project.mjs`. Status deliberately prints no prose count, and `sync --plan` fetches a release. Without
  a named command the retro bullet is counted by eye. Proposed: DC1 prints the two counts with their ids as an info
  line (ids only, as its other output), and step 4's bullet names `node ci/checks/meta/dc1-decisions.mjs .`.
- **The issue count before step 5.** §3 makes `#<n> closes` unreadable until step 5, and step 5 says the sync note's
  issue count is "now counting readable ones". Step 4 does not say what it counts in between. Proposed: from step 4
  it counts conditions whose events include an issue, readable or not, so the figure does not change meaning at step 5.
- **#447 also edits `process/intake.md`**, which step 2 edits; Order and overlap lists #447's other files. Step 2
  already waits for #447, so this is a line: re-read `process/intake.md` after #447 merges.

**Proposed resolution.** One build line each, under the step named.

### AR-7 — A printed path is text a pull request carries

**Where:** F-15 §6 "What is printed" (lines 294–297); Threat model (lines 457–461).

The Threat model allows "file paths read from the tree" beside ids and event words, and the Owed citation line prints
the paths of the feature docs that carry `F-<n>`. `readFeatureFiles()` takes every `*.md` in `docs/features/` and
`dev/features/` with an `F-` heading, whatever its name, so a file's name is text a pull request chooses, as a
decision's title is. `escapeControl` removes control characters; it does not make a name into a path.

**Proposed resolution.** Build line under step 3: print a path only when it matches a plain shape (for example
`^(docs|dev)/features/[A-Za-z0-9._-]{1,80}\.md$`), else print the F-id and "a feature doc"; one status case with an
odd name.
