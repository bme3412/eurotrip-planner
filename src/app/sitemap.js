import fs from 'fs';
import path from 'path';

export default async function sitemap() {
  const baseUrl = 'https://eurotrip-planner.vercel.app';

  // Read manifest to get all cities
  let cities = [];
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'data', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    cities = Object.keys(manifest.cities || {});
  } catch (e) {
    console.error('Failed to read manifest for sitemap:', e);
  }

  // Static pages
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/city-guides`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/start-planning`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/paris-trip`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  ];

  // Dynamic city pages
  const cityPages = cities.map(city => ({
    url: `${baseUrl}/city-guides/${encodeURIComponent(city)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticPages, ...cityPages];
}
