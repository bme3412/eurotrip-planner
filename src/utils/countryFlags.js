// Comprehensive country name to emoji flag mapping for European countries
// Include multiple name variants used across the app/manifest

export const countryFlags = {
  // Core Western/Central/Nordic
  Austria: '🇦🇹',
  Belgium: '🇧🇪',
  Denmark: '🇩🇰',
  Finland: '🇫🇮',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Ireland: '🇮🇪',
  Italy: '🇮🇹',
  Netherlands: '🇳🇱',
  Norway: '🇳🇴',
  Portugal: '🇵🇹',
  Spain: '🇪🇸',
  Sweden: '🇸🇪',
  Switzerland: '🇨🇭',
  'United Kingdom': '🇬🇧',
  UK: '🇬🇧',

  // Central/Eastern & Balkans
  'Czech Republic': '🇨🇿',
  Czechia: '🇨🇿',
  Poland: '🇵🇱',
  Hungary: '🇭🇺',
  Romania: '🇷🇴',
  Bulgaria: '🇧🇬',
  Serbia: '🇷🇸',
  Slovakia: '🇸🇰',
  Slovenia: '🇸🇮',
  Croatia: '🇭🇷',
  Bosnia: '🇧🇦',
  'Bosnia and Herzegovina': '🇧🇦',
  'Bosnia-and-Herzegovina': '🇧🇦',
  Montenegro: '🇲🇪',
  Albania: '🇦🇱',
  'North Macedonia': '🇲🇰',
  'North-Macedonia': '🇲🇰',
  Kosovo: '🇽🇰',
  Kosov: '🇽🇰',

  // Baltics
  Estonia: '🇪🇪',
  Latvia: '🇱🇻',
  Lithuania: '🇱🇹',

  // Microstates and others
  Luxembourg: '🇱🇺',
  Monaco: '🇲🇨',
  Malta: '🇲🇹',
  'San Marino': '🇸🇲',
  'San-Marino': '🇸🇲',
  Liechtenstein: '🇱🇮',
  Liechtensetin: '🇱🇮',

  // Nordics & related
  Iceland: '🇮🇸',

  // Mediterranean peripheral
  Greece: '🇬🇷',
  Cyprus: '🇨🇾',
  Turkey: '🇹🇷',
};

export const getFlagForCountry = (countryName) => countryFlags[countryName] || '🏳️';

// Alias for components using the alternate name
export const getCountryFlag = getFlagForCountry;


