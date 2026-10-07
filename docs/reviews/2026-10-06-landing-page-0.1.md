# Adversarial review — F-11 landing page 0.1

Reviewed: dev/features/landing-page.md @ eedf279
Version line: Version: 0.1 (2026-10-06) — this line is the one a `/review-doc` review cites; it moves when the Contract or
Review date: 2026-10-06
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks the two lines above against the tree. A review whose version line is no longer in the document
> is stale and turns CI red. Copying the line is the point: it cannot be transcribed without opening the
> file under review.

Read in full: the target; `site/index.html`, `site/design-direction.md`, `SLIPWAY.md`, `README.md`; #252, #43,
#55, #270, #271 (bodies), #45 #47 #48 #50 #54 #91 #233 (state). Read in part, to check a named claim:
`decisions.md` (D-002, D-004, D-015, D-016, D-027), `process/harness/README.md` and
`process/harness/hooks/stop-verify.mjs` (the Stop hook), `ci/checks/meta/r1-review-provenance.mjs`,
`scripts/sync.mjs` (merge), `process/lessons/` (status counts), `site/css/*.css` (overflow),
`process/decision-defaults.md` §10, `npm view use-slipway dist-tags`, `npm view slipway`.

Not checked against: `docs/product/FRAME.md`. In slipway itself it is the unfilled template, so "does every
feature serve the question" was checked against the doc's own job story, `SLIPWAY.md`'s thesis and #43 instead.
No source document: the doc has no `Source:` line and was shaped together with #252, so the source-coverage step
does not apply; #252's and #55's Acceptance were read as the nearest thing.

IDs used below: **Q1–Q8** are the rows of the questions table, **row n** is a row of the claims table, **A1–A10**
are the Given/When/Then blocks of Acceptance in order, **V1–V10** the lines of Verify in order, **B1–B2** the
Build map steps.

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
| AR-1 | The three-reader test cannot fail in any way the doc defines, and has never been seen failing | S1 | owner | B2 (#271) | #275 |
| AR-2 | The sync claims go beyond their source: two clean meets of seven, two syncs with no command count, "releases" that are commit ranges | S1 | owner | B1 (#270) | #275 |
| AR-3 | The testimony exemption lets product claims through with no row; one is contradicted by the repository | S1 | owner | B2 (#271) | #275 |
| AR-4 | Five rows state more than the source they cite | S1 | owner | B2 (#271) | #275 |
| AR-5 | Everything waits on one outside event, including what can be fixed and tested today | S2 | owner | B1, B2 | #275; #270, #271 |
| AR-6 | The eight questions do not map onto the page's sections, and drop a section #55 requires | S2 | owner | B2 | #275 |
| AR-7 | The real-project rule contradicts itself and the rows that depend on it | S2 | owner | B1, B2 | #275 |
| AR-8 | "A person following only the page" is the author | S2 | owner | B2 | #275; #287 |
| AR-9 | "Every command on the page" is not a defined set, and the run may not be `@latest` | S2 | owner | B2 | #275 |
| AR-10 | The cost answer leaves out costs the README states; five minutes has no budget | S2 | owner | B2 | #275 |
| AR-11 | The threat model says "none" for a page whose first command runs a package and creates a repository | S2 | owner | B2 | #275 |
| AR-12 | The word grep fails on copy the claims table keeps | S2 | owner | B2 | #275 |
| AR-13 | V9's scroll-width check is false wherever a scrollbar takes width, which the gutter guarantees | S3 | owner | — | #275 |
| AR-14 | Hygiene: review count, three embedded copies, a Problem list the Contract never answers | S3 | owner | — | #275; #274 (its first point) |
| AR-15 | A2 and A10 cannot both hold: a review in `docs/reviews/` turns slipway's own `pnpm meta` red | S1 | owner | this review's PR | #273 |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — The three-reader test cannot fail in any way the doc defines, and has never been seen failing

**Where:** Contract "The three-reader test"; A5; V10; Known limitations, first bullet.

> A verdict per answer: it matches the intended answer in the table above, or it does not. Six of six for each
> reader, or the page changes and the test runs again with new sessions.

Five gaps, each enough on its own:

1. **No judge.** Nothing says who gives the verdict. If it is the session that wrote the page, the author grades
   the author, which is the failure Problem item 2 names.
2. **No rule for "matches".** Each intended answer is up to three sentences holding several facts (Q5 holds three
   kinds of cost and six prerequisites). Whether a reader who names two of them matches is undecided, so the
   verdict is an adjective. I1 would refuse this as an issue criterion.
3. **Unbounded retries, and only the passing round is required in the PR.** "The page changes and the test runs
   again" until 18 of 18. With no cap and no record of failed rounds, the test selects for a page that passes it.
4. **No known-bad.** `SLIPWAY.md`'s thesis and PC1 say a check is trusted after it is seen failing. This one is
   never run on a page known to be wrong. Today's page is exactly that (stale §04, §05, §06), and it costs one
   run. If today's page scores six of six, the test measures nothing the doc cares about.
5. **The questions miss the part that was wrong.** The six map to Q1–Q5 and Q8. Q6 (existing project) and Q7
   (what is proven) hold every stale claim in Problem item 1 and are not asked. "Why was it built (2 and 8)"
   has two intended answers and no rule for which counts.

Also unstated: how "no repository" is enforced. A session spawned in this checkout loads `CLAUDE.md`, the rules
file and the owner's memory index before it reads the page; "fresh context" is not "knows nothing about slipway".

**Proposed resolution.** Name the judge (a session that has not seen the page's source or this doc, or the
owner). Give each intended answer 2–3 required facts and score those. Add Q6 and Q7. Cap rounds at 3 and put
every round in the PR. Run the test once on today's page first and record the score as the control. Say where
the reader sessions run (outside the repository, no project memory).

### AR-2 — The sync claims go beyond their source

**Where:** Problem item 1; Evidence; Q7; rows 48 and 54; A3; Contract "`SLIPWAY.md` first".

> sync has run seven times on a real project and met #43's yardstick on most of them

> taken seven slipway releases by sync

> every real sync has a dated line with its command and question counts

Checked against #43's Acceptance, the only public record:

| sync | commands | questions | #43's words |
|---|---|---|---|
| 1 | 2 | ~7 | a miss |
| 2 | 1 | 0 | met |
| 3 | 1 | 0 | met (re-pointing cost 2 more commands, 3 questions) |
| 4 | 2 | 1 | a miss |
| 5 | 1 | 1 | "Not checked: whether the owner can say what changed" |
| 6 | not recorded | 0 | "command count was not recorded" |
| 7 | not recorded | 0 | "command count not recorded" |

- Two syncs meet all three parts of the yardstick. Two miss. Three cannot be scored. "Most" is not in the source.
- A3 and #270 require a command count per sync. Syncs 6 and 7 have none, so B1 either invents two numbers or
  fails its acceptance. The doc's own rule ("a claim with no source is cut") says which.
- Q7 says "seven slipway releases". #43 describes commit ranges ("27 slipway commits", "to `836afe7`"), and npm
  has three versions (`0.1.0-rc.1`, `0.1.1`, `0.1.2`). The yardstick itself is defined for "one slipway release
  behind". The three-reader test would then grade readers against a wrong word.
- Q7 fixes the number at seven; the build runs after at least one more sync.
- Nothing says which syncs the page shows. A4 pairs each §06 bullet with a `SLIPWAY.md` line, which is a subset
  rule: the page may show the two meets and omit the two misses and still pass. Evidence already leads with "the
  best at 1 command and 0 questions". Row 54 cuts the one miss the page reports today.
- #55's Acceptance: "The page claims nothing about how easy updating is until `SLIPWAY.md` records a real sync
  meeting the yardstick". The doc does not carry that line or say it is now satisfied.

**Proposed resolution.** Replace "most" and "seven releases" with the counts: N syncs, how many met, how many
missed, how many could not be scored and why. Change A3 to "its command and question counts, or 'not recorded'".
Add a rule for the page: it states met, missed and unscored together, never a best case alone.

### AR-3 — The testimony exemption lets product claims through with no row

**Where:** Contract "Claims: one row per factual claim", the paragraph "Testimony is not a claim"; A1; the
sentence "Fifty-three rows carry; three are cut."

> The author's account in §01 (the four stages) and §07 (twenty years, the three values) is first-person
> testimony, signed, and makes no claim about what slipway does. It has no rows.

It does make such claims, and the doc's next sentence says those need rows:

- §01, stage 4: "each thing I learned the hard way turned into a check that fails". `process/lessons/` at
  eedf279: 12 lessons with status `check`, 33 `prose`, 14 `declined`, 2 `structural`, 1 `artifact`.
  `SLIPWAY.md` says it outright: "Most lessons are judgment, and saying so is the point." The page's sentence
  is the opposite, it has no row, and the exemption keeps it.
- §01, stages 2 and 3: "The quality I could expect changed overnight", "the results became consistent". Claims
  about what the method does, unmeasured in the same way the cut "token churn" clause is.
- §07: "Quality: gates that can actually fail" and "you never weaken a gate to get past it". Row 52 covers only
  the Transparency clause.

Claims outside the testimony also have no row: §03's answer ("leave it for two weeks, come back, run one command
and know what's next"), "The skeleton ships in days", §02's "You do the thinking; the agent does the building",
the plate caption's "so a broken dependency can't quietly switch one off", §04's second audience ("Heads-down
engineers who want a product mind next to them"), §06's "a pause at each milestone to reorganise what should be
shared". Under "a claim with no row is cut" each of these leaves the page; nothing suggests that is intended.

Several rows are not "the claim as it will read" but a label for claims to be written later: 26 ("each step's
owner and rough duration"), 31 ("each file in the tree"), 37 ("who it is for, and who it is not for"), 48, 49,
50. So "1 row per factual claim" (A1) and the stated count of 53 cannot be checked by counting.

**Proposed resolution.** Narrow the exemption to biography (dates, employers, what happened to the author) and
give every sentence about what slipway or its method does a row, testimony or not. Decide the stage-4 sentence
now: reword to what the lessons table supports, or cut. Split the label rows into the sentences they stand for,
or say in A1 that a row may cover a named block and list the blocks.

### AR-4 — Five rows state more than the source they cite

**Where:** rows 1, 13, 15, 20, 26; Q1, Q5; "Verified against: 80f2a46".

The Contract says these were read in full and the build "checks each row against its source". Read against the
sources named:

- **Row 15**, "it can't end a turn on red". `process/harness/README.md` (hooks table): "Once per stop: a second
  red lets it stop, and it must say what is failing." `stop-verify.mjs` line 24 exits 0 on `stop_hook_active`.
  `SLIPWAY.md` "Not verified here" adds that the hook has only been seen blocking on a missing install. The
  page's own §02 has the true version ("or tells me why it can't"); the plate does not.
- **Row 13**, "gates the agent can't talk its way past". The same README lists what gets past: "Under
  `bypassPermissions` nothing asks", "a reworded shell command still gets through", and on a free GitHub plan
  `main` is not protected (`README.md`, "Branch protection on a private repository").
- **Row 20**, "a written review from a fresh session". R1 checks a path and a version line. It cannot check
  which session wrote the review, and its header says so.
- **Row 1 and Q1**, "a project framework for Claude Code", source "`README.md` 1–11". Those lines say "a
  starting point for a product built with coding agents". B2 then edits the README's first screen to match the
  page, so the source is rewritten to agree with the claim it sources.
- **Row 26 and Q5**, step 2 "days". `SLIPWAY.md` path table: "days to weeks". Step 0 is "~1–2h" in the table and
  "about an hour" in its heading. Both understate, in the one answer that is about cost.

**Proposed resolution.** Reword each row to its source (row 15: "it is sent back once with the failure; if it
stops red it has to say what is failing"). For row 1, cite the owner's 2026-09-24 approval as the source of the
wording and treat the README as a mirror, not a source. Add to B2: a row whose claim is stronger than its source
is a finding, not a pass.

### AR-5 — Everything waits on one outside event, including what can be fixed and tested today

**Where:** Contract "Build order"; B1, B2; row 26; Out of scope.

> The steps that write what is proven start only after a real project has closed its first milestone

Only rows 26 (step 6's time), 49 and 55 depend on the close. Everything else is knowable now: the stale §04 and
§05 lines, the cut clause, the gutter, the sync lines, the re-dating of "Not verified here", the command runs
and the reader test. The doc's riskiest assumptions are Problem items 2 and 3 (is it clear, do the commands
work), and both are tested last, behind a date nobody controls.

Costs of waiting that the doc does not weigh:

- `SLIPWAY.md` is public and copied into every new project. Its yardstick line says "each later sync is scored
  here"; six syncs since 2026-09-25 are not. `npx use-slipway` has been public since 0.1.1.
- No branch for the close going otherwise: it slips a month, the milestone is killed instead of closed, or
  `/close-milestone` breaks on first real use. Q7's intended answer and row 49 are written as a success.
- "and until then says it has never run" (Build order, row 26) describes a page state no build step produces:
  B2 is blocked by B1, which is after the close.

**Proposed resolution.** Split B1: 1a now (sync lines, "Not verified here" re-dated, the stale claims), 1b after
the close (three lines or more on it, step 6's time). Run the command runs and one reader-test round on today's
page now, as a baseline and as the control AR-1 asks for. Write Q7 and row 49 so they hold whatever the close
finds, and give B1b a date after which the page ships saying the close has not run.

### AR-6 — The eight questions do not map onto the page's sections

**Where:** Contract "The questions, in the order the reader asks them"; "Design and layout" ("No new section");
B2; rows 31–33, 36; Problem ("answers seven questions").

> The page's sections carry these answers in this order

The page has seven numbered sections. Against Q1–Q8:

- **§03, "What does a successful slipway project look like?", answers none of the eight.** Rows 31–33 keep it.
  #55's Acceptance requires it ("one section for each question above"). The doc neither keeps the question nor
  cuts the section.
- Q1's "is it for me?" is answered in §04 ("Who it's for"), the fourth section. Above the fold, "who it is for"
  is the five words "By an engineer, for engineers", which does not say solo builder (the reader the doc names).
- Q3 has no section; it is the hero only. Fine if said, but then "sections carry these answers in this order"
  is not true of it.
- Row 36 places the prerequisites in §04; they are in §05 today, in one list with rows 43 and 44, which stay in
  §05. B2 says §04–§06 are "rewritten from the claims table" with no word on what moves.

**Proposed resolution.** Add one column to the questions table: the section that carries each answer. Either
make §03 a ninth question or say it is kept under Q4. State where the prerequisites list lives. Decide whether
the lede's last sentence changes, since "stays as approved" and "who it is for above the fold" pull against
each other.

### AR-7 — The real-project rule contradicts itself and the rows that depend on it

**Where:** Contract "How the page describes the real project"; rows 47–49; A3; A8; Contract "`SLIPWAY.md` first".

> **"a private product with one engineer"**, plus its kind in two words. Never its name, domain, size, numbers
> or incidents (#252).

- "Its kind in two words" is its domain. The two words are not in the doc, so the build must ask or invent.
- "Never its numbers or incidents", and row 48 is that project's command and question counts, row 49 is "what
  it found". #43's sync entries, which B1 copies from, are incidents (a held sync, a red meta, a check failing
  23 times). The rule needs to say which numbers and whose incidents.
- `SLIPWAY.md` today cites four of that project's commit shas and one of its live-session incidents. B1
  "refreshes" the section; nothing says whether those stay.
- "each kept line with `Verified against: <sha> <date>`" applies to both sections (A3). #45's method fits "Not
  verified here": the sha shows the code path is still as described. For "Exercised on a real project" a
  slipway sha shows nothing about what a private repository did. The stamp is satisfiable by adding it.
- The doc calls §01 and §07 testimony because they have no public source. Rows 47–49 have none either: their
  source is a `SLIPWAY.md` line the owner writes from a list "the orchestrator session holds". Known limitations
  admits a reader cannot check them; the claims table still counts them as sourced.

**Proposed resolution.** Write the two words in the doc. Reword the rule to what is meant (no business figures,
no product incidents; slipway's own counts and findings are slipway's). Say what `Verified against` means for an
"Exercised" line, or require a public slipway PR or issue per line instead (#270 already asks for that). Mark
rows 47–49 as the owner's testimony, dated, so the page says how much weight they bear.

### AR-8 — "A person following only the page" is the author

**Where:** Contract "The commands run"; A7; Known limitations, first bullet; Problem item 3.

> run once from the published package by a person following only the page; anything they had to guess is a
> finding

The only person named anywhere is the owner, who wrote the page, the CLI and `/bootstrap`. They cannot follow
only the page, and they are the person least likely to notice a guess. "0 unfixed guesses" is self-reported with
no record of what was guessed. Known limitations treats this run as the stronger check ("the second check")
behind the agent readers. Problem item 3 asked for "someone following only the page" and the Contract quietly
makes it the author.

**Proposed resolution.** Either name one other human (any engineer, 30 minutes, a recording or their notes in
the PR), or state plainly that no stranger tests this before #55 publishes and move "a human reader" from "the
owner may add" to a named follow-up with a date.

### AR-9 — "Every command on the page" is not a defined set, and the run may not be `@latest`

**Where:** Contract "The commands run"; A7; V6–V8; Decisions line (D-027).

> Every command printed on the page is run as written, in a clean folder, against `use-slipway@latest`

> No version number is printed on the page: the commands name `@latest`

- The page prints, in `<code>`: two `npx` lines, `/bootstrap`, `/kickoff`, `pnpm status`, `pnpm verify:fast`,
  `pnpm verify`, `sync`, `--adopt`, `/close-milestone`. Verify runs two. `pnpm status` cannot run in a clean
  folder; `pnpm verify` in a new project is red on purpose (`README.md`); `sync` as written is not a command
  (`/sync-slipway`, or `pnpm -s use-slipway sync`). A7 says "each".
- The commands as specified (Q3, rows 3–4) are `npx use-slipway acme`. They do not name `@latest`. D-027 says
  that of a project's `use-slipway` script, not of the page.
- `npx use-slipway` on a machine that has run it before may resolve a cached older version. The builder's
  machine has. V6 prints what the registry calls latest, not what ran. The CLI's first line prints
  `slipway <version> →`; the doc does not ask for it.
- V8 creates a real private repository named `acme` on the runner's account, and fails if one exists. No cleanup
  step, and deleting needs an extra `gh` scope (`README.md`, "To start over").

**Proposed resolution.** List the commands that are run and the folder each runs in; say the rest are named, not
run. Require the pasted output's version line to equal V6's. Use a unique folder name for the run and add the
cleanup. Drop "the commands name `@latest`" or change the commands.

### AR-10 — The cost answer leaves out costs the README states; five minutes has no budget

**Where:** Q5; Contract "What 'cost' means on the page"; row 36; Contract "The reader" ("They decide in about
five minutes").

> Time, discipline and prerequisites, each sourced. No token, money or speed figure

"No money figure" is about unmeasured claims. It has become a reason to omit known, sourced costs that
`README.md` gives a stranger and the page does not:

- Branch protection on a private repository needs a paid GitHub plan; on a free plan a direct push to `main` is
  not blocked. The page's first command makes a private repository.
- The first CI run on `main` is red on purpose.
- The command installs hooks into `.claude/settings.json` that run a command at every turn end.
- `gh` must be logged in; Claude Code is a paid product.

A reader who runs the first command from the page alone meets the first three within the hour. AR-8's run would
find them only if the runner did not already know.

On five minutes: today's page is about 2,200 words, nine to ten minutes of reading. The doc adds lines to §06
and sets no length. Nothing tests that the decision can be made in five.

**Proposed resolution.** Add the paid-plan line and the red first run to Q5 or to the hero's command notes, each
with a row. Either drop "five minutes" to match the page, or say which screens must carry the decision and test
that (the fast-tier reader given only the first two screens).

### AR-11 — The threat model says "none" for a page whose first command runs a package and creates a repository

**Where:** Threat model; Seams; Contract "The first screen" (the README sentence); A9.

> none beyond baseline. The page adds no network call, cache, subprocess, stored secret, user input or deletion.

True of the HTML. The Seams section says what the page actually does: it puts a command in front of a stranger
that runs code from npm and creates a repository on their account. Three things follow that the doc does not
mention:

- **The unprefixed name belongs to someone else.** `npm view slipway` returns another publisher's package
  (0.1.5, "Release your projects with the finesse of an oil tanker"). The page's kicker, title and brand say
  "slipway"; the command says `use-slipway`. A reader who types the shorter name runs unrelated code.
- **The README on npm is the published tarball's.** "The README's first screen, which npm shows on the package
  page, says the same thing" (#252) cannot become true on npm until a release after B2. The doc has no release
  step and #55 publishes the page; the two will disagree in between.
- The page says nothing of how a release is made (D-027: staged by CI, approved with a second factor), which is
  the answer to the question a careful engineer asks before `npx`. Problem item 1 lists it as missing; the
  Contract never returns to it.

Smaller: the page loads fonts from Google on every visit, which sends each visitor's address to a third party
once #55 publishes. The doc notes the fetch and calls it baseline.

**Proposed resolution.** Name the lookalike package in the threat model and decide whether the page says
"`use-slipway`, not `slipway`". Add "a release carrying the README" to the build order before #55, or reword A9
to the repository's README. Decide in or out for one line on provenance.

### AR-12 — The word grep fails on copy the claims table keeps

**Where:** Contract "What it never says"; A8; V4; row 19.

> The build greps `site/index.html` for each of these, case-insensitive, and expects 0 lines: […] `faster`

Run at eedf279, V4 prints 1: line 96, "“Make it faster” as the acceptance criterion", the left cell of the I1
row that row 19 keeps. It is the page's example of a bad criterion, not a claim. The build must delete a good
line, edit the list, or exempt a line, and the doc says which nowhere; the third is how a gate gets weakened.

The list also runs on `site/index.html` only. A9 says the README's first screen "says what the page's does",
with no check, and the README is what npm shows.

**Proposed resolution.** Replace `faster` with the phrases that are claims (`ship faster` is already there; add
`build faster`, `faster than`), or change the plate's example. Run the same grep on the README's first screen.
Give A9 a test: the same kicker sentence and the same two command lines, compared by `grep -F`.

### AR-13 — V9's scroll-width check is false wherever a scrollbar takes width

**Where:** V9; A9; Contract "Design and layout".

> `document.documentElement.scrollWidth === window.innerWidth   → true`

`window.innerWidth` includes the scrollbar; `scrollWidth` does not. With classic scrollbars the two differ on
any page tall enough to scroll, and `scrollbar-gutter: stable` (which this doc adds) makes that permanent. The
check passes only in mobile emulation or with overlay scrollbars. The claim "none exists at 80f2a46" about
scrolling containers holds: the CSS has `overflow-x: clip` twice and no `auto` or `scroll`.

**Proposed resolution.** `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, and say
the viewport is emulated at 390 px.

### AR-14 — Hygiene

**Where:** A2; V2; Changes; Problem item 1; Contract "The three-reader test".

- A2 passes on a review of any version; V2 expects "1 review". R1 turns this file stale the moment the Version
  line moves, so resolving these findings needs a second review and V2's count is then 2. Say "a review naming
  the current Version line".
- The Contract and Verify are copied into #252, #270 and #271. Every resolution above changes at least one of
  them. The doc's Changes log should name the three bodies to re-copy.
- Problem item 1 lists what shipped since the page was written (releases by D-027, F-09, a session cannot
  approve its own gate changes). #252 adds "None of that is on the page." The Contract adds none of it and does
  not say it is out. One line under Out of scope would settle it.
- "on a model other than the author's": the author is the build session (Sonnet per #252), or the owner's usual
  model? Name the models.
- A8's second clause ("no private project name, number or incident is on it") has no evidence the repository can
  hold, as Known limitations says. It should not sit in the same Then as a grep that can fail.

### AR-15 — A2 and A10 cannot both hold in slipway itself

**Where:** A2; A10; V1; V2.

> Then   a review file in docs/reviews/ names this doc and its Version line

> When   pnpm meta runs / Then   it exits 0

Found by writing this file. With `docs/reviews/2026-10-06-landing-page-0.1.md` in the tree at eedf279, R1 passes
and `pnpm meta` exits 1: `scripts/packed.test.mjs` fails, because `new-project` refuses a path that "match[es]
no glob in dev/ownership.yaml". Only `docs/**/TEMPLATE.md` has a class under `docs/reviews/`. No slipway feature
doc has had a review committed before (`git log --diff-filter=A -- 'docs/reviews/*'` shows `TEMPLATE.md` alone),
so this is the first time the two meet. Left as it is, a review in `docs/reviews/` would also have to ship into
every new project to get a class other than `internal`.

The ways out are each a decision: class `docs/reviews/**` as `internal` in `dev/ownership.yaml` (an owner-only
file); keep slipway's own reviews under `dev/`, where R1 does not look and its staleness check never fires; or
teach R1 a second folder.

**Proposed resolution.** One line in `dev/ownership.yaml` after the `TEMPLATE.md` line, so R1 keeps firing on
this review and A2 stands as written. Whichever is chosen, A2 and V2 name the folder that was chosen.
