# Adversarial review — F-17 parallel plan 0.4

Reviewed: dev/features/parallel-plan.md @ c011a1a4c9f7e8085546cb37dc966ba753bcbbb2
Version line: Version: 0.4 (2026-11-04)
Supersedes: docs/reviews/2026-10-23-parallel-plan-0.1.md
Supersedes: docs/reviews/2026-10-25-parallel-plan-0.2.md
Supersedes: docs/reviews/2026-10-26-parallel-plan-0.3.md
Review date: 2026-11-04
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

c011a1a is the head of `fix/i607-blocker-not-an-issue`. This session did not write or edit the document. All three
earlier reviews of this path are superseded. F-17 has one ID and ten numbered Contract sections, so each finding is
located by `F-17 §n` (or the section name) and the line range at c011a1a.

**Scope, set by the owner** (a review-loop cap): this review covers only what 0.4 changed, in one round. Those are
the `blocker-unknown` row in §2's table (197), the exception added to §5's "All or nothing" paragraph (325–327), §5's
call 2 (366–374), the new §9 test bullet (509–512) and the two new Acceptance blocks (685–695). The Changes line
(866–868) was read with them. Anything else found is listed under "Out of scope, for a follow-up" at the end, never
as a finding against 0.4. The amendment carries #607, read as data.

**What was read.** In full at c011a1a: the doc, the 0.4 diff against `origin/main` (`git diff origin/main -- dev/features/parallel-plan.md`),
the 0.3 review's register and header, `docs/reviews/TEMPLATE.md`. F-07 (`dev/features/work-order.md`, 0.2),
which was amended the same way, in the lines that overlap: its Fit, its new `Verified against:` line (96–100), its
call 3 (151–153), its item-issue rule (166), "A blocker's status" and Ready (179–187), and its four new Acceptance
blocks (328–355). In part, for claims about the code: `ci/work-order.mjs` (`realGh()`, `issues()`, `collect()`,
lines 30–160), `ci/checks/lib/issue-body.mjs` (`blockers()`, `BLOCKERS_MAX`), `scripts/work-order.test.mjs`
(330–360, the `realGh` `NOT_FOUND` test). F2 prints no line for this doc, so its Fit is filled. #607's body was read
with `gh issue view`, as data. GitHub's answers to `issueOrPullRequest` were not asked from this session.

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
| AR-1 | A milestone item's issue GitHub does not return now blanks the whole read, which F-07 does not do and §10 puts on the same read | S2 | owner | step 4, step 5 | |
| AR-2 | "A `NOT_FOUND` on a call-2 alias" names no field to decide it by, the read still goes through `realGh()`, which takes any `NOT_FOUND`, and no test covers the other-call case | S2 | shaping session | step 4 | |
| AR-3 | The new Acceptance compares with "a run with no ticket naming that number", in which the held leaf is offered, so it cannot pass as written | S2 | shaping session | step 4 | |
| AR-4 | A done or dropped leaf with a bad number prints `blocker-unknown` in every session, saying it "blocks #m being offered" | S2 | shaping session | step 4 | |
| AR-5 | `blocker-unknown` has no cap: one leaf's body can put 50 lines into every session's Needs attention | S2 | shaping session | step 4 | |
| AR-6 | The new line's rank, its blocks words and its who disagree with §1 and the Threat model | S3 | shaping session | step 4 | |
| AR-7 | GitHub's answer shapes are stated with no `Verified against:` line in F-17, and two kinds of number were never asked | S3 | shaping session | step 4 | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Where F-07 0.2 and F-17 0.4 overlap

They agree on: the alias `p{n}` and its fields (`... on Issue { state stateReason }`, `... on PullRequest { state }`);
an issue clearing when closed for either reason; a pull request holding while open and clearing when merged or closed
unmerged; a number answered `null` with a `NOT_FOUND` being unknown and holding its leaf; a `NOT_FOUND` beside an
error of another type failing the read; one notice per unknown blocker. The two notices differ in words (F-07: "#{m}
names #{n} on its Blocked by line, which is neither an issue nor a pull request in {repo}. Correct the number or remove
it."; F-17: "Correct #{n} on #{m}'s Blocked by line, or remove it. …"). Each is in its own surface's form, and
`plan-shared.test.mjs` compares the main step and picks, never the lines, so the difference breaks nothing.

They disagree on one point, a `NOT_FOUND` outside the blocker call: AR-1. They share one defect, the comparison run:
AR-3.

The new line obeys §7's print rules. It prints `#{n}` (digits from `blockers()`, `#(\d{1,9})`), `#{m}` (a leaf's
number) and fixed words. It says "in this repository" in place of the repo's name. §1's line form is checked in AR-6.

## Findings

### AR-1 — A milestone item's issue GitHub does not return now blanks the whole read

**Where:** F-17 §5 "All or nothing" (323–328), §5 call 1 (359–362), §10 "The read" and "The failure rule"
(552–558); F-07 166 and 184–185.

0.4 adds: "A `NOT_FOUND` beside any other error, or on another call's alias, fails the read." Call 1 asks for "the
active milestone's item issues" by alias (`collect()`'s first call, folded in). So an item whose issue was moved,
deleted or mistyped in the milestone file gets `null` with a `NOT_FOUND` on a call-1 alias. Read as 0.4 writes it,
status then has no GitHub data at all, in every session, until someone edits the milestone file.

That is the failure #607 exists to remove. #607 names its rule as "a read that one bad line can blank for everyone".
0.4 fixes it for a `Blocked by:` number and writes it down explicitly for a Contents marker. F-07 handles the same case
differently. Its line 166, which 0.2 keeps, says "An issue number GitHub does not return shows '#n not found'". The
shipped `realGh()` takes a `NOT_FOUND` on any alias of any call (`ci/work-order.mjs` at c011a1a, the `every((x) =>
x.type === 'NOT_FOUND')` test). The code's test asserts it (`scripts/work-order.test.mjs`, "real gh answers a missing
issue … the page says 'not found'").

§10 moves the page onto `github-state.mjs`'s calls at step 5 and says "the page keeps its own" failure rule. It does
not say whether a missing item issue is a failure of the shared read. Built as written, either the page loses its
"#n not found" or the shared read carries two rules.

**Proposed resolution.** Pick one rule for both docs before step 4. One choice: a call-1 item-issue alias answered
`null` with a `NOT_FOUND` is unknown, as a blocker is. Its item then has unknown leaves, as an item over 50 sub-issues
does, with one owed line naming the item and the number. The other choice: keep the failure on purpose, say why in §5,
and give F-07's line 166 and §10 the same rule. The first matches #607's own rule.

### AR-2 — "On a call-2 alias" names nothing to decide it by, and the read still goes through `realGh()`

**Where:** F-17 §5 "How" (316–321), "All or nothing" (325–327), §9 bullet (509–512), Acceptance (685–691).

The exception says the read holds "when every error of the call is a `NOT_FOUND` on a call-2 alias", and that "a
`NOT_FOUND` … on another call's alias, fails the read". GraphQL ties an error to an alias only through the error's
`path` (`["repository", "p604"]`). The doc never names `path` or any other field. It never says that the alias the
error names must be the one that is `null` in `data`. It never says what a `NOT_FOUND` on `repository` itself does,
which is the answer to a renamed or deleted repository.

§5 "How" still says "The child calls `gh` through work-order's `realGh(root)`". At c011a1a that function takes any
answer whose errors are all `NOT_FOUND`, on any call and any alias, and checks only that `data.repository` is present.
So the distinction 0.4 depends on lives nowhere the doc places it.

The tests do not hold it either. §9 and the Acceptance cover a `NOT_FOUND` beside another type. Neither covers a lone
`NOT_FOUND` on a call-1 or call-3 alias, which is the new half of the sentence.

**Proposed resolution.** Say the child, not `realGh()`, decides it. The read holds only when every error has
`type: "NOT_FOUND"` and a `path` of exactly `["repository", "p{n}"]`, for an `n` asked in this call, whose value in
`data` is `null`. Anything else fails, with "GitHub answered with an error". Add the cases a call-1 alias (or what AR-1
decides) and a `path` of `["repository"]` to §9's bullet and the Acceptance block.

### AR-3 — The comparison run offers the leaf this run holds

**Where:** F-17 §5 call 2 (371–372), §9 bullet (510–511), Acceptance (686–689); F-07 184 and 347–348.

The Acceptance says: "every other GitHub line is the one a run with no ticket naming that number prints, the leaf is
not offered". In a run where no ticket names the number, the leaf has one blocker fewer. When nothing else holds it,
that run offers it, as the main step or in parallel, and the next leaf of the cap drops out. The two runs then differ
in Next and In parallel, though "every other GitHub line" must match. Only a fixture where the leaf is also held by
something else can pass, and the block does not say so. §5's prose ("every other line reads as it would without that
number") and §9's bullet have the same baseline. F-07 also has it: "every other leaf, blocker and pick is the same as
in a run where no ticket names that number". So both docs agree, and both are wrong in the same way.

**Proposed resolution.** Compare with a run where that number is answered as an open issue. That run also holds the
leaf, so every line but the new one is the same. Write the same baseline in F-07, §5's prose and §9.

### AR-4 — A finished leaf with a bad number is reported in every session

**Where:** F-17 §5 call 2 (366–374), §2 row (197).

Call 2 reads "the `Blocked by` numbers not already read, as F-07 reads them". F-07's `collect()` parses the
`Blocked by:` line of every leaf, done and dropped ones included (`ci/work-order.mjs` at c011a1a: `leaf()` sets
`parsed` for each leaf; `need` is built from all of `parsed`). §5 then adds "one `blocker-unknown` line per leaf and
number". A closed ticket that once named a typo, or a pull request since deleted, prints "It blocks #{m} being
offered" in every session. That is false, since a closed leaf is never offered. Its action asks someone to edit the
body of a closed issue. The 0.3 review's AR-1 is the same mistake in claims: a finished ticket's branch kept claiming.

**Proposed resolution.** Print `blocker-unknown` only for a leaf whose status is open, not done, dropped or in a pull
request. Call 2 can then skip the numbers of leaves that are not open, which also shrinks it.

### AR-5 — Nothing caps the new line

**Where:** F-17 §5 call 2 (372–374), §5 "Caps, each said, never silent" (381–393), Threat model (589–593, 606–608).

`blockers()` keeps up to `BLOCKERS_MAX`, 50 numbers a line (`ci/checks/lib/issue-body.mjs` at c011a1a). §5 prints one
line "per leaf and number". The Threat model says a leaf is read "whoever opened them", and that its author "can edit
its body and so steer that leaf's place in the plan: hold it back, or make its files unknown". With 0.4, the author
can also put 50 lines into every session's Needs attention from one leaf, or 50 times that across leaves. A sloppy
paste can do the same. Every other many-of line in this doc is capped or grouped: §5's caps, and §6's "More than 3 …
print as one line". The Threat model's "Bounded" bullet does not mention this line.

**Proposed resolution.** Print one line per leaf: `Correct #{n} on #{m}'s Blocked by line, or remove it` for the
first number, then "and {k} more". Above 3 leaves, group them as §6 groups `needs-shape`. Add a case to §9 and the
Threat model's leaf bullet.

### AR-6 — The line's rank, blocks words and who disagree with §1 and the Threat model

**Where:** F-17 §2 row (197), §1 ranks (148–156) and who (161–165), §5 call 2's line (373–374), Threat model (602).

- **Rank.** The row says `nothing (5), in §5's words`, and the words are "It blocks #{m} being offered". By §1's table,
  a ready leaf of the active milestone blocks "the active milestone closing", rank 1. Rank 5 is "nothing status
  tracks". `stale-claim` and `branches-unread` set the same pattern, so the row matches them. What it costs is
  unstated: at rank 5 the line is never offered In parallel, though its files are `none` and its who is
  `you or an agent`, so §3 could otherwise take it.
- **Who.** `you or an agent` points an agent at editing the body of an issue that, by the Threat model (589), anyone
  may have opened. The Threat model says "No line points an agent at another person's work."
- **Form.** The line holds §1's form: who, two sentences of text, "It blocks …. It waits on nothing.", and at rank 5
  no "It can start now". That part passes.
- **Hygiene.** The second new Acceptance block (693–695) has no `When`, nor does F-07's. Several older blocks lack one
  too.

**Proposed resolution.** Say in the row that rank 5 is chosen to keep the line out of In parallel, or give it rank 1
and let §3 take it. Make the who `you` when the leaf's author is not the owner, or say why an agent may edit any leaf
the owner linked.

### AR-7 — GitHub's answer shapes are stated with no `Verified against:` line, and two kinds of number were never asked

**Where:** F-17 Contract `Verified against:` (104–116), §5 call 2 (366–371); F-07 96–100; #607 Observed.

0.4 states as fact what GitHub answers: a pull request through `issueOrPullRequest`, and `null` with a `NOT_FOUND`
for "a typo, a deleted or moved issue". F-17's only `Verified against:` line is `bff0897 2026-10-25`, before any of
this was asked. F-07 0.2 records what was asked on 2026-11-04: a merged pull request, an issue, and one number held as
neither. #607 says of a deleted or moved issue: "Not reproduced here". A transferred issue may well be the commonest
case. GitHub also numbers discussions from the same sequence as issues and pull requests, so a discussion's number
asked as `issueOrPullRequest` is a fourth case. `#0` is a fifth, which `blockers()` accepts. None of these was asked.
An answer that is not a `NOT_FOUND` would fail the whole read, the outcome 0.4 exists to prevent.

**Proposed resolution.** Add a `Verified against:` line for 0.4 that names what was asked and when, or point at
F-07's. Mark the moved, deleted, discussion and `#0` cases as not yet asked. Have step 4 ask them and record the
answers before its pull request is marked ready, as the timed run is.

## Out of scope, for a follow-up

Found while reading, outside what 0.4 changed. None of these is a finding against 0.4.

- **"Never a 0.4."** Open questions (843–845) still quotes the owner's 2026-10-25 rule: "One last review of 0.3; what it
  finds goes into build tickets, never a 0.4." 0.4 now exists on the owner's 2026-11-02 call (Changes, 866–868). The
  doc does not say that the rule was set aside, or for what.
- **Call 2 has no size bound.** The "Bounded" bullet (606–608) caps calls, pull requests, files, blobs and branches,
  but not call 2's aliases: up to 50 numbers a leaf across every leaf. An answer too big for GitHub fails with an error
  of another type. This was already so in 0.3.
- **Rank 5 with blocking words.** `stale-claim` and `branches-unread` (§2, 195; §5, 389–391, 416–418) also say "It
  blocks #{n} being offered" at rank 5. AR-6 asks about the new row only.
- **No line says what a held leaf waits on.** §4's Next row "the lines below say what each waits on" (285), but no
  kind in §2 says that a leaf waits on an open blocker issue or pull request.
- **`/work-ticket` step 3** checks each blocker is "closed", so a merged pull request reads as still open to a literal
  reading (#607, Root cause). This is in the skill, not in F-17.
