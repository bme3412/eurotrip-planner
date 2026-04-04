#!/usr/bin/env node
/**
 * City Data Generation Pipeline
 *
 * Generates structured city data via OpenAI, matching the schema in src/types/city.ts.
 * Supports generating full data for empty cities and enriching existing ones.
 *
 * Usage:
 *   node scripts/generateCityData.mjs --empty-only              # Fill all 82 empty cities
 *   node scripts/generateCityData.mjs --city budapest            # Generate for one city
 *   node scripts/generateCityData.mjs --section attractions --enrich  # Enrich existing attractions
 *   node scripts/generateCityData.mjs --dry-run                  # Preview what would be generated
 *   node scripts/generateCityData.mjs --experiences --top 50     # Generate experiences for top 50 cities
 *   node scripts/generateCityData.mjs --walking-routes           # Add walking routes
 *   node scripts/generateCityData.mjs --events                   # Add event calendars
 *   node scripts/generateCityData.mjs --photo-spots              # Add photo spots
 *   node scripts/generateCityData.mjs --day-trips                # Add day trip data
 *
 * Requires: OPENAI_API_KEY in .env.local or environment
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load .env.local
config({ path: path.join(process.cwd(), '.env.local') });

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'public', 'data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

// ── CLI argument parsing ────────────────────────────────────────────

const args = process.argv.slice(2);
const getFlag = (name) => args.includes(`--${name}`);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
};

const DRY_RUN = getFlag('dry-run');
const EMPTY_ONLY = getFlag('empty-only');
const ENRICH = getFlag('enrich');
const TARGET_CITY = getArg('city');
const TARGET_SECTION = getArg('section');
const GEN_EXPERIENCES = getFlag('experiences');
const GEN_WALKING = getFlag('walking-routes');
const GEN_EVENTS = getFlag('events');
const GEN_PHOTOS = getFlag('photo-spots');
const GEN_DAYTRIPS = getFlag('day-trips');
const TOP_N = parseInt(getArg('top') || '50', 10);
const BATCH_SIZE = parseInt(getArg('batch') || '5', 10);
const CONCURRENCY = parseInt(getArg('concurrency') || '5', 10);

// ── OpenAI setup ────────────────────────────────────────────────────

let openai = null;

async function getOpenAI() {
  if (openai) return openai;
  const OpenAI = (await import('openai')).default;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: OPENAI_API_KEY not set. Add it to .env.local');
    process.exit(1);
  }
  openai = new OpenAI({ apiKey });
  return openai;
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const RETRY_DELAY = 2000;
const MAX_RETRIES = 3;

async function callLLM(systemPrompt, userPrompt, retries = 0) {
  const client = await getOpenAI();
  try {
    const resp = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    const text = resp.choices[0]?.message?.content;
    if (!text) throw new Error('Empty response from LLM');
    return JSON.parse(text);
  } catch (err) {
    if (retries < MAX_RETRIES && (err.status === 429 || err.status >= 500)) {
      console.log(`  Retry ${retries + 1}/${MAX_RETRIES} after ${RETRY_DELAY}ms...`);
      await sleep(RETRY_DELAY * (retries + 1));
      return callLLM(systemPrompt, userPrompt, retries + 1);
    }
    throw err;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Data helpers ────────────────────────────────────────────────────

function readJson(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return null; }
}

function writeJson(fp, data) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}

function getCityDir(entry) {
  return path.join(DATA_DIR, entry.country, entry.directoryName);
}

function isCityEmpty(idx) {
  return !idx?.attractions?.sites?.length && !idx?.neighborhoods?.neighborhoods?.length;
}

function getCityCompleteness(idx) {
  const sections = {
    overview: !!idx?.overview?.city_name,
    attractions: idx?.attractions?.sites?.length > 0,
    neighborhoods: idx?.neighborhoods?.neighborhoods?.length > 0,
    culinary: !!(idx?.culinaryGuide?.restaurants || idx?.culinaryGuide?.food_experiences),
    calendar: !!idx?.visitCalendar?.months,
    seasonal: !!(idx?.seasonalActivities?.Spring || idx?.seasonalActivities?.Summer),
    connections: !!idx?.connections?.destinations?.length,
  };
  const score = Object.values(sections).filter(Boolean).length;
  return { sections, score, total: Object.keys(sections).length };
}

// ── Prompt templates ────────────────────────────────────────────────

const SYSTEM_BASE = `You are a travel data expert generating structured JSON city data for a European travel planner app. Your data must be factually accurate, coordinates must be real, and all content should read as expert travel writing. Always return valid JSON.`;

function overviewPrompt(city, country) {
  return {
    system: SYSTEM_BASE,
    user: `Generate a city overview for ${city}, ${country}. Return JSON matching this structure:
{
  "city_name": "${city}",
  "country": "${country}",
  "brief_description": "2-3 sentence compelling description",
  "nickname": "common nickname or null",
  "region": "geographic region",
  "population": "approximate population string",
  "why_visit": ["reason 1", "reason 2", "reason 3", "reason 4"],
  "best_time_to_visit": "best months and why",
  "seasonal_notes": { "spring": "...", "summer": "...", "autumn": "...", "winter": "..." },
  "practical_info": {
    "currency": "...",
    "language": "...",
    "visit_duration": "recommended days",
    "getting_around": "main transport options",
    "safety": "safety notes"
  },
  "coordinates": { "latitude": 0.0, "longitude": 0.0 },
  "things_to_do_tiers": {
    "must_do": ["top 5 must-do experiences"],
    "worth_doing": ["5 more great things"],
    "hidden_gems": ["3-5 off-the-beaten-path ideas"]
  }
}
Use real, accurate coordinates. Write engaging descriptions.`
  };
}

function attractionsPrompt(city, country, existingNames = []) {
  const excludeClause = existingNames.length
    ? `\nThe following attractions already exist in our database — do NOT duplicate them: ${existingNames.join(', ')}`
    : '';
  return {
    system: SYSTEM_BASE,
    user: `Generate 15-20 top attractions for ${city}, ${country}. ${excludeClause}
Return JSON: { "sites": [...] } where each site has:
{
  "name": "Official name",
  "type": "Monument|Museum|Park|Church|Palace|Market|Gallery|Viewpoint|Historic Site|etc.",
  "description": "2-4 sentence engaging description with specific details and history",
  "indoor": true/false,
  "best_time": "Morning|Afternoon|Evening|Any",
  "price_range": "Free|Budget|Moderate|Premium",
  "seasonal_notes": "relevant seasonal info or null",
  "booking_tips": "booking advice or null",
  "ratings": { "cost_estimate": euros, "suggested_duration_hours": 1.5, "cultural_significance": 1-5 },
  "latitude": real_latitude,
  "longitude": real_longitude,
  "neighborhood": "neighborhood name",
  "opening_hours": { "weekday": "hours", "weekend": "hours", "notes": "seasonal changes" },
  "transit": {
    "closest_metro": [{ "line": "line", "station": "name", "walk_minutes": 5 }],
    "bus_routes": ["relevant routes"]
  },
  "visit_profile": {
    "min_duration_hours": 0.5,
    "max_duration_hours": 2,
    "ideal_time_block": "morning|afternoon|evening",
    "weather_fallback": "good indoor alternative if outdoor"
  },
  "official_url": "https://... or null",
  "website": "https://... or null"
}
Use REAL coordinates. Include a mix of iconic landmarks, museums, parks, neighborhoods to explore, markets, and lesser-known gems. Vary types.`
  };
}

function neighborhoodsPrompt(city, country) {
  return {
    system: SYSTEM_BASE,
    user: `Generate 6-10 distinct neighborhoods for ${city}, ${country}. Return JSON: { "neighborhoods": [...] } where each neighborhood has:
{
  "name": "Official neighborhood name",
  "alternate_names": ["other names if any"],
  "character": "2-sentence vivid description of the vibe and character",
  "location": {
    "central": true/false,
    "description": "where it is relative to city center",
    "borders": ["adjacent neighborhoods"],
    "landmarks": ["notable landmarks in this area"]
  },
  "history": {
    "overview": "1-2 sentence historical context",
    "significance": "why it matters",
    "notable_events": ["key historical moments"]
  },
  "practical_info": {
    "transit": ["main metro/tram/bus stations"],
    "safety": "safety level",
    "best_time_to_visit": "when to go",
    "walkability": "how walkable"
  },
  "appeal": {
    "known_for": ["3-5 things it's known for"],
    "atmosphere": ["3 vibe words"],
    "best_for": ["types of travelers"]
  },
  "categories": { "touristy": 1-5, "residential": 1-5, "green_spaces": 1-5, "shopping": 1-5, "dining": 1-5, "nightlife": 1-5, "cultural": 1-5, "historic": 1-5 },
  "highlights": {
    "attractions": [{ "name": "...", "type": "...", "description": "1 sentence", "appeal": "why visit" }],
    "dining": [{ "name": "...", "cuisine": "...", "price_range": "€-€€€€", "known_for": "...", "atmosphere": "..." }]
  },
  "insider_tips": ["2-3 local tips"]
}
Include the main tourist area, the hip/trendy area, the food district, a residential/local area, and the historic center.`
  };
}

function culinaryPrompt(city, country) {
  return {
    system: SYSTEM_BASE,
    user: `Generate a culinary guide for ${city}, ${country}. Return JSON:
{
  "restaurants": {
    "fine_dining": [3-4 restaurants],
    "casual_dining": [5-6 restaurants],
    "street_food": [3-4 street food spots/markets]
  },
  "bars_and_cafes": {
    "bars": [3-4 notable bars],
    "cafes": [3-4 cafes]
  },
  "food_experiences": [3-5 unique food experiences like food tours, cooking classes, market visits],
  "seasonal_specialties": { "spring": [...], "summer": [...], "autumn": [...], "winter": [...] }
}
Each restaurant/bar/cafe entry should have:
{
  "name": "Real establishment name",
  "cuisine_type": "cuisine style",
  "description": "1-2 sentence description",
  "price_range": "€|€€|€€€|€€€€",
  "atmosphere": "vibe description",
  "neighborhood": "area",
  "best_for": ["date night", "groups", etc.],
  "latitude": real_lat, "longitude": real_lon,
  "reservation_needed": true/false,
  "local_tips": "insider tip"
}
Focus on places that actually exist. Include the city's signature dishes and food culture.`
  };
}

function calendarPrompt(city, country) {
  return {
    system: SYSTEM_BASE,
    user: `Generate a 12-month visit calendar for ${city}, ${country}. Return JSON:
{
  "months": {
    "january": { "name": "January", "ranges": [...] },
    "february": { ... },
    ... all 12 months
  }
}
Each month should have 3-5 day ranges. Each range:
{
  "days": [1,2,3,4,5,6,7,8,9,10],
  "score": 1-5 (1=Avoid, 2=Below Average, 3=Average, 4=Good, 5=Excellent),
  "special": false (true only for major events/holidays),
  "event": "event name or null",
  "notes": "why this score — mention weather, crowds, events",
  "crowdLevel": "Very Low|Low|Moderate|High|Very High",
  "travelerTypes": { "families": 1-5, "couples": 1-5, "solo": 1-5, "business": 1-5, "budget": 1-5, "luxury": 1-5 }
}
Scores should reflect real seasonal patterns: weather, major events (festivals, holidays), tourist high/low season, and local rhythms. Be specific about WHY each period scores as it does.`
  };
}

function seasonalPrompt(city, country) {
  return {
    system: SYSTEM_BASE,
    user: `Generate seasonal activities for ${city}, ${country}. Return JSON:
{
  "Spring": [4-6 activities],
  "Summer": [4-6 activities],
  "Autumn": [4-6 activities],
  "Winter": [4-6 activities]
}
Each activity: { "name": "...", "type": "festival|outdoor|cultural|food|sport", "description": "1-2 sentences", "best_months": ["March","April"], "location": "where", "price": "Free|Budget|Moderate|Premium" }
Include real annual events, seasonal foods, weather-appropriate activities.`
  };
}

function connectionsPrompt(city, country) {
  return {
    system: SYSTEM_BASE,
    user: `Generate transport connections from ${city}, ${country} to other European cities. Return JSON:
{ "destinations": [...] }
Include 8-12 major connections. Each:
{
  "city": "destination city",
  "country": "destination country",
  "transport_types": [
    { "type": "train|bus|flight|ferry", "duration": "Xh Ym", "frequency": "daily|hourly|weekly", "price_range": "€XX-€XX", "operator": "company name", "notes": "useful details" }
  ]
}
Prioritize the most popular/useful connections. Include a mix of train, bus, flight, and ferry where applicable.`
  };
}

function experiencesPrompt(city, country) {
  return {
    system: SYSTEM_BASE,
    user: `Generate 40-60 unique experiences for ${city}, ${country}, categorized by time of day. Return JSON:
{
  "city": "${city}",
  "categories": {
    "Morning": [experiences best done in the morning],
    "Afternoon": [afternoon experiences],
    "Evening": [evening experiences],
    "Full Day": [full day experiences],
    "Anytime": [flexible timing]
  }
}
Each experience:
{
  "name": "descriptive name",
  "description": "2-3 engaging sentences",
  "tips": ["practical tip 1", "tip 2"],
  "address": "real address",
  "best_time": "specific best time",
  "seasonality": "year-round|spring-summer|etc.",
  "duration_minutes": 90,
  "lat": real_latitude, "lon": real_longitude,
  "themes": ["Culture", "Food", "Nature", "History", "Art", "Nightlife", "Shopping", "Adventure"],
  "estimated_cost_eur": 15,
  "pricing_tier": "free|budget|moderate|premium|luxury",
  "booking_url": "https://... or null",
  "scores": {
    "cultural_historical_significance": 1-10,
    "visitor_experience_quality": 1-10,
    "accessibility": 1-10,
    "value_for_money": 1-10,
    "uniqueness": 1-10,
    "photo_appeal": 1-10
  }
}
Include a mix: iconic sights, hidden gems, food experiences, nature, cultural events, nightlife, markets. Use REAL coordinates and addresses.`
  };
}

function walkingRoutesPrompt(city, country) {
  return {
    system: SYSTEM_BASE,
    user: `Generate 4-6 walking routes for ${city}, ${country}. Return JSON:
{ "routes": [...] }
Each route:
{
  "name": "descriptive route name",
  "description": "what you'll see and experience",
  "theme": "History|Art|Food|Architecture|Nature|Local Life",
  "duration_hours": 2.5,
  "distance_km": 3.2,
  "difficulty": "easy|moderate|challenging",
  "best_time": "morning|afternoon|evening",
  "waypoints": [
    { "name": "stop name", "lat": real_lat, "lon": real_lon, "stop_minutes": 15, "description": "why stop here", "tip": "local tip" }
  ],
  "highlights": ["key highlight 1", "key highlight 2"],
  "food_stops": ["recommended food/drink stops along the way"]
}
Routes should be logically walkable with realistic distances. Include varied themes: a historic walk, a food walk, a scenic walk, an off-beaten-path walk.`
  };
}

function eventsPrompt(city, country) {
  return {
    system: SYSTEM_BASE,
    user: `Generate 10-15 major recurring annual events for ${city}, ${country}. Return JSON:
{ "events": [...] }
Each event:
{
  "name": "event name",
  "type": "festival|music|food|cultural|sport|holiday|market|art|religious",
  "description": "2-3 sentence description",
  "start_month": 1-12, "start_day": 1-31,
  "end_month": 1-12, "end_day": 1-31,
  "recurring": true,
  "crowd_impact": "minimal|moderate|significant|extreme",
  "price_impact": "none|low|moderate|high",
  "website": "https://... or null",
  "location": "where in the city",
  "tips": "insider tips for attending",
  "free": true/false
}
Include major national holidays, city-specific festivals, cultural events, food/wine events, music festivals, Christmas markets, etc.`
  };
}

function photoSpotsPrompt(city, country) {
  return {
    system: SYSTEM_BASE,
    user: `Generate 10-15 best photography spots in ${city}, ${country}. Return JSON:
{ "spots": [...] }
Each spot:
{
  "name": "spot name",
  "description": "what makes this photogenic",
  "lat": real_latitude, "lon": real_longitude,
  "best_light": "golden_hour|blue_hour|midday|overcast|night",
  "best_season": "any|spring|summer|autumn|winter",
  "best_time_of_day": "sunrise|morning|afternoon|sunset|night",
  "crowd_tip": "when to visit for fewer people",
  "type": "viewpoint|architecture|street|nature|landmark|interior",
  "equipment_tip": "wide_angle|telephoto|normal|tripod_needed",
  "accessibility": "easy|moderate|difficult",
  "instagram_worthy": true/false,
  "nearby_food": "nearest cafe or restaurant"
}
Include classic postcard views AND lesser-known spots. Vary between landscapes, architecture, street scenes, and nature.`
  };
}

function dayTripsPrompt(city, country) {
  return {
    system: SYSTEM_BASE,
    user: `Generate 5-8 best day trips from ${city}, ${country}. Return JSON:
{ "trips": [...] }
Each trip:
{
  "destination": "place name",
  "description": "2-3 sentences about what to see/do",
  "transport": "train|bus|car|ferry",
  "duration_minutes": travel time one way,
  "cost_roundtrip": "€XX approximate",
  "operator": "transport company",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "full_day": true/false,
  "best_season": "any|spring-summer|etc.",
  "lat": destination_latitude, "lon": destination_longitude,
  "tips": "practical travel tip"
}
Include a mix of nearby cities, nature spots, historic sites, and unique experiences. Use realistic travel times.`
  };
}

// ── Enrichment prompts (for existing data) ──────────────────────────

function enrichAttractionPrompt(attraction, city, country) {
  return {
    system: SYSTEM_BASE + ` You are enriching existing attraction data. Only return the NEW/missing fields to merge, not the full object.`,
    user: `Enrich this attraction in ${city}, ${country}:
Name: ${attraction.name}
Type: ${attraction.type || 'unknown'}
Current fields: ${Object.keys(attraction).join(', ')}

Return JSON with ONLY the missing fields from this list (skip any the attraction already has):
{
  "opening_hours": { "weekday": "hours", "weekend": "hours", "notes": "..." },
  "transit": { "closest_metro": [{ "line": "...", "station": "...", "walk_minutes": N }] },
  "visit_profile": { "min_duration_hours": N, "max_duration_hours": N, "ideal_time_block": "morning|afternoon|evening", "weather_fallback": "..." },
  "official_url": "https://...",
  "website": "https://..."
}
Only return fields that are actually missing. Use real data.`
  };
}

// ── Main pipeline ───────────────────────────────────────────────────

async function generateSectionsForCity(slug, entry, idx) {
  const cityDir = getCityDir(entry);
  const cityName = idx?.overview?.city_name || idx?.city || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const country = entry.country.replace(/-/g, ' ');
  const empty = isCityEmpty(idx);

  console.log(`\n── ${cityName}, ${country} (${slug}) ──`);
  const { sections, score } = getCityCompleteness(idx);
  console.log(`  Completeness: ${score}/7 — ${Object.entries(sections).filter(([,v]) => !v).map(([k]) => k).join(', ') || 'all sections present'}`);

  if (DRY_RUN) {
    const missing = Object.entries(sections).filter(([, v]) => !v).map(([k]) => k);
    console.log(`  [DRY RUN] Would generate: ${missing.join(', ') || 'nothing (already complete)'}`);
    return { city: slug, generated: missing, skipped: [] };
  }

  const generated = [];
  const skipped = [];

  // Generate each missing section
  const sectionGenerators = [
    ['overview', sections.overview, overviewPrompt],
    ['attractions', sections.attractions, attractionsPrompt],
    ['neighborhoods', sections.neighborhoods, neighborhoodsPrompt],
    ['culinary', sections.culinary, culinaryPrompt],
    ['calendar', sections.calendar, calendarPrompt],
    ['seasonal', sections.seasonal, seasonalPrompt],
    ['connections', sections.connections, connectionsPrompt],
  ];

  // If targeting a specific section, filter
  const targets = TARGET_SECTION
    ? sectionGenerators.filter(([name]) => name === TARGET_SECTION || name.startsWith(TARGET_SECTION))
    : sectionGenerators;

  for (const [name, exists, promptFn] of targets) {
    if (exists && !ENRICH) {
      skipped.push(name);
      continue;
    }
    if (ENRICH && exists && name !== 'attractions') {
      skipped.push(name);
      continue;
    }

    try {
      console.log(`  Generating ${name}...`);
      const prompt = promptFn(cityName, country, name === 'attractions' ? (idx?.attractions?.sites?.map(s => s.name) || []) : undefined);
      const data = await callLLM(prompt.system, prompt.user);

      // Write to index.json
      const indexPath = path.join(cityDir, 'index.json');
      const current = readJson(indexPath) || { city: slug, country: entry.country };

      switch (name) {
        case 'overview':
          current.overview = data;
          break;
        case 'attractions':
          current.attractions = { sites: data.sites || data.attractions || [] };
          break;
        case 'neighborhoods':
          current.neighborhoods = { neighborhoods: data.neighborhoods || [] };
          break;
        case 'culinary':
          current.culinaryGuide = data;
          break;
        case 'calendar':
          current.visitCalendar = data;
          // Also write standalone calendar file
          writeJson(path.join(cityDir, `${slug}-visit-calendar.json`), data);
          break;
        case 'seasonal':
          current.seasonalActivities = data;
          break;
        case 'connections':
          current.connections = data;
          break;
      }

      writeJson(indexPath, current);
      generated.push(name);
      console.log(`  ✓ ${name} generated`);

      // Rate limit pause
      await sleep(500);
    } catch (err) {
      console.error(`  ✗ ${name} failed: ${err.message}`);
      skipped.push(name);
    }
  }

  return { city: slug, generated, skipped };
}

async function enrichAttractions(slug, entry, idx) {
  const cityDir = getCityDir(entry);
  const cityName = idx?.overview?.city_name || idx?.city || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const country = entry.country.replace(/-/g, ' ');
  const sites = idx?.attractions?.sites || [];

  if (sites.length === 0) return { city: slug, enriched: 0, total: 0 };

  console.log(`\n── Enriching ${cityName} attractions (${sites.length} sites) ──`);
  let enriched = 0;

  for (const site of sites) {
    const missingFields = [];
    if (!site.opening_hours) missingFields.push('opening_hours');
    if (!site.transit) missingFields.push('transit');
    if (!site.visit_profile) missingFields.push('visit_profile');
    if (!site.official_url && !site.website) missingFields.push('official_url');

    if (missingFields.length === 0) continue;

    if (DRY_RUN) {
      console.log(`  [DRY RUN] ${site.name}: would enrich ${missingFields.join(', ')}`);
      enriched++;
      continue;
    }

    try {
      console.log(`  Enriching ${site.name} (${missingFields.join(', ')})...`);
      const prompt = enrichAttractionPrompt(site, cityName, country);
      const data = await callLLM(prompt.system, prompt.user);

      // Merge only new fields
      for (const [key, value] of Object.entries(data)) {
        if (!site[key] && value) {
          site[key] = value;
        }
      }
      enriched++;
      await sleep(300);
    } catch (err) {
      console.error(`  ✗ ${site.name}: ${err.message}`);
    }
  }

  if (!DRY_RUN && enriched > 0) {
    const indexPath = path.join(cityDir, 'index.json');
    const current = readJson(indexPath) || {};
    current.attractions = { sites };
    writeJson(indexPath, current);
  }

  console.log(`  ✓ Enriched ${enriched}/${sites.length} attractions`);
  return { city: slug, enriched, total: sites.length };
}

async function generateExperiences(slug, entry, idx) {
  const cityDir = getCityDir(entry);
  const cityName = idx?.overview?.city_name || idx?.city || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const country = entry.country.replace(/-/g, ' ');
  const expPath = path.join(cityDir, `${slug}-experiences.json`);

  if (fs.existsSync(expPath)) {
    console.log(`  ${cityName}: experiences already exist, skipping`);
    return false;
  }

  console.log(`  Generating experiences for ${cityName}...`);
  if (DRY_RUN) { console.log(`  [DRY RUN] Would generate ${slug}-experiences.json`); return true; }

  try {
    const prompt = experiencesPrompt(cityName, country);
    const data = await callLLM(prompt.system, prompt.user);
    data.city = cityName;
    data.generated_at = new Date().toISOString();
    const cats = data.categories || {};
    data.items_total = Object.values(cats).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    writeJson(expPath, data);
    console.log(`  ✓ ${cityName}: ${data.items_total} experiences generated`);
    return true;
  } catch (err) {
    console.error(`  ✗ ${cityName}: ${err.message}`);
    return false;
  }
}

async function generateNewDimension(slug, entry, idx, type) {
  const cityDir = getCityDir(entry);
  const cityName = idx?.overview?.city_name || idx?.city || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const country = entry.country.replace(/-/g, ' ');

  const config = {
    'walking-routes': { file: `${slug}_walking_routes.json`, prompt: walkingRoutesPrompt },
    'events': { file: `${slug}_events.json`, prompt: eventsPrompt },
    'photo-spots': { file: `${slug}_photo_spots.json`, prompt: photoSpotsPrompt },
    'day-trips': { file: `${slug}_day_trips.json`, prompt: dayTripsPrompt },
  };

  const cfg = config[type];
  if (!cfg) return false;

  const filePath = path.join(cityDir, cfg.file);
  if (fs.existsSync(filePath)) {
    console.log(`  ${cityName}: ${type} already exists, skipping`);
    return false;
  }

  console.log(`  Generating ${type} for ${cityName}...`);
  if (DRY_RUN) { console.log(`  [DRY RUN] Would generate ${cfg.file}`); return true; }

  try {
    const prompt = cfg.prompt(cityName, country);
    const data = await callLLM(prompt.system, prompt.user);
    data.city = cityName;
    data.country = country;
    data.generated_at = new Date().toISOString();
    writeJson(filePath, data);
    console.log(`  ✓ ${cityName}: ${type} generated`);
    return true;
  } catch (err) {
    console.error(`  ✗ ${cityName}: ${err.message}`);
    return false;
  }
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('=== City Data Generation Pipeline ===');
  console.log(`Model: ${MODEL}`);
  if (DRY_RUN) console.log('MODE: DRY RUN (no changes will be made)');

  const manifest = readJson(MANIFEST_PATH);
  if (!manifest?.cities) {
    console.error('Cannot read manifest.json');
    process.exit(1);
  }

  const allCities = Object.entries(manifest.cities);
  console.log(`Total cities in manifest: ${allCities.length}`);

  // Determine which cities to process
  let targets;
  if (TARGET_CITY) {
    const entry = manifest.cities[TARGET_CITY];
    if (!entry) {
      console.error(`City "${TARGET_CITY}" not found in manifest`);
      process.exit(1);
    }
    targets = [[TARGET_CITY, entry]];
  } else if (EMPTY_ONLY) {
    targets = allCities.filter(([slug, entry]) => {
      const idx = readJson(path.join(getCityDir(entry), 'index.json'));
      return isCityEmpty(idx);
    });
    console.log(`Empty cities to fill: ${targets.length}`);
  } else {
    targets = allCities;
  }

  // Sort by name for consistent output
  targets.sort(([a], [b]) => a.localeCompare(b));

  const results = [];

  // ── Experiences mode ──
  if (GEN_EXPERIENCES) {
    console.log(`\nGenerating experiences for top ${TOP_N} cities...`);
    // Prioritize cities with existing rich data
    const richCities = targets
      .map(([slug, entry]) => {
        const idx = readJson(path.join(getCityDir(entry), 'index.json'));
        const { score } = getCityCompleteness(idx);
        return { slug, entry, idx, score };
      })
      .filter(c => c.score >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N);

    let done = 0;
    for (const { slug, entry, idx } of richCities) {
      const ok = await generateExperiences(slug, entry, idx);
      if (ok) done++;
      await sleep(800);
    }
    console.log(`\n✅ Generated experiences for ${done} cities`);
    return;
  }

  // ── New dimension modes ──
  const dimensionType = GEN_WALKING ? 'walking-routes' : GEN_EVENTS ? 'events' : GEN_PHOTOS ? 'photo-spots' : GEN_DAYTRIPS ? 'day-trips' : null;
  if (dimensionType) {
    console.log(`\nGenerating ${dimensionType} for top ${TOP_N} cities...`);
    const richCities = targets
      .map(([slug, entry]) => {
        const idx = readJson(path.join(getCityDir(entry), 'index.json'));
        const { score } = getCityCompleteness(idx);
        return { slug, entry, idx, score };
      })
      .filter(c => c.score >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N);

    let done = 0;
    for (const { slug, entry, idx } of richCities) {
      const ok = await generateNewDimension(slug, entry, idx, dimensionType);
      if (ok) done++;
      await sleep(800);
    }
    console.log(`\n✅ Generated ${dimensionType} for ${done} cities`);
    return;
  }

  // ── Enrich attractions mode ──
  if (ENRICH && TARGET_SECTION === 'attractions') {
    console.log(`\nEnriching attractions...`);
    for (const [slug, entry] of targets) {
      const idx = readJson(path.join(getCityDir(entry), 'index.json'));
      if (!idx?.attractions?.sites?.length) continue;
      const result = await enrichAttractions(slug, entry, idx);
      results.push(result);
      await sleep(300);
    }
    const totalEnriched = results.reduce((s, r) => s + (r.enriched || 0), 0);
    console.log(`\n✅ Enriched ${totalEnriched} attractions across ${results.length} cities`);
    return;
  }

  // ── Standard generation mode ──
  const totalChunks = Math.ceil(targets.length / CONCURRENCY);
  const estMinPerCity = 4; // ~7 sections × ~35s each
  const estTotalMin = Math.ceil(targets.length / CONCURRENCY) * estMinPerCity;
  console.log(`\nProcessing ${targets.length} cities in chunks of ${CONCURRENCY} (parallel)`);
  console.log(`Estimated time: ~${estTotalMin} min\n`);

  const startTime = Date.now();

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const chunk = targets.slice(i, i + CONCURRENCY);
    const chunkNum = Math.floor(i / CONCURRENCY) + 1;
    const doneSoFar = results.length;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const eta = doneSoFar > 0
      ? Math.round(((Date.now() - startTime) / doneSoFar) * (targets.length - doneSoFar) / 1000)
      : '?';

    console.log(`\n═══ Chunk ${chunkNum}/${totalChunks} — cities: ${chunk.map(([s]) => s).join(', ')}`);
    console.log(`    Progress: ${doneSoFar}/${targets.length} done | elapsed: ${elapsed}s | ETA: ${eta}s`);

    const chunkResults = await Promise.all(chunk.map(async ([slug, entry]) => {
      const indexPath = path.join(getCityDir(entry), 'index.json');
      const idx = readJson(indexPath) || { city: slug, country: entry.country };
      return generateSectionsForCity(slug, entry, idx);
    }));

    results.push(...chunkResults);
  }

  const totalSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`\nTotal generation time: ${Math.floor(totalSec/60)}m ${totalSec%60}s`);

  // ── Report ──
  console.log('\n\n=== GENERATION REPORT ===');
  const genCount = results.filter(r => r.generated?.length > 0).length;
  const totalSections = results.reduce((s, r) => s + (r.generated?.length || 0), 0);
  console.log(`Cities processed: ${results.length}`);
  console.log(`Cities updated: ${genCount}`);
  console.log(`Total sections generated: ${totalSections}`);

  if (!DRY_RUN) {
    console.log('\nRun `npm run generate-cities` to rebuild the city list.');
  }
}

main().catch(err => {
  console.error('Pipeline error:', err);
  process.exit(1);
});
