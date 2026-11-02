# Adversarial review — F-13 tests can fail 0.4

Reviewed: dev/features/tests-can-fail.md @ aef0faa
Version line: Version: 0.4 (2026-11-02)
Supersedes: docs/reviews/2026-10-13-tests-can-fail-0.3.md
Supersedes: docs/reviews/2026-10-12-tests-can-fail-0.2.md
Supersedes: docs/reviews/2026-10-09-tests-can-fail-unversioned.md
Review date: 2026-11-02
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

aef0faa (aef0faa6f61e1d288a464ac955aa5d63bd5979c2) is the head of branch `docs/tests-can-fail-0.4`, not `main`; its
merge base with `main` is 66a455b, the commit the Contract's `Verified against:` line names. This session did not
write or edit the document. Three earlier reviews name this path, and all three are superseded above. No open pull
request touched the path when this review was written.

**The brief.** The owner capped the review loop: this review of 0.4 is the last of the whole document before the
build. Every finding below is sorted into exactly one of three, and says which:

- **breaks a guarantee**: must be fixed in the spec before the build;
- **carry**: a line under the Build map step that touches it, no Contract change;
- **known limitation**: a line in Known limitations.

**Three findings break a guarantee: AR-1 (S1), AR-2 and AR-3 (S2).** AR-1 cannot be carried. The step's root
script name makes W1 fail in slipway and in every project, and Acceptance asserts the opposite. All three are
Contract text, so fixing them moves the `Version:` line; whether that revision needs a fresh review is the owner's
call, not this review's. **No finding touches Build map steps 1 or 2** (the parser, and what it gives).

**What was read.** In full: the target at aef0faa; `git diff a79b32b aef0faa` over it (0.3 to 0.4); the three
earlier reviews; `docs/reviews/TEMPLATE.md`; `decisions.md` D-037 with its four amendments and three
measurements, and D-040; `process/decision-defaults.md`. In part, to check a named claim: `package.json` (the root
scripts); `ci/checks/meta/w1-declared-vs-invoked.mjs` and `ci/checks/lib/tasks.mjs` (`GATED`);
`ci/checks/lib/yaml-list.mjs`; `ci/checks/lib/exceptions.mjs`; `ci/checks/meta/pc1-positive-control.mjs` (its
list of fixture names); `ci/checks/meta/fo1-fail-open.mjs`; `ci/checks/meta/l1-lessons.mjs` (the enforcement
statuses); `.github/workflows/ci.yml` (what each job runs); `dev/ownership.yaml` (the classes of
`ci/before-verify.sh`, `ci/fixtures/status/**`, `ci/**`, `package.json`); `scripts/lib/install.mjs`
(`derivePackageJson`); `scripts/new-project.mjs` (what `--no-github` leaves out); `.claude/skills/work-ticket/SKILL.md`
(`{base}`, the gate, the ready step); `dev/probes/tests-can-fail/measure.mjs` (its baseline and how it stops what
it starts); `process/lessons/L-04-mutate-the-specific-test.md`. Every read was at aef0faa through `git show`.
`docs/product/FRAME.md` in slipway is the unfilled template, so the document is read against `SLIPWAY.md`'s thesis,
as it cites it. `docs/domain-invariants.md` holds no invariant.

**Not verified.** Vitest was not run, and neither was the probe. What the agent harness does when a shell command
outruns its timeout (AR-4) is read from the tool description of the harness this review ran in, not from a run.
No project built from slipway was read.

**Not argued.** D-037's picks, the 2026-10-14 and 2026-11-02 amendments included: no CI job; `/work-ticket` runs
the step; 2 minutes and 10; the caps; the two shares and the quarter; the second baseline run; the process groups.
A finding touches one only where the document contradicts it, or the Contract does not deliver it. AR-9 argues
against the base the step diffs from, which is a session's reading of the owner's pick, and says so.

## Against the 0.3 review

Every finding of the 0.3 review sorted carry or known limitation has its line in 0.4, moved to the step that now
touches it. The lines that applied only to the job are dropped and named under step 4 (1014–1016), and each
dropped line is one whose subject 0.4 removed. One proposal was not taken: AR-6 asked that the Threat model's
"A test file nothing runs is a finding, not a name on that list" (583–584) take "under a test name". It still
reads as before, and contradicts the Known limitations line at 644–646 (AR-11).

Build map step 0 says its carried lines were met in #439. D-037's 2026-11-02 amendment says what the probe leaves
out beside each figure. `dev/probes/tests-can-fail/recorded/` holds the four kinds of failure §8 names, on both
versions. The probe computes whether a measured pull request would have been `nothing-judged`
(`wouldBeNothingJudged`). Whether that was shown to the owner is not in the repository, as the line intends.

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
| AR-1 | `check:mutation` is a gated script name: W1 fails a root `check:*` script no workflow runs, in slipway and in every project, and the W1 acceptance block asserts `pnpm meta` exits 0 with no workflow naming it. **Breaks a guarantee** | S1 | owner | build steps 4, 5 | |
| AR-2 | §1 kills `ci/before-verify.sh`'s process group when the script ends, so a service it starts for the tests is gone before they run; `dev/ownership.yaml` names that as the file's use. **Breaks a guarantee** | S2 | owner | build step 3 | |
| AR-3 | Figures of a real project are written into §3.8 and bounded by §7, against the doc's and D-037's own rule that they are shown to the owner and not recorded. **Breaks a guarantee** | S2 | owner | — | |
| AR-4 | The harness `/work-ticket` runs in ends a foreground command at 2 minutes by default and 10 at most: the budget and the step's own stop. A run it ends gives no exit 1 or 2 and may leave what the step started. **Carry** | S2 | owner | build step 5 | |
| AR-5 | The real-project acceptance needs `/work-ticket`'s own run, which arrives only with step 5, and is recorded in step 5's own pull request. **Carry** | S2 | owner | build step 5 | |
| AR-6 | §3.1 diffs from `origin/<default>`; Verify's scratch project is made with `--no-github` and has no `origin`. **Carry** | S2 | owner | build step 3 | |
| AR-7 | The check that nothing is left running is copied from a probe that reads any `pgrep` error as "none", and the probe it cites as the measured case uses no process groups. **Carry** | S2 | owner | build step 3 | |
| AR-8 | Known limitations says a process outside the group is stopped by §1's check; it is stopped only when its command line names the copy, and the Threat model says it is not defended. **Known limitation** | S3 | owner | — | |
| AR-9 | The diff runs from the default branch, so a pull request stacked on another judges the parent's tests, and a parent's `tests-can-fail#mechanical` line counts in the child. **Known limitation** | S3 | owner | — | |
| AR-10 | A flaky test is a warning when it flakes in the baseline and a finding when it flakes in the run after judging: which one is chance. **Known limitation** | S3 | owner | — | |
| AR-11 | Hygiene: `flaky` names two outcomes; §1's copied lines leave out the shares; copied test names are read as Markdown; L-04 as `check`; D-037's heading; the process block's "first record"; the hand `pkill`; the Threat model sentence. **Carry** | S3 | owner | build steps 3, 4, 5 | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — `check:mutation` is a gated script name, and W1 fails it

**Sort: breaks a guarantee.** S1: the build as written cannot reach a green `pnpm meta` without weakening W1, and
"Never weaken a gate to pass it" is a stated rule (`process/slipway-rules.md` → Gates).

**Where:** F-13 Contract `Verified against:` (130–132), §1 (156, 165–172), §5 (every "Run `pnpm check:mutation`");
What is reused (548–555); Acceptance (849–854); Build map step 4 (988–994) and step 5 (1017–1021); Fit (100–101).

The Contract describes W1 as "every check under `ci/checks/meta/` must be run by a workflow that runs on a pull
request or a push". That is W1's second clause. Its first, at the reviewed commit, is "every gated script (check,
lint, test, build, typecheck, and their `:sub` forms) declared by any workspace package is invoked by a CI
workflow". `ci/checks/lib/tasks.mjs` defines the pattern as `/^(check|lint|test|build|typecheck)(:[\w:-]+)?$/`.
W1 loops over `[ws.root, ...members]`, so the root's scripts count. `check:mutation` matches. With no workflow
calling it, W1's finding is `declared, but no CI workflow invokes it`.

The block at 849–854 asserts the opposite: "Given the meta script running node ci/checks/meta/mt1-tests-can-fail.mjs
ci/fixtures/mt1-green, and no workflow naming check:mutation … Then … pnpm meta exits 0". §1 and step 4 say "No
workflow is added or changed: W1 finds MT1 in the `meta` script". That holds for the check file and not for the
root script.

The precedent shows it. What is reused says "One `check:*` root script exists, `check:prose`, so `check:mutation`
follows a name already in use". `check:prose` is run by `.github/workflows/ci.yml` (`- run: pnpm check:prose`), and
`scripts/prose-job.test.mjs` pins it: "a project's W1 counts check:prose as run by its ci.yml, and fails without
that line". The script ships to projects: `derivePackageJson` drops only a command that calls an `internal` path,
and MT1 is not internal. So every project's `pnpm meta` goes red in CI on the sync that brings step 4, as slipway's
does on step 4's own pull request.

A build session meeting this has three ways out. Adding a workflow is the job the owner declined. Teaching W1 an
exception weakens a gate. Renaming is a Contract change. Only the spec can choose, so the finding cannot be carried.

The second precedent is narrower than the Fit line says. `s1-status.mjs` on `ci/fixtures/status` is `internal`
in `dev/ownership.yaml` ("S1 and its fixtures never ship"). MT1's fixture line and `ci/fixtures/mt1-green/` must
ship, or a project's W1 fails MT1's file. They do ship by default (`ci/**` is `managed`), but nothing in the
Acceptance holds it.

**Proposed resolution.** Name the root script outside W1's gated pattern, for example `tests-can-fail` or
`mutation`, everywhere it appears: §1, §4, §5's messages, Verify, Acceptance, step 5's lines, `BOOTSTRAP.md`. Add
to the W1 block: "W1 lists no gated script for it". Add a clause to the scratch-project block: in a project made
by `scripts/new-project.mjs`, the meta line and `ci/fixtures/mt1-green/` are present and W1 exits 0. Correct the
`Verified against:` description of W1 to name both clauses. Argued, and not proposed: the fixture line exists so
that W1 counts a check that CI never runs on a real record, which W1's own header calls a gate that "reads as
coverage" (decision-defaults §10). That is the session's call of 2026-11-02, not the owner's pick.

### AR-2 — `ci/before-verify.sh`'s group is killed before the tests run

**Sort: breaks a guarantee.** §3.4 promises that the copy has what the tests need by the same script `verify`
uses; §1, new in 0.4, takes it away for a service.

**Where:** F-13 Contract §1 (182–191), §3.4 (286–294), §3.8 (353–355); Known limitations (683–685);
`dev/ownership.yaml` (`ci/before-verify.sh`: "the project's own setup before verify runs in CI (a service its
tests need, an env var)").

§1: "Each call the step makes (the install, `ci/before-verify.sh`, every runner call) starts in a process group of
its own, and the whole group is killed when the call ends". A script that starts what its tests need with
`some-service &` leaves that process in the script's group, since a non-interactive shell does no job control. The
step kills it the moment the script exits, before the baseline. In CI the same line keeps the service alive for the
`verify` step after it.

What follows: the tests that need it are red in the copy, red again in the second baseline run, and the step is
exit 2, every run. The message is §3.8's: "it needs a file that git does not track and `ci/before-verify.sh` does
not make". That is not the cause. An exit 2 is a red gate with no excuse path. Known limitations (683–684) already
expects a service here ("A script that starts a service on a fixed port fails there").

The other half. A service that leaves the group, such as a container a daemon runs, or a server that daemonizes
itself, is not killed. §1's sweep finds it only when its command line names the copy's folder. A container's does
not. So it is left running after every run, which is the #439 failure this revision exists to stop, and nothing
counts it (AR-8).

**Proposed resolution.** In §1: `ci/before-verify.sh`'s group is kept until the run ends, and killed with the
others then. Add to §3.8's exit-2 message a second cause: a service `ci/before-verify.sh` starts that did not come
up. Add an Acceptance block: a `ci/before-verify.sh` that starts a background process a new test needs; the test
is judged, and `pgrep -f` on the copy finds nothing afterwards. If the owner prefers to keep §1 as written, the
alternative is a Known limitations line saying that a project whose tests need a service from that script cannot
pass the step. That is a large cost for one sentence of Contract.

### AR-3 — Figures of a real project are in the document

**Sort: breaks a guarantee.** The rule is the document's own and D-037's, and the text is Contract text.

**Where:** F-13 Contract §3.8 (357–358), §7 (518–521); Acceptance (900, 906); D-037's 2026-10-12 and 2026-11-02
amendments.

The rule, written in three places: D-037, "a real project's figures are shown to the owner and not recorded"; the
block at 900, "with no name, path, figure or content of that project"; step 0, "its figures shown to the owner
and not recorded".

- §3.8's last sentence gives a count of new test files from a real project, with what happened to them.
- §7 cited a real project's re-run as its budget basis. Read with D-037's table of the scratch runs, that bounds
  the real project's time.
- Outside the target, D-037's 2026-11-02 amendment gives per-change counts from the real project in its §3.6
  bullet, and the same count as §3.8 in its last paragraph.

This review repeats none of the values. decision-defaults §9 lets a pull request record "a count or a pass". F-13
and D-037 chose the stricter rule, and these lines are in files, not in a pull request.

**Proposed resolution.** In §3.8, say that a test red once in the copy and green on its next run was seen on a real
project, with no count. In §7, say that the owner set the budget from the scratch runs and a real project's,
without saying which figure it doubles. In D-037, the same edits in the owner's next amendment.

### AR-4 — The harness's own timeout sits on the budget and the stop

**Sort: carry (build step 5).**

**Where:** F-13 Contract §1 (159–164), §7 (518–527); Known limitations (676–679); Build map step 5 (1017–1021).

The step is a shell command `/work-ticket` runs through an agent harness. The harness this review ran in
documents its shell tool's foreground timeout as 2 minutes by default and 10 minutes at most, and runs longer
commands in the background. §7's budget is 2 minutes, and its stop is 600 seconds of the run, before the install
and the clean-up after it. Under a default call, a run past the budget is ended by the harness, not warned by the
step. Under the longest call, a run that reaches its own stop is ended at about the same moment, before the
verdict prints and before the groups are killed.

Either way there is no exit 1 or 2. §1's rule is "Exit 1 or 2 is a red gate", and a missing result is neither. What
the harness sends is not in the document. A SIGTERM reaches `pnpm` and may not reach the step behind it. A SIGKILL
cannot be caught (Known limitations). Either can leave the processes the step started.

`.claude/skills/work-ticket/SKILL.md` names no timeout and no background run for its gate.

**Proposed resolution.** Under step 5: `/work-ticket` starts the step so that the harness never ends it first,
either in the background with its exit read when it ends, or with a timeout above the 10-minute stop plus the
install and the clean-up. A run that ends without the step's own exit is a red gate, and `/work-ticket` then checks
for the copy's processes. Pin both in `scripts/skills.test.mjs`.

### AR-5 — The real-project run cannot happen in the order the Build map gives

**Sort: carry (build step 5).**

**Where:** F-13 Acceptance (896–900); Build map step 5 (1024, 1040–1041) and the closing paragraph (1051–1055).

The block: "When the step is run once on one of its pull requests before it ships … the last build step's pull
request records the result". Step 5's carried line: "the run on a real project is `/work-ticket`'s own run of
`pnpm check:mutation`". `/work-ticket` runs the step only from step 5, which is the last step. A real project gets
slipway through the sync, from `main` or a tag. So the run the line asks for needs step 5 on `main`, and its result
belongs in step 5's own pull request, which must merge first.

Ways through exist: the real project takes step 5's branch before it merges, or the result goes in a pull request
after step 5 and before the version tag. The document chooses neither. Making anything outside the repository is
the owner's (decision-defaults, What these never settle).

**Proposed resolution.** Under step 5, one line that names the order. Either the real project's run is made from
step 5's branch, with the owner asked first, and recorded in step 5's pull request. Or it is made after step 5
merges and before the next version tag, in a pull request that the block then names in place of "the last build
step's".

### AR-6 — No `origin`, no base

**Sort: carry (build step 3).**

**Where:** F-13 Contract §3.1 (227–228); Verify (921–925); Acceptance (823–825, 856–860); `scripts/new-project.mjs`
(the `--no-github` path ends before any remote is added); `.claude/skills/work-ticket/SKILL.md` ("With no remote,
ask the owner for `{base}` and diff against it").

§3.1: "From the merge base of `HEAD` with the default branch (`origin/<default>`, fetched by `/work-ticket` before
it runs the step)". 0.3 said "the merge base with the default branch" for a local run. 0.4 names the remote. Verify
runs the step in "a scratch project made by `node scripts/new-project.mjs <dir> --no-github --no-harness`", which
has no remote. The blocks in "a temporary repository" have none either. What the step does then is not said: a
merge base with a ref that does not exist. How `<default>` is found is not said either.

A run by hand without a fetch has a second form of the same gap. A stale `origin/<default>` that is older than the
branch point puts other people's tests in the diff.

**Proposed resolution.** Under step 3: say how `<default>` is found. With no `origin`, the step diffs from the
local default branch, as `/work-ticket` does with its `{base}`. With neither, it is exit 2 naming the action. Pin it
in the merge-base block, and run Verify's scratch project through that path.

### AR-7 — The "nothing left running" check is modelled on a probe that fails open

**Sort: carry (build step 3).**

**Where:** F-13 Contract §1 (186–191); What is reused (550–551); Acceptance (863–867);
`dev/probes/tests-can-fail/measure.mjs` (its `sweep` and `alive`).

What is reused: "The probe's way of stopping what it starts … as the measured case for §1's process groups". The
probe starts no process group. It runs `pkill -KILL -f <folder>` after every call, and counts with `pgrep -f
<folder>`. Both swallow every error: `alive` is `try { … pgrep … } catch { return 0; }`. A machine with no `pgrep`,
or a `pgrep` that fails, reads as "0 processes left". decision-defaults §4 says that when a check cannot tell, "It
never passes". The process groups are new code that nothing measured. Only the block at 863–867 will prove them.

A second gap: §1 finds a process by "command line names the copy's folder". The second `test` script form is
`node … node_modules/vitest/vitest.mjs run`, a relative path, and §3.3 resolves only the flags' paths in the copy.
Started with a working directory in the copy and that relative path, the runner's command line does not name the
folder.

**Proposed resolution.** Under step 3: `pgrep` exit 1 means none. Any other exit, or no `pgrep`, is exit 2. Every
process the step starts is started by an absolute path inside the copy, so its command line names the folder. Pin
both with a test. The step's code takes the probe's lesson, and not its `catch`.

### AR-8 — "Stopped by the check of §1" claims more than §1 checks

**Sort: known limitation.**

**Where:** F-13 Contract §1 (186–191); Threat model (600–602); Known limitations (676–679).

Known limitations: "A test that starts a process outside its group is stopped by the check of §1 and the run is
exit 2". The Threat model: "Not defended: a pull request whose tests … start a process outside its group". §1's
check finds a process only "whose command line names the copy's folder". Some processes do not. A container started
through a daemon, a binary on the path started with only a working directory in the copy, and a service that
daemonizes itself under its own name are neither stopped nor counted (AR-2).

**Proposed resolution.** Reword the line: a process outside the step's groups is stopped, and the run is exit 2,
when its command line names the copy's folder. One that does not is not seen. The Threat model's sentence then
stands as it is.

### AR-9 — A stacked pull request is diffed from the default branch

**Sort: known limitation.** This argues with a session's reading, not an owner's pick. The owner chose that
`/work-ticket` runs the step. The default branch as its base comes with that, since `/work-ticket`'s `{base}` is
the default branch.

**Where:** F-13 Contract §3.1 (227–228), §3.7 (343–350); Threat model (585–587); `process/slipway-rules.md`
(L-21, stacked pull requests).

0.3's job diffed from the pull request's own base. 0.4 diffs from "the merge base of `HEAD` with the default
branch". A pull request stacked on another one is diffed through its parent's commits:

- the parent's new tests are judged again in the child, and red there when they are red in the parent;
- a `tests-can-fail#mechanical` line the parent adds is a line "this pull request's diff adds", so it counts in
  the child too. The child's new tests go unjudged, under an entry the child's own `## Gate changes` does not list.
  §3.7's "It counts only in the pull request that adds it" does not hold for the child.

The run still names every test it let through, which is what the Threat model leans on.

**Proposed resolution.** A Known limitations line: on a pull request stacked on another, the diff runs from the
default branch, the parent's tests are judged again, and a mechanical line the parent adds counts in the child. If
the owner wants §3.7's sentence to hold as written, that is a Contract change: the step takes the pull request's
base branch when `/work-ticket` gives one.

### AR-10 — Whether a flaky test fails the pull request is chance

**Sort: known limitation.**

**Where:** F-13 Contract §3.8 (353–357), §3.9 (394–396), §4 (428, 431, 437–438), §5 (473–475, 490–491).

A test red in the first baseline run and green in the second is `notJudged` with `flaky`: a warning, and red only
when every new test is unjudged. A test that passes both baseline runs and then fails the untouched run after its
changes has `state` `flaky` in `tests`: a finding, exit 1. It is the same test with the same flake, and the run it
lands in decides a warning or a red gate. The owner's pick of 2026-11-02 sets the first. The second has stood since
0.2. Neither is wrong alone, but together they are not stated.

**Proposed resolution.** A Known limitations line: a test that flakes in the baseline is named, not failed, and
one that flakes in the run after judging fails the pull request; which happens is chance. The shared name is in
AR-11.

### AR-11 — Hygiene

**Sort: carry, each under the step named.**

**Where:** the lines named in each bullet.

- **§3.8, §3.9, §4, Acceptance (870–875, 883–886), step 4.** `flaky` is a `notJudged` reason and a `tests` state,
  with two messages. The two-shares block's "1 flaky" counts as not judged, so it is the first kind, but the block
  does not say so. Under step 4: the fixtures and messages tell the two apart, by name or by wording, and the
  two-shares block says which it holds.
- **§1 (163–164), step 5 (1043–1044).** §1 lists what `/work-ticket` copies into `## Verification`: "the summary
  line, each count line that is not zero, and each test named not judged". The two shares, printed "always" (§4),
  are not on the list. Step 5's carried line has them. Under step 5: the skill's list is §1's plus both shares.
- **§1, step 5.** Test names are pull-request text. §5 escapes them for a terminal. A name copied into a pull
  request's body is read as Markdown, and an `@name` in it notifies that GitHub user. Under step 5: the copied lines
  go inside a fenced code block, pinned in `scripts/skills.test.mjs`.
- **Build map step 5 (1023).** "L-04's enforcement becomes the check". L1's `check` status means "a mechanism
  fires", and a `check` lesson carries no `review-by`. The mechanism here fires only where `/work-ticket` runs. Under
  step 5: L-04's pointer names `/work-ticket`'s line as well as MT1, and the lesson's body says the step is not
  in CI.
- **D-037's heading** still reads "within 5 minutes". The 2026-11-02 amendment replaced that figure. Under step 5,
  or in the owner's next edit of D-037: the heading, or a line under it, says that the figures are in the latest
  amendment.
- **Acceptance (863–867), step 3.** "The first record has leftProcesses 1": the block makes two runs and two
  processes, and does not say which record. The detached process is found by `pgrep -f` only if its command line
  names the copy. Under step 3: name the record, and start the detached process by a path inside the copy.
- **Known limitations (677–678), step 5.** The hand command `pkill -f tests-can-fail-` stops every run on the
  machine, including another session's in another worktree. Under step 5, in `BOOTSTRAP.md`: the command names the
  one folder.
- **Threat model (583–584), step 5.** "A test file nothing runs is a finding, not a name on that list" contradicts
  Known limitations (644–646) for a file under `__tests__/`. This is the 0.3 review's AR-6 wording, not taken.
  The Threat model is not Contract, Acceptance or Verify, so the wording moves no version: "A test file under a test
  name that nothing runs is a finding".

**Proposed resolution.** One line under each step named.
