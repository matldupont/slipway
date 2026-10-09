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

- **Every commit is seen by a verify.** Whatever a round's findings lead to, a fix or a line added to a
  document, is committed before the verify of that round, whether or not the finding broke a guarantee. The
  review ends with a verify that finds no broken guarantee, or with a first round that led to no commit.
- **What is left over is written down, not committed.** What that last verify or review found goes in the pull
  request's body as a known limitation, or into one follow-up that holds them all: never a commit, and never an
  issue each. Editing the pull request's description is not a commit.
- **A merge of the base branch is the one exception.** It is a merge of the fetched remote branch. The pull
  request names each merge commit and each file the merge stopped on, with what was kept, and the gate runs
  again on the merge. The list is the one git gives before anything is resolved: a conflict settled by keeping
  one side whole leaves no trace in the merge commit. An owner-only file on that list is shown to the owner for
  their yes before the gate runs, as any change to such a file is, then gets one verify, of that resolution
  only. A guarantee the merge breaks, or a red gate, stops the run and the pull request stays a draft (found in
  review of #283's pull request).
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

## D-033 — Workflow files are read by one pinned parser, kept in `ci/checks/` *(decided 2026-10-07)*

The checks read a workflow file through a YAML parser, not by matching its text. The parser is one file of
js-yaml (5.4.2, MIT), copied unedited from its published release into `ci/checks/lib/vendor/`, with its licence
beside it and its hash pinned by a test. In front of it sits a reader of slipway's own, which refuses what it
will not vouch for. A workflow file it refuses, or one the parser cannot read, is unread: it counts for nothing,
and the check names it.

**How D-004 reads now:** nothing is installed, and `ci/checks/` still runs on bare Node with no install step; one
pinned parser is part of `ci/checks/`, and a workflow file is no longer read as a declared subset of text.

- **Each reader of workflow text.**
  - W1's reader (`ci/checks/lib/workflows.mjs`: what starts a workflow, its `run:` lines, the workflows it
    calls) moves to the parser, in #306's pull request.
  - FO1 (`ci/checks/meta/fo1-fail-open.mjs`) moved to the parser in the follow-up, #332. A workflow file the
    reader refuses is BROKEN (exit 2), naming the file and the reader's reason.
  - D1 (`ci/checks/meta/d1-drift.mjs`) stays: it compares a workflow file's hash and never reads it as YAML.
  - The command reader (`ci/checks/lib/commands.mjs`) stays: it reads one shell command line, which is not YAML.
- **Agreeing with YAML is not agreeing with GitHub's reader.** The reader refuses what the two are most likely
  to read differently: an anchor, an alias, a tag, a merge key, a key written twice, a key that is a list or a
  mapping, a directive, more than one document, and a top level that is not a block of keys. Any other
  difference between GitHub's reader and this parser is a stated limit, on a file both read and on a text only
  this parser reads.
- **The parser is stricter than GitHub's reader in one place real workflows meet, and that is a cost.** A
  closing bracket at its key's indentation, or a later line of a quoted text there, is not YAML to it. A workflow written that way is believed to run on GitHub (not tested for this
  decision) and is unread by the checks, which then report every gate it runs as not run. The report names the file and the line and says how to write it: the
  list on one line, or the closing bracket indented past its key. Nesting deeper than 100 is not read either.
- **It is not strict everywhere.** Review of #306's pull request found it reading what a stricter reader
  rejects: a document marker that is indented, a `...` marker, an empty key, a key over 1024 characters, a
  plain text that starts with a bracket or a comma, and a directive it does not know, which it passes over.
  The reader in front refuses the forms of each that are listed and tested. It is not a complete defence
  against every text this parser reads more leniently than a stricter reader: 5 known gaps are #339, and
  others may exist. All of them are the limit above.
- **What a project sees.** The parser and its licence notice arrive on the project's next sync, as files slipway
  maintains. Nothing is installed and no lockfile changes. A project with a workflow the parser does not read
  gets that report on the sync, and one edit to the workflow clears it.
- **A new parser version is a replacement, never an edit.** The pin moves only to a published release at least
  14 days old, in a pull request that replaces the file whole, moves the pinned hash and changes nothing else.
  The same checks run each time and are written beside the file: the download equals the registry's hash, the
  version's tag exists upstream at the commit the registry names, the built file's change since the pinned
  version is read against the upstream change, and the file is read for anything that loads code or reaches
  outside itself. 5.4.3 was the newest release on the day of this decision and was two days old, so 5.4.2 was
  taken (the owner's choice, 2026-10-07).

Why: hand-written reading of workflow files drew the same class of review finding in two pull requests. #237's
release test read by line and passed spellings it did not understand (#240). #301's W1 reader reached the review
cap with 3 findings open, each a file written to mislead a text reader into counting a gate that does not run,
in the check that proves the other gates run. Workflow files being owner-only was the one defence left, and it
rests on the owner's eye catching a file written to be misread. One parser ends the class for W1, FO1 and #240
together. #306.

Declined: a parser as an installed dependency (the checks would need an install step before they run, which is
what D-004 exists to prevent, and a dependency could then break the harness that proves the other gates), and
keeping the limit on record (3 findings stay open, and #240 is left to write a third reader by hand).

## D-034 — A session with no pin at all, nothing changed and exactly at `origin/HEAD` ends its turn unblocked *(decided 2026-10-07)*

With no pin the Stop hook cannot load the guard, so it blocks once a turn and has the agent run
`pnpm verify:fast` by hand (#154). The owner decided that one state is let through, in silence: the session id is
usable, no pin exists for it at all, the checkout has no change (no tracked change, staged or not, no untracked
file, no change in a submodule one level down) and its `HEAD` is the commit `origin/HEAD` names. Everything else
blocks as before, and so does any state git cannot answer for.

- **This loosens a gate, inside that bound.** A state that blocked now passes. A pin that is there and cannot be
  used (empty, a link, not a commit id, a commit with no guard) still blocks, and so does a session id that is
  unset or malformed: those look like something went wrong, so they stay loud. A pin whose folder cannot be read
  is not told from no pin.
- **Exactly at the head, not behind it.** A clean checkout that is behind `origin/HEAD` is blocked, though every
  commit it holds is on the default branch: the test is one comparison with no walk through history, and the
  block names the remedy, a fast-forward. The owner chose this over passing any earlier commit.
- **It reaches more than the session the issue describes.** The fallback cannot tell why there is no pin: a
  session that began before the guard was installed, a compaction or a resume with none, and a base that holds no
  guard yet (#154) all pass in that state.
- **What it reads is the checkout's own git.** The remote head is read from the ref, with no network call. Four
  settings are named in the command, not inherited: untracked files are listed, submodules are compared, and no
  file monitor or replace ref is followed. Any other local git setting that empties a status still hides a
  change, as an index flag or an ignore rule does, and a submodule's own settings still apply inside that submodule
  (the four named apply to the top repository only), so they can hide a change in it or in one inside it: the limits
  `process/harness/README.md` lists for the guard.
- **One limit is wider than it was.** The comparison is with the live `origin/HEAD`, since a session with no pin
  has nothing else to compare with. For such a session an `origin/HEAD` the agent moved counts at its next
  stop, where for a pinned one it counts only for a later session. The harness asks before the direct ways of
  moving it.
- **Only the checkout is read.** Work the session left on another branch, in a stash or in another worktree is
  not seen, as it is not by a pinned session's Stop hook.

Why: a session that only read the repository ran the gate by hand on every turn for four days, and 9 of those
runs were red from machine load alone (#262). In that state there is nothing in the checkout to verify: the
code is the default branch's, which CI ran the gate on. The block was advisory already, since a second stop ends
the turn; and anything that reaches a pull request is run by CI.

Declined: keeping the block and explaining it (the measured cost stays), and a command the owner runs to pin a
base for a running session (a second writer of the pin, which today only a session's first start writes, and a
new seam).

## D-035 — `/work-ticket`'s reviewers run at a stated tier and effort; a risky surface or a gate file reruns round 1 on the strongest tier at `xhigh` *(decided 2026-10-08)*

The cold and security reviewers are agent definitions in `.claude/agents/`, each stating its model and effort, so
a review no longer takes the settings of the session that built the change. The owner picked, with the measured
cost in front of them:

- **Classify and rerun, not the strongest tier on every review.** Round 1 runs on the standard tier at `medium`.
  Both reviewers name the surfaces the diff touches (`process/designation.md` → Review). A named surface, or a
  gate file in the diff, runs round 1 again on the strongest tier, and both runs' findings count. A gate file is one on the skill's list of the files a run is judged by, or one `ci/checks/lib/gate-files.mjs` prints under `gate`: the harness's list, computed, not repeated (#362).
- **"The highest effort" is `xhigh`.** `max` stays for when `xhigh` has been shown to fall short, as it does for
  a build.
- **Rounds 2 and 3 use the definitions round 1 ended on** (the orchestrator session's advice, taken): one tier and
  effort per pull request, since a verify reads a fix against the same guarantees. Amended 2026-10-08 (#362, the owner's yes): unless a verify on the standard pair names a surface. That verify is run again on the strongest pair before the review can end, in the same round, both runs' findings count, and the rounds after it stay on that pair.

Why: a ticket built at `low` was reviewed at `low` (PR #352's run: both reviewers on the standard tier at `low`,
the security review two requests long), and a thin review reads as "nothing found". Measured on that pull
request, a 9-line diff, both round-1 reviews together, one run each, on Claude Code 2.1.293: the standard tier at
`medium` $0.50 and 19 s; the strongest tier at `xhigh` $2.15 and about 13 minutes; at `max` $4.45 and about 16
minutes (the time is the longer of the two reviews, since they run side by side). A definition's effort is honoured: a session at `low` started subagents that ran at `high`, `xhigh` and
`max` as their definitions said. #327.

Declined: the strongest tier on every bounded or feature review (four to nine times the cost and a quarter of an
hour on a change to a static page), and `max` as the stated effort (twice `xhigh`, and it went past what the
brief asked). What this leaves open: a reviewer can misname a surface, and nothing checks the name it gives; a
script over the diff's paths is deferred until a real run shows a listed surface reviewed on the standard tier.

## D-036 — A section added to the feature-doc template never turns a shipped doc red on sync; the count is recorded by sync and may only go down *(decided 2026-10-08)*

`docs/features/TEMPLATE.md` gains a `## Fit` section (F-12, `dev/features/feature-fit.md`, #48) and a check, F2,
that a doc past `draft` has it filled. Projects that take that release have docs shipped before the section
existed. The owner chose what they meet:

- **The count ratchets.** F2 counts the docs past draft with no filled Fit and compares it with `feature-fit` in
  `ci/baselines.json`, the file the other ratchets use. Above fails, equal passes, below passes and may be locked
  in; a new or newly shipped doc without Fit raises the count, so it fails.
- **Sync records the starting count.** `sync --plan` shows the number in the project's words, and `--apply`
  writes it into `ci/baselines.json` (a seeded file; a project's other keys stay its own). The owner never edits
  the baseline by hand. If sync cannot show and write it cleanly, the build stops there and the question comes
  back before anything further is built.

Why: the alternative that forces a backfill before the gate is green again turns a sync into a writing job across
every shipped doc, and the release after this one is the first a real project takes with feature docs already
shipped; a written-reason exemption line would show nothing of how many docs took it. The orchestrator session
proposed the ratchet; the owner set the condition on sync.

Declined: backfill before green (a); an exemption line with a reason (b); a grace rule keyed on when a doc's
status changed (c, nothing records that). #48.

## D-037 — A pull request's new tests must each fail on a change to the code; slipway's own mutator checks it, within 5 minutes *(decided 2026-10-08)*

#51 asks that a product's tests be able to fail, checked on every pull request (F-13,
`dev/features/tests-can-fail.md`). The owner picked each of these on 2026-10-08, with the measurements below in
front of them:

- **The rule.** No stored score and no baseline: `ci/ratchet.mjs` fails a number that rises, a mutation score
  is better when higher, and "the files this pull request changed" is a different set each time. A pull
  request fails when a test it adds or edits never fails, whatever is changed in the code its test file
  imports. Changes to the pull request's own lines that no test noticed are listed and do not fail it.
- **A test the step can find no code for is named, not failed** (the orchestrator session's advice, changed
  after the measurement, then the owner's pick). Its subject is in a place the step does not follow, or it
  reads files and not code. Each is listed by name with the reason, and the summary gives the count. Failing
  them was measured to fail ordinary pull requests for tests that were fine.
- **The tool is a small mutator in slipway that stops at each new test's first failure.** The rule needs one
  failure per new test, not a full analysis, so the cost has a cap; it reads the test runner through its
  command line only, so it is tied to no runner version; and it can change a file in another workspace
  package. Slipway owns that code and its bugs.
- **Its parser is a pinned copy, on D-033's terms.** One file of `@babel/parser`, byte-identical to the
  published file, in `ci/checks/lib/vendor/` with its licence beside it and its hash pinned by a test. The pin
  moves only to a published release at least 14 days old, in a pull request that replaces the file whole,
  moves the hash and changes nothing else. Checked on 2026-10-08: 8.0.7 is one self-contained ES module of
  481,458 bytes, MIT, with no import, and reads TypeScript and TSX on bare Node 24; it was one day old, so the
  build takes the newest release that is 14 days old.
- **So the mutator's own tests run in slipway's gate, with nothing installed:** what it would change in a
  source text, and the verdict on a recorded run, under `pnpm meta`. Only the call to a real test runner is
  proven in a project, once on a real one before it ships (decision-defaults §9).
- **A source file the parser cannot read is named "not judged: could not be parsed", never passed silently.**
  JavaScript, JSX, TypeScript and TSX are read alike. Any other source (a Svelte or Vue file, another
  language) is not changed, and a test whose only subject is such a file is named as not judged. The step
  needs Vitest: a package without it has its changed tests named as not judged, and a project with no such
  package fails the step with that message. It never passes for having nothing to look at.
- **The budget is 5 minutes** of wall time on a pull request touching 10 source files, on the project's CI
  runner. Over it, the step warns with both numbers. At 10 minutes it stops and **fails**, saying it ran out
  of time and naming each test it did not judge; it is never a pass. The first project to run the job records
  the runner's time, and the number is revisited with it.

**Measured** 2026-10-08 on a scratch project made by `scripts/new-project.mjs` with the default app (Vite,
React, TypeScript, Vitest with jsdom) and a change to 10 source files (5 edited, 5 new, 185 added lines) with
38 new or edited tests. Two tests were planted so they cannot fail: one never calls the code, one calls it and
swallows what it does. Apple M4, 10 cores, Node 24.12, wall time, median of 3 runs unless marked. A hosted CI
runner was not measured: slipway has no app to run the step on.

| option | time on the 10-file change | changes tried | names both planted tests |
|---|---|---|---|
| **StrykerJS 10.0.0** with Vitest 4.1.11, the ten files whole, 9 workers | 60 s (116 s with 2 workers, 1 run) | 372 | yes |
| the same, only the changed lines | 36 s (68 s with 2 workers, 1 run) | 246 | yes; a new test for code the change did not touch has nothing to be judged against |
| the same with **Vitest 5.0.3**, the newest | 63 s, exit 0, **wrong** | 372, of which 212 read "survived" with no test run against them | no |
| **a small mutator in slipway**, every change tried (prototype: TypeScript compiler API, 5 kinds of change, one at a time through the test runner's command line) | 158 s (1 run) | 174 | yes |
| the same, **stopping at each new test's first failure**, at most 30 changes per test file | 186 s (1 run) | 99 | yes |
| the same on **Vitest 5.0.3** | 192 s (1 run) | 99 | yes: the same verdicts |
| **run the new tests against the base version of the source** | 2 s | none | no: the tests of the 5 new files cannot load, so 19 tests, both planted ones among them, are never judged |
| **do nothing** (prose, and the cold review's question) | 0 | none | no |

The same measurement was run on a private product with one engineer, a web app; its figures were shown to the
owner and are not recorded.

What the runs found, each of which the step has to hold whatever is picked:

- **StrykerJS 10.0.0 gives a wrong answer with the newest Vitest and exits 0.** Every change covered by a test
  inside a `describe` reads "survived" with no test run against it (stryker-mutator/stryker-js#6210, open since
  2026-09-04; the fix is not released). A step that reads its report must refuse one whose tests did not run.
- Its report does not say where a test is in its file, so "a test this pull request added" has to come from
  the test runner's own listing (`vitest list --json --includeTaskLocation`) and the diff.
- It stops at a mutant's first failing test unless told not to (50 s instead of 60 s), and then cannot say
  which tests noticed a change.
- pnpm does not let it find its Vitest plugin: the config must name it. It does not run browser-mode tests.
- With every approach, a weak test passes: the planted test that asserts only on its own input was credited
  with a change that made the code throw. The step catches the test that cannot fail at all.

Declined: StrykerJS (wrong and green on the newest Vitest today, with the fix unreleased for five weeks; two
new dev dependencies in every project; a full analysis where the rule needs one failure per test); running the
new tests against the base version (blind to new files, where most new tests are); a per-file count of
survivors under the ratchet (every pull request that adds a source file would edit `ci/baselines.json`, a file
that needs the owner's yes); failing a pull request on a surviving change (a comment in the code for every
change nothing can notice: deferred in F-13 with what brings it back); the project's own TypeScript as the
parser (slipway would ship code its gate never runs).

What this leaves open: the prototype that was timed used the TypeScript compiler API, tried changes one at a
time and edited the scratch project in place; the build uses the pinned parser and works in a copy of the
commit outside the project (F-13), and its time on a hosted runner is not known until a project
runs it. The mutator makes fewer kinds of change than StrykerJS. A weak test passes with either.

## D-038 — Every journey in a QA plan runs in the environment its check names *(decided 2026-10-08)*

A deferred check's recorded run has one row per journey, and any `not run` keeps the check owed
(`process/intake.md` → Deferred check, #217). A real project's staging plan gained a journey that can only be
run on a laptop: it writes rows by hand, which a shared database does not allow. That plan could never record a
full staging run, and the project wrote its own rule into the plan to get round it (#282). The owner chose:

- **A plan holds no journey that runs elsewhere.** Every journey in a plan runs in the environment that plan's
  check names, so a full run is a full run with no marker and no exception.
- **A journey that needs no deploy is not a deferred check.** It is run and recorded before the pull request is
  ready, under `## Manual testing`.
- **One that must wait for the merge gets its own plan,** with its own `Owed: {plan} — {environment}` line. The
  reader takes any environment, `local` included, so nothing in `ci/checks/lib/milestones.mjs` changes.

Why: nothing reads a run comment's journey rows; the checks read `Owed:` and `Ran:` lines only. A rule that lets
a staging run count a laptop journey by citing another run would be applied by a person reading, and nothing
would go red when it was applied loosely. This rule stays on the lines the reader already holds. This session
recommended the citation rule; the orchestrator session said the question was the owner's and advised this one,
adding that a journey needing no deploy is not deferred at all.

Declined: the journey stays and a run elsewhere counts it by citing a recorded run in its own environment (a
rule nothing checks); it stays and is left out of runs elsewhere (nothing makes it run); no change (the plan
never records a full run).

Consequence: a project that wrote its own rule for such a journey into a plan moves the journey out of that
plan and deletes its rule, on the sync that brings this. No check reads a plan's journeys, so a plan that still
holds one goes on recording partial runs, which stay owed. #282.

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

## D-032 — The harness asks before a file write through its edit rules alone *(decided 2026-10-07)*

The harness carried a `Write(...)` ask rule beside every `Edit(...)` ask rule, so that creating a gate file asked
like editing one (50f038d). On Claude Code 2.1.293 the `Edit(...)` rule asks before any file-writing tool edits
or creates a file at its path, and a `Write(...)` rule is matched by nothing: alone it asks for nothing, and
each one prints a warning when a project opens (#307, observed in a scratch project with a control). The owner
decided to remove the 42 write rules and the check that required them.

- **Cost, accepted.** On an older Claude Code where only the write rule asked before a file was created, creating
  a gate file no longer prompts. The PR check still counts a created gate file by its path and wants its
  `## Gate changes` line.
- **What holds it.** `scripts/gate-files.test.mjs` pins the list of paths, fails when an edit rule is removed and
  fails when a write rule comes back.

(D-031 is the number an open pull request holds.)

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
