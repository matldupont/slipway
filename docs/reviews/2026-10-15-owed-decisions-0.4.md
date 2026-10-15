# Adversarial review — dev/features/owed-decisions.md (F-15) 0.4

Reviewed: dev/features/owed-decisions.md @ b4e8a5d
Version line: Version: 0.4 (2026-10-15)
Supersedes: docs/reviews/2026-10-14-owed-decisions-0.1.md
Supersedes: docs/reviews/2026-10-14-owed-decisions-0.2.md
Supersedes: docs/reviews/2026-10-14-owed-decisions-0.3.md
Review date: 2026-10-15
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

Scope of this review: 0.4 is the Contract correction the Build map's step 5 owed, written after every step of the
build had merged. It was read against the code at the same commit (`b4e8a5d4a02a154e7b4f864f6655758d3dfe8dad`): the
reader (`ci/checks/lib/decisions.mjs`, `ci/checks/lib/decision-text.mjs`, `ci/checks/lib/decision-lines.mjs`), DC1,
P1, PC1, `ci/status.mjs`, the status and known-bad fixtures, the skills' pins in `scripts/skills.test.mjs`, and the
record `decisions.md`. The commands Verify names were run in the worktree at that commit (`git status --porcelain`
printed nothing): `node ci/status.mjs .` prints the two D-044 Owed citation lines and nothing else from this feature;
DC1 is green with "in prose only: D-003, D-015, D-017 (3); waiting on an issue: none". Three scratch records in a
temporary folder (invented ids, inert text) probed the reader where the document and the code could be read two
ways; each is quoted under its finding.

What 0.4 says it wrote, checked line by line: AR-1, AR-2 and AR-3 of the 0.3 review are in §1, §3, §6, Acceptance
and the fixtures (`decisions-fired-reviewed` PD-2 and PD-3, `decisions-fired-milestone` PD-4, `decisions-open-again`)
as the document describes them; the #466 lines (the louder reader, fenced labelled lines unreadable, `unreadFolders()`,
stray lines) are in §1, §2, §6 and Known limitations and in `decision-lines.mjs`; the owner's 2026-10-15 DC1 line is in
§5's prose and in `dc1-decisions.mjs` (`settled()`, the "cites no F-id" detail); the fresh-project count of 1 is in §7,
Acceptance and `scripts/new-project.test.mjs:333`; `/work-ticket`'s ask before a condition line is removed, edited or
added is in §8, Known limitations, `.claude/skills/work-ticket/SKILL.md:145` (296 lines) and the pin at
`scripts/skills.test.mjs:284`. None of those is a finding. What follows is where the document still says two things,
or says one thing and the code does another.

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
| AR-1 | §3's `is reviewed` gate is keyed to §4's "owed", which a Contents line clears, so a current review of a doc that does not carry the amendment fires it; the cell's own rationale and "once the doc names the decision" describe a doc-level gate | S2 | owner | nothing built; the next edit of §3 | |
| AR-2 | §7 says the issue count takes "every condition whose events include an issue, readable or not"; the reader counts only readable ones, so `#12 lands or <prose>` is neither waiting nor prose, only unreadable | S2 | owner | nothing built; the next edit of §7 | |
| AR-3 | §5's fixture table, Acceptance and Verify say four DC1 cases; the tree has five, the fifth being the owner's 2026-10-15 "cites no F-id" case 0.4 wrote into §5's prose | S3 | owner | — | |
| AR-4 | §6's rows for `decisions-owed` and `decisions-fired-reviewed` describe the shape AR-5 of the 0.3 review replaced, and Build map step 3 still says "the issue event unreadable, §3" | S3 | owner | — | |
| AR-5 | Known limitations offers "a placeholder id (`D-0NN`), which is no entry" as a fix for a fenced example heading after the first decision; the reader reports that heading as a stray | S3 | owner | — | |
| AR-6 | Two reader behaviours the document does not state: an unclosed fence is read as written (so a labelled line in it is readable, not unreadable), and a heading suffix is also split on `)* *(` | S3 | owner | — | |
| AR-7 | Problem's `ci/status.mjs:119` and `:366` are `:121` and `:370` at the reviewed commit; Verify names one reader test file where `pnpm meta` runs three | S3 | owner | — | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

No finding is S0 or S1. AR-1 and AR-2 each contradict a sentence the Contract states as a guarantee, so each is a
real defect; neither reaches a gate (AR-1 makes a status line print early, with the "already covers it" claim
correctly withheld; AR-2 is a count that is "information, nothing red" by §7's own words), so neither is escalated
to S1. The rest change no behaviour.

## Findings

### AR-1 — The `is reviewed` gate clears on a Contents citation, and the review it then fires on is of a doc without the amendment

**Where:** Contract §3 (the `F-<n> is reviewed` row), Contract §4, Contract §6 (the `decisions-fired-reviewed` row),
Acceptance ("Given the same decision also reading `Amends: F-07`, with the doc not naming it").

§3's row says: "**It does not fire while the same decision's `Amends: F-<n>` is owed (§4):** a current review is then
of a doc that does not carry the amendment, and once the doc names the decision a current review fires it (AR-1 of
the 0.3 review)." §4 says an `Amends:` line is owed until the id appears in the doc **or** "the text of a Contents
item citing `F-<n>` … in any milestone whose status is not `killed`". So the gate the row names is cleared by a
Contents line, and the rationale the same row gives ("a current review is then of a doc that does not carry the
amendment") is false in exactly that case: the doc still does not carry it, the review is still of that doc, and the
condition fires.

The code does what §4 says, not what the row's rationale says. `ci/checks/lib/decisions.mjs` `fires()`:
`if (amends(e).includes(ev.feature) && !cited(e.key, ev.feature)) return null;` where `cited()` is the doc's keys
**or** `itemKeys` from the milestones. A scratch record (invented ids) with `Amends: F-08`, `Reopens when: F-08 is
reviewed`, a milestone `M2` whose Contents item "build F-08 (PD-5)" names the decision, a doc `# F-08` that does not,
and a current review of that doc, gives `fired()` one event `{kind: reviewed, named: false}` and status prints
"(you) Decision reopens: PD-5 — F-08 is reviewed: re-read PD-5; does it still hold? …". The owner is asked to re-read
a decision because its feature was reviewed, when the review predates the amendment and the doc never saw it — the
0.3 review's AR-1 mechanism, through the one route §4 leaves open. "Already covers it" is correctly withheld (the
line computes `named` from the doc alone), which is why this is S2 and not the S1 the 0.3 review gave the same
mechanism: the line no longer tells the owner something false, it asks early.

The Acceptance line "Given the same decision also reading `Amends: F-07`, with the doc not naming it Then one Owed
citation line and no Decision reopens line" only covers the case with no Contents citation, so the fixture
(`decisions-fired-reviewed` PD-3) cannot see this.

**Proposed resolution.** Decide which the gate is, and say it in one place. (a) Gate on the doc: `is reviewed`
does not fire for a decision that `Amends: F-<n>` until a doc carrying `F-<n>` names the decision — the `named` flag
the line already computes — and a Contents citation clears the Owed citation line only. That matches the row's
rationale and the 0.3 review's AR-1 as accepted, and is one condition in `fires()`. (b) Keep §4's owed as the gate
and rewrite the rationale: "while the same decision's `Amends:` is owed; once a doc or a Contents line names the
decision, a current review fires it, and the line says the review already covers it only when the doc names it".
Either way, add the Contents-cited case to Acceptance and to the `decisions-fired-reviewed` fixture so the chosen
behaviour is pinned.

### AR-2 — The issue count says "readable or not"; the reader counts readable conditions only

**Where:** Contract §7 (the third bullet, "A readable issue condition is counted beside them"), Build map step 4 (the
AR-6 line), Contract §2 ("The prose count").

§7: "The counts count every condition whose events include an issue, readable or not, so their meaning did not change
when step 5 made the event readable." Build map step 4 says the same: "the issue count counts conditions whose events
include an issue, readable or not, from this step on, so its meaning does not change at step 5."

The reader, `ci/checks/lib/decisions.mjs`: `const waits = (e) => e.conditions.some((c) => c.kind !== 'changes' &&
c.readable && c.events.some((ev) => ev.kind === 'issue'))` — `c.readable` is required, and a condition with one part
that is not an event is unreadable as a whole (§2: "a part that is not an event makes the condition unreadable as a
whole"). A scratch record with `Closes when: #12 lands or the supplier confirms in writing` on PD-1 and `Closes when:
#13 lands` on PD-2 gives `awaitingIssue() = ['PD-2']`, `unreadable() = ['PD-1', …]`, `proseCount() = []`. So the sync
note and the retro bullet say one decision waits on an issue when two name one; PD-1 is in status's Unreadable line
instead, which is louder, so nothing is lost — but the sentence the document states is not what is built, and "its
meaning did not change at step 5" is not true for the mixed case: before step 5 every issue condition was unreadable
and counted; after it, only the all-readable ones are.

**Proposed resolution.** Change the document, not the reader: the Unreadable line is the right place for a mixed
condition, since the owner must rewrite it anyway. §7: "The counts count every *readable* condition whose events
include an issue; a condition that mixes an issue with text no event fits is unreadable (§2) and listed there, never
counted as waiting." Build map step 4's line says the same, as history ("from this step on, every condition naming an
issue; at step 5, the readable ones, the rest being in the Unreadable line"). Pin the mixed case in
`scripts/decisions.test.mjs`.

### AR-3 — Four DC1 fixtures in the document, five in the tree

**Where:** Contract §5 (the known-bad fixtures table), Acceptance ("Given ci/fixtures/known-bad/dc1/ with Contract §5's
four cases"), Verify ("the four dc1 cases and the p1 case listed").

§5's prose at 0.4 carries the owner's 2026-10-15 line: "With an item that cites no F-id: '… M2 item 4 cites no F-id:
in place of "M2 item 4", quote the item's words, or cite its feature once it has one'." Its table has four rows:
`position`, `position-in-heading`, `position-no-item`, `no-record`. The tree at the reviewed commit has five folders
under `ci/fixtures/known-bad/dc1/`; the fifth, `position-no-feature`, holds exactly that case (its `expected.json`:
"PD-7 names M2 item 2, an item of active M2 that cites no F-id … the detail says to name the item by its words (the
owner, 2026-10-15)"). Acceptance and Verify count four. The table is the oracle the Build map names for every step;
a reader of the table does not know the fifth case exists or what it expects.

**Proposed resolution.** Add the row (`position-no-feature` | an invented `PD-7` naming an item of an active milestone
that cites no F-id | exit 1, `decision/position/PD-7`, detail saying to quote the item's words) and write "five" in the
Acceptance and Verify lines. Also pin the §5 skip (a position in a closed or killed milestone) in the Acceptance block
that names it — it is there ("Given a position `M2 item 4` in a closed or killed milestone's decision … Then nothing
from DC1 for the first") but no known-bad or green case in the table holds it; say which test does.

### AR-4 — §6's fixture rows describe the pre-AR-5 fixtures; Build map step 3 calls the issue event unreadable

**Where:** Contract §6 (the `decisions-owed` and `decisions-fired-reviewed` rows), Build map step 3 (the first
paragraph and the AR-5 line), Contract §3.

`decisions-fired-reviewed`'s row: "`Reopens when: F-07 is reviewed` on two decisions: F-07's doc at `Version: 0.2`, one
review quoting 0.1 (stale) and, for the second decision's root, one quoting 0.2 | nothing for the first …; one line for
the second …". The built fixture (as Build map step 3's AR-5 line says it should be) holds three decisions on three
features: PD-1 on F-07 with a stale review, PD-2 on F-08 with a current review and a doc that names it, PD-3 on F-09
with a current review and a doc that does not. There is no "second decision's root"; one root holds all three.

`decisions-owed`'s row: "two Owed citation lines (F-06 with the path; F-08's line is absent: the Contents line names
it); nothing for F-07". The built fixture prints two lines, but the second is PD-4's F-11, named only on a Contents
line of a killed milestone (step 3's AR-5 line: "gains an `Amends:` whose only Contents line is in a killed milestone
(one more line)"). The row's "two" is right by accident and the case it holds is described nowhere in §6.

Build map step 3's first paragraph: "the thirteen `ci/fixtures/status/decisions-*` cases (the issue event unreadable,
§3)". §3 at 0.4: the issue event "is readable and prints nothing in status". The parenthesis points at a section that
now says the opposite; as history it needs a tense.

**Proposed resolution.** Rewrite the two rows to the fixtures as built (three decisions across F-07, F-08, F-09; PD-4's
killed-milestone Contents citation), since §6's table is what S1's `expect.json` is checked against by a reader of the
document. In step 3, "(the issue event unreadable until step 5, §3)".

### AR-5 — The placeholder-id fix for a fenced example heading leaves it a stray

**Where:** Known limitations (the "A typo can make a condition louder" bullet: "an example heading in a fence takes a
placeholder id (`D-0NN`), which is no entry"; and the "A heading with no readable id" bullet: "move the example above
the first decision, or give it a placeholder id").

The reader's stray rule (`ci/checks/lib/decisions.mjs` `parseDecisions()`): a heading with no readable id that holds a
clause opening is a stray "in an entry or not (in a fence too), but a fenced example above the first entry". A
placeholder `D-0NN` is not an id the `ENTRY` pattern reads (`(P?D)-(\d{1,9})`), so a fenced
`## D-0NN — example *(decided … · reopens when M2 is active)*` after the first decision is a heading with no readable
id holding a clause opening: a scratch record with that line under `PD-1` gives `strays = [8]`, and status prints the
Stray condition line for it. The document offers that as the fix. A numeric placeholder (`D-099`) is read as an entry
(`entries = ['PD-1', 'D-099']`), unreadable, which is louder and also a fake entry in the record ID1 counts.

**Proposed resolution.** Keep one fix in both bullets: move the example above the first decision. If a placeholder is
to stay, say that it must be a numeric id and name its cost (an entry in the record, with an unreadable condition, in
ID1's and DC1's view), or have the reader exempt a fenced heading whose id is `D-0NN` or `PD-NN` literally — a rule
to write in §2 first.

### AR-6 — Two reader behaviours the Contract does not state

**Where:** Contract §1 ("Heading clauses are read, never written"), Contract §2 ("A code span" and "A labelled line
inside a fenced block").

1. §2: "A fenced block (``` to ```) is masked whole for both readers. A labelled line inside a fenced block under a
   decision is **unreadable**". `ci/checks/lib/decision-text.mjs` `fenced()`: "A fence still open at the end of the
   text is a typo, not a block: its lines are read as written, so a stray marker never hides the decisions below it."
   So a labelled line after an unclosed ``` is readable and fires, and a position after it is counted — the opposite
   of what §2 says for a line "inside a fenced block", and the reason (#466: a stray fence marker can pair with a later
   fence) only covers the closed case. The behaviour is the right one; the document does not have it.
2. §1: "each clause after the first, separated by ` · `". `decisions.mjs` `finish()` also splits on `)* *(` between two
   suffix groups and strips a closing `)*`, so `*(decided 2026-03-01)* *(reopens when M2 is active)*` is two clauses and
   fires. Projects wrote a second group nowhere the document records, so this is a reading the document should either
   state or the reader should not have; a reader of §1 cannot predict it.

**Proposed resolution.** One sentence each in §2 and §1: "A fence with no closing marker is a typo, not a block: its
lines are read as written" and "a second `*(…)*` group on the heading is read as more clauses". Add each to the green
cases of `scripts/decisions.test.mjs` if not there (the failsafe test file may hold the first; the document names only
one test file, AR-7).

### AR-7 — Line references and the test files Verify names

**Where:** Problem (first paragraph), Contract §5 ("Green cases in `scripts/decisions.test.mjs`"), Verify, the
`Verified against:` line.

Problem: "`ci/status.mjs:119` reads only headings whose suffix starts `open`; `:366` prints them as 'Open decision'."
At the reviewed commit those lines are `:121` (`openDecisions`) and `:370`. The `Verified against: 9d2ef31` line
covers them, so this is not a false claim, but Problem is written in the present tense and the line numbers will keep
moving; the document's own rule (L-18) is a fresh `Verified against:` when a code-state claim is built on.

Verify runs `node scripts/decisions.test.mjs` for "the reader"; `package.json`'s `meta` at the reviewed commit also
runs `scripts/decisions-failsafe.test.mjs` (the #466 fail-safe: the louder reader, unread folders) and
`scripts/decisions-surface.test.mjs` (DC1 as a command, the stray lines, the caps). The green cases §5 lists as "in
`scripts/decisions.test.mjs`" are spread across the three; a reader following Verify runs one of them.

**Proposed resolution.** A `Verified against: b4e8a5d 2026-10-15` line for the Problem paragraph's references (or
drop the line numbers and keep the function names), and the two test files added to Verify with one phrase each. No
guarantee changes.
