# Adversarial review — F-13 tests can fail 0.5

Reviewed: dev/features/tests-can-fail.md @ 697a184
Version line: Version: 0.5 (2026-11-02)
Supersedes: docs/reviews/2026-11-02-tests-can-fail-0.4.md
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

697a184 (697a184d4cd61eca745aede3fabcab9ea76e065a) is the head of branch `docs/tests-can-fail-0.4`, not `main`;
its merge base with `main` is 66a455b, the commit the Contract's `Verified against:` line names. This session did
not write or edit the document. Four earlier reviews name this path, and all four are superseded above. No open
pull request touched the path when this review was written.

**The brief.** The owner set this review's scope and made it the last of the whole document. It asks three
things: are the 0.4 review's AR-1, AR-2 and AR-3 fixed; do those fixes break anything else in F-13 or in D-037's
2026-11-02 amendments; and did AR-4 to AR-11 land as the lines their resolutions proposed. Every finding is sorted
into exactly one of two:

- **changes the Contract's guarantees**: goes back to the owner;
- **acceptance line**: becomes an acceptance line in the issue of the build step named.

**The answer.** AR-1 and AR-3 are fixed. AR-2 is fixed for a service that stays in `ci/before-verify.sh`'s process
group, and not for one that leaves it (AR-1 below). AR-4 to AR-11 each landed as proposed. **One finding goes back
to the owner: AR-1 (S2).** The other six are acceptance lines, in build steps 3, 4 and 5. No finding touches build
steps 1 or 2.

**What was read.** In full: the target at 697a184; the 0.4 review; `docs/reviews/TEMPLATE.md`; `decisions.md`
D-037, its 2026-11-02 amendments read closely. `git diff f2b3622 697a184` over the target and `decisions.md`, to
aim. In part, to check a named claim: `ci/checks/meta/w1-declared-vs-invoked.mjs` (its three clauses and how it
follows a root script); `ci/checks/lib/tasks.mjs` (`GATED`, at 697a184 and at 66a455b); `.github/workflows/ci.yml`
(its `run:` lines, at 697a184 and at 66a455b); `package.json` (the `meta` and `check:prose` scripts);
`dev/ownership.yaml` (`ci/before-verify.sh`, `ci/**`, `ci/fixtures/**`); `scripts/lib/install.mjs`
(`derivePackageJson`); `dev/probes/tests-can-fail/README.md` and `measure.mjs` (the left-processes line). Every read
was at the sha through `git show` or `git grep`. `docs/product/FRAME.md` in slipway is the unfilled template, so
the document is read against `SLIPWAY.md`'s thesis, as it cites it. `docs/domain-invariants.md` holds no
invariant.

**Not verified.** Nothing was run: not Vitest, not the probe, not a shell script with a background process, not a
container. What a non-interactive shell, a daemon and `docker compose up -d` do with process groups (AR-1, AR-2,
AR-3) is stated from how they are documented to work, not from a run here.

**Not argued.** D-037's picks, its 2026-10-14 and 2026-11-02 amendments included. Findings sorted in the
unversioned, 0.2, 0.3 and 0.4 reviews. A finding below touches one only where a 0.5 fix changed what it rests on.

## Against the 0.4 review

**AR-1, fixed.** The root script is `tests-can-fail` in every place F-13 names it: §1 (158), §5's messages,
§7 (535), Known limitations (639), Acceptance (866–876, 915), Verify (945) and steps 4 and 5. `GATED` is
`^(check|lint|test|build|typecheck)(:[\w:-]+)?$`, which `tests-can-fail` does not match: after `test` comes `s`,
not `:` or the end. W1's first clause therefore never reads it. W1's second clause finds MT1 through
`ci.yml`'s `pnpm meta` (line 58), followed to the `meta` script's `node ci/checks/meta/…` line. The `Verified
against:` line now names both clauses, and both hold at 66a455b. The W1 block gained "W1 lists no gated script
for the tests-can-fail root script" and the clause for a project made by `scripts/new-project.mjs`. That clause can
fail: `derivePackageJson` drops a command that calls an `internal` path, and `ci/fixtures/mt1-green/` falls under
`ci/**`, `managed`, unless step 4 classes it otherwise. No `check:mutation` is left in F-13 or D-037's amendments.
Two leftovers of the rename are AR-6 and AR-7.

**AR-2, fixed for a service in the group.** §1 (189–194) keeps `ci/before-verify.sh`'s group until the run ends,
and kills every group then. §3.8's exit-2 message (361–363) names a service that did not come up. A new block
(880–884) covers a background process the tests need. What the fix leaves: a service that leaves the group (AR-1);
a block whose second half cannot fail (AR-2); a race between the kill and the check (AR-3); one service across
every run of a file (AR-4); D-037 still saying the opposite (AR-5).

**AR-3, fixed, with one thing this review could not tell.** §3.8 (366–367) now holds one sentence and no count.
§7 (527–531) bounds the budget by the scratch runs alone: twice the slowest building-machine run, 56.8 s, is
about 2 minutes, which matches. D-037's §3.6 bullet (868) and its real-project paragraph (886–888) carry no
figure. Lines 77–78 say a real project crossed the stop line, which is a miss against a threshold: the real-project
block (923) allows a pass or a miss. **Not told by the repository:** §1 (187–188) and D-037 (862–863) give how many
processes a step 0 run left, at what load, and for how long. Neither says which run. Step 0's hosted runs could not
leave a process for days. If it was a real project's run, that duration is a run finding of that project. The owner
knows which run it was.

**AR-4 to AR-11, each landed as proposed.**

- AR-4: step 5 (1086–1089), verbatim.
- AR-5: step 5 (1090–1092), verbatim.
- AR-6: step 3 (1013–1015), verbatim.
- AR-7: step 3 (1016–1019), verbatim. Its wording has a gap, taken up in AR-2.
- AR-8: Known limitations (686–689), reworded as proposed, with the `pkill` line gone.
- AR-9: Known limitations (690–693), as proposed, naming the Contract change it would take.
- AR-10: Known limitations (694–695), as proposed.
- AR-11, all eight bullets:
  - `flaky`'s two outcomes: step 4 (1049–1051).
  - §1's list plus both shares, in a fenced block: step 5 (1093–1094).
  - L-04's pointer: step 5 (1095–1096).
  - The hand clean-up command: step 5 (1097–1098).
  - D-037's heading: step 5 (1099). D-037's amendment (849) now says it replaces "the heading's 'within 5
    minutes'", but the heading still reads it, so the step 5 line still has work to do.
  - The processes block's record: step 3 (1020–1021). The block (886–891) is unchanged, as the line expects.
  - The Threat model sentence: step 5 (1100–1101). The Threat model (593–594) still reads as before, as the
    line expects.

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
| AR-1 | A service `ci/before-verify.sh` starts that leaves the script's process group (a daemon, `docker compose up -d`) is not held by 0.5's fix: with the copy's folder in its command line, every run is exit 2 blaming a test; without it, it is left running, and on a fixed port the next run's script fails. **Changes the Contract's guarantees** | S2 | owner | build step 3 | |
| AR-2 | The new `ci/before-verify.sh` block's "`pgrep -f` … finds nothing" cannot fail for a background process whose command line does not name the copy; the carried AR-7 line asks for an absolute path inside the copy, which `pnpm install` cannot have. **Acceptance line, step 3** | S2 | owner | build step 3 | |
| AR-3 | §1 kills the groups, then checks: a service that shuts down on SIGTERM is still alive at the check, and the run is exit 2 by timing. **Acceptance line, step 3** | S2 | owner | build step 3 | |
| AR-4 | One service instance now serves every run of a test file, up to 60 changed runs and the untouched run: a test that leaves state behind fails the untouched run and is a `flaky` finding, "by chance". **Acceptance line, steps 4 and 5** | S2 | owner | build steps 4, 5 | |
| AR-5 | D-037's 2026-11-02 amendment says each call's group is "killed on exit"; 0.5 §1 keeps `ci/before-verify.sh`'s group to the end. **Acceptance line, step 5** | S3 | owner | — | |
| AR-6 | What is reused says "`tests-can-fail` follows a name already in use", the `check:*` precedent; §1 says it is outside that pattern on purpose. **Acceptance line, step 4** | S3 | owner | — | |
| AR-7 | The test that "no file under .github/workflows/ names the tests-can-fail script" reads a string: it trips on `ci/tests-can-fail.yaml` and misses a direct `node ci/checks/meta/mt1-tests-can-fail.mjs --run`. **Acceptance line, step 4** | S3 | owner | — | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — A service that leaves `ci/before-verify.sh`'s group is not held by the fix

**Sort: changes the Contract's guarantees.** S2, as the 0.4 review's AR-2 was: the cost is the same, for the
other common way a setup script starts a service. The fix's stated reason is that "a service it starts is what the
tests need". 0.5 delivers it for one form of service only. Choosing between narrowing that promise and adding a
way to stop such a service is the owner's.

**Where:** F-13 Contract §1 (187–199), §3.4 (295–300), §5 "processes left" (507–508); Threat model (610–613);
Known limitations (686–689, 699–701); `dev/ownership.yaml` (`ci/before-verify.sh`: "a service its tests need").

§1: "The group of `ci/before-verify.sh` is kept until the run ends … Every group still alive is killed when the
run ends." That reaches a service started with `&` in the script, which stays in the script's group. It does not
reach a service that leaves the group. Two common forms do:

- a server that daemonizes itself into a session of its own;
- a container, which `docker compose up -d` hands to the container daemon and returns.

Each takes one of §1's two paths, and both end red.

- **Its command line names the copy's folder** (a data folder or a config file inside the copy). The groups are
  killed and it survives. §1's check finds it, kills it, and the run is exit 2: "a test starts a process that
  leaves its group". That happens on every run, and the message names a test, not the script. Exit 2 is a red gate,
  and nothing in `ci/exceptions.yaml` excuses it.
- **Its command line does not name the folder** (a container's never does). It is left running after the run.
  Known limitations accepts that it "is not seen", from the 0.4 review's AR-8. The next run makes a new copy and
  runs the script again. Compose names its project after the folder by default, so it starts a second set of
  containers. On a fixed port that fails, and §3.4 makes a failed script "exit 2 with its last lines". So the first
  run passes and every later one is red, until the owner stops the containers by hand.

In CI, the same script works: the job's machine is thrown away after it. Known limitations (699–701) names a clash
with "the developer's own" service on a fixed port. It does not name a clash with the step's own previous run.

**Proposed resolution.** Two ways, for the owner:

1. **Narrow the promise.** Add a Known limitations line: the step holds a service `ci/before-verify.sh` starts only
   while it stays in the script's process group; a daemon or a container is not supported. Then, as acceptance
   lines:
   - step 3: a process that names the folder, is alive when the script returns, and is outside its group, is
     reported as the script's, and the exit-2 message names `ci/before-verify.sh`;
   - step 5: `BOOTSTRAP.md` "Tests can fail" says the same, with the form that works.
2. **Stop what the script started.** The step runs a stop script the project gives, such as `ci/after-verify.sh`,
   when the run ends. That adds a file the harness asks about and a line to the Threat model.

The first keeps 0.5's Contract and states its edge. The second is new Contract.

### AR-2 — The new block's `pgrep` half cannot fail

**Sort: acceptance line, build step 3.**

**Where:** F-13 Acceptance (880–884); §1 (194–196); Build map step 3, the carried AR-7 line (1016–1019).

The block: "Given a ci/before-verify.sh that starts a background process a new test needs, and returns … Then the
test is green in the baseline and is judged, and `pgrep -f` on the copy's folder finds nothing after the run".

The first half can fail: under 0.4's §1 the process was killed before the baseline, so the test was red. The second
half cannot. `pgrep -f <folder>` matches a command line. A background process started by the script as
`node server.mjs &`, or by any name on the path, does not carry the folder in its command line. It is not found
whether or not the run killed it. So "kept until the run ends, then killed" has no test that goes red when the
kill is missing.

The carried AR-7 line has the same gap from the other side: "Every process the step starts is started by an
absolute path inside the copy, so its command line names the folder." The install is `pnpm install
--frozen-lockfile --offline`, and `pnpm` is not inside the copy. `bash` is not either; only its argument is.

**Proposed resolution.** Acceptance lines under step 3:

- The `ci/before-verify.sh` block's background process writes its process id to a file in the copy. The block
  asserts that process is gone after the run. With the end-of-run kill of that group removed from
  `ci/mutation.mjs`, the block fails.
- The AR-7 line reads "so its command line names the copy's folder: an absolute path inside it, or the folder as
  an argument (`pnpm --dir <folder>`, `bash <folder>/ci/before-verify.sh`)". It is pinned for the install.

### AR-3 — The kill and the check race

**Sort: acceptance line, build step 3.**

**Where:** F-13 Contract §1 (192–197): "Every group still alive is killed when the run ends … one that is, after the
groups are killed, is killed and the run is exit 2"; Acceptance (886–891).

§1 does not say which signal kills a group, or that the step waits for the group to be gone before it checks. 0.4
killed a runner's group, whose workers die fast. 0.5 keeps a service to the end and kills it then, and a service is
built to shut down slowly on SIGTERM: it flushes, closes connections, removes a lock file. If the check runs while
it is still shutting down, it is alive and names the folder. §1 then makes the run exit 2, "were still running and
were stopped", on a run that left nothing behind. Whether that happens depends on timing.

**Proposed resolution.** Acceptance line under step 3: each group is sent SIGTERM, given a bounded wait, then sent
SIGKILL, and is reaped before the `pgrep` check runs. Pin it with a background process that traps SIGTERM and sleeps
before exiting: the run is not exit 2, and the process is gone after it.

### AR-4 — One service serves every run of a file

**Sort: acceptance line, build steps 4 and 5.**

**Where:** F-13 Contract §3.8 (359–364), §3.9 (368–377, 403–405); §5 `flaky` (482–484); Build map step 5
(1056–1063).

Before 0.5, a service from `ci/before-verify.sh` did not survive into the runs, so this could not happen. Now it
does. One instance lives through the baseline, the second baseline run, every changed run of §3.9 (60 at the caps)
and the untouched run after them. In CI, `verify` runs each test once against a fresh instance.

Take a test that writes to the service and does not clean up, such as one that inserts a row with a fixed key.
- It passes the baseline.
- Its first changed run fails on the row it left, an error that counts, so it is credited.
- The untouched run fails the same way. §3.9 makes it `flaky`, a finding.
- §5 tells the author "A test that fails by chance cannot show it notices a change. Make it pass every time".

It is not chance, and the test passes every time in CI. The credit before it is false as well, but the `flaky`
finding stops the pull request anyway, so only the message is wrong.

**Proposed resolution.** Acceptance lines:
- step 5: `BOOTSTRAP.md` "Tests can fail" says that a service `ci/before-verify.sh` starts lives for the whole run,
  that each new test's file runs up to about 60 times against it, and that a test must leave it as it found it.
- step 4: `flaky`'s message adds the second cause in words: "or it depends on what an earlier run left in a service
  `ci/before-verify.sh` started".

### AR-5 — D-037 says the opposite of §1

**Sort: acceptance line, build step 5,** beside the carried AR-11 line on D-037's heading (1099). S3, lowered from
S2: the Contract is later and more specific, and D-037's last amendment points at 0.5.

**Where:** `decisions.md` D-037, amended 2026-11-02, "The step stops every process it starts" (862–867): "Each call
runs in a process group of its own, killed on exit, error and timeout alike". F-13 §1 (189–194).

That bullet is in the list "the owner set". 0.5 keeps `ci/before-verify.sh`'s group past the script's exit. The
"Amended 2026-11-02 again" paragraph (890–895) names only the root script's new name. A reader of D-037 alone
builds the 0.4 behaviour, the one the 0.4 review's AR-2 showed breaks a service.

**Proposed resolution.** Acceptance line under step 5: D-037's next edit says that `ci/before-verify.sh`'s group is
kept until the run ends, and is killed with the others then.

### AR-6 — "Follows a name already in use" is now false

**Sort: acceptance line, build step 4.** Execution issues embed the Contract, so the sentence would travel into the
issue.

**Where:** F-13 What is reused (562–565): "One `check:*` root script exists, `check:prose`, so `tests-can-fail`
follows a name already in use." §1 (158–161).

The sentence was a precedent for `check:mutation`. After the rename it says the opposite of §1, which keeps the name
"outside W1's gated pattern … on purpose". `check:prose` is run by `ci.yml`. `tests-can-fail` follows no name in
use, and that is the point of the fix.

**Proposed resolution.** Acceptance line under step 4: the issue's embedded Contract drops the sentence's last
clause, or says "`tests-can-fail` is named outside the `check:*` form, since no workflow runs it (§1)".

### AR-7 — The "no workflow runs it" test reads a string

**Sort: acceptance line, build step 4.**

**Where:** F-13 Acceptance, the W1 block (869): "no file under .github/workflows/ names the tests-can-fail
script, held by a test pnpm meta runs".

With `check:mutation`, a string search found only the script. `tests-can-fail` is also in `ci/tests-can-fail.yaml`,
in the `tests-can-fail#` ids, in the copy's folder name and in MT1's own file name. A workflow that lists
`ci/tests-can-fail.yaml` in a path filter would trip the test. A workflow that runs
`node ci/checks/meta/mt1-tests-can-fail.mjs --run` itself spends the Actions minutes D-037 declined, and does not
trip it.

**Proposed resolution.** Acceptance line under step 4: the test reads each workflow's commands as W1 does
(`parseCommand`). It fails on a call of the `tests-can-fail` root script, and on a `node` call of
`ci/checks/meta/mt1-tests-can-fail.mjs` with `--run`. A path or an id that only contains the name passes.

## Outside the scope, named and not argued

- D-037's 2026-10-08 and 2026-10-12 entries (688, 766) describe the private project in more words than "a real
  project". 0.5 did not touch them, and they are not 2026-11-02 amendments. This review repeats none of the words.
- Build map step 3 (972) says "Nothing is added under `ci/checks/meta/`, so W1 asks for nothing". In slipway, W1's
  third clause asks that every `scripts/**/*.test.mjs` is run by a workflow. Step 1 adds `scripts/mutants.test.mjs`
  to the `meta` script. Steps 3 and 4 do not say so for `scripts/mutation.test.mjs` and `scripts/mt1.test.mjs`. This
  stands from 0.4, and W1 will name it at the build.
