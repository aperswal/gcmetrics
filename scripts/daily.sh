#!/usr/bin/env bash
# Export today's stats and deploy the site to Vercel. Nothing personal is committed to git.
# The Python binary is called directly, not through `uv run`: macOS only honors the Full Disk
# Access grant on the binary that opens the file, and uv in between breaks that attribution.
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
source scripts/env.sh
echo "== $(date) =="
if [[ -f web/.env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source web/.env.local
  set +a
fi
python="$(uv python find --script export.py)"
python="$(readlink -f "$python")"
"$python" export.py
(cd web && vercel deploy --prod --yes)
