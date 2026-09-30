# Harness configuration

Agent behaviour the repository cannot enforce, enforced at tool time. **Installed by the owner**, by running
`new-project` (which copies `settings.json` to `.claude/settings.json` and says so; `--no-harness` skips it).
An agent never installs its own hooks or permissions, whatever it is told — and edits to this directory and
to `.claude/settings*.json` are ask-level, so changing them is always the owner's decision.

Both copies are committed, so every change is a reviewable diff. Keep them identical: edit here, then copy.

## Permissions

Destructive git operations are **ask-level**, never allowed silently (L-20):

| rule | the failure it prevents |
|---|---|
| any `git push` | pushes straight to the deploy branch |
| `git stash pop`, `git stash drop` | the stash is shared across worktrees and sessions; a pop applies another session's work and drops its stash |
| `git checkout --`, `git reset --hard` | restoring from HEAD destroys uncommitted work |
| `sync --apply` and `sync --adopt --apply`, in any form (`npx github:…#<ref> sync --apply`, `node …/new-project.mjs sync --adopt --apply`) | the first installs slipway's files and this harness, the second decides which edits D1 excuses; the owner runs both. Each also refuses when `CLAUDECODE` is set |

`git stash list` and `git stash apply <sha>` — the safe halves — stay allowed. A prompt can still be approved
reflexively; protection on `main` backstops the worst case.

**Gate configuration is ask-level too.** An agent that cannot make a check pass will weaken the check:
edit the lint config, loosen `tsconfig`, add `continue-on-error`, touch a fixture. Edits to lint, format,
type and test-runner configs, workflows, `ci/**`, this directory and `.claude/settings*.json` ask first,
so changing a gate is always a human decision, and so is creating one: each edit rule has a matching write rule. A PR that touches a gate file also says, in a `## Gate changes` section, whether each file got stricter, stayed the same or loosens. Adding a check is legitimate work — approve it knowingly.
Under `bypassPermissions` nothing asks; required checks on `main` remain the backstop.

**So are the files that change which program a gate command runs, or how pnpm and node start it** (#133).
Each is a gate file here and in the PR check:

| path | why it is a gate file |
|---|---|
| `**/node_modules/**` | `pnpm run` puts `node_modules/.bin` first on PATH, installed or not: a committed program there runs in place of the tool a gate command calls, node included. N1 fails when git tracks any file under it, or under a folder that only reads as node_modules (below); CI runs it with the runner's node before pnpm installs or runs anything, since inside `pnpm meta` a tracked `node` would run N1 itself |
| `**/.npmrc` | pnpm reads its settings from it, among them the shell scripts run in and the options node starts with |
| `**/.pnpmfile.cjs` | pnpm runs it as code on every install |
| `**/pnpm-workspace.yaml` | holds pnpm's settings as well as the package list; the whole file, since any key may change how pnpm runs |
| `**/.envrc` | direnv runs it as shell once trusted, and can set PATH or `NODE_OPTIONS` for every command |
| `**/mise.toml`, `**/.mise.toml`, `**/mise.*.toml`, `**/.mise.*.toml`, `**/.config/mise.toml`, `**/.config/mise.*.toml`, `**/.config/mise/**`, `**/mise/*.toml`, `**/.mise/*.toml` | the names mise reads its settings from; once trusted, each can set PATH, environment variables and tasks |
| `**/package.yaml`, `**/package.json5` | pnpm reads a package's manifest, scripts included, from either as it does from `package.json` |
| a `package.json`'s `scripts`, `packageManager`, `pnpm`, `resolutions`, `engines`, `devEngines`, `bin` and `directories` keys, and a dependency on local code or a runtime (`link:`, `file:`, `workspace:`, a path, `runtime:`) | what a gate command runs, the pnpm and node that run it, pnpm's settings, and a program from the repository in node_modules/.bin (the PR check reads these; the file itself is not ask-level, and a file it cannot parse counts as changed) |

A path that only reads as one of these in canonical form (NFKC, then lower case: `.NPMRC`, `PACKAGE.JSON`, a long-s `node_moduleſ`) is refused outright by N1 and the PR check, as a lookalike: a case-insensitive disk would open it as the gate file, and it cannot be declared in Gate changes.

Known limitations:

| path | what it can change |
|---|---|
| `.nvmrc` | the node version nvm or fnm switch to locally; CI pins node 24 |
| `.node-version` | the same, for fnm, nodenv and others; CI pins node 24 |
| `.tool-versions` | the node or pnpm version asdf or mise pick locally; CI pins both |
| a file a gate setting points at | a pnpmfile path, a script shell, or node options that load a file: once the owner approves the setting, later edits to that file are not asked about. Nothing sets one today |
| `pnpm-lock.yaml` | not a gate file, since every dependency bump changes it; #138 checks that each entry resolves from the registry with an integrity hash |
| the ask prompt's case | the harness's own rules match case as Claude Code does; on a case-insensitive disk, `NODE_MODULES/` may not ask where `node_modules/` does. N1 and the PR check still refuse it |
| the canonical form | NFKC and lower case approximate how macOS folds names; a folding it misses matters only on a Mac that runs a branch's code, which #114 and #126 exist to prevent |

## Hooks

### Base guard

Every hook runs through `hooks/base-guard.sh`, loaded from `origin/HEAD`'s commit rather than the working tree
(`git cat-file blob refs/remotes/origin/HEAD:process/harness/hooks/base-guard.sh`), so a branch cannot change it
(#126). The guard runs the working tree's hook only when the checkout's gate files are `origin/HEAD`'s: the paths
the base's own `Edit(...)` ask rules list (above), every `package.json` and `.claude/**`, matched ignoring case,
tracked or untracked, markdown aside. When one differs, that hook does not run: the Stop hook blocks once to say so
and name the files, SessionStart says so, and the advisory hooks stay quiet. Otherwise a branch's hook scripts,
`ci/verify.mjs` and package scripts would run on every command and every turn end, before the owner had been asked
about them.

Once the owner has said yes to those changes, record it from the repository root:

```bash
sh -c "$(git cat-file blob origin/HEAD:process/harness/hooks/base-guard.sh)" base-guard --yes
```

The yes is kept outside the repository, where no branch can write it (`/tmp/slipway-gate-yes-<uid>/`, a directory
only you can read; `SLIPWAY_GATE_YES_DIR` moves it), as the hash of `origin/HEAD`, the gate-file diff and each
untracked gate file. Changing any gate file after that makes the hash differ, and the hooks stop again until the
next yes. With no `origin/HEAD` (a repository made with `git init` and pushed later), no hook runs and SessionStart
says why; `git remote set-head origin --auto` fixes it, and `new-project` sets it.

Known limitations:

| case | what happens |
|---|---|
| a session started on the branch | Claude Code loaded that checkout's `.claude/settings.json` and ran its SessionStart hook before any guard: start sessions on the default branch, and check someone else's checkout with #114's `--check-checkout` first |
| a checkout mid-session | Claude Code reloads `.claude/settings.json` when it changes on disk, so checking out a branch that changes it swaps the hooks, guard included. `/work-ticket` asks before it checks out such a branch; a checkout you make by hand is yours |
| the recorded yes | the agent writes it, after the owner's yes; it is as good as the agent's report that the owner said yes |
| case folding | `icase` pathspecs catch `.NPMRC`; other foldings are the canonical-form limitation above |
| a stale `origin/HEAD` | a gate file merged since the last fetch counts as changed until you fetch |
| taking this change in a sync | until the sync's pull request merges, `origin/HEAD` holds no `base-guard.sh`, so a session with the new `.claude/settings.json` runs no hook and says so |

### Blocking and state

| hook | event | does |
|---|---|---|
| `hooks/session-state.sh` | SessionStart | injects `node ci/status.mjs` — where the project is on the slipway path and the next step — before the agent reads anything else |
| `hooks/stop-verify.sh` | Stop | runs `pnpm verify:fast`; while red, the agent may not end its turn. Once per stop: a second red lets it stop, and it must say what is failing. Quiet before an app exists; skips a tree it already verified green. A package with dependencies and no `node_modules` (a fresh worktree) blocks with `pnpm install --frozen-lockfile` as the reason, before any cache check, and never counts as green |

The Stop hook is the only blocking hook. It answers the most documented agent failure — declaring work
done that was never run — with the one thing that cannot be talked past. `verify:fast` is `verify`
without `build`; CI always runs the full set. Both need node, found by `hooks/find-node.sh`, which adds
the usual install locations because `/bin/sh` has no PATH of yours; when node is still missing each hook
says so rather than exiting silently (L-34).

### Advisory

Three advisory `PreToolUse` hooks on Bash. Each injects a reminder at the moment of the mistake and never
blocks. Each answers a failure that costs real time, and each triggers on a command shape a script can
recognise:

| hook | fires on | reminds |
|---|---|---|
| `hooks/intake-reminder.sh` | `gh issue create` | route issues through the forms; I1 labels free-prose issues `needs-shape` |
| `hooks/lessons-first.sh` | running a `*.test.*` or `*.spec.*` file | search `process/lessons/` for that filename before forming a hypothesis (L-32) |
| `hooks/absence-search.sh` | `grep`/`rg` piped to `head`, or `grep -m` | a truncated search supports presence only, never absence (L-05) |

**Deliberately no more than three, and none load-bearing.** Advisory means ignorable.

The advisory hooks are POSIX `sh` using only `cat`, `grep` and `printf`, and are called through
`"$CLAUDE_PROJECT_DIR"`, an absolute path, by the base guard. Hooks run under `/bin/sh`, which reads none of your shell
configuration. A hook that depends on a PATH `/bin/sh` does not have fails on every session, and nobody
notices: a hook that runs cleanly with no output leaves no record, so it looks exactly like one that never
ran (L-34).

## Test

Run each hook once with a sample input. Each must print a JSON reminder:

```bash
printf '%s' '{"tool_input":{"command":"gh issue create --title x"}}' | sh process/harness/hooks/intake-reminder.sh
printf '%s' '{"tool_input":{"command":"pnpm vitest run src/schedule.test.ts"}}' | sh process/harness/hooks/lessons-first.sh
printf '%s' '{"tool_input":{"command":"grep -rn useSchedule src | head -5"}}' | sh process/harness/hooks/absence-search.sh
```

A command that matches none of them must print nothing.

The state and Stop hooks, with an empty PATH as `/bin/sh` will have:

```bash
env -i HOME="$HOME" PATH=/usr/bin:/bin CLAUDE_PROJECT_DIR="$PWD" sh process/harness/hooks/session-state.sh
printf '{}' | env -i HOME="$HOME" PATH=/usr/bin:/bin CLAUDE_PROJECT_DIR="$PWD" sh process/harness/hooks/stop-verify.sh
```

The first prints a SessionStart JSON with the state. The second prints nothing while there is no app;
once there is, make a test fail and it must print `"decision":"block"`.

In a worktree without `node_modules` (move `apps/web/node_modules` aside, or use a fresh worktree) the
second must print `"decision":"block"` naming the package and `pnpm install --frozen-lockfile`, and must
not write `.git/stop-verify-ok`.

The base guard, run as `settings.json` runs it. With a gate file changed (add a line to `ci/verify.mjs`) it must print
`"decision":"block"` naming the file and run nothing; restored, it must run the Stop hook as above:

```bash
printf '{}' | env -i HOME="$HOME" PATH=/usr/bin:/bin CLAUDE_PROJECT_DIR="$PWD" sh -c "$(git cat-file blob origin/HEAD:process/harness/hooks/base-guard.sh)" base-guard stop-verify.sh
```
