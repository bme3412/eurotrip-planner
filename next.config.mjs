import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const baseConfig = {
  output: 'standalone',                         // keeps serverless functions small
  serverExternalPackages: ['mapbox-gl', 'react-map-gl', 'sharp'],
  outputFileTracingExcludes: {
    '/': [
      './public/data/**/*' // Exclude everything under public/data
    ]
  },
  // Configure external image domains for CDN
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
  // Optimize video serving
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

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(baseConfig);
