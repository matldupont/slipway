# Adversarial review — F-11 landing page 0.2

Reviewed: dev/features/landing-page.md @ a258afc
Version line: Version: 0.2 (2026-10-06) — this line is the one a `/review-doc` review cites; it moves when the Contract or
Supersedes: docs/reviews/2026-10-06-landing-page-0.1.md
Review date: 2026-10-06
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`.

a258afc is PR #275's head (dcab13a) with `main` (d1cdae4) merged in; the document is byte-for-byte the one at
dcab13a. This session did not write or edit it.

Read in full: the target; `site/index.html`, `SLIPWAY.md`, `README.md`, `site/design-direction.md`,
`docs/reviews/2026-10-06-landing-page-0.1.md`; #43, #55 and #270 (bodies); PR #275 (body). Read in part, to check
a named claim: #252 and #271 (Problem, Acceptance, and a search of the embedded Contract), `decisions.md` (D-004,
D-014, D-027), `process/harness/README.md` (lines 21–60 and the hooks table), `process/harness/settings.json`
(searched for `repo delete`), `scripts/sync.mjs` (the merge), `ci/checks/meta/p1-pr-body.mjs`,
`ci/checks/meta/r1-review-provenance.mjs` (header), `.claude/skills/kickoff/SKILL.md` (lines 9 and 23),
`scripts/new-project.mjs` (line 142), `site/css/*.css` (overflow), `dev/ownership.yaml`, `process/lessons/`
(L-13, L-23, L-25, L-43), `npm view use-slipway dist-tags`, `npm view slipway`; the state of #45, #47, #48, #49,
#50, #54, #91, #233 and #274.

Rendered, not only read: `site/index.html` served from a local folder and measured in a browser at 390×844 and
1280×800 (AR-1, AR-8).

Not checked against: `docs/product/FRAME.md` and `docs/domain-invariants.md`, which in slipway itself are the
unfilled templates. "Does every feature serve the question" was checked against the doc's own job story and
`SLIPWAY.md`'s thesis. No source document: the doc has no `Source:` line. The nearest thing is the review of
0.1, so its 14 findings were walked against 0.2. Each has a visible resolution; where one falls short it is a
finding below (AR-2, AR-4, AR-9). Not done: the 68 carried rows line by line. About 25 were checked against
their sources; AR-4 lists the ones that failed.

IDs used below: **Q1–Q9** are the rows of the questions table, **row n** is a row of the claims table, **A1–A14**
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
| AR-1 | The first command is below the fold today at both widths, the Contract says it "stays" above, and the fold has no height | S1 | owner | B2 (#271) | resolved in 0.3 (the owner: above the fold at both sizes) |
| AR-2 | The control round will most likely pass today's stale page: no required fact names anything the page gets wrong | S1 | owner | B2 (#271) | resolved in 0.3 |
| AR-3 | Nothing accepts or verifies the claims table against the built page, in either direction | S1 | owner | B2 (#271) | resolved in 0.3 (the claims check in the page step) |
| AR-4 | Rows still state more than their sources, the sync count among them | S1 | owner | B1 (#270), B2 (#271) | resolved in 0.3; the rest is the claims check |
| AR-5 | Step 1 writes a private project's record into a public, shipped file from a session's list, with no name check | S2 | owner | B1 (#270) | resolved in 0.3 |
| AR-6 | The issues the build runs from still hold 0.1, and the change log says they were re-copied | S2 | owner | B1, B2 | resolved in 0.3; the copy follows the review of 0.3 |
| AR-7 | Owner decisions cited as sources are recorded only in this doc, and reached it by relay | S2 | owner | B2 | #275 |
| AR-8 | Two Verify lines cannot fail: the scroll-width check inside a clipped section, and the second command's grep | S2 | owner | B2 | resolved in 0.3 |
| AR-9 | Publishing waits on step 3, and nothing fires step 3 | S2 | owner | B3, #55 | resolved in 0.3; the third sub-issue of #252, filed with the copy |
| AR-10 | The threat model leaves out the build's own destructive step | S2 | owner | B2 | #279; resolved in 0.3 |
| AR-11 | The strongest thing a real project has done is dropped, and step 1 can re-date a false line | S2 | owner | B1 (#270) | resolved in 0.3 |
| AR-12 | Hygiene: an untested question, a Verify line that fights A13, an unnamed judge, small wording | S3 | owner | — | resolved in 0.3 |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — The first command is below the fold today, and the fold has no height

**Where:** Contract "What 'cost' means on the page" (the hero's notes); Contract "The first screen"; Contract "The
reader" ("the first two screens"); Contract "Design and layout"; A7.

> The first command stays above the fold at 390 px with them in place.

> At 390 px and at 1280 px, above the fold: what slipway is (the kicker and the lede), that it is for engineers
> (the lede's last sentence), and the first command.

"Stays" says it is there now. Measured on the page at a258afc, top and bottom of each element in CSS pixels
from the top of the document:

| element | 390×844 | 1280×800 |
|---|---|---|
| lede (ends "By an engineer, for engineers.") | 433–613 | 543–723 |
| name note | 637–718 | — |
| the mark | 775–1002 | — |
| first command | **1050–1099** | **890–940** |
| §01's answer line | 2050–2140 | 1497–1605 |

The first command is 206 px below an 844 px fold on the phone and 90 px below an 800 px fold on the desktop.
The doc then adds three notes and a line of trust to the same block, keeps the headline and the lede "as the
owner approved them", and allows "No new section, page or visual direction; the hero gains three notes and one
line." Those cannot all hold. On the phone the command only clears the fold if it moves above the mark, which
is a change to the hero's order that the doc does not name.

Two more gaps follow from the same missing number:

- A7 asks for "a screenshot of the first screen" at two widths and no height. At 1280×1024 today's page passes;
  at 1280×800 it fails. The criterion passes or fails by the window the builder happens to have.
- "'Decides in about five minutes' means the first two screens. From the hero through §01's answer line". On
  the phone that stretch ends at 2140 px, which is 2.5 screens of 844 before any note is added.

The Contract's "Verified against: a2fcbdf" lists the page and both stylesheets as "read in full". Reading them
does not show where a line lands (L-23: render the existing product before writing a visual spec for it).

**Proposed resolution.** Name the two viewports with heights (390×844 and 1280×800, or the owner's pick). State
the hero's order at each (commands before the mark on the phone, if that is the intent) and say it is a layout
change. Make A7 a measurement, not a picture: the first command's bottom edge is at or above the fold. Drop
"two screens" for the content it names ("the hero through §01's answer line"), which is what the fast-tier
reader is given anyway.

### AR-2 — The control round will most likely pass today's stale page

**Where:** Contract "The reader test" (the required facts; "The control comes first"); A5.

> Today's page is known to be wrong on "what is proven so far" and "can I use it on a project I already have",
> so the control must miss at least one required fact there.

Each required fact for those two questions, against what today's page says:

| required fact | today's page |
|---|---|
| every check has been seen failing on a known-bad example | "Every check is seen failing before it's trusted. Each has known-bad examples it must go red on" |
| one private project has used it, and its syncs did not all meet the bar | "A private project started from slipway … It took two commands and about seven questions against a goal of one and three, so it's scored a miss." |
| the first milestone close has not run | "`/close-milestone` hasn't run for real." |
| not in one command today | "not in one command yet" |
| a project started from slipway takes updates by sync | "A project started from slipway takes newer versions with `sync`." |
| the checks and rules can be lifted on their own | "You can lift any of them into a repo you already have." |

Six of six are on the stale page. What Problem item 1 says is wrong there (one sync where there are seven, a
milestone that "hasn't started", adoption "in progress") is in no required fact. So the control most likely
misses none, which is the outcome the doc calls "the test cannot tell a stale page from a true one".

The fallback then does three things the doc has not weighed:

- "the required facts are sharpened and the control re-run": by the build session, which is the page's author,
  with no cap. The cap of 3 rounds starts "after the control".
- Open questions lists "the required facts" as "the owner's to move in this doc". Moving them changes the
  Contract, the Version line moves, and this review goes stale in the middle of #271.
- A5 can also be met for the wrong reason. It asks for "1 required fact or more" missed. One reader leaving out
  one fact passes it, whether or not the fact was about anything stale.

Related, and unmeasured: after the control, all 53 verdicts must be "stated" (22 facts from each full reader, 9
from the fast one). Readers are not told how complete to be. "What do I run first" needs three facts, and a
reader may fairly answer with the command alone. Each such miss changes the page, so three rounds select for a
page that repeats its facts, not a clearer one.

**Proposed resolution.** Write the stale facts in now, so the control can only pass by catching them: there has
been more than one sync and the page gives how many met, missed and were not scored; adopting an existing
repository is a later bet, not under way. Change A5 to "both full readers miss each of these named facts". Use
the control's score on the questions that did not change as the noise floor, and say in the reader's prompt
that an answer should include everything the page says on the question.

### AR-3 — Nothing accepts or verifies the claims table against the built page

**Where:** Contract "Claims: one row per factual claim"; A1; A4; Verify; PR #275 "Not verified".

> The page carries only claims in this table; a claim with no row is cut. […] The build checks each row against
> its source at the sha the PR names, and the PR states the row count.

This is the rule the Problem rests on ("a front page with unsourced claims contradicts it"), and it has no
acceptance line and no Verify line. A1 is "Given this doc / When it is read": it checks the table's shape. A4
pairs §06 with `SLIPWAY.md`. Nothing asks for a verdict per row, for the row count in the PR (that is in #252's
Acceptance, not here), or for the other direction: that every factual sentence on the built page has a row. A
reviewer of #271 working from A1–A14 can pass a page that carries a sentence with no row.

It is not hypothetical. Sentences on today's page that say what slipway does, have no row, and are not among
the nine cuts:

- §04: "Before it builds anything, slipway asks what question the product answers and who's asking. Before a
  feature, it asks which part of that question the feature serves." This is the first sentence of Q6's intended
  answer. Rows 44–48 do not hold it.
- §02: "**The agent can't stop on red.**" The same claim row 70 cuts from the plate, left standing in §02.
- §01: "**Is it useful?** It answers the question the product exists to answer, for the person asking it." Rows
  19 and 20 cover the other two of the three questions.
- §06's answer line: "being built in the open, by one engineer, and proven on real work."
- §06: "had its repository protected by the setup script. `/kickoff` shaped its product, and the Stop hook
  caught a bug in a live session". `SLIPWAY.md` has a line for each, and A4 would pair them; the claims rule
  cuts them, because row 59 is only "has run the gates on real pull requests and issues". The two rules
  disagree about the same bullets.

PR #275 says under Not verified: "each claims row line by line against its source (the page step's job at its
sha)". So at 0.2 no one has checked the 68 rows, and the step that will has no acceptance for having done it.

**Proposed resolution.** Add an acceptance block for #271: the PR carries the table with a verdict per row at
the PR's sha, the count of rows, and a list of every sentence on the page with its row number, or "biography",
or "not a factual claim". Decide the five passages above now, each a row or a cut. Say which of A4 and the
claims rule wins for §06.

### AR-4 — Rows still state more than their sources

**Where:** Contract "How the page reports the syncs"; Q2; Q8; rows 16, 17, 19, 36, 41, 42, 58, 66.

> A row whose claim is stronger than its source is a finding, not a pass.

Against the sources named:

- **The syncs: "two met (the second and third)".** The yardstick has three parts, and the doc scores the fifth
  sync "not fully scored" because "whether the owner could say what changed was not checked". #43's entry for
  the third reads, in full: "**1 command, 0 questions** again. The project's new skill settings were filled in
  from the repo without asking. Separately, re-pointing after the history rewrite cost 2 more commands and 3
  questions". It does not say the sync met the yardstick, and it says nothing about the third part. Only the
  second entry says "The sync met the yardstick." By the doc's own rule the counts are one met, two missed,
  four not fully scored. The same day's 2 more commands and 3 questions are in the source and in no count.
- **Row 19**, "gates it has to ask before changing". `process/harness/README.md` line 28: "Under
  `bypassPermissions` nothing asks". Line 60: "`sed -i`, a redirect or `tee` onto `CLAUDE.md` or `.claude/**`
  does not ask." The row's source cell names "what it lists as getting past"; the sentence as it will read does
  not carry it.
- **Row 36**, "duplicate code fails a ratchet". `decisions.md` D-014 is "open — week 1", and the duplication
  detector is a template default "installed in M1". `ci/ratchet.mjs` compares a number it is handed. The claim
  holds once a project has decided D-014 and wired the tool, not before, and it needs a package installed two
  sections after row 14's "0 packages to install".
- **Rows 42 and 66**, "pull requests that say … what wasn't" and "every PR says what wasn't verified", source
  P1. P1 has three findings: `verification/missing`, `verification/empty`, `verification/prose-only`. None
  fires on a PR that omits what was not verified. The PR template asks for it ("Also say what you did NOT
  verify"); nothing fails.
- **Row 58**, "slipway was built on its own path". `docs/product/FRAME.md` in slipway is the unfilled template,
  and there is no PRD and no milestone. Steps 1 to 4 and 6 of the path have not run on slipway. The sources
  named show feature docs, decisions, lessons and reviews, which is what the row's second half says.
- **Row 16 and Q2**, "each thing I learned the hard way turned into a check that fails where one can catch it,
  and a dated rule where it can't". The status table the row cites has 14 lessons as `declined`: "not built
  yet". Those are neither.
- **Row 41**, "a live URL since the first week". `SLIPWAY.md` step 4 says "days", after a frame and a shape;
  "first week" is in no source.
- **Row 17**, "slipway gets you to a release that holds up sooner". Its source is permission to say it (#252),
  not evidence. The clause beside it was cut as "unmeasured", and this one is measured by the same nobody. The
  word list bans `ship faster`, `build faster` and `faster than`; "sooner" says the same and passes the grep.

**Proposed resolution.** Recount the syncs by the rule already written, and say in the doc how a sync with no
word on the third part is scored. Reword rows 19, 36, 41, 42, 58 and 66 to their sources, or cut. For rows 16
and 17, either keep them as the owner's signed testimony and say on the page that they are, or reword ("most of
what I learned", "I get to a release that holds up sooner").

### AR-5 — Step 1 writes a private project's record into a public, shipped file, with no name check

**Where:** Contract "`SLIPWAY.md` first"; Contract "How the page reports the syncs"; B1; A3; A10.

> The orchestrator session holds the dated list.

> The build recounts from #43 on the day it runs.

Two sources for the same lines. #43 is public and can be opened; a session cannot, and may not exist when #270
runs. If they differ, the doc does not say which wins. A3 says "every real sync in #43", which points at the
issue. #43's body is also edited in place (last at 2026-10-07T02:11Z, after 0.2 was written), so "checks each
row against its source at the sha the PR names" has nothing to pin for it.

`SLIPWAY.md` is `managed` (`dev/ownership.yaml`): it is public, and a sync copies it into every project. Step 1
is where text about the private project is written; the page only copies from it. But the owner's grep for
private names (A10) is "Given the page PR". A3 checks for shas and nothing else, though the Contract says "No
project name, path or product incident."

**Proposed resolution.** One source: #43, quoted with the date it was read. Add the owner's private-name grep to
#270's PR, in the same words as A10.

### AR-6 — The issues the build runs from still hold 0.1

**Where:** Changes, second entry; Build map; A3; A6.

> The Contract and Verify are re-copied into #252, #270 and #271

At a258afc they are not. PR #275 lists the re-copy under "After merge, not in this PR". Read today:

- #270 (last edited 2026-10-06T17:50Z, before 0.2): "**Starts after** a real project has closed its first
  milestone"; requires "3 lines or more on the first `/close-milestone` run", a command count per sync with no
  "not recorded", and "its kind in two words". 0.2 says step 1 runs now, moves the close lines to step 3, and
  writes "a web app".
- #271: "3 fresh-context readers … answer the 6 questions … 6 of 6", "`scrollWidth` equals the viewport width",
  "0 guesses are left unfixed".
- #252's own Acceptance list, which is not the embedded Contract: "The build waits for a closed milestone",
  "0 rows cite something outside the public repository or npm".
- #55: "`scrollWidth` equals the viewport width".

#43 names #270 as next. `/work-ticket` reviews a pull request against what its issue promises (L-68), and a
ticket written from a doc is not a second source for it (L-13). The re-copy the PR plans covers "the Contract
and Verify". The Acceptance lists above are neither, and they are what the cold review reads.

**Proposed resolution.** Write the change-log entry in the future tense with the list: each issue's Contract,
Verify and Acceptance, and #55's scroll line. #270 does not start until that is done.

### AR-7 — Owner decisions cited as sources are recorded only in this doc

**Where:** Open questions; rows 2, 16 and 47; Contract "What 'cost' means on the page" ("in the owner's words
(2026-10-06)"); Contract "How the page describes the real project"; A1.

> none open. Settled by the owner: […] the resolutions of the review of 0.1, AR-1 to AR-14 (2026-10-06, relayed
> by the review session)

PR #275 says of the same decisions: "relayed by the review session on 2026-10-06 and not given to this session
directly, so the owner should confirm them here". The doc states as settled what its own PR asks to have
confirmed.

A1 allows a row to cite "the owner's dated word". For 2026-09-24 that word is in `site/design-direction.md`.
For 2026-10-06 (the stage-4 sentence, "a web app", the three hero notes, that the author may be the person who
runs the path) it is written nowhere but in the doc that cites it. A reader of the page, or the build checking
row 16 "against its source", has nothing to open. `process/slipway-rules.md` asks for decisions to be recorded
"when they are made, not afterwards".

**Proposed resolution.** The owner confirms the list on PR #275, and the doc cites that comment. Or one entry in
`decisions.md`, cited by the rows.

### AR-8 — Two Verify lines cannot fail

**Where:** A11; A12; Verify (the `for s in …` line and the browser comment); Contract "Design and layout".

> `document.documentElement.scrollWidth <= document.documentElement.clientWidth`

`site/css/base.css` line 41: `main > section { overflow-x: clip; }`. Everything on the page except the masthead
and the footer is inside a `main > section`. Measured at 390 px: with a 1200 px wide element added inside §01,
`scrollWidth` is still 390 and the check is true. Content that is too wide is cut off at the section's edge and
the check never sees it. It can only fail for the masthead and the footer.

> `for s in 'a project framework for Claude Code' 'npx use-slipway acme --dry-run' 'npx use-slipway acme'; do grep -c -F "$s" …`

`npx use-slipway acme` is the start of `npx use-slipway acme --dry-run`. The third count is 1 or more whenever
the second is. A README or a page that lost the real command still passes A11.

**Proposed resolution.** For A12, also require that no element's right edge passes the viewport:
`[...document.querySelectorAll('main *')].every(e => e.getBoundingClientRect().right <= document.documentElement.clientWidth)`.
For A11, match the whole line (`grep -x`, or anchor the end).

### AR-9 — Publishing waits on step 3, and nothing fires step 3

**Where:** Contract "Build order"; B3; the options table (third row); Known limitations, first bullet; Q8.

> #55 publishes after the third, and there is no date at which the page ships without it.

After step 2 the page is true: it says the close has not run and gives step 6 no duration. It is then held for
an event in a private repository, which the options table itself calls "an event nobody schedules". The same
table rejects holding everything for the close because "the two riskiest assumptions (is it clear, do the
commands work) [are] tested last". Known limitations then says no stranger has run the path, and that a run by
one "does not gate #55". The only test by a stranger on offer is publication, and it is the step that waits.
Meanwhile `npx use-slipway` is public and its README is the front page.

Nothing fires step 3. Its sub-issue "is filed once this version of the doc is on `main`"; until then it is a
line in a doc. L-43: "Deferred work is only real if something other than memory fires it." No branch is written
for the milestone being killed instead of closed, for `/close-milestone` failing on its first real run, or for
the project stopping.

**Proposed resolution.** Either #55 publishes after step 2, with row 61 as written, and step 3 edits a live
page. Or keep the gate and give it a detector: the sub-issue filed in PR #275's merge, a dated entry that fails
when it passes, and one sentence each for "killed" and "failed".

### AR-10 — The threat model leaves out the build's own destructive step

**Where:** Threat model; Contract "The commands run" (second bullet); Verify (`gh repo delete`); A8.

> Afterwards the same person removes the folder and the repository (`gh repo delete <owner>/<name>`, which needs
> `gh auth refresh -s delete_repo` once).

The threat model covers the page and says the HTML adds no deletion. The build adds one. `gh auth refresh -s
delete_repo` widens the `gh` token on that machine and nothing narrows it afterwards. Every agent session on
the machine uses the same token. `process/harness/settings.json` has no rule naming `repo delete`, and under
`bypassPermissions` nothing asks. The runner is probably the owner, whose account holds the private project.

Smaller: "then Claude Code and `/bootstrap` in the folder it made, then `pnpm status`" does not say how far
`/bootstrap` goes. `SLIPWAY.md` gives step 0 "~1–2h" and 15 probes. Whether the runner finishes them changes
what A8's "each output is in the PR" means.

**Proposed resolution.** Delete the repository from GitHub's settings page, which needs no new scope, or follow
the delete with `gh auth refresh -r delete_repo` and say so. Name the point where the run stops.

### AR-11 — The strongest thing a real project has done is dropped, and step 1 can re-date a false line

**Where:** Problem item 1; Out of scope (third bullet); Contract "`SLIPWAY.md` first" ("Not verified here"); A3;
row 61.

Problem item 1 lists five things that happened since the page was written. Row 51 takes the releases, row 60
the syncs, and Out of scope sets aside two more by name. The fifth, "a real project has built every item of its
first milestone through these rules", is neither on the page nor out of scope.

`SLIPWAY.md` says the opposite today, under "Not verified here": "the first project's M1 is still `shaping`, so
no milestone has closed." Step 1's rule for that list is "Each line kept, with `Verified against: <sha> <date>`
dated on or after the step's start", and "The `/close-milestone` line is kept: it has not run." A3 checks that
each line carries the stamp. So step 1 passes by putting a new date under a sentence the Problem says is no
longer true. The doc's own account of the stamp is that "a slipway sha shows the code path is still as
described"; for this line there is no code path, only the state of a private repository.

**Proposed resolution.** Step 1 rewrites that line's text (built, not yet closed), marked as the owner's dated
account like the "Exercised" lines with no public citation. Give "built every item of its first milestone" a
row, or one line under Out of scope.

### AR-12 — Hygiene

**Where:** Q5; A1; A6; A13; Verify; rows 9, 48 and 62; Contract "The reader test".

- Q5 (§03) has no reader-test question and no required fact. A1 counts 9 questions, A6 tests 8. Say Q5 is not
  tested, or fold its answer into "what happens after that".
- The hero's three notes answer 0.1's AR-10, and none is a required fact for "what does it cost me". The test
  does not show a reader saw them.
- The judge's model is not named; the readers' and the author's are.
- "what users expect did not change (full readers: or the author's lessons became checks and dated rules)":
  whether the bracket is a second way to pass or a second fact is not clear, and the judge is given this text.
- The Verify line that counts hex strings in "Exercised on a real project" expects 0. A13 lets step 3's lines
  there cite "a slipway pull request, commit or issue". A slipway commit sha turns the count to 1.
- A2 passes with every S1 in this review open: it asks that a review exists, not that it was answered. That is
  how R1 works; say so in A2, or add "and each S0 and S1 has a tracker or a resolution in the doc".
- Row 9, "the command installs session hooks", does not say where (the new project's `.claude/settings.json`)
  or that `--no-harness` skips it. A stranger may read it as their machine.
- Row 48, "a few skills", cites 11.
- Row 62 keeps the link to `SLIPWAY.md#not-verified-here--read-as-unknown`. Step 1 edits that section; nothing
  checks the anchor still resolves.
- "Verified against: a2fcbdf": `main` is at d1cdae4 since #274. Nothing the doc cites changed in a way that
  moves a row (R1 gained the retire rule; row 27 still holds). Re-date at the next revision.
