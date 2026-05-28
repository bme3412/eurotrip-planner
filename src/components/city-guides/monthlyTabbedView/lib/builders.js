import { RATING_COLORS } from './constants.js';

/**
 * Build the day-cell array for a calendar grid. Leading "empty" slots pad the
 * grid to the first weekday of the month; each real day carries its rating
 * score (1-5), the matching colour, and any events that landed on that day.
 */
export function buildDays(monthIndex, monthData, eventMap = {}) {
  const year = new Date().getFullYear();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDow = new Date(year, monthIndex, 1).getDay();
  const days = [];
  for (let i = 0; i < firstDow; i++) days.push({ type: 'empty' });
  for (let d = 1; d <= daysInMonth; d++) {
    const range = monthData?.ranges?.find((r) => Array.isArray(r.days) && r.days.includes(d));
    const rating = range?.score ?? 3;
    const events = Array.isArray(eventMap[d]) ? eventMap[d] : [];
    days.push({
      type: 'day',
      d,
      rating,
      color: RATING_COLORS[rating],
      events,
      hasEvent: events.length > 0,
    });
  }
  return days;
}
