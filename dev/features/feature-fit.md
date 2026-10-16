---
prd-ref: D-036
status: draft
---

# F-12 — Fit: a feature doc says what it reuses and where its numbers live, and a check holds it to that

Version: 0.4 (2026-10-14)

## Problem

Slipway checks that a feature works (`pnpm verify`) and that it is wanted (FRAME → PRD → feature doc →
milestone, F1). Nothing asks whether it **fits the product it joins**. The owner's expectation, named when #48
was filed: with several features shaped side by side, the same number is calculated a different way in each,
and one feature uses a drawer where the last used a full page. No instance of either is cited here. It is an
expectation, and #49's pass across what shipped is what would show it false: no number calculated in two places
and no surface built two ways. The duplication ratchet catches copied lines, not a second way of doing the same
thing, and `docs/conventions.md` → "Before writing something new" asks for the search in the PR, where it is
read once and lost.

The build is not held for that pass (the owner, 2026-10-13; D-036 as amended that day). The reason put to the
owner: what has shipped was shaped one feature at a time, so a clean pass over it would not settle the
expectation for features shaped side by side, and the section has to exist before the next project's feature
docs are written. What reopens the choice has a reader, and is read off two counts (the owner, 2026-10-13, on
AR-4 of `docs/reviews/2026-10-13-feature-fit-0.3.md`). At every close #49's step prints both for the milestone,
and its acceptance has the line:

- **The drifts Fit did not stop:** each number calculated in two places, or surface built two ways, that no Fit
  line named. A drift counts only when the earlier feature was already on `main` when the later doc's Fit was
  written. Two features shaped side by side that each truthfully found nothing do not count: Known limitations
  already accepts that case.
- **The docs that gave only the short answers,** out of how many feature docs the milestone has. A doc gave only
  the short answers when its Fit says `nothing` under `Reuses:` and `none shown` under `Numbers:`.

One such drift, or short answers in more than half of the milestone's feature docs, brings the check and the
sync count back to the owner. Reading the first real result is #423.

Evidence of a neighbouring kind, from slipway's own tree: of the fifteen docs in `dev/features/` with
frontmatter, seven carry an ad hoc "what is reused" list (`deferred-checks.md`, `cli-output.md`, `next-slice.md`,
`tests-can-fail.md` and `experience-evidence.md` under "What is reused", `intake-skills.md` as "Reused, not
rewritten", `design-before-screens.md` as a "Reuses (searched by behaviour)" paragraph), each in its own shape;
this doc is the eighth, and seven carry none. `ci/checks/lib/risks.mjs:1`
says why there is one reader of risks: "so the two can never disagree". The rule is known; it is not written
where a check can hold it. Workaround today: a reviewer notices, or nobody does. Why now: #379's order puts #48
before the next real project's feature docs are written, so those docs are born with the section.

**Job:** when I shape a feature in a product other features already shaped, I want its doc to say which existing
patterns it reuses and where every number it shows is calculated, so the product does not grow a second way of
doing what it already does.

**Verdict: PROCEED.** The shape #48 asked for, less one line (below), with the rollout the owner chose: the count
ratchets down and nothing goes red on sync (D-036). Rejected: do nothing (the search stays in PR prose, read
once); Fit as free prose in the Contract (a check can only hold what it can read; "section present" passes a
paragraph that says nothing); automated detection of a second implementation (out of scope in #48); a written
reason that exempts a doc (nothing would show how many took the exit).

| option | for | against | verdict |
|---|---|---|---|
| do nothing | no new section, no new check | the expected drift has nothing that fires on it | rejected |
| Fit as labelled lines + a check (the ask) | a check can read labels; a doc is held from its review or its schedule, before it is built | one more section to fill; truth is still a reviewer's | **proceeds** |
| Fit as prose in Contract | no template change | a paragraph that says nothing passes "section present" | rejected |
| semantic duplicate detection in code | catches what the author did not know about | out of scope in #48; no tool slipway can ship zero-dependency | declined |

Three things changed at 0.2, on the owner's answers to the review of 0.1 (`docs/reviews/2026-10-12-feature-fit-0.1.md`):

- **Fit is three lines.** #48 listed "which question it serves" as a fourth. `prd-ref:` and the Problem already
  carry that link, so `Serves:` is dropped.
- **A doc is held before it is built,** not only once shipped: from its first review, or from the day a
  milestone that is running schedules it (Contract §2).
- **The build order is turned round:** sync's count lands first, the check second (Build map).

## Fit

Reuses:
- `sectionLines()` in `ci/checks/lib/markdown.mjs:47`, the lines under which `section()` (line 43), the section
  reader every document check uses, joins and trims; the Fit reader takes the lines, so a first line's indent is
  kept. `hasPlaceholder()` in `ci/checks/lib/frontmatter.mjs:57`, which reads each line once for `PLACEHOLDER`
  (line 51), the one definition of "still a template placeholder".
- `frontmatter()` in `ci/checks/lib/frontmatter.mjs:30`: the one reader of `status:` and `companion-of:`.
- ID1's reading of what a feature doc is (`ci/checks/meta/id1-ids.mjs`: the two folders, the two file names
  skipped, a regular file, an `F-<n>` heading, `companion-of:`), moved to a shared module so ID1, F2 and sync
  class a file the same way.
- `reviewProvenance()` in `ci/checks/lib/review-header.mjs`: which document a review names, as R1 reads it.
- `readMilestones()` and `contents()` in `ci/checks/lib/milestones.mjs`, and `citedFeatures()` beside them
  (line 93), the `F-<n>` citation pattern F1 applied inline to a Contents item, moved there; F1 calls it.
- `report()` in `ci/checks/lib/report.mjs:74`, its warnings, and PC1's `expected.json` layout: every check's
  output and its known-bad fixture shape.
- The ratchet's rule in `ci/ratchet.mjs` (above the baseline fails, equal passes, below passes and says to lock
  it in, no baseline is broken), moved into a shared helper so F2 and `ci/ratchet.mjs` compare the same way.
- `scripts/skills.test.mjs`: the pin for every sentence a skill must keep.
- `scripts/sync.mjs`'s `add` row, and its refusal before any write for a file that is not JSON (`scriptRows()`).
- `scripts/new-project.mjs` writing a file it does not copy (`process/anchor`).

Numbers:
- "feature docs held with no filled Fit" is counted once, in `ci/checks/lib/fit.mjs`. F2, `sync --plan`,
  `sync --apply` and `new-project` call it; nothing else counts it.
- The counts on F2's claim line (docs that reuse nothing, show no numbers, add nothing new; files that are not
  feature docs) and sync's "drafts with no Fit yet" come from the same pass of the same module.
- The baseline it is compared against lives in `ci/baselines.json` under `feature-fit`, the file the duplication
  and dead-code ratchets use.

New: the `## Fit` section and the check F2, with the reason above; `ci/checks/lib/fit.mjs` (what is held, what
lacks Fit, the counts); `ci/checks/lib/feature-docs.mjs` (ID1's reader, moved, not rewritten);
`ci/checks/lib/ratchet.mjs` (searched `ci/checks/lib/` for anything that compares a number to a baseline: none);
one sync row whose content is computed (searched `scripts/sync.mjs` for a computed write: the `package.json`
scripts merge is the nearest, and it derives script text, not a count); a lesson behind the cold-review line.

## Contract

### 1. The section — `docs/features/TEMPLATE.md`

A new `## Fit` section sits after `## Problem` and before `## Contract`. Under that heading it is one paragraph
of guidance, then three labelled lines. The labels are what the check reads; the text after each is for a reviewer.

```markdown
What this feature takes from the product it joins. A feature that reuses nothing writes one bullet, `nothing`,
with what was searched, by behaviour; one that shows a person no number writes `none shown`; one that adds
nothing existing code lacks writes `none`.

Reuses:
- <…a pattern or helper this reuses, and where it lives: a path, or the docs/conventions.md row…>

Numbers:
- <…each number this feature shows a person, and the one place it is calculated…>

New: <…anything this adds that nothing existing does, and why reuse was not possible…>
```

- Each of the three placeholders is written `<…text…>` on one line, the form `PLACEHOLDER`
  (`ci/checks/lib/frontmatter.mjs:30`) matches, so an untouched template reads as unfilled with no second
  definition of "unfilled". The alternatives (`nothing`, `none shown`, `none`) sit in the guidance paragraph,
  never inside a placeholder.
- `Reuses:` one bullet per pattern or helper, each with where it lives.
- `Numbers:` one bullet per number the feature shows a person (a count, a total, a rate, a date it computes),
  each with the one place it is calculated. A number shown in two places is calculated in one.
- `New:` what the feature adds that nothing existing does, and why reuse was not possible.

The guidance paragraph may stay in a filled doc: text between the heading and the first label is not read. A
bug-fix stub `/log-bug` writes from the template is held like any doc: from its first review, which the bug's
acceptance asks for before the fix starts, and from its commit when the owner places the fix in the running
milestone in that run (§2, rules 3 and 4). `/log-bug` fills its Fit before the stub's commit either way (§5).

### 2. What is held, and what lacks Fit — `ci/checks/lib/feature-docs.mjs`, `ci/checks/lib/fit.mjs`

Two modules under `ci/checks/lib/`, zero-dependency, reading committed files only. Neither calls
`process.exit`, so sync and `new-project` can import them (every file under `ci/checks/meta/` exits when
imported).

**A feature doc** is, in one closed rule: a regular file, reached through no link, named `*.md`, directly in
`docs/features/` or `dev/features/` (no subfolder), not `TEMPLATE.md` and not `README.md`, with at least one
`F-<n>` heading as ID1 reads one, and no `companion-of:` in its frontmatter. This is ID1's reading today
(`ci/checks/meta/id1-ids.mjs`), moved into `ci/checks/lib/feature-docs.mjs`; ID1 imports it and its findings do
not change (`scripts/id1.test.mjs` and its fixture pass on both sides of the move). Any other `*.md` directly in
those folders is **not a feature doc**: it is never counted, and it is named on every run (§4). A companion's
primary carries the Fit for both.

**Held.** A feature doc is held to having Fit when any of these is true:

1. its `status:` is present and, lower-cased, is not `draft` (`shipped`, or any word the check does not know);
2. it has no frontmatter, or no `status:` (the check cannot tell that it is a draft);
3. a review names it: a file in `docs/reviews/` other than `TEMPLATE.md` whose `Reviewed:` line, read by
   `reviewProvenance()`, gives its path. Any review counts, current or not;
4. a milestone that is `active` or `closed` cites one of its F-ids in a Contents item (`readMilestones()`,
   `contents()`, and F1's citation pattern, moved into `ci/checks/lib/milestones.mjs` for both to call). `closed`
   is in the rule so a feature that shipped and was never marked shipped is still held.

A feature doc that is none of these is a **draft not yet held**: nothing is asked of it, and it is counted
separately so sync can say how many there are (§3).

**Lacks Fit.** A held doc lacks Fit, with these reasons, each a finding id:

| id | when |
|---|---|
| `fit/missing` | no `## Fit` heading. The first such heading in the file is the one read, as `section()` finds it, fenced or not |
| `fit/unfilled/reuses`, `/numbers`, `/new` | that label is absent, or its text is empty, or its text holds a placeholder (`PLACEHOLDER`) |
| `fit/unfilled/new` | also when `Reuses:` says nothing is reused and `New:` says `none`: a feature that neither reuses nor adds anything has not been described |
| `frontmatter/unreadable` | the doc is held under rule 2. It counts whatever its Fit says; the fix is its `status:` line |

- **A label line** starts at the first column with exactly `Reuses:`, `Numbers:` or `New:`, on the section's
  first line too. A label written indented, with a list mark, emphasis or another case is not a label, and
  reads as absent. The first label line for each label is the one read, so with an indented label on the
  section's first line, a later one at the first column is the first.
- **A label's text** runs from after the colon to the next label line or the end of the section. It is filled
  only when it holds a letter or a digit once characters nobody sees are removed; nothing else is folded. A
  line of it longer than 5,000 characters reads as unfilled.
- **"Says nothing is reused"**: every bullet under `Reuses:` starts with `nothing`; a line with no letter or
  digit is not a bullet. **"Says `none`"**: the text of `New:`, with backticks and a closing full stop removed,
  is `none`. **"Shows no numbers"**: the text of `Numbers:`, read the same way, is `none shown`. The three
  answers are read with characters nobody sees removed, and a list mark is looked for on the line as written.
  Case is ignored in all three.
- A doc counts once, however many reasons it has. A doc with a missing section has one reason; a doc with a
  section has one per unfilled label.

**The numbers** the module returns, from one pass: the count (held docs that lack Fit); how many feature docs
are held; of the held docs with a filled Fit, how many reuse nothing, show no numbers, and add nothing new; the
drafts not yet held that would lack Fit if held; the files that are not feature docs.

### 3. The count on arrival — `scripts/sync.mjs`, `scripts/new-project.mjs`, `dev/ownership.yaml`

The owner's rule (D-036): a project that takes this release is never red on sync for docs it wrote before the
section existed, and never edits the baseline file by hand but once, when the file is in a form sync does not
rewrite (D-036 as amended 2026-10-14).

- **One writer of the file.** `ci/checks/lib/ratchet.mjs` reads `ci/baselines.json` and serialises it (two-space
  JSON and a final newline, as `ci/ratchet.mjs` writes it today). `ci/ratchet.mjs`, F2, sync and `new-project`
  all go through it.
- **Slipway's bytes never travel.** `ci/baselines.json` gains an ownership row, class `seeded`, above the managed
  `ci/**` row. Slipway's own copy is its live count and nothing else; no project receives its content. The
  legend's `seeded` line in `dev/ownership.yaml` is amended to say so: written once by `new-project`, then the
  project's, and for this one path sync adds the `feature-fit` key once and writes nothing else in it.
- **`new-project`** writes the file itself after copying, as it writes `process/anchor`: `{"feature-fit": n}`
  with n the module's count on the new project, which is 0.
- **Sync** handles this path before any other rule, and whether or not slipway or the project's install record
  lists it, so it never shows as a collision or as "slipway's template changed". It has one new row kind, `computed: count recorded`, shown to the owner as "count recorded":

  | the project's `ci/baselines.json` | row | `--apply` |
  |---|---|---|
  | absent | `computed: count recorded` | writes `{"feature-fit": n}` |
  | JSON object, no `feature-fit`, or one that is not a whole number ≥ 0, byte for byte what the one writer writes for it | `computed: count recorded` | sets the key to n; every other key is kept byte for byte |
  | the same, in any other form (another indent, a key twice, no final newline) | `computed: count recorded` | a refusal before any write, naming the file and the form to put it back in; the owner does so once and syncs again |
  | JSON object with a whole-number `feature-fit` | `unchanged` | writes nothing |
  | not JSON, or not an object | a refusal before any write, naming the file, as a `package.json` that is not JSON is refused | — |

- **What the plan says,** in the project's words (D-016), from the same pass: "3 feature docs that are shipped,
  reviewed or scheduled have no Fit section filled in yet. The count is recorded at 3 and may only go down."
  At 0: "No feature doc that is shipped, reviewed or scheduled is missing its Fit section. The count is recorded
  at 0 and may not go up." When a counted doc has no status line: "Of these, 1 has no status line in its
  header, so it is counted whatever its Fit says; give it one and it is read normally." When there are drafts
  not yet held: "2 feature docs still being drafted have no Fit section; each needs one before it is reviewed,
  scheduled or shipped." When there are files that are not feature docs: "1 file in docs/features/ is not a
  feature doc, having no F-number heading, and is not counted." No file is named.
- **`--apply` recounts** and prints the number it writes. The plan and `--apply` are two runs; a doc that became
  held between them changes the number, and the printed line is what was written.
- The release note for the version that carries this names the row and the sentences the owner will see.

### 4. The check — F2, `ci/checks/meta/f2-feature-fit.mjs`

Runs regardless of the PRD's status: F1 is gated on it and Fit is not, which is why this is a check of its own.
It reads through §2's modules and the ratchet helper, and writes nothing unless `--update` is passed.

**What it reads.** The two fixed folders, as ID1 does; `docs/reviews/`; `docs/milestones/`; `ci/baselines.json`.
Its denominator is the baseline file as one unit plus every `*.md` directly in the two folders, so a project
with no feature doc yet is green with the claim "no feature doc is held yet", not broken on nothing scanned.

**The baseline.** `ci/baselines.json`, key `feature-fit`. The rule is the ratchet's, through
`ci/checks/lib/ratchet.mjs`, which `ci/ratchet.mjs` is changed to call:

| count vs baseline | result |
|---|---|
| above | exit 1. One finding per reason for every doc that is counted, the ones the baseline already covers included, since the check cannot tell which doc is the new one. Each names the doc, each reason it is held (its status, the review that names it and how many more, the milestone that cites it), what is missing, and the next action in the project's words: "`docs/features/export.md` is shipped and its Fit has no filled `Numbers:` line — say where each number it shows is calculated, or `none shown`" |
| equal | exit 0. When the count is above 0, each counted doc gives one warning line per reason, so the docs behind the number are shown on every run |
| below | exit 0, the same warnings, and the ratchet's line as an `F2:` line: the number improved, run F2 with `--update` to lock it in |
| no `ci/baselines.json`, or no `feature-fit`, or one that is not a whole number ≥ 0 | exit 2 BROKEN, the message starting "ci/baselines.json has no feature-fit count", saying a sync records it in a project, and naming `node ci/checks/meta/f2-feature-fit.mjs . --update` |
| `ci/baselines.json` that is not JSON, or not an object | exit 2 BROKEN, "ci/baselines.json is not a JSON object of counts", none of the file's text in it |
| `ci/baselines.json` that is a link or a folder, or a `ci/` that is a link (to anything or nothing) or a file | exit 2 BROKEN before any read; `--update` writes nothing |

`--update` writes the current count when it is at or below the baseline, or when there is no baseline, and
refuses to raise one (exit 1, naming both numbers).

**Every run that is not BROKEN also prints,** whatever the result (a BROKEN run prints its two lines):

- a warning line for each file that is not a feature doc ("`docs/features/notes.md` is not a feature doc (no
  `F-<n>` title), so its Fit is not checked");
- a warning line for each draft not yet held that has no filled Fit, so `pnpm meta` before a review says whether
  the doc would be counted;
- on a green run, the claim: how many feature docs are held, how many lack Fit against which baseline, how many
  of the rest reuse nothing, show no numbers and add nothing new, and how many files are not feature docs. These
  are the ways a doc can answer without saying much, counted where every `pnpm meta` output shows them.

**Known-bad fixture** `ci/fixtures/known-bad/f2/`, one case per reason, each with its `expected.json`:

| case | holds | expects |
|---|---|---|
| `missing` | a shipped doc with no `## Fit`, baseline 0 | exit 1, `fit/missing` |
| `template-untouched` | a shipped doc whose Fit is the template's section, byte for byte | exit 1, the three `fit/unfilled/*` |
| `label-absent` | a shipped doc whose Fit has no `New:` line | exit 1, `fit/unfilled/new` |
| `bullets-empty` | `Numbers:` followed by bullets with nothing after the mark | exit 1, `fit/unfilled/numbers` |
| `nothing-and-none` | `Reuses:` one `nothing` bullet, `New: none` | exit 1, `fit/unfilled/new` |
| `label-marked` | `- Reuses:` and `**Numbers:**` in place of the labels | exit 1, `fit/unfilled/reuses`, `fit/unfilled/numbers` |
| `unknown-status` | `status: review`, no Fit | exit 1, `fit/missing` |
| `status-case` | one doc `status: Draft` with no Fit, one shipped with no Fit | exit 1, `fit/missing` for the shipped one only |
| `no-frontmatter` | a feature doc with no frontmatter, Fit filled | exit 1, `frontmatter/unreadable` |
| `no-status` | frontmatter with no `status:`, Fit filled | exit 1, `frontmatter/unreadable` |
| `reviewed-draft` | a draft with no Fit, and a review in `docs/reviews/` naming it | exit 1, `fit/missing` |
| `scheduled-draft` | a draft with no Fit, cited by an active milestone's Contents | exit 1, `fit/missing` |
| `fenced-heading` | a `## Fit` in a fenced block (the template, quoted) above the doc's own filled Fit | exit 1, the three `fit/unfilled/*` |
| `above-nonzero` | 3 counted docs, baseline 2 | exit 1, a finding for each of the 3 |
| `no-baseline` | a shipped doc with Fit filled, no `ci/baselines.json` | exit 2, `broken` starting "ci/baselines.json has no feature-fit count" |
| `baseline-not-a-number` | the same, `"feature-fit": "3"` | exit 2, the same start |

Green cases live in `scripts/f2.test.mjs`, run by `pnpm meta`, through the command: no feature doc at all; a
draft with no Fit, no review and no schedule; a shipped doc with Fit filled, baseline 0; a count equal to a
baseline of 2, the two docs as warnings; a count below it, with the `--update` line; a file that is not a
feature doc, warned and not counted; a companion doc, not counted; `dev/features/` present and absent; the claim
line's counts; `--update` at 2 against 3 writes 2; `--update` at 3 against 2 refuses and writes nothing.

**Wiring.** `pnpm meta` in `package.json` runs `node ci/checks/meta/f2-feature-fit.mjs .` beside F1, and
`node scripts/fit.test.mjs`, `node scripts/ratchet.test.mjs` and `node scripts/f2.test.mjs`.
`.github/workflows/ci.yml` runs `pnpm meta` already. PC1 picks the fixture up by its folder name.

**Slipway's own tree.** `dev/features/concept-audit.md` (shipped), `dev/features/landing-page.md` (reviewed)
and `dev/features/design-before-screens.md` (reviewed) each gain a filled Fit in the PR that adds F2; a Fit edit
moves no `Version:` (D-041's list is Contract, Acceptance and Verify), so their reviews stay current. A held doc
that another open pull request is editing is not backfilled there: at that PR's head this is
`tests-can-fail.md` (reviewed; #433 edits it). Slipway's `ci/baselines.json` records the count F2 gives at that
PR's head, 1, and the PR names each doc it counts; the count goes to 0 when that doc lands its own Fit.
`dev/features/landing-page-qa.md` is not a feature doc and is warned on every run.

### 5. The skills, and who reads Fit

- **`.claude/skills/log-feature/SKILL.md`.** Phase 3 (What already exists) gains the search Fit needs: for each
  number the feature will show, where it is already calculated; for each surface (a page, a drawer, a dialog, a
  list), the feature that last built one and how. It searches the code, then the Fit sections of every doc in
  `Feature docs dir` on the default branch and in open pull requests, draft or not. Phase 4's feature-doc list
  gains **Fit**: the three lines, filled from Phase 3, never from memory. The skill is 297 lines against a cap of
  300 (`scripts/skills.test.mjs:29`); room is made by rewording, no rule is dropped, and that file's pins hold
  it. One new pin: that `/log-feature` fills `## Fit` from Phase 3's search before proposing anything new.
- **`process/cold-review.md`** gains one checklist line: the diff against the Fit of the doc the issue embeds:
  each `Reuses:` path is used, and each number is computed where `Numbers:` says. That file asks for a lesson
  behind a new line; the lesson is added under `process/lessons/` with it, and says the failure it names is
  expected, not yet seen (Problem). One new pin in `scripts/skills.test.mjs`.
- **`.claude/skills/review-doc/SKILL.md`** step 2 gains one sentence: a Fit line is a claim about the code, so it
  is verified like one. Step 1 gains a stop, beside the one for a doc with no `Version:` line: a feature doc
  with no filled Fit (no `## Fit`, a label absent, or a placeholder left in one) is not reviewed as it is. The
  review would hold it (§2, rule 3) and turn the reviewer's own pull request red on a file a reviewer never
  edits. The skill stops and says the doc's author fills Fit first, or a session the owner opens for it when
  the author's is gone; the reviewer never does. A Fit edit moves no `Version:`. Two new pins: the sentence and
  the stop.
- **`.claude/skills/close-milestone/SKILL.md`** §4 step 2 gains one line: a doc marked shipped has its Fit
  filled first, from the search, since the check holds it from that commit. One new pin.

- **`.claude/skills/log-bug/SKILL.md`**, the doc stub step, gains one sentence: a doc the step writes, or
  extends and sends to review, has its Fit filled before the step's commit. The feature is already built, so the
  three lines are read from its code as Phase 2 traced it (what it reuses, with paths; where each number it
  shows is calculated), never from memory. When the trace shows nothing shared, the stub gives the short
  answers any doc may, under the same rules (§2), and F2's claim line counts them like the rest. D-040's one
  block is not sent to review and leaves Fit as it is. The skill is 300 lines against the cap of 300; room is
  made by rewording or trimming, the cap is not raised and no rule is dropped. The cap counts lines, not their
  length: a sentence appended to a line already there keeps the count, so the cap does not show that room was
  made. One new pin.

### What is reused

See `## Fit` above; this doc is the section's first instance, and the build reads it as the worked example.

`ci/**`, `package.json` scripts, `dev/ownership.yaml`, `scripts/new-project.mjs`, `process/cold-review.md` and
`.claude/skills/**` are owner-only: the build asks the owner before each edit, and each PR lists the files under
`## Gate changes`. The owner said yes on 2026-10-12 to this doc naming the three reviewer files of §5, and on
2026-10-13 to it naming `/review-doc`'s stop and `/log-bug`'s sentence; the edits themselves are still asked for
when they are made.

### Order and overlap

#268 (the same template and skill) closed on 2026-10-11, so the build takes `main` as it is; the template's
`Version:` line and its paragraph sit between the title and `## Problem`, and Fit goes after `## Problem`. #284
(what "shipped" may claim for a doc with an owed section) is related and left alone: Fit reads `status:` as #284
leaves it. `package.json`'s `meta` line changes in most pull requests: each build PR merges `main` before it is
marked ready.

Verified against: 0eb12fc 2026-10-12 — `docs/features/TEMPLATE.md` (no `## Fit`; `Version:` line under the
title), `ci/checks/meta/f1-feature-coverage.mjs` (PRD-gated; the citation pattern at line 53),
`ci/checks/meta/id1-ids.mjs` (`FEATURE_DIRS`, the two names skipped, `companion-of:`, no subfolder),
`ci/checks/lib/markdown.mjs` `section()` (first heading wins, fences not skipped), `ci/checks/lib/frontmatter.mjs`
`frontmatter()` and `PLACEHOLDER` (no case folding; `\bTBD\b` is in it), `ci/checks/lib/review-header.mjs`
`reviewProvenance()`, `ci/checks/lib/milestones.mjs` `readMilestones()` and `contents()`,
`ci/checks/lib/report.mjs` (0 scanned is BROKEN; a BROKEN run reports no findings; warnings never fail),
`ci/ratchet.mjs` (its four outcomes; no shared helper; no test; `ci/baselines.json` absent in slipway),
`ci/checks/meta/pc1-positive-control.mjs` (one case per subfolder; a BROKEN case pinned by the start of its
message), every file under `ci/checks/meta/` calls `process.exit`, `scripts/sync.mjs` (`KINDS`; a seeded path
the manifest lacks is an `add` of slipway's bytes or a `collision`; `merged: key updated` is resolved through
the `package.json` scripts derivation), `scripts/new-project.mjs` (writes `process/anchor` itself),
`dev/ownership.yaml` (no row for `ci/baselines.json`; `ci/exceptions.yaml` seeded above `ci/**`),
`.github/workflows/ci.yml` (runs `pnpm meta`), `dev/features/*.md` (16 files: 14 draft, 1 shipped,
`landing-page-qa.md` with no frontmatter and no `F-<n>` heading, `landing-page-claims.md` a companion),
`docs/reviews/` (reviews name `landing-page.md`, `tests-can-fail.md`, `design-before-screens.md` and this doc),
`.claude/skills/log-feature/SKILL.md` (297 lines), `scripts/skills.test.mjs:29` (`MAX_LINES = 300`),
`.claude/skills/close-milestone/SKILL.md` §4 step 2, `ci/status.mjs:105` (reads `decisions.md`), no `f2` under
`ci/checks/**` or in `ci/exceptions.yaml`, the word `Fit` in none of `process/cold-review.md`,
`.claude/agents/*.md` or the review-doc and close-milestone skills.

Verified against: 2259472 2026-10-13 — for what 0.3 adds, nothing else re-read: `.claude/skills/log-bug/SKILL.md`
(300 lines; its doc stub step writes from the template, adds the Contents item, commits and runs `pnpm meta`, and
the review follows; D-040's one block), `.claude/skills/review-doc/SKILL.md` step 1 (the stop for a doc with no
`Version:` line; "a reviewer never edits its target"), `scripts/skills.test.mjs` (`log-bug` is at the cap of
300), no open pull request on this doc, its reviews or those two skills.

## Seams

none: developer tooling; adds no person, channel or promise to a project's product. The one promise is
slipway's own, to projects: a sync never turns a doc red for a section that did not exist when it was written.

## Threat model

none beyond baseline. F2 reads committed markdown and one JSON file, a plain file or it is refused, and writes
nothing unless `--update` is
passed by hand; sync writes the baseline through the same `land()` path as every other row. A feature doc is
other people's content in a PR (the trust line, D-023): a label whose text is a placeholder or empty is
unfilled. What holds a doc is partly outside it (a review, a milestone's Contents) and partly its own word
(`status:`). A doc held only by its own `status:` leaves the count when that word is changed; the change is a
line in the diff, and a reviewer reads it. A `ci/baselines.json` raised by hand in a PR is visible in the diff,
as the other ratchets' are.

## Known limitations

- F2 holds that each line is there and filled, not that it is true. Truth has two named readers (Contract §5):
  the cold reviewer of the build PR, and `/review-doc`. Both are instructions; nothing fires when one is skipped.
- A Fit edit moves no `Version:` (D-041). A review that read Fit holds it until Fit is next edited; the build
  PR's cold review reads it again against the diff.
- The search in `/log-feature` is an instruction in a skill, and nothing fires on it. Two features shaped in the
  same week can each search, each find nothing, and each write a true `New:` line. F2 never compares two docs;
  two paths for one number are found by #49's pass.
- Fit is text. A pattern described in other words ("the side sheet" for the drawer) is not matched by the search.
- The short answers (`nothing`, `none shown`, `none`) pass, each alone. They are counted on F2's claim line, not
  refused. A doc that stays `draft`, unreviewed and unscheduled, is never held.
- The count ratchets down. At rest it names the docs behind it as warnings; it does not say which to fill first.
- A filled Fit leaves the baseline above the count until `--update` is run on `ci/baselines.json`, an owner-only
  file. F2 says to run it on every run while the count is below the baseline; no skill sentence repeats it (the
  sentences that fill a Fit in `/log-bug`, `/close-milestone` and before `/review-doc` included). While the
  baseline is above the count there is room: that many docs can
  become held with no Fit and the check stays green. The room grows by one for each Fit filled and not locked
  in, so it can get as large as the count sync first recorded.
- `--update` with no count recorded writes whatever the count is: the one path with no ratchet. The check's
  BROKEN message names the command. In a project the file is owner-only and sync records the count; a key
  removed and written again shows in the diff, as a count raised by hand does.
- A project that uses `status:` words beyond `draft` and `shipped` has every other word held. That is the strict
  reading (decision-defaults §5).
- F2 reads `docs/features/` and `dev/features/`, as ID1 does. A project whose `Feature docs dir` setting names
  another folder has its docs unread by both; the claim line names the folders read.
- A label's text, and an item under it, counts as filled only when it holds a letter or a digit, once characters
  nobody sees are taken out. A value written as a symbol only (a dash, a tick) reads as unfilled: counted, never
  passed. It covers characters nobody sees, except at a list mark (below), and bare list marks; it does not
  cover a numbered mark alone (it holds a digit), markup a renderer shows as nothing, or a placeholder with a
  character nobody sees inside it. Each of those is text in the diff a reviewer reads.
- The short answers are read with characters nobody sees removed, and nothing else folded: `nothing` and `none`
  in another form (another list mark, emphasis, a look-alike letter) are not the short answers, so a doc that
  gives them that way is not counted among them. A character nobody sees placed at a bullet's list mark hides
  `nothing` from that reading, so a doc that reuses nothing and adds `none` can pass (the owner, 2026-10-14).
  Every other form does the same: the rule that refuses `nothing` beside `none` reads the plain form only, so
  either answer given in another form passes. Each is text in the diff a reviewer reads.
- "A letter" is Unicode's: a few visible marks it counts as letters (an iota subscript, isolated Arabic vowel
  marks, halfwidth voiced kana marks) fill a label on their own.
- The 300-line cap on a skill counts lines, not their length. A sentence appended to a long line keeps the
  count, so "≤ 300 lines" does not fail when a skill at the cap gains a sentence; a reviewer reads the diff.
- A line of a label's text longer than 5,000 characters reads as unfilled, and the finding says the line is not
  filled in, not that it is too long. The cap bounds what the reader does per line; over it the reader refuses
  rather than guesses, so such a doc is counted, never passed. Wrap the line.
- `PLACEHOLDER` also matches the word `TBD`: a filled line that mentions it reads as unfilled. One definition of
  "unfilled" is kept over a second.
- A doc that becomes held on the default branch between a sync's count and that sync's merge lands one above the
  recorded count. The sync pull request's own run shows it before merge; the way out is that doc's Fit.
- The computed row is the first file sync computes, and the only one; a second is where the `migrations/` runner
  `dev/features/template-sync.md` → Out of scope foresaw gets built.
- As built, beside the Contract at 0.4 (`docs/reviews/2026-10-14-feature-fit-0.4.md`, AR-1, AR-4, AR-5). Sync
  refuses a `ci/baselines.json` not in slipway's form at the plan, as it refuses one that is not JSON, so no
  "count recorded" row is shown for it (§3's table puts the refusal at `--apply`). An `--update` run prints only
  the count it recorded, or its refusal, never the warnings or the claim (§4, "every run that is not BROKEN").
  §1 cites `PLACEHOLDER` at `frontmatter.mjs:30`; it is at line 51, read through `hasPlaceholder()` (this doc's
  Fit). `Reuses:` text on the label line, or unmarked before the first bullet, is an item too, and backticks are
  removed before `nothing` is read (§2 says "every bullet"). A doc held only for having no status line and with
  no section has two reasons, `frontmatter/unreadable` and `fit/missing`, so two warning lines (§2 says one).
  The readings are pinned in `scripts/fit.test.mjs`. Three of §3's sentences are worded to be true of every doc
  they count (#430 item 4): a `*.md` in either folder that is a link or a folder (or another entry that is not a
  file) gets a sentence of its own, "1 entry named `*.md` in docs/features/ is a link or a folder, not a file, so it
  is not read and not counted.", not "having no F-number heading", which is true only of a file; a draft "has no
  Fit section filled in yet", since one may have the section with nothing in it; and a doc counted for its header
  "has no readable status line", since one may have the line with nothing after it.
- `/log-bug`'s stub sentence says the Fit is filled "from the code as Phase 2 traced it"; the Acceptance line says
  "from the feature's code". Both name the same code, since the stub step's first line makes the doc the feature's;
  the skill is at the 300-line cap, so its wording stays (#430 item 16).
- Node 23 and 24's `JSON.parse` (seen on v23.10.0 and v24.12.0, not on v20.17.0 or v20.19.6) reads a one-character
  name written as an escape (`"\n"`, `"\u0001"`) as `"\\"` once the process has parsed an object with a `"\\"`
  name at the same place, and one `ci/baselines.json` can hold both. Sync compares bytes, so it refuses such a file
  as not in slipway's form, though it is. The two `--update` commands refuse to rewrite it, and refuse any file
  whose rewrite would lose or change an entry: a name given twice, bytes that are not UTF-8, a number JSON does not
  write back as read (`1e400`, a whole number past 2^53), a link (#430 item 7 and its review). F2's refusal is its
  BROKEN line; `ci/ratchet.mjs`'s prints a stack trace under the message. The way out is fixing the entry by hand.
  A fraction is written back as the number it reads as: one with more digits than a number holds is rounded, and
  one too small to hold (`1e-400`) becomes 0. The writer checks the file by
  reading it again, not the caller's own earlier read: the bug depends on what the process parsed before, so the
  two reads could differ. Neither command has been seen to (thousands of generated files, #430's review), and
  checking the caller's object would refuse `new-project`, which writes a fresh file over slipway's copy.
- What #430's second pull request decided and left (items 2, 3, 8–13, 19, 20). Each reader the count goes through
  opens a file only when it is a regular file reached through no link at any depth, and reads a folder only when it
  is a folder reached through none. A feature folder, `docs/reviews/` or `docs/milestones/` that is not, or a
  milestone file that is not, is never read: F2 is BROKEN naming it, sync refuses naming the folder, MS1 and ID1 name it. A single `*.md` in
  a feature folder that is a link stays a warning (§2: named, not counted), and a review file that is a link is left
  out of the count (R1 names it). `pnpm status`, F1, DC1, K1, the work-order page and the roadmap page leave a refused milestone file out
  without a line of their own; MS1, run by every `pnpm meta`, is where it shows. `ci/ratchet.mjs` still reads the
  tool's report through a link: the report is the tool's own output, at a path the project's script names.
  Fit is read as GitHub shows it only in part, and where the reader cannot tell, the strict way (the owner's call,
  2026-10-15, after review rounds found holes in closer readings). A comment is read only on lines of its own: its
  `<!--` opens a line (up to three spaces before it) and its `-->` ends one, the HTML block GitHub hides whole, so
  those lines are hidden here too, and a placeholder inside one still counts as the template's. Any other `<!--` in
  the Fit or above it (mid-line, after a list or quote mark, in code, or with no `-->`) the reader cannot tell from
  text, so the doc is counted as `fit/unfilled/unreadable`; a `<!--` meant as text belongs after the Fit. An ATX
  heading ends a label's text, and a setext heading (a label line with an underline included) ends the section. A
  character reference, an HTML tag (in a code span too), a link with no text and a link reference definition say
  nothing. A numbered item or a quote line above an underline is a heading, and a character reference that shows a
  character (`&amp;`) says nothing: each is read the strict way, counted rather than passed. A lone `-` under a line
  of text is read as an empty list mark, not the setext underline GitHub makes of it, so a label above such a
  heading can pass: text in the diff a reviewer reads. Other shapes a renderer hides (a collapsed `<details>`, an image with no alt text, an
  HTML block) are read as text. A heading or citation holding a run of more than 32 combining marks (the halfwidth
  voiced marks counted as marks) is folded a piece at a time, the run reordered within each piece only, which no id
  or heading mark depends on. `ci/checks/lib/yaml-list.mjs`'s line
  patterns are left as they are: it refuses a line with a line break inside before matching, so each reads a line once.

## Acceptance

```
Given docs/features/TEMPLATE.md
Then  it has a `## Fit` section after `## Problem` with the lines `Reuses:`, `Numbers:`, `New:`, and
      scripts/fit.test.mjs shows the text of each of the three matches PLACEHOLDER

Given a shipped doc whose Fit is that section byte for byte, and ci/baselines.json with feature-fit 0
When  node ci/checks/meta/f2-feature-fit.mjs <dir>
Then  exit 1 with `<doc>#fit/unfilled/reuses`, `<doc>#fit/unfilled/numbers`, `<doc>#fit/unfilled/new`

Given a shipped doc with no `## Fit`, baseline 0
Then  exit 1 with `<doc>#fit/missing`, the detail naming the doc and the next action without a check id

Given each of: a Fit with no `New:` line; `Numbers:` with only empty bullets; `- Reuses:` in place of the label;
      `Reuses:` one `nothing` bullet with `New: none`, no character nobody sees at its list mark
Then  exit 1 with the `fit/unfilled/<label>` id Contract §4's fixture table gives that case, and no other

Given a draft with no `## Fit`, no review and no milestone citing it
Then  exit 0, and the doc is not counted

Given a draft with no `## Fit` that a review in docs/reviews/ names, or that an active milestone's Contents cites
Then  exit 1 with `<doc>#fit/missing`

Given a doc with `status: review`; given one with `status: Draft`
Then  the first is held and counted; the second is a draft

Given a feature doc with no frontmatter, or with frontmatter and no `status:`, Fit filled, baseline 0
Then  exit 1 with `<doc>#frontmatter/unreadable`

Given a file in docs/features/ with no `F-<n>` heading, and a companion doc, neither with a Fit
Then  exit 0; the first is a warning line and is in the claim's count of files that are not feature docs; neither is counted

Given no feature doc at all and feature-fit 0
Then  exit 0 with the claim "no feature doc is held yet"

Given a shipped doc with Fit filled and no ci/baselines.json, or a feature-fit that is not a whole number
Then  exit 2, the message starting "ci/baselines.json has no feature-fit count" and naming the --update command

Given 2 counted docs and feature-fit 2
Then  exit 0, each of the 2 a warning line per reason; given feature-fit 3, exit 0 and an `F2:` line saying to
      run --update, and `--update` writes 2

Given feature-fit 2 and a third counted doc
Then  exit 1 with findings for all 3, and `--update` exits 1, names 2 and 3, and writes nothing

Given ci/fixtures/known-bad/f2/ with the sixteen cases of Contract §4
Then  node ci/checks/meta/pc1-positive-control.mjs is green, and every other expected.json under ci/fixtures/ is unchanged

Given ci/ratchet.mjs at the commit before ci/checks/lib/ratchet.mjs exists
Then  scripts/ratchet.test.mjs pins, through the command, its four outcomes and its --update refusal (exit codes
      and messages), and the same file passes unchanged after ci/ratchet.mjs calls the helper

Given ci/checks/meta/id1-ids.mjs before and after it imports ci/checks/lib/feature-docs.mjs
Then  scripts/id1.test.mjs and PC1's id1 cases pass unchanged on both sides

Given slipway's own tree at the head of the PR that adds F2
Then  concept-audit.md, landing-page.md and design-before-screens.md have a filled Fit, ci/baselines.json holds
      the count F2 prints (1, tests-can-fail.md), the PR names each doc counted, landing-page-qa.md is a warning
      line, and pnpm meta exits 0

Given a project with 3 held docs and no Fit, 2 unheld drafts with no Fit, 1 file that is not a feature doc, and no ci/baselines.json
When  pnpm -s use-slipway sync --plan
Then  the plan shows ci/baselines.json as "count recorded" with the three sentences of Contract §3 (3, 2, 1) and no
      check id; --apply writes {"feature-fit": 3} and prints 3; a second sync shows the file unchanged

Given a project whose ci/baselines.json holds its own keys and no feature-fit, in the form slipway writes
Then  --apply adds feature-fit and every other key is byte for byte as it was; with "feature-fit": "x", the key is
      set to the count; with the same keys in another form, or a file that is not JSON, sync refuses, names the
      file, and writes nothing anywhere

Given a project whose ci/baselines.json already holds a whole-number feature-fit, and slipway's own copy changed
Then  the plan shows the file unchanged, never as slipway's template changed and never as a collision

Given a fresh new-project
Then  ci/baselines.json is {"feature-fit": 0}, whatever slipway's own copy holds, and O1 exits 0 on the new row

Given .claude/skills/log-feature/SKILL.md
Then  it is ≤ 300 lines, Phase 3 names the number and surface search and where it looks, Phase 4 lists Fit among
      the doc's sections, and scripts/skills.test.mjs pins the sentence that Fit is filled from the search before
      anything new is proposed

Given process/cold-review.md, .claude/skills/review-doc/SKILL.md and .claude/skills/close-milestone/SKILL.md
Then  each carries its sentence of Contract §5, scripts/skills.test.mjs pins all three, and the lesson behind the
      cold-review line passes L1

Given .claude/skills/log-bug/SKILL.md and .claude/skills/review-doc/SKILL.md
Then  the first is ≤ 300 lines and its stub step fills Fit from the feature's code, before its commit, in a doc it
      writes or sends to review; the second's step 1 stops on a feature doc with no filled Fit; and
      scripts/skills.test.mjs pins both sentences
```

## Verify

```
node scripts/ratchet.test.mjs                               # the command's four outcomes and its refusal
node scripts/fit.test.mjs                                   # held, lacks, the counts; the template's lines match PLACEHOLDER
node scripts/id1.test.mjs                                   # unchanged by the move
node scripts/sync.test.mjs                                  # the computed ci/baselines.json row
node scripts/new-project.test.mjs                           # {"feature-fit": 0} written, not copied
node ci/checks/meta/f2-feature-fit.mjs .                    # exit 0, the claim names the counts and the baseline
node ci/checks/meta/pc1-positive-control.mjs               # green, sixteen f2 cases listed
node scripts/f2.test.mjs                                   # the green cases, through the command
node scripts/skills.test.mjs                               # ≤ 300 lines; the Fit sentences pinned
wc -l .claude/skills/log-feature/SKILL.md                  # ≤ 300
git diff --stat main -- 'ci/fixtures/**/expected.json'     # only ci/fixtures/known-bad/f2/** added
pnpm meta
```

Owner probes, each in a scratch project:

- **Step 1, before its PR is marked ready** (D-036's condition). The build session makes the project, outside
  the repository, and no session deletes it. It holds a shipped doc and a reviewed draft with no Fit, a draft
  with no Fit that is neither reviewed nor scheduled, and one file that is not a feature doc; it syncs from
  step 1's branch. The session runs `sync --plan` and shows the output, with what `/sync-slipway` relays of it
  (AR-4); the owner runs `--apply` in their own terminal, from one pasted command. The owner reads three things:
  the plan shows `ci/baselines.json` as "count recorded" with the three sentences of Contract §3 (2, 1, 1) and
  no check id; after `--apply` the file holds the 2 that was printed; a second `sync --plan` shows the file
  unchanged. That second plan cannot run in a project synced from an unmerged branch (sync finds a base only on
  slipway's default branch): it runs after merge, or on a copy whose source has the branch as its default. Their
  yes or no to what they read is the evidence.
- **Step 2.** In a scratch project with one shipped doc and no Fit, synced from step 2's branch: the count is
  recorded at 1 and `pnpm meta` is green there.

## Build map

Three PRs, all `Part of #48`; the last closes it. No sub-issues: #48 is the ticket. **No release is tagged, and
no project syncs from `main`, until the third has merged**; each PR body says so. A project synced after the
second and before a release that carries all three is held to a section its skills do not yet tell it to write.
A scratch project made for an owner probe (Verify) is not a project for this rule.

1. **The count, and sync.** `scripts/ratchet.test.mjs` first, in its own commit, against today's `ci/ratchet.mjs`;
   then `ci/checks/lib/ratchet.mjs` (with `ci/ratchet.mjs` calling it), `ci/checks/lib/feature-docs.mjs` (with
   ID1 importing it), the citation pattern in `ci/checks/lib/milestones.mjs` (with F1 calling it),
   `ci/checks/lib/fit.mjs`, `scripts/fit.test.mjs`; `scripts/sync.mjs`'s computed row, `scripts/sync.test.mjs`;
   `scripts/new-project.mjs` and its test; the `dev/ownership.yaml` row and legend; `package.json` `meta` for the
   two new test files — checks, new-project and sync, ~M. Leaves #48 open. No check reads the count yet, so
   nothing can go red in a project. **The owner's condition sits here** (D-036): if sync cannot show and write
   the count cleanly, the build stops with nothing live to back out, and the question comes back. What answers
   it is the owner's probe for step 1 (Verify), run before this PR is marked ready, in a scratch project the
   session asks before making, made from the newest release (not from this branch, whose `new-project` already
   writes the count), given its docs and a review file, committed, then synced from the branch: their yes or no
   to what they read, in their words, goes in the PR's `## Verification`. On a no the PR is not merged.
   Carried from the 0.2 review: AR-4, check what `/sync-slipway` shows the owner of the count (it reads the plan
   as JSON) against the code and pin it with a test.
   Carried from the 0.2 review, by its Tracker column (AR-6 of the 0.3 review): AR-7, `scripts/sync.test.mjs`
   gives the row a file that is not already two-space JSON; AR-10 items 1, 2, 3 and 5 (a `Reuses:` with no
   bullets, backticks on `nothing`, how a review's path is compared, what sync's install record holds for the
   path), each decided against the code and pinned in `scripts/fit.test.mjs` or `scripts/sync.test.mjs`.
2. **The section and the check.** `docs/features/TEMPLATE.md` → `## Fit`; F2; `ci/fixtures/known-bad/f2/**`;
   `scripts/f2.test.mjs`; `package.json` `meta`; `concept-audit.md`, `landing-page.md` and
   `design-before-screens.md` backfilled (`tests-can-fail.md` in step 3, after #433); slipway's
   `ci/baselines.json`; the release note line — checks, ~M. Leaves #48 open.
   Carried from the 0.2 review: AR-6, check each clause of "held" the fixtures do not reach (a closed milestone, a
   shaping or killed one, a review of another doc, a review that is not current) against the code and pin it
   with a test.
   Carried from the 0.2 review, by its Tracker column (AR-6 of the 0.3 review): AR-8, `scripts/f2.test.mjs` pins
   what a BROKEN run prints, and the `--update` path with no baseline is named in this PR's known limitations;
   AR-9, the Problem's three numbers are corrected, here and in #48; AR-10 item 4 with the second half of AR-2,
   F2's finding says why a doc is held; AR-10 item 6, a `ci/baselines.json` that is not JSON, met by F2.
   Carried from the 0.3 review: AR-2, F2 prints, on every run that is not BROKEN, one named line for each draft
   not yet held that would lack Fit, so `pnpm meta` before a review says whether the doc would be counted. AR-3,
   each backfill in this PR is locked in with `--update` in the same PR, named under `## Gate changes`, so
   slipway's baseline equals its count at the PR's head. AR-7 item 5, this PR's body says that until step 3
   merges a first review of a slipway draft nothing holds yet turns that review's pull request red on
   `fit/missing`, with no skill saying why.
3. **The skills and the readers.** `/log-feature` Phase 3 and 4, within 300 lines; `/log-bug`'s stub step,
   within 300 lines; the lines in `process/cold-review.md` (with its lesson), `/review-doc` (its sentence and
   its stop) and `/close-milestone`; `scripts/skills.test.mjs` pins — skills and rules, ~S. Closes #48.
   Carried from the 0.2 review, by its Tracker column (AR-6 of the 0.3 review): AR-10 item 7, "the Fit of the
   doc the issue embeds" is made exact (the reviewer opens the doc at the pull request's head, or `/log-feature`
   embeds Fit beside the Contract); the smaller item of AR-6, the pin for the cold-review sentence.
   Carried from the 0.3 review: AR-1, check the stub step's reach against `/log-bug`'s Phase 2 and the doc it
   writes, and pin what the sentence says is read. AR-2, the stop's wording is checked against Contract §2's
   table, case by case, and pinned. AR-3, each sentence that fills a Fit in a doc already counted (`/log-bug`,
   `/close-milestone`, the author before `/review-doc`) is checked for who runs `--update`, and what is found is
   pinned or named in this PR's known limitations. AR-7 item 5, this PR's body says the window step 2 opened in
   slipway's own tree is closed.

## Out of scope

- Automated detection of a second implementation in code: declined (#48's own out-of-scope line);
  `/log-feature`'s search by behaviour is the manual version.
- A written-reason exemption line (rejected above): nothing would count the docs that took it.
- Comparing the Fit of two docs, and a row in `docs/conventions.md` for each new surface when its doc ships: a
  second place for one fact. #49 is where two paths for one number are found.
- Fit moving a doc's `Version:`: D-041's list stays Contract, Acceptance and Verify.
- Reading the feature docs folder from the `Feature docs dir` setting: F2 and ID1 read the two fixed folders.
- A `migrations/` runner for sync (`dev/features/template-sync.md` → Out of scope): the computed row here is
  one path; the runner comes with the second.
- A consolidation pass over docs without Fit beyond the three backfilled in step 2: #49 (after #48).

## Open questions

- ~~Where the check lives, what it scans, the shape of Fit, its placement, whether #48 gets sub-issues~~ —
  answered by the orchestrator session 2026-10-08 (Contract §1, §4; Build map).
- ~~What a project meets on sync for docs written before the section existed~~ — the owner, 2026-10-08: the
  count is recorded by sync and may only go down (D-036, Contract §3).
- ~~When a doc is first held; whether `Serves:` stays; who reads Fit for truth~~ — the owner, 2026-10-12: from
  its review or its schedule; dropped; the cold reviewer, `/review-doc` and `/close-milestone` are told (D-036 as
  amended; Contract §2, §1, §5).
- ~~Whether the build waits for a pass that looks for the drift Fit is meant to stop~~ — the owner, 2026-10-13:
  it does not; #49's first pass reports what reopens it (D-036 as amended; Problem).

## Changes

- 2026-10-08 · ADDED · shaped from #48 before any code · PR for #48
- 2026-10-12 · MODIFIED · 0.2: the fifteen findings of `docs/reviews/2026-10-12-feature-fit-0.1.md` resolved.
  The owner's: a doc is held from its review or its schedule, not only once shipped (AR-1); `Serves:` dropped,
  Fit is three lines (AR-14); the cold reviewer, `/review-doc` and `/close-milestone` are told to read Fit
  (AR-5, AR-10). Advised by the orchestrator session and taken: what a feature doc is, as ID1 reads it, with
  other files warned and not counted and a doc with no `status:` counted inside the ratchet (AR-3); where
  `/log-feature` searches (AR-6); the short answers counted on the claim line (AR-7); the build order turned
  round, sync first (AR-8); the plan's sentence for drafts (AR-10). The author's: placeholders in the form the
  check knows (AR-2); the denominator (AR-4); the count as a module, a row kind of its own, slipway's bytes never
  shipped (AR-9); a case per clause and the ratchet pinned before the move (AR-11); the eight readings (AR-12);
  re-verified at 0eb12fc (AR-13); the evidence said to be an expectation, "deferred" made "declined" (AR-15) ·
  PR for #48
- 2026-10-13 · MODIFIED · 0.3: four findings of `docs/reviews/2026-10-12-feature-fit-0.2.md`, and no other edit
  to Contract, Acceptance or Verify. The owner's: the build is not held for #49's pass, and that pass reports
  what reopens it (AR-5; D-036 as amended 2026-10-13); the spec names `/review-doc`'s stop and `/log-bug`'s
  sentence. Advised by the orchestrator session and taken: a bug stub is held like any doc and `/log-bug` fills
  its Fit from the feature's code (AR-1); `/review-doc` stops on a feature doc with no filled Fit (AR-2); the
  owner's probe before step 1's PR is ready is the evidence for D-036's condition (AR-3). Carried into the
  build with no Contract change: AR-4 (step 1), AR-6 (step 2). AR-7 to AR-10: the review's Tracker column ·
  PR for #48
- 2026-10-13 · MODIFIED · Version stays 0.3: the seven findings of `docs/reviews/2026-10-13-feature-fit-0.3.md`
  placed, with no change to Contract, Acceptance or Verify. The owner's: what reopens the choice is made exact
  (AR-4; Problem, D-036 as amended 2026-10-13, #49's acceptance, #423). Carried into the Build map, one line
  under each step: AR-1, AR-2, AR-3 (with a Known limitations line), AR-5 (step 1's probe sentence), the six
  items of the 0.2 review that AR-6 names, AR-7 item 5. AR-7 items 1 to 4 wait for the first Contract edit the
  build needs. The review's Tracker cells name where each went · PR for #48, build step 1
- 2026-10-14 · MODIFIED · 0.4: the spec's one correction, made once after build steps 1 and 2, of the sentences
  the build departed from as PRs #429 and #436 list them under "For the Contract correction" (#436 removes one
  of #429's items: the first-column rule now holds on the section's first line). §2: the first-column rule on the
  section's first line, filled as a letter or a digit, the 5,000-character line, how the short answers are read.
  §3: the refusal of a file not in slipway's form (D-036 as amended 2026-10-14), the sentences at 0 and for a
  doc with no status line, the third sentence as built. §4: the BROKEN rows and message, the draft warnings, one
  warning per reason, why a doc is held, slipway's own tree at a count of 1. Threat model, Acceptance, Verify
  (the second plan after merge), Out of scope and two Known limitations sentences to match. Also AR-7 items 1, 3
  and 4 of `docs/reviews/2026-10-13-feature-fit-0.3.md`, which its Tracker held for the first Contract edit
  (advised by the orchestrator session): who sends a stub to review, the pins counted once in §5, and what the
  300-line cap holds, with a Known limitations line · PR for #48, build step 3
- 2026-10-14 · MODIFIED · Version stays 0.4: the seven findings of `docs/reviews/2026-10-14-feature-fit-0.4.md`
  placed, with no change to Contract, Acceptance or Verify. Known limitations: the "as built" line (AR-1 items 1
  and 2, AR-4's §1 citation, AR-5 items 1 and 2), the plain-form reading and Unicode's letters (AR-2), and who
  is told to run `--update`. This doc's Fit refreshed to `main` (AR-4); Build map step 2's backfill list (AR-3).
  The owner's: D-036's 2026-10-14 sentence scoped to `ci/baselines.json` (AR-6). AR-1 item 3 and AR-5 item 3 are
  #430's; AR-7 is in build PR 3's `## Verification` · PR for #48, build step 3
