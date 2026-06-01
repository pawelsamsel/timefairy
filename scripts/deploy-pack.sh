#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="${1:-$(git rev-parse --short HEAD)}"
PLATFORM="${DEPLOY_PLATFORM:-linux/amd64}"
BUILDER="${BUILDX_BUILDER:-default}"

IMAGES_TAR="images-${VERSION}.tar.gz"
BUNDLE="dist/timefairy-deploy-${VERSION}.tar.gz"

mkdir -p dist

export BUILDX_BUILDER="$BUILDER"

echo "Building timefairy-api:${VERSION} (${PLATFORM})..."
docker buildx build --platform "$PLATFORM" \
  -t "timefairy-api:${VERSION}" \
  -f apps/api/Dockerfile \
  --load .

echo "Building timefairy-web:${VERSION} (${PLATFORM})..."
docker buildx build --platform "$PLATFORM" \
  -t "timefairy-web:${VERSION}" \
  -f apps/web/Dockerfile \
  --build-arg VITE_API_URL= \
  --load .

echo "Saving images..."
docker save "timefairy-api:${VERSION}" "timefairy-web:${VERSION}" \
  | gzip > "dist/${IMAGES_TAR}"

cp docker-compose.prod.yml dist/docker-compose.prod.yml
tar czf "$BUNDLE" -C dist "${IMAGES_TAR}" docker-compose.prod.yml

echo "Bundle ready: $BUNDLE"
echo "Deploy with: DEPLOY_HOST=user@server ./scripts/deploy-push.sh $BUNDLE"
