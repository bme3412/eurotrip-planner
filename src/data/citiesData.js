// src/data/citiesData.js

import { franceCities } from "./franceData";
import { italyCities } from "./italyData";
import { spainCities } from "./spainData";
import { germanyCities } from "./germanyData";
import { netherlandsCities } from "./netherlandsData";
import { ukCities } from "./ukData";
import { belgiumCities } from "./belgiumData";
import { switzerlandCities } from "./switzerlandData";
import { portugalCities } from "./portugalData";
import { austriaCities } from "./austriaData";
import { czechRepublicCities } from "./czechrepublicData";
import { polandCities } from "./polandData";
import { hungaryCities } from "./hungaryData";
import { irelandCities } from "./irelandData";

export const countryFlags = {
  France: "🇫🇷",
  Netherlands: "🇳🇱",
  Belgium: "🇧🇪",
  Germany: "🇩🇪",
  Italy: "🇮🇹",
  Switzerland: "🇨🇭",
  Spain: "🇪🇸",
  Portugal: "🇵🇹",
  "United Kingdom": "🇬🇧",
  Austria: "🇦🇹",
  "Czech Republic": "🇨🇿",
  Poland: "🇵🇱",
  Hungary: "🇭🇺",
  Ireland: "🇮🇪",
  Sweden: "🇸🇪",
  Norway: "🇳🇴",
  Denmark: "🇩🇰",
  Turkey: "🇹🇷",
  Finland: "🇫🇮",
  Romania: "🇷🇴",
  Bulgaria: "🇧🇬",
  Greece: "🇬🇷",
  Iceland: "🇮🇸",
  Serbia: "🇷🇸",
};

export const cityCoordinates = {
  Paris: { lat: 48.8566, lon: 2.3522 },
  Amsterdam: { lat: 52.3676, lon: 4.9041 },
  Brussels: { lat: 50.8503, lon: 4.3517 },
  Berlin: { lat: 52.52, lon: 13.405 },
  Rome: { lat: 41.9028, lon: 12.4964 },
  Milan: { lat: 45.4642, lon: 9.19 },
  Zurich: { lat: 47.3769, lon: 8.5417 },
  Madrid: { lat: 40.4168, lon: -3.7038 },
  Lisbon: { lat: 38.7223, lon: -9.1393 },
  London: { lat: 51.5074, lon: -0.1278 },
  Vienna: { lat: 48.2082, lon: 16.3738 },
  Prague: { lat: 50.0755, lon: 14.4378 },
  Warsaw: { lat: 52.2297, lon: 21.0122 },
  Budapest: { lat: 47.4979, lon: 19.0402 },
  Dublin: { lat: 53.3498, lon: -6.2603 },
  Stockholm: { lat: 59.3293, lon: 18.0686 },
  Oslo: { lat: 59.9139, lon: 10.7522 },
  Copenhagen: { lat: 55.6761, lon: 12.5683 },
  Istanbul: { lat: 41.0082, lon: 28.9784 },
  Helsinki: { lat: 60.1699, lon: 24.9384 },
  Bucharest: { lat: 44.4268, lon: 26.1025 },
  Sofia: { lat: 42.6977, lon: 23.3219 },
  Athens: { lat: 37.9838, lon: 23.7275 },
  Reykjavik: { lat: 64.1466, lon: -21.9426 },
  Belgrade: { lat: 44.7866, lon: 20.4489 },
  // Adding coordinates for additional cities in the guide system
  Nice: { lat: 43.7102, lon: 7.2620 },
  Innsbruck: { lat: 47.2692, lon: 11.4041 },
  Salzburg: { lat: 47.8095, lon: 13.0550 },
  Antwerp: { lat: 51.2194, lon: 4.4025 },
  Barcelona: { lat: 41.3851, lon: 2.1734 },
};

export const destinationsByCountry = {
  France: franceCities,
  Italy: italyCities,
  Spain: spainCities,
  Germany: germanyCities,
  Netherlands: netherlandsCities,
  UK: ukCities,
  Belgium: belgiumCities,
  Switzerland: switzerlandCities,
  Portugal: portugalCities,
  Austria: austriaCities,
  Czechrepublic: czechRepublicCities,
  Poland: polandCities,
  Hungary: hungaryCities,
  Ireland: irelandCities,
};

export const allDestinations = [
  ...franceCities,
  ...italyCities,
  ...spainCities,
  ...germanyCities,
  ...netherlandsCities,
  ...ukCities,
  ...belgiumCities,
  ...switzerlandCities,
  ...portugalCities,
  ...austriaCities,
  ...czechRepublicCities,
  ...polandCities,
  ...hungaryCities,
  ...irelandCities
];

// European regions mapping
export const europeRegions = {
  'Western Europe': ['France', 'Belgium', 'Netherlands', 'Luxembourg'],
  'Central Europe': ['Germany', 'Austria', 'Switzerland', 'Czech Republic', 'Hungary', 'Poland', 'Slovakia'],
  'Southern Europe': ['Spain', 'Italy', 'Portugal', 'Greece', 'Malta', 'Cyprus'],
  'Northern Europe': ['Denmark', 'Finland', 'Sweden', 'Norway', 'Iceland'],
  'British Isles': ['United Kingdom', 'Ireland'],
  'Eastern Europe': ['Estonia', 'Latvia', 'Lithuania', 'Romania', 'Bulgaria', 'Croatia', 'Slovenia']
};

// Enhance city data with additional information for the city guides
export const enhancedCityData = allDestinations.filter(city => city && city.name).map(city => {
  // Find the country for this city
  let country = '';
  for (const [countryName, cities] of Object.entries(destinationsByCountry)) {
    if (cities.some(c => c.name === city.name)) {
      country = countryName === 'UK' ? 'United Kingdom' : 
               countryName === 'Czechrepublic' ? 'Czech Republic' : 
               countryName;
      break;
    }
  }

  // Determine region
  let region = 'Other';
  for (const [regionName, countries] of Object.entries(europeRegions)) {
    if (countries.includes(country)) {
      region = regionName;
      break;
    }
  }

  // Get coordinates
  const coordinates = cityCoordinates[city.name] || { lat: 0, lon: 0 };

  // Generate slug
  const slug = city.name ? city.name.toLowerCase().replace(/\s+/g, '-') : '';

  // Format existing description or create a placeholder
  const description = city.description || 
    `Explore ${city.name}, a beautiful city in ${country} with rich culture, history, and unique attractions.`;

  // Return enhanced city object
  return {
    id: slug,
    name: city.name,
    displayName: city.name,
    slug: slug,
    country: country,
    countryFlag: countryFlags[country] || '',
    region: region,
    description: description,
    coordinates: coordinates,
    image: city.image || `/images/cities/${slug}.jpg`,
    placeholderImage: '/images/city-placeholder.jpg',
    highlights: city.highlights || [],
    bestTimeToVisit: city.bestTimeToVisit || '',
    // Additional fields that might be in original data
    ...city
  };
});

// Helper function to get cities data for the guides interface
export const getCitiesData = () => {
  return enhancedCityData;
};

// Helper function to get city by ID
export const getCityById = (id) => {
  return enhancedCityData.find(city => city.id === id) || null;
};

// Helper function to get cities by country
export const getCitiesByCountry = (country) => {
  return enhancedCityData.filter(city => city.country === country);
};

// Helper function to get cities by region
export const getCitiesByRegion = (region) => {
  return enhancedCityData.filter(city => city.region === region);
};

// Helper function to check if a city has detailed guide data
export const hasCityGuide = (cityId) => {
  const citySlug = typeof cityId === 'string' ? cityId : cityId.id || cityId.slug;
  const country = enhancedCityData.find(city => city.id === citySlug)?.country;
  
  if (!country) return false;
  
  // Format country for folder path
  const countryFolder = country.replace(/\s+/g, '');
  
  // This function would ideally check if the relevant files exist
  // For now, return true for major cities we know have data
  const citiesWithGuides = [
    'paris', 'nice', 'rome', 'milan', 'barcelona', 'madrid',
    'london', 'berlin', 'amsterdam', 'brussels', 'antwerp',
    'vienna', 'salzburg', 'innsbruck', 'prague', 'budapest',
    'dublin', 'copenhagen'
  ];
  
  return citiesWithGuides.includes(citySlug);
};