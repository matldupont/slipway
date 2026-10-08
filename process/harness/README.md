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

**So is what the GitHub CLI can delete for good, or widen, beyond this repository** (#279, #303). Each rule matches
the words anywhere in the command, so one behind an environment variable or after `&&` asks too:

| rule | the failure it prevents |
|---|---|
| `gh repo delete` | a session cleaning up after itself deletes a repository; nothing on `main` backstops that |
| `gh api` with `-X` or `--method` and `DELETE` or `delete`, with a space, `=` or nothing between (`-XDELETE`) | the same through the API, and any other delete sent with that method (a branch, a release, a secret) |
| `gh release delete`, `gh release delete-asset` | a deleted release takes its uploaded files with it, and a deleted file is gone from the release; no `git` command brings either back |
| `gh secret delete`, and `gh secret remove`, the manual's other name for it | a secret cannot be read back, so a deleted one is restored only by whoever still holds its value |
| `gh issue delete` | an issue is deleted for good, with its comments; closing one is not |
| `gh run delete` | a workflow run goes with its log, the record a failed check links to |
| `gh auth refresh`, `gh auth login` | either can add permissions to the CLI's token; every session on the machine then uses the wider token, and nothing narrows it afterwards |

`gh repo view`, `gh issue list`, `gh release view`, `gh secret set`, `gh pr create`, `gh auth status` and a `gh api`
read do not ask; a command that only names the words (a commit message, a pull request title) does. These rules are a
prompt, not a boundary: what holds is a token that lacks the permission to delete. They do not cover a session under
`bypassPermissions` (below); a command worded another way, the method in mixed case (`Delete`) among them; the CLI's
other deleting commands, which #303 left out (an alias, a cache, a codespace, an extension, a gist, a GPG or SSH key, a
label, a project or its fields and items, an autolink, a deploy key, a variable); narrowing a token once it was
widened; or anything set on GitHub's side (repository rules, a fine-grained token).

**Gate configuration is ask-level too.** An agent that cannot make a check pass will weaken the check:
edit the lint config, loosen `tsconfig`, add `continue-on-error`, touch a fixture. Edits to lint, format,
type and test-runner configs, workflows, `ci/**`, this directory and `.claude/settings*.json` ask first,
so changing a gate is always a human decision, and so is creating one: an `Edit(...)` rule asks before any file-writing tool edits or creates a file at its path, observed on Claude Code 2.1.293 (#307), so the harness has no `Write(...)` rules, which that version matches against nothing and warns about. On an older Claude Code where only a `Write(...)` rule asked before a file was created, creating a gate file does not prompt; the PR check still counts the created file by its path and wants its `## Gate changes` line. A PR that touches a gate file also says, in a `## Gate changes` section, whether each file got stricter, stayed the same or loosens. Adding a check is legitimate work — approve it knowingly.
Under `bypassPermissions` nothing asks; required checks on `main` remain the backstop.

**So are the owner-only files** (`process/slipway-rules.md` → Gates, #163): each path that list names has an edit
rule here, which covers a write too, the slipway-only ones included, since a rule for a file a project lacks never fires.
`scripts/skills.test.mjs` fails when a path on the list has no rule. The two files a setting names (the
`Domain invariants doc`, the cold-review file) have no fixed path, so nothing here asks before an edit to one.
The PR check counts both, at the paths the base commit's root `AGENT.md` names (#259), and at the paths it names at the
base branch's tip, read from the merge CI checks out, so a pull request that moves or removes the root `AGENT.md` is
held to them too (#305). A pull request that leaves no root `AGENT.md` is never the repair of a row the check cannot read:
repair the row first. Known limitation: run by hand on a branch, or from a workflow that checks out anything but the
pull request's merge, the check has no merge to read the tip from, so only the base given counts there.

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
| a `package.json`'s `scripts`, `packageManager`, `pnpm`, `resolutions`, `engines`, `devEngines`, `bin` and `directories` keys, the keys a gate tool reads its settings from or that change how node loads code (`type`, `imports`, `prettier`, `eslintConfig`, `stylelint`, `jest`, `mocha`, `ava`, `c8`, `nyc`), and a dependency on local code or a runtime (`link:`, `file:`, `workspace:`, a path, `runtime:`) | what a gate command runs, the pnpm and node that run it, pnpm's settings, and a program from the repository in node_modules/.bin (the PR check reads these; the file itself is not ask-level, and a file it cannot parse counts as changed) |

A path that only reads as one of these in canonical form (NFKC, then lower case: `.NPMRC`, `PACKAGE.JSON`, a long-s `node_moduleſ`) is refused outright by N1 and the PR check, as a lookalike: a case-insensitive disk would open it as the gate file, and it cannot be declared in Gate changes.

Known limitations:

| path | what it can change |
|---|---|
| `.nvmrc` | the node version nvm or fnm switch to locally; CI pins node 24 |
| `.node-version` | the same, for fnm, nodenv and others; CI pins node 24 |
| `.tool-versions` | the node or pnpm version asdf or mise pick locally; CI pins both |
| a file a gate setting points at | a pnpmfile path, a script shell, or node options that load a file: once the owner approves the setting, later edits to that file are not asked about. Nothing sets one today |
| `pnpm-lock.yaml` | not a gate file, since every dependency bump changes it; #138 checks that each entry resolves from the registry with an integrity hash |
| a shell write to an owner-only file | `Edit(...)` rules cover the file-writing tools only: `sed -i`, a redirect or `tee` onto `CLAUDE.md` or `.claude/**` does not ask. The rule in `process/slipway-rules.md` → Gates still holds, and `/work-ticket`'s rule-file check still reads the diff |
| the ask prompt's case | the harness's own rules match case as Claude Code does; on a case-insensitive disk, `NODE_MODULES/` or `Claude.md` may not ask where `node_modules/` or `CLAUDE.md` does. N1 and the PR check still refuse it |
| the canonical form | NFKC and lower case approximate how macOS folds names; a folding it misses matters only on a Mac that runs a branch's code, which #114 and #126 exist to prevent |

## Hooks

### Base guard

Every hook runs through `hooks/base-guard.sh`, loaded from a commit rather than the working tree
(`git cat-file blob <commit>:process/harness/hooks/base-guard.sh`), so a branch cannot change it (#126). The commit
is the session's **pin** (#145): `origin/HEAD`'s commit as the session's first SessionStart found it, written once to
`~/.claude/slipway/sessions/<session id>/base`, outside the repository. Every later hook reads the guard from the
pin and compares against the pin, never the live ref, so moving `origin/HEAD` mid-session changes nothing. A
SessionStart pins only when the session has no pin and its `source` is `startup`, `clear` or `fork`, the three
that come with a new session id; a compaction or a resume never pins. Git is called with `--no-replace-objects`, so a replace ref cannot swap the
pinned guard. The guard runs the working tree's hook only when the checkout's gate files are the pin's. Gate files
are the paths the base's own `Edit(...)` ask rules list (above) but its owner-only prose and sync tooling (#163),
every `package.json`, everything under a `.claude` folder but its skills (#173, below), `.gitmodules`
and `.gitattributes`, matched ignoring case, documents included, and each gate folder itself (`node_modules`,
`.claude`, `ci`), so a symlink in its place counts: tracked ones through `git diff` against the pin (a tracked
file `.gitignore` ignores included, a submodule by its commit), and untracked ones. A symlink or a submodule link
added, removed or changed at any path counts too, since the folder it stands for may hold gate files no pattern can
name (`.config -> elsewhere` holding `mise/config.toml`; #148). So does a changed or untracked file whose name git has
to quote (non-ASCII, a quote, a control character), since a Mac disk may open `node_moduleſ` as `node_modules`; the
message lists those names apart. File names are only read from git's output, never handed back to git.

Owner-only files and gate code are two lists, and the guard needs only the second. Under `.claude`, gate code is what
runs without being invoked (settings, hooks) plus everything else there by default: agents, commands, `launch.json`
and whatever Claude Code reads from that folder next, at any depth (`apps/web/.claude/`). Only `.claude/skills/**` is
left out, whole: scripts, and a `.claude` folder inside a skill, included. A skill runs when it is invoked, by a person
or by the agent, never from a hook; a branch that changes only a skill keeps its Stop hook. A gate path the
rest of the list names (`package.json`, `.npmrc`, `.claude/settings*.json`) still counts inside a skill.

When any differs, that hook does not run: the Stop hook blocks once to say so and name the files, SessionStart says
so, and the advisory hooks stay quiet. Otherwise a branch's hook scripts, `ci/verify.mjs` and package scripts would
run on every command and every turn end, before the owner had been asked about them. The branch's other code and
tests still run, in the Stop hook's `verify:fast`, while no gate file differs.

**The yes** (#145). Only the owner's own message turns the hooks back on for changed gate files: a message that is
the phrase `trust gates` and nothing else (any case, spaces around it ignored). The UserPromptSubmit hook runs the
pinned guard as `trust-gates`, which runs no working-tree script. It writes the fingerprint of the changed gate
files to `~/.claude/slipway/sessions/<session id>/yes` and tells the owner which files it covers. The fingerprint
is the pin, then each changed gate file's name, kind (file, executable, deleted) and content hash; file names are
read as paths on disk and hashed by git as paths, never as pathspecs or options. While the checkout's fingerprint
is the recorded one, every hook runs again in that session; any further change to a gate file, a new session, or
another session needs a new yes. No hook, script or flag writes the record but that path, and it refuses a
subagent's prompt, another event, and a message that only contains the phrase (a pasted issue, a relayed message).
A yes never covers a name git has to quote, a symlink, a submodule link, or a folder where a gate file goes: none
has content a hash can pin, so those keep the hooks off until they are merged, and after the owner's yes the agent
runs `pnpm verify:fast` itself.

**A prompt the session arranges cannot carry the phrase** (#222). A prompt a session schedules for itself reaches
UserPromptSubmit exactly as a typed one does (#213), and nothing in that hook's input tells them apart. So the tool
call that would arrange it is refused before it runs: a PreToolUse command in `settings.json` answers
`permissionDecision: deny`, a hook decision, which holds in every permission mode, when any string value in the
call's input is the phrase alone. It takes everything the yes takes (any case, spaces and line ends around it), and
what a tool might turn into that before the prompt reaches the hook: `/loop`, an interval of the form `5m` (digits,
then `s`, `m`, `h` or `d`), or both, in front; padding the yes does not trim but a tool may (any byte outside
printable ASCII, such as a no-break space or a BOM, and an escaped control character). The value is a real JSON
string of the call: a string that itself holds JSON is not read (below). An interval in other words (`every 5 minutes`) is not stripped:
the scheduling call it leads to is refused instead. A value that only mentions the phrase is allowed. Under the three
typing tool families a call that only searches a page for the phrase is refused too; only their refusal says to use Grep
or Bash (#224): on any other tool the hint would read as a suggestion to go searching, and `ARRANGERS` marks the rows
that carry it with `hint`. Input the command cannot read is refused: empty, not a PreToolUse call, a failing `grep`, or one that spells a printable ASCII character as a `\u00XX` escape, which no serialiser writes and which could spell the phrase unseen (a backslash-u in the text itself arrives with its backslash escaped, and is allowed). The command is
`tr`, `grep` and `printf` on its input: it loads no guard and reads no pin, so it runs in a session with no pin too,
which could otherwise hand the phrase to one that has. It covers the tools in its matcher:

| tool | what it could arrange |
|---|---|
| `ScheduleWakeup`, `CronCreate`, `Skill` (`/loop`) | a wake-up, a recurring or one-off prompt, a loop, in this session |
| `mcp__scheduled-tasks__create_scheduled_task`, `…update_scheduled_task`, `RemoteTrigger` | a scheduled task or a routine, in a later or a remote session |
| `SendMessage`, `mcp__ccd_session_mgmt__send_message`, `mcp__ccd_session__spawn_task` | a message to another session, or the opening prompt of a new one |
| `mcp__computer-use__*`, `mcp__claude-in-chrome__*`, `mcp__Claude_Browser__*`, `mcp__remote-devices__*` (the same on a linked computer) | text typed, or a field set, in the app or a page that holds a session |
| `mcp__terminal__run_in_terminal` | a command in the owner's terminal that starts a session. No ask rule can read an MCP tool's input, so here the phrase anywhere in the command is refused, as `Bash(*trust gates*)` asks; the refusal says to run an ordinary command that only names it (a search) with Bash |

This table is the list to extend when Claude Code gains another way to arrange a prompt: first check whether the tool
takes its prompt inside a string it parses (JSON in a string): if it does, a matcher word is not enough and the tool
needs its own handling. No tool on the table does, by its input schema (2.1.287): `RemoteTrigger`'s body and the batch
tools' actions are objects, which the rule reads into. Otherwise add the tool to the matcher
and to `ARRANGERS` in `scripts/harness-fixture.mjs`; `scripts/harness-yes.test.mjs` fails while the two differ, and
runs the command as `settings.json` holds it, on one list of prompts shared with the yes.

With no pin (no `origin/HEAD` when the session started, none holding `base-guard.sh` (#154), a session that began
before this guard was installed, a pin that is not a commit id, or no session id), no hook runs: the Stop hook blocks
once, telling the agent to run `pnpm verify:fast` itself and report the result, but for the one state D-034 lets end (the
table below); SessionStart says why, and the advisory hooks stay quiet. A new session pins again;
`git remote set-head origin --auto` fixes a missing `origin/HEAD`, and `new-project` sets it. With no gate paths read, or a git failure, no hook runs and the Stop and SessionStart hooks say why.

The harness asks before the agent reaches the pin or the record:

| rule | what it asks before |
|---|---|
| `Edit(~/.claude/slipway/**)` | an edit or a write to a session's pin or yes |
| `Bash(*.claude/slipway*)` | a command that names that folder |
| `Bash(*base-guard*)` | a command that runs the guard by hand, with input of the agent's making |
| `Bash(*trust gates*)` | a command that carries the phrase, such as a headless session started with it as its prompt |
| `Bash(git remote set-head:*)`, `Bash(git update-ref:*)`, `Bash(git replace:*)`, `Bash(*refs/remotes/origin*)` | moving `origin/HEAD` before a later session pins it |

Known limitations:

| case | what happens |
|---|---|
| a session started on the branch | Claude Code loaded that checkout's `.claude/settings.json` and ran its SessionStart hook before any guard: start sessions on the default branch, and check someone else's checkout with #114's `--check-checkout` first. `/work-ticket` stops when its session started on a branch that changes `.claude/settings*.json` |
| a checkout mid-session | Claude Code reloads `.claude/settings.json` when it changes on disk, so checking out a branch that changes it swaps the hooks, guard included. `/work-ticket` asks before it checks out such a branch; a checkout you make by hand is yours |
| the agent's shell and the record | the pin and the yes are plain files, and the guard's UserPromptSubmit path is a command: an agent with a shell can write either file, run the guard with input of its own making, or start a headless session on its own session id with the phrase as the prompt (Claude Code runs UserPromptSubmit for it, checked on 2.1.283). Each asks first (the rules above), but a reworded shell command still gets through, and a permission mode that approves by itself approves these too. Nothing in a hook's environment tells it from the agent's shell |
| a prompt the owner did not type | Claude Code does not mark where a prompt came from. A `/loop` fire reaches UserPromptSubmit as if typed (same session id, no `agent_id`; 2.1.287, #213), so the harness refuses the tool call that would arrange the phrase (#222, above); a wakeup or a cron job was not tried, and both are refused the same way. A subagent's own prompt did not reach UserPromptSubmit at all in a live session (2.1.287, #213), so its `agent_id` refusal never ran; what did reach it were the harness's `<agent-message>` and `<task-notification>` relays, wrapped and with no `agent_id` (seen on one relay each), so not the phrase alone, like a message relayed from another session. What remains: a tool that is not in the matcher (a new Claude Code tool, another MCP server's); the phrase typed key by key, or put in a field by a script that holds it inside a longer string; a tool that parses a JSON string it was given (none on the table does, by its schema); and input forged from a shell (the row above). Whether PreToolUse fires for each tool in the matcher, and what each tool trims from a prompt before it enqueues it, is not documented and was not checked in a live session |
| what the refusal rests on | the refusal is a command in `.claude/settings.json`, so it is as trusted as the settings file the session started with, like the lines that load the guard. A session started in a checkout whose settings differ does not have it: #114's `--check-checkout` and starting sessions on the default branch are what cover that, and nothing here does |
| a session with no pin and nothing changed (#262, D-034) | the Stop hook lets the turn end, and says nothing, when the session id is usable, no pin exists for it at all, the checkout has no change and `HEAD` is the commit `origin/HEAD` names: there is nothing of the session's to verify, and CI ran the gate on the default branch's code. No change means none tracked, staged, untracked or in a submodule, read by one `git status` whose flags are named in the command (untracked files listed, submodules compared, no file monitor), so a local setting cannot hide one; the remote head is read from the ref, with no network call. Everything else blocks as before: a pin that exists and cannot be used, a session id that is unset or malformed, git not answering, and a checkout with nothing changed that is behind `origin/HEAD`. That last one holds only commits the default branch has, but the test is one comparison with no walk through history, and the block names the remedy, `git pull --ff-only`. The Stop hook cannot tell why there is no pin, so this reaches every session with none: one older than the guard, a compaction or a resume, a base with no guard yet (#154). Its limits are this table's, as a class: what an ignore rule or a local index flag hides, and an `origin/HEAD` the agent moved (the ask rules above). `scripts/harness-no-pin.test.mjs` holds each case |
| a base moved before the pin | a session pins whatever `origin/HEAD` is when it starts: an agent that moved it in an earlier session, or in this conversation before a `/clear` or a fork gave it a new session id (the ask rules above), is trusted by the next one |
| a pin gone stale | the pin is the session's, so after a merge and a fetch the session still compares against the old base: its hooks stop, and the message says to send the phrase or start a new session |
| what a yes cannot cover | a quoted name, a symlink, a submodule link, a folder or a nested repository where a gate file goes: the hooks stay off for that checkout until merged |
| the session folders | `~/.claude/slipway/sessions/` gains one small folder per session and nothing removes them |
| the session id | the guard reads it from `CLAUDE_CODE_SESSION_ID`, which Claude Code sets for hook commands (checked on 2.1.283); a version that does not set it runs no hook, and the Stop and SessionStart hooks say so. The id survives a manual `/compact` (a live session kept it, 2.1.287, #213), so a long session keeps its pin; an automatic compaction was not tried |
| `.gitignore` and local index flags | an untracked file is seen as git sees it, through the working tree's ignore rules; `skip-worktree` and `assume-unchanged` hide a tracked file's edit. A checkout alone brings neither an untracked file nor a flag |
| a skill the branch changed | `.claude/skills/**` does not stop the hooks, yet a skill can carry inline shell or frontmatter hooks that run once it is invoked. It stays owner-only: the harness asks before an edit to it, and the PR check wants a `## Gate changes` line for it, so the change is seen at the pull request, not at the Stop hook. An untracked link below `.claude/skills/` is skill content, and a skill folder that is its own untracked git repository is not looked into (as any such folder); a checkout alone brings neither |
| a symlink | a tracked symlink, or a submodule link, counts wherever it changes, and a gate folder counts when a link takes its place, tracked or untracked unless the ignore rules hide it (`node_modules` without a trailing slash ignores a link too). A link the pin already has is judged by the link, not by what its target holds now; an untracked link outside the gate folders does not count, since git reports no mode for an untracked file. A checkout alone brings no untracked link |
| a submodule at another path | a submodule's commit and its own changes count at any path, but the guard never looks inside one: a file its own `.gitignore` ignores, or a file written into a submodule folder that is not checked out as a repository, is not seen |
| a checkout while a hook runs | the guard checks, then the hook runs; a checkout in between (a background agent) changes what the hook reads |
| case folding | `icase` catches `.NPMRC`, and a quoted name counts as a gate file; other foldings of plain ASCII names are the canonical-form limitation above |
| a stale `origin/HEAD` | a gate file merged since the last fetch counts as changed in a session that starts before you fetch |
| taking this change in a sync | until the sync's pull request merges, `origin/HEAD` holds no `base-guard.sh`, or one that pins nothing, so a session with the new `.claude/settings.json` runs no hook: SessionStart says so, and the Stop hook blocks once, telling the agent to run `pnpm verify:fast` itself (#154). A session open across the merge has no pin either: start a new one. The refusal (#222) needs no pin: it is active from the next session after the settings are installed |

### Where the PR check differs

The PR check (`ci/checks/lib/gate-files.mjs`, read by P1) counts every path the guard counts, `.gitmodules` and
`.gitattributes` included (#174), except the rows below. `scripts/gate-files.test.mjs` pins each row, and fails when
the guard's list of extra paths gains one the check neither counts nor excepts here, or its `.claude` list changes. The check also counts what the guard leaves
out: owner-only prose, `dev/ownership.yaml`, `scripts/new-project.mjs` and `.claude/skills/**`.

| the guard counts | why the PR check does not |
|---|---|
| every `package.json` | the check counts one only when a key it lists differs (the table above): what a gate command runs, and the settings a gate tool keeps there. A line for every other edit, a registry dependency bump among them, would be noise; the guard cannot parse JSON from `sh`, so it takes the whole file. The list is a list: a tool that reads its settings from a key not on it is not seen, and that key is added when the tool is |
| a markdown file under a gate folder | a document cannot change what a gate checks (`ci/README.md`, a `.md` fixture body); an owner-only one, or one under `.claude/`, is still counted. The guard has no cheap way to tell them apart |
| a plain file at a gate folder's name | a file named `ci` or `node_modules` holds no gate file and nothing runs it. A link there is counted as a link |
| a quoted name outside every gate path | the guard counts any name git has to quote, since a Mac disk may open it as a gate path. The check reads names unquoted: one inside a gate path is counted like any other, one that reads as a gate path in canonical form is refused as a lookalike, and the rest (`docs/café.md`) touch no gate as far as the canonical form models the disk (the canonical-form limitation above) |
| an untracked file | a pull request carries only committed files |

Known limitation: the harness has no ask rule for `.gitmodules` or `.gitattributes`, so an edit to either does not
prompt; the guard and the PR check still count it.

### Blocking and state

| hook | event | does |
|---|---|---|
| `hooks/session-state.sh` | SessionStart | injects `node ci/status.mjs` — where the project is on the slipway path and the next step — before the agent reads anything else |
| `hooks/stop-verify.sh` | Stop | runs `pnpm verify:fast`; while red, it blocks the first stop of a turn. A second stop ends the turn red, with the agent asked to say what is failing. Quiet before an app exists; skips a tree it already verified green. A package with dependencies and no `node_modules` (a fresh worktree) blocks with `pnpm install --frozen-lockfile` as the reason, before any cache check, and never counts as green |

The Stop hook is the only blocking hook. It answers the most documented agent failure — declaring work
done that was never run — with the one thing that blocks a stop. `verify:fast` is `verify`
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

The base guard, in a session Claude Code started here (it needs that session's pin, so run it from the session's
own terminal, where `CLAUDE_CODE_SESSION_ID` is set). With a gate file changed (add a line to `ci/verify.mjs`) it
must print `"decision":"block"` naming the file and run nothing; restored, it must run the Stop hook as above:

```bash
printf '{}' | env -i HOME="$HOME" PATH=/usr/bin:/bin CLAUDE_PROJECT_DIR="$PWD" CLAUDE_CODE_SESSION_ID="$CLAUDE_CODE_SESSION_ID" sh -c "$(git cat-file blob "$(cat ~/.claude/slipway/sessions/$CLAUDE_CODE_SESSION_ID/base)":process/harness/hooks/base-guard.sh)" base-guard stop-verify.sh
```

With the gate file still changed, send `trust gates` as a message of its own: Claude Code must show which files
the yes covers, and the Stop hook must run again until you change the file once more.

The refusal (#222), with an inert call: the first must print `"permissionDecision":"deny"`, the second nothing.

```bash
node -e 'const s=require("./process/harness/settings.json"),c=s.hooks.PreToolUse.find((e)=>e.matcher!=="Bash").hooks[0].command,r=(p)=>process.stdout.write(require("child_process").spawnSync("/bin/sh",["-c",c],{input:JSON.stringify({hook_event_name:"PreToolUse",tool_name:"CronCreate",tool_input:{cron:"* * * * *",prompt:p}}),encoding:"utf8"}).stdout);r("/loop 5m "+["trust","gates"].join(" "));r("say hi")'
```
