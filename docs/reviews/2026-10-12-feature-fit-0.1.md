# Adversarial review — F-12 feature fit 0.1

Reviewed: dev/features/feature-fit.md @ a76c489
Version line: Version: 0.1 (2026-10-12)
Review date: 2026-10-12
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`.

a76c489 is `main` at the time of the review (the merge of #410). This session did not write or edit the
document. No earlier review in `docs/reviews/` names this path, so there is no `Supersedes:`.

**What was read.** In full: the target; `docs/reviews/TEMPLATE.md`; `decisions.md` D-036, D-040, D-041, and
D-016 and D-023 as far as their rule; issue #48 (body; it has no comments), which embeds the document;
`docs/features/TEMPLATE.md`; `docs/product/FRAME.md` (the unfilled template); `docs/domain-invariants.md` (an
empty table: nothing to check against); `ci/ratchet.mjs`; `ci/checks/lib/frontmatter.mjs`;
`ci/checks/meta/f1-feature-coverage.mjs`; `dev/ownership.yaml`. In part, to check a named claim:
`ci/checks/lib/markdown.mjs` (`section()`), `ci/checks/lib/report.mjs` (lines 1–100),
`ci/checks/meta/pc1-positive-control.mjs` (header, the check list, the `broken` comparison),
`ci/checks/meta/id1-ids.mjs` (header, `FEATURE_DIRS`), `scripts/sync.mjs` (`plan()` lines 406–438,
`scriptRows()`, `compute()` lines 699–745, `nextManifest()`), `package.json` (`meta`),
`.github/workflows/ci.yml` (which lines run a check), `.claude/skills/close-milestone/SKILL.md` §4,
`.claude/skills/log-feature/SKILL.md` (its phase headings and length), `scripts/skills.test.mjs:20–32`,
`docs/conventions.md` → Before writing something new, `process/intake.md` → Configuration (`Feature docs dir`),
`AGENT.md` (the same key), `ci/status.mjs:78–105`, `ci/checks/lib/risks.mjs:1–6`, the frontmatter of each file
under `dev/features/`, the states of #268, #284, #312, #379 and #49, #379's Order line for #48, and the rule
lines of L-09, L-15, L-18 and L-43.

**What was run.** `PLACEHOLDER` (`ci/checks/lib/frontmatter.mjs:30`) against the template block as Contract §1
writes it (lines 81–90): no line matches, and the block as a whole does not match; the literal `Serves: <…>`
does (AR-2). `frontmatter()` over the sixteen files in `dev/features/`: 14 `draft`, 1 `shipped`
(`concept-audit.md`), and `landing-page-qa.md` has no frontmatter block (AR-3). `section(doc, 'Fit', 2)` on
the target finds its own Fit, with each of the four labels once at a line start and no placeholder. A search of
`ci/checks/meta/*.mjs` for a file without `process.exit`, and for a main-module guard: none of either (AR-9). A search of
`process/cold-review.md`, `.claude/agents/*.md` and the review-doc, work-ticket and close-milestone skills for
the word `Fit`: no hit (AR-5). A search of `scripts/`, `ci/`, `.github/` and `package.json` for `ratchet`: only
`ci/ratchet.mjs` itself (AR-11).

The Contract's "Verified against: c1b5c8f" claims I opened match their description, except where AR-3, AR-9 and
AR-13 say otherwise. `docs/product/FRAME.md` in slipway is the unfilled template, so there is no FRAME question
to test the feature against; the document cites `SLIPWAY.md`'s thesis ("a rule exists only where something
fires") instead, and AR-1, AR-5 and AR-7 are read against that. Slipway has no active milestone by design; the
feature is scheduled by #379's Order (item 14). Not read: any project built from slipway (what a project's
`docs/features/` holds rests on slipway's own `dev/features/` as the example); the 2026-09-24 audit beyond
`concept-audit.md`'s head; `scripts/new-project.mjs`; the body of `/log-feature` beyond its headings.

**Not argued.** D-036's choices are the owner's decisions of 2026-10-08: the count ratchets, sync records the
starting count, the owner never edits the baseline by hand, no backfill before green, no exemption line, no
grace rule. So is "no sub-issues". A finding below touches one only where the document's own text contradicts
it, where the code contradicts what it was built on, or where the Contract does not deliver it.

No finding below is S0.

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
| AR-1 | F2 fires when a doc leaves draft, which is at milestone close, after the feature is built; nothing fires at shaping, where the document says the search matters | S1 | owner | Build map 1 | |
| AR-2 | The template's four lines, as the Contract writes them, are not placeholders `PLACEHOLDER` matches: an untouched Fit in a shipped doc counts as filled | S1 | author | Build map 1 | |
| AR-3 | One file with no frontmatter turns the whole check BROKEN: slipway's own tree has one, and a project with one is red on the sync D-036 says is never red | S1 | owner | Build map 1, 2 | |
| AR-4 | A project with no feature docs yet: `report()` calls 0 scanned BROKEN, and the Contract names no denominator | S2 | author | Build map 1 | |
| AR-5 | "Truth is the reviewer's" names no reviewer, and no reviewer is told to read Fit | S2 | owner | Build map 3 | |
| AR-6 | The cause named is agents in parallel; the mechanism is one search of `main` at shaping, and nothing compares Fit across docs | S2 | owner | Build map 3 | |
| AR-7 | The Verdict rejects an exemption line because nobody would count it; the Contract has four uncounted exits | S2 | owner | Build map 1 | |
| AR-8 | F2 lands one PR before sync can record the count, and the owner's stop condition sits on the second | S2 | owner | Build map 1–2 | |
| AR-9 | The sync row is specified against code that does not work that way: the import, the row kind, the seed file's two roles | S2 | author | Build map 2 | |
| AR-10 | Docs drafted before the section and shipped after it owe Fit at close; the plan's sentence and `/close-milestone` say nothing | S2 | owner | Build map 2 | |
| AR-11 | Five clauses of the count have no case, two finding ids cannot be pinned as ids, and the ratchet's "unchanged" is pinned after the move | S2 | author | Build map 1 | |
| AR-12 | Eight readings the check depends on are not specified | S3 | author | Build map 1 | |
| AR-13 | The verified line is four days and one landed dependency old; five of its facts have moved | S3 | author | — | |
| AR-14 | `Serves:` is outside the job, restates what `prd-ref:` holds, and its fallback applies only to slipway | S3 | owner | — | |
| AR-15 | The evidence is about slipway's helpers, not the two drifts named; "deferred, no condition" is a deferral nothing fires | S3 | author | — | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — F2 fires when a doc leaves draft, which is at milestone close, after the feature is built

**Where:** F-12, Problem's options table (line 41), Fit `Serves:` (lines 47–48), Contract §2 "What it counts"
(lines 116–121) and lines 134–137; against `.claude/skills/close-milestone/SKILL.md` §4 step 2 and the
frontmatter of `dev/features/*.md`.

The option that proceeds is argued by when the search happens:

> a check can read labels; the search happens at shaping, where it changes the design

and Fit says what makes it more than a promise:

> Fit without F2 is a promise; F2 is what goes red.

F2 asks nothing of a draft:

> A draft doc is never counted, whatever its Fit says: it is still being written.

One thing in slipway moves a feature doc past draft, `/close-milestone` §4: "Each feature doc the milestone
shipped: `status: shipped`". So through shaping, the issue, the build, the cold review and the merge of every
PR, the doc is `draft` and F2 is silent. It first reads the doc in the change that closes the milestone, when
the second calculation or the drawer is already on `main`. A Fit written then is written from what was built,
which is the "from memory" §4 forbids; it records the drift and cannot prevent it.

Slipway's own tree shows how long a draft lasts. Of the fifteen docs there with a `status:`, fourteen are
`draft`, among them `template-sync.md` (F-01), whose code has shipped to projects. With no milestones by design
nothing sets them `shipped`, so in slipway F2 reads one doc, the one build step 1 backfills, and the next
slipway feature can be shaped, built and released with no Fit and no red.

So at shaping, the rule is held by one pinned sentence in a skill: the "promise" the document's own thesis says
is not a rule. This does not argue with D-036, which decides what a shipped doc meets on sync, not when a new
doc is first held.

**Proposed resolution.** For the owner, one of: (a) say what is true, that F2 holds Fit at ship and shaping is
advice, and move "the search happens at shaping" out of the argument for the option; or (b) give F2 a trigger a
draft can reach. Two that a check can read today: a doc whose F-id an **active** milestone's Contents cites
(F1 already joins those), which is the moment building starts; or a doc with a current `/review-doc` review
(R1 already reads the header), so a spec is not reviewable with an unfilled Fit. Under (b) the D-036 count is
unchanged: it still covers only docs past draft at the sync. Slipway, with no milestones, needs the second
trigger or stays unheld; say which.

### AR-2 — The template's four lines are not placeholders `PLACEHOLDER` matches

**Where:** F-12, Contract §1 the template block (lines 80–91) and lines 103–105, §2 "What it counts" (lines
118–120), the fixture `unfilled-placeholder` (line 146), Acceptance (lines 236–238, 245); against
`ci/checks/lib/frontmatter.mjs:30`.

> The template's own lines keep the `<…>` placeholders, so `PLACEHOLDER` (`ci/checks/lib/frontmatter.mjs:30`)
> marks an unfilled line without a second definition of "unfilled".

`PLACEHOLDER` is `/<…[^>\n]*>|\bTBD\b|\[NEEDS CLARIFICATION/`: it needs the ellipsis after `<`. The block the
Contract tells the builder to write has none:

> Serves: <the FRAME question this serves, in one line — or the product's thesis when the FRAME has no question yet>

Run against lines 81–90 as written, no line matches. Each label is present and has text after it, so by §2 a
doc that carries the template's Fit untouched **does not lack Fit**. The stub `/log-bug` writes is the stated
case ("starts with the section as the template has it"): it ships at close with F2 green and nobody having
searched for anything.

The fixture does not catch this, because it is written by hand as `Serves: <…>`, which does match. The check is
proved on a line the template will never contain. Acceptance line 1 ("each still a `<…>` placeholder") reads
either way, and a builder who copies the Contract's block satisfies it by eye.

The untouched template also reads as an answer: `Reuses:` offers both a pattern bullet and a `nothing` bullet,
`Numbers:` ends "or `none shown`", `New:` ends "or `none`".

**Proposed resolution.** Write each of the four placeholders in the form the check knows, on one line
(`Serves: <…the FRAME question this serves, in one line…>`), with the alternatives in the prose under the block,
not inside the line. Build the known-bad case from the template itself: a shipped doc whose Fit is the
template's section, byte for byte, expecting four `fit/unfilled/*`; and one test that every line of the
template's Fit matches `PLACEHOLDER`, so the two cannot drift.

### AR-3 — One file with no frontmatter turns the whole check BROKEN

**Where:** F-12, Contract §2 "What it scans" (lines 112–114), "Finding ids" (lines 139–142), §3 (lines
157–158), Acceptance (lines 259–260), Build map 1 (lines 302–305), the verified line (line 204); against
`dev/features/landing-page-qa.md`, `ci/checks/lib/report.mjs:74–76,96`, `ci/checks/meta/id1-ids.mjs` (header)
and D-036.

> Every `*.md` under `docs/features/` except `TEMPLATE.md`, and, only when the directory exists, every `*.md`
> under `dev/features/` … A file whose frontmatter cannot be read is reported, never skipped (fail closed).

> `frontmatter/unreadable` (a doc whose frontmatter block is absent or has no `status:`: reported as broken …)

Three things follow.

1. **Slipway's own tree.** `dev/features/landing-page-qa.md` is a QA plan with no frontmatter. At a76c489 F2
   as specified is BROKEN on slipway, so "Given slipway's own tree … `pnpm meta` exits 0" cannot hold with
   build step 1 as listed: it names `concept-audit.md` and nothing about this file. The verified line's "12
   draft, 1 shipped" predates it (AR-13).
2. **A project on sync.** D-036's title is "never turns a shipped doc red on sync". A project with one file in
   `docs/features/` that is not a feature doc (a `README.md`, a QA plan as slipway has, notes) takes the
   release and `pnpm meta` exits 2. The recorded count cannot cover it: the count is a number of docs that
   lack Fit, and this file is not one of them. The plan's sentence ("3 shipped feature docs have no Fit section
   yet") does not mention it, so the owner learns after `--apply`.
3. **What BROKEN hides.** `report()` drops every finding when `broken` is set (`report.mjs:96`). One stray
   file therefore hides every `fit/missing` in the run, and prints one message.

ID1 reads the same two folders and already has answers F2 does not take: it skips `README.md` beside
`TEMPLATE.md`, reads no subfolder, and knows a companion by `companion-of:` (`landing-page-claims.md`, which
has `status:` and will owe a Fit of its own when its primary ships).

**Proposed resolution.** Say what a feature doc is, once, and have F2 and ID1 agree. A starting position: a
`*.md` directly in the folder, not `TEMPLATE.md` or `README.md`, that carries an `# F-<n>` title (ID1's
declaration) and no `companion-of:`. A file that is not one is not F2's to judge and is named in the printed
view ("1 file here is not a feature doc: …"), which fails closed without failing a project for a QA plan. A
file that **is** one and has no `status:` stays a finding (exit 1, beside the others), not BROKEN. Then have
the sync plan state the number of files it could not class, in the project's words, before `--apply`.

### AR-4 — A project with no feature docs yet: `report()` calls 0 scanned BROKEN

**Where:** F-12, Contract §2 (lines 112–137, 148–150), §3 (lines 162–163), Acceptance (lines 272–273); against
`ci/checks/lib/report.mjs:77–80`, `process/intake.md:41` and `AGENT.md:17`.

`report()` turns `scanned: 0` into "BROKEN — nothing was examined". A project straight from `new-project` has
`docs/features/TEMPLATE.md` and nothing else, and F2 excludes the template. Whether that project's first
`pnpm meta` is green or exit 2 depends on a number the Contract never names: F2's unit and what it counts as
scanned. F1 counts `1 +` the PRD itself for this reason. The green cases listed (a draft, a filled shipped doc,
equal, below, `dev/features/` present and absent) have no "no docs at all", and the new-project acceptance
checks that the file is copied and O1 is green, not that F2 runs.

The same hole from the other side: `Feature docs dir` is a setting a project answers ("Which folder holds the
feature docs?"). F2 reads two fixed folders, as ID1 does. A project that answered anything else has its docs
unread, with a baseline of 0 and a claim that says all is well.

**Proposed resolution.** State the unit ("feature docs, and the baseline"), that the baseline file counts as
one scanned so an empty folder is green with a claim that says so ("no feature doc is past draft yet"), and add
that control. Say in §2 that F2 reads the two fixed folders and what a project with another `Feature docs dir`
gets (a Known limitation, or the folder read from the setting).

### AR-5 — "Truth is the reviewer's" names no reviewer, and no reviewer is told to read Fit

**Where:** F-12, Problem's options table (line 41), Known limitations (lines 222–224), Out of scope (lines
319–320), Contract §4 (lines 175–181); against `process/cold-review.md`, `.claude/agents/*.md`, the review-doc,
work-ticket and close-milestone skills, #268 and D-041.

> F2 holds that each line is there and filled, not that it is true. … truth is the reviewer's

> `/review-doc` checking Fit's truth: a reviewer's job today; a Fit line in its checklist is #268's territory
> if it lands there.

#268 closed on 2026-10-11 and no such line landed: the word `Fit` appears in none of the cold-review brief, the
four reviewer agents, `/review-doc`, `/work-ticket` or `/close-milestone`. The Contract changes one skill,
`/log-feature`, which writes Fit. So the feature has a writer and a presence check, and the one job it leaves
to a person is given to nobody.

The reader who could hold it cheaply is the cold reviewer of the build PR, the first moment code exists:
whether the diff imports what `Reuses:` names, and whether it computes a number `Numbers:` says is calculated
elsewhere. That is a comparison of two texts the reviewer already has.

Fit is also outside what moves a doc's `Version:` (D-041: Contract, Acceptance, Verify). A reviewed doc's Fit
can be rewritten the next day and its review stays current, so even a `/review-doc` that read Fit holds it only
until the first edit.

**Proposed resolution.** Name the reviewer in the Contract and give them the line: one sentence in
`process/cold-review.md` (the diff against the issue's doc's Fit: each `Reuses:` path used, each number
computed where `Numbers:` says), and one in `/review-doc` step 2 (Fit's claims are code claims: verify them).
Both are owner-only files; list them. For the owner: whether a Fit edit moves `Version:`, which is D-041's
list and so their call.

### AR-6 — The cause named is agents in parallel; the mechanism is one search of `main` at shaping

**Where:** F-12, Problem (lines 13–17), Contract §1 `Numbers:` (lines 97–99), §4 (lines 175–178), Known
limitations (lines 222–226).

> With several agents building in parallel the drift is predictable

`/log-feature` Phase 3 searches at shaping, in one session, in what that session can see. Two features shaped
in the same week each search `main`, each find no existing total, each write `New:` and a `Numbers:` path of
their own. Both Fits are true when written, both docs pass F2 at close, and the product has two calculations.
The Contract does not say the search reads other docs' Fit sections, draft docs, or open doc pull requests.
ID1's header describes this same failure for ids ("a branch that is not pushed is invisible to the other"), and
the rules answer it with a read of `main`, the open pull requests and the remote's branches.

Nothing compares Fit across docs afterwards either. Two shipped docs that each name a different path for one
number both pass, and "truth is the reviewer's" does not cover it: each line is true. Known limitations says a
line may be false; it does not say two true lines may disagree, which is the drift in the Problem's first
example.

A `New:` pattern is also recorded nowhere the next search is told to look. §4 says "the feature that last
built one and how", not where that is found.

**Proposed resolution.** In §4, say where Phase 3 searches: the code, then the Fit sections of every doc in
`Feature docs dir` on `main` and in open pull requests, draft or not. Add to Known limitations that F2 does not
compare docs, and name #49 (the consolidation pass) as where two paths for one number are found. If the owner
wants a second place a pattern lives, say whether a `New:` surface earns a row in `docs/conventions.md` when
its doc ships.

### AR-7 — The Verdict rejects an exemption line because nobody would count it; the Contract has four uncounted exits

**Where:** F-12, Problem's Verdict (lines 35–36), Out of scope (line 316), Contract §1 (lines 84–90), §2 (lines
116–118, 134), Threat model (lines 216–217).

> a written reason that exempts a doc (nothing would show how many took the exit)

The Contract then gives every doc these, and counts none:

1. `- nothing — searched <…> and found no existing way`
2. `none shown`
3. `New: … or none`
4. `status: draft`. A doc that never leaves draft is never read (AR-1), and a counted doc set back to `draft`
   in a pull request leaves the count, which lets a new doc ship without Fit under an unchanged baseline.

Against 4 the threat model says:

> nothing a doc says exempts it

`status: draft` is something a doc says, and it exempts it.

The likeliest author is not hostile. It is a session at `/close-milestone` whose stop is blocked on a red F2,
for whom `Serves: the product's thesis`, `nothing — searched the codebase`, `none shown` and `none` are the
shortest way to green. F2 passes that doc, though `Reuses: nothing` with `New: none` is a feature that neither
reuses nor adds anything.

**Proposed resolution.** For the owner to choose: accept the exits and list them under Known limitations with
the reason; or make them visible at no new gate, by having F2's claim carry the counts ("6 docs past draft: 2
reuse nothing, 4 show no numbers") so every `pnpm meta` output and every PR's Verification shows them, which is
the objection the Verdict raised. Either way: `Reuses: nothing` with `New: none` is `fit/unfilled/new`, and the
threat-model sentence is corrected to say `status:` is the doc's own word and a review reads it.

### AR-8 — F2 lands one PR before sync can record the count

**Where:** F-12, Build map (lines 299–310), Contract §3 (lines 157–158); against D-036, `scripts/sync.mjs:420–421`
and #379's Order line for #48.

D-036: "If sync cannot show and write it cleanly, the build stops there and the question comes back before
anything further is built." The Build map puts that question in step 2:

> The owner's condition sits here: if sync cannot show and write the count cleanly, stop and come back before
> building further (D-036).

Step 1 has by then merged the template section, F2, its wiring into `meta`, the seeded ownership row and
slipway's `{"feature-fit": 0}`. Two consequences:

- **If step 2 stops,** F2 is live on `main`, the deploy branch, with no way for a project to arrive at a
  count. The document does not say step 1 is reverted or held.
- **If a release is cut between 1 and 2,** a synced project gets the new seeded path through today's code: an
  `add` of slipway's bytes, so a baseline of 0 against its own count of 3 (exit 1), or a `collision` that
  leaves its own file with no key (exit 2). Both are the red D-036 rules out. #379's Order says "three PRs off
  #48 inside one release"; the document that the build reads does not.

It is also the riskiest assumption tested second: whether sync can compute a file is the one thing the owner
attached a stop to.

**Proposed resolution.** Either reorder so the question is answered first (step 1: the count as a function in
`ci/checks/lib/`, and sync's computed row with its three cases, with nothing wired into `meta`; step 2: F2, the
template and the wiring), or keep the order and add two sentences: no tag between steps 1 and 2, and what
happens to step 1 if the stop fires.

### AR-9 — The sync row is specified against code that does not work that way

**Where:** F-12, Contract §3 (lines 160–171), Fit `New:` (lines 68–71), Threat model (lines 214–215),
Acceptance (lines 266–270); against `scripts/sync.mjs:418–428, 440–458, 732–745, 912–916`, `dev/ownership.yaml`
(the class legend) and the checks under `ci/checks/meta/`.

1. **"The count is F2's own function, imported."** Every file under `ci/checks/meta/` calls `process.exit`, F1
   at its top level, and none has a main-module guard; importing such a file runs it and ends the importing process. Nothing
   in `scripts/` imports from `ci/checks/meta/` today (shared readers live in `ci/checks/lib/`, as
   `review-header.mjs` does for R1 and status). The count needs a module of its own, which the Contract, the
   doc's own `New:` line and #48's Touches do not name. The worked example of Fit omits something it adds.
2. **`merged: key updated`.** That kind is the `package.json` scripts row: `compute()` resolves it with
   `derivePackageJson(…).scripts[r.key]`, and the owner reads it as "script updated". Reused for
   `ci/baselines.json` it is misrouted and mislabelled. The legend in `dev/ownership.yaml` says `seeded` is
   "written once by new-project, then the project's" and `merged` is "package.json scripts only"; a seeded
   file sync writes a key into is neither as worded.
3. **One file, two roles.** Slipway's `ci/baselines.json` is its own live ratchet state and the seed. After
   the first sync the path is in the project's manifest at slipway's blob, so any later change to slipway's
   copy (a ratchet slipway adds for itself) gives every project a `seeded: upstream changed` row and a diff of
   slipway's own numbers (`sync.mjs:427`).
4. **"`--apply` writes exactly what the plan showed."** The plan and `--apply` are two runs and each computes
   its rows. A doc marked shipped between them changes the number; `compute()`'s "changed after it was
   planned" guard covers one run only.
5. **Cases with no row.** A project file that is not valid JSON; a `feature-fit` that is present and not a
   number (by the three cases it is "unchanged", and F2 is then BROKEN); a sync branch merged after `main`
   gained another shipped doc, which lands above the count just recorded.

**Proposed resolution.** Name the module (`ci/checks/lib/fit.mjs`: the reader and the count; F2 and sync both
import it) and add it to `New:` and Touches. Give the row its own kind and label, and amend the legend's two
lines in the same PR. Say whether slipway's seed is a separate template file or its live one, and why the
second is safe. Reword line 169 to what can be held ("`--apply` recounts and prints the number it writes"),
and give 5's three cases a row each, refusing before any write as `scriptRows()` does for bad JSON.

### AR-10 — Docs drafted before the section and shipped after it owe Fit at close, and nobody is told

**Where:** F-12, Contract §3 the plan's sentence (lines 168–169), §4 (lines 180–181), Build map 3; against
D-036 and `.claude/skills/close-milestone/SKILL.md` §4.

D-036 covers "docs it shipped before the section existed". A project mid-milestone at the sync has drafts
shaped without the section and issues already embedded from them. By D-036's own first bullet each raises the
count when it ships, so the milestone's close goes red on F2 in the step that sets `status: shipped`. That is
the decided rule and not argued here. What the document leaves out is the telling:

- The plan says "3 shipped feature docs have no Fit section yet; the count is recorded at 3 and may only go
  down." It says nothing of the drafts that will each owe one.
- `/close-milestone` is not in the Contract, so the session at close meets a finding its skill never mentioned,
  for a section the template did not have when the doc was written.
- A Fit written at close is written from the finished code, not from Phase 3's search (AR-1).

**Proposed resolution.** Add a second sentence to the plan ("2 draft docs have no Fit section; each needs one
before it ships"), counted by the same function. Add one line to `/close-milestone` §4 step 2 naming Fit, and
list that skill among the files the build edits.

### AR-11 — Five clauses of the count have no case, two finding ids cannot be pinned, and "unchanged" is pinned after the move

**Where:** F-12, Contract §2 "What it counts" (lines 116–121), "Finding ids" (lines 139–142), the fixture
(lines 144–150), Acceptance (lines 253–254, 262–264), Verify (line 285); against L-09, L-15,
`ci/checks/lib/report.mjs:96` and `ci/checks/meta/pc1-positive-control.mjs` (header).

By L-09 each clause names the test that dies without it. Not covered by any fixture or green case listed:

1. A label **absent** (the three red cases are no section, an empty `Numbers:`, a placeholder `Serves:`).
2. "its bullets all empty".
3. A `status:` that is neither `draft` nor `shipped` counting as past draft, the fail-closed reading Known
   limitations defends.
4. A count **above** a baseline that is not 0 (3 against 2), the only case where the findings list docs the
   baseline already excuses.
5. A frontmatter block with no `status:`. The fixture named `no-status` is "a doc with no frontmatter", the
   other half of that id.

`baseline/missing` and `frontmatter/unreadable` are listed as finding ids "for the fixture and PC1", and both
are BROKEN. `report()` emits no findings on a BROKEN run, and PC1 pins such a case by the start of its `broken`
message. The fixture text says that for `no-baseline` and not for `no-status`; `frontmatter/unreadable` has no
acceptance line and no stated exit (see AR-3 for whether it should be BROKEN at all).

Acceptance line 254 ends "`--update` then writes 2 and refuses to write 3". No state in that scenario has a
count of 3 above a baseline, so the refusal cannot be reached as written.

"The ratchet's existing behaviour is unchanged (its four outcomes pinned by 1 test)": no test of
`ci/ratchet.mjs` exists today and no slipway script runs it, so that test is written with the move and pins
whatever the moved code does. It tests the helper; the messages, the exit codes and the `--update` refusal
live in the command, which projects run.

**Proposed resolution.** One case each for 1–5, named in Acceptance. Replace the two ids with "BROKEN, message
starting …". Rewrite line 254 with the state that reaches the refusal (baseline 2, then a third doc shipped,
`--update` refuses 3). Pin `ci/ratchet.mjs`'s four outcomes and its refusal, through the command, in a commit
before the helper is extracted, so the same test passes on both sides of the move.

### AR-12 — Eight readings the check depends on are not specified

**Where:** F-12, Contract §2 (lines 112–142), §1 (lines 77–78).

1. What a label line is: at a line start only, this case only, `**Serves:**` or `- Serves:` or not.
2. Where a label's text ends: the next label, a blank line, or the end of the section. `Serves:` is "one line";
   the target's own wraps onto two.
3. One finding per doc (the table, line 129) or one per unfilled label (the ids, line 139).
4. Subfolders of `docs/features/`: ID1 reads none; F2 says "every `*.md` under".
5. A `## Fit` inside a fenced block ahead of the real one (a doc that quotes the template): `section()` takes
   the first heading it finds and does not skip fences.
6. `status: Draft` or `DRAFT`: `frontmatter()` trims and unquotes, and does not fold case.
7. What "equal" prints when the baseline is above 0: the count only, or the docs that make it up. Known
   limitations says the findings name them "when it goes up", so at rest nobody is shown which three.
8. `\bTBD\b` is part of `PLACEHOLDER`: a filled line that mentions a `TBD` marker reads as unfilled.

**Proposed resolution.** One line each in §2, and a case for the ones that change an answer (1, 3, 5, 6).

### AR-13 — The verified line is four days and one landed dependency old

**Where:** F-12, Problem (lines 19–26), Contract §4 (line 178), Order and overlap (lines 193–195), the verified
line (lines 197–205), Build map (line 300); against L-18 and `main` at a76c489.

"Verified against: c1b5c8f 2026-10-08". Since then:

- `dev/features/` holds 16 files, not 13: 14 draft, 1 shipped, 1 with no frontmatter (AR-3). The Problem's
  "five of thirteen … and eight carry none" is the older count.
- `/log-feature` is 297 lines, not "at its 300-line cap". The room is three lines, which the Fit additions
  exceed, so the point stands and the number does not.
- `ci/status.mjs:84` does not read `decisions.md`; line 105 does.
- #268 closed on 2026-10-11. "Each takes `main` after #268 lands" is met, and the template now has the
  `Version:` line and its paragraph between the title and `## Problem`, which §1's "after `## Problem`" still
  fits.
- #312 closed on 2026-10-09; the order is #379's (item 14).

Also here: §4's "the build PR says which lines go to make room" leaves a choice to the builder that the
template's own Contract rule keeps in the doc ("Decisions belong here, not in the PR").

**Proposed resolution.** Re-verify at the resolving commit and date the line; correct the five. Name in §4
which of the skill's lines move or shorten, or say the cut is a wording change with no rule touched and let
`scripts/skills.test.mjs` hold that.

### AR-14 — `Serves:` is outside the job, restates what `prd-ref:` holds, and its fallback applies only to slipway

**Where:** F-12, Problem's job story (lines 28–30), Contract §1 (lines 81, 93–94); against
`docs/features/TEMPLATE.md` (frontmatter, Problem) and `docs/product/FRAME.md` (header).

The job is "which existing patterns it reuses and where every number it shows is calculated". Three of the four
labels serve it. `Serves:` restates a link the doc already carries twice (`prd-ref:` in the frontmatter, and
Problem "citing the PRD by ID") and F1 holds from the PRD's side. Nothing compares the line with the frame. A
feature whose point is one place for one fact adds a third place for this one.

Its fallback, "the product's thesis when the FRAME has no question yet", can apply only to slipway: a project
cannot start a milestone before its frame is `framed`. It ships in every project's template as a standing way
to not name the question.

**Proposed resolution.** For the owner: drop `Serves:` and let Fit be the three lines the job names; or keep it
and say what it adds over `prd-ref:`, with the fallback moved out of the template into slipway's own docs.

### AR-15 — The evidence is about slipway's helpers; "deferred, no condition" is a deferral nothing fires

**Where:** F-12, Problem (lines 13–26, 43).

The Problem names two drifts, "the same number calculated a different way in each feature, and one feature
using a drawer where the last used a full page", and says the owner named them. The evidence that follows is
of a third kind: reuse lists in slipway's own docs and two readers of one file in `ci/`. No instance of either
named drift is cited, in slipway or a project. "The drift is predictable" is then an assumption stated as a
fact, and the `Numbers:` label, the most specific part of the design, rests on it alone.

The options table ends "semantic duplicate detection in code … deferred, no condition". L-43: "Deferred work
is only real if something other than memory fires it." Out of scope lists the same item as out, with no return.

**Proposed resolution.** Cite one instance of each named drift (a project's, described without naming it, is
enough) or mark the two as the owner's expectation and say what would show it false. Change "deferred, no
condition" to "declined", or give it the condition that reopens it.
