# The slipway path

How a project built on slipway goes from a loose idea to a shipped, measured product with coding agents, and
the checks that keep that path honest. Self-contained — nothing here refers to anything outside this repository.

**Requires:** Node 24 + pnpm, GitHub, Claude Code. **Defaults**, decided in week 1 (D-005–D-008): TypeScript,
React + Vite, Cloudflare.

One thesis runs through all of it: **a rule exists only where something fires.** Every step below ends in
something that goes red — a check, a hook, a clock — not in a promise.

**Lost? Run `pnpm status`.** It reads the repo and prints which step you are on and what to do next. Agent
sessions get the same output automatically when they start.

---

## Start here — the path

| Step | Who, and how long | Produces | Done when (what fires) |
|---|---|---|---|
| **0 · Bootstrap** · you + agent, ~1–2h | `new-project` (repo, harness, label, protection), then `/bootstrap` (app, PR, probes) | green `pnpm meta`, a `verify` that runs | all 15 probes in [BOOTSTRAP §3](BOOTSTRAP.md) seen failing once |
| **1 · Frame** · you with `/kickoff`, an afternoon | answer one question at a time; park what you can build without | [`docs/product/FRAME.md`](docs/product/FRAME.md) — job story, the question the product answers, risks | `status: framed`; **K1** blocks any milestone until then |
| **2 · Test the risk** · **yours**, days to weeks | talk to people or run the job by hand, against a bar written first — an agent prepares the materials, you run it | [`docs/product/evidence/`](docs/product/evidence/), a Result per value risk | **K1** blocks every milestone past the skeleton until each value risk has a Result |
| **3 · Shape** · you with `/kickoff`, 1–2 days | finish `/kickoff`: PRD, week-1 decisions, milestones; then `/review-doc` in a fresh session | [`docs/PRD.md`](docs/PRD.md), [`decisions.md`](decisions.md), [`docs/milestones/`](docs/milestones/), [`docs/reviews/`](docs/reviews/) | readiness gate PASS; **R1** green: the PRD's current version has a review |
| **4 · Walking skeleton** · agent, days — **runs in parallel with step 2** | activate [M1](docs/milestones/M1-walking-skeleton.md): thinnest core path, deployed by CI | a live URL, analytics and errors wired | its gate: an end-to-end test against production |
| **5 · Build loop** · agent | one active milestone; every change through its lane | small PRs with evidence | `verify` · `meta` · `pr-body` per PR; the Stop hook per agent turn; **MS1** |
| **6 · Close the milestone** · you with `/close-milestone` | run `/close-milestone` | a retro from the record, closed GitHub milestone, next bet chosen | **MS1**: closed means retro written; overrun means a decision |
| **7 · Learn** · you, weekly | weekly metrics and user conversations; bets chosen from evidence | [`docs/product/metrics.md`](docs/product/metrics.md) | then back to 5 with the next milestone |

### 0 · Bootstrap — about an hour

Follow [`BOOTSTRAP.md`](BOOTSTRAP.md): one script creates the project and its GitHub repository, pushes `main`,
installs the agent harness, attempts protection and records the outcome; then `/bootstrap` scaffolds the app, fill `AGENT.md`, set the lessons clock, then run the acceptance
probes. A gate that has never refused anything cannot be told apart from one that is not installed, so each
probe must be *seen* failing.

### 1 · Frame — an afternoon

Run `/kickoff` with whatever you have: a PRD, notes, one sentence. It asks one question at a time and
writes `FRAME.md`: the moment someone reaches for the product, the job story ("When …, I want to …, so I
can …"), **the one question the product answers**, what people do today instead, and the risks that could
kill it. Anything it cannot derive becomes a `[NEEDS CLARIFICATION: …]` marker, never a guess.

> *Example — a scheduling app for independent dog walkers.* Question: "Where do I need to be tomorrow, and
> who hasn't paid?" Every MVP feature must serve that question; client reviews, route maps and a
> marketplace become later bets. Riskiest assumption (value): walkers will leave the group texts and notes
> app they already use.

### 2 · Test the risk — days, no production code

Write the threshold *before* the test, then run the cheapest test that could fail: interviews about past
behaviour, doing the job by hand for a handful of people, a fake door. Record the Result in FRAME. Missed the
bar? Reframe, or proceed with a decision that says why. The walking skeleton can be built in parallel; nothing
after it can start until the value risks have Results.

> *Example.* Run five walkers' schedules by hand in a shared spreadsheet for two weeks. Threshold, written
> first: at least three keep sending updates unprompted in week two.

### 3 · Shape — a day or two

`/kickoff` continues: a PRD with stable IDs (features that do not serve the question go to *Out,
explicitly*); the **week-1 decisions** in `decisions.md` — framework, data model, money and time types,
identity and tenancy, i18n plumbing, analytics and consent, deploy — the choices that cost a migration if
made late; and 3–5 **milestones**, cut from a **story map**: the user's journey left to right, features underneath,
slice lines across, ranked riskiest-assumption first, then dependencies, then value. Each milestone is a bet: an appetite (how long it is worth, not a
guess at how long it takes), vertical slices, no-gos, rabbit holes, a gate that can go red, and kill
criteria written before starting. A readiness gate then asks of every slice: can it be built without
inventing a decision nobody recorded? Finally, run **`/review-doc docs/PRD.md` in a fresh session**: the
adversarial review of the *document*. It argues with the plan — criteria that cannot fail, assumptions stated
as facts, contradictions, sequencing — and writes `docs/reviews/<date>-prd-<version>.md`, which R1 checks.
This is not `/pr-review`, which reads a code diff on a pull request and writes nothing here; you want both, at
different moments. A substantive revision bumps the PRD version, so it needs a fresh review.

### 4 · Walking skeleton — days

Set M1 to `active` with real dates. Build the thinnest version of the core path end to end — sign in, the
one core action, stored and read back — deployed to production through CI, with analytics and error
tracking firing, and the code-health gates (dead code, duplication, boundaries) running from the first commit
of product code. This is where the week-1 decisions stop being opinions: a stack that cannot carry the
skeleton is cheap to change now and expensive in month three.

### 5 · Build loop — the rest of the milestone

One milestone active at a time (MS1). Take the next slice from its Contents, pick its lane, build it in a
fresh agent session, prove it, merge it. The Stop hook will not let an agent end a turn while
`pnpm verify:fast` is red. Anything that is not in the milestone goes to its no-gos or a later one, not into
the diff.

Cohesion is checked three ways: the code-health ratchets fail a PR that adds dead code or duplication;
`docs/conventions.md` names the one way to do each recurring thing, and agents search for an existing
helper before writing a new one; review treats a duplicate or a convention break as a `[FIX]`. Debt that
does accumulate shows up in the milestone retro and is paid down in the cool-down.

### 6 · Close the milestone

When the gate is green — or the appetite has run out — run `/close-milestone`. It proves each gate line with
evidence, writes the retro from the diff and the issues rather than memory, marks shipped feature docs,
closes the GitHub milestone, files lessons, and recommends the next bet. The default at the end of an
appetite is to **cut scope and close**, not extend; extending takes a decision in `decisions.md`.

### 7 · Learn — after launch, every week

Log the weekly review in `metrics.md`: signups, activation, retention by cohort, errors, and 3–5
conversations with users. Confirm or replace the activation hypothesis with real cohorts. Once 40+ people
use the product regularly, run the "how would you feel if you could no longer use it?" survey monthly.
Shape the next milestone (`kind: bet`, usually two weeks) from that evidence, then go back to step 5.

---

## Every change: pick a lane

| Lane | When | Needs |
|---|---|---|
| **trivial** | one sentence describes it, no new behaviour | a branch and a PR with `## Verification`; links `none: trivial` |
| **bounded** | one session, one coherent unit | an issue from the form — checkable acceptance, seams answered — with the plan inline |
| **feature** | several sessions, or a new concept, surface or data shape | a feature doc ([template](docs/features/TEMPLATE.md)) with a Contract and `Verify`, then issues that embed it (`/log-feature`, `/work-ticket`) |

When unsure, take the bigger lane. After a feature ships, behaviour changes go in its `## Changes` log
instead of rewriting the Contract.

## Commands

| Command | What it does |
|---|---|
| `node scripts/new-project.mjs <dir> --repo owner/name` | from slipway itself: start a project (step 0); `--dry-run` shows the plan |
| `pnpm status` | where the project is and the next step; also writes `STATE.md` (gitignored) |
| `pnpm verify` | the gate: `check`, `lint`, `test`, `build` in every package — CI, agents and humans run the same thing |
| `pnpm verify:fast` | `verify` without `build`; the inner loop and the Stop hook |
| `node ci/ratchet.mjs <name> <report> <path>` | a code-health number may go down, never up (D-014); `--update` locks in an improvement |
| `pnpm meta` | checks the checks, and the planning documents: PC1 W1 FO1 R1 L1 MS1 K1 F1 D1 (in slipway itself also S1, O1) |
| `/bootstrap` | step 0, after `new-project`: scaffold the app, bootstrap PR, acceptance probes |
| `/clarify` | walk the open questions: answer in place, or park with an assumption, a cost and a tracker |
| `/review-doc <path>` | step 3, fresh session: adversarial review of a document into `docs/reviews/` — not a code diff |
| `/kickoff` | steps 1–3: frame, risk test plan, PRD, week-1 decisions, milestones, readiness gate |
| `/close-milestone` | step 6: gate evidence, retro, close out, next bet |
| `/sync-slipway` | take a newer slipway: explain the change, the owner applies it, resolve, PR ([Taking slipway updates](#taking-slipway-updates)) |
| `/log-feature` `/log-bug` `/log-followup` `/work-ticket` | intake and execution skills (user-level), configured by [`AGENT.md`](AGENT.md) |

---

## Reference

### What is here

```
README.md · SLIPWAY.md · BOOTSTRAP.md   what this is · the path · day 0
scripts/new-project.mjs             start a project from this template, and `sync` / `sync --adopt` (not copied into it)
dev/ownership.yaml                  who owns each shipped path: managed · seeded · merged · internal (not copied)
CLAUDE.md · AGENT.md                agent instructions: the project's own lines, importing the rules below · skill configuration
process/slipway-rules.md            gates, planning flow, lanes, working rules, agents, notes — slipway's, replaced by a sync
decisions.md                        decision log, including the week-1 one-way doors
docs/product/FRAME.md               job story · the question answered · four forces · press release · risks
docs/product/evidence/              interview logs and risk-test results
docs/product/metrics.md             activation hypothesis · event taxonomy · weekly review · PMF survey
docs/PRD.md                         stable IDs, principles with what they rule out, open decisions with impact-if-wrong
docs/milestones/                    one file per bet: appetite · slices · no-gos · rabbit holes · gate · kill · retro
docs/features/TEMPLATE.md           feature doc: Contract, Seams, Threat model, Known limitations, Verify, Build map, Changes
docs/domain-invariants.md           invariants, each citing the test that enforces it
docs/testing-strategy.md            test layers, and what makes a test able to fail
docs/qa/ · docs/reviews/            QA plans · adversarial reviews with provenance lines
process/lessons/                    61 lessons, each stating where it lives (L1 checks it)
process/cold-review.md              the cold-review checklist, one line per lesson
process/designation.md              which model and effort, by whether an oracle exists
process/harness/                    permissions and hooks — installed into .claude/ by new-project
.claude/skills/                     /bootstrap, /kickoff, /clarify, /review-doc, /close-milestone and /sync-slipway
.slipway/                           in a project, not here: manifest.json (what slipway wrote, hashed) · overrides.yaml
.github/                            CI (meta · verify), pr-body (re-runs on description edits), issue-shape, issue forms, PR template
ci/verify.mjs · ci/status.mjs       the gate · the state
ci/ratchet.mjs                      code-health ratchets against ci/baselines.json
docs/conventions.md                 the one way to do each recurring thing, with its canonical example
ci/checks/meta/                     W1 FO1 PC1 P1 I1 R1 L1 MS1 K1 F1 D1 — and O1, S1 in slipway itself, never copied
ci/fixtures/known-bad/              known-bad fixtures, one expected.json per case
ci/fixtures/status/                 fixture roots S1 runs `ci/status.mjs` against, one expect.json each (slipway itself, never copied)
ci/exceptions.yaml                  expiring, structurally keyed exceptions
```

All checks are zero-dependency (D-004): they run on bare Node with no install step.

### Taking slipway updates

A project takes a newer slipway through `sync`, run with `/sync-slipway` (F-01, D-015). Nothing is
merged by judgment file by file:

- **Ownership.** `dev/ownership.yaml` gives every shipped path a class. `managed` files are slipway's:
  sync replaces them, and D1 fails when one changed without an entry in `.slipway/overrides.yaml` giving
  the reason. `seeded` files (the PRD, FRAME, `decisions.md`, `AGENT.md`…) are the project's after
  creation: sync never writes them, and saves slipway's own diff to `.slipway/upstream/` for the skill to
  offer. `merged` is `package.json`'s `scripts`, key by key. A file slipway never shipped is the project's.
- **The manifest.** `.slipway/manifest.json` records each file slipway wrote, with its hash and git blob
  id. Sync finds the base as the slipway commit that holds exactly those blobs. `new-project` writes it,
  and every sync rewrites it.
- **Plan, then apply.** `sync` prints one row per path and slipway's commits since the base, and writes
  nothing. `sync --apply` commits it all on `slipway/sync-<target>`. The owner runs `--apply` in their own
  terminal, never an agent: it installs the harness.
- **Adopt, once.** A project created before the manifest runs `sync --adopt`. The base comes from its
  first commit or README, or, when those name only a version, from the closest slipway commit, which the
  owner confirms with `--base`. Each managed file that differs is kept, with an override, or reverted.
- **IDs by prefix.** Slipway's lessons and decisions are `L-`/`D-`; a project's own are `PL-`/`PD-`. L1
  and the tracker pattern accept both, and a sync never renumbers either.

### The gates

| gate | green proves | the failure it prevents |
|---|---|---|
| `verify` | `check`, `lint`, `test`, `build` passed in every package that declares them | a filtered runner skips dependents, or matches nothing, and exits 0 having run nothing |
| PC1 | every check goes red on its fixtures for exactly the expected reasons | a gate wired to nothing looks exactly like a working one |
| W1 | every gated script and every check is invoked by CI | test suites no workflow runs read as coverage |
| FO1 | every `continue-on-error` is excused by an unexpired, structurally keyed exception | a fail-open step reports success while proving nothing; line-keyed exceptions break on ordinary edits |
| P1 | the PR body names verification evidence and links its issue | PRs merge with no record of what was run, and same-day follow-ups repair them |
| I1 | issue acceptance criteria are not bare adjectives; the seams question is answered | adjective criteria that any change satisfies; a conditional question silently skipped |
| R1 | each review names the file it read and a version line still verbatim in it, and the PRD has one once it leaves draft | a review written from memory cites a version that no longer exists; a plan nobody argued with |
| L1 | every lesson points at a home that exists, and none is past its review date | lessons enforced by nothing get re-learned |
| MS1 | milestones are shaped bets; at most one is active; none outruns its appetite without a decision; closed ones have a retro; each `summary:` matches its PRD milestones row; warns when a PRD estimate is more than the appetite holds | milestones left open after their work ends, new surfaces started before launch, and the same fact drifting between the PRD and a milestone |
| F1 | every PRD feature is scheduled by a live milestone; every active or closed slice cites a feature | a PRD feature nobody scheduled, and slices of work no feature asked for |
| K1 | no milestone starts before the frame is finished (open questions answered, or parked with an assumption, a cost and a tracker); every untested value risk names a tracker once a milestone is underway; nothing past the skeleton before each value risk is tested against a bar set first | building before anyone names the question the product answers or tests whether people want it |
| S1 | `ci/status.mjs` prints the expected Next and Frame lines — each risk tested, scheduled, overran, window unreadable or untested — for its fixture roots | status telling the owner a risk is on schedule while its evidence is no longer read |
| Stop hook | an agent turn does not end while `verify:fast` is red | agents declaring done work that was never run |

`verify` exits BROKEN on an empty workspace and fails, before running anything, when no package declares
`check` or `test` — a gate that could not have proven anything never reports green.

### Lessons, and where each one lives

61 lessons in `process/lessons/`. The **status** says honestly what fires:

| status | count | meaning |
|---|---|---|
| `check` | 12 | a check or harness rule fires on violation |
| `structural` | 2 | cannot happen once `main` is protected |
| `artifact` | 1 | a template slot a check requires filled |
| `prose` | 32 | judgment, written where it is used — the cold-review checklist, `process/slipway-rules.md`, the testing strategy — on a 90-day review clock |
| `declined` | 14 | not built yet: deferred components and conditional rules, each naming the event that should reopen it, on a 60-day clock |

A project's own lessons are `PL-<n>`, so a sync never collides with slipway's (D-015); L1 fails any other
id. Most lessons are judgment, and saying so is the point. Each has a home L1 proves exists and a date L1
enforces. **Deferred work lives here too** (L-50 to L-60, L-64), so something fires when it has waited too
long.

### The check contract

1. **Print the denominator.** "Nothing found" without saying what was examined is indistinguishable from
   examining nothing.
2. **Exit codes mean one thing each:** `0` green · `1` findings · `2` BROKEN. A zero denominator is BROKEN,
   and so is input a check cannot model safely.
3. **State exactly what green proves**, and no more.
4. **Under `CHECK_JSON=1`, emit one `@@json` line**, so PC1 compares findings rather than exit codes.

### Exceptions are clocks, keyed to structure

```yaml
exceptions:
  - id: .github/workflows/ci.yml#detect/filter   # <workflow>#<job>/<step id>
    reason: detection must fail open or the whole matrix is skipped
    owner: build lead
    expires: 2026-12-31                           # first day it no longer applies
```

FO1 turns red on an exception that is undated, expired, stale, or keyed to a positional or duplicate step.

### Adding a check

1. `ci/checks/meta/<id>-<name>.mjs` — takes a directory as `argv[2]`, reports through `report()`.
2. A known-bad fixture: `ci/fixtures/known-bad/<id>/` with `expected.json`, or one subdirectory per case,
   each with its own. **Put the traps in it** — every way a naive version of the check gets it wrong — and
   at least one input that must pass, so a check that flags everything cannot hide.
3. Invoke it from CI (W1 fails an uninvoked check), then run `pnpm meta`.

### Validation

**Harness.** PC1 green over 10 checks and 22 fixture cases. On the template itself W1, FO1, R1, L1 (60
lessons), MS1, K1 and F1 are green, and `pnpm meta` is green with nothing installed. The PR template is
byte-identical to P1's `placeholder.md` fixture and the FRAME template to K1's `draft-underway` fixture, so
an unfilled template is proven to fail.

**`verify`, including real `pnpm -r` runs in scratch workspaces:**

| workspace | result |
|---|---|
| the template, 0 packages | exit 2 BROKEN |
| no package declares `test` | exit 1 before anything runs |
| 2 packages, all tasks pass | exit 0 — check in 2, test in 2, build in 1 |
| `test` fails | exit 1; `build` never ran |

**`scripts/new-project.mjs`** with `--no-github` produced a history-free copy on `main`, placeholders filled,
`pnpm meta` green inside it; `--dry-run` printed every GitHub step; bad arguments, a non-empty destination and a
destination inside slipway are refused. The D-001 rewrite was matched against the real `decisions.md`.

**`ci/ratchet.mjs`**: no baseline, a missing report, a wrong path and bad usage are each BROKEN; a higher number
fails; `--update` records, tightens, and refuses to raise a baseline.

**`pnpm status`** prints the next step with its owner and rough duration, the work that is *also* unblocked
(the skeleton during a human-run risk test, a missing PRD review), and every open or parked question with its
text and tracker. It walked through a scratch copy: bootstrap → frame → risk test → shape → skeleton, with the
right next step at each, and K1 red when M1 went active over an unfinished frame.

**Hooks**, run with an empty PATH as `/bin/sh` has: each advisory hook prints its reminder on a matching
command and nothing otherwise; `session-state` emits the status; `stop-verify` stays quiet with no app,
blocks on a failing test, lets the second stop through, and skips a tree it already verified green.

**Negative controls, each observed failing:**

| control | result |
|---|---|
| a check that cannot fail, with a complete fixture | PC1 red |
| a check with no fixture | PC1 red |
| a fixture with no `expected.json` | PC1 red |
| FO1 loosened to count `continue-on-error: false` | PC1 red — flagged unexpected |
| I1 loosened to accept any criterion | PC1 red — missed both adjective findings |
| W1 loosened to count commented-out commands | PC1 red — missed `c:check` |
| L1 loosened so every pointer resolves | PC1 red — missed three unresolved pointers |
| MS1 with the last appetite day made exclusive | PC1 red — flagged an on-time milestone |
| MS1 allowing two active milestones | PC1 red — missed `wip/exceeded` |
| MS1 comparing summaries without collapsing whitespace, or reading `**M1**` or `[M7](…)` literally | PC1 red — flagged unexpected `summary/drift` |
| MS1 reading the first `### Milestones` in the PRD rather than §10's | PC1 red — flagged `milestones/header` |
| MS1 comparing when no milestone declares `summary:`, or comparing an empty one | PC1 red — flagged unexpected (the synced-repo case) |
| table cells split on an escaped `\|`, or the last cell dropped from a row with no closing pipe | PC1 red — flagged unexpected `summary/drift` |
| MS1 ignoring a milestone with no PRD row | PC1 red — missed `summary/drift` |
| MS1 warning at an estimate equal to the appetite (`days / 7 × h` float error), at the bottom of Capacity, or with the last appetite day exclusive | PC1 red — unexpected warning |
| MS1 comparing a closed milestone's estimate, or calling a placeholder unreadable | PC1 red — unexpected warning |
| MS1 reading `40 to 60` as 40, keeping `1,200`'s comma, or staying silent on an unreadable cell | PC1 red — missed warning |
| MS1 reading `Estimate basis` as the hours column, or needing the exact §9 / §10 heading text | PC1 red — missed warnings, or flagged `milestones/header` |
| MS1 silent on a §9 row that names no milestone, or warning on a Total row | PC1 red — missed or unexpected `estimate/unknown` |
| MS1 dropping its warnings | PC1 red — missed all seven, across three cases |
| K1 reading placeholders inside HTML comments | PC1 red — flagged unexpected |
| S1 with evidence `Window:` lines no longer read | S1 red on `framed-no-milestone`; PC1 red — missed both `window-ignored` findings, flagged `next-only#frame` |
| S1 with an evidence heading no longer closing its risk | S1 red on `skeleton-active` |
| F1 counting killed milestones as scheduling a feature | PC1 red — missed `feature/unscheduled` |
| F1 ignoring a citation on a continuation line | PC1 red — flagged two unexpected |
| zero workflow files | FO1 exit 2 |
| a YAML anchor inside `jobs` | FO1 exit 2 — refuses to guess |

### Exercised on a real project

A private project started from slipway and ran it in live sessions (2026-09-22 to 2026-09-24). Its commits and
PRs are the evidence; slipway holds nothing else from it.

- `verify` on a real React + Vite + Vitest app: green on the bootstrap PR, and red on a probe PR with a failing
  test (BOOTSTRAP §3 probe 3). Scaffold `46fa186`.
- `pr-body` on real PRs, red on a missing `## Verification` and green once it names evidence (probe 4), and
  `issue-shape` labelling a free-prose issue `needs-shape` (probe 7).
- The Stop hook in a live session: it blocked on a raw `tsc: command not found` tail, which produced the
  missing-install fix (the project's `4cb5c44`, ported here as PR #58).
- The GitHub half of `scripts/new-project.mjs`: repository, label, and `main` protection with required
  `meta`, `verify` and `pr-body`, recorded as D-001 "decided by attempting it".
- `/kickoff` on a real product: frame, PRD, week-1 decisions and milestones (`e32234d`, then `9613a9e` set the frame).
- `sync --adopt`, then `sync --apply`, on a project that predated the manifest: adopted at a known base and
  brought current, in one PR. See the yardstick below.

### Not verified here — read as unknown

Each kept line carries `Verified against: <sha> <date>` (slipway `main`) and the BOOTSTRAP §3 probe that will
first exercise it.

- The ask-level `Edit(...)` rules prompting in a live session; the Stop hook refusing on a failing test (it
  has only been seen blocking on a missing install); the other hooks and the `pnpm status` injection at session
  start, seen only on sample input. Probes 10, 14 and 15.
  Verified against: 4783d70 2026-09-24
- `/close-milestone` on a real project: the first project's M1 is still `shaping`, so no milestone has closed.
  No §3 probe covers it; closing that M1 is its first test.
  Verified against: 4783d70 2026-09-24
- `AGENT.md` against the real intake skills, which live outside slipway today (#46). Probe 11.
  Verified against: 4783d70 2026-09-24
- I1's stated residual: it catches adjectives, not criteria that cannot fail. "Returns HTTP 200" passes.
  No probe applies; it is a limit of the check, not an unexercised path.
  Verified against: 4783d70 2026-09-24
- Sync yardstick (#43 Acceptance): one terminal command and at most 3 questions, each answerable without
  knowing slipway, and the owner can say what changed. **Missed** on the first real sync (2026-09-24,
  `sync --adopt` then `sync --apply`): 2 commands, about 7 questions, and the owner needed help to say what
  changed (#59, #60, #61, #62). Stays until a sync meets it; each later sync is scored here with its command
  and question counts.
