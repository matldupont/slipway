#!/bin/sh
# Hook guard (#126, #145). Every hook in settings.json runs this file as the session's pinned commit holds it, never
# the working tree's copy and never the live origin/HEAD, so neither a branch nor a moved ref can change it:
#   sh -c "$(git -C "$CLAUDE_PROJECT_DIR" --no-replace-objects cat-file blob <pin>:process/harness/hooks/base-guard.sh)" base-guard <hook>
# The pin (#145) is origin/HEAD's commit as the session's first SessionStart found it, kept outside the repository in
# ~/.claude/slipway/sessions/<session id>/base. It is written once, never on a compaction or a resume, and a session
# with none runs no hook. No command writes it but this file's SessionStart path.
# It runs the working tree's <hook> only when the checkout's gate files are the pinned commit's, or the owner's own
# message has said yes to exactly these gate files (below). Otherwise that hook does not run: the Stop hook blocks
# once to say so, SessionStart says so, the advisory hooks stay quiet.
# Gate files: the base's own ask-level edit globs (settings.json, #133) but its owner-only prose and tooling, every
# package.json, everything under a .claude folder but its skills (#173), .gitmodules and .gitattributes, matched
# ignoring case, and each gate folder itself (`node_modules`, `.claude`), so a link in its place counts (#148).
# A changed or untracked name git has to quote (non-ASCII, a quote, a control character) counts too: a Mac disk
# may open `node_moduleſ` as `node_modules`. So does a symlink or a submodule link added, removed or changed at
# any path: the folder it stands for may hold gate files no pattern can name.
# File names are only ever read from git's output, never passed back to git as pathspecs.
# The yes (#145): the UserPromptSubmit hook runs this file as `trust-gates`, which runs no working-tree script. Only
# when the owner's whole message is the phrase `trust gates` does it write the fingerprint of the changed gate files
# to the session's `yes` file: the pinned commit, then each file's name, kind (file, executable, deleted) and content
# hash. The hooks run again in that session while the fingerprint is the same. A quoted name, a symlink, a submodule
# link or a folder where a gate file goes is never covered by a yes.
# A prompt the session arranges for itself reaches UserPromptSubmit as a typed one does (#213), and nothing here can
# tell them apart. So the refusal is not in this file (#222): a PreToolUse command in settings.json, which needs no
# pin, denies a scheduling, messaging, terminal or typing tool call that carries the phrase as a whole value.
# POSIX sh with git, sed, grep, sort, head, tr, cat, rm, mkdir and printf: hooks run under /bin/sh without your PATH (L-34).

set -f # the globs below are git's, never the shell's
hook=$1
d=${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}
g() { git -C "$d" --no-replace-objects -c core.quotepath=on "$@"; }

# Broken state: the Stop and SessionStart hooks say so where the owner sees it; the advisory hooks stay quiet.
fail() {
  case "$hook" in
    stop-verify.sh|session-state.sh) printf '{"systemMessage":"base-guard: %s, so no hook ran."}\n' "$1" ;;
    trust-gates) printf '{"systemMessage":"base-guard: %s, so no yes was recorded."}\n' "$1" ;;
  esac
  exit 0
}

input=
case "$hook" in
  stop-verify.sh|intake-reminder.sh|lessons-first.sh|absence-search.sh) ;;
  session-state.sh) input=$(cat) ;;
  trust-gates)
    # The owner's message, and nothing else, says yes. A quote inside a JSON string is always \", so `"prompt":` after
    # `{` or `,` is the real member, and its whole value must be the phrase: no string is parsed. Each of the two
    # members is there once, so one nested in another object is not taken for the message's own. Checked before any
    # git work; anything else (another event, a subagent, a longer message, pasted or relayed text) ends here.
    input=$(tr -d '\n\r')
    m() { printf '%s' "$input" | LC_ALL=C grep -Eq$2 "$1"; }
    once() { [ "$(printf '%s' "$input" | LC_ALL=C grep -Eo "(^|[{,])[[:space:]]*\"$1\"[[:space:]]*:" | sed -n '$=')" = 1 ]; }
    once hook_event_name && once prompt || exit 0
    m '(^|[{,])[[:space:]]*"hook_event_name"[[:space:]]*:[[:space:]]*"UserPromptSubmit"[[:space:]]*([,}]|$)' || exit 0
    m '(^|[{,])[[:space:]]*"agent_id"[[:space:]]*:' && exit 0
    m '(^|[{,])[[:space:]]*"prompt"[[:space:]]*:[[:space:]]*"(\\[nrt]| )*trust gates(\\[nrt]| )*"[[:space:]]*([,}]|$)' i || exit 0 ;;
  *) hook=stop-verify.sh; fail 'unknown hook' ;;
esac

# The session's pin. The id is Claude Code's own, from the hook's environment; one that could leave the folder is none.
sid=$CLAUDE_CODE_SESSION_ID
case "$sid" in ''|*[!A-Za-z0-9_-]*) sid= ;; esac
[ "${#sid}" -le 64 ] || sid=
[ -n "$sid" ] && [ -n "$HOME" ] || fail 'no session id (CLAUDE_CODE_SESSION_ID) or no HOME'
state=$HOME/.claude/slipway/sessions/$sid
if [ "$hook" = session-state.sh ] && [ ! -e "$state/base" ] && [ ! -L "$state/base" ]; then
  # Only a session with a new id pins (startup, /clear, a fork): a compaction or a resume keeps its id, and is one
  # the agent may have acted in, or can start.
  case "$input" in
    *'"source":"startup"'*|*'"source": "startup"'*|*'"source":"clear"'*|*'"source": "clear"'*|*'"source":"fork"'*|*'"source": "fork"'*)
      base=$(g rev-parse -q --verify 'refs/remotes/origin/HEAD^{commit}') || fail 'no origin/HEAD (git remote set-head origin --auto)'
      (umask 077 && mkdir -p "$state" && set -C && printf '%s\n' "$base" >"$state/base") 2>/dev/null || fail 'the base could not be pinned for this session' ;;
  esac
fi
base=
[ -f "$state/base" ] && [ ! -L "$state/base" ] && IFS= read -r base <"$state/base"
case "$base" in *[!0-9a-f]*) base= ;; esac
case "${#base}" in 40|64) ;; *) base= ;; esac
[ -n "$base" ] && g cat-file -e "$base^{commit}" 2>/dev/null || fail 'no base is pinned for this session (start a new session)'

# The working tree's hook, with the input this file read put back.
run() {
  case "$hook" in
    session-state.sh) printf '%s' "$input" | sh "$d/process/harness/hooks/$hook"; exit ;;
    stop-verify.sh|intake-reminder.sh|lessons-first.sh|absence-search.sh) exec sh "$d/process/harness/hooks/$hook" ;;
  esac
  exit 0
}

# The gate paths as pathspecs, from the base's settings (one list); a rule outside the repository (/tmp, ~/) is skipped.
globs=$(g cat-file blob "$base:process/harness/settings.json" | sed -n 's/^[[:space:]]*"Edit(\([^/~][^)]*\))",\{0,1\}[[:space:]]*$/\1/p')
[ -n "$globs" ] || fail 'no gate paths in the pinned process/harness/settings.json'
set --
for glob in $globs '**/package.json' '**/.gitmodules' '**/.gitattributes'; do
  # Owner-only files that don't change what a gate runs (#163): prose (.md) and slipway's own sync tooling. The harness
  # asks before an edit to each, but owner-only and gate code are two lists, and this guard needs only the second.
  # The base's `**/.claude/**` rule is owner-only too: the guard's own .claude list, below, decides that folder.
  case "$glob" in *.md|'**/dev/ownership.yaml'|'**/scripts/new-project.mjs'|'**/.claude/**') continue ;; esac
  set -- "$@" ":(glob,icase)$glob"
  case "$glob" in */'**') set -- "$@" ":(glob,icase)${glob%/\*\*}" ;; esac # the folder itself: a link in its place
done

# Tracked files against the pinned base through the real index (an ignored file the branch tracks included), then
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
changed=$(printf '%s\n%s\n' "$changed" "$links" | sed '/^$/d' | grep -v '^"' | LC_ALL=C sort -u)
others=$(g ls-files -o --exclude-standard) || fail 'git ls-files failed'
odd=$(printf '%s\n%s\n' "$all" "$others" | grep '^"' | sort -u)
if [ -z "$changed" ] && [ -z "$odd" ]; then
  [ "$hook" = trust-gates ] && fail 'no gate file differs from the base pinned for this session'
  run
fi

# A file name is the branch's text: an octal escape becomes #NNN, and only these characters reach the message.
# Five names at most, then how many more, so a list padded with harmless names still says it is longer.
names() {
  printf '%s\n' "$1" | head -n 5 | sed 's/\\\([0-7][0-7][0-7]\)/#\1/g; s/[^A-Za-z0-9._/@+#-]/?/g' | tr '\n' ' '
  n=$(printf '%s\n' "$1" | sed -n '$=')
  [ "$n" -gt 5 ] && printf 'and %s more ' $((n - 5))
}

# The fingerprint a yes covers (#145): the pinned base, then every changed gate file by name, kind and content. Each
# name is looked at as a path on disk and hashed by git as a path (--stdin-paths), never as a pathspec or an option.
# What a hash cannot pin gets no fingerprint, so no yes: a quoted name, a link (its target is outside the list), a
# folder or a nested repository where a file goes.
never= fp= kinds=
if [ -n "$odd" ]; then never='a name git has to quote'
elif [ -n "$links" ]; then never='a symlink or a submodule link'
else
  kinds=$(printf '%s\n' "$changed" | while IFS= read -r n; do
    p=$d/$n
    if [ -L "$p" ]; then printf '!\n'
    elif [ -f "$p" ]; then if [ -x "$p" ]; then printf 'X %s\n' "$n"; else printf 'F %s\n' "$n"; fi
    elif [ -e "$p" ]; then printf '!\n'
    else printf 'D %s\n' "$n"; fi
  done)
  if printf '%s\n' "$kinds" | grep -qx '!'; then never='a link or a folder where a gate file goes'
  else
    hashes=$(printf '%s\n' "$kinds" | sed -n 's/^[FX] //p' | g hash-object --no-filters --stdin-paths 2>/dev/null) &&
      fp=$(printf 'slipway-gates 1\nbase %s\n%s\n%s\n' "$base" "$kinds" "$hashes" | g hash-object --no-filters --stdin 2>/dev/null)
    case "$fp" in *[!0-9a-f]*) fp= ;; esac
    case "${#fp}" in 40|64) ;; *) fp= ;; esac
  fi
fi

if [ "$hook" = trust-gates ]; then
  [ -z "$never" ] || fail "a yes cannot cover $never ($(names "$(printf '%s\n%s\n' "$changed" "$odd" | sed '/^$/d')")): those keep the hooks off until they are merged"
  [ -n "$fp" ] || fail 'the gate files could not be read'
  # A new file each time, never written through a link put where the record goes.
  (umask 077 && rm -f "$state/yes" && set -C && printf '%s\n' "$fp" >"$state/yes") 2>/dev/null || fail 'the yes could not be written'
  n=$(printf '%s\n' "$changed" | sed -n '$=')
  printf '{"systemMessage":"base-guard: your yes is recorded for %s gate file(s): %s. The hooks run again in this session until one of them changes.","hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"base-guard: the owner said yes to the gate files this checkout changes (%s). The hooks run again in this session; any further change to a gate file needs a new yes."}}\n' "$n" "$(names "$changed")" "$(names "$changed")"
  exit 0
fi
yes=
[ -n "$fp" ] && [ -f "$state/yes" ] && [ ! -L "$state/yes" ] && IFS= read -r yes <"$state/yes"
[ -n "$fp" ] && [ "$yes" = "$fp" ] && run

why="this checkout changes gate files against the base pinned at session start, so their code has not run"
[ -n "$changed" ] && why="$why. Gate files: $(names "$changed")"
[ -n "$odd" ] && why="$why. Non-ASCII names; on a Mac one may stand in for a gate path like node_modules/: $(names "$odd")"
if [ -n "$never" ]; then
  why="$why. Ask the owner about them; no yes can cover $never, so once they say yes, run pnpm verify:fast yourself and report its result"
else
  why="$why. Ask the owner about them; to say yes the owner sends trust gates as a whole message, and the hooks run again in this session. You cannot record it. A session started after they are merged pins the new base"
fi
case "$hook" in
  stop-verify.sh)
    input=$(cat)
    case "$input" in *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;; esac
    printf '{"decision":"block","reason":"stop-verify did not run: %s. Until then, say plainly that the gate did not run."}\n' "$why" ;;
  session-state.sh)
    printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"session-state did not run: %s."}}\n' "$why" ;;
esac
exit 0
