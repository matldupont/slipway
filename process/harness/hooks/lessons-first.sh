#!/bin/sh
# Advisory PreToolUse hook: never blocks. The tool call arrives as JSON on stdin.
# POSIX sh with cat, grep and printf only, because hooks run under /bin/sh without your PATH.
input=$(cat)
file=$(printf '%s' "$input" | grep -oE '[A-Za-z0-9_./-]+\.(test|spec)\.[cm]?[jt]sx?' | head -n 1)
[ -n "$file" ] || exit 0
base=${file##*/}
msg="Before forming a hypothesis about $base, search the lessons: grep -rl $base process/lessons/ (L-32)."
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' "$msg"
