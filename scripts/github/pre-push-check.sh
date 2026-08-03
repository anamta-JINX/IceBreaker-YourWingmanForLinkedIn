#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

private_files=("config/.env" "src/backend/config/official-api-keys.js")
for file in "${private_files[@]}"; do
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    echo "ERROR: private file is tracked: $file"
    exit 1
  fi
done

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git grep -nE '(gsk_[A-Za-z0-9_-]{20,}|sk-or-v1-[A-Za-z0-9_-]{20,})' -- ':!*.md' ':!*.example.*' ':!config/.env.example'; then
    echo "ERROR: likely API key found in tracked files."
    exit 1
  fi
fi

if [[ ! -f src/backend/config/official-api-keys.js ]]; then
  cp src/backend/config/official-api-keys.example.js src/backend/config/official-api-keys.js
  cleanup_placeholder=1
else
  cleanup_placeholder=0
fi
node scripts/github/validate-extension.mjs
if [[ "$cleanup_placeholder" == "1" ]]; then rm -f src/backend/config/official-api-keys.js; fi

while IFS= read -r -d '' file; do node --check "$file" >/dev/null; done < <(find src scripts -type f \( -name '*.js' -o -name '*.mjs' \) -print0)
echo "IceBreaker pre-push checks passed."
