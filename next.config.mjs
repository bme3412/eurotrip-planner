import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const baseConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react', '@heroicons/react', 'date-fns', 'framer-motion'],
  },
  async redirects() {
    return [
      {
        source: '/paris-trip',
        destination: '/plan/paris',
        permanent: true,
      },
      {
        source: '/planner',
        destination: '/plan',
        permanent: true,
      },
      {
        source: '/planning',
        destination: '/plan',
        permanent: true,
      },
      {
        source: '/start-planning',
        destination: '/plan',
        permanent: true,
      },
      {
        source: '/trip-planner',
        destination: '/plan',
        permanent: true,
      },
      {
        source: '/discover',
        destination: '/explore',
        permanent: false,
      },
    ];
  },
  serverExternalPackages: ['mapbox-gl', 'react-map-gl', 'sharp'],
  outputFileTracingExcludes: {
    '**': [
      './public/images/**/*',
      './public/videos/**/*',
    ]
  },
  images: {
    // Modern formats — Next will negotiate best format per browser
    formats: ['image/avif', 'image/webp'],
    // Tighten the breakpoint set so the optimizer caches fewer permutations
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dknnqxb2tbc80.cloudfront.net',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dknnqxb2tbc80.cloudfront.net',
        port: '',
        pathname: '/city-thumbnails/**',
      },
      {
        protocol: 'https',
        hostname: 'dknnqxb2tbc80.cloudfront.net',
        port: '',
        pathname: '/videos/**',
      },
      {
        // Google Places photo media (photo-spots tab)
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        // Mapbox static mini-maps (photo-spot detail modal)
        protocol: 'https',
        hostname: 'api.mapbox.com',
        port: '',
        pathname: '/styles/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/videos/compressed/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Accept-Ranges',
            value: 'bytes',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Content-Type',
            value: 'application/json; charset=utf-8',
          },
        ],
      },
      {
        source: '/images/video-thumbnails/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withAnalyzer(baseConfig);
