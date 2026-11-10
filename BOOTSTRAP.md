# Bootstrap — starting a project on this template

Step 0 of the path in `SLIPWAY.md`. §0 is done by `new-project`. **Run `/bootstrap` for §1 and §3**: it scaffolds the
app, opens the bootstrap PR and runs every acceptance probe an agent can, listing the rest for you. This file is
the reference for what it does. When the PR is merged, go to step 1 (`/kickoff`).

**Requires:** Node 24 + pnpm, GitHub, Claude Code. **Defaults**, decided in week 1 (D-005–D-008): TypeScript,
React + Vite, Cloudflare.

**Enforcement before content.** Required checks retrofitted later rarely happen: by then there is too much
to exempt. The cheapest moment to install the spine is before there is anything to exempt from it.

## 0. Owner-only

1. **Create the project** (you need Node 24+, pnpm, git, and `gh` logged in):

   ```bash
   npx use-slipway acme --dry-run     # from the folder you keep projects in
   npx use-slipway acme               # --public, --repo, --name: see the README
   ```

   From a slipway clone, `node scripts/new-project.mjs acme` takes the same options. The script:

   - copies the template without its history, fills `<Product>` and `<owner/repo>`, starts the lessons
     clock (`process/anchor`), and replaces the README with a product stub (`SLIPWAY.md` stays as the guide);
   - initialises git on **`main`** — CI triggers on pushes to `main`, so a `master` branch would run none of it —
     committing as your GitHub noreply identity (set in the repo's local git config) so no personal email is
     published; `--keep-email` uses your own git config instead;
   - installs the agent harness (`.claude/settings.json`), and prints what it does as it goes;
   - records what it wrote in `.slipway/manifest.json`: each file's class, hash and git blob id. D1 then
     fails on a slipway-managed file changed without a reason in `.slipway/overrides.yaml`, and
     `/sync-slipway` takes a newer slipway later, and `pnpm -s use-slipway sync` prints its plan (SLIPWAY.md, *Taking slipway updates*);
   - creates the GitHub repository and pushes;
   - creates the `needs-shape` label that `.github/workflows/issue-shape.yml` applies;
   - **attempts** to protect `main` — pull request required; required checks `meta`, `verify`, `pr-body`, `prose`;
     branches up to date before merging (the only fix for "green on both branches, red on merged main");
     administrators included — and writes the outcome into `decisions.md` as D-001. Private repositories on
     free plans may refuse; the entry then records the accepted risk and the fallback.

   D-001 is left uncommitted: `main` may now refuse direct pushes, so it lands with the bootstrap PR.
   Without `gh`, pass `--no-github` and do the last three by hand in the repository settings. If a run fails
   partway, the README's *If a run fails partway* says how to finish from where it stopped.

2. The harness is already installed: the script copied `process/harness/settings.json` to
   `.claude/settings.json` and said so. It makes destructive git operations and edits to gate configuration
   ask-level, injects `pnpm status` at session start, blocks the first stop of a turn while `verify:fast` is red (a second stop ends
   it red, with the agent asked to say what is failing),
   and adds three advisory hooks (`process/harness/README.md`). You installed it by running the script; an
   agent never installs its own hooks or permissions. Skipped with `--no-harness`? Copy it by hand.

## 1. Add the app

```bash
pnpm create vite apps/web --template react-ts
```

`apps/web/package.json` must declare at least:

- `check` — the typecheck (the react-ts template's build already runs `tsc -b`);
- `test` — for example `vitest run`, with one real test.

`verify` refuses to run unless some package declares `check` and `test`, and W1 fails any gated script that
no workflow runs. Keep `lint` and `build` as the scaffold emits them. The checks enforce that gates exist and
run, not which tools they use.

If your tests need something running in CI (a Postgres service, an env var such as `DATABASE_URL`), add it in
`ci/before-verify.sh`, never in `ci.yml`: a sync replaces `ci.yml`, and an edit to it is drift. The `verify` job
runs that file, when it exists, after install and before `pnpm verify`; it can start a container and append
`DATABASE_URL=…` to `$GITHUB_ENV`. Slipway ships no such file, so yours is never overwritten.

```bash
pnpm install
node ci/verify.mjs --plan    # must list apps/web under check and test
pnpm verify
pnpm meta
```

Commit the lockfile. Then:

- **Fill the remaining `<…>` in `AGENT.md`** (the script filled the product and repository). It configures
  intake and execution skills (`/log-feature`, `/log-bug`, `/log-followup`, `/work-ticket`); where a row
  offers `none` and you don't use it, say `none`.
- **The lessons clock** was started by the script (`process/anchor` holds the project's first day; by hand:
  `date +%F > process/anchor`). Lesson review dates written as `+90d` count from it, and L1 fails when one
  passes. That clock is also how deferred components come back up.

Add the app now even though planning comes first: `verify` is a required check and stays BROKEN without a
package, so no planning PR could merge. The scaffold is the template default (D-005); replacing it before M1
costs nothing.

## 2. Plan

Planning is steps 1–3 of `SLIPWAY.md`, driven by `/kickoff`. When there is something to deploy (M1), the deploy
workflow must run `pnpm verify` on the exact tree it ships — a deploy gate narrower than the PR gate lets an
untested tree ship.

## 3. Acceptance run — observe every gate fail once

A spine that has never refused anything cannot be told apart from one that is not installed. Do each, and
paste the output into the bootstrap PR:

1. `pnpm meta` is green on a fresh clone — PC1 proves each check fails, precisely, on its fixtures.
2. A direct push to `main` is rejected (or, under the D-001 fallback, turns CI red).
3. A PR whose test fails cannot be merged; a PR behind `main` cannot merge until updated.
4. A PR with no evidence under `## Verification` turns `pr-body` red.
5. Adding `"test:e2e": "…"` to a package that has no `test:e2e` script yet, with no workflow running it, turns W1 red. A package that already has one, run by a workflow, shows W1 nothing new.
6. `continue-on-error: true` on any step turns FO1 red.
7. An issue opened with `gh issue create` and free prose gets the `needs-shape` label and a comment listing what is
   missing; editing it until it passes removes both.
8. A review whose `Version line:` no longer matches the PRD turns R1 red.
9. A lesson whose `review-by` is set to a past date turns L1 red.
10. Each harness hook prints its reminder on the sample input in `process/harness/TESTING.md`, and running
    `git stash pop` asks before it acts.
11. One intake skill run (`/log-followup` is cheapest) files its issue in **this** repository.
12. Two milestone files with `status: active` turn MS1 red (`wip/exceeded`).
13. Setting M1 to `active` while `docs/product/FRAME.md` is `status: draft` turns K1 red.
14. A new Claude Code session opens with the `pnpm status` state in context (ask it "what's next?").
15. A failing test makes the Stop hook block the first stop of the turn, and asking the agent to edit `biome.json` or a
    workflow prompts for approval.
16. A committed test that asserts only on its own input makes `pnpm tests-can-fail` exit 1 and name that test (§4).

Revert each probe. The kit is installed when all sixteen have been seen to fire.

## 4. Tests can fail

`/work-ticket` runs `pnpm tests-can-fail` beside the quality gate, before it marks a pull request ready. It checks
that each test the pull request adds or edits fails on some change to the code it tests (F-13, D-037). A test that
passes whatever the code does turns the gate red, and the message names the test and what to do. The result goes
into the pull request's `## Verification`.

- **Where it runs.** Only in `/work-ticket`, on the machine building the pull request. No CI job runs it, and
  `pnpm verify` does not. A pull request built another way is not checked. `AGENT.md`'s `Tests can fail` row names
  the command; `none` turns it off.
- **What it touches.** Nothing in the project. It judges the last commit, in a copy under the system's temporary
  directory, so commit before it runs. It reads JavaScript and TypeScript tests run by Vitest 4 or 5.
- **Two files take a test out.** Both are yours and both sit under `ci/`, so the harness asks before an agent edits
  either, and a pull request that changes one says so under `## Gate changes`.
  - `ci/exceptions.yaml` excuses a test file with a dated entry, id `tests-can-fail#<test file>`. Use it for a test
    that checks something other than what code does: one that reads source text, or a list of migrations.
  - `ci/tests-can-fail.yaml` says how a package's tests run when its `test` script is more than a plain call to
    Vitest (`run:`), and keeps a file or folder out, with a reason (`keep-out:`). It carries no dates. Slipway ships
    none.

  ```yaml
  entries:
    - package: api
      run: node --env-file-if-exists=.env.test node_modules/vitest/vitest.mjs run
    - package: web
      keep-out: e2e/
      reason: browser tests; test:e2e runs them
  ```
- **Another test runner.** A package that does not use Vitest has its changed tests named, not judged. When no
  package uses Vitest, the step stops; one dated entry `tests-can-fail#other-runner` in `ci/exceptions.yaml` turns
  that stop into a warning.
- **A mechanical change** is a rename or reformat across many test files that changes nothing they check. It takes
  one dated entry, `tests-can-fail#mechanical`, in `ci/exceptions.yaml`. The entry counts once: in the pull request
  that adds it, where none of that pull request's tests is judged. In every later pull request it excuses nothing,
  and the step warns until you remove it.
- **Out of time.** The step aims for 2 minutes and stops at 10. A test it did not reach is named `out-of-time`, and
  that is never a pass. Run it again. If it stops at the same place every time, the pull request's tests are too
  slow for the step: split the pull request, or keep a slow folder out in `ci/tests-can-fail.yaml`, with a reason.
- **A branch cut before the step arrived** has no `tests-can-fail` script, and `/work-ticket` says so. Merge the
  base branch into it (`git merge origin/main`), then run the gate again. A sync tells you this once.
- **Services from `ci/before-verify.sh`.** The step runs that script in its copy, and keeps what the script starts
  until the run ends. A service that leaves the script's process group (`docker compose up -d`, a server that
  daemonizes) is yours to stop. Have the script write what it started to a file (a container id, a process id),
  and stop it by that record after the run. A port already in use when the script runs usually means a service from
  an earlier run is still up.
- **A test that uses such a service leaves it as it found it.** One service serves every run of a test file. A test
  that leaves rows or state behind can fail on its next run, and the step then reads it as flaky.
- **A run that was killed** (SIGKILL, or a machine put to sleep) can leave its copy and the processes started in
  it. Find that run's folder, the one created when it started:
  `ls -dt "$(node -p "require('os').tmpdir()")"/tests-can-fail-*`. Then stop and remove that one folder:

  ```bash
  pkill -U "$(id -u)" -f "<that folder>"
  rm -rf "<that folder>"
  ```

  Never use the bare `tests-can-fail-` prefix: it matches another session's run. The next run removes folders more
  than a day old by itself.
- **What it cannot see.** A test that imports its subject by a path alias or a dynamic import is named not judged,
  not failed. A test's position can be misread, so a weak new test can pass (#658, decided in #657).
