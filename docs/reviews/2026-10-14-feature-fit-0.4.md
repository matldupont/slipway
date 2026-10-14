# Adversarial review — F-12 feature fit 0.4

Reviewed: dev/features/feature-fit.md @ ba4af2e
Version line: Version: 0.4 (2026-10-14)
Supersedes: docs/reviews/2026-10-12-feature-fit-0.1.md
Supersedes: docs/reviews/2026-10-12-feature-fit-0.2.md
Supersedes: docs/reviews/2026-10-13-feature-fit-0.3.md
Review date: 2026-10-14
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

ba4af2e is the head of `matldupont/pr-3-map-step-3-53159f` at the time of the review: one commit on `main`
(8e8ad79), touching `dev/features/feature-fit.md`, `decisions.md` (D-036) and the 0.3 review's Tracker cell for
AR-7. The code the corrected sentences describe is `main` at 8e8ad79, which build steps 1 and 2 (#429, #436)
built. This session did not write or edit the document at any version, and wrote none of the three earlier
reviews; all three name this path and are superseded above. The review is committed on
`review/feature-fit-0.4` at the owner's instruction, with no pull request of its own.

This is the last whole-document review of this spec (the owner, 2026-10-13), and there is no 0.5. So every
finding below is sorted: a high finding (S0, S1) would come back to the owner, fix or cut scope; every other
finding names where it goes, which is outside Contract, Acceptance and Verify (D-041), so nothing it asks for
moves the `Version:` line: a Known limitations line or a Fit edit, a line for build step 3, or #430.

**No finding is S0 or S1.** Nothing comes back to the owner as fix-or-cut. Seven findings, all S3.

**What was read.** In full: the target at ba4af2e; `git diff origin/main -- dev/features/feature-fit.md
decisions.md` and the 0.3 review's changed line; D-036 with all four of its parts; the 0.3 review's AR-7;
pull request #429's and #436's bodies (their "For the Contract correction" and "Known limitations" sections
whole); `ci/checks/lib/fit.mjs`, `ci/checks/lib/feature-docs.mjs`, `ci/checks/lib/ratchet.mjs`,
`ci/checks/meta/f2-feature-fit.mjs`; issue #430. In part, to check a named claim: `scripts/sync.mjs` (the
computed row in `plan()` and `compute()`, `projectBaselines()`, `LABEL`, `MEANING`, the plan's catch of a
refusal, the `package.json` write), `scripts/lib/sync-text.mjs` `countLines()`, `scripts/sync.test.mjs`
(the not-in-form cases, lines 2499 and 2585–2606), `scripts/f2.test.mjs` (its test names),
`ci/checks/lib/markdown.mjs` `sectionLines()`, `scripts/new-project.mjs` (its baselines write),
`scripts/skills.test.mjs` lines 20–40, `.claude/skills/log-bug/SKILL.md` (the stub step, Phase 5's
acceptance line), `ci/fixtures/known-bad/f2/` (its folders, `status-case/expected.json`), issue #48's
comments (the two owed probes), pull request #433's state.

**Verified, and how.** Each sentence 0.4 changed was read against the code at 8e8ad79, and the ones marked
*run* were run there: F2 on slipway's own tree, and F2 on scratch projects outside the repository, one doc
each, under this session's scratchpad. The table below is the record; a row that does not hold names its
finding.

| 0.4 changed | Asked for by | Against `main` at 8e8ad79 |
|---|---|---|
| §1: a stub is held from its first review, and from its commit when the fix is placed in the running milestone in that run | 0.3 AR-7 item 1 | holds: `/log-bug` Phase 5's acceptance asks for the review before the fix; case C adds the Contents item to the milestone the owner names, in that run |
| §2: a label at the first column, on the section's first line too; an indented one is not a label | #429, #436 | holds: `sectionLines()` keeps the first line's indent; `fitTexts()` matches with `startsWith`. *Run:* an indented `Reuses:` on the first line gives `fit/unfilled/reuses` |
| §2: filled is a letter or a digit once characters nobody sees are removed; nothing else folded | #436 | holds: `says()` in `fit.mjs:58`. See AR-2 for what "letter" lets in |
| §2: a line over 5,000 characters reads as unfilled | #429 | holds: `LINE_MAX` in `fit.mjs:80`. *Run:* gives `fit/unfilled/reuses` |
| §2: the short answers read with those characters removed; a list mark looked for on the line as written | #436 | holds: `word()`, `answer()`, `items()`. See AR-2 and AR-5 |
| §3 table: a file not in slipway's form is refused | #429; D-036 amended | the refusal holds; where it happens does not (AR-1) |
| §3: the sentence at 0; the sentence for a doc with no status line; the third sentence as built, no file named | #429 | holds, word for word, in `countLines()`; the third sentence's reason is not every file's (AR-1) |
| §4: the example finding, each reason a doc is held | #436 | holds: `held()` and `NEXT` in `f2-feature-fit.mjs` give the example exactly |
| §4: equal gives one warning per reason | #436 | holds |
| §4: the BROKEN message says a sync records the count | #436 | holds, word for word |
| §4: BROKEN rows for a file that is not a JSON object, and for a link, a folder, or a `ci/` that is a link or a file | #436 | holds: `f2-feature-fit.mjs:54–71`; tests at `f2.test.mjs:192` and `:252`. No Acceptance line (AR-7) |
| §4: every run that is not BROKEN prints the warnings, a third kind for unheld drafts | #436 | the draft warning holds (`status-case` expects it); "every run" does not (AR-1) |
| §4: slipway's own tree, three docs backfilled, count 1, `tests-can-fail.md` | #436 | holds. *Run:* F2 at 8e8ad79 exits 0, count 1 against 1, the one counted doc `tests-can-fail.md`; #433 is still open. Build map step 2 was not changed with it (AR-3) |
| §5: pins counted once | 0.3 AR-7 item 3 | holds: §5 names six pins; Acceptance's three lines pin six |
| §5 and Known limitations: the cap counts lines | 0.3 AR-7 item 4 | holds: `MAX_LINES` counts lines (`skills.test.mjs:29`); `log-bug` is 300 lines, four over 300 characters, the longest 628 |
| Threat model: a plain file or it is refused | #436 | holds |
| Known limitations: the two sentences #436 names | #436 | made as asked; still short of the code (AR-2) |
| Verify: the second plan runs after merge | #429 | holds; step 1's owed run and step 2's probe are both posted on #48 as passes |
| D-036 amended 2026-10-14 | #429 | the exception holds; one sentence says more than sync does (AR-6) |

Nothing outside those lists changed in Contract, Acceptance or Verify: every hunk of the diff maps to a row
above. Every item on #429's and #436's lists, and both Known limitations sentences #436 names, were made.

Open security findings: none raised here. #430 carries 6 open observations from the build's security reviews,
by count only, as its body says.

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
| AR-1 | Three corrected sentences still differ from the build: the not-in-form refusal comes at the plan, not at `--apply`; an `--update` run prints no warnings; the third plan sentence gives a reason that is not every file's | S3 | author | — | Known limitations, step 3 (the first two); #430 item 4 (the third) |
| AR-2 | Known limitations, as corrected, still understate the Fit reader: visible forms also lift the `nothing`-and-`none` rule, and some marks Unicode counts as letters fill a label | S3 | author | — | Known limitations, step 3 |
| AR-3 | Build map step 2 still says two docs were backfilled; the 0.3 review's Tracker marks AR-7 item 2 done | S3 | author | — | Build map step 3: correct step 2's line |
| AR-4 | The doc's own Fit cites line numbers the build moved; Contract §1 cites one too | S3 | author | — | Build map step 3: refresh the Fit; Known limitations for §1's |
| AR-5 | Three Contract §2 sentences 0.4 left alone say less or more than the build | S3 | author | — | Known limitations, step 3 |
| AR-6 | D-036's 2026-10-14 amendment ends with a sentence about all of sync that is not true of all of sync | S3 | owner | — | Build map step 3: scope the sentence, with the owner's yes |
| AR-7 | Three behaviours 0.4 adds to Contract §4 have tests but no Acceptance line | S3 | author | — | Build map step 3: the PR's `## Verification` names the three tests |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other. Here a Tracker cell names where the finding goes,
since none is filed and there is no 0.5; the owner may move any of them.

## Findings

### AR-1 — Three corrected sentences still differ from the build

**Where:** F-12, Contract §3 (the table, lines 214–220; the third plan sentence, lines 228–229) and §4
(lines 258–266), at ba4af2e.

1. **Where the refusal happens.** The new row: "the same, in any other form … | `computed: count recorded` | a
   refusal before any write, naming the file and the form to put it back in". So the plan shows the row and
   `--apply` refuses. The build refuses at the plan: `compute()` runs in the plan too, and its refusal comes back
   with "--apply would refuse this too, so the plan stops here", exit 1 and nothing on stdout, in the plain,
   `--json` and `--verbose` plans alike (`scripts/sync.test.mjs:2595–2601`). The owner never sees a "count
   recorded" row for such a file. The build is the better behaviour, and the row below it ("not JSON") already
   has the right shape: the refusal in the row column, `—` under `--apply`. The release note's "names the row
   and the sentences the owner will see" is where this would mislead.
2. **Every run.** "**Every run that is not BROKEN also prints,** whatever the result": an `--update` run is not
   BROKEN and prints neither the warnings nor the claim (`f2-feature-fit.mjs:76–82`; it reports "recorded at n",
   or its refusal).
3. **The third sentence's reason.** "1 file in docs/features/ is not a feature doc, having no F-number heading".
   The count's files that are not feature docs include a `*.md` that is a link or a folder (`fit.mjs:169`, `why:
   'not-a-file'`), and sync counts them in the same sentence. For those the reason is wrong. This is #430 item 4's
   class ("words in the count's sentences that are true of most files only").

**Proposed resolution.** 1 and 2: one Known limitations line in step 3, "as built" — the plan refuses a file not
in slipway's form, as it refuses one that is not JSON, and `--update` prints only what it recorded. 3: left to
#430 item 4, which already holds the class. None of the three changes what is built.

### AR-2 — Known limitations, as corrected, still understate the Fit reader

**Where:** F-12, Known limitations (lines 425–433), and Contract §2's `fit/unfilled/new` row (line 174), at ba4af2e.

The corrected sentence says that "A character nobody sees placed at a bullet's list mark hides `nothing` from
that reading, so a doc that reuses nothing and adds `none` can pass". The sentence before it already names the
other forms (another list mark, emphasis, a look-alike letter) but gives only one consequence: "a doc that gives
them that way is not counted among them", that is, on the claim line. Each of those forms has the second
consequence too: the doc escapes `fit/unfilled/new` and passes. *Run* at 8e8ad79, a shipped doc with `New: none`
and `nothing` given in each named class of form under `Reuses:`, or `none` given in emphasis under `New:`: F2
passes every one. Only the plain form fails. The doc's reader learns that one hidden character opens the rule,
and not that every visible variant does. Each is text a reviewer reads in the diff, which is why this is not a
security finding by the Threat model's own line.

Second, #436's own Known limitations has a line the doc does not: "A few visible marks that Unicode counts as
letters … fill a label". The doc's sentence "counts as filled only when it holds a letter or a digit" is true of
the code by Unicode's meaning of "letter", not by a reader's, and its list of what the rule "does not cover" leaves
those marks out.

**Proposed resolution.** Step 3 adds one clause to each Known limitations line: the `nothing`-and-`none` rule is
read on the plain form only, so any other form of either answer passes, as a hidden character does; and a mark
Unicode counts as a letter fills a label, as #436 says. No code change: the owner accepted the hidden-character
case on 2026-10-14, and these are the same class seen in plain sight.

### AR-3 — Build map step 2 still says two docs

**Where:** F-12, Build map step 2 (lines 595–597), at ba4af2e; the 0.3 review's register, AR-7.

0.4 moves Contract §4, Acceptance and Out of scope to three backfilled docs and a count of 1. Build map step 2
still reads "`concept-audit.md` and `landing-page.md` backfilled". The 0.3 review named both halves under AR-7 item 2
("Build map step 2 still lists two"), and the 0.4 commit's Tracker cell for it says "Item 2: 0.4 (§4, slipway's own
tree)", as if both were done.

**Proposed resolution.** Step 3's PR corrects step 2's line to the three docs (Build map is outside D-041's list,
so no `Version:` moves). The 0.3 review's Tracker cell stays as written; this review's AR-3 is where the other half
went.

### AR-4 — The doc's own Fit cites line numbers the build moved

**Where:** F-12, Fit (lines 74–91) and Contract §1 (lines 127–128), at ba4af2e.

The Fit says: `section()` in `ci/checks/lib/markdown.mjs:11`, `PLACEHOLDER` in `ci/checks/lib/frontmatter.mjs:30`,
`frontmatter()` at `frontmatter.mjs:9`, and F1's citation pattern at `f1-feature-coverage.mjs:53`. At 8e8ad79:
`section()` is at line 34, and the Fit reader reads `sectionLines()` (line 38), which keeps the first line's indent;
`frontmatter()` is at line 27; `PLACEHOLDER` at line 48, and the Fit reader calls `hasPlaceholder()` (line 54);
line 53 of F1 now calls `citedFeatures()` from `ci/checks/lib/milestones.mjs`. Contract §1 repeats
`frontmatter.mjs:30`. `report()` at `report.mjs:65` and `MAX_LINES` at `skills.test.mjs:29` hold.

"This doc is the section's first instance, and the build reads it as the worked example", and step 3 adds to
`/review-doc` that a Fit line is a claim about the code, verified like one. Read that way, this doc's Fit no longer
holds.

**Proposed resolution.** Step 3 refreshes the Fit's references to `main` (a Fit edit moves no `Version:`, D-041),
naming `sectionLines()` and `hasPlaceholder()` as what the Fit reader calls. Contract §1's `:30` cannot move
without a 0.5; the "as built" Known limitations line of AR-1 names it.

### AR-5 — Three Contract §2 sentences 0.4 left alone

**Where:** F-12, Contract §2 (lines 184–190) and §3's table, row 2 (line 217), at ba4af2e.

None of these was on #429's or #436's list, and none is a departure the builders were asked to report; each is
a sentence the build reads more exactly than the spec does.

1. "**Says nothing is reused**: every bullet under `Reuses:` starts with `nothing`". The build also reads the label
   line's own text, and unmarked text before the first bullet, as items, and removes backticks first (`items()`,
   `word()`; #429's decisions on the 0.2 review's AR-10 items 1 and 2, pinned in `scripts/fit.test.mjs`). With no
   bullet, the sentence read by the letter is true of nothing and flags a filled `Reuses:` beside `New: none`; the
   build does not.
2. "A doc with a missing section has one reason". A doc held for having no status line and with no section has
   two, `frontmatter/unreadable` and `fit/missing` (`fit.mjs:158`). Since 0.4 gives one warning per reason, that
   doc shows as two lines.
3. Row 2, "byte for byte what the one writer writes for it" → "sets the key". #430 item 7 holds two shapes of file
   in that form that are refused instead. Known, and filed.

**Proposed resolution.** 1 and 2: the "as built" Known limitations line of AR-1, one clause each, pointing at
`scripts/fit.test.mjs` as where the readings are pinned. 3: #430 item 7, whose acceptance already asks for a fix
or a Known limitations line.

### AR-6 — D-036's amendment says more than sync does

**Where:** `decisions.md` D-036, the part amended 2026-10-14; F-12, Contract §3 (lines 198–200), at ba4af2e.

The amendment ends: "Sync never rewrites a file of the project's it did not write." Read as a sentence about the
baseline, it holds. Read as written, it is about all of sync, and it is not true: when a `package.json` script
is updated, sync writes the project's whole `package.json` back as two-space JSON (`scripts/sync.mjs:818`),
whatever form the project kept it in. A decision is cited by later sessions on its own; this sentence would be
cited for more than it decides.

**Proposed resolution.** Step 3's PR scopes it: "Sync never rewrites a `ci/baselines.json` it did not write in
that form." The decision is the owner's, so the word change is asked for, and it changes nothing decided.

### AR-7 — Three new behaviours of §4 have no Acceptance line

**Where:** F-12, Contract §4's table (lines 252–253) and its list of what every run prints (lines 262–263);
Acceptance (lines 448–536), at ba4af2e.

0.4 adds two BROKEN rows (a `ci/baselines.json` that is not a JSON object; a link or a folder there, or a `ci/` that
is a link or a file) and the warning for each unheld draft with no filled Fit. Acceptance gained no line for any of
the three, and its draft line ("Then exit 0, and the doc is not counted") is met by a build with no warning. Each is
held by a test on `main`: `scripts/f2.test.mjs:66`, `:192` and `:252`, and `status-case/expected.json` expects
the warning, so PC1 holds it in every run.

**Proposed resolution.** Nothing built changes. Step 3's `## Verification` names the three tests as what holds
these rows, so the next reader of the spec finds them without a 0.5.
