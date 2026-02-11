#!/bin/bash
echo "[HOOK]" "Commit"

run_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script_dir="$run_dir/scripts"

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

VERSION=$(node -p "require('./package.json').version")
NAME=$(bash "$script_dir/git.sh" -b)

echo -e "$NAME [$VERSION] \n" $(cat "$1") > "$1"
#############################################################################

npm test

#############################################################################
exit 0

