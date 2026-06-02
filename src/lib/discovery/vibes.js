/**
 * Canonical "vibe" filters for the results page.
 *
 * City data carries `tourismCategories`/`tags` with ~29 overlapping raw values
 * ("Cultural" vs "Cultural Tourism Hubs", "Beach & Coastal" vs "Beach
 * Destinations", "Adventure" vs "Adventure Travel"). Those are too noisy to filter
 * on directly, so we fold them into a small, legible set of vibes. Each vibe lists
 * the lower-cased raw values it absorbs; deriveCityVibes() maps a city's tags to
 * vibe ids.
 */

export const VIBE_DEFS = [
  {
    id: 'beach',
    label: 'Beach & Coast',
    match: ['beach & coastal', 'beach destinations', 'luxury coastlines', 'summer destinations'],
  },
  {
    id: 'culture',
    label: 'Culture & History',
    match: [
      'cultural', 'cultural tourism hubs', 'historical landmarks', 'architecture',
      'artistic & creative hubs', 'industrial heritage', 'university towns',
    ],
  },
  {
    id: 'food',
    label: 'Food & Wine',
    match: ['food & wine', 'gastronomic destinations'],
  },
  {
    id: 'nature',
    label: 'Outdoors & Nature',
    match: [
      'natural landscapes', 'natural wonders', 'northern lights', 'geothermal experiences',
      'adventure', 'adventure tourism', 'adventure travel',
    ],
  },
  {
    id: 'nightlife',
    label: 'Nightlife',
    match: ['nightlife', 'urban exploration'],
  },
  {
    id: 'romance',
    label: 'Romance',
    match: ['romance'],
  },
  {
    id: 'wellness',
    label: 'Wellness & Relax',
    match: ['relaxation', 'wellness & spa'],
  },
  {
    id: 'offbeat',
    label: 'Off the Beaten Path',
    match: ['off the beaten path', 'budget-friendly'],
  },
];

// raw category (lower-cased) → vibe id
const RAW_TO_VIBE = new Map();
for (const v of VIBE_DEFS) {
  for (const raw of v.match) RAW_TO_VIBE.set(raw, v.id);
}

const VIBE_LABEL = new Map(VIBE_DEFS.map((v) => [v.id, v.label]));

export function vibeLabel(id) {
  return VIBE_LABEL.get(id) || id;
}

/**
 * Map a city's raw tags/tourismCategories to canonical vibe ids.
 * @param {{ tags?: string[], tourismCategories?: string[] }} city
 * @returns {string[]} unique vibe ids
 */
export function deriveCityVibes(city) {
  const raw = (Array.isArray(city?.tags) && city.tags.length ? city.tags : city?.tourismCategories) || [];
  const ids = new Set();
  for (const r of raw) {
    const id = RAW_TO_VIBE.get(String(r).toLowerCase().trim());
    if (id) ids.add(id);
  }
  return [...ids];
}
