import { Book, Camera, Heart, Moon, Palette, ShoppingBag, Utensils } from 'lucide-react';

// Persona definitions with matching criteria. Each persona maps a user-facing
// label to a set of keywords that we match against `neighborhood.appeal.best_for`.
export const PERSONAS = [
  { id: 'first-timer', label: 'First-timers', icon: Camera, keywords: ['first-time visitors', 'tourists', 'photographers'], color: 'blue' },
  { id: 'art-lover', label: 'Art Lovers', icon: Palette, keywords: ['art lovers', 'art enthusiasts', 'artists', 'art aficionados'], color: 'purple' },
  { id: 'foodie', label: 'Foodies', icon: Utensils, keywords: ['foodies', 'café enthusiasts', 'wine enthusiasts'], color: 'orange' },
  { id: 'history-buff', label: 'History Buffs', icon: Book, keywords: ['history buffs', 'history enthusiasts', 'history lovers'], color: 'amber' },
  { id: 'night-owl', label: 'Night Owls', icon: Moon, keywords: ['night owls', 'nightlife enthusiasts', 'young travelers'], color: 'indigo' },
  { id: 'shopper', label: 'Shoppers', icon: ShoppingBag, keywords: ['shoppers', 'shopaholics', 'fashionistas', 'fashion enthusiasts'], color: 'pink' },
  { id: 'romantic', label: 'Romantics', icon: Heart, keywords: ['romantics', 'couples'], color: 'rose' },
];

// Editor's picks used by the spotlight section.
export const EDITORS_PICKS = [
  { name: 'Le Marais', reason: 'Best all-rounder for first-time visitors' },
  { name: 'Montmartre', reason: 'Most romantic with stunning views' },
  { name: 'Saint-Germain-des-Prés', reason: 'Quintessential Parisian café culture' },
];

// Pre-computed walking times + metro lines between popular Paris neighborhoods.
// Currently Paris-only; other cities fall back to no "nearby" chips.
export const NEIGHBORHOOD_CONNECTIONS = {
  'Le Marais': [
    { to: 'Bastille', walkTime: 10, metro: 'Line 1' },
    { to: 'Île de la Cité', walkTime: 12, metro: 'Line 1, 4' },
    { to: 'Latin Quarter', walkTime: 18, metro: 'Line 7' },
  ],
  'Saint-Germain-des-Prés': [
    { to: 'Latin Quarter', walkTime: 8, metro: 'Line 4' },
    { to: 'Île de la Cité', walkTime: 15, metro: 'Line 4' },
    { to: 'Montparnasse', walkTime: 15, metro: 'Line 4, 12' },
  ],
  'Montmartre': [
    { to: 'Pigalle', walkTime: 5, metro: 'Line 2, 12' },
    { to: 'Canal Saint-Martin', walkTime: 25, metro: 'Line 2 → 5' },
    { to: 'Le Marais', walkTime: 35, metro: 'Line 12 → 1' },
  ],
  'Latin Quarter': [
    { to: 'Saint-Germain-des-Prés', walkTime: 8, metro: 'Line 4' },
    { to: 'Île de la Cité', walkTime: 10, metro: 'Line 4' },
    { to: 'Le Marais', walkTime: 18, metro: 'Line 7' },
  ],
  'Champs-Élysées': [
    { to: 'Le Marais', walkTime: 35, metro: 'Line 1' },
    { to: 'Montmartre', walkTime: 30, metro: 'Line 2' },
    { to: 'La Défense', walkTime: 45, metro: 'Line 1' },
  ],
  'Montparnasse': [
    { to: 'Saint-Germain-des-Prés', walkTime: 15, metro: 'Line 4, 12' },
    { to: 'Latin Quarter', walkTime: 20, metro: 'Line 4' },
    { to: 'Bastille', walkTime: 30, metro: 'Line 6' },
  ],
  'La Défense': [
    { to: 'Champs-Élysées', walkTime: 45, metro: 'Line 1' },
    { to: 'Le Marais', walkTime: 50, metro: 'Line 1' },
  ],
  'Bastille': [
    { to: 'Le Marais', walkTime: 10, metro: 'Line 1, 8' },
    { to: 'Canal Saint-Martin', walkTime: 15, metro: 'Line 5' },
    { to: 'Belleville', walkTime: 20, metro: 'Line 11' },
  ],
  'Belleville': [
    { to: 'Canal Saint-Martin', walkTime: 12, metro: 'Line 2, 11' },
    { to: 'Bastille', walkTime: 20, metro: 'Line 11' },
    { to: 'Le Marais', walkTime: 25, metro: 'Line 11 → 1' },
  ],
  'Canal Saint-Martin': [
    { to: 'Belleville', walkTime: 12, metro: 'Line 2, 11' },
    { to: 'Bastille', walkTime: 15, metro: 'Line 5' },
    { to: 'Le Marais', walkTime: 20, metro: 'Line 5 → 1' },
  ],
  'Île de la Cité': [
    { to: 'Le Marais', walkTime: 12, metro: 'Line 1, 4' },
    { to: 'Latin Quarter', walkTime: 10, metro: 'Line 4' },
    { to: 'Saint-Germain-des-Prés', walkTime: 15, metro: 'Line 4' },
  ],
};

// Build the "insider tips" list for a neighborhood. Combines authored
// `insider_tips` with synthesised tips from practical_info. `limit` caps the
// list (the card teaser/tab use a small cap; the detail modal passes Infinity).
export function getInsiderTips(neighborhood, limit = 3) {
  const tips = [];

  if (neighborhood?.insider_tips && neighborhood.insider_tips.length > 0) {
    tips.push(...neighborhood.insider_tips);
  }

  if (neighborhood?.practical_info?.best_time_to_visit) {
    tips.push(`Best time: ${neighborhood.practical_info.best_time_to_visit}`);
  }

  if (
    neighborhood?.practical_info?.safety &&
    neighborhood.practical_info.safety.toLowerCase().includes('pickpocket')
  ) {
    tips.push('Keep valuables secure - popular area for pickpockets');
  }

  return Number.isFinite(limit) ? tips.slice(0, limit) : tips;
}

// Sort options for the neighborhood grid, computed from the 1–5 category scores.
export const NEIGHBORHOOD_SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'central', label: 'Central first' },
  { id: 'liveliest', label: 'Liveliest' },
  { id: 'cultural', label: 'Most cultural' },
  { id: 'quietest', label: 'Quietest' },
  { id: 'green', label: 'Greenest' },
];

/**
 * Return a sorted copy of `list` for the given sort id. 'recommended' keeps the
 * source (editorial) order. Pure — no mutation of the input.
 */
export function sortNeighborhoods(list, sortBy = 'recommended') {
  const arr = Array.isArray(list) ? [...list] : [];
  const cat = (n, k) => n?.categories?.[k] ?? 0;
  switch (sortBy) {
    case 'central':
      return arr.sort((a, b) => (b.location?.central ? 1 : 0) - (a.location?.central ? 1 : 0));
    case 'liveliest':
      return arr.sort((a, b) => (cat(b, 'nightlife') + cat(b, 'dining')) - (cat(a, 'nightlife') + cat(a, 'dining')));
    case 'cultural':
      return arr.sort((a, b) => (cat(b, 'cultural') + cat(b, 'historic')) - (cat(a, 'cultural') + cat(a, 'historic')));
    case 'quietest':
      return arr.sort((a, b) => (cat(a, 'nightlife') + cat(a, 'touristy')) - (cat(b, 'nightlife') + cat(b, 'touristy')));
    case 'green':
      return arr.sort((a, b) => cat(b, 'green_spaces') - cat(a, 'green_spaces'));
    default:
      return arr;
  }
}

/**
 * Data-driven "nearby neighborhoods" from `location.borders`. Works for any
 * city (not just Paris's hardcoded table). Each border is resolved against the
 * full list so the UI knows whether it can deep-link to it, and enriched with a
 * walk time / metro from NEIGHBORHOOD_CONNECTIONS when that pair is known.
 *
 * Returns [{ name, resolved: neighborhood|null, walkTime: number|null, metro: string|null }].
 */
export function getNearbyNeighborhoods(neighborhood, allNeighborhoods = []) {
  const borders = Array.isArray(neighborhood?.location?.borders) ? neighborhood.location.borders : [];
  const byName = new Map((allNeighborhoods || []).map((n) => [String(n?.name || '').toLowerCase(), n]));
  // Case-insensitive connection lookup so accent/casing drift between the data
  // and NEIGHBORHOOD_CONNECTIONS keys can't silently drop walk times.
  const nameLower = String(neighborhood?.name || '').toLowerCase();
  const connKey = Object.keys(NEIGHBORHOOD_CONNECTIONS).find((k) => k.toLowerCase() === nameLower);
  const conns = (connKey && NEIGHBORHOOD_CONNECTIONS[connKey]) || [];
  const connByName = new Map(conns.map((c) => [String(c.to).toLowerCase(), c]));
  return borders.map((name) => {
    const key = String(name).toLowerCase();
    const conn = connByName.get(key);
    return {
      name,
      resolved: byName.get(key) || null,
      walkTime: conn?.walkTime ?? null,
      metro: conn?.metro ?? null,
    };
  });
}
