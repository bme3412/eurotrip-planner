'use client';

// `cityHour` is the current hour (0–23) in the CITY's timezone — pass it so
// "Open Now" reflects local time, not the visitor's. Falls back to the
// visitor's hour only when a city hour isn't available.
export const matchesTimeFilter = (attraction, filter, cityHour) => {
  if (filter === 'all') return true;
  if (!attraction?.best_time) return filter === 'now';
  const currentHour = typeof cityHour === 'number' ? cityHour : new Date().getHours();
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

export const matchesTypeFilter = (attraction, filter) => {
  if (!filter || filter === 'all') return true;
  return String(attraction?.type || attraction?.category || '').toLowerCase() === filter;
};

export const matchesSmartFilters = (attraction, smartFilters, cityHour) => {
  return (
    matchesTimeFilter(attraction, smartFilters.timeFilter, cityHour) &&
    matchesPriceFilter(attraction, smartFilters.priceFilter) &&
    matchesDurationFilter(attraction, smartFilters.durationFilter) &&
    matchesIndoorFilter(attraction, smartFilters.indoorFilter) &&
    matchesTypeFilter(attraction, smartFilters.typeFilter)
  );
};
