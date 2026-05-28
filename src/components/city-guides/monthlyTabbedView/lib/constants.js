// Original calendar palette: maps a 1-5 visit-quality score to a hex color.
export const RATING_COLORS = { 5: '#10b981', 4: '#34d399', 3: '#fbbf24', 2: '#fb923c', 1: '#ef4444' };

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Month name (any common abbreviation) → 0-based index.
export const MONTH_NAME_TO_INDEX = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

// Pull the `visitCalendar.months[<monthName>]` block for a given month index,
// or null if the calendar isn't loaded yet.
export function getMonthData(visitCalendar, monthIndex) {
  if (!visitCalendar?.months) return null;
  return visitCalendar.months[MONTHS[monthIndex].toLowerCase()] || null;
}
