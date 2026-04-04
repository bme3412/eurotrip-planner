import { withSentryConfig } from '@sentry/nextjs';
import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const baseConfig = {
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/paris-trip',
        destination: '/plan/paris',
        permanent: true,
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

export default withSentryConfig(withAnalyzer(baseConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  telemetry: false,
});
