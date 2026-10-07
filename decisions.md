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

## D-022 — The owner's work order is a local page over the milestone and live GitHub state *(decided 2026-09-30)*

An owner running several agent sessions needs to know which issues on the active milestone are ready, which
can run side by side, and what starts each. `pnpm status` names one step and stays offline; the roadmap page
is published, so it never shows issues or commands (D-017). A hand-kept version of this page drifted within
days, as D-017 predicted for anything kept by hand.

- **Rendered on demand, locally.** `pnpm work-order` reads the active milestone's Contents and, through `gh`,
  the issues its items name, and writes one HTML file to the temp directory. It is never hosted, published or
  committed, so it may show issue numbers, titles, blockers, commands and the designation line.
- **Nothing else of an issue.** From a body it reads only the designation section, `Blocked by:` and
  `Touches:`. Every value is escaped and the page has no script: issue text is written by other people.
- **Parallel-safety is declared at intake.** An issue's optional `Touches:` line lists the paths its PR will
  change; intake writes the folder when unsure. An issue without one conflicts with everything.

Consistent with D-017: its "reopen for live GitHub state" is about the published page, which stays as it is.
Declined: live state in `pnpm status` (it runs in every session's hook and must not need the network), and
an epic as a source for repositories with no milestone (an epic's order is prose, not its sub-issue order).
Spec: `dev/features/work-order.md`.

2026-09-30 — `--serve` (#183): serving the page on the loopback address (`127.0.0.1`) to the owner's own browser
is within "rendered on demand, locally". It is a listener only the owner's machine reaches, not hosting: the page
is still never hosted, published or committed.

## D-023 — The trust line: defend against other people's content, not the owner's own tree *(decided 2026-09-30)*

Slipway's gates and skills defend against content from other people: their pull requests, issues, fixtures
and dependencies. A defence against the owner's own working tree, a hand-set environment or a deliberate local
action is a known limitation, written in the PR with one line on why a pull request cannot cause it. It is not
a fix, an issue or a commit.

The line was applied before it was written down: #123 (switching the drift check off), #124 (a reused branch's
planted settings), #126 (a branch's own hook scripts) and #133 (files a pull request can commit that change which programs the gate runs) were
each judged by one question, "can a pull request's committed files cause it?" A yes was fixed or tracked; a
no became a known limitation.

Why: the owner can already change anything on their own machine. A defence there prompts on ordinary work and
stops nobody who means it. Declined: guarding the local `.git` directory and hand-edited workflow or script
keys, which a reviewer sees in the diff. Written up as §3 of `process/decision-defaults.md`; #152.

## D-024 — A check deferred to after merge is written on its Contents item until its result is recorded *(decided 2026-09-30)*

A PR that can only prove part of its issue once `main` deploys closed the issue on merge, and the check it
moved to after merge was never run: twice in a row on a real project's first milestone.

- **The issue stays open.** That PR links `Part of #n`, and its diff adds an `Owed:` line under the milestone's
  Contents item. `pnpm status` lists it; `pnpm meta` fails a closed milestone that still has one.
- **A result is a comment, and the line points at it.** The run is posted as a comment on the issue (date,
  environment, each journey's result); a trivial PR turns `Owed:` into `Ran:` with that comment's URL. A
  `fail` stays owed until a later pass or a linked bug.
- **No waiver.** A check that will never run is removed in a PR that records a decision.

Declined: a follow-up issue per deferred check (status would still need a repo line); GitHub state alone
(status reads no network, D-022); status without a failing check (advisory only). Spec:
`dev/features/deferred-checks.md`; #176.

## D-025 — Under `.claude`, everything is gate code but skills *(decided 2026-09-30)*

The hook guard runs a checkout's hooks only while its gate files are the default branch's. Under a `.claude`
folder, gate code is what runs without being invoked (settings, hooks) plus everything else there by default
(agents, commands, and whatever Claude Code reads from that folder next), so a new path stays covered without
being listed. Skills are exempt, because a skill runs only when it is invoked: a branch that changes only
`.claude/skills/**` keeps its Stop hook.

The backstop: `.claude/skills/**` stays owner-only, so the harness asks before each edit, and the PR check
requires a `## Gate changes` line for it. A skill change is seen at the pull request, not at the Stop hook.

Consistent with D-023. Declined: listing the gate paths under `.claude` one by one (a path nobody listed
would not count), and exempting `.claude/commands/**` with skills. #173.

## D-026 — The lockfile check trusts the registry host the project's `.npmrc` names *(decided 2026-10-01)*

A project on a private registry (Artifactory, Verdaccio, a mirror) has pnpm write `tarball: <address>` beside each
package's integrity. LK1 accepts that when the address is `https` on exactly the host the root `.npmrc` `registry=`
line names, and the integrity hash is still required. Any other host, an `http` address, a user or password in
the address, or no hash still fails; a `.npmrc` the check cannot read as one address (two `registry=` lines, a
variable, an empty value) makes LK1 BROKEN rather than pass. `.npmrc` is already a gate file, so changing the
host reaches the owner as a `## Gate changes` line. A project with no `registry=` line is judged as before.

Consistent with D-023: a pull request can change `.npmrc` and the lockfile together, but not unseen. Known
limitation: scoped `@scope:registry=` lines, and a registry set outside the root `.npmrc`, are not read, so
those projects keep a dated exception per package. Declined: keeping an exception per package (hundreds of
excuses, or the check dropped), a separate owner-written list of hosts (a second place to keep in step with
`.npmrc`), and trusting any `https` host. #147.

## D-027 — Slipway is released from version tags, staged by CI and approved by the owner at npm *(decided 2026-10-05)*

Slipway is published to npm as `use-slipway`, under the MIT licence. A release is a pull request that sets
`package.json`'s `version`, merged to `main`; then the tag `v<version>`, pushed by the owner on that merge commit;
then the owner's approval. CI does not publish: on the tag it stages the package with npm trusted publishing (no
token exists, in the repository or anywhere), and the package becomes public only when the owner approves that
exact package at npm with their second factor. Nothing else releases: not a merge, not a schedule, not a local
machine, not a session. Versions are semantic: below 1.0 a breaking change to what a project receives or to a
command raises the minor number, anything else the patch number. A version with a pre-release part (`0.2.0-rc.1`)
goes out under the npm label `next`, never `latest`. A project's `use-slipway` script runs `use-slipway@latest`,
so it takes the newest release each time it syncs; to pin one, the owner edits that line to `use-slipway@0.3.0`,
and sync reports the edited line instead of overwriting it. A published version is never replaced: a fix is the
next version.

Why: until now every project took whatever `main` was that minute, so there was nothing to pin, announce or roll
back to. npm matches a trusted publisher on the repository and the workflow's file name, not on the ref or the
file's content, so checks inside the workflow guard against mistakes only; an approval of the package itself, with
a factor no session holds, is the one gate that binds what is published. Consequences: `release.yml` is slipway's
own (internal, never shipped) and owner-only gate code, in two jobs so that tested code never holds the publishing
identity. The owner, outside the repository: links `use-slipway` to the workflow as a stage-only publisher under an
environment `npm` limited to `v*` tags, sets the package to require two-factor authentication and disallow tokens,
adds a rule that only they create `v*` tags, pushes each tag and approves each staged package. The first versions
are `0.1.0-rc.1` and `0.1.0`, above the placeholder `0.0.0`. Spec: `dev/features/release.md` (F-10); #91.

Declined: publishing directly from CI after an approval click on the GitHub run (the click comes before the
package exists, so it does not bind it), a project script pinned to the version the last sync wrote (it would run
the old code to do the sync, so it never moves forward), calendar versions (no signal for a breaking change),
publishing on every merge (a release nobody chose), a scoped package or organisation, a second `create-slipway`
bin, and a `prepublishOnly` guard (package scripts are merged into every project, where it would block theirs).

## D-028 — A cold review is required on four surfaces; the reviewing-tier list stays wider *(decided 2026-10-06)*

A cold review is required before merge on a change touching money, auth, schema or data deletion, and
`process/cold-review.md` → When is the one place that says so: every other file points at it or repeats those
words exactly. The wider list in `process/designation.md` → Review (money or checked math, auth or secrets,
concurrency, a schema, data integrity, data deletion) only picks the tier that reviews once a review runs. The two
lists differ on purpose.

Why: the two lists cost different things. A wider tier list costs a stronger model on a review that already runs.
A wider required list costs a second review, and "concurrency" and "data integrity" have no edge a reader can
check: most changes that store anything touch one of them, so the rule would mean every change, and a rule that
means every change is read as none. `/work-ticket` already runs a cold review on each pull request it opens, so
the required list matters for changes made by hand, where four surfaces a person can recognise serve better
than six they have to argue about. Which of a project's own surfaces count as data integrity stays in its
`Domain invariants doc`. #229.

Declined: requiring a cold review on concurrency and data integrity as well (more second reviews, on a trigger
nobody can test), and narrowing the reviewing-tier list to the four (a stronger reviewer there is cheap).

## D-029 — A review of an older version retires when the review that replaces it names it *(decided 2026-10-06)*

When a reviewed document is revised and reviewed again, the new review names each earlier review it replaces, one
`Supersedes: docs/reviews/<file>` line each. R1 stops reporting `provenance/stale` for a review once a current
review of the same document names it that way. Retirement is stated, never inferred: the earlier file stays as
it was written, and a stale review nobody names is reported as before. A line in a review that is itself stale
retires nothing. A line naming a file that is not a review, or a review of another document, retires nothing and
is reported. There is no chain: with three versions, the newest review lists both earlier files. The review
that retires another quotes a whole line of the document as its version line; a word found somewhere in it
retires nothing (found in review of #274's pull request).

Why: R1 read each review alone, so the review of an earlier version stayed red for as long as its file existed,
and the only ways out were deleting it (its findings and their trackers leave the tree), keeping the old version
line in the document, or a red default branch. Naming is the one signal a review written from memory cannot get
by accident: nobody edits an existing review to add the line, and an honest review does not name a file it does
not replace. #274.

Declined: retiring every stale review whenever any current review of the document exists (a version line
written from memory would pass beside an honest review, which is the failure R1 exists for), and retiring by
`Review date:` (a from-memory review dated the same day as an honest one would retire, and reviews and revisions
do land on one day).

## D-030 — A recorded decision settles a failed run only by removing its line; a closed bug settles nothing *(decided 2026-10-07)*

A failed run stops owing in two ways, as before: a later `Ran:` line says `pass` for the same check, or the fail
line names the bug filed for it. Two things are added to D-024.

- **A closed bug owes again.** A fail line that names a bug stops owing only while that bug is open. Once it is
  closed with no later pass, the check owes again. `/close-milestone` reads the bug's state when it proves the
  gate; `pnpm status` and `pnpm meta` read no network (D-022), so they keep reading a named bug as settled.
- **An accepted failure has no line form.** When a check ran, failed, and the owner accepts the result, the
  check line is removed in a pull request that records a decision saying why. That decision names the check and
  links the failed run's comment, so the history lives in the decisions record. "No waiver" stands: it now
  covers a check that will never run and one that ran, failed and was accepted.

Why: on a real project's first milestone a fail line merged naming a bug that was already closed, with every
check green, and an accepted failure had to name a bug to stop owing because the rule had no other shape for
it. #257.

Declined: a fail line that names the decision (` · decision PD-n`) and stops owing. It is a waiver with a
citation: a check can prove the decision exists, not that it is about this check, and a line that reads `fail`
and does not owe says less plainly what happened than a removal a reviewer sees in the diff.

## D-031 — After the round that ends the review, nothing is committed; a merge of the base is the one exception *(decided 2026-10-07)*

After the round that ends the review, nothing is committed: the pull request's head is the last reviewed head.
This holds in every lane, not only for a pull request that defers a check.

- **What is left over is written down, not committed.** A finding still open when the review ends goes in the
  pull request's body as a known limitation, or into one follow-up that holds them all: never a commit, and
  never an issue each. Editing the pull request's description is not a commit.
- **A merge of the base branch is the one exception.** The pull request names the merge commit and each file
  whose conflict was resolved by hand, with what was kept, and the gate runs again on the merge. A conflict
  resolved by hand in an owner-only file gets one verify of that merge.
- **The pull request says which it is.** Its `## Cold review` ends by naming the last reviewed head and the pull
  request's head, and what lies between them, or that nothing does.

Why: the sentence was written once, in the rule for a check left for after merge, and `/work-ticket`'s review
rounds never said it. In one day three pull requests in one project applied it three ways: one held back a fix
that broke nothing, one committed four wording fixes after its last reviewed head and said nothing, one
committed a sentence and said so. All three merged, and a reader could not tell which commits a reviewer saw.
The owner merges on "what was reviewed is what merges"; this keeps it literally true. #283.

Declined: a named class of change after the last round (comments and documents outside rule files, each listed
as not reviewed): the session whose work is under review would judge what is in the class, and what the class
has left once rule files and tests are out is small. And anything at all, if listed as not reviewed: a code
change could merge unseen. A merge of the base that needs a round of its own in every case was declined too: a
pull request that conflicts with the default branch would cost a round per conflict.

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
