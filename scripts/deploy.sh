#!/usr/bin/env bash
set -euo pipefail
target="${1:?Usage: scripts/deploy.sh deck@STEAM_DECK_IP}"
if [[ ! "$target" =~ ^[a-zA-Z0-9_-]+@[a-zA-Z0-9._-]+$ ]]; then echo 'Invalid SSH target' >&2; exit 2; fi
root="$(cd "$(dirname "$0")/.." && pwd)"
package="$root/release/ps3-xmb"
test -f "$package/dist/index.js" || { echo 'Run npm run build first.' >&2; exit 1; }
ssh "$target" 'test "$(uname -s)" = Linux && test -d "$HOME/homebrew/plugins" && test -w "$HOME/homebrew/plugins"' || {
  echo 'Install Decky first and verify SSH access and plugin directory permissions.' >&2; exit 1;
}
staging="$(ssh "$target" 'mktemp -d "$HOME/.cache/ps3-xmb-stage.XXXXXX"')"
if [[ ! "$staging" =~ ^/home/[a-zA-Z0-9_-]+/.cache/ps3-xmb-stage.[a-zA-Z0-9]+$ ]]; then echo 'Unexpected staging path' >&2; exit 1; fi
scp -r "$package/" "$target:$staging/"
ssh "$target" bash -s -- "$staging" <<'REMOTE'
set -euo pipefail
staging="$1"
destination="$HOME/homebrew/plugins/ps3-xmb"
if [[ -e "$destination" ]]; then
  mkdir -p "$HOME/homebrew/ps3-xmb-backups"
  mv "$destination" "$HOME/homebrew/ps3-xmb-backups/ps3-xmb-$(date +%Y%m%d-%H%M%S)"
fi
mv "$staging/ps3-xmb" "$destination"
rmdir "$staging"
REMOTE
ssh -t "$target" 'sudo systemctl restart plugin_loader'
echo 'PS3 XMB installed. Return to Gaming Mode and open Home.'
