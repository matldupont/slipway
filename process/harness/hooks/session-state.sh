#!/bin/sh
# SessionStart hook: hands the agent the computed project state (ci/status.mjs) — where the
# project is on the slipway path and the next step — before it reads anything else. Never
# blocks. When node cannot be found it says so instead of staying silent (L-34).
. "$CLAUDE_PROJECT_DIR/process/harness/hooks/find-node.sh"
if command -v node >/dev/null 2>&1; then
  exec node "$CLAUDE_PROJECT_DIR/ci/status.mjs" --hook "$CLAUDE_PROJECT_DIR"
fi
printf '%s\n' 'session-state: node is not on the hook PATH, so project state was not loaded. Run `pnpm status` and read its output before starting.'
