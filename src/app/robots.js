export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/preview/', '/auth/'],
      },
    ],
    sitemap: 'https://eurotrip-planner.vercel.app/sitemap.xml',
  };
}
