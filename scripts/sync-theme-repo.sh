#!/bin/sh
# Publishes desktop-theme/PS3-XMB to LempereurTom/ps3-xmb-theme (the repository steambrew.app
# installs and updates from). Run after committing theme changes here.
set -e
cd "$(dirname "$0")/.."
git subtree split -P desktop-theme/PS3-XMB -b theme-split
git push https://github.com/LempereurTom/ps3-xmb-theme.git theme-split:main
