#!/usr/bin/env bash
# Syncs city JSON data from public/data/ to the S3 city data bucket.
# Usage: ./sync-city-data.sh [stage]
#   stage defaults to "dev"

set -euo pipefail

STAGE="${1:-dev}"
BUCKET="eurotrip-city-data-${STAGE}"
DATA_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/data"

if [ ! -d "$DATA_DIR" ]; then
  echo "Error: $DATA_DIR does not exist"
  exit 1
fi

echo "Syncing city data to s3://${BUCKET}/ ..."
aws s3 sync "$DATA_DIR" "s3://${BUCKET}/" \
  --exclude "*.DS_Store" \
  --delete

echo "Done. $(find "$DATA_DIR" -name '*.json' | wc -l | tr -d ' ') JSON files synced."
