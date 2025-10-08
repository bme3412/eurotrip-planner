'use client';

// Category normalization
export const CATEGORY_MAPPING = {
  'Museum': 'Arts & Culture',
  'Art Gallery': 'Arts & Culture',
  'Theater': 'Arts & Culture',
  'Opera House': 'Arts & Culture',
  'Concert Hall': 'Arts & Culture',
  'Cultural': 'Arts & Culture',
  'Monument': 'Landmarks',
  'Landmark': 'Landmarks',
  'Architecture': 'Landmarks',
  'Government Building': 'Landmarks',
  'Historical': 'Landmarks',
  'Historic District': 'Landmarks',
  'Church': 'Religious Sites',
  'Cathedral': 'Religious Sites',
  'Basilica': 'Religious Sites',
  'Chapel': 'Religious Sites',
  'Religious': 'Religious Sites',
  'Park': 'Nature & Outdoors',
  'Garden': 'Nature & Outdoors',
  'Lake': 'Nature & Outdoors',
  'Zoo': 'Nature & Outdoors',
  'District': 'Urban Spaces',
  'Square': 'Urban Spaces',
  'Street': 'Urban Spaces',
  'Harbor': 'Urban Spaces',
  'Entertainment District': 'Urban Spaces',
  'Food': 'Food & Shopping',
  'Market': 'Food & Shopping',
  'Shopping': 'Food & Shopping',
  'Uncategorized': 'Other'
};

export const MAIN_CATEGORY_COLORS = {
  'Arts & Culture': '#E53E3E',
  'Landmarks': '#DD6B20',
  'Religious Sites': '#805AD5',
  'Nature & Outdoors': '#38A169',
  'Urban Spaces': '#4299E1',
  'Food & Shopping': '#F56565',
  'Other': '#718096'
};

export const getStandardCategory = (type) => {
  if (!type) return 'Other';
  if (CATEGORY_MAPPING[type]) return CATEGORY_MAPPING[type];
  const lower = String(type).toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_MAPPING)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return 'Other';
};

export const getCategoryColor = (category) => {
  const standard = getStandardCategory(category);
  return MAIN_CATEGORY_COLORS[standard] || MAIN_CATEGORY_COLORS.Other;
};

export const computeTopIconicList = (attractions, limit = 12) => {
  if (!Array.isArray(attractions)) return [];
  const typePriority = new Map([
    ['Monument', 8], ['Landmark', 8], ['Cathedral', 7], ['Basilica', 7],
    ['Church', 6], ['Chapel', 6], ['Palace', 6],
    ['Museum', 5], ['Contemporary Art Center', 4], ['Art Center', 4],
    ['Digital Art Center', 4], ['Historic District', 4], ['District', 3]
  ]);
  const scored = attractions.map((site, idx) => {
    const name = site?.name; if (!name) return null;
    const cultural = Number(site?.ratings?.cultural_significance ?? 0);
    const type = String(site?.type || site?.category || 'Other');
    const typeScore = typePriority.get(type) ?? 0;
    const total = cultural * 2 + typeScore + Math.max(0, 5 - (idx % 5));
    return { site, score: total };
  }).filter(Boolean);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.site);
};

export const getMarkerSize = (attraction) => {
  const cultural = attraction?.ratings?.cultural_significance ?? 3;
  const duration = attraction?.ratings?.suggested_duration_hours ?? 1;
  let base = 20 + (Number(cultural) * 4);
  if (duration >= 3) base += 4;
  if (duration >= 4) base += 4;
  return Math.min(base, 48);
};


