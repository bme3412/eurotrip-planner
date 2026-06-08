/**
 * Match a booked flight's loose destination (e.g. "PARIS-DEGAULLE, FR") to one of a
 * city's curated getting-in airports (each with a `code`, `name`, `fullName`).
 *
 * Pure + framework-free. Returns the matched airport object, or null when nothing
 * matches and the city has more than one airport (caller falls back to the banner).
 */

// Local/legacy airport names that won't token-match the official `fullName`.
// Normalized (no spaces) substring → IATA code.
const AIRPORT_ALIASES = {
  roissy: 'CDG',
  degaulle: 'CDG',
  charlesdegaulle: 'CDG',
  orly: 'ORY',
  heathrow: 'LHR',
  gatwick: 'LGW',
  stansted: 'STN',
  luton: 'LTN',
  schiphol: 'AMS',
  fiumicino: 'FCO',
  ciampino: 'CIA',
  barajas: 'MAD',
  elprat: 'BCN',
  brandenburg: 'BER',
  malpensa: 'MXP',
  linate: 'LIN',
};

/** Lowercase, strip diacritics + punctuation → space-separated tokens. */
function norm(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Normalized with spaces removed, for substring matching ("degaulle" ⊂ "charlesdegaulle"). */
function squash(s) {
  return norm(s).replace(/\s+/g, '');
}

export function matchArrivalAirport(gettingInData, arrival) {
  const airports = gettingInData?.airports;
  if (!Array.isArray(airports) || airports.length === 0) return null;

  const dest = arrival?.toCity || '';
  if (!dest) return airports.length === 1 ? airports[0] : null;

  // 1) Explicit IATA code token in the destination, e.g. "...CDG...".
  const codes = new Set(airports.map((a) => (a.code || '').toUpperCase()));
  for (const tok of dest.toUpperCase().match(/\b[A-Z]{3}\b/g) || []) {
    if (codes.has(tok)) return airports.find((a) => (a.code || '').toUpperCase() === tok);
  }

  // 2) Score each airport by token overlap with its name/fullName + alias hits.
  const destSquashed = squash(dest);
  const destTokens = norm(dest)
    .split(' ')
    .filter((tk) => tk.length >= 3); // drop country codes like "fr"
  let best = null;
  let bestScore = 0;
  for (const a of airports) {
    const hay = squash(`${a.code} ${a.name} ${a.fullName}`);
    let score = destTokens.reduce((n, tk) => (hay.includes(tk) ? n + 1 : n), 0);
    for (const [alias, code] of Object.entries(AIRPORT_ALIASES)) {
      if ((a.code || '').toUpperCase() === code && destSquashed.includes(alias)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  if (best && bestScore > 0) return best;

  // 3) Single-airport city → that airport regardless of name.
  return airports.length === 1 ? airports[0] : null;
}
