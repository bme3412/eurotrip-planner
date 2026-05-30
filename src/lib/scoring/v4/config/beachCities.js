/**
 * Beach / coastal destination identifiers — single source of truth.
 *
 * Imported by both BeachFactor and DynamicWeightCalculator (previously these
 * lists were duplicated and could drift out of sync). Keep `BEACH_CITIES` as a
 * lowercase slug-substring list; matching is substring-based in both directions.
 */

export const BEACH_CATEGORIES = [
  'beach', 'coastal', 'seaside', 'island', 'mediterranean',
  'riviera', 'resort', 'waterfront',
];

export const BEACH_CITIES = [
  // Spain
  'barcelona', 'malaga', 'valencia', 'palma', 'alicante', 'vigo', 'gijon',
  'santander', 'san-sebastian', 'cadiz', 'marbella', 'ibiza', 'sitges',
  // France
  'nice', 'marseille', 'cannes', 'ajaccio', 'biarritz', 'antibes', 'saint-tropez',
  // Italy
  'amalfi', 'rimini', 'naples', 'bari', 'catania', 'palermo', 'genoa', 'trieste',
  'capri', 'cinque-terre', 'cagliari', 'sorrento', 'positano', 'la-spezia',
  // Greece
  'santorini', 'rhodes', 'heraklion', 'mykonos', 'naxos', 'paros', 'kos',
  'chania', 'corfu', 'thessaloniki', 'zakynthos',
  // Portugal
  'lisbon', 'porto', 'faro', 'funchal', 'lagos', 'albufeira', 'cascais',
  // Croatia / Balkans / Adriatic
  'dubrovnik', 'split', 'zadar', 'hvar', 'kotor', 'budva', 'rovinj', 'sibenik',
  // Malta / Cyprus
  'valletta', 'sliema', 'limassol', 'larnaca', 'paphos', 'ayia-napa',
];
