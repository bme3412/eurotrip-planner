#!/usr/bin/env node
/**
 * Enriches cityMetadata.json with coordinates for cities that are missing them.
 *
 * Strategy:
 *   1. Read the city's attractions data and average all attraction coordinates
 *   2. Fall back to a static lookup table for well-known European cities
 *   3. Log any cities still missing for manual addition
 *
 * Run: node scripts/enrichCoordinates.mjs
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const METADATA_PATH = path.join(ROOT, 'scripts', 'cityMetadata.json');
const MANIFEST_PATH = path.join(ROOT, 'public', 'data', 'manifest.json');

const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

// ── Static lookup for European cities (from common knowledge) ─────
const STATIC_COORDS = {
  aachen: [50.7753, 6.0839], ajaccio: [41.9192, 8.7386], alicante: [38.3452, -0.4810],
  amalfi: [40.6340, 13.5737], angers: [47.4784, -0.5632], annecy: [45.8992, 6.1294],
  avignon: [43.9493, 4.8055], bath: [51.3811, -2.3590], belfast: [54.5973, -5.9301],
  belgrade: [44.7866, 20.4489], biarritz: [43.4832, -1.5586], bilbao: [43.2630, -2.9350],
  birgu: [35.8873, 14.5225], bodrum: [37.0344, 27.4305], bordeaux: [44.8378, -0.5792],
  brest: [48.3904, -4.4861], bruges: [51.2093, 3.2247], cadiz: [36.5271, -6.2886],
  cagliari: [39.2238, 9.1217], cannes: [43.5528, 7.0174], catania: [37.5079, 15.0830],
  chambery: [45.5646, 5.9178], chania: [35.5138, 24.0180], colmar: [48.0794, 7.3558],
  corfu: [39.6243, 19.9217], cortina: [46.5369, 12.1357], dijon: [47.3220, 5.0415],
  dinant: [50.2607, 4.9122], dusseldorf: [51.2277, 6.7735], edinburgh: [55.9533, -3.1883],
  faro: [37.0194, -7.9322], freiburg: [47.9990, 7.8421], funchal: [32.6669, -16.9241],
  galway: [53.2707, -9.0568], gdansk: [54.3520, 18.6466], geneva: [46.2044, 6.1432],
  ghent: [51.0543, 3.7174], gibraltar: [36.1408, -5.3536], gijon: [43.5322, -5.6611],
  gothenburg: [57.7089, 11.9746], granada: [37.1773, -3.5986], hamburg: [53.5511, 9.9937],
  heidelberg: [49.3988, 8.6724], heraklion: [35.3387, 25.1442], kaunas: [54.8985, 23.9036],
  krakow: [50.0647, 19.9450], larnaca: [34.9003, 33.6232], lecce: [40.3516, 18.1750],
  leiden: [52.1601, 4.4970], liege: [50.6326, 5.5797], lille: [50.6292, 3.0573],
  limassol: [34.7071, 33.0226], liverpool: [53.4084, -2.9916], london: [51.5074, -0.1278],
  lucca: [43.8430, 10.5027], lund: [55.7047, 13.1910], luxembourgcity: [49.6117, 6.1300],
  lyon: [45.7640, 4.8357], madeira: [32.6669, -16.9241], malaga: [36.7213, -4.4214],
  malmö: [55.6050, 13.0038], marseille: [43.2965, 5.3698], montpellier: [43.6108, 3.8767],
  mykonos: [37.4467, 25.3289], nantes: [47.2184, -1.5536], naples: [40.8518, 14.2681],
  newcastle: [54.9783, -1.6178], nicosia: [35.1856, 33.3823], nimes: [43.8367, 4.3601],
  nuremberg: [49.4521, 11.0767], ohrid: [41.1231, 20.8016], oslo: [59.9139, 10.7522],
  oxford: [51.7520, -1.2577], palermo: [38.1157, 13.3615], palma: [39.5696, 2.6502],
  pamplona: [42.8125, -1.6458], perpignan: [42.6887, 2.8948], piran: [45.5283, 13.5681],
  plovdiv: [42.1354, 24.7453], porto: [41.1579, -8.6291], reims: [49.2583, 3.6167],
  reykjavik: [64.1466, -21.9426], rhodes: [36.4349, 28.2176], riga: [56.9496, 24.1052],
  rijeka: [45.3271, 14.4422], rostock: [54.0924, 12.0991], rotterdam: [51.9244, 4.4777],
  rovinj: [45.0812, 13.6387], 'saint-malo': [48.6493, -2.0070], salamanca: [40.9688, -5.6631],
  'san-sebastian': [43.3183, -1.9812], santander: [43.4623, -3.8100], santorini: [36.3932, 25.4615],
  siena: [43.3188, 11.3308], sintra: [38.7981, -9.3883], skopje: [41.9973, 21.4280],
  sofia: [42.6977, 23.3219], split: [43.5081, 16.4402], stavanger: [58.9700, 5.7331],
  stockholm: [59.3293, 18.0686], strasbourg: [48.5734, 7.7521], stuttgart: [48.7758, 9.1829],
  tallinn: [59.4370, 24.7536], tartu: [58.3780, 26.7290], thessaloniki: [40.6401, 22.9444],
  tirana: [41.3275, 19.8187], toledo: [39.8628, -4.0273], toulouse: [43.6047, 1.4442],
  trieste: [45.6495, 13.7768], tromsø: [69.6496, 18.9560], turku: [60.4518, 22.2666],
  turin: [45.0703, 7.6869], utrecht: [52.0907, 5.1214], valletta: [35.8989, 14.5146],
  varna: [43.2141, 27.9147], venice: [45.4408, 12.3155], verona: [45.4384, 10.9916],
  vilnius: [54.6872, 25.2797], warsaw: [52.2297, 21.0122], waterford: [52.2593, -7.1101],
  york: [53.9591, -1.0815], zadar: [44.1194, 15.2314], zagreb: [45.8150, 15.9819],
  zaragoza: [41.6488, -0.8891], zurich: [47.3769, 8.5417],
  // Extra: cities from manifest that may have non-obvious spellings
  'cesky-krumlov': [48.8127, 14.3175], 'den-haag': [52.0705, 4.3007],
  'lake-bled': [46.3683, 14.1146], 'san-marino': [43.9424, 12.4578],
  'kotor': [42.4247, 18.7712], 'mostar': [43.3438, 17.8078],
  'dubrovnik': [42.6507, 18.0944], 'bratislava': [48.1486, 17.1077],
  'budapest': [47.4979, 19.0402], 'bucharest': [44.4268, 26.1025],
  'cork': [51.8969, -8.4863], 'poznan': [52.4064, 16.9252],
  'wroclaw': [51.1079, 17.0385], 'timisoara': [45.7489, 21.2087],
  'sibiu': [45.7983, 24.1256], 'brasov': [45.6427, 25.5887],
  'cluj-napoca': [46.7712, 23.6236], 'iasi': [47.1585, 27.6014],
};

let enriched = 0;
let fromAttractions = 0;
let fromStatic = 0;
let stillMissing = [];

for (const [slug, entry] of Object.entries(manifest.cities)) {
  // Check current metadata
  const meta = metadata[slug];
  if (meta?.latitude && meta?.longitude) continue; // Already has coords

  let lat = null, lon = null;

  // Strategy 1: Average attraction coordinates
  try {
    const indexPath = path.join(ROOT, 'public', 'data', entry.country, entry.directoryName, 'index.json');
    if (fs.existsSync(indexPath)) {
      const idx = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      const sites = idx.attractions?.sites || [];
      const withCoords = sites.filter(s => s.latitude && s.longitude);
      if (withCoords.length > 0) {
        lat = withCoords.reduce((sum, s) => sum + s.latitude, 0) / withCoords.length;
        lon = withCoords.reduce((sum, s) => sum + s.longitude, 0) / withCoords.length;
        fromAttractions++;
      }
    }
  } catch { /* ignore */ }

  // Strategy 2: Static lookup
  if (!lat || !lon) {
    const coords = STATIC_COORDS[slug] || STATIC_COORDS[slug.replace(/-/g, '')];
    if (coords) {
      lat = coords[0];
      lon = coords[1];
      fromStatic++;
    }
  }

  if (lat && lon) {
    if (!metadata[slug]) {
      metadata[slug] = { name: capitalize(slug), country: entry.country, region: 'Other' };
    }
    metadata[slug].latitude = Math.round(lat * 10000) / 10000;
    metadata[slug].longitude = Math.round(lon * 10000) / 10000;
    enriched++;
  } else {
    stillMissing.push(slug);
  }
}

function capitalize(s) {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Write back
fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2));

console.log(`\n✅ Enriched ${enriched} cities with coordinates`);
console.log(`   From attraction averaging: ${fromAttractions}`);
console.log(`   From static lookup: ${fromStatic}`);

if (stillMissing.length > 0) {
  console.log(`\n⚠️  Still missing coordinates (${stillMissing.length}):`);
  console.log(`   ${stillMissing.join(', ')}`);
}

console.log(`\nRun 'npm run generate-cities' to rebuild the city list.\n`);
