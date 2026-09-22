#!/bin/sh
# Stop hook: blocking. Runs `verify --fast` before the agent may end its turn; a red result
# sends the failure back to the agent instead of a "done". Logic lives in stop-verify.mjs.
. "$CLAUDE_PROJECT_DIR/process/harness/hooks/find-node.sh"
if command -v node >/dev/null 2>&1; then
  exec node "$CLAUDE_PROJECT_DIR/process/harness/hooks/stop-verify.mjs"
fi
printf '%s\n' '{"systemMessage":"stop-verify: node is not on the hook PATH, so the gate did not run. Run pnpm verify:fast yourself."}'
