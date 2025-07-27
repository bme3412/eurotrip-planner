#!/bin/bash

# Deploy assets to S3 and invalidate CloudFront cache
BUCKET="eurotrip-planner-assets"
DISTRIBUTION_ID="your-cloudfront-distribution-id"

echo "🚀 Deploying assets to CDN..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if bucket exists
if ! aws s3 ls "s3://$BUCKET" &> /dev/null; then
    echo "❌ S3 bucket '$BUCKET' does not exist. Please create it first."
    echo "Run: aws s3 mb s3://$BUCKET"
    exit 1
fi

# Sync videos
echo "📹 Syncing videos..."
aws s3 sync public/videos/compressed s3://$BUCKET/videos/compressed --delete

if [ $? -eq 0 ]; then
    echo "✅ Videos synced successfully"
else
    echo "❌ Failed to sync videos"
    exit 1
fi

# Sync images
echo "🖼️ Syncing images..."
aws s3 sync public/images s3://$BUCKET/images --delete

if [ $? -eq 0 ]; then
    echo "✅ Images synced successfully"
else
    echo "❌ Failed to sync images"
    exit 1
fi

# Invalidate CloudFront cache (only if distribution ID is set)
if [ "$DISTRIBUTION_ID" != "your-cloudfront-distribution-id" ]; then
    echo "🔄 Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id $DISTRIBUTION_ID \
        --paths "/*"
    
    if [ $? -eq 0 ]; then
        echo "✅ Cache invalidation initiated"
    else
        echo "❌ Failed to invalidate cache"
        exit 1
    fi
else
    echo "⚠️ Skipping cache invalidation (DISTRIBUTION_ID not set)"
fi

echo "🎉 Deployment complete!"
echo ""
echo "📊 Next steps:"
echo "1. Update your .env.local with: NEXT_PUBLIC_CDN_URL=https://your-cloudfront-domain.cloudfront.net"
echo "2. Update your video sources to use the CDN URL"
echo "3. Test the performance improvements" 