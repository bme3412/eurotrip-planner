/**
 * Section -> URL mapping. The ONE place that knows about /public/data layout.
 *
 * Phase B: structured sections and prose are served from the canonical
 * `sections/` subfolder produced by `scripts/content/build.mjs`. Monthly
 * data continues to come from the existing standalone `monthly/*.json`
 * files. The base path uses the legacy cased country folder (e.g.
 * `France/paris`) which is what the canonical build writes to until
 * Phase D performs the bulk rename to lowercase.
 */
import { resolveCity, type CityResolution } from './resolver';

export type Section =
  | 'index'
  | 'overview'
  | 'attractions'
  | 'neighborhoods'
  | 'culinary'
  | 'connections'
  | 'visitCalendar'
  | 'seasonalActivities'
  | 'photos'
  | 'prose.startHere'
  | 'prose.foodGuide'
  | 'prose.seasonal'
  | 'prose.gettingIn'
  | 'monthly'
  | 'monthlyMonth';

export type SectionUrlOptions = {
  /** For 'monthlyMonth' section: month name (january..december, lowercase). */
  month?: string;
};

/**
 * Build a /data/... URL for a given section of a city.
 * Returns the legacy URL during Phase A; will return canonical URLs in Phase B.
 */
export function sectionUrl(
  citySlugOrResolution: string | CityResolution,
  section: Section,
  options: SectionUrlOptions = {}
): string {
  const r =
    typeof citySlugOrResolution === 'string'
      ? resolveCity(citySlugOrResolution)
      : citySlugOrResolution;
  const base = `/data/${r.countryFolder}/${r.citySlug}`;

  switch (section) {
    case 'index':
      return `${base}/index.json`;

    // Phase B: structured sections live in their own files under sections/.
    case 'overview':
      return `${base}/sections/overview.json`;
    case 'attractions':
      return `${base}/sections/attractions.json`;
    case 'neighborhoods':
      return `${base}/sections/neighborhoods.json`;
    case 'culinary':
      return `${base}/sections/culinary.json`;
    case 'connections':
      return `${base}/sections/connections.json`;
    case 'visitCalendar':
      return `${base}/sections/visit-calendar.json`;
    case 'seasonalActivities':
      return `${base}/sections/seasonal-activities.json`;
    case 'photos':
      return `${base}/sections/photos.json`;

    // Prose lives under sections/prose/. The canonical build splits the
    // legacy standalone editorial files (start-here.json etc.) into this
    // subfolder. The originals are retained until Phase D cleanup.
    case 'prose.startHere':
      return `${base}/sections/prose/start-here.json`;
    case 'prose.foodGuide':
      return `${base}/sections/prose/food-guide.json`;
    case 'prose.seasonal':
      return `${base}/sections/prose/seasonal.json`;
    case 'prose.gettingIn':
      return `${base}/sections/prose/getting-in.json`;

    case 'monthly':
      return `${base}/monthly/index.json`;
    case 'monthlyMonth': {
      const m = (options.month || '').toLowerCase();
      if (!m) throw new Error("sectionUrl('monthlyMonth') requires options.month");
      return `${base}/monthly/${m}.json`;
    }
    default: {
      const exhaustive: never = section;
      throw new Error(`Unknown section: ${exhaustive}`);
    }
  }
}

/**
 * Phase A used this to extract sections from the consolidated index.json.
 * Phase B serves each section from its own file; the loader fetches the
 * URL returned by sectionUrl() directly.
 *
 * Retained as a no-op so call sites stay structurally identical. A future
 * refactor can drop it together with the matching branch in loader.ts.
 */
export function indexJsonKey(_section: Section): string | null {
  return null;
}
