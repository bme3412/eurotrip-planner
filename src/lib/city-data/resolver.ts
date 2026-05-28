/**
 * Resolve a city slug to its country + folder paths.
 *
 * In Phase A the underlying /public/data URLs are unchanged — this resolver
 * exists so call sites stop passing `country` everywhere. In Phase B/D the
 * internal URL construction switches to lowercase-hyphen canonical folders
 * without any call-site change.
 */
import { cityById } from '@/generated/cityIndex';

export type CityResolution = {
  citySlug: string;        // canonical city slug (lowercase, hyphenated)
  country: string;         // display name of country, e.g. "France"
  countryFolder: string;   // current folder name in /public/data (Phase A: legacy casing)
};

const COUNTRY_FOLDER_MAP: Record<string, string> = {
  'United Kingdom': 'UK',
  'Czech Republic': 'Czechia',
};

export function legacyCountryFolder(country: string | undefined): string {
  if (!country) return 'unknown';
  return COUNTRY_FOLDER_MAP[country] || country;
}

/**
 * Resolve a city slug to its country + current /public/data folder.
 * Falls back to the slug verbatim if the city is not in the generated index.
 */
export function resolveCity(citySlug: string): CityResolution {
  const slug = (citySlug || '').trim().toLowerCase();
  const entry = (cityById as Record<string, { country?: string }>)[slug];
  const country = entry?.country || 'Unknown';
  return {
    citySlug: slug,
    country,
    countryFolder: legacyCountryFolder(country),
  };
}
