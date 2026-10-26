#!/bin/bash
# Builds the ui-server image, a drop-in replacement for the legacy arcusweb
# image of the same name, and optionally pushes it. (The static-server image
# still comes from legacy arcusweb; see PRD.md §26.)
#
#   docker/bin/build.sh
#   REGISTRY_NAME=us-west1-docker.pkg.dev/<project>/<repo> docker/bin/build.sh --push
#
# The image is named arcus/ui-server (override the prefix with DOCKER_PREFIX)
# and tagged latest plus <package.json version>-<short sha> (override with
# VERSION). To build for another architecture, set
# DOCKER_DEFAULT_PLATFORM=linux/amd64.

set -euo pipefail

ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
PREFIX=${DOCKER_PREFIX:-arcus}
VERSION=${VERSION:-$(node -p "require('$ROOT/package.json').version")-$(git -C "$ROOT" rev-parse --short=7 HEAD)}

PUSH=false
case "${1:-}" in
  --push) PUSH=true ;;
  "") ;;
  *) echo "usage: $0 [--push]" >&2; exit 2 ;;
esac
if $PUSH && [ -z "${REGISTRY_NAME:-}" ]; then
  echo "REGISTRY_NAME must be set to the registry to push to" >&2
  exit 1
fi

docker build -t "$PREFIX/ui-server:$VERSION" -t "$PREFIX/ui-server:latest" \
  -f "$ROOT/docker/ui-server/Dockerfile" "$ROOT"

if $PUSH; then
  for tag in "$VERSION" latest; do
    docker tag "$PREFIX/ui-server:$tag" "$REGISTRY_NAME/$PREFIX/ui-server:$tag"
    docker push "$REGISTRY_NAME/$PREFIX/ui-server:$tag"
  done
fi

echo "Built $PREFIX/ui-server:$VERSION"
