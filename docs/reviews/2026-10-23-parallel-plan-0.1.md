# Adversarial review — F-17 parallel plan 0.1

Reviewed: dev/features/parallel-plan.md @ 5ea7c9e
Version line: Version: 0.1 (2026-10-23)
Review date: 2026-10-23
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

5ea7c9e is the head of `docs/feature-parallel-plan` (PR #533). It adds only this doc on top of `main` at bff0897, so
every other file was read at the same content as `main`. This session did not write or edit the document. No earlier
review names this path, so nothing is superseded.

F-17 has one ID and nine numbered Contract sections, so each finding is located by `F-17 §n` (or the section name)
and the line range at 5ea7c9e.

**What was read.** In full at 5ea7c9e: the doc, `dev/features/work-order.md` (F-07), `ci/work-order.mjs` (to line 200),
`ci/checks/lib/issue-body.mjs`, `ci/checks/lib/decision-lines.mjs`, `ci/checks/lib/steps.mjs`,
`ci/checks/lib/next-form.mjs`, `process/harness/hooks/session-state.sh`, `.github/workflows/issue-shape.yml` (to line 40),
`docs/reviews/TEMPLATE.md`, and in `decisions.md` the header, D-016, D-020, D-022, D-045 and D-046. In part:
`ci/status.mjs` (lines 1–80, 154–158, 315–330, 360–522), `ci/checks/meta/s1-status.mjs` (its expect.json keys),
`ci/checks/lib/decisions.mjs` (its `Amends:` reader), `ci/checks/lib/spec-review.mjs` (`SPEC_PATH`),
`ci/checks/lib/review-header.mjs` (exports), `scripts/report.test.mjs` (lines 60–95), `package.json` (scripts),
`process/harness/settings.json` (SessionStart), `.claude/skills/log-feature/SKILL.md` and
`.claude/skills/work-ticket/SKILL.md` (by search), `dev/features/next-slice.md` and `dev/features/owed-decisions.md`
(by search for "offline"), `process/lessons/L-68`. Searches, all at 5ea7c9e: `git grep` for `needs-shape`, `--hook`,
`F-17`, `prd-ref`, `Owner-only`. F2 (`node ci/checks/meta/f2-feature-fit.mjs` on an export of 5ea7c9e) passes, so the
Fit is filled. Slipway's own `docs/product/FRAME.md` is the template, so the frame question was read as `SLIPWAY.md`'s
thesis and D-016; the doc serves both, and no finding is about the question itself.

Every Fit and Contract line reference was checked: `next()` at `ci/status.mjs:379`, Also unblocked at `:422`–`:435`,
the two duplicates (`:432`/`:468`, `:434`/`:480`), Needs attention at `:467`–`:484`, `--refresh` at `:43`–`:48`,
`--hook` at `:514`, `PICKS = 3` at `ci/work-order.mjs:29`, `collect()` at `:91`, picks at `:140`–`:147`, and the ten
S1 cases with an `also` key. All hold. The GitHub counts (63 open issues, 48 with `Touches:`, 37 readable) cannot be
read from a commit and were not checked.

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
| AR-1 | Shaping first is the main step, but `STEPS` calls it agent work, so the person rule offers owner work while the owner answers /log-feature | S1 | owner | step 1 | |
| AR-2 | `Amends: F-07` is incomplete: the page cannot compute status's picks from what it reads, and F-07's contract, tests and doc are not amended | S1 | owner | step 4 | |
| AR-3 | `needs-shape` lists strangers' issues (a workflow labels any opened issue) and sends the owner to a command that takes no issue | S1 | owner | step 4 | |
| AR-4 | The first Acceptance line cannot pass: offline, the build loop's main step has unknown files, so nothing with files runs beside it | S1 | shaping session | step 2 | |
| AR-5 | "No gate reads the network" has no test, and the read is keyed on `--hook`, which gate tests already pass | S2 | shaping session | step 4 | |
| AR-6 | Offline, "overlaps no pull request in progress" is checked against an empty list and passes | S2 | shaping session | step 2 | |
| AR-7 | Every session's hook now says "Start #n" until a draft PR exists, so parallel sessions start the same ticket | S2 | owner | step 4 | |
| AR-8 | Other people's pull requests steer the plan: their bodies mark leaves in progress, their paths block picks, their count turns GitHub off | S2 | owner | step 4 | |
| AR-9 | All-or-nothing turns one large owner PR into no GitHub data under a misleading reason; some caps are silent partials | S2 | shaping session | step 4 | |
| AR-10 | The 5-second budget is measured on the wrong thing, and no real run shows the folded query fits in it | S2 | shaping session | step 4 | |
| AR-11 | §8's decision is the owner's, but deferring it to step 4 breaks "record when made", and its text misses five things | S2 | owner | spec ready | |
| AR-12 | Ranks contradict: the PRD's approval is rank 2 in §1 and rank 5 in §2; Acceptance marks rank-5 owner work startable, §3 does not | S2 | shaping session | step 1 | |
| AR-13 | The sentinel test plants text in fields the query never reads and skips the text that does flow | S2 | shaping session | step 4 | |
| AR-14 | Verify does not prove the Contract: no step-3 line, no offline-gate test, no real run, and W1 needs the new tests wired before step 4 | S2 | shaping session | spec ready | |
| AR-15 | Acceptance and example lines that cannot fail or disagree with the Contract | S3 | shaping session | spec ready | |
| AR-16 | The Build map marks only step 3 as owner-only; steps 1, 2 and 4 change `ci/**` and `package.json` | S3 | shaping session | spec ready | |
| AR-17 | `review-owed` reads the local checkout's reviews; the blob-path promise is weaker than it reads | S3 | shaping session | step 4 | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — Shaping first is the main step, but `STEPS` calls it agent work

**Where:** F-17 §1 (lines 145–148), §3 "The main step" (203–208), §4's Next table and the paragraph after it (248–263).

§3 makes the first unstarted Contents item the main step, "so the agent sessions that build run while the owner answers
the shaping questions". §1's person rule says "the owner is busy when the main step's `who` (from `STEPS`, or the row in
§4) is `you`, `yours` or `you and an agent`". But status's shaping line ends in `whoLine(stepN)` (`ci/status.mjs:404`),
and `STEPS[4]` and `STEPS[5]` are both `who: 'agent'` (`ci/checks/lib/steps.mjs:13`–`14`). §4 gives the shaping case
files but no `who`. So while the owner answers /log-feature's questions, the planner treats the owner as free and may
offer a `(you)` line beside it: two owner things at once, which Q1 forbids. §6 itself says /log-feature "asks you its
open questions" and marks it `you`.

The reversal also has a cost the doc does not state. F-07 took up to three ready builds and shaped only when fewer were
ready (`work-order.md:142`–`145`). Under F-17 an unstarted item takes one of the three places for owner work, so at most
two builds run while any item is unstarted. That may be the right trade, since shaping is the step that keeps the next
builds coming, but it is a trade the owner has not been shown.

**Proposed resolution.** Give the shaping case its own `who` in §4's table, `you and an agent`, and say the person rule
reads it, not `STEPS`. Add one sentence to §3 saying builds drop from three to two while an item is unstarted, and why
that is accepted. Add a `scripts/plan.test.mjs` case: a shaping main step and an owner thing with no overlap leaves
the owner thing out of In parallel.

### AR-2 — `Amends: F-07` is incomplete

**Where:** F-17 §3 (189–225), §8 (365–380), Acceptance (528–530), Build map step 4 (564–566); F-07 Contract
(`dev/features/work-order.md:102`–`145`, `:147`–`165`), Acceptance and Verify (`:236`–`318`).

§3 says "Work-order's page shows the same main step and parallel picks as its Next". `plan()` takes `owed` (status's
owed things) and `inProgress` (each open PR's `Touches:` together with its changed paths). Work-order has neither.
`collect()` reads PRs with `gh pr list … --json number,isDraft,body` (`ci/work-order.mjs:109`), never their changed
files, and nothing in it computes status's owed list or main step. The doc does not say whether work-order switches to
`github-state.mjs` and `owed.mjs`, or how. As a result:

- Status's main step and its In parallel can be non-issue work ("(you) Test the untested value risks", a register
  finding, an owed check). F-07's page renders a pick as "`#n` link, title, Touches, `/work-ticket n`, designation"
  (`work-order.md:152`–`153`). How such a pick renders, and how status's text is escaped into HTML, has no contract.
- F-07 reads 200 PRs and exits 1 naming `gh`'s first stderr line (`:109`–`114`). F-17 reads 100, then nothing, in
  fixed words. Which rule the page follows is not said.
- The Acceptance "Given the same recorded answer, When collect() and status run on it" cannot be written. `collect()`
  consumes three `gh` calls of its own shape and status consumes the child's JSON, so one recorded answer cannot feed
  both.
- F-07's Acceptance lines and its `pnpm work-order` real run assume build-first. Its "Decisions this rests on" says
  status is offline. None of these is listed as changing. The rule in `process/slipway-rules.md` ("that feature's doc
  or Contents line names the decision") means F-07's doc owes a citation once §8 is recorded. A Contract edit moves
  F-07's `Version:` and needs its own review. The Build map has no step that edits `dev/features/work-order.md`.

**Proposed resolution.** Choose one of two options. (a) Narrow the shared function to the ticket picks. Work-order and
status share the leaf choice and the cap, and the page keeps showing issues only; its Next is then "the tickets status
names", not the whole plan. (b) Keep the whole plan on the page. Then step 4 rewrites `collect()` on `github-state.mjs`
and `owed.mjs`, and §3 gains a short "F-07 changes" list (read path, PR limit, failure rule, how a non-issue pick
renders). Step 4 also edits F-07's Contract, Acceptance and Verify, cites the decision, and gets F-07 a fresh review.
Under either option, rewrite the shared-picks Acceptance so both sides read one input that exists.

### AR-3 — `needs-shape` lists strangers' issues and names a command that takes no issue

**Where:** F-17 §6 `needs-shape` row and the paragraph after it (346, 348–351), Threat model (448–449), Known
limitations (475).

§6 lists "an open issue labelled exactly `needs-shape`" with no author test. §6 limits pull requests to the viewer's
own "so no line points an agent at another person's branch". But the label is not the owner's. `.github/workflows/
issue-shape.yml` runs on every `issues: opened, edited` and adds `needs-shape` to any issue whose body fails I1
(`:7`–`9`, `:49`–`51`). On a public repository, then, any stranger who opens a free-prose issue gets one line in
every session's hook, ranked 1 when it is a leaf and 3 otherwise: "(you) Shape #n in a fresh session with
/log-feature". That breaks the Threat model's "No line points an agent at another person's work".

The action is also wrong for what the label means. `needs-shape` means "this issue's body failed the shape check".
/work-ticket handles it by quoting the issue-shape comment's "Edit it to fix:" bullets
(`.claude/skills/work-ticket/SKILL.md:80`). /log-feature takes an idea or `M<n>#<k>`, has no mode for an existing issue
number, and would file a second issue. The Known limitations line ("`needs-shape` is the only owner question status
sees") treats the label as an owner question, which it is not.

**Proposed resolution.** List only `needs-shape` issues the viewer opened, or whose `authorAssociation` is `OWNER`,
`MEMBER` or `COLLABORATOR`, and count the rest on the GitHub line. Change the action to "Edit #n's body to fix what its
shape comment lists", or, if the owner wants issues to be reshaped as features, name that path explicitly in
/log-feature first. Add the stranger's-issue negative to §9 and the Acceptance.

### AR-4 — The first Acceptance line cannot pass

**Where:** F-17 Acceptance (481–484), §9 `parallel-existential` (391), §3 rule 3 (214–215), §4 offline row (256),
Known limitations (463–464).

"Given the skeleton M1 active (an agent main step), M2 shaping, and an untested existential risk … Then In parallel
lists "(you)" scheduling that risk's test". S1 runs status with no `--online`, so the case is offline. With M1 active
there are only two outcomes. If every item is started, the main step is §4's "GitHub not read" row, whose files are
"unknown". `overlap()` returns true when either side is null (`ci/checks/lib/issue-body.mjs:54`), so the existential
line (files `docs/PRD.md`, `docs/product/FRAME.md`) fails rule 3. If an item is unstarted, the main step shapes it,
and its files include `docs/PRD.md`, which overlaps again. Known limitations says the same: "an agent main step with
unknown files offers no file-writing thing beside it". The doc's lead case, an existential risk next to a parked
question, is the one the Contract cannot show.

**Proposed resolution.** Either give the offline build loop known files (for instance, "the active milestone's file
and the `Touches:` of nothing", or a stated list), or move the case to a main step with known files (the skeleton
shaping, step 4's files). Recheck `parallel-owner-order` against the same rule.

### AR-5 — "No gate reads the network" has no test and rests on a flag tests already pass

**Where:** F-17 §5 "When" (279–282), Threat model "No gate reads it" (456), Verify (543–550).

The read runs "on `--hook` … and on `--online`. Never under `--refresh`, S1, `pnpm meta`, `pnpm verify` or CI". Gate
tests already run `--hook`: `scripts/report.test.mjs:78` runs `ci/status.mjs --hook <root>`, and
`scripts/harness-base.test.mjs:221` runs `session-state.sh`, which execs `status.mjs --hook`. Both run in `pnpm meta`
and CI. Today they read nothing only by accident: a fixture root with no `Issue repo` makes the child stop before `gh`.
A fixture that sets `Issue repo`, on a machine or runner where `gh` is signed in, makes a gate call GitHub. Nothing in
§9 or Verify would notice. This is the one promise D-020 and D-022 are amended around.

**Proposed resolution.** Make the rule a property of the run, not of the flags tests pick. For example, the child never
starts when `CI` is set or `CHECK_TODAY`/`CHECK_NOW` is set, the variables every status test uses to fix the clock. Add
an Acceptance line and a test with a recording `gh` stub on PATH (outside the repository, so the trusted PATH keeps it):
`--refresh`, S1, and `--hook` under `CI=1` record zero calls.

### AR-6 — Offline, overlap with pull requests in progress is checked against an empty list

**Where:** F-17 §3 inputs (199–200) and rule 3 (214–215); Known limitations (465).

"`inProgress`: the files of each open pull request (§2), empty offline." Rule 3 then passes for every owed thing against
pull requests it never read. Every turn-end `STATE.md` (`--refresh` is always offline) and every failed read can list
in In parallel an owed thing whose files an open PR is changing, under the heading "safe to run beside it". The doc
covers the build-loop case (unknown main files) but not this one. When the main step is the risk test, the PRD or a
step-3 review, the offline plan offers file-writing work with no knowledge of the open PRs.

**Proposed resolution.** Offline, treat `inProgress` as one unknown entry, so only `[]` things (merge-free owner
decisions, parked lines) can be offered. Or keep the offer and add "Status did not read open pull requests, so check
them first" to each such line. Add a `scripts/plan.test.mjs` case for it.

### AR-7 — Parallel sessions are told to start the same ticket

**Where:** F-17 §4 Next table (252), §5 "A session is on an issue" (333–334), Known limitations (462–476);
F-07 Known limitations (`work-order.md:227`–`228`).

F-07 accepted "a session working an issue with no PR yet looks ready, so Next can offer it twice", because the owner
reads the page and knows what they started. F-17 puts the same pick into every session's hook as the Next line, which
an agent acts on when asked "what's next". Three sessions started a minute apart in the build loop each read
"Start #15 in a fresh session with /work-ticket 15" until the first opens its draft PR. Nothing in F-17's Known
limitations carries the F-07 line over. The job story ("what is safe to start") fails in exactly the case it is for.

**Proposed resolution.** At least, carry the limitation over and make "a draft PR before any code" a stated
/work-ticket rule the plan relies on. Better, count a pushed branch that names the issue (one more field in call 1:
`refs(refPrefix: "refs/heads/")` filtered by issue number) as in progress.

### AR-8 — Other people's pull requests steer the plan

**Where:** F-17 §2 "Files of agent work in progress" (185–187), §5 (301, 325, 333–334), §6 (338–339), Threat model
(442–459).

Only the listing is limited to the viewer's PRs. Every open PR still feeds the plan. A stranger's PR whose body says
`Part of #15` marks #15 in progress, and the ticket is never offered. Their changed paths, or more than 100 files
("unknown files"), overlap every pick. More than 100 open PRs, which spam can reach on a public repository, switches
GitHub off for everyone. The Threat model covers what is printed and what an agent is pointed at, but not what is
suppressed. L-68 is the precedent: a network read with no stated bar kept a review finding new layers.

The reverse also holds: an owner whose agents open PRs through an app or bot account has every PR counted as "by
other people", and never listed.

**Proposed resolution.** Let only PRs by the viewer, or with `authorAssociation` `OWNER`/`MEMBER`/`COLLABORATOR`,
mark a leaf in progress or add files to `inProgress`. Count the rest. Add a Threat-model bullet ("other people's PRs
can hide no ticket"), and a Known limitation for PRs opened under another account.

### AR-9 — All-or-nothing hides everything for one large owner PR; some caps are silent

**Where:** F-17 §5 reasons (295–302) and "What is read" (309–323), Known limitations (474).

"At most 20 blobs; more makes the read `GitHub answered with an error`." One owner PR that changes many reviews (a
sweep of `docs/reviews/`) therefore removes every GitHub line from every session until it merges. The reason is
misleading, and its action, "Run pnpm status again", cannot help. The other caps differ: PRs above 100 have their own
reason, but `closingIssuesReferences(first: 20)` and `subIssues(first: 50)` (folded from `collect()`) are cut
silently. For `issues(… first: 100)` the doc reads `totalCount` but defines no reason when it exceeds 100.

**Proposed resolution.** Make blob overflow per PR: that PR's `review-owed` is "not checked", and the rest of the read
stands. Give every cap either its own reason in §5's table or a per-item "unknown". Add one recorded-answer test per
cap.

### AR-10 — The 5-second budget is measured on the wrong thing, and no real run shows the query fits

**Where:** F-17 §5 "How" (284–288), §9 (414–415), Acceptance (511–513), Verify (543–550).

"exits 0 within the 5-second budget". The budget bounds the child. Status's own offline work runs around a blocking
`spawnSync`, so with a stub that sleeps past 5 s, status finishes after 5 s plus its own time. The line fails as
written, or the test reads it loosely. The doc also states as fact that one query of 100 PRs, each with 100 changed
paths, its body, closing references and check rollup, plus the milestone's issues and sub-issues, then up to 20 blobs,
returns inside 5 s. There is no measurement, and Verify has no real run (F-07's had `pnpm work-order`). A field name
GitHub rejects passes every recorded-answer test and shows "GitHub answered with an error" in every session.

**Proposed resolution.** Write the Acceptance line as "the child is killed at 5 s, and status exits 0 within 5 s plus
the time the same root takes offline". Before step 4, record one timed real run on slipway's own repository in the
doc. Add `pnpm status` against the real repository, with `gh` signed in, to Verify as a step-4 line whose output names
`GitHub: read`.

### AR-11 — §8's decision: the owner's, recorded too late, and missing five things

**Where:** F-17 frontmatter (2), Contract "Decisions this rests on" (105–108), §8 (360–383), Open questions (597);
`decisions.md` header (3, 8–10), D-020 (165–183), D-022 (203–227); `dev/features/owed-decisions.md:50`, `:58`;
`dev/features/next-slice.md:177`, `:271`.

Whose it is: the owner's. It reverses D-022's "Declined: live state in `pnpm status`" and D-020's "Status stays
offline". Those are the owner's past calls, and the owner answered Q3 on 2026-10-23. D-016 leaves only mechanical
choices to slipway, and this one is not mechanical.

When: `decisions.md` opens with "Record decisions here as they are made". `process/slipway-rules.md` says a new
decision id is taken as a branch's first commit and pushed before further work. §8 defers both until "before Build map
step 4 merges". `Amends: F-17, F-07` makes both docs owe a citation once the id exists. F-17 names "the decision of
§8" in its Contract. Writing the id there moves its `Version:` and needs another review in the middle of the build.

What the text misses:

1. **The order change.** It says the page and status name the same work. It does not say shaping now comes before
   builds, or that the page shows owed work that is not an issue (see AR-2).
2. **A pointer in the amended entries.** D-022 and D-020 keep their wording, so a reader of D-022 still finds "Declined:
   live state". D-022 already carries a dated note for `--serve`, and the same form fits.
3. **The limits of the read.** F-15 rejected "read issue state from GitHub" because "status is offline by rule (D-022)",
   and F-06 keeps "status stays offline" for done items. Both still hold only if the decision says the read feeds the
   plan alone: no decision condition fires from it, and no check reads it.
4. **A `Declined:` line**, as the record's entries carry: the cache (Q3) and ranking Needs attention offline.
5. **`Amends: F-17`.** F-17 is the decision's spec, not a feature it changes. Elsewhere a spec names its decision in
   `prd-ref:` (F-07 `D-022`, F-15 `D-045`, F-16 `D-046`), and D-045 notes that this clears the citation. F-17 has
   `prd-ref: F-17`.

**Proposed resolution.** Bring §8 to the owner now, with the five additions. Have them record it on this branch before
the spec merges, with its id taken under the id rule. Set `prd-ref:` to that id, which cites it outside the Contract,
and drop `F-17` from `Amends:`. Add the dated lines under D-020 and D-022 in the same commit.

### AR-12 — Ranks contradict each other

**Where:** F-17 §1 rank table (137), §2 `prd-approve` row (158), §3 rule 5 and `rest` (217, 224–225), Acceptance
(492–493), §9 `parallel-person` (394).

§1 lists "the PRD's approval" under rank 2 ("a milestone going active"). §2 gives `prd-approve`, the PRD's approval
itself, rank 5 ("the PRD leaving draft"), and rank 5 never runs in parallel. Rule 5 keeps rank 5 out of In parallel,
and only things "left out by the cap or the person rule" carry "It can start now". The Acceptance line nonetheless says
"each [owner thing that waits on nothing] is in Needs attention saying it can start now". The `parallel-person` fixture
holds an open decision, which is rank 5, so its expected output (question marked, decision not) contradicts the
Acceptance line.

**Proposed resolution.** Rank `prd-approve` 2. Then either mark rank-5 things that wait on nothing as startable, or
narrow the Acceptance line to "each of rank 1 to 4".

### AR-13 — The sentinel test plants text where it cannot leak and skips where it can

**Where:** F-17 §5 (311–317, 326–331), §9 (416–417), Acceptance (518–519).

The query never asks for a title, a label name or a branch name, so a sentinel planted there cannot reach status, and
the test passes whatever the code does. The text that does reach the child goes unplanted: each PR's `body` (read for
`Closes`/`Part of #n`), the doc's heading at head (read for `{F-id}`), its `Version:` lines (read for `{version}`),
and review texts at head (read for `quotedVersion()`).

**Proposed resolution.** Plant the sentinel in the body, in the heading after a valid `F-n`, in a `Version:` line after
valid digits, in a review's text, and in an author login. Assert that it appears nowhere in status's output, `STATE.md`
included.

### AR-14 — Verify does not prove the Contract

**Where:** F-17 Verify (541–550), Build map (552–566), Order and overlap (431–433); `ci/checks/meta/w1-declared-vs-invoked.mjs:9`–`10`.

Verify has no line for step 3: the I1 warning, the `process/intake.md` sentence and the three skills. F-07 used
`node scripts/skills.test.mjs` for the same kind of rule. It has nothing for the offline promise (AR-5) and no real run
(AR-10). And "`package.json`'s `meta` and `status` lines change in step 4" conflicts with W1. W1 fails while any
`scripts/**/*.test.mjs` is not run by a CI workflow, so `scripts/plan.test.mjs` must be wired in step 1, the step that
adds it.

**Proposed resolution.** Add `node scripts/skills.test.mjs` and I1's own test to Verify for step 3, the recording-stub
test for AR-5, and the real run for AR-10. In the Build map, wire each new test into `meta` in the step that adds it.

### AR-15 — Acceptance and example lines that cannot fail or disagree with the Contract

**Where:** F-17 Acceptance (499, 501–504, 481–482), §9 (391), §4 example (233–234), §2 (174), §4 Next table (252),
§3 signature (195).

- "judged by its file list" (499) is not observable. Say which file the skeleton's line must not overlap.
- "every other changed expected line is named in the pull request, case by case" (503–504) is a PR-body duty, not a
  command result. Move it to the Build map. Keep "exits 0" and the ten-case rename as the Acceptance.
- The fixture reads "resolves at M3" (391) and the Acceptance reads "resolves after M2 starts" (481–482).
- The example prints "(you) Run the owed check on M2 item 4" (234). §2 gives owed checks `you or an agent`.
- The example says "It is ready and shares no file with work in progress" (233). The Next row says "It is ready, and
  it shares no file with work in progress" (252). Pick one.
- `plan()` returns `parallel: [...owed]` (195), but In parallel also holds ready leaves, which are not owed things.

**Proposed resolution.** Fix each in place.

### AR-16 — The Build map marks only step 3 as owner-only

**Where:** F-17 Build map (552–566).

Step 3 says "Owner-only files, each asked for at its edit". Steps 1, 2 and 4 change `ci/**`, and step 4 changes
`package.json`'s scripts. Both are owner-only under `process/slipway-rules.md`. Other slipway specs say so for every
step (`dev/features/deferred-checks.md:263`, `dev/features/design-before-screens.md:642`). Step 4 also changes a
`merged` script a project takes on sync. The doc does not say what a project whose `status` script differs gets.

**Proposed resolution.** Put one line above the Build map naming the owner-only files of each step. Add one sentence on
how sync carries `--online` to a project.

### AR-17 — `review-owed` reads the local checkout; the blob-path promise is weaker than it reads

**Where:** F-17 §5 (319–323, 326–329), §6 `review-owed` (344), Threat model (450–452); `ci/checks/lib/spec-review.mjs:19`.

"a review at the head (the tree's own `docs/reviews/` plus the ones the pull request changes)". The tree is whatever the
session has checked out. A checkout behind `main`, or on another branch, misses a review the PR's base holds, and status
prints a false `review-owed`. A new doc has no base `Version:` line, and the doc does not say that counts as "differs".
The Threat model says a blob expression is "built only from a 40-hex commit id and a path that passes `SPEC_PATH`".
`SPEC_PATH` is `/(^|\/)features\/(?!…)[^/]*\.md$/i`, which allows any character before `features/` and in the name. The
risk is low: the PRs are the viewer's own, and the value is a variable.

**Proposed resolution.** Read the base's reviews at `baseRefOid`, or say the line can be stale behind `main`. State that a
missing base line counts as moved. Bound the blob path with a safe-character pattern alongside `SPEC_PATH`.
