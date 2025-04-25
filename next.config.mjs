import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const baseConfig = {
  output: 'standalone',                         // keeps serverless functions small
  serverExternalPackages: ['mapbox-gl', 'react-map-gl', 'sharp'],
  experimental: {
    outputFileTracingExcludes: {
      '/': [
        './public/data/**/*' // Exclude everything under public/data
      ]
    }
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(baseConfig);
