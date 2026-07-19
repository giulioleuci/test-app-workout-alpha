#!/usr/bin/env bash
set -euo pipefail

REPO_SLUG="giulioleuci/test-app-workout-alpha"
REPO_URL="https://github.com/${REPO_SLUG}.git"
DEFAULT_BRANCH="main"
WORKSPACE_DIR="${1:-$(pwd)}"
COMMIT_MESSAGE="chore: publish local workspace changes"

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$1"
}

fail() {
  printf '\n[ERROR] %s\n' "$1" >&2
  exit 1
}

log "Starting push workflow for ${REPO_SLUG}"

if ! command -v gh >/dev/null 2>&1; then
  fail "GitHub CLI (gh) is required but not installed"
fi

gh auth status >/dev/null 2>&1 || fail "GitHub CLI is not authenticated. Run 'gh auth login' first."

cd "$WORKSPACE_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "Initializing a new Git repository in ${WORKSPACE_DIR}"
  git init -b "$DEFAULT_BRANCH"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  log "Adding origin remote to ${REPO_URL}"
  git remote add origin "$REPO_URL"
fi

git remote set-url origin "$REPO_URL"

if ! git config user.name >/dev/null; then
  git config user.name "giulioleuci"
fi

if ! git config user.email >/dev/null; then
  git config user.email "giulioleuci@users.noreply.github.com"
fi

if ! git show-ref --verify --quiet "refs/heads/${DEFAULT_BRANCH}"; then
  log "Creating the ${DEFAULT_BRANCH} branch"
  git branch -M "$DEFAULT_BRANCH"
fi

log "Checking whether the GitHub repository already exists"
if ! gh repo view "$REPO_SLUG" >/dev/null 2>&1; then
  log "Repository does not exist yet; creating it with gh"
  gh repo create "$REPO_SLUG" --public --source=. --remote=origin --push || true
fi

STATUS_OUTPUT="$(git status --porcelain)"
if [[ -n "$STATUS_OUTPUT" ]]; then
  log "Staging all local code changes"
  git add -A

  log "Creating a commit"
  if ! git commit -m "$COMMIT_MESSAGE"; then
    log "No committed changes were needed; continuing with push"
  fi
else
  log "No working tree changes detected"
fi

log "Pushing ${DEFAULT_BRANCH} to origin with gh-backed Git authentication"

git push --set-upstream origin "$DEFAULT_BRANCH"

log "Opening the repository in the browser"
gh browse --repo "$REPO_SLUG"

log "Push workflow completed successfully"
