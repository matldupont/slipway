---
prd-ref: D-045
status: draft
---

# F-15 — Owed decisions: a decision that still owes something stays in `pnpm status` until it is done

Version: 0.1 (2026-10-14)

The line above is the one a `/review-doc` review quotes. Any edit inside the Contract, Acceptance or Verify
below moves it, in the same commit, bar the sha and date of a `Verified against:` line; a single acceptance block the owner
confirmed (`/log-bug`) is the one change that leaves it.

## Problem

`pnpm status` lists the decisions that are still open and nothing else about `decisions.md`
(`ci/status.mjs:107`–`108` read only headings whose suffix starts `open`; `:341` prints them as "Open decision").
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
- `readMilestones()`, `contents()` and `citedFeatures()` in `ci/checks/lib/milestones.mjs`: milestone ids and
  statuses, Contents items and the F-ids each cites (F1, MS1, status).
- `reviewProvenance()` and `readPlain()` in `ci/checks/lib/review-header.mjs`: which document a review names, as R1
  and the Fit count read it.
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
next decision heading. A label is exactly `Changes:`, `Reopens when:` or `Closes when:`, written at column 0 with no
list mark and no emphasis (as Fit's labels, F-12 §2); a lookalike (`- Reopens when:`, `**Changes:**`) is prose. The
text after the colon, with backticks and a closing full stop removed and whitespace squashed, is what is read.

```markdown
## PD-7 — Deposits are refunded within 14 days *(decided 2026-03-01)*

Changes: F-07
Reopens when: F-07 is reviewed
Closes when: M2 is closed
```

- **`Changes: F-07`** (several: `F-07, F-09` or `F-07 and F-09`): the features this decision adds to, amends or
  constrains. Each is **owed** until something for that feature names the decision (§4). Any token that is not an
  `F-<n>` makes the line unreadable (§6).
- **`Reopens when: <event>`** and **`Closes when: <event>`**: one condition per line, as many lines as needed.
  `<event>` is one of §3's forms, or several joined by ` or ` (any one fires). A text that is not an event is
  **unreadable**: counted, never fired.
- **The outcome.** When a condition has fired, the owner replaces its line with `Reopened YYYY-MM-DD: <what was
  decided, or the decision that supersedes>` or `Closed YYYY-MM-DD: <outcome>`. Those lines are read as nothing,
  so status stops. Removing the line also clears it: a diff a reviewer sees. A `Changes:` line clears itself the
  moment the feature's doc or Contents line names the decision; nothing is edited.
- **Heading clauses are read, never written.** In the heading's status suffix, each clause after the first,
  separated by ` · `, that begins `reopens when`, `reopens if`, `closes when`, `closes if` or `provisional until`
  (case folded) is a condition, read exactly as a labelled line: `*(decided 2026-03-01 · reopens when M2 is
  activated)*` is `Reopens when: M2 is activated`; `provisional until <text>` is `Closes when: <text>`, which is
  unreadable unless `<text>` is an event. The first clause is the status, as status reads it today (`open…` lists
  the decision as open; nothing else about it changes). The skills write labelled lines from now on (§9); a heading
  clause that has fired or cannot be read is cleared by writing it as a line, with its outcome.
- **Ids compare by number** with their prefix: `D-44` and `D-044` are one decision, `F-7` and `F-07` one feature,
  as ID1 and F1 compare them. Slipway's `D-` and a project's `PD-` are read alike (the owner, Q4).

### 2. The reader — `ci/checks/lib/decisions.mjs`

One zero-dependency module, no `process.exit`, reading `decisions.md` at the root it is given once. It returns the
record as data, and every reader below (DC1, status, P1, sync, `/close-milestone`) calls it:

- **Entries.** Each heading `visible()` and `LEAD` find with an id `(P?D)-(\d+)` (ID1's reading: nothing is
  skipped, a heading-shaped line in a fence counts, look-alikes are normalised), with its line number, the status
  suffix `*(…)*` split on ` · ` into clauses, and its body: the lines up to the next such heading.
- **Conditions.** From the heading's clauses (rule above) and from the body's labelled lines: `{ kind: reopens |
  closes | changes, where: heading | line, line, text, events | features, readable }`. Outcome lines (`Reopened
  YYYY-MM-DD:`, `Closed YYYY-MM-DD:`) are not conditions.
- **Events** (§3), parsed from each ` or `-separated part of a condition's text; a part that is not an event makes
  the condition unreadable as a whole.
- **What is owed, fired and unreadable** against the tree: `owed()` (the `Changes:` features nothing names, §4),
  `fired(today)` (the conditions whose event has happened, §3), `unreadable()`.
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
| `F-<n> is reviewed` | a file in `docs/reviews/` other than `TEMPLATE.md` names such a doc on its `Reviewed:` line; any review, current or not (F-12 §2, rule 3) | `reviewProvenance()` |
| `F-<n> is shipped` | that doc's frontmatter `status:`, lower-cased, is `shipped` | `frontmatter()` |
| `M<n> is active` (`is activated`, `goes active`) | a milestone whose `id:` is `M<n>` (case folded) has `status: active` or `closed` (closed came through active) | `readMilestones()` |
| `M<n> is closed` (`closes`) | that milestone's status is `closed` or `killed`; the status line says which | `readMilestones()` |
| `<yyyy-mm-dd> passes` (`has passed`) | today, as status reads it in the project's Timezone, is after that calendar day; an invalid day is unreadable | `today()` |
| `#<n> closes` (`lands`, `is closed`; also `owner/repo#<n>`) | never in status: read at the pull request whose body closes `#<n>` (§8) | P1 |

Anything else is unreadable. A fired date stays fired until the outcome line replaces the condition. A condition
with several events fires on any one; the status line names the ones that fired.

### 4. The owed citation

A `Changes: F-<n>` line is owed until the decision's id appears as a whole word (its prefix and number; `D-44`
matches `D-044`, never `D-4` or `D-440`) in one of:

- the `visible()` text of any feature doc carrying the heading `F-<n>` (frontmatter included; a companion doc
  included), anywhere in the file: the Problem or Changes section is where a citation lands without moving the
  doc's `Version:` (D-041), and the status line says so;
- the text of a Contents item citing `F-<n>` (`citedFeatures()`) in any milestone whose status is not `killed`.

A feature with no doc and no Contents line yet is owed, and the line says so (§6). Nothing is edited by any reader.

### 5. Position is refused — DC1, `ci/checks/meta/dc1-decisions.mjs`

A new check, beside ID1 in `pnpm meta`; ID1 stays about ids. It reads `decisions.md` through §2 and the milestones
through `readMilestones()`.

| id | result | when |
|---|---|---|
| `decision/position/<id>` | exit 1 | an entry's heading or body matches `M<n>('s)? (Contents )?item <k>` or `item <k> of M<n>` (the `M` upper case, digits bounded). One finding per entry, naming the first match's line |
| `decision/unreadable/<id>` | warning, never red | an entry has a condition or `Changes:` line that cannot be read (§1, §3). The same entries status groups (§6) |
| broken | exit 2 | no `decisions.md`, or one that is not a regular file: a project is seeded with it, and a check that cannot see passes nothing (decision-defaults §4) |

The position finding, in the project's words: "PD-3 names M2 item 4 (line 212). Items move when a milestone is
reshaped: name the feature instead. M2 item 4 builds F-07 today (`docs/milestones/M2-booking.md`): write
`Changes: F-07` under PD-3". With no such milestone, or no such item, or an item citing no F-id: "… no M2 item 4 to
read a feature from: write `Changes: F-<n>` for the feature the item builds". Fail, not warn (the owner, Q2).

**Known-bad fixtures** `ci/fixtures/known-bad/dc1/`, each with `expected.json`:

| case | holds | expects |
|---|---|---|
| `position` | an invented `PD-3` with "M2 item 4" in its heading clause and its body; `docs/milestones/M2-booking.md` whose item 4 cites F-07 | exit 1, `decisions.md#decision/position/PD-3`, detail naming F-07; warning `decision/unreadable/PD-3` for the heading clause |
| `position-no-item` | the same body, no milestone file | exit 1, the finding, detail saying no item to read from |
| `no-record` | no `decisions.md` | exit 2, broken, message starting "decisions.md does not exist" |

Green cases in `scripts/decisions.test.mjs`, through the command: labelled lines all readable; the three outcome
forms; heading clauses in each accepted spelling; a lookalike label; `item 4` with no milestone id; an id inside a
code span; a position inside a fenced block (counted: nothing is skipped, as ID1); invisible characters before a label;
a line over 500 characters; `D-44` against `D-044`, `D-4` and `D-440`; the prose pattern's hits and misses (§7);
`decisions.md` with no entries (green, 0 scanned is the file itself). PC1 picks the fixture folder up by its name.

**Wiring.** `pnpm meta` in `package.json` runs `node ci/checks/meta/dc1-decisions.mjs .` after ID1 and
`node scripts/decisions.test.mjs`. `.github/workflows/ci.yml` runs `pnpm meta` already.

### 6. What status prints — `ci/status.mjs`

Under Needs attention, after the `Open decision:` lines and before `Open question:`, from the same reader. Every
line carries three facts a reader of the whole list needs (the orchestrator session's advice, for #445, which builds
the parallel plan from them): **who acts**, in a leading parenthesis as the Also unblocked lines write it (`(you)`,
`(you or an agent)`); **what it blocks**, after a dash at the end; and **what it waits on**, when anything.

- **Owed citation**, one line per decision and feature:
  `(you or an agent) Owed citation: D-44 changes F-06 and nothing for F-06 names D-44 — write D-44 into
  dev/features/next-slice.md (its Problem or Changes section, so its Version does not move) or onto the Contents
  line that builds F-06 — before F-06 is reviewed or built; waits on nothing`.
  Several docs carry the id: each path, comma-separated. None: `… — no feature doc carries F-06 yet; name D-44 in it
  when it is written, or on the Contents line that builds F-06 — before F-06 is shaped; waits on its doc`.
- **A fired condition**, one line per condition line that fired:
  `(you) Decision reopens: D-17 — F-02 is shipped: re-read D-17 and replace its condition with "Reopened 2026-11-02:
  <what was decided>", or record the decision that supersedes it — before anything new is built on D-17; waits on
  nothing` and
  `(you) Decision closes: PD-3 — M2 is closed: close PD-3 and replace its condition with "Closed 2026-11-02:
  <outcome>" — blocks nothing; waits on nothing`.
  The event is printed in the table's words with its ids (`M2 is killed` when that is what happened); the date is
  status's own `today`. A heading clause that fired reads the same, and the instruction says to write the outcome as
  a line under the heading.
- **Unreadable**, one grouped line for all:
  `(you) Unreadable condition: 3 decisions have a condition or Changes line status cannot read: PD-3, PD-7, PD-9 —
  write each as Reopens when:, Closes when: or Changes: naming an event status can see (a feature doc exists, is
  reviewed or is shipped; a milestone is active or closed; a date passes; an issue closes) or a feature (F-<n>) —
  blocks nothing: nothing reads these until they are rewritten; waits on nothing`. Ids in file order, at most 20,
  then `and N more`.

What is printed: decision ids (only when they match `^P?D-\d{1,9}$`), `F-` and `M` ids as read, event words from §3's
table, file paths from the tree, the date. Never a decision's title, a condition's text or a line of the record: the
record is a file a pull request carries, and these lines reach every session through the hook (the F-09 rule for
`Owed:` lines, `ci/status.mjs:219`–`223`). An `#<n>` event is readable and prints nothing here.

**Status fixtures** `ci/fixtures/status/`, each with its `expect.json` `attention` list (S1 compares it whole), and
each the smallest copy of an existing fixture root plus a `decisions.md`:

| case | holds | attention |
|---|---|---|
| `decisions-owed` | `Changes: F-06` with no doc naming it; `Changes: F-07` whose doc names the id in its Changes section; `Changes: F-08` with no doc at all and a Contents line that cites F-08 and names the id | two Owed citation lines (F-06 with the path; F-08's line is absent: the Contents line names it); nothing for F-07 |
| `decisions-owed-no-doc` | `Changes: F-09`, no doc, no Contents line | the "no feature doc carries F-09 yet" line |
| `decisions-fired-doc` | `Reopens when: F-07 has a doc`; a doc with `# F-07` | one Decision reopens line |
| `decisions-fired-reviewed` | `Reopens when: F-07 is reviewed`; a review naming it | one line |
| `decisions-fired-shipped` | `Closes when: F-07 is shipped`; `status: shipped` | one Decision closes line |
| `decisions-fired-milestone` | `Reopens when: M2 is active` (M2 active), `Closes when: M3 is closed` (M3 killed), `Reopens when: M4 is active` (M4 shaping) | two lines, the second saying `M3 is killed`; nothing for M4 |
| `decisions-fired-date` | `Reopens when: 2026-03-09 passes` and `Reopens when: 2026-03-10 passes`, today 2026-03-10 | one line, for the 9th |
| `decisions-issue-event` | `Closes when: #12 lands` | nothing |
| `decisions-heading-clauses` | `*(decided … · reopens when M2 is activated)*` with M2 active; `*(decided … · provisional until the supplier confirms in writing)*`; `*(decided … · closes when #12 lands)*` | one Decision reopens line; one Unreadable line naming the second decision only |
| `decisions-unreadable` | `Reopens when: the page shows live state`, `Changes: the roadmap`, `Changes: F-07 or later`, and one readable entry | one grouped line with the three ids, in file order |
| `decisions-outcome` | `Reopened 2026-03-01: …`, `Closed 2026-03-02: …`, a lookalike `- Reopens when: F-07 has a doc` (F-07 has a doc) | nothing from this feature |
| `decisions-control` | readable lines, nothing owed or fired, an `open` decision | the Open decision line only |

Where the `attention` list of an existing fixture already pins other lines, these cases carry theirs in the same
order status prints them.

### 7. A project's first run

- **Heading clauses count from the first run** (the owner, Q5): what a project already wrote in its headings is
  precise, so each clause status cannot read is in the grouped line, and each that fires is a line, from the first
  `pnpm status` after the sync. The dogfood chain: an invented `PD-3` with "M2 item 4" in its heading clause and body
  comes up on the first run as one id in the Unreadable line (status) and one position finding (DC1); once the owner
  rewrites it as `Changes: F-07` and a readable condition, the Owed citation line takes over until F-07's doc names
  PD-3. Verify names this chain as one case.
- **Body prose is counted once, never listed in status.** The prose pattern, applied to an entry's body lines that are
  not labelled or outcome lines, for an entry with no readable condition:
  `\b(revisit(ed)?|reopen(s|ed)?)( it| this| them)? (when|if|once|after)\b`, `\bcloses? (when|if|once)\b`,
  `\bprovisional until\b`, case folded. On slipway's own record at 8e8ad79 it counts 3 (D-003, D-015, D-017) and
  misses D-036's "What reopens it" and D-037 on purpose: a wider pattern counts D-002's "moving platform reopens
  intake", which is a consequence, not a condition, in every project's seeded record.
  - `sync --plan` and `--apply` print one note, not a row and never red: "3 decisions say when they reopen or close
    in prose only (D-003, D-015, D-017); nothing reads a condition until it is a `Reopens when:` or `Closes when:`
    line". Nothing is stored; the count is recomputed each sync. `/sync-slipway` relays notes already.
  - `/close-milestone` §3 (the retro) gains one bullet, from the same count: the decisions still in prose, by id.
  - `scripts/new-project.mjs` writes nothing new: a fresh project's count is 0 (D-001–D-014 match nothing).
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
condition with `Closed <date>: <outcome>`, or change the condition". The record is `decisions.md` at the root P1 runs
from (CI: the checkout at the pull request's head, so a body that writes the outcome in the same pull request passes).
A body's sidecar `<name>.changes.json` gains an optional `decisions` key naming a file in the case folder that is the
record for that body; a file a sidecar names is not read as a body. Known-bad case `ci/fixtures/known-bad/p1/`:
`closes-awaited.md` with its sidecar and record (exit 1, the finding); its control, the same body with the outcome
written, in `scripts/p1.test.mjs` (new; P1 has no test file today).

`/work-ticket`'s ready step runs the same read before marking the pull request ready, and names the decision; the
skill is at 300 lines against the cap of 300 (`scripts/skills.test.mjs:29`), so room is made by rewording, no rule
dropped. An issue closed by hand, with no pull request, is never seen (Known limitations).

### 9. The skills and the rules, written once

Owner-only files, each edit asked for when it is made, and named in that PR under `## Gate changes`. The owner's yes
to #440's direction covers this doc naming them.

- **`process/slipway-rules.md`** → Planning flow, the "Record decisions" bullet gains: a decision that changes a
  feature says so on a `Changes: F-<n>` line, and that feature's doc or Contents line names the decision; what
  reopens or closes it is a `Reopens when:` or `Closes when:` line naming an event status can see, never an item's
  position. **`process/intake.md`** → Decisions says the same in one sentence, and that `/log-feature` writes
  `Changes: F-<n>` on a decision the run records and cites each touched decision in the doc's Problem or Changes.
- **`/kickoff`** Phase 3 step 2: "defer with the event that reopens it" becomes "as a `Reopens when:` line in the
  form status reads, or in prose when no listed event fits, said so". **`/clarify`**: a parked question that becomes a
  decision writes the same lines. **`/close-milestone`**: an extension decision writes `Closes when: M<n> is closed`;
  §3 gains the prose-count bullet (§7). **`/log-feature`** Phase 3 lists the decisions a feature touches already;
  Phase 4's doc cites each in Problem or Changes (not inside Contract, so a later citation moves no `Version:`).
- **`decisions.md`'s header** (slipway's own; a project's copy is seeded) gains one sentence naming the three lines
  and the outcome form. **`scripts/skills.test.mjs`** pins each sentence above.

### 10. Slipway's own tree

In the PR that adds the status lines (Build map step 2), slipway's own decided entries that name a spec gain
`Changes:` lines: D-015 F-01, D-017 F-02, D-018 F-04, D-019 F-05, D-020 F-06, D-022 F-07, D-024 F-09, D-027 F-10,
D-036 F-12, D-037 F-13, D-042 F-14, D-044 F-04 and F-06, D-045 F-15. Each doc but F-04's and F-06's names its
decision already, so the first run lists D-044 twice: the honest debt D-044's prose records, cleared by one Changes
line in each doc. D-036's "What reopens it" becomes `Reopens when: #49 closes`, read at #49's pull request. D-003,
D-015 and D-017 keep their prose: no listed event fits ("CI time is a measured problem"), and the sync note counts
them, 3, as a project's would.

### Order and overlap

PR #442 (#385) rewrites `ci/status.mjs`'s step lines and adds a `steps` key to S1's `expect.json`: step 2 merges
after it lands and takes `main` as it is. Step 1 touches neither file. #441 (a milestone's actual hours) shares the
principle and no file. `package.json`'s `meta` line changes in most pull requests: each build PR merges `main` before
it is marked ready.

Verified against: 8e8ad79 2026-10-14 — `ci/status.mjs:107`–`108` and `:341` (open headings only; `today` from
`clock.mjs`; `Owed:` lines print no project text, `:219`–`233`), `decisions.md` (heading suffixes: `*(open — …)*`,
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
and a fixed sentence. Nothing here writes, reads the network or runs a command. A condition or `Changes:` line is
other people's text: one it cannot read is counted as unreadable, never passed as satisfied (decision-defaults §4).

## Known limitations

- The event list is closed. A condition on a fact outside the repository ("CI time is a measured problem", "the page
  shows live state") stays prose: counted at sync, never fired. Slipway's own record keeps three.
- The prose count is a pattern. It misses a condition written another way (D-036's "What reopens it") and would count
  a sentence that only uses the words; the pattern is kept narrow on purpose, so a project's seeded D-002 is not
  counted. The count is information, in a sync note and a retro line; nothing is red on it.
- A citation anywhere in the feature doc clears the owed line, "D-44 does not apply here" included: the test is that
  the doc's author saw the decision, not that they followed it. `/review-doc` reads both.
- A `Changes:` line for a feature with no doc stays listed until a doc or a Contents line names the decision; that is
  the point, and it can be a long time.
- `#<n> closes` is read only at a pull request whose body closes `#<n>` in this repository, by P1 and `/work-ticket`.
  An issue closed by hand, or by a pull request in another repository, is never seen; `/close-milestone` could read
  it through `gh` (Out of scope).
- A fired date fires forever until the outcome line replaces it; a wrong date is the author's.
- Deleting a condition line clears it with no outcome recorded. The deletion is a diff a reviewer sees (the owner,
  Q3).
- A heading clause is read in five spellings; one written another way ("revisit when") is not a clause, so it is
  prose and counted. `provisional until <a person's act>` is unreadable, by design.
- `M<n> is active` fires on a closed milestone too, and `M<n> is closed` on a killed one; the line says which.
- Lookalike labels (`- Reopens when:`, `**Changes:**`) are prose; the prose pattern counts a `reopens when` bullet.
- A project's `decisions.md` is seeded, so its header never gains the form on sync; the skills, the status lines and
  the sync note carry it.
- Status lists one Owed citation line per decision and feature and one line per fired condition, uncapped; a record
  that owes a great deal fills Needs attention, as many `Owed:` checks would. The unreadable ids are capped at 20.
- Ids compare by number and prefix, so `PD-7` and `D-7` are two decisions, as they are for ID1.

## Acceptance

```
Given a decisions.md entry with `Changes: F-06` and a feature doc carrying `# F-06` that nowhere names the decision
When  node ci/status.mjs <root>
Then  Needs attention has one line starting "(you or an agent) Owed citation:" naming the decision, F-06 and that
      doc's path, saying to write it in the Problem or Changes section, and ending with what it blocks and what it
      waits on; every line this feature prints starts with who acts and ends with those two facts

Given the same, and the doc names the decision's id (D-44 written as D-044) in its Changes section
Then  no Owed citation line

Given `Changes: F-08`, no doc, and a Contents item citing F-08 in a shaping milestone that names the decision
Then  no Owed citation line; given the milestone is killed, one line

Given `Changes: F-09`, no doc and no Contents line
Then  one Owed citation line saying no feature doc carries F-09 yet

Given each event of Contract §3 but the issue event, written as a `Reopens when:` or `Closes when:` line, with the
      tree in the state that fires it
Then  one "Decision reopens:" or "Decision closes:" line naming the decision and the event in the table's words,
      and the outcome form with status's date; one status fixture per event kind

Given the same events with the tree not in that state (M4 shaping; today the date itself; no review)
Then  nothing is printed for them

Given `Closes when: #12 lands`
Then  nothing is printed, and the decision is not in the Unreadable line

Given a heading `*(decided 2026-03-01 · reopens when M2 is activated)*` and M2 active
Then  one Decision reopens line, whose instruction says to write the outcome as a line under the heading

Given a heading `*(decided 2026-03-01 · provisional until the supplier confirms in writing)*`
Then  the decision's id is in the Unreadable line

Given three entries with an unreadable condition or Changes line and one readable entry
Then  exactly one line starting "(you) Unreadable condition: 3 decisions" with the three ids in file order and no other text
      of the record

Given `Reopened 2026-03-01: …`, `Closed 2026-03-02: …`, and `- Reopens when: F-07 has a doc` with F-07's doc present
Then  nothing is printed for them

Given every status fixture of Contract §6, and the fixtures that exist today
Then  node ci/checks/meta/s1-status.mjs ci/fixtures/status exits 0, and no existing expect.json changes

Given an entry whose heading or body says "M2 item 4", "item 4 of M2" or "M2's item 4", and M2's item 4 cites F-07
When  node ci/checks/meta/dc1-decisions.mjs <root>
Then  exit 1 with decisions.md#decision/position/<id>, the detail naming line, F-07 and `Changes: F-07`

Given the same and no M2, or M2 with no item 4, or item 4 citing no F-id
Then  exit 1, the detail saying there is no item to read a feature from

Given an entry with an unreadable condition and no position
Then  exit 0, with a decision/unreadable/<id> warning line

Given no decisions.md
Then  exit 2, the message starting "decisions.md does not exist"

Given ci/fixtures/known-bad/dc1/ with Contract §5's three cases
Then  node ci/checks/meta/pc1-positive-control.mjs is green and every other expected.json under ci/fixtures/ is unchanged

Given an invented PD-3 whose heading says `reopens when M2 item 4's feature doc is written` and whose body names
      "M2 item 4", in a project root where M2's item 4 cites F-07 and F-07 has a doc not naming PD-3
When  the first node ci/status.mjs and node ci/checks/meta/dc1-decisions.mjs after the sync
Then  status's Unreadable line names PD-3 and DC1 reports decision/position/PD-3 naming F-07; and once PD-3 reads
      `Changes: F-07` and `Reopens when: F-07 is reviewed`, status prints the Owed citation line for F-07 and DC1 is
      green; and once F-07's doc names PD-3 in its Changes, nothing is printed for PD-3

Given slipway's own decisions.md at the head of Build map step 2's PR
Then  node ci/status.mjs . lists Owed citation lines for D-044 (F-04 and F-06) and nothing else from this feature,
      D-036 carries `Reopens when: #49 closes`, and DC1 is green

Given a root whose decisions.md has 3 entries with a prose condition and no readable line, and 1 with a readable line
Then  the reader's prose count is 3, pnpm -s use-slipway sync --plan prints one note naming the 3 ids and no row for
      decisions.md, --apply prints the same note and writes nothing to decisions.md, and a fresh new-project's count is 0

Given a pull-request body whose prose says "Closes #12" and a record with `Closes when: #12 lands` and no outcome line
When  node ci/checks/meta/p1-pr-body.mjs <dir>
Then  exit 1 with <body>#decision/awaits-outcome:<id>; with the condition replaced by `Closed 2026-03-10: …`, exit 0;
      with the body saying `Part of #12`, exit 0

Given process/slipway-rules.md, process/intake.md, .claude/skills/{kickoff,clarify,close-milestone,log-feature,work-ticket}/SKILL.md
      and decisions.md's header
Then  each carries its sentence of Contract §9 or §8, scripts/skills.test.mjs pins them, and work-ticket and log-bug
      are ≤ 300 lines
```

## Verify

```
node scripts/decisions.test.mjs                             # the reader: headings, labels, clauses, events, owed, fired, unreadable, positions, prose count; DC1's green runs
node ci/checks/meta/dc1-decisions.mjs .                     # exit 0 on slipway's own record
node ci/checks/meta/pc1-positive-control.mjs               # green, the three dc1 cases and the p1 case listed
node ci/checks/meta/s1-status.mjs ci/fixtures/status       # green, the twelve decisions-* cases among the fixtures
node ci/status.mjs . | sed -n '/Needs attention/,$p'       # step 2: the D-044 Owed citation lines, nothing else new
node scripts/sync.test.mjs                                 # the note, its count, no row and no write for decisions.md
node scripts/new-project.test.mjs                          # a fresh project's count is 0
node scripts/p1.test.mjs                                   # decision/awaits-outcome, and its two green cases
node scripts/skills.test.mjs                               # the sentences pinned; work-ticket and log-bug ≤ 300
git diff --stat main -- 'ci/fixtures/**/expected.json' 'ci/fixtures/status/*/expect.json'   # only files under dc1/, p1/ and decisions-* added or extended
pnpm meta
```

The first-run chain (Acceptance, the invented PD-3) is run once in a scratch project made from the release before this
one and synced from step 2's branch, by the build session, and its three outputs are pasted in that PR's
`## Verification` (decision-defaults §9: a count or a pass, never a real project's record).

## Build map

Five PRs, all `Part of #440`; the last closes it. No sub-issues: #440 is the ticket (the owner, 2026-10-14). The
designation per step applies `process/designation.md`; every step has this Contract and its fixtures as the oracle.

1. **The reader and the check.** `ci/checks/lib/decisions.mjs`, `scripts/decisions.test.mjs`, DC1,
   `ci/fixtures/known-bad/dc1/**`, `package.json` `meta` — checks, ~M. Leaves #440 open. The reader parses a file a
   pull request carries and its output reaches every session: case 5, the trust line ·
   mode: `plan` · model: `Opus 5.5` · effort: `medium`.
2. **The status lines.** `ci/status.mjs` (after PR #442 lands), the twelve `ci/fixtures/status/decisions-*` cases,
   slipway's own `Changes:` and `Reopens when:` lines (§10), the first-run chain in a scratch project — status, ~M.
   Leaves #440 open. Case 5 (a line that steers every session) · mode: `plan` · model: `Opus 5.5` · effort: `medium`.
3. **The counts.** Sync's note (`scripts/sync.mjs`, `scripts/sync.test.mjs`), `new-project`'s test,
   `/close-milestone` §3's bullet — sync and skills, ~S. Leaves #440 open. Case 4 · mode: `regular` ·
   model: `Sonnet 5.5` · effort: `medium`.
4. **The issue event at the pull request.** P1's finding and sidecar key, `ci/fixtures/known-bad/p1/closes-awaited*`,
   `scripts/p1.test.mjs`, `/work-ticket`'s ready sentence within 300 lines — checks and a skill, ~S. Leaves #440 open.
   Case 4, a gate file · mode: `regular` · model: `Sonnet 5.5` · effort: `medium`.
5. **The rules and the skills.** `process/slipway-rules.md`, `process/intake.md`, `/kickoff`, `/clarify`,
   `/close-milestone`, `/log-feature`, `decisions.md`'s header, `scripts/skills.test.mjs` pins — rules and skills, ~S.
   Closes #440. Case 3 · mode: `regular` · model: `Sonnet 5.5` · effort: `medium`.

Machinery before surface: the reader (1) before the lines that show it (2); the counts and the pull-request reader
(3, 4) before the rules that tell people to write the form (5). No release is tagged between 1 and 2: a project synced
in between would have a check and no status line.

## Out of scope

- Reading an issue's state through `gh` in `/close-milestone` for `#<n> closes` conditions: status and `pnpm meta`
  read no network (D-022); a later slice, when a project has such a condition that no pull request closed.
- A word search over decision bodies in status (rejected above): the sync note is the one reader of prose.
- Events outside the repository (a metric, a date a person confirms): the list is closed; prose, counted.
- Recording a milestone's actual hours against its estimate: #441.
- A milestone's own references to its items (kill criteria, notes): they move with the file (#440's own line).
- Renumbering or a registry of decision ids: ID1's own out-of-scope line.
- A check that requires `Changes:` on every decided decision: a decision that changes nothing writes nothing; the
  rule in §9 is prose, and `/review-doc` reads the record beside the doc.

## Open questions

- ~~Where the readable condition lives~~ — the owner, 2026-10-14: a labelled line of its own; conditions already
  written in a heading's suffix are read too (Contract §1, §3). Advised by the orchestrator session and taken: the
  issue event is kept and read at the pull request that closes the issue, never by status (§8).
- ~~Fail or warn for a decision naming an item by position~~ — the owner, 2026-10-14: fail (§5).
- ~~What clears a fired condition~~ — the owner, 2026-10-14: the line is replaced by its dated outcome, or removed
  as a visible diff; a `Changes:` line clears itself once cited (§1).
- ~~How slipway's `D-` and a project's `PD-` differ~~ — the owner, 2026-10-14: they do not; in slipway's own tree the
  citation can only live in `dev/features/` (§1, §10).
- ~~What a project's first run does with decisions already recorded~~ — the owner, 2026-10-14: heading clauses are
  listed and fired from the first run; body prose is counted once at sync and in the retro, never searched in
  status (§7).

## Changes

- 2026-10-14 · ADDED · shaped from #440, after the owner answered its five open questions (D-045) · PR for #440
