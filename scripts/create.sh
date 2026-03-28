#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/siraj-samsudeen/feather-starter-convex.git"

if [ $# -lt 1 ]; then
  echo "Usage: bash <(curl -s ...) <project-name>"
  echo ""
  echo "Creates a new project from the Feather Starter template."
  exit 1
fi

PROJECT_DIR="$1"

if [ -d "$PROJECT_DIR" ]; then
  echo "Error: Directory '$PROJECT_DIR' already exists."
  exit 1
fi

echo ""
echo "Creating project '$PROJECT_DIR' from Feather Starter..."
echo ""

# Clone and set up upstream for future updates
git clone "$REPO_URL" "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Set up upstream remote for receiving updates
git remote rename origin upstream
echo "Upstream remote set — pull updates with: git pull upstream main"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Run interactive setup
echo ""
npm run setup

echo ""
echo "────────────────────────────────────────"
echo ""
echo "  Next steps:"
echo ""
echo "    cd $PROJECT_DIR"
echo "    npm start"
echo ""
echo "  To receive bug fixes and updates:"
echo "    git pull upstream main"
echo ""
echo "────────────────────────────────────────"
echo ""
