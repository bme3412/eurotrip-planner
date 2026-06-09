import { addDays, format } from 'date-fns';

/**
 * Plan the calendar for a multi-city trip.
 *
 * The fix this encodes: inter-city travel happens ON the arrival day (the
 * checkout date of the previous city / the day you land in the next), as its own
 * slot — it does NOT add an extra calendar day. So the trip spans exactly
 * sum(nights) + 1 days (the +1 is the final checkout/departure day), and every
 * city's days stay inside its lodging check-in..check-out window.
 *
 * The previous builder advanced the calendar by each city's nights AND an extra
 * day per travel leg, inflating an 11-night trip to 14 days and drifting every
 * city's activity dates past its own checkout.
 *
 * Pure + deterministic so the day/date arithmetic can be unit-tested.
 *
 * @param {Array<{nights:number}>} cities ordered cities with night counts
 * @param {Date|string} startDate trip start (check-in of the first city)
 * @param {object} [opts]
 * @param {boolean} [opts.includeTransfers=true] insert a travel slot between cities
 * @returns {{ totalDays:number, perCityActivityDays:number[], slots:Array }}
 *   slot kinds:
 *     { kind:'travel', date, dayNumber, fromIndex, toIndex, cityIndex }
 *     { kind:'city',   date, dayNumber, cityIndex, activityIndex, isArrival, isDeparture }
 */
export function planTripDays(cities, startDate, { includeTransfers = true } = {}) {
  const list = Array.isArray(cities) ? cities : [];
  const slots = [];
  const perCityActivityDays = [];
  let date = startDate instanceof Date ? new Date(startDate) : new Date(`${startDate}T00:00:00`);
  let dayNumber = 1;

  const push = (slot) => {
    slots.push({ ...slot, date: format(date, 'yyyy-MM-dd'), dayNumber });
    date = addDays(date, 1);
    dayNumber += 1;
  };

  list.forEach((city, k) => {
    const isFirst = k === 0;
    const isLast = k === list.length - 1;
    const nights = Math.max(1, Math.round(Number(city?.nights) || 1));
    const hasTravelIn = includeTransfers && !isFirst;

    // The travel day consumes the arrival night; the last city keeps its
    // checkout day as a final (departure) day. A 1-night middle city collapses
    // to just its travel/arrival day (0 pure activity days).
    const activityDays = Math.max(
      hasTravelIn ? 0 : 1,
      nights - (hasTravelIn ? 1 : 0) + (isLast ? 1 : 0),
    );
    perCityActivityDays.push(activityDays);

    if (hasTravelIn) {
      push({ kind: 'travel', fromIndex: k - 1, toIndex: k, cityIndex: k });
    }
    for (let a = 0; a < activityDays; a += 1) {
      push({
        kind: 'city',
        cityIndex: k,
        activityIndex: a,
        isArrival: a === 0, // first day in this city (post-transfer)
        isDeparture: isLast && a === activityDays - 1,
      });
    }
  });

  return { totalDays: slots.length, perCityActivityDays, slots };
}
