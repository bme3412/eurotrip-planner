/**
 * Generate an ICS (iCalendar) file from a trip with days and activities.
 */

const TIME_BLOCK_DEFAULTS = {
  morning: { start: '09:00', end: '12:00' },
  lunch: { start: '12:00', end: '13:30' },
  afternoon: { start: '14:00', end: '17:00' },
  evening: { start: '18:00', end: '21:00' },
  night: { start: '21:00', end: '23:00' },
};

function escapeICS(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatICSDate(dateStr, timeStr) {
  const date = dateStr.replace(/-/g, '');
  if (!timeStr) return date;
  const time = timeStr.replace(/:/g, '').slice(0, 4) + '00';
  return `${date}T${time}`;
}

/**
 * Generate an ICS string for the entire trip.
 * @param {object} trip — full trip object with days[].activities[]
 * @returns {string} ICS file content
 */
export function generateICS(trip) {
  const cityName = (trip.city || '').charAt(0).toUpperCase() + (trip.city || '').slice(1);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EuroTrip Planner//EN',
    `X-WR-CALNAME:${escapeICS(trip.title || `${cityName} Trip`)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const day of trip.days || []) {
    for (const act of day.activities || []) {
      if (act.status === 'weather_swapped' || act.status === 'skipped') continue;

      const defaults = TIME_BLOCK_DEFAULTS[act.time_block] || TIME_BLOCK_DEFAULTS.morning;
      const startTime = act.start_time || defaults.start;

      let endTime = act.end_time || defaults.end;
      if (act.duration_minutes && act.start_time) {
        const [h, m] = act.start_time.split(':').map(Number);
        const totalMin = h * 60 + m + act.duration_minutes;
        endTime = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
      }

      const dtStart = formatICSDate(day.date, startTime);
      const dtEnd = formatICSDate(day.date, endTime);

      const descParts = [];
      if (act.description) descParts.push(act.description);
      if (act.latitude && act.longitude) {
        descParts.push(`Google Maps: https://www.google.com/maps?q=${act.latitude},${act.longitude}`);
      }

      const location = act.address || act.neighborhood || '';

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${act.id || `${day.date}-${act.sort_order}`}@eurotrip-planner`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${escapeICS(act.name)}`);
      if (location) lines.push(`LOCATION:${escapeICS(location)}`);
      if (descParts.length) lines.push(`DESCRIPTION:${escapeICS(descParts.join('\\n'))}`);
      if (act.booking_url) lines.push(`URL:${act.booking_url}`);
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
