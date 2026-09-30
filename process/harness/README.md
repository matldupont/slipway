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
`"$CLAUDE_PROJECT_DIR"`, an absolute path. Hooks run under `/bin/sh`, which reads none of your shell
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
