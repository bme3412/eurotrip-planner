import { getCityById } from '@/lib/cities/lookup';

export const FIRST_EUROPE_ROUTE_PRESETS = [
  {
    id: 'classic-icons',
    title: 'Classic icons',
    subtitle: 'Paris -> Rome -> Barcelona',
    description: 'Art, ancient history, food, and Mediterranean energy for a first Europe trip.',
    pace: 'balanced',
    nights: 9,
    cities: [
      { id: 'paris', nights: 3 },
      { id: 'rome', nights: 3 },
      { id: 'barcelona', nights: 3 },
    ],
    bestFor: ['First timers', 'Culture', 'Food'],
  },
  {
    id: 'easy-train-capitals',
    title: 'Easy train capitals',
    subtitle: 'London -> Paris -> Amsterdam',
    description: 'A logistically simple big-city route with short hops and strong rail links.',
    pace: 'balanced',
    nights: 9,
    cities: [
      { id: 'london', nights: 3 },
      { id: 'paris', nights: 3 },
      { id: 'amsterdam', nights: 3 },
    ],
    bestFor: ['Train-friendly', 'Museums', 'Nightlife'],
  },
  {
    id: 'central-europe-storybook',
    title: 'Central Europe storybook',
    subtitle: 'Prague -> Vienna -> Budapest',
    description: 'Castles, cafes, thermal baths, music, and beautiful train connections.',
    pace: 'balanced',
    nights: 9,
    cities: [
      { id: 'prague', nights: 3 },
      { id: 'vienna', nights: 3 },
      { id: 'budapest', nights: 3 },
    ],
    bestFor: ['Scenic rail', 'Value', 'Architecture'],
  },
];

export function hydrateRoutePreset(preset) {
  const cities = (preset?.cities || [])
    .map((entry, index) => {
      const city = getCityById(entry.id);
      if (!city) return null;
      return {
        id: city.id,
        name: city.name,
        country: city.country || null,
        latitude: city.latitude || null,
        longitude: city.longitude || null,
        role: index === 0 ? 'start' : index === preset.cities.length - 1 ? 'end' : 'stop',
        order: index,
        nights: entry.nights || null,
        arrivalDate: null,
        departureDate: null,
        notes: null,
      };
    })
    .filter(Boolean);

  return {
    ...preset,
    cities,
    nights: cities.reduce((sum, city) => sum + (city.nights || 0), 0) || preset.nights,
  };
}

export function getFirstEuropeRoutePresets() {
  return FIRST_EUROPE_ROUTE_PRESETS.map(hydrateRoutePreset);
}
