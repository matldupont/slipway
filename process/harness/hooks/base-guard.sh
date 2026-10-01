#!/bin/sh
# Hook guard (#126). Every hook in settings.json runs this file as origin/HEAD's commit holds it, never the
# working tree's copy, so a branch cannot change it:
#   sh -c "$(git -C "$CLAUDE_PROJECT_DIR" cat-file blob refs/remotes/origin/HEAD:process/harness/hooks/base-guard.sh)" base-guard <hook>
# It runs the working tree's <hook> only when the checkout's gate files are origin/HEAD's. Otherwise that hook does
# not run: the Stop hook blocks once to say so, SessionStart says so, the advisory hooks stay quiet.
# Gate files: the base's own ask-level edit globs (settings.json, #133) but its owner-only prose and tooling, every
# package.json, everything under a .claude folder but its skills (#173), .gitmodules and .gitattributes, matched
# ignoring case, and each gate folder itself (`node_modules`, `.claude`), so a link in its place counts (#148).
# A changed or untracked name git has to quote (non-ASCII, a quote, a control character) counts too: a Mac disk
# may open `node_moduleſ` as `node_modules`. So does a symlink or a submodule link added, removed or changed at
# any path: the folder it stands for may hold gate files no pattern can name.
# File names are only ever read from git's output, never passed back to git as pathspecs.
# POSIX sh with git, sed, grep, sort, head, tr and printf: hooks run under /bin/sh without your PATH (L-34).

set -f # the globs below are git's, never the shell's
hook=$1
d=${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}
g() { git -C "$d" -c core.quotepath=on "$@"; }

# Broken state: the Stop and SessionStart hooks say so where the owner sees it; the advisory hooks stay quiet.
fail() {
  case "$hook" in
    stop-verify.sh|session-state.sh) printf '{"systemMessage":"base-guard: %s, so no hook ran."}\n' "$1" ;;
  esac
  exit 0
}

case "$hook" in
  session-state.sh|stop-verify.sh|intake-reminder.sh|lessons-first.sh|absence-search.sh) ;;
  *) hook=stop-verify.sh; fail 'unknown hook' ;;
esac

base=$(g rev-parse -q --verify 'refs/remotes/origin/HEAD^{commit}') || fail 'no origin/HEAD (git remote set-head origin --auto)'

# The gate paths as pathspecs, from the base's settings (one list); a rule outside the repository (/tmp) is skipped.
globs=$(g cat-file blob "$base:process/harness/settings.json" | sed -n 's/^[[:space:]]*"Edit(\([^/][^)]*\))",\{0,1\}[[:space:]]*$/\1/p')
[ -n "$globs" ] || fail 'no gate paths in origin/HEAD:process/harness/settings.json'
set --
for glob in $globs '**/package.json' '**/.gitmodules' '**/.gitattributes'; do
  # Owner-only files that don't change what a gate runs (#163): prose (.md) and slipway's own sync tooling. The harness
  # asks before an edit to each, but owner-only and gate code are two lists, and this guard needs only the second.
  # The base's `**/.claude/**` rule is owner-only too: the guard's own .claude list, below, decides that folder.
  case "$glob" in *.md|'**/dev/ownership.yaml'|'**/scripts/new-project.mjs'|'**/.claude/**') continue ;; esac
  set -- "$@" ":(glob,icase)$glob"
  case "$glob" in */'**') set -- "$@" ":(glob,icase)${glob%/\*\*}" ;; esac # the folder itself: a link in its place
done

# Tracked files against origin/HEAD through the real index (an ignored file the branch tracks included), then
# untracked ones. Submodules are compared by commit whatever .gitmodules says.
gdiff() { g diff --name-only --no-renames --no-ext-diff --ignore-submodules=none "$base" -- "$@"; }
tracked=$(gdiff "$@") || fail 'git diff failed'
untracked=$(g ls-files -o --exclude-standard -- "$@") || fail 'git ls-files failed'
# .claude (#173): every file under it is gate code, documents included (settings, hooks, agents, commands, and what
# Claude Code reads from there next), and so is the folder itself, for a link in its place. Only the skills tree is
# not: a skill runs when it is invoked, by a person or the agent, never from a hook, so it is owner-only and no more.
# The tree is left out whole, a .claude folder or an untracked link inside it included. Its own pathspecs, so a
# name the list above matches (a skill's package.json, .npmrc or .claude/settings.json) still counts.
set -- ':(glob,icase)**/.claude/**' ':(glob,icase)**/.claude' ':(exclude,glob,icase)**/.claude/skills/**'
dotclaude=$(gdiff "$@") || fail 'git diff failed'
dotclaude_new=$(g ls-files -o --exclude-standard -- "$@") || fail 'git ls-files failed'
changed=$(printf '%s\n%s\n%s\n%s\n' "$tracked" "$untracked" "$dotclaude" "$dotclaude_new" | sed '/^$/d' | grep -v '^"' | sort -u)
# Every change, with its modes (`:old new sha sha status<TAB>name`): the name is what follows the fifth field.
raw=$(g diff --raw --no-renames --no-ext-diff --ignore-submodules=none "$base" --) || fail 'git diff failed'
path() { sed 's/^:[^[:space:]]* [^[:space:]]* [^[:space:]]* [^[:space:]]* [^[:space:]]*[[:space:]]//'; }
all=$(printf '%s\n' "$raw" | path)
links=$(printf '%s\n' "$raw" | grep -E '^:(120000|160000) |^:[0-7]+ (120000|160000) ' | path)
changed=$(printf '%s\n%s\n' "$changed" "$links" | sed '/^$/d' | grep -v '^"' | sort -u)
others=$(g ls-files -o --exclude-standard) || fail 'git ls-files failed'
odd=$(printf '%s\n%s\n' "$all" "$others" | grep '^"' | sort -u)
[ -z "$changed" ] && [ -z "$odd" ] && exec sh "$d/process/harness/hooks/$hook"

# A file name is the branch's text: an octal escape becomes #NNN, and only these characters reach the message.
# Five names at most, then how many more, so a list padded with harmless names still says it is longer.
names() {
  printf '%s\n' "$1" | head -n 5 | sed 's/\\\([0-7][0-7][0-7]\)/#\1/g; s/[^A-Za-z0-9._/@+#-]/?/g' | tr '\n' ' '
  n=$(printf '%s\n' "$1" | sed -n '$=')
  [ "$n" -gt 5 ] && printf 'and %s more ' $((n - 5))
}
why="this checkout changes gate files against origin/HEAD, so their code has not run"
[ -n "$changed" ] && why="$why. Gate files: $(names "$changed")"
[ -n "$odd" ] && why="$why. Non-ASCII names; on a Mac one may stand in for a gate path like node_modules/: $(names "$odd")"
why="$why. Ask the owner about them; once they say yes, run pnpm verify:fast yourself and report its result"
case "$hook" in
  stop-verify.sh)
    input=$(cat)
    case "$input" in *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;; esac
    printf '{"decision":"block","reason":"stop-verify did not run: %s. Until then, say plainly that the gate did not run."}\n' "$why" ;;
  session-state.sh)
    printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"session-state did not run: %s."}}\n' "$why" ;;
esac
exit 0
