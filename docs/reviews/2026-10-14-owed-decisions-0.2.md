# Adversarial review — F-15 owed decisions 0.2

Reviewed: dev/features/owed-decisions.md @ 53969a6
Version line: Version: 0.2 (2026-10-14)
Supersedes: docs/reviews/2026-10-14-owed-decisions-0.1.md
Review date: 2026-10-14
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

53969a6 is the head of `docs/feature-owed-decisions`, where 0.2 resolves the twelve findings of the 0.1 review. This
session did not write or edit the document. One earlier review names its path; it is superseded above.

F-15 has one ID and ten numbered Contract sections, so each finding is located by `F-15 §n` and the line range at
53969a6.

**What was read.** In full: the target; the 0.1 review; `decisions.md` D-044 and D-045 with its amendment of
2026-10-14, and the entries the prose pattern matches (D-003, D-015, D-017). The owner's picks marked in D-045 and in
the doc's Open questions are taken as settled; nothing below re-argues them. In part, to check a named claim:
`package.json`'s `meta`, `.github/workflows/pr-body.yml`, `ci/status.mjs` on `main` (9d2ef31), `ci/checks/meta/s1-status.mjs`
(its clock and `expect.json` keys), `ci/checks/meta/w1-declared-vs-invoked.mjs` (the test-wiring finding), the
frontmatter, `F-` heading and `D-044` mentions of every file in `dev/features/`, the file list of `docs/reviews/`,
`wc -l` of the five skills §9 edits, `scripts/skills.test.mjs:29`, and the open pull requests. `docs/product/FRAME.md`
in slipway's own tree is still the unfilled template (`status: draft`, `# <Product> — Frame`), so the job is checked,
as at 0.1, against the owner's principle the doc quotes (#440) and D-016.

**Verified, and how.** Each of the 0.1 review's twelve findings was checked against 0.2's text: AR-1, AR-3, AR-5,
AR-6, AR-8, AR-9, AR-10, AR-11 and AR-12 are resolved as the Changes entry says; AR-2, AR-4 and AR-7 are resolved in
the section they name and reappear elsewhere (AR-3, AR-4 and AR-5 below). §10's mapping matches every `prd-ref:` in
`dev/features/`, and no feature doc names `D-044` or `D-44`. §5's five position shapes and §7's prose pattern were run
as written over `decisions.md` at 53969a6 and at aa78024, with code spans removed line by line and quoted text
removed; results in AR-4. `pr-body.yml` triggers on `pull_request`, so `actions/checkout`'s default is the merge
ref, as §8 says. `pnpm meta` lists each test file by name, and W1 fails a `scripts/*.test.mjs` no workflow runs. The
skill sizes are work-ticket 300, log-feature 297, kickoff 164, close-milestone 86, clarify 67, against `MAX_LINES =
300`. PR #442 has merged (`main` is 9d2ef31); #447 is open.

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
| AR-1 | A fired or unreadable heading clause has no way to clear: the outcome line status asks for leaves the clause in the heading, still read | S2 | owner | steps 2, 3 | D-045 |
| AR-2 | `F-<n> is reviewed` fires on any past review, so the doc's own example pairing is born fired and its outcome discards the review it waited for | S2 | owner | step 3 | D-045 |
| AR-3 | Acceptance still says to cite in "the Problem or Changes section", against §6 as 0.2 fixed it; §9's `/log-feature` keeps the reason | S2 | owner | steps 2, 3 | |
| AR-4 | Code spans in a hard-wrapped record: read line by line, the prose count on slipway's own record is 4, not 3, and DC1's exemption rests on the same unstated rule | S2 | owner | steps 1, 3, 4 | |
| AR-5 | The issue event is readable and silent from step 3 until step 5, while the Build map says a release may follow any step | S2 | owner | steps 2–5 | D-045 |
| AR-6 | The five-step order left references behind: DC1 at "step 1's PR", decisions.test.mjs running DC1 in step 1, `package.json` missing from steps 1 and 5, §10's D-045 line | S3 | owner | — (build line) | |
| AR-7 | Verified against 8e8ad79, before #442 merged: the `ci/status.mjs` line numbers and the #442 wait in Order and overlap are stale | S3 | owner | — (build line) | |
| AR-8 | Small: labelled lines inside a fence count while positions there do not; the Decision reopens line gives the owner the outcome syntax | S3 | owner | — (build line) | |

None is S0 or S1. AR-6 to AR-8 change no guarantee and can each be carried into the build as a line under the Build
map step it names, as F-12's 0.3 review allowed. AR-1 to AR-5 each change what a check or a status line does, so
they belong in the spec.

## Findings

### AR-1 — A fired or unreadable heading clause has no way to clear

**Where:** F-15 §1 "Heading clauses are read, never written" (lines 126–133), §1 "The outcome" (lines 119–125), §2
Conditions (lines 155–157), §6 fired condition (lines 264–266), §6 Unreadable (lines 267–272), Acceptance lines
492–497, status fixture `decisions-heading-clauses` (line 292).

A labelled condition clears because the outcome line *replaces* it: "Outcome lines are read as nothing, so status
stops." A heading clause cannot be replaced that way. §1 says:

> a heading clause that has fired or cannot be read is cleared by writing it as a line, with its outcome.

and §6 tells the owner, for a fired clause, that "the instruction says to write the outcome as a line under the
heading". But §2 builds conditions "from the heading's clauses" independently of the body, and pairs no outcome line
with any condition. Following the printed instruction literally adds `Reopened 2026-11-02: …` under a heading that
still says `· reopens when M2 is activated`; the clause is still read, still fired, and the line prints every day
after. The only move that clears it is editing the heading to remove the clause, which nothing in §1, §6 or §9 says,
and which the doc's own reason for rejecting the heading form ("headings are pinned whole by tests and quoted by
reviews") makes a reader hesitate to do.

The unreadable case is worse. `provisional until the supplier confirms in writing` is "unreadable, by design" (Known
limitations); the Unreadable line asks the owner what should bring it back, and "/clarify writes it in the form
status reads". For a person's act no event fits, so /clarify has nothing readable to write, and the line has no exit
but a heading edit to move the clause into body prose, which no line names. It stays in every session's Needs
attention for the life of the project. No fixture or Acceptance case clears a heading clause either way.

**Proposed resolution.** Say in §1 that clearing a heading clause removes it from the heading's suffix (the
heading's id and title stay; only the clause goes), with the labelled line or outcome written beneath; make the §6
instruction say exactly that; give /clarify (§9) the exit for a clause no event fits: remove the clause and keep the
condition as body prose, where the sync note counts it. Add a status fixture with a fired clause removed and its
outcome line beneath (nothing printed), and one Acceptance line for it.

### AR-2 — `F-<n> is reviewed` fires on any past review

**Where:** F-15 §3 table, `is reviewed` row (line 177); §1 example (lines 105–111); Acceptance lines 532–537 (the
first-run chain).

> a file in `docs/reviews/` other than `TEMPLATE.md` names such a doc on its `Reviewed:` line; any review, current
> or not

The §1 example, and the first-run chain the Acceptance pins, pair `Amends: F-07` with `Reopens when: F-07 is
reviewed`. A decision that amends a feature is written about a feature that already has a doc, and very often a
review (F-11, F-12, F-13 and F-14 each have one in `docs/reviews/` on `main`, and F-15 two on its branch). Under "any review, current or not"
the condition is true the moment it is written: status prints "Decision reopens" on the next run, the owner re-reads
the decision they wrote that morning, and the honest outcome is `Reviewed <date>: stands`. That line replaces the
condition, so the review the author meant, the one of F-07 *as amended*, is never waited for. That is the silent
loss the feature exists to remove, produced by following its own example. The first-run chain does not say whether
F-07 has a review in its root, so the Acceptance passes either way.

`F-<n> has a doc` and `M<n> is active` can be born fired too, but there the words say what they mean; "is reviewed",
paired with "amends", reads as "is reviewed again".

**Proposed resolution.** One of: (a) `is reviewed` fires on a review of the doc whose `Review date:` is on or after
the decision's `decided` date (both are in files status reads); (b) it fires on a review that is current, i.e. whose
version line is in the doc (R1's test), so an amendment that moves the Contract's `Version:` waits for the fresh
review; (c) keep "any review" and add a form `F-<n> is reviewed again`. (b) ties it to D-041 and needs no date; (a)
also covers an amendment that moved no `Version:`. Whichever is chosen, the first-run chain names whether F-07 has a
review, and a status fixture holds an old review that does not fire the condition.

### AR-3 — Acceptance still routes the citation to Problem or Changes

**Where:** Acceptance lines 466–470; §6 Owed citation (lines 252–257); §9 `/log-feature` and `process/intake.md`
(lines 369–375).

0.2 resolved the 0.1 review's AR-2 in §6: the status line now says to write the decision "where the change belongs
(its Contract when it changes what F-06 does, and the Version moves)". The Acceptance block, which the Build map
names as the oracle, still says the opposite:

> Then  Needs attention has one line starting "(you or an agent) Owed citation:" naming the decision, F-06 and that
>       doc's path, saying to write it in the Problem or Changes section

A build session holding both will satisfy one and contradict the other, and the cheaper one to satisfy is the
Acceptance line. §9 keeps the same route in a skill and in `process/intake.md`, with its reason:

> Phase 4's doc cites each in Problem or Changes (not inside Contract, so a later citation moves no `Version:`).

For a doc being written, citing in Problem is fine: the Contract is written in the same run. The stated reason is the
problem: "so a later citation moves no `Version:`" is the 0.1 AR-2 route, now in the rule every future feature doc is
written under.

**Proposed resolution.** Rewrite the Acceptance line to §6's wording (where the change belongs; the Contract and its
`Version:` when it changes what the feature does). In §9, drop the parenthetical reason, or replace it with "a
decision that changes the Contract later moves the `Version:` (D-041)".

### AR-4 — Code spans in a hard-wrapped record

**Where:** F-15 §5 (lines 208, 226–230), §7 prose pattern (lines 308–316), §10 (lines 386–388), Known limitations
(line 435); green cases (lines 232–237).

Both DC1's position exemption and the prose count remove "code spans (backtick to backtick)" before matching. Every
other reading in §2 is per line ("Every line is cut at 500 characters before any pattern reads it"), and the quoted
text rule is explicitly "on one line". `decisions.md` is hard-wrapped at about 120 columns, so code spans cross line
breaks: at 53969a6, 4 lines have an odd number of backticks, two of them in D-045. Read line by line, the backticks
pair wrongly. D-045 at 1055–1056:

> `` owed until that feature's doc or Contents line names the decision), `Reopens when: <event>` and `Closes when: ``
> `` <event>`. Conditions projects already wrote in the heading's suffix (`*(decided … · reopens when M2 is ``

The first line keeps `Closes when:` (its span never closes on that line); the second pairs the backtick after
`<event>` with the one before `*(decided`, exposing `reopens when`. Both match the prose pattern. Run as written,
line by line, the count is **4 (D-003, D-015, D-017, D-045)** at 53969a6, and 4 at aa78024, not the "3" §7, §10 and
Known limitations state. Read across lines (a span may continue to the next line), it is 3.

The count is information, and a wrong figure is cheap. The same unstated rule decides DC1's exemption, which is a
gate: a position quoted in a code span that opens on one line and closes on the next is exposed, or a backtick earlier
on the line mis-pairs and exposes a quoted position after it. That is the 0.1 review's AR-1 failure (DC1 red on a
record that quotes the rule), reached by line wrapping instead of by a missing exemption.

**Proposed resolution.** Define a code span in §2 once, for both readers: backtick to backtick within a paragraph
(consecutive non-blank lines), or, if per line is kept, an unmatched backtick masks to the end of its line and the
next line's text up to its first backtick. Restate §7's figure under the chosen rule at the build's head, with the
ids. Add green cases: a position inside a span that crosses a line break (not counted), and a span that crosses a
line break followed by a position outside any span (counted).

### AR-5 — The issue event is readable and silent from step 3 until step 5

**Where:** Build map preamble (lines 582–583) and steps 3–5 (lines 593–602); §3 `#<n> closes` row (line 182); §7
"A readable issue condition is counted" (lines 317–320); §9 `process/slipway-rules.md` sentence (lines 366–369);
Acceptance lines 489–490.

The Build map resolves the 0.1 review's AR-9 by promising that "each step is complete on its own, a release may be
tagged after any of them, and nothing is owed between them". Step 3 ships the reader to status with `#<n> closes`
readable, so "nothing is printed, and the decision is not in the Unreadable line". The 0.1 review's AR-7 fix, the
count of decisions waiting on an issue, lands in step 4; the reader at the pull request lands in step 5. A release
tagged after step 3 therefore gives projects a status in which `*(decided … · closes when #12 lands)*`, one of the
four shapes the Problem says real projects already write, is read, silent and uncounted; and step 2's skills may
have written new ones by then. That is the AR-7 hole, shipped for one or two releases, inside a Build map that says
no such window exists.

§9's rule sentence says a condition names "an event status can see". Status never sees the issue event (§3: "never in
status"), so the rule step 2 writes either forbids the issue event or describes it wrongly.

**Proposed resolution.** Either the reader treats `#<n> closes` as unreadable until step 5 makes it readable (one
flag, and the Acceptance line for it moves to step 5), or step 4's count moves into step 3 so the issue condition is
counted from the first release that reads it. Reword §9's sentence: "an event slipway reads (status, or the pull
request that closes the issue)".

### AR-6 — The five-step order left references behind

**Where:** Acceptance lines 523–524; §5 green cases (line 232) and Wiring (lines 239–240); Build map steps 1, 3, 5;
§10 (lines 382–384).

- Acceptance: "Given slipway's own decisions.md at the head of build step 1's PR … `dc1-decisions.mjs .` exits 0".
  DC1 is built in step 3 since 0.2.
- §5: "Green cases in `scripts/decisions.test.mjs`, through the command" — the command is step 3's; step 1 creates
  the test file. Say step 3 extends it.
- Step 1 adds `scripts/decisions.test.mjs` "run by `pnpm meta`", and step 5 adds `scripts/p1.test.mjs`; neither step
  lists `package.json`, which `meta` lists tests in by name and which is a gate file needing `## Gate changes`. W1
  would fail the omission, so it would not go unnoticed; the step lists should say it.
- §10 adds "D-045 F-15" in step 3; D-045 carries `Amends: F-15` at 53969a6 already. And "cleared by one Amends line
  in each doc" means one citation of D-044 in each of F-04's and F-06's docs: an `Amends:` line lives in
  `decisions.md`.

**Proposed resolution.** Fix in place, or carry each as a line under the step it names.

### AR-7 — Verified against a commit before #442 merged

**Where:** Order and overlap (lines 392–398); `Verified against:` (lines 400–415); Problem (line 17); §6 (line 277).

`main` is 9d2ef31, with #442 merged. On it, status's open-decision reading is at `ci/status.mjs:119` (the doc says
`:107`–`108`), `Open decision:` is printed at `:366` (`:341`), and the `Owed:` lines' rule sits at `:233`–`244`
(`:219`–`233`). Order and overlap still says the status step "merges after it lands"; it has. #447 is still open, so
that line stands.

**Proposed resolution.** Carry as a build line: step 3 re-verifies against `main` and records the new `Verified
against:` (L-18), and Order and overlap drops the #442 wait.

### AR-8 — Small

**Where:** as listed.

- **Labels in a fence.** §2 reads entries and labelled lines with nothing skipped, so a fenced example of the form
  inside a decision's body (the natural way for a decision like D-045 to show it, or for a project to) gives that
  decision real `Amends:` and `Reopens when:` lines and real Owed citation lines. §5 rightly skips positions in a
  fence, because a quoted shape is not a decision pointing at an item; a quoted label is not a decision's condition
  either. `decisions.md` has no fence today. Proposed: labelled lines in a fenced block are prose; headings in a fence
  still count, for ID1's reason.
- **The reopens line's syntax.** §6 prints `(you) Decision reopens: … replace its condition with "Reopened
  2026-11-02: <what changed>" or "Reviewed 2026-11-02: stands — <why>"`. The owner's part is the product question
  (does it still hold); the outcome line is slipway's form, which the same section gives to "an agent" (D-016). The
  closes line already says `(you or an agent)`. Proposed: keep `(you)` for the re-read, and say an agent or /clarify
  writes the outcome.

**Proposed resolution.** Carry both as build lines under step 3.
