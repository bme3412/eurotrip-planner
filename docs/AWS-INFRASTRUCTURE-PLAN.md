# AWS Infrastructure Plan - Eurotrip Planner

## Overview

This plan implements a hybrid Vercel + AWS architecture to reduce latency for US + Europe users while keeping the excellent Vercel developer experience.

**Architecture:**
```
Users (US/EU) → CloudFront CDN
                     │
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
  Vercel App    S3 (/data/*)    ElastiCache
  (Next.js)     (Static JSON)   (Redis 7.x)
```

**Expected Results:**
- Static data latency: 30-80ms (from 100-200ms)
- API responses: <200ms cached (from >500ms)
- Monthly cost: ~$140-160

---

## Phase 3.1: S3 + CloudFront for Static JSON Data

### Step 1: Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://eurotrip-static-data --region us-east-1

# Enable versioning (optional, for rollback)
aws s3api put-bucket-versioning \
  --bucket eurotrip-static-data \
  --versioning-configuration Status=Enabled
```

### Step 2: Configure Bucket Policy for CloudFront

Create `s3-bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::eurotrip-static-data/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

Apply policy:
```bash
aws s3api put-bucket-policy \
  --bucket eurotrip-static-data \
  --policy file://s3-bucket-policy.json
```

### Step 3: Sync Data to S3

```bash
# Initial sync with cache headers
aws s3 sync public/data/ s3://eurotrip-static-data/data/ \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "application/json"

# Create a deploy script
cat > scripts/sync-to-s3.sh << 'EOF'
#!/bin/bash
aws s3 sync public/data/ s3://eurotrip-static-data/data/ \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "application/json" \
  --delete
echo "✅ Synced to S3"
EOF
chmod +x scripts/sync-to-s3.sh
```

### Step 4: Create CloudFront Distribution

Create `cloudfront-config.json`:
```json
{
  "CallerReference": "eurotrip-planner-2026",
  "Comment": "Eurotrip Planner CDN",
  "Enabled": true,
  "PriceClass": "PriceClass_100",
  "Origins": {
    "Quantity": 2,
    "Items": [
      {
        "Id": "S3-eurotrip-static-data",
        "DomainName": "eurotrip-static-data.s3.us-east-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginAccessControlId": "OAC_ID_HERE"
      },
      {
        "Id": "Vercel-App",
        "DomainName": "eurotrip-planner.vercel.app",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "Vercel-App",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true
  },
  "CacheBehaviors": {
    "Quantity": 1,
    "Items": [
      {
        "PathPattern": "/data/*",
        "TargetOriginId": "S3-eurotrip-static-data",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
          "Quantity": 2,
          "Items": ["GET", "HEAD"],
          "CachedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"]
          }
        },
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "Compress": true
      }
    ]
  }
}
```

Create distribution:
```bash
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### Step 5: Update Next.js Config

Add rewrites to `next.config.mjs`:
```javascript
async rewrites() {
  return [
    // Only rewrite in production when CDN_URL is set
    ...(process.env.CDN_URL ? [{
      source: '/data/:path*',
      destination: `${process.env.CDN_URL}/data/:path*`,
    }] : []),
  ];
},
```

Add environment variable in Vercel:
```
CDN_URL=https://d1234567890.cloudfront.net
```

---

## Phase 3.2: ElastiCache Redis for API Caching

### Step 1: Create VPC (if needed)

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=eurotrip-vpc}]'

# Create subnets in multiple AZs
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b
```

### Step 2: Create ElastiCache Subnet Group

```bash
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name eurotrip-redis-subnet \
  --cache-subnet-group-description "Subnets for Eurotrip Redis" \
  --subnet-ids subnet-xxx subnet-yyy
```

### Step 3: Create ElastiCache Redis Cluster

```bash
aws elasticache create-replication-group \
  --replication-group-id eurotrip-redis \
  --replication-group-description "Eurotrip suggestions cache" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.r7g.medium \
  --num-cache-clusters 2 \
  --cache-subnet-group-name eurotrip-redis-subnet \
  --security-group-ids sg-xxx \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled
```

### Step 4: Create Global Datastore (for EU replica)

```bash
# Create global datastore
aws elasticache create-global-replication-group \
  --global-replication-group-id-suffix eurotrip-global \
  --primary-replication-group-id eurotrip-redis

# Add EU region
aws elasticache create-replication-group \
  --replication-group-id eurotrip-redis-eu \
  --replication-group-description "EU replica" \
  --global-replication-group-id eurotrip-global \
  --region eu-west-1
```

### Step 5: Update Application

The cache layer (`src/lib/cache/suggestions.js`) already supports Redis via Upstash. For ElastiCache, you'll need to:

1. Add VPC connectivity from Vercel (requires Vercel Enterprise) OR
2. Use Upstash Redis instead (simpler, works with Vercel out of the box)

**Recommended: Use Upstash Redis**

```bash
# Install Upstash Redis in Vercel Marketplace
# Then add environment variables:
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

---

## Phase 3.3: CloudFront Cache Behaviors

| Path Pattern | Origin | TTL | Compression | Notes |
|--------------|--------|-----|-------------|-------|
| `/data/*` | S3 | 1 year | gzip + brotli | Static JSON, immutable |
| `/api/google-photos` | Vercel | 7 days | - | Photo proxy |
| `/api/suggestions` | Vercel | 1 hour | gzip | CDN caches after first hit |
| `/city-guides/*` | Vercel | 24 hours | gzip | ISR pages |
| `/*` | Vercel | default | gzip | Dynamic pages |

---

## Cost Estimate

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| CloudFront | 100GB transfer, 10M requests | $15-25 |
| S3 | 200MB storage, 5M requests | $2 |
| Upstash Redis | Pro plan (250MB, global) | $10 |
| **Total** | | **$27-37/mo** |

*Note: ElastiCache would be ~$120/mo for global datastore, but Upstash is much simpler and cheaper for this use case.*

---

## Implementation Checklist

### S3 + CloudFront
- [ ] Create S3 bucket `eurotrip-static-data`
- [ ] Configure bucket policy for CloudFront OAC
- [ ] Sync `public/data/` to S3
- [ ] Create CloudFront distribution with multiple origins
- [ ] Configure cache behaviors for `/data/*`
- [ ] Add `CDN_URL` environment variable to Vercel
- [ ] Test: `curl -I https://d1234.cloudfront.net/data/France/paris/index.json`

### Redis Caching
- [ ] Set up Upstash Redis via Vercel Marketplace
- [ ] Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel
- [ ] Verify cache hits: check `X-Cache` header in API responses

### DNS (Optional)
- [ ] Create Route 53 hosted zone
- [ ] Add CNAME for `cdn.eurotrip-planner.com` → CloudFront
- [ ] Update `CDN_URL` to use custom domain

---

## Verification

### Test CloudFront
```bash
# Check cache headers
curl -I https://d1234.cloudfront.net/data/France/paris/index.json

# Expected headers:
# X-Cache: Hit from cloudfront
# Cache-Control: public, max-age=31536000, immutable
```

### Test API Caching
```bash
# First request (cache miss)
curl -I "https://eurotrip-planner.vercel.app/api/suggestions?startDate=2026-06-01&endDate=2026-06-14&v=4"
# X-Cache: MISS or HIT-PRECOMPUTED

# Second request (cache hit)
curl -I "https://eurotrip-planner.vercel.app/api/suggestions?startDate=2026-06-01&endDate=2026-06-14&v=4"
# X-Cache: HIT-PRECOMPUTED or HIT-REDIS
```

### Monitor Performance
- CloudWatch metrics for CloudFront cache hit rate
- Vercel Analytics for API response times
- Upstash dashboard for Redis hit rate

---

## Rollback Plan

If issues occur:

1. **Remove CDN rewrite**: Delete `CDN_URL` from Vercel env vars
2. **Disable CloudFront**: Set distribution to disabled
3. **Clear Redis**: Flush Upstash cache if stale data

The application will fall back to serving `/data/*` from Vercel directly.

---

## Future Optimizations

1. **Lambda@Edge**: Add request normalization at edge for better cache hit rates
2. **S3 Cross-Region Replication**: Replicate to `eu-west-1` for lower EU latency
3. **Brotli Pre-compression**: Pre-compress JSON files with `.br` extension
4. **Route 53 Latency Routing**: Route US users to us-east-1, EU users to eu-west-1
