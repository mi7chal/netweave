#!/usr/bin/env bash
# bump-version.sh — bumps version in Cargo.toml, web/package.json and CHANGELOG.md
# Usage: ./scripts/bump-version.sh <new-version>
# Example: ./scripts/bump-version.sh 0.2.0

set -euo pipefail

# ── helpers ──────────────────────────────────────────────────────────────────

red()   { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

# ── args ──────────────────────────────────────────────────────────────────────

NEW_VERSION="${1:-}"

if [[ -z "$NEW_VERSION" ]]; then
  red "Usage: $0 <new-version>"
  echo "Example: $0 0.2.0"
  exit 1
fi

# Strip leading 'v' if present (accept both "0.2.0" and "v0.2.0")
NEW_VERSION="${NEW_VERSION#v}"

# Validate semver format (MAJOR.MINOR.PATCH or MAJOR.MINOR.PATCH-pre.release)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  red "ERROR: Invalid version format '$NEW_VERSION'."
  echo "Expected: MAJOR.MINOR.PATCH  (e.g. 0.2.0 or 1.0.0-beta.1)"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── current version ───────────────────────────────────────────────────────────

CURRENT_VERSION=$(grep -E '^version = "[0-9]+\.[0-9]+\.[0-9]+"' "$ROOT_DIR/Cargo.toml" | head -1 | sed 's/version = "\(.*\)"/\1/')

bold "Bumping $CURRENT_VERSION → $NEW_VERSION"
echo ""

# ── 1. Cargo.toml ─────────────────────────────────────────────────────────────

perl -i -pe \
  'BEGIN{$done=0} if (!$done && /^version = "\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?"/) {
     s/version = "\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?"/version = "'"$NEW_VERSION"'"/;
     $done=1
   }' \
  "$ROOT_DIR/Cargo.toml"

echo "  ✓ Cargo.toml"

# ── 2. web/package.json ───────────────────────────────────────────────────────

perl -i -pe \
  's/"version":\s*"[^"]*"/"version": "'"$NEW_VERSION"'"/' \
  "$ROOT_DIR/web/package.json"

echo "  ✓ web/package.json"

# ── 3. CHANGELOG.md ──────────────────────────────────────────────────────────

DATE=$(date +%Y-%m-%d)

if grep -q "## \[Unreleased\]" "$ROOT_DIR/CHANGELOG.md"; then
  # Insert new version heading right after [Unreleased], so the content
  # that was in [Unreleased] now belongs to the new release section.
  perl -i -pe \
    "s/## \[Unreleased\]/## [Unreleased]\n\n## [$NEW_VERSION] - $DATE/" \
    "$ROOT_DIR/CHANGELOG.md"
  echo "  ✓ CHANGELOG.md  ([$NEW_VERSION] section created)"
else
  echo "  ! CHANGELOG.md: no [Unreleased] section found — skipped"
  echo "    Add '## [Unreleased]' above '## [$CURRENT_VERSION]' and re-run."
fi

# ── summary ───────────────────────────────────────────────────────────────────

echo ""
green "Done! Version bumped to v$NEW_VERSION"
echo ""
bold "Next steps:"
echo "  1. Review CHANGELOG.md — fill/tidy the [$NEW_VERSION] section"
echo "  2. git add Cargo.toml web/package.json CHANGELOG.md"
echo "  3. git commit -m 'chore: release v$NEW_VERSION'"
echo "  4. git tag v$NEW_VERSION"
echo "  5. git push origin main --tags"
echo ""
echo "  GitHub Actions will then:"
echo "    • run CI checks (version consistency + tests)"
echo "    • build & push multi-arch Docker image  (mi7chal/netweave:$NEW_VERSION)"
echo "    • create a GitHub Release from the changelog"
