#!/usr/bin/env bash
# Install a launchd job that runs scripts/daily.sh every day at 06:00 for this checkout.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
label="com.gcmetrics.daily"
plist="$HOME/Library/LaunchAgents/$label.plist"
log="$HOME/Library/Logs/gcmetrics.log"

# shellcheck disable=SC1091
source "$repo/scripts/env.sh"
for tool in uv vercel node git; do
  command -v "$tool" >/dev/null || { echo "$tool not found on the PATH daily.sh uses ($PATH)" >&2; exit 1; }
done
[[ -f "$repo/config.toml" ]] || { echo "config.toml is missing; copy config.example.toml and fill it in" >&2; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$repo/scripts/daily.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>6</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>$log</string>
  <key>StandardErrorPath</key>
  <string>$log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "Installed $label. Runs $repo/scripts/daily.sh daily at 06:00. Log: $log"
echo "launchd runs the job as /bin/bash, so grant Full Disk Access to /bin/bash:"
echo "  System Settings > Privacy & Security > Full Disk Access > + > Cmd+Shift+G > /bin/bash"
echo "Re-run this script after moving the folder. Remove the job with scripts/uninstall-daily.sh."
