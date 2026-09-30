# Decisions

A ruling that lives only in a closing comment or a chat transcript gets re-litigated. Record decisions here as they are made.

Each entry: ID · status · decision · why · consequences · supersedes. Superseded entries stay, struck through.
Slipway's decisions are `D-<n>`; add this project's own as `PD-<n>` (`PD-1`, `PD-2`…), so a slipway sync
never collides with them (D-015).

## D-001 — Can `main` be protected on this plan? *(open — owner, BOOTSTRAP §0)*

Required status checks may not be available for private repositories on every GitHub plan. **Decide by
attempting it**, not by reading documentation. If it is unavailable, record the accepted risk here. The
fallback already exists: CI runs on `push: main` as well as on pull requests, so a direct push is at least
detected.

## D-002 — The process leans on GitHub *(accepted)*

Issue forms, required checks, Actions workflows. Moving platform reopens intake, the merge gate and every
check wired to an event. Accepted concentration risk.

## D-003 — `verify` runs every task in every package, unfiltered *(decided 2026-09-10)*

No affected-package filtering at day 0. A filtered runner can skip dependents
(`--filter='[HEAD^1]'` without `...`) and exit 0 having run nothing when no package matches. Revisit when
CI time is a measured problem.

## D-004 — Meta checks are zero-dependency *(decided 2026-09-10)*

`ci/checks/` runs on bare Node with no install step, so the harness that proves the other gates cannot be
broken by a dependency. Cost: YAML is read as a declared subset, and anything outside it exits BROKEN.

## D-015 — Projects take slipway updates by a locked, declared sync *(decided 2026-09-23)*

A project must be able to take a newer slipway without losing anything, and without a merge that needs
judgment on every file. Most of what slipway ships is prose, where a three-way merge is least reliable.

- **Ownership is declared.** Every shipped path has a class: `managed` (slipway's; replaced on sync),
  `seeded` (written once at creation, never touched again — the PRD, FRAME, the answers to D-001–D-014),
  or `merged` (`package.json` scripts, key by key; narrowed from settings keys and `CLAUDE.md` blocks when
  sync was built — `CLAUDE.md` imports slipway's rules instead of merging them). A check
  fails on a shipped path with no class.
- **Managed files are locked; projects extend, not edit.** Each project records the version it is on and
  a hash per installed file. A check fails when a managed file differs from its hash, unless the path is in
  an overrides list with a reason. Slipway provides extension points (local checks, a project section in
  `CLAUDE.md`, project skills beside the shipped ones), so an override is the exception, not the way to
  customise.
- **IDs are owned by prefix.** Slipway keeps `L-` and `D-`, so existing citations stay valid; a project's
  own lessons and decisions are `PL-` and `PD-`. The sync never renumbers: that would break every old link.
- **Script plus skill.** A zero-dependency script does the sync — refuses a dirty tree, works on a branch,
  lands through a PR, prints a plan first, merges instead of overwriting any file that changed, never
  touches `seeded` files, and keeps a removed file the project edited. A skill wraps it for what needs
  judgment: conflicts in prose, migrations written as steps, and the PR's `## Verification`.

Consequences: releases are tagged, with a changelog and per-version migrations. Projects created before
this adopt it once, taking their base version from the `chore: start from slipway <sha>` commit, and
move their own lessons and decisions (the ones slipway does not ship) to `PL-`/`PD-`; slipway's own
`L-`/`D-` IDs, `L-57` onward included, stay as they are. Declined: free edits with a merge on every sync (drift makes
each sync costlier until projects stop syncing), and shipping skills and checks as a plugin and a package
(it conflicts with SLIPWAY.md's self-containment; revisit if the merge surface stays large).
Slipway does not rewrite published history; if it ever has to, it ships the recovery with it: `sync` names the
nearest commit and the command that re-points the project. The 2026-09-24 rewrite that removed a private name
from one lesson is the example.

## D-016 — Slipway maintains itself; it asks owners only about their product *(decided 2026-09-24)*

Slipway teaches engineering **practice**: frame before building, test the riskiest assumption, time-box
milestones, verify before calling work done. An engineer who learns these is better at the job without
slipway. Slipway's **machinery** is different: ownership classes, manifests, overrides, upstream diffs,
`PL-`/`PD-` numbering, check ids and the formats checks parse. That is slipway's business, and an engineer
must never have to learn it to use slipway.

- **The test.** A check that fails, or a question a skill asks, makes sense to someone who has never opened
  slipway's own docs. It names the project's own thing (a file, a risk, a milestone) and the next action.
- **Mechanical decisions are slipway's.** When a choice follows from slipway's own rules, slipway makes it
  and reports it in the PR. It doesn't ask the owner to approve its upkeep.
- **Questions are about the product.** When only the owner can answer, the question says what changes for
  their project and what each answer means for it. It doesn't mention hunks, diffs, ID prefixes or check ids.
  Those go in the PR body, for review.

Consequences: check messages, skill questions and `pnpm status` are held to the test. The audit that finds
where machinery shows is #63, and sync's questions are #62. On the first real sync (2026-09-24), an
experienced engineer said the questions "mean nothing to me" and accepted every recommendation. That cost
time and protected nothing. Declined: documenting the machinery better. A tool that needs its own manual
before it helps is one more complex thing to learn.

## D-017 — Project state for non-technical readers is a generated page, not a board *(decided 2026-09-24)*

A project's non-technical members need to see where things stand without reading issues or `STATE.md`.

- **Generated, read-only.** A static page built from `docs/milestones/` by the same lib `pnpm status`, MS1
  and K1 read. Nobody edits it, so it cannot drift. A GitHub Projects board was declined: a second,
  hand-kept source of truth goes stale, which is what `pnpm status` exists to prevent.
- **Built, not served.** CI rebuilds it on every push to `main` and once a day, for the day count.
  Rendering per request (a Worker) was declined: `main` changes only on a push, so it adds a runtime, a
  token and a second reader of the repo for no fresher content. Reopen it if the page ever shows live
  GitHub state (open PRs, CI).
- **Opt-in, and an allowlist.** Off unless AGENT.md turns it on. Only milestone-level fields are
  published; decisions, risks, questions and issues never are.

Consequences: the first host is GitHub Pages, public but `noindex`, which is not access control. A
private page (Cloudflare Access) is a later value of the same AGENT.md key. Spec: `dev/features/roadmap-page.md`.

Revised 2026-09-30 (owner, in #68's review, PR #160): **the public page reads frontmatter only.** No-gos and any
other text from the body's sections stay off it, and the title comes from a frontmatter `title:` or a plain H1 on
the body's first line. Three review rounds each found a markdown shape that let hidden body text through a
section reader; reading no body section removes the class. Owner-only views may still read the body.

## D-018 — Slipway ships its intake and ticket skills *(decided 2026-09-25)*

The build loop (step 5) and the feature lane name `/log-feature`, `/log-bug`, `/log-followup` and
`/work-ticket`. Until now they were the author's personal skills: slipway named them as "user-level" and had
to work without them, so `/bootstrap` and `/clarify` said "where installed". Anyone else starting from
slipway, a teammate on the author's own projects included, hit a dead end at step 5. Those skills are what
made agent work consistent in practice.

- **Shipped, managed, configured.** The four skills ship in `.claude/skills/` as `managed` files. Every
  project-specific value (repository, labels, milestone rule, board fields, paths, quality gate) is a key in
  `AGENT.md`, and `AGENT.md` documents each key. No skill names a product; a key an existing project lacks
  takes a documented default.
- **Each maps to a step and a check,** so shipping them does not make slipway a pile of skills: intake
  produces issues I1 accepts and feature docs F1 can schedule; `/work-ticket` opens PRs P1 accepts.
- **Intake goes both ways.** `/log-feature`, `/log-bug` and `/log-followup` end by asking which existing
  work the new issue changes, and edit only what the owner confirms (D-016's rule for questions applies).

Reverses: "slipway must work without personal skills". Consistent with D-015, which declined shipping skills as
a plugin: these are files in the project, like the other shipped skills. Consequences: Claude Code loads a
personal skill over a project skill of the same name, so anyone holding personal copies keeps running those
until they retire them. Slipway's own repository keeps filing its issues by hand: its `AGENT.md` is the
template. Spec: `dev/features/intake-skills.md`; #46.

## D-019 — Experience settles a value risk when it says what would prove it wrong *(decided 2026-09-28)*

K1 let nothing past the walking skeleton until every value risk had a Result from a test with a bar written
first. Two honest cases have no test: a feature that is **table stakes** in its domain (a product without it
is not usable, so there is nothing to ask), and a risk the **creator, as the user**, or a **domain expert**
already knows the answer to. Until now the only way through was a decision that read like a waiver.

- **Experience is evidence, with a closed list of reasons.** A value risk's Result may read
  `experience: table stakes`, `experience: creator is the user` or `experience: domain expertise`. No other
  rationale: a fourth is a change to this decision, not a FRAME edit.
- **Every one names what would prove it wrong.** Its evidence in `docs/product/evidence/` carries a
  `Wrong if:` line in the owner's words. Without it K1 fails the risk. That line is the row's bar, the way a
  Threshold is a test's; a `Wrong if:` that comes true reopens the risk.
- **`/kickoff` interviews for it, one question at a time,** and never writes a rationale or a refutation the
  owner did not give. No refutation means no settlement: the risk gets a cheapest test and a Threshold.

Reverses: "only a test, or a decision to build ahead, settles a value risk". The test path and the decision
override stay; experience is a third answer, not a replacement. Consequences: K1 gains two findings and
skips its no-Threshold rule for experience rows; `pnpm status` shows the risk as settled and names the
rationale; the FRAME and evidence templates say so. Declined: a free-text rationale (an excuse box nothing
can refute) and putting the refutation in the Threshold cell (prose in a table, and "set before" would mean
nothing there). Spec: `dev/features/experience-evidence.md`; #47.

## D-020 — A milestone's next slice starts from its Contents line, and intake reads the decisions record *(decided 2026-09-29)*

Starting a Contents item the milestone already bet on had no path: `pnpm status` said "pick the lane", and
`/log-feature` argued against the bet again. No intake skill read `decisions.md`: on a project's first
milestone a slice touched two decisions that disagreed, and only a hand read found it.

- **One command, not a new skill:** `/log-feature M1#2` (D-016: nothing new to learn). It seeds the problem
  from the Contents line and its PRD entries, skips the argument and the scheduling, and otherwise shapes and
  files as for an idea. A bounded item goes to `/log-followup` with the line as its frame.
- **Started is written on the line.** After filing, the skill appends the issue to the item's line; `pnpm
  status` names the first item without one and the command that starts it. Status stays offline.
- **`/log-feature` reads `decisions.md` in full,** lists the decisions a feature touches, and, when two
  disagree or one forbids what the feature needs, asks the owner which stands before any doc is written.

Declined: a new skill (a second command and a copy of the pipeline); `/work-ticket M1#2` (it builds from a
contract the item does not have yet); a check that finds conflicting decisions (the disagreement is in
words, and the real pair cited no shared id). Spec: `dev/features/next-slice.md`; #118.

## D-021 — Sync removes an override slipway has absorbed *(decided 2026-09-30)*

Since #132, an override whose file ends up byte-identical to slipway's copy is recorded at slipway's hash
and listed stale, and `sync --apply` exited 1 until the owner deleted the entry by hand. There was nothing
to decide: the entry excuses nothing, and D1 flags it until it is gone.

- **`--apply` removes it** from `.slipway/overrides.yaml` in the sync commit, one output line per path, and
  the plan says so ahead of time, outside "Needs you". It is the one edit to that seeded file sync makes
  without asking. Every other line stays byte for byte; an override whose file still differs is never
  touched, and one that names a file slipway no longer maintains is still the owner's to remove.
- **Needs-you is not a crash.** Owners run `pnpm -s use-slipway sync`, and the shipped script is
  `npx --loglevel=error github:…#main`: pnpm adds no `ELIFECYCLE` line under sync's exit 1, and npx no
  warnings about pnpm's settings. Neither change alone clears both.

Declined: exiting 0 whenever rows need the owner (the exit code is how the skill and an owner's shell tell
"needs you" from "done"); `pnpm dlx` in the script (its cache can serve a day-old `#main`). Spec:
`dev/features/template-sync.md`; #135.

## Week 1 — decide before M1 closes

The choices that are expensive to reverse. Each one changed after data and code depend on it — framework,
API layer, ORM, auth provider, time types, table names, the tenancy model — costs a migration. Decide each in week 1 — by
building the walking skeleton on it — or defer it explicitly with the event that reopens it.
Replace each stub with a normal entry when decided.

## D-005 — Frontend framework *(open — week 1)*

Template default: React + Vite, scaffolded at bootstrap (§1) so `verify` can run. Replacing it before M1
costs nothing; after, it costs a migration. One framework for every app in the repo.

## D-006 — API layer and hosting *(open — week 1)*

Template default: Cloudflare.

## D-007 — Database, ORM, and who owns migrations *(open — week 1)*

One package owns migrations; nothing else runs them.

## D-008 — Auth provider *(open — week 1)*

## D-009 — Money and time types *(open — week 1)*

Integer minor units plus a currency code, never floats; a date type for calendar days and a
timestamp-with-zone for instants. Property-test the math (`docs/domain-invariants.md`).

## D-010 — Identity and tenancy *(open — week 1)*

The owner key on every row — user, household, organisation — even if sharing ships much later.

## D-011 — Internationalisation *(open — week 1)*

Plumbing (message keys, `Intl` formatting, locale-aware routes) is cheap on day one and costly
to retrofit. Translations can wait for demand.

## D-012 — Analytics, error tracking and consent *(open — week 1)*

Which tools, where data is stored, and how consent is asked. Events: `docs/product/metrics.md`.

## D-014 — Code health: dead code, duplication, boundaries *(open — week 1)*

Agents duplicate by default and rarely refactor unasked, so cohesion needs something that fires.
Template defaults, installed in M1 and run in CI as `check:*` scripts (W1 fails one no workflow
runs): **knip** (unused files, exports, dependencies) and **jscpd** (duplicated blocks), each
through `ci/ratchet.mjs` so existing debt never blocks work but new debt fails; and
**dependency-cruiser** for boundaries (packages never import apps, features do not reach into
each other's internals, one data layer). Recurring choices go in `docs/conventions.md`.

## D-013 — Deploy and promotion *(open — week 1)*

Build once, promote the same artifact; the deploy runs `pnpm verify` on the exact tree it ships.
