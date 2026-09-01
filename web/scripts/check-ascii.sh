#!/usr/bin/env bash
# Fails if any source file under web/ (except exported data) contains non-ASCII characters.
set -euo pipefail

cd "$(dirname "$0")/.."

IN_SCOPE_REGEX='\.(ts|tsx|js|jsx|mjs|cjs|md|json|ya?ml|sh|css)$'
EXCLUDE_REGEX='(^|/)(node_modules|\.next|coverage|\.stryker-tmp|reports|data)(/|$)|(^|/)pnpm-lock\.yaml$'

collect_files() {
  if [[ $# -gt 0 ]]; then printf '%s\n' "$@"
  elif git rev-parse --git-dir >/dev/null 2>&1; then git ls-files
  else find . -type f ! -path '*/node_modules/*'
  fi
}

filter_in_scope() { grep -E "$IN_SCOPE_REGEX" | grep -Ev "$EXCLUDE_REGEX" || true; }

violations=0
while IFS= read -r file; do
  [[ -z "$file" || ! -f "$file" ]] && continue
  if matches=$(perl -ne 'print "$.: $_" if /[^\x00-\x7F]/' "$file") && [[ -n "$matches" ]]; then
    echo "$file:"; echo "$matches" | sed 's/^/  /'; echo
    violations=$((violations + 1))
  fi
done < <(collect_files "$@" | filter_in_scope)

if [[ $violations -gt 0 ]]; then
  echo "check-ascii: $violations file(s) contain non-ASCII characters" >&2
  exit 1
fi
echo "check-ascii: all files are pure ASCII"
