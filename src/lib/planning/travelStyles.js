export const TRAVEL_STYLE_OPTIONS = [
  {
    id: 'unhurried',
    label: 'Unhurried discovery',
    headline: 'Leisurely wanderer',
    description: 'Two anchor experiences a day with lingering café time and golden-hour strolls.',
    cues: ['Long lunches & terrace time', 'Hidden courtyards over checklists', 'Evenings free for spontaneity'],
    value: 25,
  },
  {
    id: 'balanced',
    label: 'Balanced explorer',
    headline: 'Balanced explorer',
    description: 'Mix the icons with lighter blocks so you always have time to savor the moment.',
    cues: ['3 planned anchors per day', 'Midday flex windows for shopping or naps', 'Dinner suggestions with options'],
    value: 50,
  },
  {
    id: 'energized',
    label: 'High-energy trailblazer',
    headline: 'High-energy trailblazer',
    description: 'Pack the day with back-to-back highlights, late-night add-ons, and minimal downtime.',
    cues: ['4+ experiences with tight routing', 'Early openings & special access', 'Evening shows or nightlife add-ons'],
    value: 80,
  },
];

export function getTravelStyleForPace(paceInput) {
  if (typeof paceInput !== 'number' || Number.isNaN(paceInput)) {
    return TRAVEL_STYLE_OPTIONS[1];
  }

  if (paceInput <= 35) return TRAVEL_STYLE_OPTIONS[0];
  if (paceInput >= 70) return TRAVEL_STYLE_OPTIONS[2];
  return TRAVEL_STYLE_OPTIONS[1];
}

