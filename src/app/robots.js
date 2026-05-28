export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/'],
      },
    ],
    sitemap: 'https://eurotrip-planner.vercel.app/sitemap.xml',
  };
}
