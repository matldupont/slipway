#!/bin/sh
# Hook guard (#126). Every hook in settings.json runs this file as origin/HEAD's commit holds it, never the
# working tree's copy, so a branch cannot change it:
#   sh -c "$(git -C "$CLAUDE_PROJECT_DIR" cat-file blob refs/remotes/origin/HEAD:process/harness/hooks/base-guard.sh)" base-guard <hook>
# It runs the working tree's <hook> only when the checkout's gate files are origin/HEAD's, or when the owner's
# yes to exactly this gate-file diff is recorded (`base-guard --yes`). Otherwise that hook does not run: the
# Stop hook blocks once to say so, the others stay quiet (advisory; SessionStart reports it).
# Gate files: the base's own ask-level edit globs (settings.json, #133), every package.json and .claude/**.
# POSIX sh with git, sed, sort, head, tr, cut, ls, id, cat and printf: hooks run under /bin/sh without your PATH (L-34).

set -f # the globs below are git's, never the shell's
hook=$1
d=${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}
g() { git -C "$d" -c core.quotepath=off "$@"; }
say() { printf '%s\n' "$1"; }

case "$hook" in
  --yes|session-state.sh|stop-verify.sh|intake-reminder.sh|lessons-first.sh|absence-search.sh) ;;
  *) say "base-guard: unknown hook '$hook', nothing ran."; exit 0 ;;
esac

base=$(g rev-parse -q --verify 'refs/remotes/origin/HEAD^{commit}') || {
  say 'base-guard: no origin/HEAD, so no hook ran. Fetch, then: git remote set-head origin --auto'
  exit 0
}

# The gate paths as pathspecs, from the base's settings (one list), matched ignoring case like a Mac disk.
set --
for glob in $(g cat-file blob "$base:process/harness/settings.json" | sed -n 's/^[[:space:]]*"Edit(\(.*\))",\{0,1\}[[:space:]]*$/\1/p') '**/package.json' '.claude/**'; do
  set -- "$@" ":(glob,icase)$glob"
done
set -- "$@" ':(glob,icase,exclude)**/*.md'

tracked=$(g diff --name-only --no-renames --no-ext-diff "$base" -- "$@") || { say 'base-guard: git diff failed, so no hook ran.'; exit 0; }
untracked=$(g ls-files -o --exclude-standard -- "$@") || { say 'base-guard: git ls-files failed, so no hook ran.'; exit 0; }
changed=$(printf '%s\n%s\n' "$tracked" "$untracked" | sed '/^$/d' | sort -u)

# The yes is recorded outside the repository, where no branch can write it: one file per checkout, holding
# the hash of the base commit, the gate-file diff and each untracked gate file. Any later change re-asks.
fingerprint() {
  {
    printf '%s\n' "$base"
    g diff --no-renames --no-ext-diff --no-textconv --binary "$base" -- "$@"
    printf '%s\n' "$untracked" | while IFS= read -r f; do
      [ -n "$f" ] || continue
      printf '%s\n' "$f"; cat "$d/$f" 2>/dev/null
    done
  } | g hash-object --stdin
}
dir=${SLIPWAY_GATE_YES_DIR:-/tmp/slipway-gate-yes-$(id -u)}
key=$(printf '%s' "$d" | g hash-object --stdin)
private() { [ -d "$dir" ] && [ ! -L "$dir" ] && [ -O "$dir" ] && [ "$(ls -ld "$dir" | cut -c5-10)" = '------' ]; }

if [ "$hook" = --yes ]; then
  [ -n "$changed" ] || { say 'base-guard: no gate file differs from origin/HEAD; nothing to record.'; exit 0; }
  (umask 077; mkdir -p "$dir") && private || { say "base-guard: $dir is not a private directory of yours; nothing recorded."; exit 1; }
  fingerprint "$@" > "$dir/$key" || exit 1
  say 'base-guard: recorded the yes for these gate files; hooks run until one of them changes:'
  printf '%s\n' "$changed"
  exit 0
fi

run() { exec sh "$d/process/harness/hooks/$hook"; }
[ -n "$changed" ] || run
private && [ -f "$dir/$key" ] && [ "$(cat "$dir/$key")" = "$(fingerprint "$@")" ] && run

# A file name is the branch's text: only these characters reach the message.
list=$(printf '%s\n' "$changed" | head -n 5 | sed 's/[^A-Za-z0-9._/@+-]/?/g' | tr '\n' ' ')
n=$(printf '%s\n' "$changed" | sed -n '$=')
why="this checkout changes $n gate file(s) against origin/HEAD: ${list}, so their code has not run. Once the owner has said yes to these changes, record it by running this from the repository root: sh -c \\\"\$(git cat-file blob origin/HEAD:process/harness/hooks/base-guard.sh)\\\" base-guard --yes"
case "$hook" in
  stop-verify.sh)
    input=$(cat)
    case "$input" in *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;; esac
    printf '{"decision":"block","reason":"stop-verify did not run: %s. Until then, say plainly that the gate did not run."}\n' "$why" ;;
  session-state.sh)
    printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"session-state did not run: %s. Until then, the project state was not loaded."}}\n' "$why" ;;
esac
exit 0
