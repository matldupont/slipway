#!/bin/sh
# Hook guard (#126). Every hook in settings.json runs this file as origin/HEAD's commit holds it, never the
# working tree's copy, so a branch cannot change it:
#   sh -c "$(git -C "$CLAUDE_PROJECT_DIR" cat-file blob refs/remotes/origin/HEAD:process/harness/hooks/base-guard.sh)" base-guard <hook>
# It runs the working tree's <hook> only when the checkout's gate files are origin/HEAD's, or when the owner's
# yes to exactly these gate files is recorded (`base-guard --yes`, ask-level). Otherwise that hook does not run:
# the Stop hook blocks once to say so, SessionStart says so, the advisory hooks stay quiet.
# Gate files: the base's own ask-level edit globs (settings.json, #133), every package.json, .claude/**,
# .gitmodules and .gitattributes, matched ignoring case. A changed or untracked name git has to quote (non-ASCII,
# a quote, a control character) counts too: a Mac disk may open `node_moduleſ` as `node_modules`.
# POSIX sh with git, sed, grep, sort, head, tr, cut, ls, id, cat, mktemp, xargs, rm and printf (L-34).

set -f # the globs below are git's, never the shell's
hook=$1
d=${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}
g() { git -C "$d" -c core.quotepath=on "$@"; }

# Broken state: the Stop and SessionStart hooks say so where the owner sees it; --yes fails; advisory hooks are quiet.
fail() {
  case "$hook" in
    stop-verify.sh|session-state.sh) printf '{"systemMessage":"base-guard: %s, so no hook ran."}\n' "$1" ;;
    --yes) printf 'base-guard: %s, so nothing was recorded.\n' "$1"; exit 1 ;;
  esac
  exit 0
}

case "$hook" in
  --yes|session-state.sh|stop-verify.sh|intake-reminder.sh|lessons-first.sh|absence-search.sh) ;;
  *) hook=stop-verify.sh; fail "unknown hook $1" ;;
esac

base=$(g rev-parse -q --verify 'refs/remotes/origin/HEAD^{commit}') || fail 'no origin/HEAD (git remote set-head origin --auto)'

# The gate paths as pathspecs, from the base's settings (one list); a rule outside the repository (/tmp) is skipped.
globs=$(g cat-file blob "$base:process/harness/settings.json" | sed -n 's/^[[:space:]]*"Edit(\([^/][^)]*\))",\{0,1\}[[:space:]]*$/\1/p')
[ -n "$globs" ] || fail 'no gate paths in origin/HEAD:process/harness/settings.json'
set --
for glob in $globs '**/package.json' '.claude/**' '**/.gitmodules' '**/.gitattributes'; do
  set -- "$@" ":(glob,icase)$glob"
done

# Names git has to quote, anywhere in the checkout's changes.
odd=$( { g diff --name-only --no-renames --ignore-submodules=none "$base" && g ls-files -o --exclude-standard; } | grep '^"' | sort -u)

# The checkout's gate files as a tree: origin/HEAD's tree with the working tree's gate files (tracked, untracked,
# deleted) laid over it, in a scratch index. Its hash is the fingerprint a yes is recorded against. With a quoted
# name present, the whole tree is laid over, so the yes covers everything.
idx=$(mktemp "${TMPDIR:-/tmp}/base-guard.XXXXXX") || fail 'mktemp failed'
lay() { GIT_INDEX_FILE=$idx g ls-files -z -c -o --exclude-standard -- "$@" | GIT_INDEX_FILE=$idx xargs -0 -r git -C "$d" add -A -- >/dev/null 2>&1; }
ok=1
GIT_INDEX_FILE=$idx g read-tree "$base" || ok=
if [ -z "$ok" ]; then :; elif [ -n "$odd" ]; then lay . || ok=; else lay "$@" || ok=; fi
tree=$( [ -n "$ok" ] && GIT_INDEX_FILE=$idx g write-tree ) || ok=
rm -f "$idx"
[ -n "$ok" ] || fail 'git could not read the checkout'
changed=$(g diff-tree -r --name-only --no-renames "$base^{tree}" "$tree") || fail 'git diff-tree failed'
[ -n "$odd" ] && changed=$(g diff-tree -r --name-only --no-renames "$base^{tree}" "$tree" -- "$@" | grep -v '^"')
[ -z "$odd" ] && [ -z "$changed" ] && [ "$hook" != --yes ] && exec sh "$d/process/harness/hooks/$hook"
fingerprint="$base $tree"

# The yes lives outside the repository, where no branch can write it, one file per checkout.
dir=${SLIPWAY_GATE_YES_DIR:-/tmp/slipway-gate-yes-$(id -u)}
key=$(printf '%s' "$d" | g hash-object --stdin)
private() { [ -d "$dir" ] && [ ! -L "$dir" ] && [ -O "$dir" ] && [ "$(ls -ld "$dir" | cut -c5-10)" = '------' ]; }

if [ "$hook" = --yes ]; then
  [ -n "$odd$changed" ] || { printf '%s\n' 'base-guard: no gate file differs from origin/HEAD; nothing to record.'; exit 0; }
  (umask 077; mkdir -p "$dir") && private || fail "$dir is not a private directory of yours"
  printf '%s\n' "$fingerprint" > "$dir/$key" || fail "could not write $dir"
  printf '%s\n' 'base-guard: recorded the yes for these files; hooks run until one of them changes:' "$changed" "$odd"
  exit 0
fi
private && [ -f "$dir/$key" ] && [ "$(cat "$dir/$key")" = "$fingerprint" ] && exec sh "$d/process/harness/hooks/$hook"

# A file name is the branch's text: an octal escape becomes #NNN, and only these characters reach the message.
names() { printf '%s\n' "$1" | sed '/^$/d' | head -n 5 | sed 's/\\\([0-7][0-7][0-7]\)/#\1/g; s/[^A-Za-z0-9._/@+#-]/?/g' | tr '\n' ' '; }
why="this checkout changes gate files against origin/HEAD, so their code has not run"
[ -n "$changed" ] && why="$why. Gate files: $(names "$changed")"
[ -n "$odd" ] && why="$why. Non-ASCII names; on a Mac one may stand in for a gate path like node_modules/: $(names "$odd")"
why="$why. Ask the owner; once they say yes, record it from the repository root (the harness asks them first): sh -c \\\"\$(git cat-file blob origin/HEAD:process/harness/hooks/base-guard.sh)\\\" base-guard --yes"
case "$hook" in
  stop-verify.sh)
    input=$(cat)
    case "$input" in *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;; esac
    printf '{"decision":"block","reason":"stop-verify did not run: %s. Until then, say plainly that the gate did not run."}\n' "$why" ;;
  session-state.sh)
    printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"session-state did not run: %s. Until then, the project state was not loaded."}}\n' "$why" ;;
esac
exit 0
