---
prd-ref: D-036
status: draft
---

# F-12 — Fit: a feature doc says what it reuses and where its numbers live, and a check holds it to that

## Problem

Slipway checks that a feature works (`pnpm verify`) and that it is wanted (FRAME → PRD → feature doc →
milestone, F1). Nothing asks whether it **fits the product it joins**. With several agents building in parallel
the drift is predictable, and the owner named it: the same number calculated a different way in each feature,
and one feature using a drawer where the last used a full page. The duplication ratchet catches copied lines, not
a second way of doing the same thing, and `docs/conventions.md` → "Before writing something new" asks for the
search in the PR, where it is read once and lost.

Evidence: the 2026-09-24 audit behind #43 (now #312) filed #48 from it. In slipway's own feature docs, five of
thirteen already carry an ad hoc "what is reused" list (`deferred-checks.md` → What is reused, `intake-skills.md`
"Reused, not rewritten", `experience-evidence.md`, `next-slice.md`, `cli-output.md`), each in its own shape, and
eight carry none. Two readers of `decisions.md` exist (`ci/status.mjs:84` and `ci/checks/lib/risks.mjs`'s
callers) with a comment in `risks.mjs:2` saying why there is one reader of risks: "so the two can never
disagree". The rule is known; it is not written where a check can hold it. Workaround today: a reviewer notices,
or nobody does. Why now: #312's order puts #48 before the next real project's feature docs are written, so
those docs are born with the section instead of being backfilled.

**Job:** when I shape a feature in a product other features already shaped, I want its doc to say which existing
patterns it reuses and where every number it shows is calculated, so the product does not grow a second way of
doing what it already does.

**Verdict: PROCEED.** The shape #48 asked for, with the rollout the owner chose (the count ratchets down, nothing
goes red on sync). Rejected: do nothing (the search stays in PR prose, read once); Fit as free prose in the
Contract (a check can only hold what it can read; "section present" passes a paragraph that says nothing);
automated detection of a second implementation (out of scope in #48; a text search by behaviour is what
`/log-feature` can do today); a written reason that exempts a doc (nothing would show how many took the exit).

| option | for | against | verdict |
|---|---|---|---|
| do nothing | no new section, no new check | the drift is predictable and nothing fires on it | rejected |
| Fit as labelled lines + a check (the ask) | a check can read labels; the search happens at shaping, where it changes the design | one more section to fill; truth is still the reviewer's | **proceeds** |
| Fit as prose in Contract | no template change | a paragraph that says nothing passes "section present" | rejected |
| semantic duplicate detection in code | catches what the author did not know about | out of scope in #48; no tool slipway can ship zero-dependency | deferred, no condition |

## Fit

Serves: the thesis in `SLIPWAY.md` — a rule exists only where something fires. Fit without F2 is a promise;
F2 is what goes red.

Reuses:
- `section()` and `PLACEHOLDER` in `ci/checks/lib/markdown.mjs:11` and `ci/checks/lib/frontmatter.mjs:30`:
  the section reader every document check uses, and the one definition of "still a template placeholder".
- `frontmatter()` in `ci/checks/lib/frontmatter.mjs:9`: the one reader of `status:`.
- `report()` in `ci/checks/lib/report.mjs:65` and PC1's `expected.json` layout: every check's output and its
  known-bad fixture shape.
- The ratchet's rule in `ci/ratchet.mjs` (above the baseline fails, equal passes, below passes and says to
  lock it in, no baseline is broken), moved into a shared helper so F2 and `ci/ratchet.mjs` compare the same way.
- `scripts/skills.test.mjs`: the pin for every sentence a skill must keep.
- `scripts/sync.mjs`'s `add` row and `package.json`'s structured merge: the two places sync already computes a
  write instead of copying bytes.

Numbers:
- "docs past draft with no filled Fit" is counted once, in F2, over the directories it scans; `sync --plan`
  prints F2's number and `sync --apply` writes it. Nothing else counts it.
- The baseline it is compared against lives in `ci/baselines.json` under `feature-fit`, the file the
  duplication and dead-code ratchets already use.

New: the `## Fit` section itself and the check F2, with the reason above; the shared ratchet helper
(`ci/checks/lib/ratchet.mjs`, searched: nothing under `ci/checks/lib/` compares a number to a baseline); sync
computing one seeded file's content at add time (searched `scripts/sync.mjs` for a computed `add`: the
`package.json` scripts merge is the nearest, and it merges keys, not a count).

## Contract

### 1. The section — `docs/features/TEMPLATE.md`

A new `## Fit` section sits after `## Problem` and before `## Contract`. Under that heading it is four labelled
lines; the labels are what F2 reads, and the text after each is for the reviewer:

```markdown
Serves: <the FRAME question this serves, in one line — or the product's thesis when the FRAME has no question yet>

Reuses:
- <pattern or helper> — <path, or the docs/conventions.md row>
- nothing — searched <what was searched, by behaviour> and found no existing way

Numbers:
- <each number this feature shows> — calculated in <path>, or `none shown`

New: <anything this adds that nothing existing does, with why> — or `none`
```

- `Serves:` names the question in the product frame (`docs/product/FRAME.md`); a frame with no question yet
  gives the product's thesis. One line.
- `Reuses:` one bullet per pattern or helper, each with where it lives (a path, or a row of the conventions
  doc). A feature that reuses nothing says so and names the search it ran, by behaviour.
- `Numbers:` one bullet per number the feature shows a person (a count, a total, a rate, a date it computes),
  each with the one place it is calculated. A feature that shows none says `none shown`. The point is the
  drift #48 names: a number shown in two places is calculated in one.
- `New:` what the feature adds that nothing existing does, and why reuse was not possible; `none` when
  everything is reused.

The template's own lines keep the `<…>` placeholders, so `PLACEHOLDER` (`ci/checks/lib/frontmatter.mjs:30`)
marks an unfilled line without a second definition of "unfilled". A bug-fix stub `/log-bug` writes from the
template starts with the section as the template has it (`status: draft`, so F2 asks nothing of it).

### 2. The check — F2, `ci/checks/meta/f2-feature-fit.mjs`

Runs regardless of the PRD's status: F1 is gated on it and Fit is not, which is why this is a check of its own
and not an F1 case (the orchestrator session's advice, taken). Zero-dependency, reads committed markdown only.

**What it scans.** Every `*.md` under `docs/features/` except `TEMPLATE.md`, and, only when the directory
exists, every `*.md` under `dev/features/` (slipway's own docs; a project has no such directory and is
unaffected). A file whose frontmatter cannot be read is reported, never skipped (fail closed).

**What it counts.** A doc **past draft** is one whose frontmatter `status:` is present and not `draft`
(today the only other value in use is `shipped`; any other value counts as past draft, since the gate must not
pass on a word it does not know). Such a doc **lacks Fit** when the `## Fit` section is absent, or any of the
four labels (`Serves:`, `Reuses:`, `Numbers:`, `New:`) is absent from it, or the text after a label is empty
(the label alone, or its bullets all empty), or that text still holds a placeholder (`PLACEHOLDER`). The count
is the number of docs past draft that lack Fit.

**The baseline.** `ci/baselines.json`, key `feature-fit`, the file `ci/ratchet.mjs` already reads. The rule is
the ratchet's, through a shared helper `ci/checks/lib/ratchet.mjs` that `ci/ratchet.mjs` is changed to call
(one comparison, not two):

| count vs baseline | result |
|---|---|
| above | exit 1, one finding per doc that lacks Fit, each naming the doc, the label that is missing or unfilled, and the next action in the project's words (D-016): "`docs/features/export.md` is shipped and its Fit has no `Numbers:` line — say where each number it shows is calculated, or `none shown`" |
| equal | exit 0; the claim names the count and that it is at its baseline |
| below | exit 0; prints the ratchet's line: the number improved, run F2 with `--update` to lock it in; `--update` writes the lower value and refuses to raise one |
| no `ci/baselines.json`, or no `feature-fit` key, or not a number | exit 2 BROKEN: "ci/baselines.json has no feature-fit count — `node ci/checks/meta/f2-feature-fit.mjs . --update` records the current one" |

A draft doc is never counted, whatever its Fit says: it is still being written. A doc past draft whose Fit is
filled counts nothing. A doc cannot leave draft without Fit once the baseline is 0, and a project whose baseline
is above 0 can mark a new doc shipped only by filling Fit in it or in one of the counted docs: the count may go
down, never up.

**Finding ids,** for the fixture and PC1: `fit/missing` (no `## Fit`), `fit/unfilled/<label>` (one of the four
labels absent, empty or a placeholder; the label in lower case), `baseline/missing` (BROKEN, see above),
`frontmatter/unreadable` (a doc whose frontmatter block is absent or has no `status:`: reported as broken, since
the check cannot tell whether it is past draft).

**Known-bad fixture** `ci/fixtures/known-bad/f2/`, one case per way a doc fails, each with its `expected.json`:
`missing` (a shipped doc with no `## Fit`, baseline 0), `unfilled-empty` (the four labels, `Numbers:` with
nothing after it), `unfilled-placeholder` (`Serves: <…>` left from the template), `no-baseline` (a shipped doc
with Fit filled and no `ci/baselines.json`: BROKEN, `broken` message pinned), `no-status` (a doc with no
frontmatter). Green cases (a draft doc with no Fit; a shipped doc with Fit filled and baseline 0; a count equal
to a baseline of 2; a count below it; `dev/features/` present and absent) live in `scripts/f2.test.mjs`, run by
`pnpm meta`, as `scripts/fo1.test.mjs` does for FO1.

**Wiring.** `pnpm meta` in `package.json` runs `node ci/checks/meta/f2-feature-fit.mjs .` beside F1; `.github/workflows/ci.yml` runs `pnpm meta` already, so it needs no step of its own (confirmed below). PC1
picks the fixture up by its folder name.

### 3. The count on arrival — `scripts/sync.mjs`, `scripts/new-project.mjs`, `dev/ownership.yaml`

The owner's rule (D-036): a project that takes this release is never red on sync for docs it shipped before the
section existed, and never edits the baseline file by hand.

- `ci/baselines.json` gains an ownership row, class `seeded`, above the managed `ci/**` row (as
  `ci/exceptions.yaml` and `ci/before-verify.sh` have). Slipway's own copy holds `{"feature-fit": 0}` once
  `concept-audit.md` is backfilled (build step 1). `new-project` copies it as it copies every seeded file; a new
  project has no shipped docs, so 0 is its true count.
- Sync, for this one path, computes the row instead of copying bytes. A project without the file gets an `add`
  row whose content is slipway's template with `feature-fit` set to F2's count on the project's own docs at that
  moment; a project with the file and no `feature-fit` key gets a `merged: key updated` row that adds the key
  with that count, keeping every other key (its duplication and dead-code baselines are its own); a project with
  the key gets `unchanged`. The plan prints the number in the project's words: "3 shipped feature docs have no
  Fit section yet; the count is recorded at 3 and may only go down." `--apply` writes exactly what the plan
  showed. The count is F2's own function, imported, so the plan, `--apply` and the check cannot disagree.
- The release note for the version that carries this names the row and the number the owner will see.

### 4. The skill — `.claude/skills/log-feature/SKILL.md`

Phase 3 (What already exists) gains the search Fit needs: for each number the feature will show, where it is
already calculated; for each surface (a page, a drawer, a dialog, a list), the feature that last built one and
how. Phase 4's feature-doc list gains **Fit**: the four lines, filled from Phase 3, never from memory, and a
`Reuses: nothing` line names the search. The skill is at its 300-line cap (`scripts/skills.test.mjs:28`): the
build PR says which lines go to make room, and no rule is dropped. `scripts/skills.test.mjs` pins one sentence:
that `/log-feature` fills `## Fit` from Phase 3's search before proposing anything new. `/log-bug`'s stub step
needs no change (a stub is `draft`).

### What is reused

See `## Fit` above; this doc is the section's first instance, and the build reads it as the worked example.

`ci/**`, `package.json` scripts, `dev/ownership.yaml`, `scripts/new-project.mjs` and `.claude/skills/**` are
owner-only: the build asks the owner before each edit, and each PR lists the files under `## Gate changes`
(F2: stricter; the ratchet helper: the same rule, moved).

### Order and overlap

#268 edits the same template and the same skill and sits ahead of #48 in #312's order: #48's build PRs take
`main` after #268 lands, and the version-line answer there is not touched here. #284 (what "shipped" may claim
for a doc with an owed section) is related and left alone: Fit reads `status:` as #284 leaves it.

Verified against: c1b5c8f 2026-10-08 — `docs/features/TEMPLATE.md` (no `## Fit`; sections in the order
above), `ci/checks/meta/f1-feature-coverage.mjs` (PRD-gated, reads no feature doc), `ci/checks/lib/markdown.mjs`
`section()`, `ci/checks/lib/frontmatter.mjs` `frontmatter()` and `PLACEHOLDER`, `ci/ratchet.mjs` (its four
outcomes; no shared helper; `ci/baselines.json` absent in slipway), `ci/checks/meta/pc1-positive-control.mjs`
(fixture layout, one case per subfolder), `scripts/sync.mjs:418-428` (a seeded path the manifest lacks is an
`add` of slipway's bytes, or a `collision` when the project has one), `dev/ownership.yaml` (no row for
`ci/baselines.json`; `ci/exceptions.yaml` seeded above `ci/**`), `.github/workflows/ci.yml` (runs `pnpm meta`),
`dev/features/*.md` (statuses: 12 draft, 1 shipped), `.claude/skills/log-feature/SKILL.md` (300 lines),
`scripts/skills.test.mjs:28` (`MAX_LINES = 300`), no `f2` under `ci/checks/**` or in `ci/exceptions.yaml`.

## Seams

none: developer tooling; adds no person, channel or promise to a project's product. The one promise is
slipway's own, to projects: a sync never turns a shipped doc red for a section that did not exist when it shipped.

## Threat model

none beyond baseline. F2 reads committed markdown and one JSON file and writes nothing unless `--update` is
passed by hand; sync writes the baseline through the same `land()` path as every other row. A feature doc is
other people's content in a PR (the trust line, D-023): a label whose text is a placeholder or empty is unfilled,
and nothing a doc says exempts it. A `ci/baselines.json` raised by hand in a PR is visible in the diff, as the
other ratchets' are.

## Known limitations

- F2 holds that each line is there and filled, not that it is true. A `Reuses:` line that names the wrong
  helper, or a `Numbers:` line that says "calculated in one place" when it is not, passes; truth is the
  reviewer's (the orchestrator session's point, taken).
- Fit is text. A pattern described in other words ("the side sheet" for the drawer) is not matched by
  `/log-feature`'s search; the search is by behaviour and as good as its terms.
- The count ratchets down; it does not say which doc to backfill first. The findings when it goes up do.
- A project that renames `status:` values beyond `draft` and `shipped` has every other value counted as past
  draft. That is the strict reading (decision-defaults §5) and is said in the finding.
- Sync's computed row is the first seeded file whose content is computed, and the only one; a second such file
  is where the `migrations/` runner `dev/features/template-sync.md` → Out of scope foresaw gets built.

## Acceptance

```
Given docs/features/TEMPLATE.md
Then  it has a `## Fit` section after `## Problem` with the lines `Serves:`, `Reuses:`, `Numbers:`, `New:`,
      each still a `<…>` placeholder

Given a feature doc with `status: shipped` and no `## Fit`, and ci/baselines.json with feature-fit 0
When  node ci/checks/meta/f2-feature-fit.mjs <dir>
Then  exit 1 with `<doc>#fit/missing`, the detail naming the doc and the next action without a check id

Given a shipped doc whose Fit has the four labels and `Numbers:` with nothing after it
Then  exit 1 with `<doc>#fit/unfilled/numbers`; with `Serves: <…>` left from the template, `<doc>#fit/unfilled/serves`

Given a doc with `status: draft` and no `## Fit`
Then  exit 0, and the doc is not counted

Given a shipped doc with Fit filled and no ci/baselines.json
Then  exit 2 (broken) naming ci/baselines.json and the --update command

Given 2 shipped docs without Fit and feature-fit 2
Then  exit 0; given feature-fit 3, exit 0 and a line saying to run --update; `--update` then writes 2 and refuses to write 3

Given ci/fixtures/known-bad/f2/ (missing, unfilled-empty, unfilled-placeholder, no-baseline, no-status)
Then  node ci/checks/meta/pc1-positive-control.mjs is green, and every other expected.json under ci/fixtures/ is unchanged

Given slipway's own tree
Then  dev/features/concept-audit.md has a filled Fit, ci/baselines.json holds feature-fit 0, and pnpm meta exits 0

Given ci/ratchet.mjs and F2
Then  both import the comparison from ci/checks/lib/ratchet.mjs, and the ratchet's existing behaviour is unchanged
      (its four outcomes pinned by 1 test)

Given a project checkout with 3 shipped docs and no Fit, no ci/baselines.json, taking this release
When  pnpm -s use-slipway sync --plan
Then  the plan shows ci/baselines.json as an add with feature-fit 3, in the project's words, and --apply writes
      exactly that; a second sync shows it unchanged; a project with its own ci/baselines.json keeps every other key
      (scripts/sync.test.mjs, 3 cases)

Given a fresh new-project
Then  ci/baselines.json is copied with feature-fit 0, and O1 exits 0 on the new seeded row

Given .claude/skills/log-feature/SKILL.md
Then  it is ≤ 300 lines, Phase 3 names the number and surface search, Phase 4 lists Fit among the doc's sections,
      and scripts/skills.test.mjs pins the sentence that Fit is filled from the search before anything new is proposed
```

## Verify

```
node ci/checks/meta/f2-feature-fit.mjs .                    # exit 0, claim names the count and baseline
node ci/checks/meta/pc1-positive-control.mjs               # green, f2 cases listed
node scripts/f2.test.mjs                                   # green cases, the ratchet helper's four outcomes
node scripts/sync.test.mjs                                 # the computed ci/baselines.json row, 3 cases
node scripts/new-project.test.mjs                          # seeded ci/baselines.json copied
node scripts/skills.test.mjs                               # ≤ 300 lines; the Fit sentence pinned
wc -l .claude/skills/log-feature/SKILL.md                  # ≤ 300
git diff --stat main -- 'ci/fixtures/**/expected.json'     # only ci/fixtures/known-bad/f2/** added
pnpm meta
```

Owner probe, in a scratch project with one shipped doc and no Fit: `sync --plan` shows `feature-fit` 1, `--apply`
writes it, and `pnpm meta` is green there.

## Build map

Three PRs, all `Part of #48`; the last closes it. No sub-issues: #48 is the ticket (the owner's "don't open a
new issue", read by the orchestrator session as no children either). Each takes `main` after #268 lands.

1. `docs/features/TEMPLATE.md` → `## Fit`; F2 and `ci/checks/lib/ratchet.mjs` (with `ci/ratchet.mjs` calling
   it); `ci/fixtures/known-bad/f2/**`; `scripts/f2.test.mjs`; `package.json` `meta`; `dev/ownership.yaml` seeded
   row and slipway's `ci/baselines.json`; `dev/features/concept-audit.md` backfilled; `new-project` test — checks,
   ~M. Leaves #48 open.
2. `scripts/sync.mjs` computes the `ci/baselines.json` row; `sync --plan` prints the count; `scripts/sync.test.mjs`;
   the release note line — new-project and sync, ~M. Leaves #48 open. The owner's condition sits here: if sync
   cannot show and write the count cleanly, stop and come back before building further (D-036).
3. `.claude/skills/log-feature/SKILL.md` Phase 3 and 4, within 300 lines; `scripts/skills.test.mjs` pin —
   skills, ~S. Closes #48.

## Out of scope

- Automated detection of a second implementation in code (#48's own out-of-scope line); `/log-feature`'s
  search by behaviour is the manual version.
- A written-reason exemption line (rejected above): nothing would count the docs that took it.
- A `migrations/` runner for sync (`dev/features/template-sync.md` → Out of scope): the computed row here is
  one path; the runner comes with the second.
- `/review-doc` checking Fit's truth: a reviewer's job today; a Fit line in its checklist is #268's territory
  if it lands there.
- A consolidation pass over docs that shipped without Fit beyond `concept-audit.md`: #49 (after #48).

## Open questions

- ~~Where the check lives, what it scans, the shape of Fit, its placement, whether #48 gets sub-issues~~ —
  answered by the orchestrator session 2026-10-08 (Contract §1, §2; Build map).
- ~~What a project meets on sync for docs shipped before the section existed~~ — the owner, 2026-10-08: the
  count is recorded by sync and may only go down (D-036, Contract §3).

## Changes

- 2026-10-08 · ADDED · shaped from #48 before any code · PR for #48
