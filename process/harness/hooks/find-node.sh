# Sourced, not run. Hooks execute under /bin/sh with none of your shell configuration, so
# node and pnpm are usually not on PATH (L-34). Add the common install locations, then let
# the caller check `command -v node` and say so out loud when it is still missing.
PATH="$PATH:/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$HOME/.local/share/pnpm:$HOME/Library/pnpm"
[ -d "$HOME/.local/share/fnm/aliases/default/bin" ] && PATH="$HOME/.local/share/fnm/aliases/default/bin:$PATH"
# nvm: prepend each installed version in sort order, so the newest ends up first.
for d in "$HOME"/.nvm/versions/node/*/bin; do
  [ -d "$d" ] && PATH="$d:$PATH"
done
export PATH
