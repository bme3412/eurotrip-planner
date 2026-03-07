import { format } from 'date-fns';

/**
 * Transport Booking Deep Link Generator
 *
 * Generates booking URLs for Trainline, Omio, and Skyscanner
 * with pre-filled routes and dates.
 */

// Airport codes for major European cities (primary airports)
const AIRPORT_CODES = {
  // France
  paris: 'CDG',
  lyon: 'LYS',
  marseille: 'MRS',
  nice: 'NCE',
  toulouse: 'TLS',
  bordeaux: 'BOD',
  nantes: 'NTE',
  strasbourg: 'SXB',

  // Spain
  madrid: 'MAD',
  barcelona: 'BCN',
  seville: 'SVQ',
  valencia: 'VLC',
  malaga: 'AGP',
  bilbao: 'BIO',
  mallorca: 'PMI',
  ibiza: 'IBZ',
  granada: 'GRX',

  // Italy
  rome: 'FCO',
  milan: 'MXP',
  venice: 'VCE',
  florence: 'FLR',
  naples: 'NAP',
  bologna: 'BLQ',
  turin: 'TRN',
  palermo: 'PMO',
  catania: 'CTA',

  // Germany
  berlin: 'BER',
  munich: 'MUC',
  frankfurt: 'FRA',
  hamburg: 'HAM',
  cologne: 'CGN',
  dusseldorf: 'DUS',
  stuttgart: 'STR',
  dresden: 'DRS',

  // UK
  london: 'LHR',
  manchester: 'MAN',
  edinburgh: 'EDI',
  glasgow: 'GLA',
  birmingham: 'BHX',
  liverpool: 'LPL',
  bristol: 'BRS',

  // Netherlands
  amsterdam: 'AMS',
  rotterdam: 'RTM',
  eindhoven: 'EIN',

  // Belgium
  brussels: 'BRU',
  antwerp: 'ANR',

  // Austria
  vienna: 'VIE',
  salzburg: 'SZG',
  innsbruck: 'INN',

  // Switzerland
  zurich: 'ZRH',
  geneva: 'GVA',
  basel: 'BSL',
  bern: 'BRN',

  // Portugal
  lisbon: 'LIS',
  porto: 'OPO',
  faro: 'FAO',

  // Greece
  athens: 'ATH',
  thessaloniki: 'SKG',
  heraklion: 'HER',
  rhodes: 'RHO',
  santorini: 'JTR',

  // Czech Republic
  prague: 'PRG',
  brno: 'BRQ',

  // Poland
  warsaw: 'WAW',
  krakow: 'KRK',
  gdansk: 'GDN',
  wroclaw: 'WRO',

  // Hungary
  budapest: 'BUD',

  // Croatia
  zagreb: 'ZAG',
  split: 'SPU',
  dubrovnik: 'DBV',

  // Ireland
  dublin: 'DUB',
  cork: 'ORK',

  // Denmark
  copenhagen: 'CPH',

  // Sweden
  stockholm: 'ARN',
  gothenburg: 'GOT',
  malmo: 'MMX',

  // Norway
  oslo: 'OSL',
  bergen: 'BGO',
  trondheim: 'TRD',

  // Finland
  helsinki: 'HEL',

  // Iceland
  reykjavik: 'KEF'
};

/**
 * Get primary airport code for a city
 * @param {string} cityId - City ID (e.g., 'paris', 'barcelona')
 * @returns {string} IATA airport code or city ID in uppercase
 */
export function getCityAirportCode(cityId) {
  if (!cityId) return '';

  const normalized = cityId.toLowerCase().trim();
  return AIRPORT_CODES[normalized] || cityId.toUpperCase().slice(0, 3);
}

/**
 * Slugify city name for URLs
 * @param {string} cityName - City name (e.g., 'Paris', 'New York')
 * @returns {string} URL-safe slug (e.g., 'paris', 'new-york')
 */
function slugify(cityName) {
  if (!cityName) return '';

  return cityName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/[àáâãäå]/g, 'a') // Replace accented characters
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9-]/g, ''); // Remove non-alphanumeric except hyphens
}

/**
 * Generate Trainline booking URL
 * @param {string} fromCity - Departure city ID
 * @param {string} toCity - Arrival city ID
 * @param {Date|string} date - Travel date
 * @returns {string} Trainline booking URL
 */
export function generateTrainlineLink(fromCity, toCity, date) {
  const fromSlug = slugify(fromCity);
  const toSlug = slugify(toCity);
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');

  return `https://www.trainline.eu/search/${fromSlug}/${toSlug}/${dateStr}`;
}

/**
 * Generate Omio booking URL
 * @param {string} fromCity - Departure city ID
 * @param {string} toCity - Arrival city ID
 * @param {Date|string} date - Travel date
 * @param {string} transportType - 'train', 'bus', 'flight', or null for all options
 * @returns {string} Omio booking URL
 */
export function generateOmioLink(fromCity, toCity, date, transportType = null) {
  const fromSlug = slugify(fromCity);
  const toSlug = slugify(toCity);
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');

  if (transportType) {
    return `https://www.omio.com/search/${transportType}/from/${fromSlug}/to/${toSlug}/departure/${dateStr}`;
  }

  // All transport options
  return `https://www.omio.com/search/from/${fromSlug}/to/${toSlug}/departure/${dateStr}`;
}

/**
 * Generate Skyscanner flight booking URL
 * @param {string} fromCity - Departure city ID
 * @param {string} toCity - Arrival city ID
 * @param {Date|string} date - Travel date
 * @param {Date|string} returnDate - Return date (optional for one-way)
 * @returns {string} Skyscanner booking URL
 */
export function generateSkyscannerLink(fromCity, toCity, date, returnDate = null) {
  const fromAirport = getCityAirportCode(fromCity);
  const toAirport = getCityAirportCode(toCity);
  const departureDateStr = typeof date === 'string'
    ? date.replace(/-/g, '')
    : format(date, 'yyMMdd');

  if (returnDate) {
    const returnDateStr = typeof returnDate === 'string'
      ? returnDate.replace(/-/g, '')
      : format(returnDate, 'yyMMdd');

    return `https://www.skyscanner.com/transport/flights/${fromAirport}/${toAirport}/${departureDateStr}/${returnDateStr}`;
  }

  // One-way flight
  return `https://www.skyscanner.com/transport/flights/${fromAirport}/${toAirport}/${departureDateStr}`;
}

/**
 * Generate Rome2Rio booking URL (alternative multi-modal transport search)
 * @param {string} fromCity - Departure city name
 * @param {string} toCity - Arrival city name
 * @returns {string} Rome2Rio URL
 */
export function generateRome2RioLink(fromCity, toCity) {
  const fromSlug = slugify(fromCity);
  const toSlug = slugify(toCity);

  return `https://www.rome2rio.com/map/${fromSlug}/${toSlug}`;
}

/**
 * Generate appropriate booking link based on transport type
 * @param {string} fromCity - Departure city ID
 * @param {string} toCity - Arrival city ID
 * @param {Date|string} date - Travel date
 * @param {string} transportType - 'train', 'flight', 'bus', 'ferry', 'car'
 * @returns {string} Booking URL
 */
export function generateBookingLink(fromCity, toCity, date, transportType = 'train') {
  switch (transportType?.toLowerCase()) {
    case 'train':
      return generateTrainlineLink(fromCity, toCity, date);

    case 'flight':
      return generateSkyscannerLink(fromCity, toCity, date);

    case 'bus':
      return generateOmioLink(fromCity, toCity, date, 'bus');

    case 'ferry':
      // Use Omio for ferry bookings (they support some ferry routes)
      return generateOmioLink(fromCity, toCity, date);

    case 'car':
      // Rome2Rio for car rental/route planning
      return generateRome2RioLink(fromCity, toCity);

    default:
      // Default to Omio (all transport options)
      return generateOmioLink(fromCity, toCity, date);
  }
}

/**
 * Generate multiple booking options for a route
 * @param {string} fromCity - Departure city ID
 * @param {string} toCity - Arrival city ID
 * @param {Date|string} date - Travel date
 * @returns {Object} Multiple booking URLs
 */
export function generateAllBookingOptions(fromCity, toCity, date) {
  return {
    train: generateTrainlineLink(fromCity, toCity, date),
    flight: generateSkyscannerLink(fromCity, toCity, date),
    bus: generateOmioLink(fromCity, toCity, date, 'bus'),
    allOptions: generateOmioLink(fromCity, toCity, date),
    routePlanner: generateRome2RioLink(fromCity, toCity)
  };
}

/**
 * Get booking URL label based on transport type
 * @param {string} transportType - Transport type
 * @returns {string} User-friendly label
 */
export function getBookingLabel(transportType) {
  const labels = {
    train: 'Book Train on Trainline',
    flight: 'Search Flights on Skyscanner',
    bus: 'Book Bus on Omio',
    ferry: 'Book Ferry on Omio',
    car: 'Plan Route on Rome2Rio'
  };

  return labels[transportType?.toLowerCase()] || 'Search Transport Options';
}
