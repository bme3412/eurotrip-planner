#!/bin/bash

echo "🚀 EuroTrip Planner CDN Setup"
echo "=============================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed."
    echo "Please install it first: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured."
    echo "Please run: aws configure"
    exit 1
fi

echo "✅ AWS CLI is ready"

# Get bucket name
read -p "Enter S3 bucket name (default: eurotrip-planner-assets): " BUCKET_NAME
BUCKET_NAME=${BUCKET_NAME:-eurotrip-planner-assets}

echo "📦 Creating S3 bucket: $BUCKET_NAME"

# Create S3 bucket
if aws s3 mb "s3://$BUCKET_NAME" 2>/dev/null; then
    echo "✅ S3 bucket created successfully"
else
    echo "⚠️ Bucket might already exist, continuing..."
fi

# Enable public access
echo "🔓 Enabling public access for CloudFront..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Create bucket policy for public read access
echo "📋 Creating bucket policy..."
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file://bucket-policy.json

# Upload assets
echo "📤 Uploading assets to S3..."

# Create directories if they don't exist
aws s3api put-object --bucket "$BUCKET_NAME" --key "videos/compressed/"
aws s3api put-object --bucket "$BUCKET_NAME" --key "images/video-thumbnails/"
aws s3api put-object --bucket "$BUCKET_NAME" --key "images/"

# Sync videos
echo "📹 Syncing videos..."
aws s3 sync public/videos/compressed "s3://$BUCKET_NAME/videos/compressed" --delete

# Sync images
echo "🖼️ Syncing images..."
aws s3 sync public/images "s3://$BUCKET_NAME/images" --delete

echo "✅ Assets uploaded successfully"

# Update CloudFront config
echo "🌐 Updating CloudFront configuration..."
sed -i.bak "s/eurotrip-planner-assets/$BUCKET_NAME/g" cloudfront-config.json

echo "📋 Next steps:"
echo "1. Go to AWS CloudFront console: https://console.aws.amazon.com/cloudfront/"
echo "2. Click 'Create Distribution'"
echo "3. Origin Domain: Select your S3 bucket ($BUCKET_NAME)"
echo "4. Copy the configuration from cloudfront-config.json"
echo "5. Set Price Class to 'Use Only North America and Europe' (cheaper)"
echo "6. Create the distribution"
echo ""
echo "7. Once created, update your .env.local:"
echo "   NEXT_PUBLIC_CDN_URL=https://your-cloudfront-domain.cloudfront.net"
echo ""
echo "8. Update deploy-to-cdn.sh with your distribution ID"
echo "9. Run: ./deploy-to-cdn.sh"

# Cleanup
rm -f bucket-policy.json cloudfront-config.json.bak

echo ""
echo "🎉 Setup complete! Follow the steps above to finish CDN configuration." 