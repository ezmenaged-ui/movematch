#!/usr/bin/env bash
# Installs the starter kit into a NEW project folder.
# Usage: bash starter-kit/install.sh /path/to/new-project
# In this (MoveMatch) repo the kit is stored inert: `claude/` and `CLAUDE.template.md`,
# so MoveMatch's own Claude sessions never load these agents, commands or hooks.
set -euo pipefail
KIT="$(cd "$(dirname "$0")" && pwd)"
SRC_REPO="$(cd "$KIT/.." && pwd)"
TARGET="${1:?Usage: install.sh /path/to/new-project}"
mkdir -p "$TARGET"
TARGET="$(cd "$TARGET" && pwd)"
if [ "$TARGET" = "$SRC_REPO" ] || [ -f "$TARGET/lib/waFunnel.ts" ]; then
  echo "Refusing: $TARGET looks like the MoveMatch repo. Install into a new project folder." >&2; exit 1
fi
for f in .claude/agents .claude/commands .claude/hooks .claude/settings.json CLAUDE.md docs/PLAYBOOK.md; do
  if [ -e "$TARGET/$f" ]; then echo "Refusing: $TARGET/$f already exists (nothing was copied)." >&2; exit 1; fi
done
mkdir -p "$TARGET/.claude" "$TARGET/docs"
cp -R "$KIT/claude/." "$TARGET/.claude/"
cp "$KIT/CLAUDE.template.md" "$TARGET/CLAUDE.md"
cp -R "$KIT/docs/." "$TARGET/docs/"
cp "$SRC_REPO/Leads-for-Services-Playbook-MoveMatch.md" "$TARGET/docs/PLAYBOOK.md"
echo "Installed into $TARGET:"
echo "  .claude/ (agents, commands, hooks, settings, autonomy.json), CLAUDE.md, docs/PLAYBOOK.md, docs/OWNER-PREFLIGHT.md, docs/briefs/, docs/autopilot/"
echo "Next: fill in the placeholders in CLAUDE.md, then run /kickoff <idea> in Claude Code."
