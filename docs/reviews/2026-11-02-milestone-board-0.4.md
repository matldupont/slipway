# Adversarial review — F-18 milestone board 0.4

Reviewed: dev/features/milestone-board.md @ aa7e98d
Version line: Version: 0.4 (2026-11-02)
Supersedes: docs/reviews/2026-11-02-milestone-board-0.1.md
Supersedes: docs/reviews/2026-11-02-milestone-board-0.2.md
Supersedes: docs/reviews/2026-11-02-milestone-board-0.3.md
Review date: 2026-11-02
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

aa7e98d is the head of `docs/feature-milestone-board` (PR #604). This session did not write or edit the document.
Three earlier reviews name this path, and all three are superseded.

**This is the last review: there is no 0.5.** No finding below is S1. Each one rides the build step its Blocks column
names (#601–#603), and none asks for a new version before the build starts. The owner's AR-1 rule and the closed-unmerged
case are taken as given (PR #604's body quotes both): findings below argue only with how 0.4 writes them down.

**Scope.** Only what changed since 0.3: `git diff b01ea1d..aa7e98d -- dev/features/milestone-board.md`. That is the
`behind` field and the `note` on a strip (§2), the Left reasons and the typo flag (§2), no repeats (§2, and §3's "One
Next"), the prose-wait cases and the two aliases (§3), the failed-read action and the held and stale causes (§4, the
script and the Threat model), three Known limitations, eight Acceptance blocks and the Verify comments. F-18 has one ID
and four numbered Contract sections, so each finding is located by `F-18 §n` (or the section name) and the line range
at aa7e98d.

**What was read.** In full at aa7e98d: the doc, the 0.3→0.4 diff of it, the 0.3 review, `docs/reviews/TEMPLATE.md`. In
part, at aa7e98d: D-055 in `decisions.md` (its prose-wait bullet, lines 1529–1532); `dev/features/parallel-plan.md`
(F-17: §1's owed thing and print form, §3's "Safe to run beside it" and candidates, §4's Next table, §5's failure
reasons and actions); `ci/checks/lib/next-form.mjs` (all of it); `ci/checks/lib/manifest.mjs` (`trustedGit()`,
lines 73–96); `dev/board/specimen.html` (the header inside `<main>`, lines 77–82); the 0.1 review's AR-4. F2 prints
nothing for this doc.

**GitHub, read for evidence only** (not a commit, so not reproducible from this file), on 2026-11-02, read-only:

- The bodies of #600–#603 (`gh issue view`). Each says `Version 0.4`. #600's §1–§4, Threat model, Known limitations
  and Verify are each the doc's text at aa7e98d, character for character, and its 32 Acceptance blocks are the doc's 32.
  #601 embeds §3, #602 §1, §2 and the page paragraph of §4, #603 §4, each character for character, with the Threat
  model and Known limitations whole; every Verify line of theirs is one of the doc's, bar #602's hand run of
  `pnpm board --out`. Every Acceptance block new in 0.4 is in the step that builds it (the prose-wait cases and the
  aliases in #601, the repeats in #601 and #602, the held and stale causes in #603). The steps' extra blocks (#601's
  open-issue count and timed run, #602's escaping on the static page) are their own and contradict nothing.
- #607 is open: `fix(work-order): a Blocked by number that is not an issue (a pull request, a typo, a deleted or moved
  issue) reads as "not found" and holds its ticket forever`. 0.4's hand-off of `Blocked by:` pull request numbers to it
  is real.

**The 0.3 review's findings.**

- AR-1 (S1, a prose wait advises `Blocked by:` for a pull request or a number not found): **resolved** by 0.4's §3
  cases. No case now advises `Blocked by:` for a pull request or a number not found (lines 228–244), the two shapes
  have their own aliases (lines 250–253), and the Acceptance blocks at lines 428–445 pin both. AR-4 below is the one
  place the old advice survives.
- AR-2 (S1, #600–#603 embed 0.1): **resolved**, as read above.
- AR-5 (one #31 with two prose waits in a fixture): **resolved**: the block at line 428 now splits them across #31 and #32.
- Every other 0.3 finding (AR-3, AR-4, AR-6 to AR-25) stands as the 0.3 review wrote it and rides the step its
  Blocks column names. This review does not repeat them. Three are made worse by 0.4 and are raised again below: 0.3
  AR-13 (D-055 and F-17 not amended) as AR-5, 0.3 AR-18 (time stamps inside `<main>`) as AR-3, 0.3 AR-15 (two waits on
  one leaf) as AR-9.

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
| AR-1 | Two new Next-line endings hold a semicolon, which `nextFormBreaks()` refuses, and all three put a sentence after the one that names who | S2 | author | step 1 (#601) | |
| AR-2 | A held leaf's hold is shown twice: in status, at the end of Next and in In parallel; on the board, in Next and in Left | S2 | author | steps 1 and 2 (#601, #602) | |
| AR-3 | `data-read-at` inside `<main>` makes "cause unknown" depend on the bytes changing every read, which locks in 0.3 AR-18 | S2 | author | step 3 (#603) | |
| AR-4 | Known limitations still says adding a `Blocked by:` line clears a hold, which for a pull request recreates 0.3 AR-1's trap | S2 | author | step 1 (#601) | |
| AR-5 | D-055 still says a closed `#n` holds nothing and every hold advises `Blocked by:`; F-17 lacks the two new kinds and the pick rule (0.3 AR-13, wider) | S2 | author | step 1 (#601); D-055 can land in #604 | |
| AR-6 | "Cause unknown" has no condition on the known causes, and `data-read-at` does not say which read's time it is | S3 | author | step 3 (#603) | |
| AR-7 | `behind`: a git error is unsaid, the ref is spelled loosely, and `git pull` is the wrong fix on a feature branch | S3 | author | step 3 (#603) | |
| AR-8 | The typo flag calls a cross-repository reference or a discussion number a typo, and releases its issue | S3 | author | step 1 (#601) | |
| AR-9 | One leaf with two waits of different kinds has no defined owed things, Left reason or Next ending (0.3 AR-15, wider) | S3 | author | steps 1 and 2 (#601, #602) | |
| AR-10 | "Shown nowhere else on the page" also forbids the header's Next line and the gate; "issue number" of an owed thing is undefined | S3 | author | steps 1 and 2 (#601, #602) | |
| AR-11 | "Held" is true between every read and the next poll, and "each shows its age" while two of the lines show a clock time | S3 | author | step 3 (#603) | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — Two new Next-line endings hold a semicolon, which `nextFormBreaks()` refuses, and all three put a sentence after the one that names who

**Where:** F-18 §3, "Prose waits", the open-issue case (lines 226–227), the open pull request case (lines 230–232), the
closed-unmerged case (lines 236–238); `ci/checks/lib/next-form.mjs:24` and `:31`; F-17 §4's Next table (each row ends
`{whoLine(5)}`).

0.4 adds two endings to status's Next line, each "within F-16's form (`nextFormBreaks()`)":

- `#{m} waits on PR #{n}; it clears when the PR merges.`
- `#{m} is held: PR #{n} closed unmerged; check the wait.`

`nextFormBreaks()` reports any `;` outside a quoted span as "a semicolon" (`next-form.mjs:24`), and S1 holds every
status fixture to it. Both endings break the form they claim to be within. The Verify line at line 503 runs S1 "over
the status fixtures, the prose-wait fixture included", so a build to the letter turns the gate red the first time a
fixture holds a leaf on a pull request.

The 0.3 ending, kept in 0.4, has a second break that the new two inherit. Every Next row ends with the who sentence
(`{whoLine(5)}`), and `nextFormBreaks()` needs the last sentence to name who (`:31`, `^(?:You|Yours|Agent|A fresh
session)`). "The Next line ends with `#{m} is held …`" puts a sentence after it, so the last sentence starts `#31` and
the line breaks the form whatever the ending says.

This does not argue with the owner's words. They give what a pull request wait "shows", which is Left's reason (line
155); Left has no form rule, and the semicolons can stay there. The Next line's text is the doc's own choice.

**Proposed resolution.** Insert the ending before the who sentence, not after it, and write the two new ones without a
semicolon: `#{m} is held until PR #{n} merges.` and `#{m} is held because PR #{n} closed unmerged, so check its wait.`
Keep the owner's words in Left. Add one Acceptance line: on a ready-leaf Next line, each of the three endings holds
`nextFormBreaks()`. Changes §3: #601.

### AR-2 — A held leaf's hold is shown twice: in status, at the end of Next and in In parallel; on the board, in Next and in Left

**Where:** F-18 §2, "No repeats" (lines 165–168) and Left (lines 152–157); §3, the open-issue and closed-unmerged cases
(lines 221–227, 233–238) and "One Next" (lines 259–263); Acceptance at lines 387–389, 405–407, 481–487; F-17 §3, "Safe
to run beside it" (`parallel-plan.md` lines 233–241).

0.4 writes the owner's rule twice. On the board: "A thing shown in Next is shown nowhere else on the page". In status:
In parallel "never lists the item its Next line names". It then decides sameness by "issue numbers" for two leaves and
"`key`" for two owed things (line 166), and the picks drop only a candidate whose number or key "equals the main
step's" (line 261). A held leaf and the owed thing that holds it are one leaf and one owed thing, so neither test sees
them as the same.

They are the same hold, and both places show it:

- **Status.** A `prose-wait` or `prose-wait-closed` thing is rank 1, files `[]`, with no `waits`. It passes all five of
  F-17's tests, so it is a candidate, and the block at line 405 has it in In parallel. When its leaf comes before the
  main step, the Next line also ends with `#31 is held: add Blocked by: #30 to its Links line.` In parallel then lists
  the item the Next line names, which is what "One Next" says never happens.
- **The board.** The same owed thing is a Next pick, showing its text, "Add Blocked by: #30 to its Links line, or remove
  the wait." The held leaf #31 is in Left, with "says it waits on #30: add Blocked by: #30" (the block at line 389). The
  same advice is on the page twice.

The Acceptance blocks for the rule (lines 481–487) test a leaf against a leaf and an owed thing against an owed thing,
so a build to the letter passes them and ships both repeats. Not escalated to S1: the owner's rule already decides
what the page should do, so nothing goes back to the owner. Only the mechanism that applies it is missing.

**Proposed resolution.** An owed thing that holds a leaf (`prose-wait`, `prose-wait-closed`) names that leaf's number,
and counts as the same thing as the leaf. In status, the Next line's ending is printed only when that owed thing is not
taken in In parallel. On the board, when the owed thing is a pick, the held leaf is shown inside that pick, not in
Left, so it is still in exactly one column. Add two Acceptance lines, one per surface, each with a held leaf before the
main step. Changes §2 and §3: #601, #602.

### AR-3 — `data-read-at` inside `<main>` makes "cause unknown" depend on the bytes changing every read, which locks in 0.3 AR-18

**Where:** F-18 §4, the script (lines 311–313) and "Held and stale readings" (lines 292–294); Acceptance at lines
477–479; the 0.1 review's AR-4 (carried as 0.3 AR-18); `dev/board/specimen.html` lines 77–82.

0.4 has the script read "`<main>`'s `data-read-at` (the read's time in milliseconds, a number)" after each `200` or
`304`, and say "cause unknown" when it is over 60 seconds old. A time in milliseconds inside `<main>` changes the page's
bytes, and so its `ETag`, on every read. On a live board the `304` path then almost never applies, and the script
swaps `<main>` after every read, losing focus and selection. That is the 0.1 review's AR-4, carried as 0.3 AR-18, and
0.4 makes it certain instead of likely.

It also turns the carried finding's fix into a regression. 0.1 AR-4 proposed keeping read times out of the page's
bytes, so that an idle board answers `304`. Built that way, `data-read-at` stops moving on an idle board: after 60
seconds with nothing changed, every `304` leaves the old value, and the script says "Last read 1 minute ago; cause
unknown." on a board that is reading every 30 seconds. So the two can no longer both be fixed in #603 as written: one
of them has to change.

**Proposed resolution.** The server sends the latest read's time as a response header on both `200` and `304` (for
example `Board-Read-At: {ms}`), outside the `ETag`'s bytes; the script reads that header, not an attribute of
`<main>`, and writes the visible time into `#live` with `textContent`. Then a page with no change keeps its `ETag`, and
"cause unknown" fires only when the server has stopped reading. Add one Acceptance line: two reads with no change in
their inputs give the same `ETag`, and the second `304` carries the newer read time. Changes §4: #603.

### AR-4 — Known limitations still says adding a `Blocked by:` line clears a hold, which for a pull request recreates 0.3 AR-1's trap

**Where:** F-18 Known limitations, the first bullet (lines 350–352) and the `Blocked by:` bullet (lines 361–362); §3,
the open pull request case (lines 228–229) and the not-found case (line 244).

0.4 takes `Blocked by:` advice away from every case but an open issue: for a pull request "no `Blocked by:` line is
advised", and for a number not found "Neither says to add a `Blocked by:` line". The first Known limitation is
unchanged. It tells the owner how to clear a hold that comes from a sentence of history (`after #498 merged, …`):
"adding or removing a `Blocked by:` line clears it".

0.4's own cases make that a trap. When #498 is a pull request, open or closed unmerged, the hold is one of the new
cases. An owner who follows the limitation adds `Blocked by: #498`. The prose wait clears, because a number already on
that segment is not a prose wait (line 218). The `Blocked by:` number is then read with `issue(number:)`, answers
`not found`, and holds the issue until #607 lands, which the limitation at line 361 says itself. That is 0.3 AR-1's
failure, reached through the doc's own advice. The bullet is embedded whole in #600–#603, so every build step carries
it.

**Proposed resolution.** Rewrite the bullet: "removing or correcting the wait clears it; for an open issue, adding
`Blocked by: #n` also does; for a pull request, add no `Blocked by:` line until #607 lands." Not a Contract edit.
Changes Known limitations: #601, with #600's body.

### AR-5 — D-055 still says a closed `#n` holds nothing and every hold advises `Blocked by:`; F-17 lacks the two new kinds and the pick rule (0.3 AR-13, wider)

**Where:** `decisions.md` D-055, its prose-wait bullet (lines 1529–1532); F-18's Contract preamble (lines 101–102);
§3's cases (lines 221–244) and "One Next" (lines 259–263); F-17 §2 and §6's kind tables, §3's candidates.

D-055 says an issue that waits in prose on an open `#n` "is never held silently: a line names the issue and says to
add `Blocked by: #n`. A closed `#n` holds nothing." 0.4, on the owner's word, says the opposite twice. A pull request
closed unmerged holds. An open pull request holds with no line advising `Blocked by:`, and status prints nothing for
it unless the leaf comes before the main step. 0.4 cites D-055 for the rule (line 102) but changes no line of
`decisions.md`. D-055 is new in PR #604, so it can still say what the owner decided.

F-17 is behind on three points: the owed kinds `prose-wait-closed` and `prose-wait-typo`, which its kind tables do not
list; the `p{n}` alias in its call 2; and the pick rule that drops a candidate equal to the main step. 0.3 AR-13 found
the earlier amendments recorded only in F-18. 0.4 adds three more, and slipway's rule asks for each decision to be
recorded when it is made.

**Proposed resolution.** Before #604 merges, rewrite D-055's prose-wait bullet with the owner's words of 2026-11-02 as
PR #604 quotes them (an open issue holds with advice; an open pull request holds with none and clears when it merges;
closed unmerged holds until the wait is edited; a number not found is flagged, not held). That is not a Contract edit
and moves no `Version:`. #601 adds F-17's rows for the two kinds, its `p{n}` alias and the pick rule, with the
`Amends: F-17` note 0.3 AR-13 asked for. Changes no Contract: #604 (D-055), #601 (F-17).

### AR-6 — "Cause unknown" has no condition on the known causes, and `data-read-at` does not say which read's time it is

**Where:** F-18 §4, "Held and stale readings" (lines 292–294) and the script (lines 311–313); §2's model (`readAt,
githubAt`, line 135); Acceptance at lines 477–479.

The prose says a reading over 60 seconds old shows "cause unknown" only "with none of these causes". The script's rule
has no such condition: after any `200` or `304` with an old `data-read-at`, it sets `#live` to "cause unknown". The
model has two times, `readAt` and `githubAt`, and `data-read-at` is "the read's time". If it is `githubAt`, a GitHub
read that keeps failing makes the page say "GitHub not read at 14:02 (gh is not signed in) …" and, a minute later,
"Last read 1 minute ago; cause unknown." beside it. The Acceptance block avoids the case with "the last GitHub read did
not fail".

**Proposed resolution.** Say `data-read-at` is `readAt`, the files' read, which also runs when GitHub fails (line 276).
Then a failing GitHub read never ages it. Add one Acceptance line: GitHub fails for 3 minutes in a row, and the page
shows the GitHub line and never "cause unknown". If AR-3's header replaces the attribute, the same applies to the
header. Changes §4: #603.

### AR-7 — `behind`: a git error is unsaid, the ref is spelled loosely, and `git pull` is the wrong fix on a feature branch

**Where:** F-18 §4, "Held and stale readings", the table's second row (line 289) and the next paragraph (line 292);
Threat model (lines 342–343); `ci/checks/lib/manifest.mjs:93`–`:96`.

- `trustedGit()` throws when the root has no git checkout above it and when git answers with an error. With no
  `origin/main`, `git rev-list --count HEAD..origin/main` exits with an error, so "no `origin/main` ref, `behind` is
  `null`" needs that one error caught. Any other (not a checkout, an unborn `HEAD`, git missing from the trusted PATH)
  is unsaid: as written it can fail the read, or the board.
- `origin/main` resolves through git's ref lookup order, so a branch or a tag named `origin/main` is read instead of
  the remote's ref. `refs/remotes/origin/main` names it exactly.
- On a feature branch, `git pull` merges the branch's own upstream, which does not lower `HEAD..origin/main`. Only the
  second half of the fix ("merge origin/main into this branch") works there. Also, a feature branch is usually behind
  main, so the line will show on most branches the board is run from.

**Proposed resolution.** Run `rev-list --count HEAD..refs/remotes/origin/main --`. Any error gives `behind: null` and no
line, and never fails the read. Print `git pull` only when `HEAD` is `main`, and only the merge advice otherwise. Add
the failure to the Acceptance block at line 472: not a checkout gives no line and a good read. Changes §4: #603.

### AR-8 — The typo flag calls a cross-repository reference or a discussion number a typo, and releases its issue

**Where:** F-18 §3, "Prose waits", the phrase list (lines 213–214) and the not-found case (lines 240–244); Known
limitations (lines 363–364).

`#n` is matched as "a whole reference" only at its end (`#4` never matches `#43`). In "after other/repo#12", `#12` is
read as this repository's #12. When this repository has no #12, 0.4 says it "is neither an issue nor a pull request in
{repo}, so it is likely a typo" and offers the issue as if the wait were not there, although the wait is real. A
discussion's number also answers `NOT_FOUND` from `issueOrPullRequest` and gets the same line. Before 0.4, a number not
found held its issue, so this miss lost nothing; now it releases one. Not released silently, so the owner's rule holds,
but the line's diagnosis is wrong.

**Proposed resolution.** Do not match a `#n` with a word character or `/` before it, so `other/repo#12` is no prose wait
at all; name it as a limitation (a wait on another repository is not read). For a number not found, say "is not an issue
or pull request in {repo}" without "likely a typo" when the number is below the repository's highest issue number, or
keep the wording and add the discussion case to Known limitations. Changes §3: #601.

### AR-9 — One leaf with two waits of different kinds has no defined owed things, Left reason or Next ending (0.3 AR-15, wider)

**Where:** F-18 §2, Left (lines 152–157) and the typo flag (lines 159–160); §3's cases (lines 221–244).

0.3 AR-15 found no defined line for an issue with two prose waits. 0.4 gives a prose wait five outcomes, so one leaf
can now have, for example, a wait on an open issue and one on a pull request closed unmerged. That is two owed things
of rank 1, two Next endings, and one Left reason "in fixed words" that can name only one of them. Or a typo flag and a
hold, so the leaf is held and also offered "as if the wait were not there". The 0.3 resolution stands, with these
cases named: one owed thing per wait, Left's reason from the first hold in a fixed order (closed unmerged, open issue,
open pull request), the typo `note` shown beside any hold. Changes §2 and §3: #601, #602.

### AR-10 — "Shown nowhere else on the page" also forbids the header's Next line and the gate; "issue number" of an owed thing is undefined

**Where:** F-18 §2, "No repeats" (lines 165–168), the header (line 320) and the gate (lines 183–194); §3, "One Next"
(lines 260–263).

The board's header prints status's Next line byte for byte (D-050, the block at line 409), and that line names the main
step that Next also shows. A gate line can name an issue that Next shows. Read as written, "shown nowhere else on the
page" forbids both. And "a candidate whose issue number or `key` equals the main step's" does not say where an owed
thing's issue number comes from. Read off its `key`, the rule could drop a different action on the same issue, such as
a red check on the main step's pull request.

**Proposed resolution.** Scope the rule to the columns and Waiting on you, naming the header and the gate as outside
it. Say an owed thing has an issue number only when it holds a leaf (AR-2); every other owed thing compares by `key`
alone. Changes §2 and §3: #601, #602.

### AR-11 — "Held" is true between every read and the next poll, and "each shows its age" while two of the lines show a clock time

**Where:** F-18 §4, "Held and stale readings" (lines 281–294).

"A reading is held when the page shows a read older than the latest attempt." The server reads every 10 to 30 seconds
and the page polls every 15, so most of the time the page shows a read older than the server's latest, and the board
is "held". "Each shows its age", but the GitHub line shows `columns as of {HH:MM}` and the server line `Server stopped
at {HH:MM}`, which are clock times, not ages. Only "cause unknown" shows an age. The build cannot tell which is meant.

**Proposed resolution.** Define held as "the columns are older than the latest read the server made", which only a
failed GitHub read or a stopped server gives. Say that a held or stale line shows the time of the reading it keeps, and
that only "cause unknown" shows an age. Changes §4: #603.
