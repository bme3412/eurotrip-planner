import fs from 'fs';
import path from 'path';

const manifest = JSON.parse(fs.readFileSync('public/data/manifest.json', 'utf8'));
let missingTC = 0, missingPR = 0, missingCoords = 0, missingCW = 0;
let totalAttr = 0;

for (const [slug, meta] of Object.entries(manifest.cities)) {
  const p = path.join('public/data', meta.country, meta.directoryName, 'index.json');
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));

    if (data.tourismCategories == null) missingTC++;

    if (data.priceRange == null && data.price_range == null && data.costLevel == null) missingPR++;

    const sites = (data.attractions && data.attractions.sites) || (Array.isArray(data.attractions) ? data.attractions : []);
    const hasCoords = sites.some(a => a.latitude) || data.coordinates != null;
    if (!hasCoords) missingCoords++;

    totalAttr += sites.length;

    const months = data.visitCalendar ? data.visitCalendar.months : null;
    if (months) {
      const arr = Array.isArray(months) ? months : Object.values(months);
      const hw = arr.some(m => m.weatherHighC || (m.ranges && m.ranges.some(r => r.weatherHighC)));
      if (!hw) missingCW++;
    }
  } catch (e) {
    // skip
  }
}

console.log('Missing tourismCategories:', missingTC, '/ 220');
console.log('Missing priceRange:', missingPR, '/ 220');
console.log('Missing coordinates:', missingCoords, '/ 220');
console.log('Missing calendar weather:', missingCW, '/ 220');
console.log('Total attractions:', totalAttr, 'avg:', (totalAttr / 220).toFixed(1));
