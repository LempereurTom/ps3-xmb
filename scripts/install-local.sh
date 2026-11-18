#!/usr/bin/env bash
set -euo pipefail
if [[ "$EUID" != 0 ]]; then echo 'Run using sudo bash install-local.sh'; exit 1; fi
deck_user="${SUDO_USER:?Run this through sudo from your normal Steam Deck account}"
deck_home="$(getent passwd "$deck_user" | cut -d: -f6)"
source_dir="$deck_home/.cache/ps3-xmb-install/ps3-xmb"
plugin_dir="$deck_home/homebrew/plugins"
test -d "$plugin_dir" || { echo 'Decky is not installed.'; exit 1; }
test -f "$source_dir/plugin.json"
test -f "$source_dir/dist/index.js"
python3 - "$source_dir" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1])
assert json.loads((p/'plugin.json').read_text())['name'] == 'PS3 XMB'
for file in p.rglob('*'):
    if file.is_symlink(): raise SystemExit('Unexpected symlink in plugin package')
PY
if [[ -e "$plugin_dir/ps3-xmb" ]]; then
  mkdir -p "$deck_home/homebrew/ps3-xmb-backups"
  mv "$plugin_dir/ps3-xmb" "$deck_home/homebrew/ps3-xmb-backups/ps3-xmb-$(date +%Y%m%d-%H%M%S)"
fi
cp -R "$source_dir" "$plugin_dir/ps3-xmb"
chown -R "$deck_user:$(id -gn "$deck_user")" "$plugin_dir/ps3-xmb"
touch "$deck_home/.cache/ps3-xmb-install/theme-ready"
chown "$deck_user:$(id -gn "$deck_user")" "$deck_home/.cache/ps3-xmb-install/theme-ready"
systemctl restart plugin_loader
echo 'PS3 XMB installed. Return to Gaming Mode and open Home.'
