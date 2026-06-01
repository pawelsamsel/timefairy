#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:?set DEPLOY_HOST=user@your-server}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/opt/timefairy}"
BUNDLE="${1:?usage: deploy-push.sh dist/timefairy-deploy-VERSION.tar.gz}"

if [[ ! -f "$BUNDLE" ]]; then
  echo "Bundle not found: $BUNDLE" >&2
  exit 1
fi

BUNDLE_NAME="$(basename "$BUNDLE")"
VERSION="$(sed -n 's/^timefairy-deploy-\(.*\)\.tar\.gz$/\1/p' <<<"$BUNDLE_NAME")"

if [[ -z "$VERSION" ]]; then
  echo "Could not parse version from bundle name: $BUNDLE_NAME" >&2
  exit 1
fi

IMAGES_TAR="images-${VERSION}.tar.gz"

echo "Uploading $BUNDLE to ${HOST}:${REMOTE_DIR}..."
ssh "$HOST" "mkdir -p $REMOTE_DIR"
scp "$BUNDLE" "$HOST:$REMOTE_DIR/"

ssh "$HOST" bash -s <<EOF
set -euo pipefail
cd "$REMOTE_DIR"
tar xzf "$BUNDLE_NAME"
gunzip -c "$IMAGES_TAR" | docker load

if grep -q "^TIMEFAIRY_VERSION=" .env 2>/dev/null; then
  sed -i 's/^TIMEFAIRY_VERSION=.*/TIMEFAIRY_VERSION=${VERSION}/' .env
else
  echo "TIMEFAIRY_VERSION=${VERSION}" >> .env
fi

docker compose -f docker-compose.prod.yml --env-file .env up -d
docker image prune -f
EOF

echo "Deploy complete: TIMEFAIRY_VERSION=${VERSION}"
