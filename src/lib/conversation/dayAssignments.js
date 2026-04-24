/**
 * Day-by-day assignment helpers for the trip planner.
 *
 * The canonical wire format in `tripState` stays nights-based:
 *   route.cities[i] = { id, name, country, role, order, nights, arrivalDate, departureDate, ... }
 *   dates = { startDate, endDate, totalNights, ... }
 *
 * These helpers derive a per-day view (Day N -> cityId | null) and write back
 * into the canonical shape so the agent / mergeTripData / analyzeGaps don't
 * have to learn a new representation.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Format a Date as a local-time YYYY-MM-DD string (avoids UTC drift).
 */
export function toIsoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Parse a YYYY-MM-DD string into a Date pinned to local midnight.
 * Returns null on invalid input.
 */
export function parseIsoDate(value) {
  if (!value || typeof value !== 'string') return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Add `n` whole days to a Date and return a new Date.
 */
export function addDays(date, n) {
  if (!(date instanceof Date)) return null;
  const out = new Date(date.getTime());
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * Compute total trip days (start..end inclusive) from tripState.
 *
 * Priority:
 *   1. dates.startDate + dates.endDate          -> diff + 1
 *   2. dates.startDate + dates.totalNights      -> totalNights + 1
 *   3. sum of route.cities[].nights (+1 if any) -> walking model
 *   4. 0
 */
export function getTripDayCount(tripState) {
  const d = tripState?.dates || {};
  const start = parseIsoDate(d.startDate);
  const end = parseIsoDate(d.endDate);
  if (start && end) {
    const diff = Math.round((end - start) / MS_PER_DAY);
    return Math.max(0, diff + 1);
  }
  if (start && Number.isFinite(d.totalNights) && d.totalNights >= 0) {
    return d.totalNights + 1;
  }
  if (Number.isFinite(d.totalNights) && d.totalNights > 0) {
    return d.totalNights + 1;
  }
  const cities = tripState?.route?.cities || [];
  const nightsSum = cities.reduce((s, c) => s + (Number.isFinite(c.nights) ? c.nights : 0), 0);
  return nightsSum > 0 ? nightsSum + 1 : 0;
}

/**
 * Get the trip's start date as a Date (or null if unknown).
 */
export function getTripStartDate(tripState) {
  return parseIsoDate(tripState?.dates?.startDate);
}

/**
 * Stable city sort by `order` (then by index for ties).
 */
function orderedCities(tripState) {
  const cities = (tripState?.route?.cities || []).map((c, i) => ({ city: c, originalIndex: i }));
  cities.sort((a, b) => {
    const ao = Number.isFinite(a.city.order) ? a.city.order : a.originalIndex;
    const bo = Number.isFinite(b.city.order) ? b.city.order : b.originalIndex;
    if (ao !== bo) return ao - bo;
    return a.originalIndex - b.originalIndex;
  });
  return cities.map((entry) => entry.city);
}

/**
 * Build a per-day view of the trip:
 *   [{ dayIndex, date: 'YYYY-MM-DD' | null, cityId, cityName, role }]
 *
 * Walks `route.cities[]` in `order`, allocating each city's `nights` worth of
 * days starting from `dates.startDate`. The final day is the "checkout" day —
 * by convention we attribute it to the last city if there is one (so a
 * 3-night Paris stay covers days 0,1,2,3 but only counts 3 nights). Gap days
 * stay null.
 *
 * If there's no startDate, day.date will be null but dayIndex still reflects
 * position.
 */
export function buildDayAssignments(tripState) {
  const totalDays = getTripDayCount(tripState);
  if (totalDays === 0) return [];

  const start = getTripStartDate(tripState);
  const cities = orderedCities(tripState);

  const days = Array.from({ length: totalDays }, (_, i) => ({
    dayIndex: i,
    date: start ? toIsoDate(addDays(start, i)) : null,
    cityId: null,
    cityName: null,
    role: null,
  }));

  let cursor = 0;
  for (const city of cities) {
    const nights = Number.isFinite(city.nights) && city.nights > 0 ? city.nights : 0;
    if (nights === 0) continue;

    // Honour an explicit arrivalDate when it falls inside the trip window —
    // this lets intermediate gap days survive a build->apply->build round trip.
    let cityStart = cursor;
    if (start && city.arrivalDate) {
      const parsed = parseIsoDate(city.arrivalDate);
      if (parsed) {
        const offset = Math.round((parsed - start) / MS_PER_DAY);
        if (offset >= cursor && offset < totalDays) {
          cityStart = offset;
        }
      }
    }

    // A "night" in city X means days [cityStart .. cityStart + nights - 1] are spent there.
    // The checkout / departure day is intentionally left unassigned so it can
    // be styled as "Departure" in the UI without inflating night counts.
    for (let i = 0; i < nights && cityStart + i < totalDays; i += 1) {
      const day = days[cityStart + i];
      day.cityId = city.id || city.name?.toLowerCase() || null;
      day.cityName = city.name || null;
      day.role = city.role || null;
    }
    cursor = cityStart + nights;
  }

  return days;
}

/**
 * Recompute each city's nights / arrivalDate / departureDate from a
 * day-assignment array, returning a new tripState.
 *
 * - Contiguous runs of the same cityId become that city's nights.
 * - If a city appears in multiple non-contiguous runs, only the first run
 *   is used (we don't model "split stays" — caller should reorder cities
 *   instead).
 * - Cities present in route.cities but absent from `days` get `nights = 0`
 *   and arrival/departure cleared.
 */
export function applyDayAssignments(tripState, days) {
  const next = JSON.parse(JSON.stringify(tripState || {}));
  next.route = next.route || { cities: [] };
  next.route.cities = next.route.cities || [];

  const start = getTripStartDate(next);

  // First pass: compute first-run nights per cityId.
  const runs = new Map(); // cityId -> { start, length }
  let i = 0;
  while (i < days.length) {
    const id = days[i].cityId;
    if (!id) { i += 1; continue; }
    let j = i;
    while (j < days.length && days[j].cityId === id) j += 1;
    if (!runs.has(id)) {
      runs.set(id, { start: i, length: j - i });
    }
    i = j;
  }

  // Second pass: write back into route.cities, preserving order by run start.
  const cityById = new Map();
  for (const c of next.route.cities) {
    const key = c.id || c.name?.toLowerCase();
    if (key) cityById.set(key, c);
  }

  // Reset all cities first.
  for (const c of next.route.cities) {
    c.nights = 0;
    c.arrivalDate = null;
    c.departureDate = null;
  }

  // Apply runs in chronological order so `order` reflects the schedule.
  const orderedRuns = [...runs.entries()].sort((a, b) => a[1].start - b[1].start);
  let nextOrder = 0;
  for (const [cityId, run] of orderedRuns) {
    const city = cityById.get(cityId);
    if (!city) continue;
    city.nights = run.length;
    city.order = nextOrder;
    nextOrder += 1;
    if (start) {
      city.arrivalDate = toIsoDate(addDays(start, run.start));
      city.departureDate = toIsoDate(addDays(start, run.start + run.length));
    }
  }

  // Cities not in the schedule keep order at the tail in their original order.
  for (const c of next.route.cities) {
    const key = c.id || c.name?.toLowerCase();
    if (!runs.has(key)) {
      c.order = nextOrder;
      nextOrder += 1;
    }
  }

  // Re-derive role assignments: first city = start, last assigned = end.
  const assigned = next.route.cities
    .filter((c) => c.nights > 0)
    .sort((a, b) => a.order - b.order);
  if (assigned.length > 0) {
    assigned.forEach((c, idx) => {
      if (idx === 0) c.role = 'start';
      else if (idx === assigned.length - 1) c.role = 'end';
      else c.role = 'stop';
    });
  }

  return next;
}

/**
 * Assign a contiguous (or non-contiguous) set of day indices to one city.
 * Returns a new tripState. Day indices outside the trip window are ignored.
 *
 * Behaviour:
 *   - The chosen days become `cityId`.
 *   - Any prior owner of those days loses them.
 *   - applyDayAssignments then reflows nights / dates / order.
 */
export function assignDaysToCity(tripState, dayIndices, cityId) {
  if (!cityId || !Array.isArray(dayIndices) || dayIndices.length === 0) return tripState;

  const days = buildDayAssignments(tripState);
  const indexSet = new Set(dayIndices.filter((i) => Number.isInteger(i) && i >= 0 && i < days.length));
  if (indexSet.size === 0) return tripState;

  const cityMeta = (tripState?.route?.cities || []).find(
    (c) => (c.id || c.name?.toLowerCase()) === cityId
  );
  if (!cityMeta) return tripState;

  for (const idx of indexSet) {
    const d = days[idx];
    d.cityId = cityId;
    d.cityName = cityMeta.name || null;
    d.role = cityMeta.role || null;
  }

  return applyDayAssignments(tripState, days);
}

/**
 * Remove ownership for the given day indices, leaving them as gap days.
 */
export function unassignDays(tripState, dayIndices) {
  if (!Array.isArray(dayIndices) || dayIndices.length === 0) return tripState;

  const days = buildDayAssignments(tripState);
  const indexSet = new Set(dayIndices.filter((i) => Number.isInteger(i) && i >= 0 && i < days.length));
  if (indexSet.size === 0) return tripState;

  for (const idx of indexSet) {
    days[idx].cityId = null;
    days[idx].cityName = null;
    days[idx].role = null;
  }

  return applyDayAssignments(tripState, days);
}

/**
 * Set a city's nights to N. Reflows downstream cities' arrival/departure
 * dates without changing the cities[] order.
 */
export function setCityNights(tripState, cityId, nights) {
  if (!cityId || !Number.isFinite(nights) || nights < 0) return tripState;

  const next = JSON.parse(JSON.stringify(tripState || {}));
  next.route = next.route || { cities: [] };
  const cities = next.route.cities || [];

  const target = cities.find((c) => (c.id || c.name?.toLowerCase()) === cityId);
  if (!target) return tripState;

  target.nights = Math.floor(nights);

  const start = getTripStartDate(next);
  if (start) {
    const ordered = orderedCities(next);
    let cursor = 0;
    for (const c of ordered) {
      const n = Number.isFinite(c.nights) && c.nights > 0 ? c.nights : 0;
      if (n === 0) {
        c.arrivalDate = null;
        c.departureDate = null;
        continue;
      }
      c.arrivalDate = toIsoDate(addDays(start, cursor));
      c.departureDate = toIsoDate(addDays(start, cursor + n));
      cursor += n;
    }
  }

  return next;
}

/**
 * Convenience: number of days currently assigned to `cityId`.
 */
export function nightsForCity(tripState, cityId) {
  const c = (tripState?.route?.cities || []).find(
    (city) => (city.id || city.name?.toLowerCase()) === cityId
  );
  return Number.isFinite(c?.nights) ? c.nights : 0;
}

/**
 * Convenience: sum of all assigned nights, useful for "X of Y nights placed".
 */
export function totalAssignedNights(tripState) {
  return (tripState?.route?.cities || []).reduce(
    (sum, c) => sum + (Number.isFinite(c.nights) ? c.nights : 0),
    0
  );
}
