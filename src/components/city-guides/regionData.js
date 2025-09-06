// regionData.js - Centralized data file
"use client";

// Main geographical regions with all associated data
export const regionThemes = [
  {
    id: 'Western Europe',
    name: 'Western Europe',
    hex: '#3182CE', // Blue
    tailwind: 'bg-blue-500',
    description:
      'Includes France, Belgium, Netherlands, and Luxembourg. Known for its cultural landmarks and historic cities.',
    countries: ['France', 'Belgium', 'Netherlands', 'Luxembourg'],
    languages: ['French', 'Dutch', 'German', 'Luxembourgish', 'Frisian', 'Occitan', 'Breton', 'Alsatian', 'English'],
    languageFamilies: ['Romance', 'Germanic']
  },
  {
    id: 'Central Europe',
    name: 'Central Europe',
    hex: '#38A169', // Green
    tailwind: 'bg-green-500',
    description:
      'Encompasses Germany, Switzerland, Austria, Czech Republic, and Slovakia. Famous for its alpine scenery and historic centers.',
    countries: ['Germany', 'Switzerland', 'Austria', 'Czech Republic', 'Slovakia'],
    languages: ['German', 'French', 'Italian', 'Romansh', 'Czech', 'Slovak', 'Hungarian', 'Slovene', 'Croatian'],
    languageFamilies: ['Germanic', 'Romance', 'Slavic', 'Uralic']
  },
  {
    id: 'Southern Europe',
    name: 'Southern Europe',
    hex: '#DD6B20', // Orange
    tailwind: 'bg-orange-500',
    description:
      'Includes Italy, Spain, Portugal, Greece, and Malta. Offers Mediterranean climate, ancient ruins, and vibrant street life.',
    countries: ['Italy', 'Spain', 'Portugal', 'Greece', 'Malta'],
    languages: ['Italian', 'Spanish', 'Portuguese', 'Greek', 'Maltese', 'Catalan', 'Galician', 'Basque', 'Sardinian'],
    languageFamilies: ['Romance', 'Hellenic', 'Others']
  },
  {
    id: 'Eastern Europe',
    name: 'Eastern Europe',
    hex: '#E53E3E', // Red
    tailwind: 'bg-red-500',
    description:
      'Covers Poland, Hungary, Romania, Bulgaria, Croatia, and Slovenia. Known for its unique heritage and evolving tourism.',
    countries: ['Poland', 'Hungary', 'Romania', 'Bulgaria', 'Croatia', 'Slovenia'],
    languages: ['Polish', 'Hungarian', 'Romanian', 'Bulgarian', 'Croatian', 'Slovene', 'German', 'Italian', 'Romani'],
    languageFamilies: ['Slavic', 'Uralic', 'Romance', 'Others']
  },
  {
    id: 'Northern Europe',
    name: 'Northern Europe',
    hex: '#805AD5', // Purple
    tailwind: 'bg-purple-500',
    description:
      'Encompasses the Nordic and Baltic countries: Denmark, Sweden, Norway, Finland, Iceland, Estonia, Latvia, and Lithuania.',
    countries: ['Denmark', 'Sweden', 'Norway', 'Finland', 'Iceland', 'Estonia', 'Latvia', 'Lithuania'],
    languages: ['Danish', 'Swedish', 'Norwegian', 'Finnish', 'Icelandic', 'Estonian', 'Latvian', 'Lithuanian', 'Russian', 'Sami'],
    languageFamilies: ['Germanic', 'Uralic', 'Baltic']
  },
  {
    id: 'British Isles',
    name: 'British Isles',
    hex: '#2C7A7B', // Teal
    tailwind: 'bg-teal-500',
    description:
      'Covers the United Kingdom and Ireland, celebrated for their rich cultural and historical contributions.',
    countries: ['United Kingdom', 'Ireland'],
    languages: ['English', 'Irish', 'Welsh', 'Scottish Gaelic', 'Scots'],
    languageFamilies: ['Germanic', 'Celtic']
  },
];

// Additional tourism themes
export const tourismRegions = {
  "Cultural Tourism Hubs": "#9932CC",        // Dark Orchid
  "Beach Destinations": "#00BFFF",           // Deep Sky Blue
  "Mountain & Skiing": "#FFFAFA",            // Snow
  "Historical Landmarks": "#8B4513",         // Saddle Brown
  "Natural Landscapes": "#228B22",           // Forest Green
  "Gastronomic Destinations": "#FF8C00",     // Dark Orange
  "Urban Exploration": "#4682B4",            // Steel Blue
  "Religious Tourism": "#DAA520",            // Goldenrod
  "Adventure Travel": "#2E8B57"              // Sea Green
};

// Language family themes
export const linguisticRegions = {
  "Germanic": "#6495ED",        // Cornflower Blue
  "Romance": "#FF6347",         // Tomato
  "Slavic": "#228B22",          // Forest Green
  "Baltic": "#DAA520",          // Goldenrod
  "Celtic": "#9932CC",          // Dark Orchid
  "Hellenic": "#4682B4",        // Steel Blue
  "Uralic": "#FF8C00",          // Dark Orange
  "Turkic": "#8FBC8F",          // Dark Sea Green
  "Multilingual Areas": "#DDA0DD" // Plum
};

// Language data for European countries
export const languagesSpoken = {
  // Western Europe
  "France": ["French", "Occitan", "Breton", "Alsatian"],
  "Belgium": ["Dutch", "French", "German"],
  "Netherlands": ["Dutch", "Frisian", "English"],
  "Luxembourg": ["Luxembourgish", "French", "German", "English"],
  
  // Central Europe
  "Germany": ["German", "Low German", "Sorbian", "Danish", "Frisian"],
  "Switzerland": ["German", "French", "Italian", "Romansh"],
  "Austria": ["German", "Hungarian", "Slovene", "Croatian"],
  "Czech Republic": ["Czech", "Slovak"],
  "Slovakia": ["Slovak", "Hungarian", "Romani"],
  
  // Southern Europe
  "Italy": ["Italian", "German", "French", "Slovene", "Sardinian", "Sicilian"],
  "Spain": ["Spanish", "Catalan", "Galician", "Basque"],
  "Portugal": ["Portuguese", "Mirandese"],
  "Greece": ["Greek", "Turkish", "Macedonian", "Albanian"],
  "Malta": ["Maltese", "English"],
  
  // Eastern Europe
  "Poland": ["Polish", "Silesian", "Kashubian"],
  "Hungary": ["Hungarian", "German", "Romani", "Croatian"],
  "Romania": ["Romanian", "Hungarian", "Romani", "German"],
  "Bulgaria": ["Bulgarian", "Turkish", "Romani"],
  "Croatia": ["Croatian", "Italian", "Hungarian", "Serbian"],
  "Slovenia": ["Slovene", "Italian", "Hungarian", "Croatian"],
  
  // Northern Europe
  "Denmark": ["Danish", "Faroese", "Greenlandic", "German"],
  "Sweden": ["Swedish", "Finnish", "Sami"],
  "Norway": ["Norwegian", "Sami", "Finnish"],
  "Finland": ["Finnish", "Swedish", "Sami"],
  "Iceland": ["Icelandic", "English"],
  "Estonia": ["Estonian", "Russian", "Ukrainian"],
  "Latvia": ["Latvian", "Russian", "Lithuanian"],
  "Lithuania": ["Lithuanian", "Polish", "Russian"],
  
  // British Isles
  "United Kingdom": ["English", "Welsh", "Scottish Gaelic", "Irish", "Scots"],
  "Ireland": ["English", "Irish"]
};

// Language families with their associated languages
export const languageFamilies = {
  "Germanic": ["German", "Dutch", "English", "Danish", "Swedish", "Norwegian", "Icelandic", "Luxembourgish", "Frisian", "Low German", "Faroese"],
  "Romance": ["French", "Italian", "Spanish", "Portuguese", "Romanian", "Catalan", "Galician", "Occitan", "Romansh", "Mirandese", "Sardinian", "Sicilian"],
  "Slavic": ["Polish", "Czech", "Slovak", "Slovene", "Croatian", "Serbian", "Bulgarian", "Macedonian", "Ukrainian", "Russian", "Sorbian", "Silesian", "Kashubian"],
  "Baltic": ["Lithuanian", "Latvian"],
  "Celtic": ["Irish", "Welsh", "Scottish Gaelic", "Breton"],
  "Hellenic": ["Greek"],
  "Uralic": ["Finnish", "Estonian", "Hungarian", "Sami"],
  "Turkic": ["Turkish"],
  "Others": ["Basque", "Maltese", "Romani", "Albanian", "Greenlandic"]
};

// Map countries to tourism themes
export const countryToTourismTheme = {
  "France": ["Cultural Tourism Hubs", "Gastronomic Destinations", "Historical Landmarks"],
  "Italy": ["Cultural Tourism Hubs", "Historical Landmarks", "Gastronomic Destinations"],
  "Switzerland": ["Mountain & Skiing", "Natural Landscapes"],
  "Greece": ["Beach Destinations", "Historical Landmarks"],
  "Spain": ["Beach Destinations", "Cultural Tourism Hubs", "Gastronomic Destinations"],
  "United Kingdom": ["Cultural Tourism Hubs", "Urban Exploration", "Historical Landmarks"],
  "Germany": ["Cultural Tourism Hubs", "Urban Exploration", "Historical Landmarks"],
  "Austria": ["Mountain & Skiing", "Cultural Tourism Hubs"],
  "Portugal": ["Beach Destinations", "Cultural Tourism Hubs"],
  "Netherlands": ["Cultural Tourism Hubs", "Urban Exploration"],
  "Czech Republic": ["Cultural Tourism Hubs", "Historical Landmarks"],
  "Croatia": ["Beach Destinations", "Natural Landscapes"],
  "Norway": ["Natural Landscapes", "Adventure Travel"],
  "Sweden": ["Natural Landscapes", "Urban Exploration"],
  "Ireland": ["Natural Landscapes", "Cultural Tourism Hubs"],
  "Hungary": ["Cultural Tourism Hubs", "Historical Landmarks"],
  "Poland": ["Cultural Tourism Hubs", "Historical Landmarks"],
  "Finland": ["Natural Landscapes", "Adventure Travel"],
  "Denmark": ["Urban Exploration", "Cultural Tourism Hubs"],
  "Iceland": ["Natural Landscapes", "Adventure Travel"]
};

// Helper function to get region color from id
export const getRegionColor = (regionId) => {
  const region = regionThemes.find(r => r.id === regionId);
  return region ? region.hex : "#888888"; // Default gray if not found
};

// Helper function to get region description from id
export const getRegionDescription = (regionId) => {
  const region = regionThemes.find(r => r.id === regionId);
  return region ? region.description : "No description available.";
};

// Helper function to get all countries in a specific region
export const getCountriesInRegion = (regionId) => {
  const region = regionThemes.find(r => r.id === regionId);
  return region ? region.countries : [];
};

// Helper function to get all regions a country belongs to
export const getRegionsForCountry = (countryName) => {
  return regionThemes
    .filter(region => region.countries.includes(countryName))
    .map(region => region.id);
};

// Helper function to get all languages spoken in a country
export const getLanguagesForCountry = (countryName) => {
  return languagesSpoken[countryName] || [];
};

// Helper function to get all countries where a specific language is spoken
export const getCountriesForLanguage = (language) => {
  return Object.entries(languagesSpoken)
    .filter(([_country, languages]) => languages.includes(language))
    .map(([country, _languages]) => country);
};

// Helper function to get the language family for a specific language
export const getLanguageFamily = (language) => {
  for (const [family, languages] of Object.entries(languageFamilies)) {
    if (languages.includes(language)) {
      return family;
    }
  }
  return 'Undefined';
};

// Export all for convenience
export default {
  regionThemes,
  tourismRegions,
  linguisticRegions,
  languagesSpoken,
  languageFamilies,
  countryToTourismTheme,
  getRegionColor,
  getRegionDescription,
  getCountriesInRegion,
  getRegionsForCountry,
  getLanguagesForCountry,
  getCountriesForLanguage,
  getLanguageFamily
};