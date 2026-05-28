import { getStandardCategory, getCategoryColor } from '@/components/map/helpers';
import { getAttractionCoords } from '../lib/coords';

/**
 * Convert a list of attractions to a Mapbox-compatible GeoJSON
 * FeatureCollection. Used to drive the `attractions` source for the halo +
 * circle layers underneath the DOM markers.
 *
 * Attractions without resolvable coords are skipped silently.
 */
export function buildAttractionsGeoJson(attractions) {
  const features = (attractions || [])
    .map((attr) => {
      const coords = getAttractionCoords(attr);
      if (!coords) return null;
      const [lng, lat] = coords;
      const category = attr.category || attr.type || 'Uncategorized';
      const standardCategory = getStandardCategory(category);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          name: attr.name,
          category,
          standardCategory,
          description: attr.description || '',
          color: getCategoryColor(category),
        },
      };
    })
    .filter(Boolean);

  return { type: 'FeatureCollection', features };
}
