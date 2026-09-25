#!/bin/sh
# Advisory PreToolUse hook: never blocks. The tool call arrives as JSON on stdin.
# POSIX sh with cat, grep and printf only, because hooks run under /bin/sh without your PATH.
input=$(cat)
case "$input" in
  *'gh issue create'*) ;;
  *) exit 0 ;;
esac
msg='Route new issues through the issue forms (feature or bug), not a free-prose gh issue create. The issue-shape workflow labels an issue with no Acceptance or Seams answer as needs-shape, and comments what is missing.'
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' "$msg"
