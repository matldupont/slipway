# Adversarial review — F-17 parallel plan 0.5

Reviewed: dev/features/parallel-plan.md @ c4148c7f33d9d47446fab18772faab3bad1878bb
Version line: Version: 0.5 (2026-11-04)
Supersedes: docs/reviews/2026-10-23-parallel-plan-0.1.md
Supersedes: docs/reviews/2026-10-25-parallel-plan-0.2.md
Supersedes: docs/reviews/2026-10-26-parallel-plan-0.3.md
Supersedes: docs/reviews/2026-11-04-parallel-plan-0.4.md
Review date: 2026-11-04
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

c4148c7 is the head of `fix/i607-blocker-not-an-issue`. This session did not write or edit the document, and has no
context from its author. F-17 has one ID and numbered Contract sections, so each finding is located by `F-17 §n` and
the line range at c4148c7. All four earlier reviews of this path are superseded.

**Scope, set by the owner.** This is the last review round of #607's fix, and it verifies the fix only. It is not a
new review of the whole doc. For each finding of the 0.4 review (`docs/reviews/2026-11-04-parallel-plan-0.4.md`) it
asks two things: is it fixed as the 0.5 Changes line (903–908) says, and does the fix break anything? It then checks
that the fix's new rules hold together with F-07 0.3 (`dev/features/work-order.md`). The fix is `git diff 70d0703
c4148c7 -- dev/features/work-order.md dev/features/parallel-plan.md`. Anything found outside that diff is listed at
the end for a follow-up, never as a finding.

**What was read.** The 0.4 review in full, and the fix diff for both docs. At c4148c7, these parts of F-17: §1's form
and ranks (127–165), §2's table (172–199), §3's rules (235–256), §5 (308–445), §9 (503–571), §10 (573–594), the
Threat model, Known limitations, the Acceptance (695–740) and Changes. F-07 0.3 was read in full. For the claims
outside the doc, these were read: `ci/work-order.mjs:42`–`58` (`realGh()`) and `decisions.md` D-050 (1358–1413). #607
was read with `gh issue view`, as data. F2 prints no line for this doc, so its Fit is filled.

**What was asked of GitHub**, on 2026-11-04, with read-only `gh api graphql` queries on this repository:

- `issueOrPullRequest` for 99999 and for 0: each alias `null`, one `NOT_FOUND` error each, `path` `["repository",
  alias]`, exit 1;
- a merged pull request: `PullRequest`, `MERGED`;
- an open issue: `Issue`, `OPEN`, `stateReason` `null`;
- a repository that does not exist: `repository` `null`, one `NOT_FOUND` with `path` `["repository"]`, exit 1;
- `object(expression:)` for an unknown commit and for a missing path: `null`, no error, exit 0;
- `issue(number:)` asked of a pull request (#434): `null` with a `NOT_FOUND` on its alias.

So the new `Verified against:` line (310–314) holds for what it says was asked.

## Severity

| Level | Meaning |
|---|---|
| S0 | Can invalidate the business or the build. Resolve before writing code. |
| S1 | Loses money, breaks correctness, or breaches a stated principle. Fix in the spec before the affected phase. |
| S2 | A real defect or contradiction. Cheap now, expensive later. |
| S3 | Inconsistency or hygiene. Batch these. |

## The 0.4 review's findings, checked

| 0.4 finding | Fixed as the Changes line says? | Does the fix break anything? |
|---|---|---|
| AR-1 item issue blanks the read | Yes, by the owner's answer of 2026-11-04. A not-found item issue shows `#n not found`, is never offered, and adds one `item-not-found` line (338–341). The read goes on (332–336). The §9 bullet (536–537) and an Acceptance block (726–729) test it. | Yes: AR-1 and AR-2 below. AR-4 below is about its words. |
| AR-2 no field to decide by | Partly. The `path` is named and must name a `null` alias (334–336). But the 0.4 review proposed that the child decide, and the doc gives the job to `realGh()` (335). | AR-3 below. |
| AR-3 comparison run | Yes. The comparison is a run with "that number … an open issue", in §5 (387–388), §9 (532) and the Acceptance (714). | The same mistake is back in the new item-issue text: AR-1 below. |
| AR-4 finished leaves | Yes. "Only an open leaf gets a line" (388), and §9 has "a done leaf naming the same number gives no line" (533). | No. |
| AR-5 no cap | Yes, for each leaf. One line per leaf and kind, with `{list}` capped at three numbers (388–395), and a test with four numbers (533). Lines across many leaves are not grouped, and the Threat model's Bounded bullet (632–634) does not mention them. | No. |
| AR-6 rank, who, `When` | Yes. Who is `you`. The row says rank 5 means "never offered In parallel, always in Needs attention" (197). The block at 720–724 has a `When`. | No. |
| AR-7 no `Verified against:` | Yes. A line now says what was asked, in §5 (310–314), and `__typename` is read (381–382). | A deleted or moved issue is still stated as fact, and no step owns asking: AR-5 below. |

## The fix's new rules across the two docs

The owner's two answers of 2026-11-04 are written in F-17 as the brief states them:

- **A pull request closed unmerged holds.** It "stays held until the `Blocked by:` line is edited, never released by
  age" (384–386). Its line contains the owner's words: "`#{m} is held: PR #{n} closed unmerged; check the wait.`"
  (391–392). The Acceptance tests it at 720–724.
- **A not-found item issue never blanks the read.** It is "`#n not found`", with an `item-not-found` line (338–341).
  The kept-answer rule covers "an item-issue alias of call 1" (334).

F-07 0.3 agrees on these:

- `__typename` read;
- the kept answer named by `path` and a `null` alias;
- the three close reasons;
- closed unmerged holds;
- the open-issue comparison run for an unknown blocker;
- lines or findings on open leaves only;
- the unknown-blocker text's first two sentences, word for word;
- an item issue GitHub does not return reads `#n not found`.

They differ in the wording of the kept-answer rule (AR-3 below), and in the form of the closed-unmerged line (the F-07
0.3 review's AR-2).

## Register

| ID | Finding | Sev | Owner | Blocks | Tracker |
|---|---|---|---|---|---|
| AR-1 | "As it would if that issue were open with no sub-issues" offers the item this run never offers, so the baseline cannot hold | S2 | doc author | step 4 | |
| AR-2 | The doc says the owner amended D-050's all or nothing on 2026-11-04, and `decisions.md` does not say so | S2 | owner | step 4 | |
| AR-3 | One `realGh()`, two kept-answer rules: F-17 lists two alias kinds and gives the choice to `realGh()`, F-07 keeps any `null` alias | S3 | doc author | step 4 | |
| AR-4 | `item-not-found` has two texts, and the §5 text is false for a marker that names a pull request | S3 | doc author | | |
| AR-5 | "A deleted or moved issue" is still stated as fact, and no step owns asking GitHub about one | S3 | doc author | step 4 | |
| AR-6 | §10 says the ticket's Fit line is "met", then keeps it | S3 | doc author | | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — The item-issue baseline offers the item this run never offers

**Where:** F-17 §5, "A not-found item issue", lines 338–341. Compare §9's bullet (536–537), the Acceptance block
(726–729), §3's main step (226–230) and §3's rule 2 (238).

**Breaks:** none of the Acceptance. The §9 bullet and the Acceptance block say only "every other GitHub line is
printed". The §5 sentence breaks the rule in its own paragraph, "it is never offered". The 0.4 review's AR-3 removed
the same mistake for blocker numbers.

§5 says the item "is never offered, as Next or In parallel", and then: "Every other line reads as it would if that
issue were open with no sub-issues." In that comparison run, the item's issue is a leaf with status `open`. No body is
read, so it has no `Blocked by:` and unknown `Touches:`. Nothing else holds it, so it is ready. By §3, the first ready
leaf that overlaps no work in progress is the main step, and rule 2 says unknown files "can still be the main step".
So when nothing is in progress and this item comes first, the comparison run's Next is `Start #{n}`. The not-found
run's Next is a different line. Unknown files also overlap everything, so in that run In parallel offers no
file-writing leaf beside it. The two runs then differ in Next and In parallel, though "every other line" must match.

**Proposed resolution.** Compare with a run where that issue is open with no sub-issues and is held by one open
blocker issue. That run holds it the same way, so every line but the new one is the same. §9 and the Acceptance can
use the same baseline in place of "is printed", which can pass whatever the other lines say.

### AR-2 — The D-050 amendment the doc cites is not in `decisions.md`

**Where:** F-17 §5 "All or nothing", lines 332–333: "D-050's all or nothing, as the owner amended it on 2026-11-04,
excepts a not-found item issue and a not-found `Blocked by` number". `decisions.md` at c4148c7, D-050's "All or
nothing" bullet (1388–1389).

**Breaks:** `process/slipway-rules.md` → Planning flow: "Record decisions in `decisions.md` when they are made, not
afterwards."

D-050 still says, with no dated line beside it: "A failure or a timeout part-way shows none of what was read". It
names no exception. 0.4 wrote the `Blocked by` exception as #607's expected shape, with no claim about D-050. 0.5 says
D-050 itself was amended, and adds a second exception, the item issue. A reader who checks D-050 finds the rule that
0.5 says no longer holds. D-050 already carries `Amends: F-17, F-07`. What is missing is the amendment in its own
text.

**Proposed resolution.** Before step 4, the owner records the 2026-11-04 answer in `decisions.md`. One way is a dated
line under D-050's "All or nothing" bullet that names both exceptions and #607. The other is a new entry with
`Amends: F-17, F-07`, cited at 332–333 in place of "as the owner amended it". Which form is the owner's call.

### AR-3 — One `realGh()`, two kept-answer rules

**Where:** F-17 §5 "How" (326) and "All or nothing" (333–336): "naming an item-issue alias of call 1 or a `p{n}` alias
of call 2 … `realGh()` keeps only that answer". F-07 0.3, lines 160–162: "naming an alias the answer gives as
`null`". `ci/work-order.mjs:45`–`58`.

**Breaks:** none today. Every answer asked above gives the same result under either rule.

Both docs send their calls through work-order's one `realGh()`. F-07 keeps any `NOT_FOUND` whose `path` is
`["repository", alias]` and whose alias is `null`. F-17 keeps it only for two kinds of alias, and says `realGh()` is
what tells them apart. `realGh()` sees a command line and the answer. To know which alias is an item issue, it would
have to parse the query or be told. The 0.4 review's AR-2 proposed that the child decide. So a builder meets two
specs for one function, and either reading fails one doc's words.

Today the two agree in practice. F-17's call 3 asks `object(expression:)`, which answers `null` with no error for a
missing commit or path (asked above). And no other alias of call 1 has been seen to answer `NOT_FOUND`. The 0.4
review also proposed a test for `path` `["repository"]`. That is what GitHub gives for a renamed or deleted
repository. It is still not in §9: only "on an alias with data" is (534).

**Proposed resolution.** Give `realGh()` F-07's rule, as written. Say in §5 that the child then fails the read when a
kept `NOT_FOUND` names an alias that is neither an item issue nor a `p{n}`. Add one §9 case: a `NOT_FOUND` with `path`
`["repository"]` gives `GitHub answered with an error`.

### AR-4 — `item-not-found` has two texts

**Where:** F-17 §2 row, line 198: "Check item {k} of {id}: its issue #{n} is not found". §5, lines 339–340: "Check
item {k} of {id}: its issue #{n} is not in this repository, as GitHub reads it."

**Breaks:** none. The Acceptance asks only for a line "naming the item and #{n}" (728).

The §2 column is "the line today starts", so it should be the start of §5's line, and it is not. The §5 text is also
wrong in one common case. Call 1 asks for an item's number as `issue(number:)`. When the marker names a pull request,
GitHub answers `null` with a `NOT_FOUND` (asked above, #434). The pull request is in this repository, so "is not in
this repository" misleads the owner about what to fix.

**Proposed resolution.** Use one text in both places, for example: "Check item {k} of {id}: GitHub returns no issue
#{n}. Correct the item's marker in the milestone file." It is true for a typo, a deleted issue and a pull request
number.

### AR-5 — "A deleted or moved issue" is still a fact in the Contract

**Where:** F-17 §5 call 2, lines 386–387 ("a typo, a deleted or moved issue"), and the `Verified against:` line,
310–314 ("were not asked: they are expected to answer as a typo does"). F-07 0.3, lines 187–188 and 102–103. The 0.4
review's AR-7.

**Breaks:** none. The `Verified against:` line is honest about what was asked. The Contract's sentence is not.

The fix records that a deleted or moved issue was not asked. But the rule's own sentence still says, as fact, that
one answers `null` with a `NOT_FOUND`. In status that matters more than on the page. If a transferred issue answers
another way, for example with a `path` of a different shape, a single `Blocked by:` line that names one blanks
GitHub for every session. That is #607's failure. The 0.4 review proposed that step 4 ask these cases before its pull
request is marked ready. Nothing in 0.5 gives that job to anyone.

**Proposed resolution.** In 386–387 and F-07 187–188, write "(a typo, and, expected but not asked, a deleted or moved
issue)". Give step 4's ticket one acceptance line. It asks GitHub about a transferred issue before step 4's pull request
is marked ready, and records the answer on the `Verified against:` line.

### AR-6 — §10 says the ticket's Fit line is "met", then keeps it

**Where:** F-17 §10, lines 587–591. F-07 0.3's Fit, lines 56–58.

**Breaks:** none. A Fit edit moves no `Version:`.

The fix says the Fit line "of step 5's ticket is met". Then the next sentence still has the ticket carry "F-07's Fit
is filled, describing F-07 as amended, before its review runs". These pull two ways. Step 5 amends F-07's Contract
again (§10, 592–594), so F-07's Fit will need to describe that amendment too. F-07's Fit says it describes F-07 "as
amended by 0.2". Read as "met", step 5 could skip the update.

**Proposed resolution.** Write: "#607 filled it in F-07 0.2. Step 5's ticket carries, as an Acceptance line, that
F-07's Fit describes F-07 as step 5 amends it, before its review runs." Keep the owner's quoted words after that.

## Out of scope, for a follow-up

These were found while reading, outside the fix diff. None of them is a finding against 0.5.

- **Known limitations** have no line for a pull request closed unmerged, though F-07 0.3 added one (288–289). §5 says
  the hold in prose (384–386).
- **"Never a 0.4"** still stands in Open questions (879). The 0.5 Changes line now says the owner chose 0.5 past it
  (908), but the Open questions line is not marked as set aside.
- **`/work-ticket` step 3** now disagrees with both docs in a second case: a pull request closed unmerged reads
  `CLOSED` to `gh issue view`. That is the F-07 0.3 review's AR-3, and it sits in the skill.
- **The Threat model's Bounded bullet** (632–634) does not name the new lines' cap of one per leaf and kind.

## Hand-off

No open draft pull request changes `dev/features/parallel-plan.md`. The lookup prints nothing, so no pull request
waits on this review to be marked ready.
