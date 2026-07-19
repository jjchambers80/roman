#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! "$1" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Usage: $0 <shopify-product-handle>" >&2
  exit 1
fi

root="$(git rev-parse --show-toplevel)"
product_dir="$root/assets/pdp-enhanced/products/$1"

mkdir -p \
  "$product_dir/source" \
  "$product_dir/references" \
  "$product_dir/drafts" \
  "$product_dir/final"

printf '%s\n' "$product_dir"
