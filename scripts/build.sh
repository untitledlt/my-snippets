#!/usr/bin/env bash
# Packages the extension's shippable files into dist/chrome-filler-<version>.zip
# for upload to the Chrome Web Store Developer Dashboard.
set -euo pipefail

cd "$(dirname "$0")/.."

version=$(node -p "require('./manifest.json').version")
out_dir="dist"
out_zip="$out_dir/chrome-filler-$version.zip"

files=(
  manifest.json
  background.js
  content.js
  options.html
  options.js
  storage.js
  tree.js
  icons
)

mkdir -p "$out_dir"
rm -f "$out_zip"
zip -r -X "$out_zip" "${files[@]}"

echo "Built $out_zip"
