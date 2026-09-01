#!/usr/bin/env bash
# Remove the daily launchd job installed by install-daily.sh.
set -euo pipefail

label="com.gcmetrics.daily"
plist="$HOME/Library/LaunchAgents/$label.plist"

launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
rm -f "$plist"
echo "Removed $label."
