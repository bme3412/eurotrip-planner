/**
 * City timezone helpers for the map's "local time" readout and the time-aware
 * "Open Now" filter. Resolves an IANA zone from the city's country (the data's
 * `country` field is a capitalised name like "Germany"); `Intl` then handles
 * DST automatically. Pure functions — no DOM, no React.
 */

// Country (as it appears in city data) → IANA timezone. Europe is mostly a
// handful of zones; this covers every country in the dataset.
const COUNTRY_TZ = {
  Albania: 'Europe/Tirane',
  Austria: 'Europe/Vienna',
  Belgium: 'Europe/Brussels',
  'Bosnia and Herzegovina': 'Europe/Sarajevo',
  Bulgaria: 'Europe/Sofia',
  Croatia: 'Europe/Zagreb',
  Cyprus: 'Asia/Nicosia',
  Czechia: 'Europe/Prague',
  'Czech Republic': 'Europe/Prague',
  Denmark: 'Europe/Copenhagen',
  Estonia: 'Europe/Tallinn',
  Finland: 'Europe/Helsinki',
  France: 'Europe/Paris',
  Germany: 'Europe/Berlin',
  Greece: 'Europe/Athens',
  Hungary: 'Europe/Budapest',
  Iceland: 'Atlantic/Reykjavik',
  Ireland: 'Europe/Dublin',
  Italy: 'Europe/Rome',
  Latvia: 'Europe/Riga',
  Lithuania: 'Europe/Vilnius',
  Luxembourg: 'Europe/Luxembourg',
  Malta: 'Europe/Malta',
  Moldova: 'Europe/Chisinau',
  Montenegro: 'Europe/Podgorica',
  Netherlands: 'Europe/Amsterdam',
  'North Macedonia': 'Europe/Skopje',
  Norway: 'Europe/Oslo',
  Poland: 'Europe/Warsaw',
  Portugal: 'Europe/Lisbon',
  Romania: 'Europe/Bucharest',
  Serbia: 'Europe/Belgrade',
  Slovakia: 'Europe/Bratislava',
  Slovenia: 'Europe/Ljubljana',
  Spain: 'Europe/Madrid',
  Sweden: 'Europe/Stockholm',
  Switzerland: 'Europe/Zurich',
  Turkey: 'Europe/Istanbul',
  'Türkiye': 'Europe/Istanbul',
  Ukraine: 'Europe/Kyiv',
  'United Kingdom': 'Europe/London',
  UK: 'Europe/London',
};

/** Resolve an IANA timezone for a city; null when unknown (caller can fall back). */
export function resolveTimeZone(country) {
  if (country && COUNTRY_TZ[country]) return COUNTRY_TZ[country];
  return null;
}

/** The current hour (0–23) in the given IANA zone, or null if it can't resolve. */
export function cityHourIn(tz, now = new Date()) {
  if (!tz) return null;
  try {
    const h = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      hourCycle: 'h23',
      timeZone: tz,
    }).format(now);
    const n = Number(h);
    return Number.isFinite(n) ? n % 24 : null;
  } catch {
    return null;
  }
}

/** Formatted "HH:MM" in the given IANA zone, or '' on failure. */
export function formatCityTime(tz, now = new Date()) {
  if (!tz) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      hourCycle: 'h23',
      timeZone: tz,
    }).format(now);
  } catch {
    return '';
  }
}
