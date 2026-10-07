# Adversarial review — F-11 landing page 0.3

Reviewed: dev/features/landing-page.md @ 2f5aa88
Version line: Version: 0.3 (2026-10-06) — this line is the one a `/review-doc` review cites; it moves when the Contract or
Supersedes: docs/reviews/2026-10-06-landing-page-0.1.md
Supersedes: docs/reviews/2026-10-06-landing-page-0.2.md
Review date: 2026-10-06
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`.

2f5aa88 is the head of PR #280 (`docs/site-landing-page-0.3`). This session did not write or edit the document.

**The stopping rule this review is read under** (the document's Open questions, and PR #280): this is the last
spec round. A finding below S0 goes to a sub-issue's acceptance or to a tracker, and there is no 0.4 for S1 to
S3. No finding below is S0. Each proposed resolution is therefore written as a line for #270, #271 or the third
sub-issue, not as an edit to the document.

Read in full: the target; `docs/reviews/2026-10-06-landing-page-0.2.md`; `site/index.html` (as text);
`docs/reviews/TEMPLATE.md`; #43 (body, as edited 2026-10-07T02:38Z); PR #280 (body). Read in part, to check a
named claim: `SLIPWAY.md` (the path table, step 4, "Lessons, and where each one lives", "Exercised on a real
project", "Not verified here"), `README.md` (lines 1 to 60), `site/css/base.css` and `site/css/manual.css` (the
hero, the commands, the ramp, overflow), `process/harness/README.md` (the hooks table), `decisions.md` (D-027 and
the headings of D-004, D-014, D-015, D-016, D-029), `.claude/skills/kickoff/SKILL.md` (lines 5 to 25),
`.claude/skills/log-feature/SKILL.md` (searched for Challenge 1), #55, #270 and #271 (searched), the state of
#48, #49, #50, #54, #252 and #279.

Run: the Verify lines that can run today. The word grep prints 0 and 0; the second-command pattern prints 1 and
1; the private-sha count prints 3; the heading the page links to is found once; the kicker sentence is found in
the page and not yet in the README's first screen. All as the document and PR #280 say.

Checked and held:

- **The control.** Each of the three control facts, against today's page text. The page says one sync ("It took
  two commands and about seven questions"), "An `--adopt` mode … is in progress", and "That project's first
  milestone hasn't started". None of the three facts is on it. The review of 0.2's AR-2 is answered.
- **The sync count.** #43's Acceptance, entry by entry, by the document's rule: the first and the fourth are
  called a miss; only the second says "The sync met the yardstick"; the third and the fifth say nothing on
  whether the owner could say what changed; the sixth and the seventh have no command count. One met, two
  missed, four not fully scored.
- **The table's count.** 84 rows, 10 cut (69 to 77, and 84), 74 carried, 5 of them blocks.
- **Row 16's "most".** `SLIPWAY.md` counts 61 lessons: 15 that fire, 32 dated prose rules, 14 declined. 47 of
  61 is most.
- A1's shape: 9 questions, each answer 3 sentences or fewer.

Not rendered. The browser available to this session opened `site/index.html` as an unstyled snapshot, so
nothing was measured. The fold numbers are still the review of 0.2's, and AR-5 below is read from the
stylesheets, not from a rendered page. Not checked: the 74 carried rows line by line (the document moves that
to the claims check). Not checked against `docs/product/FRAME.md` or `docs/domain-invariants.md`, which in
slipway itself are unfilled templates; the document was checked against its own job story. No source document:
the review of 0.2 was walked instead, and each of its 12 findings has a visible resolution in 0.3.

IDs used below: **Q1–Q9** are the rows of the questions table, **row n** is a row of the claims table, **A1–A16**
are the blocks of Acceptance, **B1–B3** are the Build map steps. Verify lines are quoted, not numbered.

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
| AR-1 | Step 3 writes a private project's close into a public, shipped file and onto the page with none of the guards steps 1 and 2 have | S1 | owner | B3 (the third sub-issue) | |
| AR-2 | After step 2 the claims table and the required facts in this document are known to be wrong, and nothing says where the corrected ones live | S2 | owner | B2 (#271), B3 | |
| AR-3 | The reader and judge sessions are not clean: user-level settings load in an empty folder, and today they ask for short answers | S2 | owner | B2 (#271) | |
| AR-4 | Step 2's checks change the page under each other, and only one of them names a sha | S2 | owner | B2 (#271) | |
| AR-5 | Two browser checks measure something other than what the Contract says, and one depends on an animation | S2 | owner | B2 (#271) | |
| AR-6 | Lines marked "the owner's account" are written by a build session, and nothing has the owner give or confirm them | S2 | owner | B1 (#270), B3 | |
| AR-7 | Hygiene: an unscoped "never says most", rows citing README lines the build edits, a sha count that cannot tell slipway's shas from a private project's, small wording | S3 | owner | — | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — Step 3 has none of the guards steps 1 and 2 have

**Where:** B3; Contract "Build order" (step 3); Contract "`SLIPWAY.md` first" (last paragraph); row 61; Q8; the
required facts for "what is proven so far"; A4, A11, A14, A15.

> Step 3 writes what happened, dated, in `SLIPWAY.md`; row 61 and Q8's last sentence on the page follow it

> Q8's last sentence changes in build step 3 to what happened at the close: what it took and found, or that the
> milestone was killed, or that `/close-milestone` failed on its first real run.

Step 3 is the step that writes the most about the private project: a close is a retro, and "what it took and
found" is where a product incident or a name is most likely to arrive. It writes into `SLIPWAY.md`, which the
document itself says "is public and a sync copies it into every project", and onto the page just before #55
publishes it. Against that, each guard the document built for the earlier steps is scoped away from it:

- **The private-name check.** A4 is "Given step 1's PR". A11 is "Given the page PR". Nothing asks the owner to
  grep step 3's `SLIPWAY.md` lines or its page lines. This is the review of 0.2's AR-5 again, one step later.
- **The claims check.** A14 is "Given the page PR". Row 61 is "**Replaced in step 3** by 3 lines or more", and
  those lines are in no table. The rule "The page carries only claims in this table; a claim with no row is cut"
  has nobody checking it for the last sentences the page gains before it is published.
- **The reader test.** The required facts say "(after step 3: what happened at the close)". No round runs after
  step 3: B3 lists the lines, row 61, Q8, step 6's time and the pairing. The fact is written for a test that is
  never run.
- **The fold.** B3 adds text to §06 only, so this one probably holds, but nothing says the two numbers are
  re-read.

A15 checks that `SLIPWAY.md` has 3 lines with a citation or an owner's mark, and that the page "follow[s] those
lines". It would pass with a private name in every one of them.

S1, not S2: the document states the principle twice ("This guards the rule that no private project's name
reaches this repository"; "a claim with no row is cut") and step 3 is the last change before publication.

**Proposed resolution.** The third sub-issue is not filed yet, so this costs one paragraph. Its acceptance
carries: the owner's private-name grep of `SLIPWAY.md` and of the page before the PR is ready, in A4's words;
lists 1 and 2 of the claims check for the new lines only, by a reviewer who did not write them; and either one
reader round on "what is proven so far" or the bracket struck from the required facts.

### AR-2 — After step 2 this document's tables are known to be wrong, and nothing names the record

**Where:** Contract "Claims: one row per factual claim" (second paragraph); Contract "The reader test" ("The
facts are fixed here"); the Version line; Open questions (the stopping rule); the options table (fourth row);
B3; Build map (first paragraph).

> what that check finds is fixed in the page's PR, not in a fourth version of this doc.

> the owner re-tunes the facts once, in the page PR's body, where that PR's reviewer reads them; this doc is not
> changed in the middle of the build

> The page carries only claims in this table; a claim with no row is cut.

Three things will differ from this document once step 2 merges: the claims table (the claims check rewords and
cuts rows, and adds rows for sentences that had none), possibly the three control facts, and whatever this
review's findings add to the sub-issues' acceptance. Each is recorded somewhere else: a PR's diff, a PR's body,
an issue. The document stays on `main` at 0.3, saying the page carries only the claims in a table that no
longer matches the page.

That matters because the table is used again. B3 replaces row 61. The options table rejects a generated page
because "a claims table per release is enough", which makes the table the thing a later release checks the page
against. The next person to do that opens this document and finds the uncorrected draft. Three more copies of
it will sit in #252, #270 and #271: the Contract is about 40,000 characters, and with Acceptance and Verify the
copy is about 47,800 per issue.

The document cannot fix this by editing the table in the page PR, because of its own first line: "it moves
when the Contract or Verify below changes". The table is in the Contract. An edit moves the Version line, this
review goes stale, and the stopping rule says there is no further round.

Smaller, and unverified: GitHub limits an issue body to 65,536 characters. #252's body is 28,367 today and
#271's is 22,397, each with parts of an older Contract in it. Whether 47,800 more fits beside what stays was
not worked out here.

**Proposed resolution.** Say where the record lives, in #271's acceptance. One option: the page PR commits the
corrected table, and the facts as tested, to a file beside the page, and the PR that does so states that it
supersedes the table here. Another: the owner decides that a correction made by the claims check, or a one-line
pointer, does not move the Version line, and records that. Either way, say that where an issue's acceptance
differs from this document because of this review, the issue wins and names the AR id. Check the copy fits
before relying on it.

### AR-3 — The reader and judge sessions are not clean

**Where:** Contract "The reader test" (Readers; The prompt; The judge; Rounds); A6; A7; Known limitations
(second bullet).

> Three fresh sessions, each started in a new empty folder outside the repository, so no project instructions
> and no project memory load.

An empty folder removes project instructions. It does not remove user-level ones: settings, an output style,
plugins and their session-start hooks, and a user-level instructions file all load in every session on the
machine. This is not hypothetical. This review session, started on the owner's machine, was given a user-level
output style and a session-start hook from a user-level plugin, and both tell the session to answer in as few
words as possible. A reader session started the way the document describes gets the same two.

The reader's prompt says "Include everything the page says that bears on the question." The session is told
the opposite before the prompt arrives. The test then needs every one of 53 verdicts to be "stated", and each
miss changes the page. So a round can fail because of how the machine is set up, and the page is edited to
repeat itself until a terse reader repeats it back. Known limitations already says three rounds "can favour a
page that repeats itself"; this makes it the likely outcome, not a risk. The noise floor helps a reviewer see
it afterwards. It does not stop the page being changed.

The control is affected the other way. It passes when readers do not state three facts. A reader that states
little passes it more easily, whatever the page says.

One more input the judge should not see: the required-facts table marks three facts "**control:**" and one
"(after step 3: …)". The judge "is given the readers' answers and the required facts below, nothing else". If
the table is pasted as it stands, the judge is told which facts a reader is expected to miss.

**Proposed resolution.** In #271's acceptance: readers and the judge run with user-level settings, hooks,
plugins, output style and instructions off, or through the API with the prompt alone, and the PR says how each
session was started. The judge's copy of the facts has the labels removed.

### AR-4 — Step 2's checks change the page under each other

**Where:** B2; Contract "The reader test" (Rounds); Contract "The claims check, in the page step"; Contract "The
commands run" (second bullet); A7, A8, A9, A13, A14.

> Otherwise the page changes and new sessions answer, up to 3 rounds after the control.

> A row that does not hold is reworded to its source or cut, in that PR.

> Their notes of every guess go in the PR, as the runner's own notes, and each is fixed on the page in the same
> PR.

Step 2 has four things that change the page's text after it is first written: a failed reader round, the
claims check, the runner's notes, and the hero reorder. It has four checks whose result depends on that text:
the reader test, the claims check, the fold measurement, and the overflow check. Only the claims check says
when it is read ("at the PR's sha"). B2 lists the reader test before the claims check and gives no order for
the rest.

So this passes every block as written: the readers pass at one commit; the claims check then cuts the sentence
that carried a required fact, because it was stronger than its source; A14 passes at the final commit; A7's
record is of a page that no longer exists. The same holds for A8 if a note added for the runner's guess pushes
the first command down, and for the claims check if a reader round added a sentence that has no row.

There is also no cap on the claims check's own loop. The reader test stops at three rounds and goes to the
owner. A row found stronger than its source is reworded by the build session and read again, with no limit and
no rule for who decides when the reviewer and the author disagree.

**Proposed resolution.** In #271's acceptance: the PR names the last commit that changed the page's or the
README's text, and A7, A8, A10, A12, A13 and A14 each report that commit. A text change after any of them
re-runs lists 2 and 3 of the claims check and the two measurements, and one reader round if a sentence carrying
a required fact changed. A second disagreement on the same row goes to the owner.

### AR-5 — Two browser checks measure something other than what the Contract says

**Where:** A8; A13; Verify (the browser lines); Contract "The first screen" (first bullet); Contract "Design and
layout".

> `[...document.querySelectorAll('main *')].every(e => e.getBoundingClientRect().right <= document.documentElement.clientWidth)   → true`

`site/css/manual.css`, the launch line: `.ramp li.launch .line { position: absolute; left: 0; top: -1px;
width: 100vw; … }`. `site/css/base.css` says why the sections clip: "the launch lines run to the page edge; each
section clips them". The line is inside `main`, starts at the left edge of step 7's tread, and is a full
viewport wide, so at full size its right edge is past the viewport by design. Where the browser supports
`animation-timeline: view()` and motion is allowed, the line is animated by scroll position, so its measured
width depends on where the page is scrolled; A13 does not say. With reduced motion, or without that support,
it is full width. The check therefore passes or fails by browser, motion setting and scroll position, and can
fail on today's page with no content too wide. The review of 0.2 proposed this expression (its AR-8) and did
not see the line. Read from the stylesheets; not rendered.

The page cannot pass by removing the line: "No new section, page or visual direction", and the ramp is the
design's signature.

> The bottom edge of the first command's line is at or above the fold […] Only that line.

> `document.querySelector('.start .cmd').getBoundingClientRect().bottom <= window.innerHeight`

`site/index.html` line 44: the note is inside the command's element (`<p class="cmd">npx use-slipway acme
--dry-run<span class="cmd-note">Prints every step…</span></p>`), and `.cmd-note` is `display: block`. The
selector measures the command and its note together: the 49 px box the review of 0.2 reported. The Contract's
rule is the command's line alone. The check is the stricter of the two, by one or two lines of note text on
the phone. A builder who meets the Contract and not the check, or the reverse, has no way to tell which wins.

Neither says the fonts have loaded. The page loads three families from Google Fonts with `display=swap`. Where
the headline and the lede wrap decides where the command lands, and a session that measures before the fonts
arrive, or with them blocked, measures a different page.

**Proposed resolution.** In #271's acceptance: the overflow check excludes the launch line by name
(`main *:not(.line)`), and says so. A8 says whether the note counts; if it does not, measure the command's own
text. Both run after `await document.fonts.ready`, and the PR shows `document.fonts.check` true for the
headline's family.

### AR-6 — "The owner's account" is written by a build session

**Where:** Contract "`SLIPWAY.md` first" (second and third bullets); Contract "How the page describes the real
project"; A3; A4; A15; rows 59, 61 and 62; Q8; Problem item 1 (last clause); Known limitations (fifth bullet).

> A line about the state of a private repository cannot be verified against a slipway sha: it is rewritten to
> what is true and marked as the owner's account, with its date.

> step 1 writes that every item of it is built and the close has not run.

Step 1 is built by an agent session from #270. It cannot see the private repository, so "what is true" reaches
it from somewhere. For the syncs the document closed this: one source, #43, and "A list a session holds is a
convenience". For every other line about the private project there is no #43. The session writes the sentence
and writes "the owner's account" beside it.

A3 checks that the mark is there. A4 is the name grep. Nothing asks the owner to state the account or to read
the lines that carry their name as the source. The one this matters most for is "every item of its first
milestone is built". It is the source of row 61, the last sentence of Q8, and the third control fact. In this
document it appears first in Problem item 1, and the Evidence line under the Problem does not cover it.

The document already has a convention that would do: for the 2026-10-06 decisions, "the record is the body of
PR #275, which lists those decisions and which the owner merged". Step 1's PR is not asked to list anything.

**Proposed resolution.** In #270's acceptance, and the third sub-issue's: the PR body quotes every line it
marks as the owner's account, under one heading, with who supplied each; the owner's merge of that PR is the
record, as with #275. A line the owner did not supply is not marked as theirs.

### AR-7 — Hygiene

**Where:** Contract "How the page reports the syncs"; rows 3, 16, 33 and 54; Q2; Q6; Verify (the sha count); A2;
A3; Known limitations (first bullet); B3.

- "The page never says 'most'" is written without a scope, under the syncs. Row 16 and Q2 both say "most of
  what I learned". Scope the rule to the syncs, or the claims check has two rules that disagree.
- "`README.md` mirrors the page's first screen; it is a source only where a row cites a section of it that the
  build does not edit." The first screen is "from its top through its first code block". Row 3 cites "`README.md`
  line 5" and row 54 and Q6 cite "You need", which is line 17. Both are inside the stretch step 2 edits.
- The sha count (`grep -c -E '\b[0-9a-f]{7,40}\b'`, "0 after step 1") cannot tell a slipway sha from a private
  project's. #43's entries for the sixth and the seventh sync name three slipway commits (`836afe7`, `d5434e2`,
  `093e52b`). If step 1 quotes them in a sync line under "Exercised on a real project", the count is not 0 and
  nothing private is there. The `git cat-file -e` allowance is written for step 3 only. The document also does
  not say which of the two sections the sync lines go in; A3 reads both.
- #43's entry for the sixth sync contains the words "One miss:", about the PR-body check and not the
  yardstick. The document scores that sync "not fully scored". The build "recounts from #43 on the day it
  runs", in another session; say on that line why it is not one of the misses.
- Row 33's block says "Durations as the table gives them" and gives step 5 "the milestone". The path table
  gives step 5 no duration; the words are from the step's heading. `SLIPWAY.md` itself gives step 0 "~1–2h" in
  the table and "about an hour" in the heading.
- A2 asks that every S0 and S1 "has a tracker or a resolution in this doc". Under the stopping rule an S1 here
  goes to a sub-issue's acceptance. Say that an acceptance line in #270, #271 or the third sub-issue counts, and
  that the register above names it.
- The run by an engineer who has not used slipway is "a named follow-up under #252". B3 closes #252.
