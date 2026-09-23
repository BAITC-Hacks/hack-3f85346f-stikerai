#!/bin/sh
set -eu

repo_root=$(git rev-parse --show-toplevel)
current_branch=$(git -C "$repo_root" branch --show-current)

if [ -z "$current_branch" ]; then
  echo "Branch check skipped: detached HEAD." >&2
  exit 0
fi

git -C "$repo_root" fetch --all --prune >/dev/null

pending=""
for branch in $(git -C "$repo_root" for-each-ref refs/heads refs/remotes --format='%(refname:short)' | grep -v '/HEAD$' || true); do
  commits=$(git -C "$repo_root" rev-list --count "HEAD..$branch")
  if [ "$commits" -gt 0 ]; then
    pending="$pending\n  $branch: $commits commit(s)"
  fi
done

if [ -n "$pending" ]; then
  printf 'Rebuild blocked: current branch %s is missing commits from:%b\n' "$current_branch" "$pending" >&2
  echo "Merge or rebase those updates, then rerun npm run build." >&2
  exit 1
fi

echo "Branch check passed: $current_branch contains all fetched remote branch commits."
