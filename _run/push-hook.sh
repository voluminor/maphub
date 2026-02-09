#!/bin/bash
echo "[HOOK]" "Push"

run_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script_dir="$run_dir/scripts"

NAME="$(bash "$script_dir/git.sh" -b 2>/dev/null || true)"
PREID="$(printf '%s' "${NAME:-}" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^0-9a-z-]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g' | cut -c1-24)"
[ -n "$PREID" ] || PREID="build"
#############################################################################

npm version prerelease --preid="$PREID" --no-git-tag-version

#############################################################################
exit 0
