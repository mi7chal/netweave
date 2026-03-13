#!/bin/bash
# Pre-release hook for cargo-release: update compose.yaml image tag to major.minor.
# CHANGELOG is generated in CI by orhun/git-cliff-action before release-pr runs.

set -euo pipefail
cd "${WORKSPACE_ROOT:-.}"

if [[ "${DRY_RUN:-false}" == "true" ]]; then
  echo "release-hook: DRY_RUN, skipping compose update"
  exit 0
fi

# compose.yaml: image tag = major.minor only (e.g. 0.1 for 0.1.2)
IMAGE_TAG=$(echo "$NEW_VERSION" | sed -E 's/^([0-9]+\.[0-9]+)\.[0-9]+/\1/')
sed -i.bak "s|image: mi7chal/netweave:[^[:space:]]*|image: mi7chal/netweave:${IMAGE_TAG}|" compose.yaml
rm -f compose.yaml.bak

echo "release-hook: compose.yaml updated for v${NEW_VERSION} (image tag: ${IMAGE_TAG})"
