---
prd-ref: D-045
status: draft
---

# F-15 — Owed decisions: a decision that still owes something stays in `pnpm status` until it is done

Version: 0.4 (2026-10-15)

The line above is the one a `/review-doc` review quotes. Any edit inside the Contract, Acceptance or Verify
below moves it, in the same commit, bar the sha and date of a `Verified against:` line; a single acceptance block the owner
confirmed (`/log-bug`) is the one change that leaves it.

## Problem

`pnpm status` lists the decisions that are still open and nothing else about `decisions.md`
(`ci/status.mjs:119` reads only headings whose suffix starts `open`; `:366` prints them as "Open decision").
A decision that has been made, but leaves something owed, is never surfaced again:

- **It changes a planned feature, and nothing ties it to that feature.** `/log-feature` and `/review-doc` read all of
  `decisions.md` as context, so the feature doc written later may cite it, and a review may notice when it does
  not. Nothing makes either happen. D-044 says in prose that the skills that edit a milestone's Contents "do not yet
  cite this rule"; no feature doc and no status line carries that debt.
- **Its "reopens when …" or "closes when …" condition is prose.** Six of slipway's own decided entries carry one
  (D-003 "Revisit when CI time is a measured problem", D-015, D-017, D-036, D-037, D-044); nothing reads them, so the
  event can happen and nobody is told. The only conditions slipway reads today are a lesson's `review-by` date
  (L1), a risk's `Wrong if:` line (K1, free text) and the PRD's "Resolves by" milestone.
- **It names an item by position** ("M2 item 4"). Shaping reorders items (F-14 puts a design item first in the
  milestone after the skeleton); the decision then points at another item, with nothing to say so.

Projects write conditions where slipway never did: in the heading's status suffix, after the date, as
`*(decided 2026-03-01 · reopens when M2 is activated)*`, `*(decided … · closes when #12 lands)*`,
`*(decided … · provisional until the supplier confirms in writing)*` and `*(decided … · reopens when M2 item 4's
feature doc is written)*` (seen by the orchestrator session in a real project's record, 2026-10-14; the project is
not named here, and the examples are invented in its shape). Those are precise enough to read. Body prose
("revisit when …") is not.

Each of these leaves a step to the author's memory, which is the one thing slipway's status exists to replace
(the owner's word, #440: anything a decision leaves owed must come up by itself). Workaround today: memory, or
a reviewer who happens to re-read the record. Why now: #379's order puts #440 before the next release, so the next
milestone's decisions are born on these lines and the check is tested on them.

**Job:** when I record a decision that changes a planned feature, or that is only good until something happens, I
want status to carry what it still owes until that is done, so that nothing about the decision is left to my memory.

**Verdict: PROCEED**, with #440's five proposals in the shapes the owner picked on 2026-10-14 (the five open
questions, answered in Open questions below; recorded as D-045). Rejected: do nothing (the record is read once, at
the decision); a heading-only form (headings are pinned whole by tests and quoted by reviews, and grow unreadable);
a word search over decision bodies in status (fuzzy, and a false hit sits in every session's hook); GitHub state as
the reader of an issue's close (status reads no network, D-022).

| option | for | against | verdict |
|---|---|---|---|
| do nothing | nothing new to write | the record is read once; what it owes is remembered or lost | rejected |
| labelled lines status reads, old heading clauses read too (the ask, shaped) | precise; one reader for a check and status; what projects already wrote is not silent | one more form to learn; the event list is closed | **proceeds** |
| heading suffix only | one place, already in use | long headings; tests and reviews quote headings whole | rejected |
| a word search over bodies in status | nothing already written is silent | "reopen" in a body often refers to something else; every false hit reaches every session | rejected for status; a one-time count at sync instead |
| read issue state from GitHub | "closes when #n lands" fires by itself | status is offline by rule (D-022) | rejected; read at the pull request that closes #n |

## Fit

What this feature takes from the product it joins.

Reuses:
- `visible()` and `LEAD` in `ci/checks/lib/feature-docs.mjs`: how a decision heading is found and how a line is read
  with its invisible characters removed, as ID1 reads `decisions.md` today (`ci/checks/meta/id1-ids.mjs:48`, `:57`).
- `readFeatureFiles()` in `ci/checks/lib/feature-docs.mjs`: which files carry an `F-<n>` heading, the one definition
  of a feature doc (ID1, F2).
- `contents()` and `citedFeatures()` in `ci/checks/lib/milestones.mjs`: Contents items and the F-ids each cites (F1,
  MS1, status). The milestone ids and statuses the events read come from the reader's own plain-file read of
  `docs/milestones/`, not `readMilestones()`, whose open review items are #430's (the owner, 2026-10-14, #466); DC1
  still reads milestones through `readMilestones()`.
- `reviewProvenance()`, `quotedVersion()` and `readPlain()` in `ci/checks/lib/review-header.mjs`: which document a
  review names and whether it is current, as R1 and the Fit count read them.
- `frontmatter()` in `ci/checks/lib/frontmatter.mjs`: a doc's `status:`.
- `today()` in `ci/checks/lib/clock.mjs`: the project's day, in its Timezone, as status stamps it.
- `report()`, `excerpt()` and `escapeControl()` in `ci/checks/lib/report.mjs`: every check's output, and how status
  escapes each line; S1's `expect.json` form (`ci/checks/meta/s1-status.mjs`) and PC1's `expected.json` form for the
  fixtures.
- The F-09 pattern: one module under `ci/checks/lib/` read by a check and by `pnpm status`, so the two never disagree
  (`ci/checks/lib/milestones.mjs` for MS1 and status).
- P1's reading of a closing word before an issue number (`ci/checks/meta/p1-pr-body.mjs`, `links/closes-and-leaves-open`).
- Sync's `notes` (`scripts/sync.mjs:302`), the lines a plan prints that are not rows, and the Fit count it prints
  through `fitCount()` (F-12 §3).

Numbers:
- The grouped count on status's unreadable line ("3 decisions have a condition … cannot read"), the count sync's
  note prints ("N decisions say when they reopen or close in prose only") and the same count `/close-milestone`
  writes into the retro are each computed once, in `ci/checks/lib/decisions.mjs`; DC1, status, sync and the skill call it.

New: `ci/checks/lib/decisions.mjs` (the record as data: entries, labelled lines, heading clauses, events, what is
owed, fired or unreadable, the prose count); the check DC1 (`ci/checks/meta/dc1-decisions.mjs`); three labelled
lines in `decisions.md` and the status lines that read them; one P1 finding. Searched `ci/checks/lib/` and
`ci/checks/meta/` for anything that reads a decision's body (none: ID1 reads headings, K1 and MS1 test that an id is
a heading, status reads open headings) and for anything that parses an event or condition (none: L1 reads a date and
requires a `trigger:` it does not read; K1 requires a `Wrong if:` it does not read).

## Contract

### 1. The lines — `decisions.md`

Three labelled lines may sit under a decision's heading, at the first column, anywhere in the entry before the
next decision heading. A label is exactly `Amends:`, `Reopens when:` or `Closes when:`, written at column 0 with no
list mark and no emphasis (as Fit's labels, F-12 §2); a lookalike (`- Reopens when:`, `**Amends:**`) is prose. The
text after the colon, with backticks and a closing full stop removed and whitespace squashed, is what is read.

```markdown
## PD-7 — Deposits are refunded within 14 days *(decided 2026-03-01)*

Amends: F-07
Reopens when: F-07 is reviewed
Closes when: M2 is closed
```

- **`Amends: F-07`** (several: `F-07, F-09` or `F-07 and F-09`): the features this decision adds to, amends or
  constrains. Each is **owed** until something for that feature names the decision (§4). Any token that is not an
  `F-<n>` makes the line unreadable (§6).
- **`Reopens when: <event>`** and **`Closes when: <event>`**: one condition per line, as many lines as needed.
  `<event>` is one of §3's forms, or several joined by ` or ` (any one fires). A text that is not an event is
  **unreadable**: counted, never fired.
- **The outcome.** When a condition has fired, the owner re-reads the decision and replaces the line with one of
  three: `Reopened YYYY-MM-DD: <what changed, or the decision that supersedes>`, `Closed YYYY-MM-DD: <outcome>`, or
  `Reviewed YYYY-MM-DD: stands — <why>` when the decision holds as written (the owner, 2026-10-14, on AR-5 of the 0.1
  review). **Closed** means the decision no longer constrains new work; its heading keeps `decided`, and the outcome
  line is the record (a new heading status was declined, D-045). Outcome lines are read as nothing, so status
  stops. Removing the line also clears it: a diff a reviewer sees. A re-read that leaves the decision **open** again
  writes `open — reopened YYYY-MM-DD` as the heading's status and `Reopened YYYY-MM-DD: open again` in place of the
  condition, so status's `Open decision:` line carries it (AR-3 of the 0.3 review, the owner's yes 2026-10-14); `/clarify`
  and the rules say so (§9). A `Amends:` line clears itself the moment the feature's doc or Contents line names the
  decision; nothing is edited.
- **Heading clauses are read, never written.** In the heading's status suffix, each clause after the first,
  separated by ` · `, that begins `reopens when`, `reopens if`, `closes when`, `closes if` or `provisional until`
  (case folded) is a condition, read exactly as a labelled line: `*(decided 2026-03-01 · reopens when M2 is
  activated)*` is `Reopens when: M2 is activated`; `provisional until <text>` is `Reopens when: <text>` (the
  provisional state ends and the decision is re-read, since it may change then), unreadable unless `<text>` is an
  event. The first clause is the status, as status reads it today (`open…` lists
  the decision as open; nothing else about it changes). The skills write labelled lines from now on (§9). **A heading
  clause is cleared by removing it from the suffix** (the id, the title and the status word stay: `*(decided
  2026-03-01)*`) and writing beneath the heading what replaces it: the outcome line when it fired, a labelled line
  when it is rewritten as an event, or body prose when no event fits (a person's act), where the sync note counts it
  (§7). The clause is the only thing a condition reader finds in a heading, so removing it is the one edit that
  clears it (AR-1 of the 0.2 review). The tests that pin a heading whole pin slipway's own record, and a review that
  quoted a heading reviewed a document, not the record. **A typo can make a condition louder, never silent** (the
  owner, #466): a part of the suffix not read as a clause (the first, the status, included) that holds a clause
  opening, in any spelling the letters alone make, makes the decision unreadable, counted there and never as prose.
- **Ids compare by number** with their prefix: `D-44` and `D-044` are one decision, `F-7` and `F-07` one feature,
  as ID1 and F1 compare them. Slipway's `D-` and a project's `PD-` are read alike (the owner, Q4).

### 2. The reader — `ci/checks/lib/decisions.mjs`

One zero-dependency module, no `process.exit`, reading `decisions.md` at the root it is given once. It returns the
record as data, and every reader below (DC1, status, P1, sync, `/close-milestone`) calls it:

- **Entries.** Each heading `visible()` and `LEAD` find with an id `(P?D)-(\d+)` (ID1's reading: nothing is
  skipped, a heading-shaped line in a fence counts, look-alikes are normalised), with its line number, the status
  suffix `*(…)*` split on ` · ` into clauses, and its body: the lines up to the next heading of level 1 or 2 as
  `LEAD` finds one, a decision's or not, so `## Week 1 — decide before M1 closes` ends D-045's body and the last
  entry's body ends at the next heading or the file's end. This reader is wider than status's `Open decision:`
  reading (`ci/status.mjs:119`, a `## ` at column 0), which does not change: a `### PD-3 — … *(open)*` is an entry
  here and not an Open decision line there, a known difference until status reads open decisions through this module
  (Out of scope).
- **No `decisions.md`,** or one that is not a regular file: the reader returns an empty record and says so in a field;
  status prints nothing from this feature (most status fixtures have no record), DC1 is broken (§5).
- **A readable condition** is a `Reopens when:` or `Closes when:` line, or a heading clause, whose every event is in
  §3's table. An `Amends:` line is not a condition: it is a citation owed (§4). The prose count (§7) and the
  Unreadable line (§6) use these words.
- **A code span** is backtick to backtick within a paragraph (consecutive non-blank lines), defined here once for the
  position shapes (§5) and the prose pattern (§7): `decisions.md` is hard-wrapped, so a span crosses line breaks, and
  a per-line reading pairs backticks wrongly (AR-4 of the 0.2 review). An unmatched backtick masks to the end of its
  paragraph. A fenced block (``` to ```) is masked whole for both readers. A labelled line inside a fenced block under
  a decision is **unreadable**, never read and never skipped: a stray fence marker can pair with a later fence and hide
  a real line (AR-8 of the 0.2 review, narrowed by the owner on #466). A quoted example of the form sits above the
  first decision, where it is no entry's. A heading in a fence still counts as an entry, for ID1's reason.
- **Conditions.** From the heading's clauses (rule above) and from the body's labelled lines: `{ kind: reopens |
  closes | changes, where: heading | line, line, text, events | features, readable }`. Outcome lines (`Reopened
  YYYY-MM-DD:`, `Closed YYYY-MM-DD:`) are not conditions.
- **Events** (§3), parsed from each ` or `-separated part of a condition's text; a part that is not an event makes
  the condition unreadable as a whole.
- **What is owed, fired and unreadable** against the tree: `owed()` (the `Amends:` features nothing names, §4),
  `fired(today)` (the conditions whose event has happened, §3), `unreadable()`, and `unreadFolders()`: each folder of
  the tree (`docs/features`, `dev/features`, `docs/milestones`, `docs/reviews`) that is there but cannot be read (a link,
  a file or no access in its place), by its fixed path, so nothing it hid is silent; the other folders are still read.
  The milestones are read through the reader's own plain-file read of `docs/milestones/`, not `readMilestones()`.
- **A labelled line or heading outside any entry** is a stray, and status says so (§6): a condition line in no entry
  or under a heading whose id cannot be read, and a heading with no readable id holding a clause opening, in an
  entry or not.
- **Positions** (§5): every match of the position shapes in an entry's heading or body, with the line.
- **The prose count** (§7): entries with no readable condition whose body matches the prose pattern.

Every line is cut at 500 characters before any pattern reads it, as `contents()` cuts a check line
(`ci/checks/lib/milestones.mjs`, `CHECK_MAX`); every pattern is anchored or bounded (`\d{1,9}`), none backtracks
over a run of spaces (the lesson in `frontmatter.mjs` `lineRest()`). The module returns text only in `text` and
`line` fields; the callers below print none of it (§6, Threat model).

### 3. Events, and when each fires

The closed list. Words are case folded; ids keep their case; a trailing full stop and backticks are removed first.

| form (verbs accepted) | fires when | read from |
|---|---|---|
| `F-<n> has a doc` (`has a feature doc`) | a feature doc, as ID1 and F2 define one, carries the heading `F-<n>` | `readFeatureFiles()` |
| `F-<n> is reviewed` | a file in `docs/reviews/` other than `TEMPLATE.md` names such a doc on its `Reviewed:` line **and is current**: the version line it quotes is the doc's `Version:` line, R1's own test (`quotedVersion()`, `ci/checks/lib/review-header.mjs`). A review of an earlier version does not fire it, so a decision that amends the Contract (its `Version:` moves, D-041) waits for the fresh review; one that moved no `Version:` fires at once, and the line says why ("F-07's current review already covers it") **only for a doc that names the decision**. **It does not fire while the same decision's `Amends: F-<n>` is owed (§4):** a current review is then of a doc that does not carry the amendment, and once the doc names the decision a current review fires it (AR-1 of the 0.3 review). (b) of AR-2 of the 0.2 review, the orchestrator session's advice taken | `reviewProvenance()`, `quotedVersion()` |
| `F-<n> is shipped` | that doc's frontmatter `status:`, lower-cased, is `shipped` | `frontmatter()` |
| `M<n> is active` (`is activated`, `goes active`) | a milestone whose `id:` is `M<n>` (case folded) has `status: active`, `closed` or `killed` (each came through active); the line says which (AR-2 of the 0.3 review) | the reader's own read of `docs/milestones/` |
| `M<n> is closed` (`closes`) | that milestone's status is `closed` or `killed`; the status line says which | the reader's own read of `docs/milestones/` |
| `<yyyy-mm-dd> passes` (`has passed`) | today, as status reads it in the project's Timezone, is after that calendar day; an invalid day is unreadable | `today()` |
| `#<n> closes` (`lands`, `is closed`; also `owner/repo#<n>`) | never in status: read at the pull request whose body closes `#<n>` (§8). It is readable and prints nothing in status; the decisions waiting on one are counted by id in the sync note, DC1's info line and the retro (§7). Build map step 5 shipped that reader | P1 |

Anything else is unreadable. A fired date stays fired until the outcome line replaces the condition. A condition
with several events fires on any one; the status line names the ones that fired. An event can be true the day the
condition is written (`F-07 has a doc` for a feature with a doc; `is reviewed` for a doc with a current review and a
decision that moved no `Version:`): it fires on the next run, and the honest outcome is `Reviewed <date>: stands`.

### 4. The owed citation

A `Amends: F-<n>` line is owed until the decision's id appears as a whole word (its prefix and number; `D-44`
matches `D-044`, never `D-4` or `D-440`) in one of:

- the `visible()` text of any feature doc carrying the heading `F-<n>` (frontmatter included; a companion doc
  included), anywhere in the file. Where it lands is where the change belongs: a decision that changes what the
  feature does changes its Contract, and the doc's `Version:` moves with it (D-041, and after `status: shipped` a
  Changes entry moves it too: `process/intake.md` → Feature doc version). The status line says that, and never a
  route that keeps the version still;
- the text of a Contents item citing `F-<n>` (`citedFeatures()`) in any milestone whose status is not `killed`.

A feature with no doc and no Contents line yet is owed, and the line says so (§6). Nothing is edited by any reader.

### 5. Position is refused — DC1, `ci/checks/meta/dc1-decisions.mjs`

A new check, beside ID1 in `pnpm meta`; ID1 stays about ids. It reads `decisions.md` through §2 and the milestones
through `readMilestones()`. It skips a position in a closed or killed milestone, whose items never move (the owner,
2026-10-15, via the orchestrator session).

| id | result | when |
|---|---|---|
| `decision/position/<id>` | exit 1 | an entry's heading or body matches one of five shapes: `M<n> item <k>`, `M<n>'s item <k>`, `M<n> Contents item <k>`, `M<n>'s Contents item <k>`, `item <k> of M<n>` (the `M` upper case, digits bounded, one space), outside code spans and fenced blocks as §2 defines them. One finding per entry, naming the first match's line |
| `decision/unreadable/<id>` | warning, never red | an entry has a condition or `Amends:` line that cannot be read (§1, §3). The same entries status groups (§6) |
| broken | exit 2 | no `decisions.md`, or one that is not a regular file: a project is seeded with it, and a check that cannot see passes nothing (decision-defaults §4) |

The position finding, in the project's words: "PD-3 names M2 item 4 (line 212). Items move when a milestone is
reshaped: name the feature instead. M2 item 4 builds F-07 today (`docs/milestones/M2-booking.md`): write
`Amends: F-07` under PD-3". With no such milestone, or no such item: "… no M2 item 4 to
read a feature from: write `Amends: F-<n>` for the feature the item builds". With an item that cites no F-id: "… M2 item 4
cites no F-id: in place of "M2 item 4", quote the item's words, or cite its feature once it has one". Fail, not warn (the owner, Q2).

**Known-bad fixtures** `ci/fixtures/known-bad/dc1/`, each with `expected.json`:

| case | holds | expects |
|---|---|---|
| `position` | an invented `PD-3` with "M2 item 4" in its heading clause and its body; `docs/milestones/M2-booking.md` whose item 4 cites F-07 | exit 1, `decisions.md#decision/position/PD-3`, detail naming F-07; warning `decision/unreadable/PD-3` for the heading clause |
| `position-in-heading` | an invented `PD-4` whose only position is in its italic heading clause, body clean | exit 1, `decision/position/PD-4` (emphasis is not code) |
| `position-no-item` | the same body, no milestone file | exit 1, the finding, detail saying no item to read from |
| `no-record` | no `decisions.md` | exit 2, broken, message starting "decisions.md does not exist" |

A position inside a code span or a fenced block (§2's definition, across line breaks) is not counted (the orchestrator
session's advice on AR-1 of the 0.1 review, taken): a quoted shape explains the rule, as D-045 does, and is not a decision
pointing at an item. ID1 counts a heading in a fence because a hidden duplicate id is an attack; a quoted position
is not. Emphasis is not code: a clause in the heading's italic suffix, `*(decided … · reopens when M2 item 4's doc
is written)*`, is the shape real projects write and is counted.

Green cases in `scripts/decisions.test.mjs` (step 1 writes the module's; step 3 adds those through the command):
labelled lines all readable; the three outcome forms; heading clauses in each accepted spelling; a heading whose clause
was removed with its outcome line beneath; a lookalike label; labelled lines inside a fenced block (prose); `item 4`
with no milestone id; an id inside a code span; a position inside a code span and one inside a fenced block (not
counted); a position inside a span that crosses a line break (not counted) and a span crossing a line break followed
by a position outside any span (counted); slipway's own record at the build's head (exit 0); invisible characters
before a label;
a line over 500 characters; `D-44` against `D-044`, `D-4` and `D-440`; the prose pattern's hits and misses (§7);
`decisions.md` with no entries (green, 0 scanned is the file itself). PC1 picks the fixture folder up by its name.

**Wiring.** `pnpm meta` in `package.json` runs `node ci/checks/meta/dc1-decisions.mjs .` after ID1 and
`node scripts/decisions.test.mjs`. `.github/workflows/ci.yml` runs `pnpm meta` already.

### 6. What status prints — `ci/status.mjs`

Under Needs attention, after the `Open decision:` lines and before `Open question:`, from the same reader. Every
line carries three facts a reader of the whole list needs (the orchestrator session's advice, for #445, which builds
the parallel plan from them): **who acts**, in a leading parenthesis as the Also unblocked lines write it (`(you)`,
`(you or an agent)`); **what it blocks**, after a dash at the end; and **what it waits on**, when anything. The
owner's part is always the product question (does this decision still hold; what should bring it back); the
line's form is slipway's, and an agent writes it (D-016): `/clarify` is the skill that rewrites a condition, since it
already walks what only the owner can answer (§9).

- **Owed citation**, one line per decision and feature:
  `(you or an agent) Owed citation: D-44 amends F-06 and nothing for F-06 names D-44 — write what D-44 changes into
  dev/features/next-slice.md where the change belongs (its Contract when it changes what F-06 does, and the Version
  moves) or onto the Contents line that builds F-06 — before F-06 is reviewed or built; waits on nothing`.
  Several docs carry the id: each path, comma-separated. None: `… — no feature doc carries F-06 yet; name D-44 in it
  when it is written, or on the Contents line that builds F-06 — before F-06 is shaped; waits on its doc`.
- **A fired condition**, one line per condition line that fired:
  `(you) Decision reopens: D-17 — F-02 is shipped: re-read D-17; does it still hold? An agent or /clarify writes the
  outcome (reopened, closed or stands) in its place, or, when it is open again, "open — reopened <date>" as its heading
  status and "Reopened <date>: open again", or the decision that supersedes it — before anything new is
  built on D-17; waits on nothing` and
  `(you or an agent) Decision closes: PD-3 — M2 is closed: PD-3 no longer constrains new work; replace its condition
  with "Closed 2026-11-02: <outcome>" — blocks nothing; waits on nothing`.
  "Already covers it" is printed only for a doc that names the decision (§3). The event is printed in the table's words with its ids (`M2 is killed` when that is what happened); the date is
  status's own `today`. A heading clause that fired reads the same, and its instruction says to remove the clause from
  the heading and write the outcome line beneath. The re-read is the owner's; an agent or `/clarify` writes the
  outcome line (D-016).
- **Unreadable**, one grouped line for all:
  `(you or an agent) Unreadable condition: 3 decisions say what brings them back in words status cannot read: PD-3,
  PD-7, PD-9 — for each, say
  what should bring it back (a feature doc written, reviewed or shipped; a milestone starting or closing; a date; an
  issue closing) or which feature it changes, and /clarify writes it in the form status reads, or moves a condition no
  event fits out of the heading into the entry's prose — blocks nothing: nothing reads these until then; waits on
  nothing`. Ids in file order, at most 20, then `and N more`. The grammar (labels, verbs) is named nowhere in a
  status line. An issue event is readable (§3), so no decision is listed for waiting on one.
- **Unread folder** (a fixed path, never record text) and **Stray condition line** (line numbers) each have one line
  (`ci/checks/lib/decision-lines.mjs`); the Unread folder line says the folder is a plain folder inside the repository,
  restored from git, never by copying what a link points to.

What is printed: decision ids (only when they match `^P?D-\d{1,9}$`), `F-` and `M` ids as read, event words from §3's
table, file paths from the tree, the date. Never a decision's title, a condition's text or a line of the record: the
record is a file a pull request carries, and these lines reach every session through the hook (the F-09 rule for
`Owed:` lines, `ci/status.mjs:230`–`234`). An `#<n>` event is readable and prints nothing here.

**Status fixtures** `ci/fixtures/status/`, each with its `expect.json` `attention` list (S1 compares it whole), and
each the smallest copy of an existing fixture root plus a `decisions.md`:

| case | holds | attention |
|---|---|---|
| `decisions-owed` | `Amends: F-06` with no doc naming it; `Amends: F-07` whose doc names the id in its Changes section; `Amends: F-08` with no doc at all and a Contents line that cites F-08 and names the id | two Owed citation lines (F-06 with the path; F-08's line is absent: the Contents line names it); nothing for F-07 |
| `decisions-owed-no-doc` | `Amends: F-09`, no doc, no Contents line | the "no feature doc carries F-09 yet" line |
| `decisions-fired-doc` | `Reopens when: F-07 has a doc`; a doc with `# F-07` | one Decision reopens line |
| `decisions-fired-reviewed` | `Reopens when: F-07 is reviewed` on two decisions: F-07's doc at `Version: 0.2`, one review quoting 0.1 (stale) and, for the second decision's root, one quoting 0.2 | nothing for the first (an old review does not fire it); one line for the second, saying the current review already covers it. A decision that also `Amends:` the feature it waits on, with a current review and a doc that does not name it, gives the Owed citation line and no reopens line |
| `decisions-fired-shipped` | `Closes when: F-07 is shipped`; `status: shipped` | one Decision closes line |
| `decisions-fired-milestone` | `Reopens when: M2 is active` (M2 active), `Closes when: M3 is closed` (M3 killed), `Reopens when: M4 is active` (M4 shaping) | two lines, the second saying `M3 is killed`; nothing for M4; `Reopens when: M5 is activated` with M5 killed gives one line saying `M5 is killed` |
| `decisions-fired-date` | `Reopens when: 2026-03-09 passes` and `Reopens when: 2026-03-10 passes`, today 2026-03-10 | one line, for the 9th |
| `decisions-issue-event` | `Closes when: #12 lands` | nothing: a readable condition that fires nothing in status |
| `decisions-heading-clauses` | `*(decided … · reopens when M2 is activated)*` with M2 active; `*(decided … · provisional until the supplier confirms in writing)*`; `*(decided … · provisional until F-07 is reviewed)*` with a current review; `*(decided … · closes when #12 lands)*` | two Decision reopens lines (the first and the third); one Unreadable line naming the second decision only (the fourth is an issue event, readable) |
| `decisions-heading-cleared` | `*(decided 2026-03-01)*` whose clause was removed, `Reopened 2026-03-05: …` beneath, M2 active; a second heading whose clause was moved into body prose beneath | nothing from this feature |
| `decisions-unreadable` | `Reopens when: the page shows live state`, `Amends: the roadmap`, `Amends: F-07 or later`, and one readable entry | one grouped line with the three ids, in file order |
| `decisions-outcome` | `Reopened 2026-03-01: …`, `Closed 2026-03-02: …`, `Reviewed 2026-03-03: stands — …`, a lookalike `- Reopens when: F-07 has a doc` (F-07 has a doc), and a fenced block holding `Amends: F-07` and `Reopens when: F-07 has a doc` | nothing from this feature |
| `decisions-control` | readable lines, nothing owed or fired, an `open` decision | the Open decision line only |

Nineteen cases as built, the thirteen above and the ones the reviews of the build added (an open-again outcome whose
`Open decision:` line is the only line, an odd file name, an unread folder, a stray condition line, a stray fenced
heading, a heading backstop). Two carried a step-5 variant of their `expect.json` (`decisions-issue-event`,
`decisions-heading-clauses`): step 5 wrote the final one.

Where the `attention` list of an existing fixture already pins other lines, these cases carry theirs in the same
order status prints them.

### 7. A project's first run

- **Heading clauses count from the first run** (the owner, Q5): what a project already wrote in its headings is
  precise, so each clause status cannot read is in the grouped line, and each that fires is a line, from the first
  `pnpm status` after the sync. The dogfood chain: an invented `PD-3` with "M2 item 4" in its heading clause and body
  comes up on the first run as one id in the Unreadable line (status) and one position finding (DC1); once the owner
  rewrites it as `Amends: F-07` and a readable condition, the Owed citation line takes over until F-07's doc names
  PD-3. Verify names this chain as one case.
- **Body prose is counted once, never listed in status.** The prose pattern, applied to an entry's body lines that are
  not labelled or outcome lines, with code spans and fenced blocks (§2) and quoted text (between straight or curly
  double quotes on one line) removed first, for an entry with no readable condition (§2):
  `\b(revisit(ed)?|reopen(s|ed)?)( it| this| them)? (when|if|once|after)\b`, `\bcloses? (when|if|once)\b`,
  `\bprovisional until\b`, case folded. On slipway's own record at 6e8da74 it counts 3 (D-003, D-015, D-017) under
  §2's span rule (read line by line it would be 4: D-045's spans cross line breaks, the 0.2 review's AR-4): D-045
  quotes the rule it records, in code spans and quotes, so it is not counted, and the same holds for every decision
  that explains the form to its readers. It misses D-036's "What reopens it" and D-037 on purpose: a wider pattern
  counts D-002's "moving platform reopens intake", which is a consequence, not a condition, in every project's seeded
  record. A `Amends:` line on D-015 or D-017 (§10) changes nothing here: it is not a condition.
- **A readable issue condition is counted beside them** (AR-7 of the 0.1 review): `#<n> closes` is read only at a
  pull request (§8), so status cannot see whether it has happened. The same note and bullet say how many decisions
  wait on an issue, by id, so an issue closed by hand, or before the condition was written, surfaces without the
  network (D-022). The counts count every condition whose events include an issue, readable or not, so their meaning did not
  change when step 5 made the event readable.
  - `sync --plan` and `--apply` print one note, not a row and never red: "3 decisions say when they reopen or close
    in prose only (D-003, D-015, D-017), and 1 waits on an issue status cannot see (PD-7): nothing reads a prose
    condition until it is written as an event; check the issue by hand". Nothing is stored; the counts are recomputed
    each sync. `/sync-slipway` relays notes already.
  - `/close-milestone` §3 (the retro) gains one bullet, from the same counts: the decisions still in prose, and those
    waiting on an issue, by id, for the owner to check by hand.
  - `scripts/new-project.mjs` writes nothing new: a fresh project's count is **1**, not 0: D-003's "Revisit when CI
    time is a measured problem" matches the prose pattern in every seeded record (found by step 3's review). The count
    is what the project holds, so it is the number the test and Acceptance state; none of it is red.
- **Nothing in a project's `decisions.md` is edited by sync**: the file is seeded. The form reaches a project through
  the skills that write decisions (§9), the status lines and the sync note.

### 8. The issue event, read at the pull request — P1 and `/work-ticket`

`#<n> closes` cannot be read offline, and the moment it happens has a reader already: P1 reads the pull request's
body and finds a closing word before an issue number (`links/closes-and-leaves-open`'s reading, by number and
repository). One finding is added:

| id | when |
|---|---|
| `decision/awaits-outcome:<id>` | the body's prose closes `#<n>` (bare, or this repository's `owner/repo#<n>`), and the decisions record read with that body has a readable condition naming `#<n>` with no outcome line in its place |

Detail: "this pull request closes #12, and PD-7 says it closes when #12 lands: in this pull request, replace PD-7's
condition with `Closed <date>: <outcome>`, or change the condition". The record is passed, never taken from the
working directory (AR-8 of the 0.1 review): P1 takes a root as a second argument, `node ci/checks/meta/p1-pr-body.mjs
<bodies> <root>`, and reads `<root>/decisions.md`; `.github/workflows/pr-body.yml` passes `.` (the checkout at the
pull request's merge ref, so a body that writes the outcome in the same pull request passes). With no root, P1 reads
no record and the finding never fires, so PC1's run of `ci/fixtures/known-bad/p1/` and every existing P1 test are
unchanged. A body's sidecar `<name>.changes.json` gains an optional `decisions` key naming a file in the case
folder that is the record for that body alone, used only when P1 has a root; a file a sidecar names is not read as a
body. Known-bad case in `ci/fixtures/known-bad/p1/`: `closes-awaited.md` with its sidecar and record (exit 1, the
finding, PC1 passing the fixture folder as the root too); its controls, the same body with the outcome written and
the same body with no root, in `scripts/p1.test.mjs` (new; P1 has no test file today), each naming its record.

`/work-ticket`'s ready step runs the same read before marking the pull request ready, and names the decision. It
also asks the owner before any condition line is removed, edited **or added to an entry that is already decided** in
the pull request it is shipping (the owner's yes, 2026-10-15, on step 3's security review), and names the line in the body (the owner's Q3 lets a deletion clear a condition as a visible diff; at a gate, the cheapest green is
that deletion, so the moment is made a prompt, never a memory: AR-10 of the 0.1 review, the orchestrator session's
advice taken). P1 cannot tell a deletion from an outcome write (Known limitations). The skill stays within the cap of 300
lines (`scripts/skills.test.mjs:29`; 296 at step 5), room made by rewording, no rule dropped. An issue closed by hand,
with no pull request, is never seen here; §7 counts it.

### 9. The skills and the rules, written once

Owner-only files, each edit asked for when it is made, and named in that PR under `## Gate changes`. The owner's yes
to #440's direction covers this doc naming them.

- **`process/slipway-rules.md`** → Planning flow, the "Record decisions" bullet gains: a decision that changes a
  feature says so on an `Amends: F-<n>` line, and that feature's doc or Contents line names the decision; what
  reopens or closes it is a `Reopens when:` or `Closes when:` line naming an event slipway reads (status, or the
  pull request that closes an issue), never an item's position. **`process/intake.md`** → Decisions says the same in one sentence, and that `/log-feature` writes
  `Amends: F-<n>` on a decision the run records and cites each touched decision where it bears on the doc, the Contract
  included.
- **`/kickoff`** Phase 3 step 2: "defer with the event that reopens it" becomes "as a `Reopens when:` line in the
  form status reads, or in prose when no listed event fits, said so". **`/clarify`**: a parked question that becomes a
  decision writes the same lines, and has the exit for a heading clause no event fits: it removes the clause from the
  heading and keeps the condition as body prose beneath, where the sync note counts it (AR-1 of the 0.2 review).
  **`/close-milestone`**: an extension decision writes `Closes when: M<n> is closed`; §3 gains the prose-count bullet
  (§7). **`/log-feature`** Phase 3 lists the decisions a feature touches already;
  Phase 4's doc cites each where the decision bears on the doc, the Contract included: a decision that changes the
  Contract later moves the `Version:` (D-041).
- **`decisions.md`'s header** (slipway's own; a project's copy is seeded) gains one sentence naming the three lines
  and the outcome form. **`scripts/skills.test.mjs`** pins each sentence above.

### 10. Slipway's own tree

In the PR that adds the status lines (Build map step 3), slipway's own decided entries that name a spec gain
`Amends:` lines: D-015 F-01, D-017 F-02, D-018 F-04, D-019 F-05, D-020 F-06, D-022 F-07, D-024 F-09, D-027 F-10,
D-036 F-12, D-037 F-13, D-042 F-14, D-044 F-04 and F-06 (D-045 carries `Amends: F-15` already). Each doc but F-04's
and F-06's names its decision already, so the first run lists D-044 twice: the honest debt D-044's prose records,
cleared by one citation of D-044 in each of those two docs. No decided entry's prose is rewritten (AR-6 of the 0.1 review): D-036's "What reopens it" is a
conditional reopening on what #49's pass finds, which no event says, and it stays as the owner wrote it, missed by the
pattern on purpose (§7). D-003, D-015 and D-017 keep their prose: no listed event fits ("CI time is a measured
problem"), and the sync note counts them, 3, as a project's would.

### Order and overlap

PR #442 (#385) merged on 2026-10-14 (`main` 9d2ef31): `ci/status.mjs` has its step lines and S1 its `steps` key, and
the step that adds the status lines takes `main` as it is. PR #447 (#48's third step) edits
`.claude/skills/close-milestone/SKILL.md`, `.claude/skills/log-feature/SKILL.md`, `.claude/skills/log-bug/SKILL.md`,
`decisions.md` and `scripts/skills.test.mjs`: the steps that edit skills and the retro merge after it, take `main` as
it is, and measure `close-milestone` and `log-feature` against the 300-line cap again then. #441 (a milestone's
actual hours) shares the principle and no file. `package.json`'s `meta` line changes in most pull requests: each build PR merges `main` before
it is marked ready.

Verified against: 9d2ef31 2026-10-14 — `ci/status.mjs:119` and `:366` (open headings only; `today` from `clock.mjs`;
`Owed:` lines print no project text, `:230`–`244`; PR #442's step lines in place), PR #447 open with the files Order
and overlap lists, `decisions.md` at 6e8da74 (4 lines with an odd number of backticks, 2 in D-045; the span rule gives
3 for the prose count), `ci/checks/lib/review-header.mjs` (`quotedVersion()` returns `current` for a line that is the
doc's `Version:` line). The rest, re-read at 8e8ad79 on the same day and unchanged since on the paths named: `decisions.md` (heading suffixes: `*(open — …)*`,
`*(decided YYYY-MM-DD)*`, `*(accepted)*`; no labelled line; prose conditions at D-003, D-015, D-017, D-036, D-037,
D-044; D-044 is the last id; no `D-045` on `main`, in an open pull request or on a remote branch),
`ci/fixtures/status/deadlines-toronto/decisions.md` (`*(decided 2026-03-01, by attempting it)*`, `*(open — owner,
before M2)*`), `ci/checks/meta/id1-ids.mjs` (`visible()`, `LEAD`, `(P?D)-(\d+)`, nothing skipped),
`ci/checks/lib/feature-docs.mjs` (`readFeatureFiles()`, `visible()`), `ci/checks/lib/milestones.mjs`
(`readMilestones()`, `contents()`, `citedFeatures()`, `CHECK_MAX = 500`), `ci/checks/lib/review-header.mjs`
(`reviewProvenance()`), `ci/checks/lib/frontmatter.mjs` (`lineRest()`'s note on backtracking), `ci/checks/lib/report.mjs`
(warnings never fail; 0 scanned is BROKEN), `ci/checks/meta/s1-status.mjs` (`attention` compared whole),
`ci/checks/meta/p1-pr-body.mjs` (bodies are every `*.md` in the given folder; a `.changes.json` sidecar; the closing-word
reading at `:239`; no `scripts/p1*.test.mjs`), `ci/checks/meta/l1-lessons.mjs` (`trigger:` required, not read),
`ci/checks/meta/k1-frame.mjs` (`Wrong if:` required, not read), `scripts/sync.mjs:302` (`notes`), `scripts/new-project.mjs:162`–`164`
(a project keeps D-001–D-014 only; `decisions.md` is seeded), `dev/ownership.yaml:125`, `.claude/skills/kickoff/SKILL.md:103`–`104`,
`.claude/skills/close-milestone/SKILL.md` §3, `.claude/skills/work-ticket/SKILL.md` (300 lines),
`scripts/skills.test.mjs:29` (`MAX_LINES = 300`), open pull requests #442 and #443 (files listed above).

## Seams

none: a project's own planning files and the status it prints. No person, channel or promise is added; the one
promise is slipway's own, that nothing a decision leaves owed is left to memory.

## Threat model

none beyond baseline, with the F-09 rule applied: `decisions.md` is a file a pull request carries (the trust line,
D-023), and the lines this feature prints reach every session through the SessionStart hook. So status and DC1 print
only validated ids, event words from a fixed table, file paths read from the tree and a date, never a decision's
title or a condition's text; every line is cut at 500 characters before a pattern reads it, every pattern is anchored
or bounded, and each printed line goes through `escapeControl` as every status line does. P1's finding prints ids
and a fixed sentence. Nothing here writes, reads the network or runs a command. A condition or `Amends:` line is
other people's text: one it cannot read is counted as unreadable, never passed as satisfied (decision-defaults §4).

## Known limitations

- The event list is closed. A condition on a fact outside the repository ("CI time is a measured problem", "the page
  shows live state") stays prose: counted at sync, never fired. Slipway's own record keeps three.
- The prose count is a pattern. It misses a condition written another way (D-036's "What reopens it") and would count
  a sentence that only uses the words; the pattern is kept narrow on purpose, so a project's seeded D-002 is not
  counted. The count is information, in a sync note and a retro line; nothing is red on it.
- A citation anywhere in the feature doc clears the owed line, "D-44 does not apply here" included: the mechanical
  test is that the doc's author saw the decision, not that they followed it. The status line says where the change
  belongs and that the Version moves with a Contract change; nothing checks that it did. `/review-doc` reads both.
- A `Amends:` line for a feature with no doc stays listed until a doc or a Contents line names the decision; that is
  the point, and it can be a long time.
- `#<n> closes` fires only at a pull request whose body closes `#<n>` in this repository, by P1 and `/work-ticket`.
  An issue closed by hand, before the condition was written, by a commit message or by a pull request in another
  repository never fires it; such a decision is counted and named in the sync note and the retro (§7) for the owner to
  check by hand, and `/close-milestone` could read it through `gh` (Out of scope).
- A fired date fires forever until the outcome line replaces it; a wrong date is the author's.
- Deleting a condition line clears it with no outcome recorded. The deletion is a diff a reviewer sees (the owner,
  Q3). At P1 that is the cheapest green: P1 reads the record at the head and cannot tell a deletion from an outcome
  write, so `/work-ticket` asks the owner before touching a condition line (§8); a pull request opened by hand has
  only the reviewer's eye.
- A heading clause is read in five spellings; one written another way ("revisit when") is not a clause, so it is
  prose and counted. `provisional until <a person's act>` is unreadable, by design.
- `M<n> is active` fires on a closed milestone too, and `M<n> is closed` on a killed one; the line says which.
- Lookalike labels (`- Reopens when:`, `**Amends:**`) are prose; the prose pattern counts a `reopens when` bullet.
- A project's `decisions.md` is seeded, so its header never gains the form on sync; the skills, the status lines and
  the sync note carry it.
- Status lists one Owed citation line per decision and feature and one line per fired condition, uncapped; a record
  that owes a great deal fills Needs attention, as many `Owed:` checks would. The unreadable ids are capped at 20.
- Ids compare by number and prefix, so `PD-7` and `D-7` are two decisions, as they are for ID1.
- A typo can make a condition louder, never silent (the owner, 2026-10-14, #466), so the reader is loud on purpose: a
  heading whose letters alone (marks, spaces, digits and other letters taken out) run `reopenswhen`, `reopensif`,
  `closeswhen`, `closesif` or `provisionaluntil` outside a readable clause is unreadable ("The trial closes, if
  unpaid…" included), and so is a labelled line inside a fence under a decision, a quoted example included. The fix is to reword the title or move the
  example above the first decision; an example heading in a fence takes a placeholder id (`D-0NN`), which is no entry.
- A decision heading is read as one line: a clause opening broken across two lines (`reopens` at the end of one, `when`
  at the start of the next) is not found, and the decision is silent. A heading is one line in markdown, and the
  record keeps each on one line however long (the owner, 2026-10-15, #466).
- The shared `readMilestones()` (`ci/checks/lib/milestones.mjs`), which status and other checks use, keeps one review
  item of #454 open; the owner handed it to #430 item 2 (2026-10-14, #466). This reader does not use it.
- DC1 reads a position on one line as written: `M2` and `item 4` split by a hard wrap, a doubled space or emphasis
  (`**M2** item 4`) is not counted, an unmatched backtick masks the rest of its paragraph, and a level-1 or level-2
  heading in a fence ends the entry, so a position after it is not read (its condition lines are strays). Slipway's
  own record has none; a quoted shape is not counted on purpose.
- A pull request that adds a condition to a decided entry (`Closes when: <a past date> passes`) makes status ask to
  write its outcome. The added line is a diff a reviewer sees, as a deleted one is: §8 has `/work-ticket` ask the owner
  before a condition line is removed, edited or added to an already decided entry (the owner, 2026-10-15); a pull
  request opened by hand has only the reviewer's eye.
- A heading with no readable id that holds a clause opening is a stray, and has no fix when it is a fenced example heading
  after the first decision: move the example above the first decision, or give it a placeholder id. An ordinary
  sub-heading whose words open like a clause (`### Closes when the trial ends`) is also a stray: correct or reword it.
- Heading detection reads a line cut at 500 characters (as every line is); a heading whose id or clause lies past the cut is
  read as unreadable when its suffix may have lost one, never short. This is older than step 3.
- P1 compares a closing word's repository as it compares "leaves open": a sentence with no repository may name the pull
  request's own, so a bare `#12` condition meets `Closes other/app#12` too. The finding is cleared by writing the outcome,
  or by naming the repository in the condition (`acme/app#12 lands`).

## Acceptance

```
Given a decisions.md entry with `Amends: F-06` and a feature doc carrying `# F-06` that nowhere names the decision
When  node ci/status.mjs <root>
Then  Needs attention has one line starting "(you or an agent) Owed citation:" naming the decision, F-06 and that
      doc's path, saying to write it where the change belongs (the Contract, and its Version moves, when it changes
      what F-06 does), and ending with what it blocks and what it waits on; every line this feature prints starts
      with who acts and ends with those two facts

Given the same, and the doc names the decision's id (D-44 written as D-044) in its Changes section
Then  no Owed citation line

Given `Amends: F-08`, no doc, and a Contents item citing F-08 in a shaping milestone that names the decision
Then  no Owed citation line; given the milestone is killed, one line

Given `Amends: F-09`, no doc and no Contents line
Then  one Owed citation line saying no feature doc carries F-09 yet

Given each event of Contract §3 but the issue event, written as a `Reopens when:` or `Closes when:` line, with the
      tree in the state that fires it
Then  one "Decision reopens:" or "Decision closes:" line naming the decision and the event in the table's words,
      and the outcome form with status's date; one status fixture per event kind

Given the same events with the tree not in that state (M4 shaping; today the date itself; no review; a review that
      quotes an earlier Version: line of the doc)
Then  nothing is printed for them

Given `Reopens when: F-07 is reviewed`, F-07's doc at Version: 0.2 naming the decision and a review quoting that line,
      written by a decision that moved no Version:
Then  one Decision reopens line saying F-07's current review already covers it

Given the same decision also reading `Amends: F-07`, with the doc not naming it
Then  one Owed citation line and no Decision reopens line; once the doc names the decision, the reopens line

Given `Reopens when: M5 is activated` and M5 killed
Then  one Decision reopens line saying `M5 is killed`

Given `Closes when: #12 lands`
Then  nothing is printed and the decision is not in the Unreadable line

Given a re-read that leaves a decision open: the heading status `open — reopened 2026-03-05` and `Reopened 2026-03-05:
      open again` where the condition was
Then  status's Open decision line for it and nothing else from this feature

Given a position `M2 item 4` in a closed or killed milestone's decision; given an item citing no F-id
Then  nothing from DC1 for the first; for the second exit 1, the detail saying to quote the item's words

Given a heading `*(decided 2026-03-01 · reopens when M2 is activated)*` and M2 active
Then  one Decision reopens line, whose instruction says to remove the clause from the heading and write the outcome
      line beneath

Given that heading with its clause removed, `*(decided 2026-03-01)*`, and `Reopened 2026-03-05: …` beneath; and a
      heading whose unreadable clause was moved into body prose beneath
Then  nothing is printed for either, and the second is in the sync note's prose count

Given a heading `*(decided 2026-03-01 · provisional until the supplier confirms in writing)*`
Then  the decision's id is in the Unreadable line; given `provisional until F-07 is reviewed` and a review of F-07's doc,
      one Decision reopens line

Given three entries with an unreadable condition or Amends line and one readable entry
Then  exactly one line starting "(you or an agent) Unreadable condition: 3 decisions" with the three ids in file order and no other text
      of the record

Given `Reopened 2026-03-01: …`, `Closed 2026-03-02: …`, `Reviewed 2026-03-03: stands — …`, `- Reopens when: F-07 has a doc`
      with F-07's doc present, and a fenced block above the first decision holding `Amends: F-07` and `Reopens when: F-07 has a
      doc` (the same block under a decision is unreadable, §2)
Then  nothing is printed for them

Given every status fixture of Contract §6, and the fixtures that exist today
Then  node ci/checks/meta/s1-status.mjs ci/fixtures/status exits 0, and no existing expect.json changes

Given an entry whose heading or body says one of the five shapes of Contract §5 (one case each), and M2's item 4 cites F-07
When  node ci/checks/meta/dc1-decisions.mjs <root>
Then  exit 1 with decisions.md#decision/position/<id>, the detail naming line, F-07 and `Amends: F-07`

Given the same and no M2, or M2 with no item 4, or item 4 citing no F-id
Then  exit 1, the detail saying there is no item to read a feature from

Given an entry with an unreadable condition and no position
Then  exit 0, with a decision/unreadable/<id> warning line

Given an entry whose only "M2 item 4" sits in a code span or a fenced block, or in a code span that crosses a line
      break; given one whose only "M2 item 4" sits in its italic heading clause, or after a span that crossed a line
      break and closed
Then  the first exits 0; the second exits 1 with decision/position/<id>

Given slipway's own decisions.md at the head of build step 3's PR (D-045 quotes the shape in code spans, one of them
      across a line break)
Then  node ci/checks/meta/dc1-decisions.mjs . exits 0

Given no decisions.md
Then  exit 2, the message starting "decisions.md does not exist"

Given ci/fixtures/known-bad/dc1/ with Contract §5's four cases
Then  node ci/checks/meta/pc1-positive-control.mjs is green and every other expected.json under ci/fixtures/ is unchanged

Given an invented PD-3 whose heading says `reopens when M2 item 4's feature doc is written` and whose body names
      "M2 item 4", in a project root where M2's item 4 cites F-07 and F-07 has a doc at Version: 0.1, not naming PD-3,
      with one review quoting 0.1, the doc's current Version: line, so that the doc has a current review before PD-3 is
      rewritten
When  the first node ci/status.mjs and node ci/checks/meta/dc1-decisions.mjs after the sync
Then  status's Unreadable line names PD-3 and DC1 reports decision/position/PD-3 naming F-07; and once PD-3's clause is
      removed from its heading and it reads `Amends: F-07` and `Reopens when: F-07 is reviewed` beneath, status prints
      the Owed citation line for F-07 and nothing for the condition (the current review is of a doc that does not name
      PD-3), and DC1 is green; and once F-07's doc names PD-3 where the change belongs, the current review fires the
      condition and status prints one Decision reopens line saying it already covers it

Given slipway's own decisions.md at the head of Build map step 3's PR
Then  node ci/status.mjs . lists Owed citation lines for D-044 (F-04 and F-06) and nothing else from this feature,
      D-036's prose is as it was, the prose count is 3 (D-003, D-015, D-017), and DC1 is green

Given a root whose decisions.md has 3 entries with a prose condition and no readable line, and 1 with a readable line
Then  the reader's prose count is 3, pnpm -s use-slipway sync --plan prints one note naming the 3 ids and no row for
      decisions.md, --apply prints the same note and writes nothing to decisions.md, and a fresh new-project's count is 1 (D-003)

Given a pull-request body whose prose says "Closes #12" and a record with `Closes when: #12 lands` and no outcome line
When  node ci/checks/meta/p1-pr-body.mjs <dir> <root>
Then  exit 1 with <body>#decision/awaits-outcome:<id>; with the condition replaced by `Closed 2026-03-10: …`, exit 0;
      with the body saying `Part of #12`, exit 0

Given process/slipway-rules.md, process/intake.md, .claude/skills/{kickoff,clarify,close-milestone,log-feature,work-ticket}/SKILL.md
      and decisions.md's header
Then  each carries its sentence of Contract §9 or §8, scripts/skills.test.mjs pins them, and work-ticket is ≤ 300
      lines
```

## Verify

```
node scripts/decisions.test.mjs                             # the reader: headings, labels, clauses, events, owed, fired, unreadable, positions, prose count; DC1's green runs
node ci/checks/meta/dc1-decisions.mjs .                     # exit 0 on slipway's own record
node ci/checks/meta/pc1-positive-control.mjs               # green, the four dc1 cases and the p1 case listed
node ci/checks/meta/s1-status.mjs ci/fixtures/status       # green, the nineteen decisions-* cases among the fixtures
node ci/status.mjs . | sed -n '/Needs attention/,$p'       # step 3: the D-044 Owed citation lines, nothing else new
node scripts/sync.test.mjs                                 # the note, its count, no row and no write for decisions.md
node scripts/new-project.test.mjs                          # a fresh project's count is 1 (D-003) and none waits on an issue
node scripts/p1.test.mjs                                   # decision/awaits-outcome, and its two green cases
node scripts/skills.test.mjs                               # the sentences pinned; work-ticket ≤ 300
git diff --stat main -- 'ci/fixtures/**/expected.json' 'ci/fixtures/status/*/expect.json'   # only files under dc1/, p1/ and decisions-* added or extended
pnpm meta
```

The first-run chain (Acceptance, the invented PD-3) is run once in a scratch project made from the release before this
one and synced from step 3's branch, by the build session, and its three outputs are pasted in that PR's
`## Verification` (decision-defaults §9: a count or a pass, never a real project's record).

## Build map

Five PRs, all `Part of #440`; the last closes it. No sub-issues: #440 is the ticket (the owner, 2026-10-14). The
designation per step applies `process/designation.md`; every step has this Contract and its fixtures as the oracle.
The order leaves no window a rule kept by memory would have to cover (AR-9 of the 0.1 review): each step is complete
on its own, a release may be tagged after any of them, and nothing is owed between them.

1. **The reader.** `ci/checks/lib/decisions.mjs` and `scripts/decisions.test.mjs`, run by `pnpm meta`
   (`package.json`, a gate file); nothing else reads the module yet, so a project synced here sees nothing — checks,
   ~M. Leaves #440 open. The reader parses a
   file a pull request carries and its output will reach every session: case 5, the trust line ·
   mode: `plan` · model: `Opus 5.5` · effort: `medium`.
   Carried from the 0.3 review (`docs/reviews/2026-10-14-owed-decisions-0.3.md`), the owner's yes 2026-10-14, for the
   Contract correction in step 5: AR-1, `F-<n> is reviewed` does not fire while the same decision's `Amends: F-<n>` is
   owed (§4); once the doc names the decision a current review fires it. AR-2, `M<n> is active` fires on `active`,
   `closed` or `killed`, and the line says which. Both pinned in `scripts/decisions.test.mjs`.
   Carried from the 0.3 review: AR-4, the prose pattern also reads the heading's status suffix outside any readable
   clause, for an entry with no readable condition (`revisit when …`, a clause after ` — `); a green case for each.
   Carried from #466, the owner's yes 2026-10-14, for the Contract correction in step 5: §1, a part of a heading's
   status suffix not read as a clause (the first clause, the status, included) that holds a clause opening makes the
   decision unreadable, so it is counted there and never as prose; a typo can make a condition louder, never silent.
   AR-4's green cases without a clause opening (`revisit when …`, `*(open — week 1)*`) stay as they are. §2, the
   reader names each folder of the tree that is there but cannot be read (`unreadFolders()`), and still reads the other.
   §2, a labelled line inside a fenced block under a decision is unreadable, not prose (AR-8 is narrowed: a stray
   fence marker can pair with a later fence and hide a real line); a quoted example sits above the first decision. §6's
   green case for fenced labelled lines and the Acceptance line that nothing is printed for them move with it.
   §3, the milestone events are read through the reader's own plain-file read of `docs/milestones/`, not
   `readMilestones()`; the "read from" cells and Fit's reuse line say so.
2. **The rules and the skills.** `process/slipway-rules.md`, `process/intake.md`, `/kickoff`, `/clarify`,
   `/close-milestone` (the form of an extension decision), `/log-feature`, `decisions.md`'s header,
   `scripts/skills.test.mjs` pins; after PR #447 lands — rules and skills, ~S. Leaves #440 open. The form is described
   before anything asks for it. Case 3 · mode: `regular` · model: `Sonnet 5.5` · effort: `medium`.
   Carried from the 0.3 review, the owner's yes 2026-10-14, for the Contract correction in step 5: AR-3, a re-read that
   leaves the decision open writes `open — reopened YYYY-MM-DD` as the heading's status and `Reopened YYYY-MM-DD: open
   again` in place of the condition, so status's Open decision line carries it; `/clarify` and the rules say so.
   Carried from the 0.3 review: AR-6, #447 also edits `process/intake.md`; re-read it after #447 merges.
3. **The check and the status lines.** DC1, `ci/fixtures/known-bad/dc1/**`, `package.json` `meta`; `ci/status.mjs`,
   the thirteen `ci/fixtures/status/decisions-*` cases (the issue event unreadable, §3), slipway's own `Amends:` lines
   (§10), the first-run chain in a scratch project; re-verified against `main` first, with a fresh `Verified against:`
   (L-18; AR-7 of the 0.2 review) — checks and status, ~M. Leaves #440 open. Case 5 (a line that steers
   every session) · mode: `plan` · model: `Opus 5.5` · effort: `medium`.
   Carried from the 0.3 review, the owner's yes 2026-10-14, for the Contract correction in step 5: AR-1, the
   `decisions-fired-reviewed` fixture gains the gated case (`Amends: F-07`, `Reopens when: F-07 is reviewed`, a current
   review, the doc not naming the decision: the Owed citation line and no reopens line), the first-run chain gives
   F-07's doc a current review before PD-3 is rewritten, and "already covers it" is printed only for a doc that names
   the decision. AR-2, `decisions-fired-milestone` gains the killed case for `is active`. AR-3, §6's reopens
   instruction offers the open-again outcome, and one fixture holds it (the Open decision line only).
   Carried from #466: the `decisions-outcome` case's fenced block of labelled lines sits above the first decision, or
   it expects that decision in the Unreadable line, and Verify says the same (§2 as #466 left the reader).
   Carried from #466: status prints each folder `unreadFolders()` names (a fixed path, never record text), so a folder
   the reader could not read is never silent; one status case holds it.
   Carried from #466's review, the owner's call 2026-10-14: status prints a stray condition line for a condition line
   (`Amends:`, `Reopens when:`, `Closes when:`) under a heading whose id it cannot read, so the line is never silent;
   one status case holds it. A level-1 or level-2 heading inside a fence (a `# comment` in a shell block, `## Example`
   in a markdown block) also ends the entry, so the condition lines after it are strays too; this needs no typo, and
   one status case holds it as well.
   Carried from the owner, 2026-10-15, via the orchestrator session, for the Contract correction in step 5 ("skip
   closed and killed milestones; an item with no feature is named by its words"): DC1 skips a position in a closed or
   killed milestone, whose items never move, and for an item that cites no F-id its detail says to quote the item's
   words in place of `M<n> item <k>`; still a fail. A heading with no id it can read that holds a clause opening is a
   stray wherever it sits, in an entry or not, as a labelled line in no entry is (the cold reviews of #475).
   Carried from the 0.3 review: AR-5, `decisions-owed` expects one line; `decisions-fired-reviewed` splits its
   decisions across two features (F-07 with a stale review only, F-08 with a current one); `decisions-owed` gains an
   `Amends:` whose only Contents line is in a killed milestone (one more line); the chain's doc is at 0.2 with a review
   of 0.1, or at 0.1 with a current review; the case count and Verify's "thirteen" move with any split. AR-7, a doc's
   path is printed only when it matches `^(docs|dev)/features/[A-Za-z0-9._-]{1,80}\.md$`, else the F-id and "a feature
   doc"; one status case with an odd file name.
4. **The counts.** Sync's note (`scripts/sync.mjs`, `scripts/sync.test.mjs`), `new-project`'s test,
   `/close-milestone` §3's bullet (after PR #447) — sync and skills, ~S. Leaves #440 open. Case 4 · mode: `regular` ·
   model: `Sonnet 5.5` · effort: `medium`.
   Carried from the 0.3 review: AR-4, the sync note counts heading-suffix prose as body prose. AR-6, DC1 prints the
   two counts with their ids as an info line (ids only), the retro bullet names `node ci/checks/meta/dc1-decisions.mjs .`
   as its command, and the issue count counts conditions whose events include an issue, readable or not, from this
   step on, so its meaning does not change at step 5.
   Found by step 3's review (2026-10-15), for the Contract correction in step 5: "a fresh project's count is 0
   (D-001–D-014 match nothing)" did not hold: D-003's "Revisit when CI time is a measured problem" matches the prose
   pattern, so the count is 1; step 4 settled it, and §7 and Acceptance say the number.
5. **The issue event at the pull request.** P1's root argument, finding and sidecar key, `pr-body.yml`,
   `ci/fixtures/known-bad/p1/closes-awaited*`, `scripts/p1.test.mjs` (`package.json` `meta`), `/work-ticket`'s ready
   sentences within 300 lines; the reader's issue event becomes readable here, with the two status fixtures' final
   `expect.json` and the sync note's issue count now counting readable ones — checks and a skill, ~S. Closes #440. Case 4, gate files · mode: `regular` · model: `Sonnet 5.5` · effort: `medium`.
   Carried from the 0.3 review: AR-6, PC1 passes a second argument (the fixture folder as root) to P1 only, so no other
   check reads a stray argument; `ci/checks/meta/pc1-positive-control.mjs` is a gate file this step changes.
   Found by step 3's security review, the owner's yes 2026-10-15, for the Contract correction in step 5: `/work-ticket`'s
   question to the owner before a condition line is touched also covers a condition line added to an entry that is
   already decided; done in this step, and §8 says so.
   **The Contract correction.** This step's PR writes 0.4 from the lines marked "for the Contract correction" under
   steps 1, 2, 3, 4 and 5 (AR-1, AR-2 and AR-3 of the 0.3 review, #466's lines under step 1, the owner's 2026-10-15 line
   under step 3, step 3's review's count under step 4 and its security review's ask under step 5), moving the `Version:`
   and getting one review, whose `Supersedes:` names the 0.3 review. No other whole-document review is owed. Written
   2026-10-15: the issue's Build map carried the step 4 and 5 lines and not #466's two, the doc the reverse; 0.4 takes
   the union.

Machinery before surface: the reader (1) before anything that shows it (3); the words that tell people the form (2)
before the line that asks for it (3); the counts (4) and the pull-request reader (5) once the lines exist to count.

## Out of scope

- Reading an issue's state through `gh` in `/close-milestone` for `#<n> closes` conditions: status and `pnpm meta`
  read no network (D-022); a later slice, when a project has such a condition that no pull request closed.
- A word search over decision bodies in status (rejected above): the sync note is the one reader of prose.
- Events outside the repository (a metric, a date a person confirms): the list is closed; prose, counted.
- Recording a milestone's actual hours against its estimate: #441.
- A milestone's own references to its items (kill criteria, notes): they move with the file (#440's own line).
- Renumbering or a registry of decision ids: ID1's own out-of-scope line.
- A check that requires `Amends:` on every decided decision: a decision that changes nothing writes nothing; the
  rule in §9 is prose, and `/review-doc` reads the record beside the doc.

## Open questions

- ~~Where the readable condition lives~~ — the owner, 2026-10-14: a labelled line of its own; conditions already
  written in a heading's suffix are read too (Contract §1, §3). Advised by the orchestrator session and taken: the
  issue event is kept and read at the pull request that closes the issue, never by status (§8).
- ~~Fail or warn for a decision naming an item by position~~ — the owner, 2026-10-14: fail (§5).
- ~~What clears a fired condition~~ — the owner, 2026-10-14: the line is replaced by its dated outcome, or removed
  as a visible diff; a `Amends:` line clears itself once cited (§1).
- ~~How slipway's `D-` and a project's `PD-` differ~~ — the owner, 2026-10-14: they do not; in slipway's own tree the
  citation can only live in `dev/features/` (§1, §10).
- ~~What a project's first run does with decisions already recorded~~ — the owner, 2026-10-14: heading clauses are
  listed and fired from the first run; body prose is counted once at sync and in the retro, never searched in
  status (§7).

- ~~AR-5 of the 0.1 review: what a closed decision is; the outcome when a fired condition leaves the decision
  standing~~ — the owner, 2026-10-14: closed means it no longer constrains new work, heading unchanged; a third outcome
  `Reviewed <date>: stands — <why>`; `provisional until` reads as reopening (§1).
- ~~AR-12 of the 0.1 review: the decision line's label collides with a doc's `## Changes`~~ — the owner, 2026-10-14:
  `Amends: F-<n>` (§1; D-045 amended).
- ~~AR-2 of the 0.2 review: `is reviewed` fires on any past review~~ — advised by the orchestrator session and taken,
  the owner informed, 2026-10-14: a current review only, R1's test (§3).
- ~~AR-5 of the 0.2 review: the issue event is readable and silent between steps 3 and 5~~ — the same: unreadable
  until step 5, with the parenthesis that says what reads it (§3, §6).
- ~~Whether 0.3 gets a last whole-document review~~ — the owner, 2026-10-14: yes, and it is the last; what it finds
  rides the build as lines under the step it touches.

## Changes

- 2026-10-14 · ADDED · shaped from #440, after the owner answered its five open questions (D-045) · PR for #440
- 2026-10-14 · MODIFIED · 0.2: the twelve findings of `docs/reviews/2026-10-14-owed-decisions-0.1.md` resolved. The
  owner's: a third outcome and what closed means, `provisional until` reopens (AR-5); the line is `Amends:` (AR-12).
  Advised by the orchestrator session and taken: a position in a code span or fence is not counted, an italic heading
  clause is (AR-1); the build order leaves no window and no rule kept by memory, five PRs (AR-9); `/work-ticket` asks
  before a condition line is touched (AR-10); the status line names where a change belongs and lets the Version move
  (AR-2, reversing its earlier advice). The author's: who acts and the product question first, `/clarify` writes the
  form (AR-3); a readable condition defined, the prose pattern skips code spans and quotes, the count restated at
  aa78024 (AR-4); D-036's prose left as written (AR-6); readable issue conditions counted in the sync note and the
  retro (AR-7); P1 takes its root as an argument (AR-8); #447 in Order and overlap (AR-11); five shapes, no log-bug
  line, one body end, an empty record, two heading readers named (AR-12) · PR for #440
- 2026-10-14 · MODIFIED · 0.3: the eight findings of `docs/reviews/2026-10-14-owed-decisions-0.2.md`. In the spec:
  a heading clause clears by removing it from the suffix, with `/clarify`'s exit to prose (AR-1); `is reviewed` means
  a current review, R1's test (AR-2, the orchestrator session's advice taken); the Acceptance and `/log-feature`'s
  sentence say where a change belongs (AR-3); a code span is defined once, across line breaks, for both readers, the
  count restated at 6e8da74 (AR-4); the issue event is unreadable until step 5 and the Unreadable line says what reads
  it (AR-5, the same advice). In place: the step references, `package.json` in steps 1 and 5, §10's D-045 line (AR-6);
  re-verified against 9d2ef31 with #442 merged (AR-7); labels in a fence are prose, the reopens line gives the owner
  the question and an agent the syntax (AR-8). The owner, 2026-10-14: the review of 0.3 is the last whole-document
  review · PR for #440
- 2026-10-14 · MODIFIED · Version stays 0.3: the seven findings of `docs/reviews/2026-10-14-owed-decisions-0.3.md`
  placed as lines under the Build map step each names, with no change to Contract, Acceptance or Verify. AR-1, AR-2
  and AR-3 change a guarantee and are carried with the owner's yes (2026-10-14) as the Contract correction step 5 writes
  at 0.4 (`is reviewed` gated by an owed `Amends:`; `is active` on a killed milestone; a re-read that leaves the
  decision open). AR-4 to AR-7 are reader, fixture, wiring and printing corrections. The review's Tracker cells name
  where each went · PR for #440
- 2026-10-15 · MODIFIED · 0.4: the Contract correction, from every line the Build map marked for it, each built and
  merged before it was written. §1 and §3: a re-read that leaves a decision open (AR-3); `is reviewed` does not fire
  while the same decision's `Amends:` is owed, and "already covers it" is for a doc that names the decision (AR-1);
  `is active` fires on a killed milestone (AR-2); a typo makes a condition louder, never silent; a labelled line in a
  fence under a decision is unreadable; the folders the reader cannot read and the stray condition lines are named
  (#466, the owner, 2026-10-14); DC1 skips closed and killed milestones and says to quote an item with no F-id (the
  owner, 2026-10-15). §7: a fresh project's count is 1, D-003 (step 3's review). §8: the issue event is readable and
  P1 reads it at the pull request; `/work-ticket` also asks before a condition line is added to a decided entry (the
  owner's yes, 2026-10-15). Known limitations gain the stray heading, the 500-character cut and the repository
  comparison · PR for #440 step 5
- 2026-10-15 · MODIFIED · the wording of the status lines in §6 follows `process/writing.md` (F-16): who acts first, then the action, each id after its meaning in brackets, and the last two sentences say what it blocks and what it waits on. The forms quoted in §6 are the earlier wording; what each line says is unchanged · #456
