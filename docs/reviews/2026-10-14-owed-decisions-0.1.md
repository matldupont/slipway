# Adversarial review — F-15 owed decisions 0.1

Reviewed: dev/features/owed-decisions.md @ 2acb6f7
Version line: Version: 0.1 (2026-10-14)
Review date: 2026-10-14
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

2acb6f7 is the head of `docs/feature-owed-decisions`, the branch that shaped F-15 from #440 and recorded D-045. This
session did not write or edit the document, and no earlier review names its path, so nothing is superseded. The
review is committed on that branch at the owner's instruction.

F-15 has one ID and ten numbered Contract sections, so each finding is located by `F-15 §n` and the line range at
2acb6f7.

**What was read.** In full: the target; `decisions.md` D-045 (and the diff that adds it), D-002, D-003, D-015,
D-016, D-017, D-036 (its "What reopens it" part), D-044; `docs/reviews/TEMPLATE.md`; the 0.3 review of F-12 for its
form. In part, to check a named claim: `ci/status.mjs` (lines 95–115, 210–235, 300–350), `ci/checks/lib/feature-docs.mjs`
(exports, `visible()`, `LEAD`), `ci/checks/lib/milestones.mjs`, `ci/checks/lib/review-header.mjs`,
`ci/checks/lib/frontmatter.mjs`, `ci/checks/lib/clock.mjs` and `ci/checks/lib/report.mjs` (their exports),
`ci/checks/meta/p1-pr-body.mjs` (lines 225–260), `ci/checks/meta/s1-status.mjs` (its header and clock),
`.github/workflows/pr-body.yml`, `package.json`'s `meta`, `scripts/skills.test.mjs:25`–`32`, `process/intake.md` →
Feature doc version, `process/decision-defaults.md` (its headings), the frontmatter and `F-` heading of every file in
`dev/features/`, every `decisions.md` under `ci/fixtures/`, the file lists of open pull requests #442, #443 and #447,
and the state of #49 and #440. `docs/product/FRAME.md` in slipway's own tree is the unfilled template, so FRAME's
question cannot be checked against; the job is checked against the owner's principle the doc quotes (#440) and D-016.

**Verified, and how.** Every `ci/checks/lib` export the Fit names exists (`grep -n '^export'`). `ci/status.mjs:107`–`108`
reads only `open…` headings and the attention list prints `Open decision:` lines (now at `:341`). `wc -l` gives 300
for both `work-ticket/SKILL.md` and `log-bug/SKILL.md`; `MAX_LINES = 300` at `skills.test.mjs:29`. Every
`prd-ref:` in `dev/features/` matches §10's mapping (F-01 D-015 … F-15 D-045), and neither `intake-skills.md` (F-04)
nor `next-slice.md` (F-06) contains `D-044` or `D-44`. No status fixture's `decisions.md` has a heading clause, a
labelled line or a position. The position regex and the prose pattern of §5 and §7 were run as written over
`decisions.md` at 2acb6f7 and at 8e8ad79; the results are quoted in AR-1 and AR-4. P1 runs in `pr-body.yml` on
`pull_request`, so the checkout is the merge ref, with the body written to a temporary folder.

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
| AR-1 | D-045 itself names "M2 item 4": DC1 is red on slipway's own record from build step 1 | S1 | owner | step 1 | |
| AR-2 | The owed line steers a decision that changes a feature to a mention that moves no `Version:`, against intake for shipped docs | S1 | owner | step 2 | |
| AR-3 | Status and DC1 tell the owner to write slipway's parsed format, against D-016 | S1 | owner | steps 1, 2 | |
| AR-4 | The prose count is not 3 on slipway's own record under either reading of "readable condition" | S2 | owner | steps 2, 3 | |
| AR-5 | "Close a decision" is undefined, and a condition that fires but leaves the decision standing has no outcome form | S2 | owner | step 2 | |
| AR-6 | §10's rewrite of D-036 to `Reopens when: #49 closes` changes what D-036 says | S2 | owner | step 2 | |
| AR-7 | An issue event that no in-repo pull request closes is silent forever, against the principle the feature exists for | S2 | owner | step 4 | |
| AR-8 | P1 reads `decisions.md` from its working directory, coupling every P1 fixture and test to slipway's live record | S2 | owner | step 4 | |
| AR-9 | "No release is tagged between 1 and 2" is a rule kept by memory | S2 | owner | steps 1, 2 | |
| AR-10 | The P1 gate is passed most cheaply by deleting the condition | S2 | owner | step 4 | |
| AR-11 | Order and overlap misses #447, which edits four files steps 3 and 5 edit | S3 | owner | steps 3, 5 | |
| AR-12 | Small contradictions: shape count, log-bug in Acceptance, two heading readers, a body that runs past `## Week 1`, a missing `decisions.md` in status | S3 | owner | — | |

## Findings

### AR-1 — D-045 itself names "M2 item 4": DC1 is red on slipway's own record from build step 1

**Where:** F-15 §5 (lines 185–216), Verify line 502, Acceptance lines 479–481, Build map step 1 (lines 523–526); D-045.

§5 fails an entry whose "heading or body matches `M<n>('s)? (Contents )?item <k>`", and the green cases count "a
position inside a fenced block (counted: nothing is skipped, as ID1)"; nothing exempts a code span. D-045, the
decision that records this rule, says at `decisions.md:1064` at 2acb6f7:

> - **A position (`M2 item 4`) fails `pnpm meta`,** on four exact shapes, …

The regex run over `decisions.md` at 2acb6f7 matches that line and no other. So Verify's
`node ci/checks/meta/dc1-decisions.mjs . # exit 0 on slipway's own record` cannot pass, and step 1, which wires DC1
into `pnpm meta`, merges red. The build session will be pushed to one of two moves neither of which is theirs:
reword a decided entry, or teach DC1 to skip code spans (a weaker check, decided by the person who needs it green).
The same trap waits in every project whose record explains the rule to its own readers.

**Proposed resolution.** Decide it in the spec, outside the build: either DC1 skips code spans (and §5's green case
"an id inside a code span" becomes "a position inside a code span is not counted", which the fenced-block rule must
then match or explain), or D-045 is reworded in this branch before step 1 (`an item named by its number in a
milestone`). Add slipway's record at step 1's head to Verify as an explicit case, not only "exit 0".

### AR-2 — The owed line steers a decision that changes a feature to a mention that moves no `Version:`

**Where:** F-15 §4 (lines 173–183), §6 Owed citation (lines 225–230), §9 `/log-feature` (lines 330–331), Known
limitations line 391.

A `Changes: F-<n>` line means the decision "adds to, amends or constrains" the feature (§1). What it owes is a
feature that reflects it. §4 clears it when the id appears anywhere, and the status line recommends the place that
costs least:

> write D-44 into dev/features/next-slice.md (its Problem or Changes section, so its Version does not move)

Two problems. First, the instruction is wrong for a shipped doc: `process/intake.md` → Feature doc version says
"After `status: shipped`, a behaviour change recorded under Changes instead of in the Contract moves it too." F-03 is
shipped today. Second, for any doc, a decision that amends a feature amends its Contract; moving it into Problem or
Changes so no `Version:` moves is exactly how a change avoids the fresh review D-041 makes it owe. Known limitations
accepts that "the test is that the doc's author saw the decision", but the status line does not merely accept it, it
advises it, in every session's hook. The owner's principle (#440) is that nothing a decision leaves owed is left to
memory; this clears the line while leaving the actual debt (the Contract) to memory.

**Proposed resolution.** Drop "so its Version does not move" from the status line. Say instead: name the decision
where the doc records the change; when the decision changes what the feature does, that is its Contract, and the
`Version:` moves (D-041). Keep §4's "anywhere" test as the mechanical clear, and keep the Known limitation, but stop
recommending the route around review.

### AR-3 — Status and DC1 tell the owner to write slipway's parsed format, against D-016

**Where:** F-15 §5 finding text (lines 196–199), §6 Unreadable line (lines 240–245), §6 "who acts" (lines 221–224).

D-016: slipway's machinery, including "`PL-`/`PD-` numbering, check ids and the formats checks parse … an engineer
must never have to learn it to use slipway." F-15 adds a parsed format (three labels, a closed event grammar with
accepted verbs, an outcome form) and addresses the owner directly in it:

> `(you) Unreadable condition: 3 decisions have a condition or Changes line status cannot read: PD-3, PD-7, PD-9 —
> write each as Reopens when:, Closes when: or Changes: naming an event status can see …`

DC1's finding likewise tells the reader to "write `Changes: F-07` under PD-3". The doc's own §9 says the skills
write these lines, which is the D-016-compatible shape; the status lines then contradict it by putting `(you)` in
front of a format edit. The product question underneath ("does this decision still hold once M2 starts?") is the
owner's; the syntax is not.

**Proposed resolution.** Mark the Unreadable line and the Decision closes line `(you or an agent)` or `(agent)`, and
phrase the owner's part as the product question (what event should bring this back), with the agent writing the
line. Name which skill does the rewrite (`/clarify` is the natural reader of "things the owner must answer"). DC1's
finding is read by agents in `pnpm meta`, so its wording may stay technical.

### AR-4 — The prose count is not 3 on slipway's own record under either reading

**Where:** F-15 §7 (lines 281–291), §10 (lines 337–343), Acceptance lines 483–485, Known limitations line 386–387.

§7 counts "an entry with no readable condition whose body matches the prose pattern", and says it "counts 3 (D-003,
D-015, D-017)" at 8e8ad79. That holds at 8e8ad79. It does not hold at the head this feature is built on, and §2 does
not say whether a `Changes:` line is a "readable condition" (§2 lists `changes` among the condition kinds; §1 and §7
speak of conditions as `Reopens when:`/`Closes when:`). Run as written at 2acb6f7:

- If `Changes:` is not a condition, D-045 is counted too: its body matches at lines 1051, 1055, 1056 and 1070
  (`a "reopens when" written in prose`, `` `Reopens when: <event>` and `Closes when:` `` mid-line, the heading-clause
  example, `"revisit when …"`). The count is 4.
- If `Changes:` is a condition, §10's own edit (D-015 gains `Changes: F-01`, D-017 gains `Changes: F-02`) removes
  both, and the count is 1 (D-003), not the "3, as a project's would" §10 promises.

A decision that quotes the rule it records is the common case for exactly this kind of decision, so this recurs.

**Proposed resolution.** Define in §2 which kinds make an entry "have a readable condition" (the natural reading:
`reopens` or `closes`, not `changes`), skip text inside code spans and quotation marks for the prose pattern as well
as for AR-1's, and restate §7's and §10's figure against step 2's head, with the ids.

### AR-5 — "Close a decision" is undefined, and a condition that fires but leaves the decision standing has no outcome

**Where:** F-15 §1 "The outcome" (lines 119–122), §1 `provisional until` (lines 123–127), §6 Decision closes (lines
235–236); D-045's fourth bullet.

The status line says "close PD-3 and replace its condition with "Closed 2026-11-02: <outcome>"". D-045 declined "a
new heading status", and `decisions.md` headings carry `decided`, `accepted` or `open…`; nothing says what a closed
decision is, what stops applying, or whether a later decision may contradict it without superseding. Separately,
the only outcome forms are `Reopened` and `Closed`. A `Reopens when:` condition fires on an event that only *might*
change the answer (D-036's is exactly that, AR-6); when the owner re-reads and the decision stands, neither form is
true, and "Reopened 2026-11-02: kept" records a reopening that did not happen. `provisional until <text>` mapped to
`Closes when: <text>` inverts the meaning: when the supplier confirms, a provisional decision becomes final, it does
not close.

**Proposed resolution.** Define "closed" in one sentence in §1 (the decision no longer constrains new work; its
heading suffix becomes `decided …, closed YYYY-MM-DD`, or say why no heading change). Add a third outcome,
`Reviewed YYYY-MM-DD: stands — <why>`, read as nothing like the other two. Map `provisional until` to
`Reopens when:` (the provisional state ends and is re-read), or leave it unreadable without a mapping.

### AR-6 — §10's rewrite of D-036 changes what D-036 says

**Where:** F-15 §10 (lines 341–342); D-036 "What reopens it, and who reads it" (`decisions.md:574` onward).

D-036 does not reopen when #49 closes. It says #49's first pass "reports two things" and "a drift Fit did not stop,
or short answers in most of the docs, brings the check and the sync count back to the owner." The reopening is
conditional on the result. `Reopens when: #49 closes` makes it unconditional, and with §8 the pull request that
closes #49 fails P1 until it writes `Reopened <date>: <what was decided>`, which would be false if the pass found
nothing. Rewriting the substance of a decided entry is also the owner's act, not a build step's.

**Proposed resolution.** Leave D-036's prose as it is and let the sync note count it (it is the case §7's narrow
pattern was designed to miss, so it stays visible in Known limitations), or, once AR-5's `Reviewed … stands` form
exists, write `Reopens when: #49 closes` with the prose kept beside it as the test the owner applies.

### AR-7 — An issue event no in-repo pull request closes is silent forever

**Where:** F-15 §3 (`#<n> closes` row, line 168), §8 (lines 295–315), Known limitations line 395–397, Out of scope
line 546–547.

A `#<n> closes` condition is readable, so it is never in the Unreadable line and never counted as prose; status
prints nothing for it, by design. It is read only at a pull request whose body closes `#<n>`. It is therefore never
read when: the issue is closed by hand; it was closed before the condition was written (the condition is born dead
and nothing says so); it is closed by a pull request that says `Fixes` in a form P1 does not read, or by a commit
message. The doc lists the first case. The effect is a condition that looks handled (readable, not counted) and can
never fire, which is the precise failure the feature exists to remove, and quieter than prose, which at least is
counted.

**Proposed resolution.** Count readable issue conditions in the same sync note and retro bullet ("N decisions wait
on an issue; status cannot see whether it closed"), so they surface without the network. Optionally have
`/close-milestone` list them by id for the owner to check by hand. Either keeps D-022.

### AR-8 — P1 reads `decisions.md` from its working directory

**Where:** F-15 §8 (lines 306–311).

> The record is `decisions.md` at the root P1 runs from

P1's argument today is a folder of bodies; its working directory is incidental. In
`scripts/gate-files.test.mjs`, `gate-files-named.test.mjs`, `sync.test.mjs` and PC1's run of
`ci/fixtures/known-bad/p1/`, it is slipway's repository, so every existing P1 body that closes an issue would be
checked against slipway's live `decisions.md` unless its sidecar names another record. Fixture bodies close small
numbers (`#12`); the day slipway records `Closes when: #12 lands`, an unrelated fixture's expected result changes.
That coupling is also invisible: no `expected.json` names the record it was computed against.

**Proposed resolution.** Pass the record explicitly: P1 takes the root as a second argument (CI passes `.`), and with
no root it reads no record and skips the finding. The sidecar `decisions` key then becomes the fixture's way to give
one, and the green control in `scripts/p1.test.mjs` names its record too.

### AR-9 — "No release is tagged between 1 and 2" is a rule kept by memory

**Where:** F-15 Build map, last paragraph (lines 540–542).

> No release is tagged between 1 and 2: a project synced in between would have a check and no status line.

This is a "remember before X" instruction, in the spec of a feature whose job statement is "nothing about the
decision is left to my memory". Nothing in status, a check or the release workflow sees it. The same window exists
between 2 and 5, where status tells projects to write a form no rule or skill yet describes.

**Proposed resolution.** Merge steps 1 and 2 into one release unit by making it surface: an `Owed:`-style line, an
issue checklist item on #440 that the release skill reads, or simply land steps 1 and 2 in one PR (the reader and
its two readers). If the order is kept, say what the release process reads to refuse a tag in between.

### AR-10 — The P1 gate is passed most cheaply by deleting the condition

**Where:** F-15 §8 detail text (lines 305–306), §1 "Removing the line also clears it" (lines 121–122), Known
limitations line 399–400.

The finding offers "replace PD-7's condition with `Closed <date>: <outcome>`, or change the condition". The owner
chose (Q3) that a deletion clears a condition as a visible diff. In a gate, that makes the fastest green an agent can
reach the removal of the decision's condition in the same PR that triggers it, which is the shape the rules forbid
("never weaken a gate to pass it"). `decisions.md` is not an owner-only file, so no harness prompt or `## Gate
changes` line makes the deletion visible to the owner specifically; the "visible diff" is visible to whoever reviews.

**Proposed resolution.** Keep Q3 for status, but have P1 (and `/work-ticket`'s ready step) treat a condition removed
in the same pull request that closes its issue as the finding still standing, or as a line the PR body must name
under a heading the owner reads. The cheap form: `/work-ticket` asks the owner before touching a condition, and says
so in §8.

### AR-11 — Order and overlap misses #447

**Where:** F-15 Order and overlap (lines 345–350), Build map steps 3 and 5.

Open pull request #447 (the readers of Fit, build step 3 of F-12) changes `.claude/skills/close-milestone/SKILL.md`,
`.claude/skills/log-feature/SKILL.md`, `decisions.md` and `scripts/skills.test.mjs`. Step 3 edits the first and
fourth, step 5 all four, and both depend on the skill line caps. The Verified line lists #442 and #443 only.

**Proposed resolution.** Add #447 to Order and overlap with the same rule as #442 (steps 3 and 5 merge after it and
take `main` as it is), and re-measure `close-milestone` and `log-feature` against the cap after it lands.

### AR-12 — Small contradictions

**Where:** as listed.

- **Shape count.** D-045 says "four exact shapes"; §5's regex expands to five (`M2 item 4`, `M2's item 4`,
  `M2 Contents item 4`, `M2's Contents item 4`, `item 4 of M2`); Acceptance line 456 tests three.
- **log-bug.** Acceptance line 494–495 and Verify line 509 hold `log-bug` to ≤ 300 lines; §9 edits no `log-bug`
  file. Either a log-bug edit is missing from §9 or the line is stray.
- **Two heading readers.** §1 says the first clause "is the status, as status reads it today", but status reads open
  decisions with `^##\s+(P?D-\d+)\s+—…` (`ci/status.mjs:108`) while §2 finds entries with `visible()` and `LEAD`.
  A `### PD-3 — … *(open)*` or a quoted heading is an entry to one and not the other.
- **A body runs past non-decision headings.** §2's body is "the lines up to the next such heading", so D-045's body
  at 2acb6f7 includes `## Week 1 — decide before M1 closes` and its paragraph, and the last entry's body runs to the
  end of the file. Positions and prose there are attributed to the wrong decision. End a body at any `##` heading.
- **No `decisions.md`.** DC1 is broken without one, and most status fixtures have none; §2 and §6 do not say the
  reader returns an empty record to status in that case, which S1's fixtures need.
- **Two meanings of "Changes".** A decision's `Changes:` line and a feature doc's `## Changes` section appear in the
  same instruction ("write D-44 into … its Problem or Changes section"); a reader will confuse them. Consider
  `Amends:` for the decision line.

**Proposed resolution.** Fix each in place; none needs a decision beyond AR-1's.
