import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

/**
 * Day Allocator for Multi-City Trips
 *
 * Recommends how many days to spend in each city based on:
 * - Attraction count matching user interests
 * - Trip duration and pace
 * - AI-generated rationale
 */

// Cache for city attractions
const attractionsCache = new Map();

/**
 * Load attractions for a city
 * @param {string} cityId - City ID (e.g., 'paris')
 * @param {string} country - Country name
 * @returns {Array} Array of attraction objects
 */
function loadCityAttractions(cityId, country) {
  const cacheKey = `${country}-${cityId}`;

  if (attractionsCache.has(cacheKey)) {
    return attractionsCache.get(cacheKey);
  }

  try {
    const filePath = path.join(
      process.cwd(),
      'public',
      'data',
      country,
      cityId,
      'sections',
      'attractions.json'
    );

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    const attractions = data.sites || [];
    attractionsCache.set(cacheKey, attractions);
    return attractions;
  } catch (error) {
    console.error(`Failed to load attractions for ${cityId}, ${country}:`, error.message);
    return [];
  }
}

/**
 * Match attraction type to user interests
 * @param {string} attractionType - Attraction type (e.g., "Museum / Gallery")
 * @param {Array} interests - User interests (e.g., ['art', 'culture', 'food'])
 * @returns {boolean} Whether attraction matches any interest
 */
function matchesInterests(attractionType, interests) {
  if (!attractionType || !interests || interests.length === 0) return true;

  const type = attractionType.toLowerCase();
  const interestMap = {
    art: ['museum', 'gallery', 'art', 'exhibition'],
    culture: ['monument', 'historic', 'cultural', 'heritage', 'palace', 'church', 'cathedral'],
    food: ['market', 'culinary', 'restaurant', 'food'],
    history: ['museum', 'monument', 'historic', 'memorial', 'castle', 'palace'],
    architecture: ['monument', 'building', 'arch', 'tower', 'palace', 'cathedral', 'church'],
    nature: ['park', 'garden', 'nature', 'outdoor', 'forest', 'lake'],
    nightlife: ['club', 'bar', 'nightlife', 'entertainment'],
    shopping: ['market', 'shopping', 'boutique', 'mall'],
    adventure: ['outdoor', 'adventure', 'sport', 'hiking'],
    relaxation: ['spa', 'wellness', 'park', 'garden', 'beach']
  };

  for (const interest of interests) {
    const keywords = interestMap[interest.toLowerCase()] || [];
    if (keywords.some(keyword => type.includes(keyword))) {
      return true;
    }
  }

  return false;
}

/**
 * Count attractions matching user interests for a city
 * @param {string} cityId - City ID
 * @param {string} country - Country name
 * @param {Array} interests - User interests
 * @returns {number} Count of matching attractions
 */
function countMatchingAttractions(cityId, country, interests) {
  const attractions = loadCityAttractions(cityId, country);

  if (interests.length === 0) return attractions.length;

  return attractions.filter(att => matchesInterests(att.type, interests)).length;
}

/**
 * Calculate base days needed for a city based on attraction count and pace
 * @param {number} attractionCount - Number of attractions
 * @param {string} pace - Trip pace ('relaxed', 'balanced', 'active')
 * @returns {number} Base days needed
 */
function calculateBaseDays(attractionCount, pace) {
  // Attractions per day based on pace
  const attractionsPerDay = {
    relaxed: 2.5,     // 2-3 attractions per day
    balanced: 3.5,    // 3-4 attractions per day
    active: 5         // 4-6 attractions per day
  };

  const perDay = attractionsPerDay[pace] || attractionsPerDay.balanced;

  return Math.ceil(attractionCount / perDay);
}

/**
 * Generate AI rationale for day allocation
 * @param {Object} cityInfo - City information
 * @param {number} recommendedDays - Recommended days
 * @param {Object} context - Trip context (interests, pace, otherCities)
 * @returns {Promise<string>} AI-generated rationale
 */
async function generateAIRationale(cityInfo, recommendedDays, context) {
  if (!process.env.OPENAI_API_KEY) {
    return `${recommendedDays} days recommended for ${cityInfo.name} based on ${cityInfo.attractionCount} attractions matching your interests.`;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are a travel planner. Recommend ${recommendedDays} days for ${cityInfo.name}, ${cityInfo.country}.

Trip context:
- Total duration: ${context.tripDuration} days
- User interests: ${context.interests.join(', ')}
- Pace: ${context.pace}
- Matching attractions: ${cityInfo.attractionCount}
- Other cities: ${context.otherCities.map(c => c.name).join(', ')}

Provide a 2-3 sentence rationale explaining why ${recommendedDays} days is ideal for ${cityInfo.name}. Focus on:
1. What they can see/do with this time
2. How it fits their pace and interests
3. Why this is the right balance for this multi-city trip

Keep it concise and practical.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful travel planning assistant. Provide concise, practical recommendations.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Failed to generate AI rationale:', error.message);
    return `${recommendedDays} days recommended for ${cityInfo.name} to explore ${cityInfo.attractionCount} attractions matching your interests at a ${context.pace} pace.`;
  }
}

/**
 * Allocate days across multiple cities
 * @param {Array} cities - Array of city objects: [{id, name, country}, ...]
 * @param {number} tripDuration - Total trip duration in days
 * @param {Array} interests - User interests
 * @param {string} pace - Trip pace ('relaxed', 'balanced', 'active')
 * @param {Object} options - Additional options {useAI, minDaysPerCity, maxTravelDays}
 * @returns {Promise<Object>} Day allocation with rationale
 */
export async function allocateDays(cities, tripDuration, interests, pace, options = {}) {
  const {
    useAI = false,
    minDaysPerCity = 2,
    maxTravelDaysPerTransfer = 1
  } = options;

  if (!cities || cities.length === 0) {
    throw new Error('At least 1 city required for day allocation');
  }

  if (cities.length === 1) {
    // Single city - allocate all days
    const cityInfo = {
      ...cities[0],
      attractionCount: countMatchingAttractions(cities[0].id, cities[0].country, interests)
    };

    const rationale = useAI
      ? await generateAIRationale(cityInfo, tripDuration, {
          tripDuration,
          interests,
          pace,
          otherCities: []
        })
      : `${tripDuration} days to explore ${cityInfo.name}'s ${cityInfo.attractionCount} attractions matching your interests.`;

    return {
      allocation: [
        {
          city: cities[0].id,
          name: cities[0].name,
          country: cities[0].country,
          days: tripDuration,
          attractionCount: cityInfo.attractionCount,
          rationale
        }
      ],
      travelDays: 0,
      totalCityDays: tripDuration,
      flexDays: 0
    };
  }

  // Multi-city allocation

  // Step 1: Count matching attractions per city
  const citiesWithCounts = cities.map(city => ({
    ...city,
    attractionCount: countMatchingAttractions(city.id, city.country, interests),
    baseDays: 0
  }));

  // Step 2: Calculate base days needed per city
  citiesWithCounts.forEach(city => {
    city.baseDays = Math.max(
      minDaysPerCity,
      calculateBaseDays(city.attractionCount, pace)
    );
  });

  // Step 3: Reserve travel days (1 day per transfer between cities)
  const travelDays = (cities.length - 1) * maxTravelDaysPerTransfer;

  // Step 4: Calculate available days for activities
  const availableCityDays = tripDuration - travelDays;

  if (availableCityDays < cities.length * minDaysPerCity) {
    throw new Error(
      `Trip duration (${tripDuration} days) is too short for ${cities.length} cities. ` +
      `Need at least ${cities.length * minDaysPerCity + travelDays} days ` +
      `(${minDaysPerCity} days per city + ${travelDays} travel days).`
    );
  }

  // Step 5: Proportionally distribute available days based on base days
  const totalBaseDays = citiesWithCounts.reduce((sum, city) => sum + city.baseDays, 0);

  const allocation = citiesWithCounts.map(city => {
    const proportionalDays = Math.round(
      (city.baseDays / totalBaseDays) * availableCityDays
    );

    return {
      ...city,
      days: Math.max(minDaysPerCity, proportionalDays)
    };
  });

  // Step 6: Adjust to ensure total equals availableCityDays
  let allocatedDays = allocation.reduce((sum, city) => sum + city.days, 0);

  // If we allocated too few days, add to cities with most attractions
  while (allocatedDays < availableCityDays) {
    const citySorted = allocation.sort((a, b) => b.attractionCount - a.attractionCount);
    citySorted[0].days++;
    allocatedDays++;
  }

  // If we allocated too many days, remove from cities with fewest attractions
  while (allocatedDays > availableCityDays) {
    const citySorted = allocation
      .filter(c => c.days > minDaysPerCity)
      .sort((a, b) => a.attractionCount - b.attractionCount);

    if (citySorted.length === 0) break;

    citySorted[0].days--;
    allocatedDays--;
  }

  // Step 7: Generate rationale for each city (optionally with AI)
  const allocationsWithRationale = await Promise.all(
    allocation.map(async (city) => {
      const rationale = useAI
        ? await generateAIRationale(city, city.days, {
            tripDuration,
            interests,
            pace,
            otherCities: cities.filter(c => c.id !== city.id)
          })
        : generateSimpleRationale(city, pace, interests);

      return {
        city: city.id,
        name: city.name,
        country: city.country,
        days: city.days,
        attractionCount: city.attractionCount,
        rationale
      };
    })
  );

  const finalCityDays = allocationsWithRationale.reduce((sum, c) => sum + c.days, 0);
  const flexDays = tripDuration - finalCityDays - travelDays;

  return {
    allocation: allocationsWithRationale,
    travelDays,
    totalCityDays: finalCityDays,
    flexDays
  };
}

/**
 * Generate simple rationale without AI
 * @param {Object} city - City with days and attraction count
 * @param {string} pace - Trip pace
 * @param {Array} interests - User interests
 * @returns {string} Simple rationale
 */
function generateSimpleRationale(city, pace, interests) {
  const paceDescriptions = {
    relaxed: 'leisurely explore',
    balanced: 'comfortably see',
    active: 'efficiently visit'
  };

  const paceDesc = paceDescriptions[pace] || 'explore';

  if (city.attractionCount === 0) {
    return `${city.days} days to discover ${city.name} at a ${pace} pace.`;
  }

  const interestMatch = interests.length > 0
    ? `focusing on ${interests.slice(0, 2).join(' and ')}`
    : 'covering major highlights';

  return `${city.days} days to ${paceDesc} ${city.attractionCount} top attractions in ${city.name}, ${interestMatch}.`;
}
