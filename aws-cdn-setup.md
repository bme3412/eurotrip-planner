# AWS CloudFront CDN Setup Guide

## 🚀 **Why CloudFront CDN?**

- **Global distribution**: Videos load faster worldwide
- **Edge caching**: Reduces server load and improves performance
- **Cost effective**: Pay only for data transfer
- **Automatic optimization**: Compresses and optimizes content

## 📋 **Prerequisites**

1. AWS Account
2. AWS CLI installed and configured
3. S3 bucket for static assets
4. Domain name (optional but recommended)

## 🛠 **Step 1: Create S3 Bucket for Static Assets**

```bash
# Create S3 bucket
aws s3 mb s3://eurotrip-planner-assets

# Enable public access (for CloudFront)
aws s3api put-public-access-block \
  --bucket eurotrip-planner-assets \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Upload your assets
aws s3 sync public/videos/compressed s3://eurotrip-planner-assets/videos/compressed
aws s3 sync public/images/video-thumbnails s3://eurotrip-planner-assets/images/video-thumbnails
aws s3 sync public/images s3://eurotrip-planner-assets/images
```

## 🌐 **Step 2: Create CloudFront Distribution**

### Option A: Using AWS Console
1. Go to CloudFront console
2. Click "Create Distribution"
3. Origin Domain: Select your S3 bucket
4. Viewer Protocol Policy: Redirect HTTP to HTTPS
5. Cache Policy: Create custom policy for videos
6. Price Class: Use Only North America and Europe (cheaper)

### Option B: Using AWS CLI

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

## 📁 **Step 3: CloudFront Configuration File**

Create `cloudfront-config.json`:

```json
{
  "CallerReference": "eurotrip-planner-$(date +%s)",
  "Comment": "EuroTrip Planner CDN Distribution",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-eurotrip-planner-assets",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "TrustedKeyGroups": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      },
      "Headers": {
        "Quantity": 0
      },
      "QueryStringCacheKeys": {
        "Quantity": 0
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "Compress": true,
    "LambdaFunctionAssociations": {
      "Quantity": 0
    },
    "FieldLevelEncryptionId": "",
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-eurotrip-planner-assets",
        "DomainName": "eurotrip-planner-assets.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginPath": "",
        "CustomHeaders": {
          "Quantity": 0
        }
      }
    ]
  },
  "CacheBehaviors": {
    "Quantity": 2,
    "Items": [
      {
        "PathPattern": "/videos/*",
        "TargetOriginId": "S3-eurotrip-planner-assets",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
          "Enabled": false,
          "Quantity": 0
        },
        "TrustedKeyGroups": {
          "Enabled": false,
          "Quantity": 0
        },
        "ForwardedValues": {
          "QueryString": false,
          "Cookies": {
            "Forward": "none"
          },
          "Headers": {
            "Quantity": 0
          },
          "QueryStringCacheKeys": {
            "Quantity": 0
          }
        },
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "Compress": false,
        "LambdaFunctionAssociations": {
          "Quantity": 0
        },
        "FieldLevelEncryptionId": "",
        "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
      },
      {
        "PathPattern": "/images/*",
        "TargetOriginId": "S3-eurotrip-planner-assets",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
          "Enabled": false,
          "Quantity": 0
        },
        "TrustedKeyGroups": {
          "Enabled": false,
          "Quantity": 0
        },
        "ForwardedValues": {
          "QueryString": false,
          "Cookies": {
            "Forward": "none"
          },
          "Headers": {
            "Quantity": 0
          },
          "QueryStringCacheKeys": {
            "Quantity": 0
          }
        },
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "Compress": true,
        "LambdaFunctionAssociations": {
          "Quantity": 0
        },
        "FieldLevelEncryptionId": "",
        "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
      }
    ]
  },
  "CustomErrorResponses": {
    "Quantity": 0
  },
  "Logging": {
    "Enabled": false,
    "IncludeCookies": false,
    "Bucket": "",
    "Prefix": ""
  },
  "PriceClass": "PriceClass_100",
  "Enabled": true,
  "DefaultRootObject": "",
  "HttpVersion": "http2",
  "IsIPV6Enabled": true
}
```

## 🔧 **Step 4: Update Your Application**

### Environment Variables
Add to your `.env.local`:

```bash
NEXT_PUBLIC_CDN_URL=https://your-cloudfront-domain.cloudfront.net
```

### Update Video Sources
Modify your video sources to use CDN:

```javascript
// Before
videoSrc: '/videos/compressed/pamplona-runningofbulls.mp4'

// After
videoSrc: process.env.NEXT_PUBLIC_CDN_URL + '/videos/compressed/pamplona-runningofbulls.mp4'
```

## 📊 **Step 5: Performance Monitoring**

### CloudWatch Metrics to Monitor:
- **Cache Hit Ratio**: Should be > 90%
- **Error Rate**: Should be < 1%
- **Total Requests**: Monitor traffic patterns
- **Data Transfer**: Track costs

### Cost Optimization:
- **Price Class**: Use "Use Only North America and Europe" for cost savings
- **Cache TTL**: Optimize based on content update frequency
- **Compression**: Enable for images, disable for videos

## 🚀 **Step 6: Deployment Script**

Create `deploy-to-cdn.sh`:

```bash
#!/bin/bash

# Deploy assets to S3 and invalidate CloudFront cache
BUCKET="eurotrip-planner-assets"
DISTRIBUTION_ID="your-cloudfront-distribution-id"

echo "🚀 Deploying assets to CDN..."

# Sync videos
echo "📹 Syncing videos..."
aws s3 sync public/videos/compressed s3://$BUCKET/videos/compressed --delete

# Sync images
echo "🖼️ Syncing images..."
aws s3 sync public/images s3://$BUCKET/images --delete

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "✅ Deployment complete!"
```

## 💰 **Estimated Costs**

- **CloudFront**: ~$0.085 per GB (first 10TB)
- **S3 Storage**: ~$0.023 per GB
- **Data Transfer**: ~$0.09 per GB (outbound)

**Monthly estimate for 100GB traffic**: ~$20-30

## 🎯 **Expected Performance Improvements**

- **Video loading**: 50-80% faster globally
- **Image loading**: 70-90% faster
- **Server load**: Reduced by 80-90%
- **User experience**: Significantly improved

## 🔍 **Testing Your CDN**

1. **Speed Test**: Use tools like GTmetrix or WebPageTest
2. **Global Testing**: Test from different locations
3. **Cache Testing**: Verify cache headers are working
4. **Fallback Testing**: Ensure local fallbacks work

## 🛡️ **Security Considerations**

- **HTTPS Only**: Enforce HTTPS redirects
- **CORS Headers**: Configure properly for your domain
- **Access Control**: Use Origin Access Identity if needed
- **Monitoring**: Set up alerts for unusual traffic patterns 