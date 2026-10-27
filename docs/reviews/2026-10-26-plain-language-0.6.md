# Adversarial review — F-16 plain language 0.6

Reviewed: dev/features/plain-language.md @ f220c14
Version line: Version: 0.6 (2026-10-26)
Supersedes: docs/reviews/2026-10-14-plain-language-0.1.md
Supersedes: docs/reviews/2026-10-15-plain-language-0.2.md
Supersedes: docs/reviews/2026-10-22-plain-language-0.3.md
Supersedes: docs/reviews/2026-10-23-plain-language-0.4.md
Supersedes: docs/reviews/2026-10-23-plain-language-0.5.md
Review date: 2026-10-26
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

f220c14 was the head of `matldupont/i521-shape-064357` (PR #544) when this review began. This session did not write
or edit the document.

**Scope, by the owner's word (2026-10-26):** "Fold into 0.6, capped: one review round, scoped to 0.6's changes (#521's
section plus #524's corrections). What it finds rides the build tickets or the as-built correction, never a 0.7." That
is `git diff origin/main...f220c14` on the doc and on `decisions.md`: the new §10, the §8 edits, #524's corrections in
§1, §4, §6, §8, Seams, the Threat model, the Known limitations, the Acceptance, the Verify block, the Build map, Out of
scope and Changes, and D-051. The rest of the doc was read only for contradictions with the changed lines. No finding
asks for a new version: each names the step of build item 8 (#521's sub-issues (a) to (d), filed after this review) or
the as-built correction that carries it.

F-16 has one ID and ten numbered Contract sections, so each finding is located by `F-16 §n` (or the section name) and
the line range at f220c14.

**What was read.** In full at f220c14: the doc, D-051 and D-046, `ci/prose.mjs`, `ci/ratchet.mjs`, `.vale.ini`,
`.github/workflows/ci.yml`, `.github/workflows/pr-body.yml`, `dev/ownership.yaml`, L-71, and #524's and PR #544's bodies.
In part: `scripts/new-project.mjs`, `scripts/sync.mjs`, `scripts/lib/install.mjs`, `ci/checks/lib/ratchet.mjs`,
`ci/checks/meta/l1-lessons.mjs`, `scripts/workflows.test.mjs`, `scripts/prose.test.mjs`, `scripts/gate-files.test.mjs`,
`process/harness/settings.json`, `process/harness/README.md`, `process/writing.md`, `ci/prose/Slipway/Chatbot.yml` and
`Placeholder.yml`, and the files under `ci/fixtures/known-bad/prose/`.

**Verified, and how.**
- The 0.6 `Verified against:` line holds at f220c14: both workflows guard the prose job and the Vale steps with
  `is_template`; `.vale.ini`, `ci/prose.mjs` and `ci/prose/**` are `internal`; `Edit(**/.vale.ini)` and `Edit(**/ci/**)`
  are in `process/harness/settings.json`; `ci/ratchet.mjs` exits BROKEN with no baseline; `new-project.mjs` seeds only
  the Fit key.
- `pr-body.yml` runs on `pull_request` with `contents: read`, and the body reaches the shell through an environment
  variable and `printf`, as the Threat model says. No security finding is raised here.
- `scripts/prose.test.mjs` already holds the case the new Acceptance block at lines 634–638 describes (a phrase after
  `vale off`, after a comment written with a character reference, in a span, in a fence).
- Read for AR-1 to AR-3, AR-5, AR-6 and AR-10, each cited there.

**Not verified.** Vale is not installed in this session, so no rule and no `pnpm check:prose` was run. No test was run.
Nothing was run on a project.

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
| AR-1 | In a project the prose check is BROKEN: it holds README's "Then follow the path" section at 0, and a project's README has none | S1 | owner | #521 (c), before (b) | #549 |
| AR-2 | The one command that records a project's count runs Vale, so a project without Vale cannot record it, against the owner's third detail | S1 | owner | #521 (c) | #549 |
| AR-3 | A sync can raise a project's count on text the project does not own, and no command lets it record the new number | S1 | owner | #521 (c) | #549 |
| AR-4 | The title and subject rules reach projects on a measurement the record ties to `docs/`; Seams names only the length rule | S2 | owner | #521 (d) | #551 |
| AR-5 | Three "rules the build must meet" have no build step: the id rules' blanked copy, the Chatbot count pin, rule 7's pair | S2 | owner | #521 (c), (a) | #549, #548 |
| AR-6 | The Acceptance says L-71's date "never fails a project"; L1 fails it on that date in every project | S2 | owner | #521 (a) | #548 |
| AR-7 | Placeholder is off for a project's own PRD, frame and first milestone, against §10's "errors fail on lines a PR adds" | S2 | owner | #521 (a) | #548 |
| AR-8 | Step (b) lifts the guards, but nothing orders it after (a) and (c); the "step 6" dependency names the wrong step | S3 | owner | #521 sub-issue filing | #550 |
| AR-9 | Acceptance and Verify lines 0.6 left behind or garbled | S3 | owner | #521 (a), (b); as-built correction | #548, #550 |
| AR-10 | Prose that no longer matches the tree or itself | S3 | owner | #521 (a); as-built correction | #548 |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — In a project the prose check is BROKEN before it reads a word

**Where:** F-16 §10, "The warnings start from the project's count", lines 488–489; §8 "The ratchet", lines 398–403;
D-051's "What ships" bullet.

§10 says "The held set is the one in §8." That set is `HELD` in `ci/prose.mjs` (line 38): `README.md`, `SLIPWAY.md`,
`BOOTSTRAP.md`, `process/writing.md`, three templates and the PR template. `zeroRanges()` (line 202) then looks for the
line `## Then follow the path` in `README.md` (line 207) and exits BROKEN when it is missing. A project's `README.md` is
not slipway's: `dev/ownership.yaml` classes `README.md` `internal`, and `scripts/new-project.mjs` writes a product stub
with no such heading. So once step (b) lifts the guard, every project's `prose` job exits 2 on its first run, before
any count, whatever its text. The project cannot fix it without editing a managed script. Raised to S1 because it turns
every project's CI red on the day the release lands.

The zero-warning hold itself is slipway's (D-046: "Zero warnings is held on the path table and README's path section").
In a project, the path table in the managed `SLIPWAY.md` still applies; slipway's README section does not exist.

**Proposed resolution.** Step (c) changes `zeroRanges()` so a README with no path section holds nothing at zero (or
holds only `SLIPWAY.md`'s rows outside slipway), and adds an Acceptance line: given a project made by
`scripts/new-project.mjs`, when `pnpm check:prose`, then it exits 0 or names a count, never BROKEN on the README. Step
(b) does not merge before (c).

### AR-2 — The recording command needs the Vale it was meant to work without

**Where:** F-16 §10, "The project's own count", lines 467–477; Seams, lines 501–502; Known limitations, lines 549–550;
Acceptance, lines 670–674.

The owner's third detail, quoted in §10: "The red message states the count CI measured and the one command to record
it, so a project without Vale installed locally can still record it." The next sentence of §10 defines that command as
one that does not do this: "`node ci/prose.mjs --record` runs Vale on the held set and writes the key". Then: "when
`vale` is not there they write nothing and print the one command", and the red message names "`node ci/prose.mjs
--record`". A project without Vale runs the named command and gets BROKEN (`haveVale()`, line 137). The Known
limitation repeats it ("until it runs one command and commits the result"). The Acceptance at lines 670–674 tests the
local message only; no line tests that CI's message holds the measured count, or that the count can be recorded with no
Vale.

A second gap sits on the same path: when `vale` is on the path, sync and new-project count with whatever Vale version is
installed, while CI pins 3.24.0. A different version can give a different count, so the first CI run after a sync can
go red on a number the owner just recorded. Raised to S1 because the spec contradicts the owner's call it quotes.

**Proposed resolution.** Step (c) makes the command take the number CI printed (for example `node ci/prose.mjs --record
<n>`, which runs no Vale and writes the key only when none exists), and the CI message prints that exact line with the
count filled in. Sync and new-project count only when `vale --version` matches the pin, else print the line. Add two
Acceptance lines: CI's exit-2 message holds the count and a command that runs with no Vale; `--record` with a key in
place refuses (the owner's first detail).

### AR-3 — A sync can raise a project's count, and nothing lets the project follow

**Where:** F-16 §10, "The project's own count" and "The warnings start from the project's count", lines 467–477 and
488–489; D-051, "The warning count starts from the project's own held set"; Known limitations, lines 551–552.

In a project, every file of the held set except `README.md` is managed (`SLIPWAY.md`, `BOOTSTRAP.md`, `process/**`,
`docs/**/TEMPLATE.md`, `.github/**` in `dev/ownership.yaml`). So the "project's own count" is almost all slipway's
text, which a sync replaces. Slipway's own ratchet holds the total over slipway's held set, which includes slipway's
README; that README is `internal` and never ships. A slipway change that cuts warnings in its README and adds them to
`SLIPWAY.md` passes slipway's gate and raises every project's count at its next sync. The sync PR's `prose` job then
fails. The project has no way out: `--record` refuses with a key in place (the owner's first detail), `--update` refuses
to raise (`ci/ratchet.mjs`, `mayRecord`), and `SLIPWAY.md` is managed. The only fix is the owner editing the gate file
`ci/baselines.json` by hand. Raised to S1 because it fails a project's PR on text it does not own, against D-051's
promise that the warnings "start from the project's own count and may only go down".

§10 also leaves open which tree sync counts: the project's held set before `--apply` writes the new managed files, or
after. Counted before, the key is stale on the sync PR itself.

**Proposed resolution.** Step (c) decides one of: slipway's ratchet counts only the files that ship (so its total
bounds a project's managed part), or a project's key counts only the files the project owns, or sync's computed row
re-records the count when a sync changes a held file, shown in the plan as a gate change. Whichever is chosen, sync
counts after its writes. Add an Acceptance line: a sync that moves a warning into `SLIPWAY.md` leaves the project's
`prose` job green, or names the one step that makes it green.

### AR-4 — The title rules reach projects on a measurement of other text

**Where:** D-051's quoted amendment and its "The title rules wait for #461" bullet; F-16 §10, lines 452–454; Seams,
lines 500–503; Known limitations, lines 551–552.

D-046 held "P1's title and subject rules" until "a project's text has been measured once". D-051 lifts them on that
run, whose result is given in the public record as "found nothing that fails once the placeholder rule allows real HTML
tags". That sentence is about the three error rules. The Known limitations say what was read: "A project's `docs/` text
was measured once". Nothing in the doc or D-051 says the run read a project's PR titles or commit subjects. Slipway's
own evidence points the other way: at 0.1, most of its last 200 subjects were over 72 characters (Problem, line 35), and
a project's agent writes subjects the same way.

Seams undersells the reach: "on a title or subject over 72 characters". P1's rules also fail a title or subject holding
a bare check, decision or lesson id (`title/id`, `commit/id`), and a project numbers its own decisions `PD-n`, so a
subject such as one naming a project decision fails, as does "review round" and a number.

**Proposed resolution.** Before step (d) lifts the guard, run P1's title and subject rules once, read-only, on a real
project's recent PR titles and subjects and give the result to the owner, or record that the owner's run covered them.
Seams names all three failures. Rides step (d).

### AR-5 — Three corrections describe a build that no step carries

**Where:** F-16 §8, "What Vale reads", lines 373–376, and the Chatbot bullet, lines 381–384; §1 rule 7, lines 143–145;
Build map, lines 750–759.

The owner asked that a #524 correction about unbuilt code be worded "as the rule that build must meet". Three are, and
none is in the Build map:

- "`CheckId.yml` and `DecisionId.yml` read the blanked copy too, as Placeholder does". At f220c14 both rules run in the
  `raw` pass (`ci/prose.mjs` line 177). The baseline is to be "lowered then", with no step named.
- "`scripts/prose.test.mjs` pins its count at nine, so this sentence can fail". No file under `scripts/` names
  `Chatbot.yml` at f220c14, so nothing pins the count and the sentence cannot fail yet.
- Rule 7: "The pair's second half carries no count … so `process/writing.md`'s rule 7 pair is held to this."
  `process/writing.md` line 18 still quotes the status table row "with a count", and no test reads it. "Is held to this"
  names no holder.

Items 8 (a) to (d) cover ownership, guards, the count and the title guard. Out of scope keeps `SLIPWAY.md`'s step times
on #524 and nothing else.

**Proposed resolution.** Step (c) takes the first two, since it changes `ci/prose.mjs` and `scripts/prose.test.mjs`
anyway, and lowers slipway's `prose` baseline in the same PR. Step (a) rewrites rule 7's pair and drops "is held to
this", or names the test that holds it. The sub-issue bodies quote the three lines.

### AR-6 — L-71's date can fail a project, and the Acceptance says it never does

**Where:** F-16 Acceptance, lines 676–680; §10, "L-71 in a project", lines 484–487.

The Acceptance: "L1 resolves L-71's pointer (process/writing.md), so the lesson's review-by date (2027-04-14) never
fails a project". Resolving the pointer has nothing to do with the date. L1 adds `review/due` when "the review date has
passed" (`ci/checks/meta/l1-lessons.mjs` line 104, `due <= today`), in any repository holding the lesson. §10 itself
says the opposite of the Acceptance: "a project that has them is held to the same date". L-71 is under `process/**`, so
it is managed. A project that has not synced a release with a moved date goes red in `pnpm meta` on 2027-04-14 and can
fix it only by editing a managed file or syncing.

**Proposed resolution.** Step (a) rewrites the Acceptance to what is true: L1 resolves the pointer in a project, and the
date fails there as in slipway until a sync moves it. Add one Known limitation saying a project inherits the date, or
have L1 read `review-by` on a managed prose lesson as slipway's to move. The owner picks.

### AR-7 — Placeholder is off for a project's own planning docs

**Where:** F-16 §10, "The warnings start from the project's count", lines 488–489; §8 Placeholder bullet, lines
385–389.

§10: "A project's own docs are in the diff set: errors fail on lines a PR adds". `.vale.ini` line 11 turns Placeholder
off for `docs/PRD.md`, `docs/product/FRAME.md` and `docs/milestones/M1-walking-skeleton.md`, because they are seeded
files. In slipway those are templates. In a project, after `/kickoff`, they are the project's real PRD, frame and
first milestone, and a `TBD` or `<date>` left in them is the junk the rule exists for. §10 does not say the exemption
travels.

**Proposed resolution.** Step (a) either narrows the exemption to slipway's own tree, or writes one Known limitation:
in a project, Placeholder never reads those three files, and the `[NEEDS CLARIFICATION]` marker with `/clarify` is the
check there.

### AR-8 — The Build map does not order step (b), and names the wrong step for a dependency

**Where:** F-16 Build map, lines 727–729 and 750–759.

"The stages are independent of one another except where a step names a dependency". Step (b) lifts the guards; (a) makes
the files ship and (c) adds the record path. A project made from, or synced to, a `main` where (b) has merged before
(a) runs a job whose script it does not have; before (c), a job that can only exit 2. `README.md` tells an owner how to
take an unreleased commit, so the window is real even inside one release.

"§8's guard test sits in step 6": the guard test in `scripts/workflows.test.mjs` came with #462, step 7 (commit
695fef6).

**Proposed resolution.** When the sub-issues are filed, (b) is "Blocked by" (a) and (c), and the Build map's first
sentence names that dependency. Correct "step 6" in the as-built correction, or say which guard test step 6 owns.

### AR-9 — Acceptance and Verify lines left behind or garbled

**Where:** F-16 Acceptance and Verify, lines 610–632, 688–692 and 716–718; §8 fixture bullet, lines 410–414; §10
"Workflows", lines 463–464.

- Line 613 still says `scripts/f2.test.mjs` "fails one with more". The 0.4 review's AR-3, folded in, asked for "pins the
  count at 12" in §1, §6 and the Acceptance; §1 and §6 changed, the Acceptance did not.
- §8 now says "five control lines" and lists six (a marker; a `<date>` in a template; a `<br>`; a check id in a span; a
  `<sha>` in a span; a `<date>` and a `TBD` in a fence), held in four files. The Acceptance at lines 629–631 keeps the
  old list of five. The 0.5 review's AR-6 asked for one wording in both places.
- Line 625: "the title-and-commits step until #461 builds it, still do" carry the guard. A step that does not exist
  carries nothing; the guard stays until step (d), not until #461.
- Lines 688–692 join a 0.1.6 behaviour (the body step) and a 0.1.7 one (the title) in one block, with "or" in Given and
  "and" in Then, so the body check in a project has no line it can pass before #461.
- Verify line 716: "§8: the new files are classed internal". §10 makes them managed.
- §10: "`scripts/workflows.test.mjs` pins which steps are guarded: only the ones that read a file a project lacks". The
  `verify` job in `ci.yml` is guarded the other way, for another reason (slipway has no app), so the rule as written is
  false of the file it pins.

**Proposed resolution.** Step (b) fixes the three workflow lines (625, 688–692, §10's pin rule, written as "the prose
test step stays guarded; no prose step is"). Step (a) fixes Verify line 716. The f2 and fixture lines go in the
as-built correction.

### AR-10 — Prose that no longer matches the tree or itself

**Where:** F-16 §10 "Ownership", lines 458–459; Contract scope, lines 121–122; Known limitations, lines 536–539 and
551–552; Problem's source table, line 66; Changes, line 792.

- "The `prose` script already ships with `package.json`'s `check:prose`." At f220c14 it does not:
  `derivePackageJson` drops a script whose command calls an internal path (`scripts/lib/install.mjs` lines 108–110),
  and `ci/prose.mjs` is internal. It ships once (a) flips the class, and sync adds it as a `merged: key updated` row.
  No Acceptance line checks that a new project's `package.json` has it.
- "The three error rules of §8 apply to agent text too, since junk is junk". The skills under `.claude/**` are agent
  text, and §8 reads none of them.
- "the message's advice to use a code span is the fix; use a fence". The sentence gives two fixes. `Placeholder.yml`'s
  message says "move the format into a code span", which works for an indented block too.
- "A project's `docs/` text was measured once … Another project's first count may be high". A project's count is its
  held set, which holds none of its `docs/` except the templates (AR-3), so the measurement says nothing about that
  count.
- The source table still says PR bodies get the error rules "in slipway's `pr-body` workflow"; from 0.6 they do in
  projects too.
- The 0.6 Changes entry reads "… Out of scope say so. and the owner's two calls": a sentence is broken.

**Proposed resolution.** Step (a) adds the `check:prose` line to the new-project Acceptance. The rest goes in the as-built
correction, as plain text edits.
