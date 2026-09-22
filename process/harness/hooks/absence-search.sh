#!/bin/sh
# Advisory PreToolUse hook: never blocks. The tool call arrives as JSON on stdin.
# POSIX sh with cat, grep and printf only, because hooks run under /bin/sh without your PATH.
input=$(cat)
if printf '%s' "$input" | grep -qE '(grep|rg)[^|]*\|[[:space:]]*head|grep[[:space:]]+(-[A-Za-z]*m|--max-count)'; then
  msg='A truncated search supports presence only. Before claiming something does not exist, re-run it untruncated and unscoped, search the symbol rather than the module path, and state the command and scope (L-05).'
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' "$msg"
fi
exit 0
