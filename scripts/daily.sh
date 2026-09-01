#!/usr/bin/env bash
# Export today's stats and deploy the site to Vercel. Nothing personal is committed to git.
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
uv run export.py
(cd web && vercel deploy --prod --yes)
