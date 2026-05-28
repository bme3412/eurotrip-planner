/**
 * Universal city-data loader. Works in both server (RSC) and client contexts.
 *
 * Components should NEVER construct /data/... URLs themselves. They call:
 *   await getCitySection(citySlug, 'attractions')
 *   await getCityIndex(citySlug)
 *
 * The country is resolved internally from /src/generated/cityIndex.
 */
import { fetchCityDataUrl } from './fetchers';
import { resolveCity } from './resolver';
import { indexJsonKey, sectionUrl, type Section } from './sections';

export type LoadOpts = {
  cache?: RequestCache;
  signal?: AbortSignal;
};

/**
 * Fetch the consolidated /data/.../index.json for a city.
 */
export async function getCityIndex<T = any>(citySlug: string, opts: LoadOpts = {}): Promise<T> {
  const url = sectionUrl(citySlug, 'index');
  return fetchCityDataUrl<T>(url, { cache: opts.cache ?? 'force-cache' });
}

/**
 * Fetch a single section of a city's data.
 *
 * In Phase A, sections that live inside index.json (overview, attractions,
 * neighborhoods, culinary, connections, visitCalendar, seasonalActivities,
 * photos) are extracted from the consolidated index. Standalone files
 * (prose.*, monthly) are fetched directly.
 *
 * In Phase B, all sections will have standalone files and the index.json
 * extraction path goes away.
 */
export async function getCitySection<T = any>(
  citySlug: string,
  section: Section,
  opts: LoadOpts & { month?: string } = {}
): Promise<T | null> {
  const resolution = resolveCity(citySlug);
  const key = indexJsonKey(section);

  if (key) {
    // Phase A: section is inside index.json
    const idx = await fetchCityDataUrl<Record<string, any>>(
      sectionUrl(resolution, 'index'),
      { cache: opts.cache ?? 'force-cache' }
    );
    return (idx?.[key] ?? null) as T | null;
  }

  const url = sectionUrl(resolution, section, { month: opts.month });
  try {
    return await fetchCityDataUrl<T>(url, { cache: opts.cache ?? 'force-cache' });
  } catch (err) {
    // Phase A: not all cities have every prose/monthly file. Resolve null
    // rather than throw — components handle missing data with defaults.
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.warn(`[city-data] missing section ${section} for ${citySlug}: ${(err as Error).message}`);
    }
    return null;
  }
}

/**
 * Fetch the aggregated monthly data (all 12 months) for a city.
 */
export async function getCityMonthly<T = any>(citySlug: string, opts: LoadOpts = {}): Promise<T | null> {
  return getCitySection<T>(citySlug, 'monthly', opts);
}

/**
 * Fetch a single month's data for a city.
 */
export async function getCityMonth<T = any>(
  citySlug: string,
  month: string,
  opts: LoadOpts = {}
): Promise<T | null> {
  return getCitySection<T>(citySlug, 'monthlyMonth', { ...opts, month });
}
