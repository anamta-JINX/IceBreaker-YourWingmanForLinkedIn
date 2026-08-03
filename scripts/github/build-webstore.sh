#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
version="$(node -p "JSON.parse(require('fs').readFileSync('manifest.json','utf8')).version")"
work="build/webstore/IceBreaker"
out="release/IceBreaker-v${version}-WebStore.zip"
out_abs="$PWD/$out"
rm -rf build/webstore
mkdir -p "$work/src/backend/config" release
cp manifest.json "$work/"
cp -R assets "$work/"
cp -R src/backend src/frontend "$work/src/"
cp src/backend/config/official-api-keys.example.js "$work/src/backend/config/official-api-keys.js"
(
  cd "$work"
  zip -qr "$out_abs" .
)
echo "Created $out"
