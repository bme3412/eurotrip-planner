// Design tokens & static config for the itinerary view.
export const GOLD = '#c9963c';

// Time block config — clean labels, dark-mode accent colors
export const TIME_BLOCK = {
  early_morning: { label: 'Early Morning', accent: '#92400e', lineColor: '#92400e50' },
  morning:       { label: 'Morning',       accent: '#b45309', lineColor: '#b4530950' },
  late_morning:  { label: 'Late Morning',  accent: '#b45309', lineColor: '#b4530950' },
  lunch:         { label: 'Lunch',         accent: '#9a3412', lineColor: '#9a341250' },
  afternoon:     { label: 'Afternoon',     accent: '#1d4ed8', lineColor: '#1d4ed850' },
  late_afternoon:{ label: 'Late Afternoon',accent: '#1d4ed8', lineColor: '#1d4ed850' },
  evening:       { label: 'Evening',       accent: '#9f1239', lineColor: '#9f123950' },
  night:         { label: 'Night',         accent: '#5b21b6', lineColor: '#5b21b650' },
};

export const INDOOR_KW = ['museum', 'gallery', 'church', 'cathedral', 'chapel', 'restaurant', 'cafe',
  'bistro', 'brasserie', 'bar', 'market hall', 'library', 'theater', 'theatre', 'opera',
  'cinema', 'palace', 'basilica', 'synagogue', 'mosque', 'crypt', 'aquarium', 'indoor'];

export const OUTDOOR_KW = ['park', 'garden', 'jardin', 'plaza', 'square', 'place', 'beach',
  'plage', 'viewpoint', 'bridge', 'pont', 'river', 'seine', 'walk', 'promenade', 'trail',
  'canal', 'outdoor'];
