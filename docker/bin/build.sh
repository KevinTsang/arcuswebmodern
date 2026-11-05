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
# VERSION). That tag is also the client version the app sends to the platform,
# so platform logs show which build a session came from. To build for another
# architecture, set DOCKER_DEFAULT_PLATFORM=linux/amd64.
#
# It refuses to build with uncommitted changes, so every tag names exactly the
# commit it was built from. To try out uncommitted changes, use
# `docker compose up --build` (see testing.md).

set -euo pipefail

ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
PREFIX=${DOCKER_PREFIX:-arcus}

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

# The image is built from the working tree, not the commit, so they must match.
# Untracked files count too: they'd be copied into the image. (Ignored files
# are kept out by .dockerignore instead.)
if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  echo "$0: commit or stash these changes first, so the image matches its tag:" >&2
  git -C "$ROOT" status --short >&2
  exit 1
fi
SHA=$(git -C "$ROOT" rev-parse --short=7 HEAD)
VERSION=${VERSION:-$(node -p "require('$ROOT/package.json').version")-$SHA}

docker build -t "$PREFIX/ui-server:$VERSION" -t "$PREFIX/ui-server:latest" \
  --build-arg NEXT_PUBLIC_APP_VERSION="$VERSION" \
  -f "$ROOT/docker/ui-server/Dockerfile" "$ROOT"

if $PUSH; then
  for tag in "$VERSION" latest; do
    docker tag "$PREFIX/ui-server:$tag" "$REGISTRY_NAME/$PREFIX/ui-server:$tag"
    docker push "$REGISTRY_NAME/$PREFIX/ui-server:$tag"
  done
fi

echo "Built $PREFIX/ui-server:$VERSION"
