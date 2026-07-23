#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
submodule_dir="$repo_root/third-party/aoe2techtree"
public_dir="$repo_root/public/aoe2techtree"

if [[ ! -d "$submodule_dir" ]]; then
  echo "Submodule directory not found: $submodule_dir" >&2
  exit 1
fi

# Update the submodule to the latest commit on its tracked branch.
git -C "$repo_root" submodule update --init --remote --merge third-party/aoe2techtree

source_locales_dir="$submodule_dir/data/locales"
source_data_file="$submodule_dir/data/data.json"
target_data_dir="$public_dir/data"
target_locales_dir="$target_data_dir/locales"
target_data_file="$target_data_dir/data.json"

if [[ ! -d "$source_locales_dir" ]]; then
  echo "Locales directory not found: $source_locales_dir" >&2
  exit 1
fi

if [[ ! -f "$source_data_file" ]]; then
  echo "Data file not found: $source_data_file" >&2
  exit 1
fi

mkdir -p "$target_data_dir"

# Mirror the locales directory and replace the backend data file.
rm -rf "$target_locales_dir"
cp -R "$source_locales_dir" "$target_locales_dir"
cp -f "$source_data_file" "$target_data_file"

echo "Updated third-party/aoe2techtree and refreshed public/aoe2techtree/data"
