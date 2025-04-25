import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const baseConfig = {
  output: 'standalone',                         // keeps serverless functions small
  serverExternalPackages: ['mapbox-gl', 'react-map-gl'],
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(baseConfig);
