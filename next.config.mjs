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
        ],
      },
    ];
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(baseConfig);
