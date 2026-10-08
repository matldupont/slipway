# Testing the harness hooks

Split from `process/harness/README.md` (#363), which keeps the rules and the hooks table.

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
