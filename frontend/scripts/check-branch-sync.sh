#!/bin/sh
set -eu

repo_root=$(git rev-parse --show-toplevel)
current_branch=$(git -C "$repo_root" symbolic-ref --quiet --short HEAD || git -C "$repo_root" rev-parse --short HEAD)
remotes=$(git -C "$repo_root" remote)

if [ -z "$remotes" ]; then
  echo "Build blocked: no Git remote is configured; cannot check branch updates." >&2
  exit 1
fi

echo "Checking latest updates on all remote branches…"
for remote in $remotes; do
  # Explicitly fetch every branch even when the checkout uses a single-branch refspec.
  # Complete shallow history so ancestry checks also work in CI and detached checkouts.
  if [ "$(git -C "$repo_root" rev-parse --is-shallow-repository)" = true ]; then
    if ! git -C "$repo_root" fetch --unshallow --prune "$remote" "+refs/heads/*:refs/remotes/$remote/*"; then
      echo "Build blocked: could not fetch complete branch history from $remote." >&2
      exit 1
    fi
  elif ! git -C "$repo_root" fetch --prune "$remote" "+refs/heads/*:refs/remotes/$remote/*"; then
    echo "Build blocked: could not check updates from $remote. Check your connection and Git credentials." >&2
    exit 1
  fi
done

pending=""
for branch in $(git -C "$repo_root" for-each-ref refs/heads refs/remotes --format='%(refname)'); do
  # Ignore symbolic aliases such as origin/HEAD, not actual branches.
  if git -C "$repo_root" symbolic-ref --quiet "$branch" >/dev/null; then
    continue
  fi
  commits=$(git -C "$repo_root" rev-list --count "HEAD..$branch")
  if [ "$commits" -gt 0 ]; then
    name=${branch#refs/heads/}
    name=${name#refs/remotes/}
    pending="$pending
  $name: $commits commit(s)"
  fi
done

if [ -n "$pending" ]; then
  printf 'Build blocked: %s is missing commits from:%s\n' "$current_branch" "$pending" >&2
  echo "Merge or rebase those updates, then rerun npm run build." >&2
  exit 1
fi

echo "Branch check passed: $current_branch contains all fetched remote branch commits."
