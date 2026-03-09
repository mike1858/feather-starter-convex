#!/usr/bin/env bash
set -euo pipefail

PLUGIN_PREFIX="plugin/"

usage() {
  echo "Usage: plugin.sh {list|preview|install} [branch]"
  echo ""
  echo "Commands:"
  echo "  list              List all remote plugin branches"
  echo "  preview <branch>  Show diff stat of branch vs main"
  echo "  install <branch>  Merge the plugin branch into current branch"
  echo ""
  echo "Examples:"
  echo "  plugin.sh list"
  echo "  plugin.sh preview plugin/ui-command-palette"
  echo "  plugin.sh install plugin/feature-admin-panel"
}

# Ensure we have latest remote info
fetch_remotes() {
  git fetch --prune --quiet 2>/dev/null || true
}

case "${1:-}" in
  list)
    fetch_remotes
    branches=$(git branch -r | grep "origin/${PLUGIN_PREFIX}" | sed "s|origin/||" | sed 's/^[[:space:]]*//' | sort)
    if [ -z "$branches" ]; then
      echo "No plugin branches found."
      exit 0
    fi
    echo "Available plugin branches:"
    echo "$branches" | while read -r branch; do
      echo "  $branch"
    done
    ;;
  preview)
    if [ -z "${2:-}" ]; then
      echo "Error: branch name required."
      echo "Usage: plugin.sh preview <branch>"
      exit 1
    fi
    fetch_remotes
    if ! git rev-parse --verify "origin/${2}" >/dev/null 2>&1; then
      echo "Error: branch '${2}' not found on remote."
      exit 1
    fi
    echo "Changes in ${2} vs main:"
    echo ""
    git diff main..."origin/${2}" --stat
    ;;
  install)
    if [ -z "${2:-}" ]; then
      echo "Error: branch name required."
      echo "Usage: plugin.sh install <branch>"
      exit 1
    fi
    fetch_remotes
    if ! git rev-parse --verify "origin/${2}" >/dev/null 2>&1; then
      echo "Error: branch '${2}' not found on remote."
      exit 1
    fi
    echo "Installing plugin: ${2}..."
    git merge "origin/${2}" --no-edit
    echo "Plugin '${2}' installed successfully."
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac
