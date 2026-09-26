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
   npx github:matldupont/slipway acme --dry-run     # from the folder you keep projects in
   npx github:matldupont/slipway acme               # --public, --repo, --name: see the README
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
     `/sync-slipway` takes a newer slipway later (SLIPWAY.md, *Taking slipway updates*);
   - creates the GitHub repository and pushes;
   - creates the `needs-shape` label that `.github/workflows/issue-shape.yml` applies;
   - **attempts** to protect `main` — pull request required; required checks `meta`, `verify`, `pr-body`;
     branches up to date before merging (the only fix for "green on both branches, red on merged main");
     administrators included — and writes the outcome into `decisions.md` as D-001. Private repositories on
     free plans may refuse; the entry then records the accepted risk and the fallback.

   D-001 is left uncommitted: `main` may now refuse direct pushes, so it lands with the bootstrap PR.
   Without `gh`, pass `--no-github` and do the last three by hand in the repository settings. If a run fails
   partway, the README's *If a run fails partway* says how to finish from where it stopped.

2. The harness is already installed: the script copied `process/harness/settings.json` to
   `.claude/settings.json` and said so. It makes destructive git operations and edits to gate configuration
   ask-level, injects `pnpm status` at session start, blocks a turn from ending while `verify:fast` is red,
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
5. Adding `"test:e2e": "…"` to a package, with no workflow running it, turns W1 red.
6. `continue-on-error: true` on any step turns FO1 red.
7. An issue opened with `gh issue create` and free prose gets the `needs-shape` label and a comment listing what is
   missing; editing it until it passes removes both.
8. A review whose `Version line:` no longer matches the PRD turns R1 red.
9. A lesson whose `review-by` is set to a past date turns L1 red.
10. Each harness hook prints its reminder on the sample input in `process/harness/README.md`, and running
    `git stash pop` asks before it acts.
11. One intake skill run (`/log-followup` is cheapest) files its issue in **this** repository.
12. Two milestone files with `status: active` turn MS1 red (`wip/exceeded`).
13. Setting M1 to `active` while `docs/product/FRAME.md` is `status: draft` turns K1 red.
14. A new Claude Code session opens with the `pnpm status` state in context (ask it "what's next?").
15. A failing test makes the Stop hook refuse to end the turn, and asking the agent to edit `biome.json` or a
    workflow prompts for approval.

Revert each probe. The kit is installed when all fifteen have been seen to fire.
