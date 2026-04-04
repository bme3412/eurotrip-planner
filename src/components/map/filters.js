'use client';

export const matchesTimeFilter = (attraction, filter, tzNow = new Date()) => {
  if (filter === 'all') return true;
  if (!attraction?.best_time) return filter === 'now';
  const currentHour = tzNow.getHours();
  const best = String(attraction.best_time).toLowerCase();
  if (filter === 'now') {
    if (best.includes('morning') && currentHour >= 6 && currentHour < 12) return true;
    if (best.includes('afternoon') && currentHour >= 12 && currentHour < 18) return true;
    if (best.includes('evening') && currentHour >= 18) return true;
    if (best.includes('sunset') && currentHour >= 17 && currentHour < 20) return true;
    return false;
  }
  return best.includes(filter);
};

export const matchesPriceFilter = (attraction, filter) => {
  if (filter === 'all') return true;
  return String(attraction?.price_range || '').toLowerCase() === filter;
};

export const matchesDurationFilter = (attraction, filter) => {
  if (filter === 'all') return true;
  const dur = Number(attraction?.ratings?.suggested_duration_hours ?? 1);
  if (filter === 'quick') return dur <= 1.5;
  if (filter === 'medium') return dur > 1.5 && dur <= 3;
  if (filter === 'long') return dur > 3;
  return true;
};

export const matchesIndoorFilter = (attraction, filter) => {
  if (filter === 'all') return true;
  return Boolean(attraction?.indoor) === (filter === 'indoor');
};

export const matchesSmartFilters = (attraction, smartFilters) => {
  return (
    matchesTimeFilter(attraction, smartFilters.timeFilter) &&
    matchesPriceFilter(attraction, smartFilters.priceFilter) &&
    matchesDurationFilter(attraction, smartFilters.durationFilter) &&
    matchesIndoorFilter(attraction, smartFilters.indoorFilter)
  );
};


