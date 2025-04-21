// next.config.mjs  (ES‑module syntax)

// 1.  Import the wrapper
import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // put any normal Next.js options here
  // reactStrictMode: true,
  // images: { domains: ['your‑cdn.com'] },
};

// 2.  Wrap the config — only when you ask for it
export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);
