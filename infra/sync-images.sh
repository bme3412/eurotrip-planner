#!/usr/bin/env bash
# Syncs static images from public/images/ to the S3 image bucket fronted by CloudFront.
# Usage: ./sync-images.sh [stage] [bucket]
#   stage  defaults to "prod"
#   bucket defaults to "eurotrip-images-${stage}"
#
# Once synced, set NEXT_PUBLIC_CDN_URL=https://dknnqxb2tbc80.cloudfront.net (or
# your distribution domain) and the helpers in src/utils/cdnUtils.js will route
# image/data requests through CloudFront. Images shipped via next/image will
# continue to use the optimizer.

set -euo pipefail

STAGE="${1:-prod}"
BUCKET="${2:-eurotrip-images-${STAGE}}"
IMAGES_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/images"

if [ ! -d "$IMAGES_DIR" ]; then
  echo "Error: $IMAGES_DIR does not exist"
  exit 1
fi

# Aggressively cache: filenames are content-stable; if not, bump the path.
echo "Syncing images to s3://${BUCKET}/ ..."
aws s3 sync "$IMAGES_DIR" "s3://${BUCKET}/images/" \
  --exclude "*.DS_Store" \
  --cache-control "public,max-age=31536000,immutable" \
  --delete

echo "Done. $(find "$IMAGES_DIR" -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.webp' -o -name '*.avif' \) | wc -l | tr -d ' ') image files synced."
echo
echo "Next steps:"
echo "  1. Invalidate CloudFront cache:"
echo "     aws cloudfront create-invalidation --distribution-id <ID> --paths '/images/*'"
echo "  2. Set in Vercel: NEXT_PUBLIC_CDN_URL=https://<distribution>.cloudfront.net"
echo "  3. Optionally remove local copies in public/images/ to slim the deploy."
