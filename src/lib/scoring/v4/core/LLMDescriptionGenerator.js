/**
 * LLM Description Generator for V4 Scoring
 *
 * Uses Claude to generate natural, engaging descriptions for:
 * - Tier paragraphs (2-3 sentences explaining what makes the tier special)
 * - City "whyExpanded" text (2-3 sentences about visiting during these dates)
 *
 * The LLM receives structured data about dates, weather, events, crowds,
 * and attractions to generate contextually rich descriptions.
 */

import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { getCachedLLMDescriptions, cacheLLMDescriptions } from '../../../cache/suggestions.js';
import { titleCaseFromSlug } from '../../../text.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514'; // Fast and capable for short generations

// In-memory fallback when Redis is unavailable
const memoryLLMCache = new Map();
const MAX_LLM_CACHE_ENTRIES = 30;

/**
 * Build a hash key from tier structure + dates for caching.
 */
function buildTierHash(startDate, endDate, tiers) {
  const tierSummary = Object.entries(tiers)
    .filter(([, t]) => t.cities?.length > 0)
    .map(([key, t]) => `${key}:${t.cities.map(c => c.cityId).sort().join(',')}`)
    .join('|');
  return crypto.createHash('md5').update(`${startDate}:${endDate}:${tierSummary}`).digest('hex');
}

/**
 * Build the system prompt for description generation.
 */
function buildSystemPrompt() {
  return `You are a travel copywriter for a European trip planning app. Write compelling, informative descriptions that help travelers understand what visiting a destination would be like during specific dates.

STYLE GUIDELINES:
- Write in present tense, second person ("you'll find", "expect")
- Be specific with data (temperatures, daylight hours, crowd levels)
- Mention actual attractions, events, or seasonal highlights when provided
- Keep descriptions concise but vivid (2-3 sentences max)
- Vary sentence structure - don't start every sentence the same way
- Avoid clichés like "hidden gem", "must-see", or "unforgettable"
- Be honest about trade-offs (crowds, weather limitations)

OUTPUT: Return valid JSON with this exact structure:
{
  "tiers": {
    "tier1": "paragraph for tier 1...",
    "tier2": "paragraph for tier 2...",
    "tier3": "paragraph for tier 3...",
    "tier4": "paragraph for tier 4..."
  },
  "cities": {
    "city-id": "expanded description for city...",
    "another-city": "expanded description..."
  }
}

Only include tiers and cities that have data. Skip empty tiers.`;
}

/**
 * Build the user prompt with all the data.
 */
function buildUserPrompt({ startDate, endDate, tiers }) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const month = monthNames[start.getMonth()];
  const tripLength = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  // Determine season
  const monthNum = start.getMonth();
  let season = 'winter';
  if (monthNum >= 2 && monthNum <= 4) season = 'spring';
  else if (monthNum >= 5 && monthNum <= 7) season = 'summer';
  else if (monthNum >= 8 && monthNum <= 10) season = 'fall';

  // Build tier data summaries
  const tierSummaries = {};
  const cityDetails = {};

  // Limit total cities to keep response manageable
  let totalCities = 0;
  const maxCitiesTotal = 20;

  for (const [tierKey, tier] of Object.entries(tiers)) {
    if (!tier.cities || tier.cities.length === 0) continue;
    if (totalCities >= maxCitiesTotal) break;

    // Aggregate tier-level stats
    const temps = [];
    const crowds = [];
    const events = [];
    const countries = new Set();

    for (const city of tier.cities) {
      const cityId = city.cityId;
      const temp = city.breakdown?.timing?.details?.weatherHighC;
      const crowdLevel = city.breakdown?.crowds?.details?.crowdLevel;
      const event = city.breakdown?.timing?.details?.event;
      const topAttraction = getTopAttraction(city);
      const daylightHours = city.rangeData?.monthData?.daylightHours ||
                            city.rangeData?.monthData?.weatherDetails?.daylightHours;

      if (temp) temps.push(temp);
      if (crowdLevel) crowds.push(crowdLevel);
      if (event) events.push(event);
      countries.add(city.country);

      // Build city-level data for LLM (limit total cities)
      if (totalCities < maxCitiesTotal) {
        cityDetails[cityId] = {
          name: titleCaseFromSlug(cityId),
          country: city.country,
          temp: temp ? `${temp}°C` : null,
          daylightHours: daylightHours ? `${Math.round(daylightHours)}h` : null,
          crowdLevel,
          event,
          topAttraction,
        };
        totalCities++;
      }
    }

    // Calculate tier averages
    const avgTemp = temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : null;
    const dominantCrowd = getMostCommon(crowds);
    const uniqueEvents = [...new Set(events)].slice(0, 3);

    tierSummaries[tierKey] = {
      label: tier.label,
      cityCount: tier.cities.length,
      avgTemp: avgTemp ? `${avgTemp}°C` : null,
      tempRange: temps.length > 0 ? `${Math.min(...temps)}-${Math.max(...temps)}°C` : null,
      dominantCrowd,
      events: uniqueEvents.length > 0 ? uniqueEvents : null,
      countries: [...countries].slice(0, 4),
    };
  }

  // Build the prompt
  return `Generate descriptions for a ${tripLength}-night European trip in ${month} (${season}).

DATES: ${formatDate(start)} – ${formatDate(end)}

TIERS:
${JSON.stringify(tierSummaries, null, 2)}

CITIES:
${JSON.stringify(cityDetails, null, 2)}

For each TIER with cities, write 2-3 sentences describing what makes these destinations special for ${month}. Include weather/daylight if available, and note crowd expectations.

For each CITY, write 2-3 sentences about visiting now. Lead with weather or a highlight, mention the top attraction if provided, and include crowd context.

Return JSON only.`;
}

/**
 * Generate descriptions using Claude.
 *
 * @param {Object} params
 * @param {string} params.startDate - Trip start date
 * @param {string} params.endDate - Trip end date
 * @param {Object} params.tiers - Tier data with cities
 * @returns {Object} - { tiers: {tier1: "...", ...}, cities: {cityId: "...", ...} }
 */
export async function generateDescriptions({ startDate, endDate, tiers }) {
  // Skip if no API key configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[LLMDescriptionGenerator] No ANTHROPIC_API_KEY configured, skipping LLM generation');
    return null;
  }

  // Skip if no tiers with cities
  const hasCities = Object.values(tiers).some(t => t.cities?.length > 0);
  if (!hasCities) {
    return null;
  }

  // Check cache before calling Claude
  const tierHash = buildTierHash(startDate, endDate, tiers);

  // L1: in-memory cache
  const memCached = memoryLLMCache.get(tierHash);
  if (memCached) {
    return memCached;
  }

  // L2: Redis cache
  try {
    const redisCached = await getCachedLLMDescriptions(tierHash);
    if (redisCached) {
      memoryLLMCache.set(tierHash, redisCached.data);
      return redisCached.data;
    }
  } catch (e) {
    // Redis unavailable, continue to LLM call
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({ startDate, endDate, tiers });

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    let response;
    try {
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4000,
        messages: [
          { role: 'user', content: userPrompt },
        ],
        system: systemPrompt,
      });
    } finally {
      clearTimeout(timeout);
    }

    const content = response.content[0]?.text;
    if (!content) {
      console.warn('[LLMDescriptionGenerator] Empty response from Claude');
      return null;
    }

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = content.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      // Find the end of the opening fence
      const firstNewline = jsonStr.indexOf('\n');
      const lastFence = jsonStr.lastIndexOf('```');
      if (firstNewline !== -1 && lastFence > firstNewline) {
        jsonStr = jsonStr.slice(firstNewline + 1, lastFence).trim();
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Cache the result
    if (memoryLLMCache.size >= MAX_LLM_CACHE_ENTRIES) {
      const firstKey = memoryLLMCache.keys().next().value;
      memoryLLMCache.delete(firstKey);
    }
    memoryLLMCache.set(tierHash, parsed);
    cacheLLMDescriptions(tierHash, parsed).catch(() => {});

    return parsed;
  } catch (error) {
    console.error('[LLMDescriptionGenerator] Error generating descriptions:', error.message);
    return null;
  }
}

/**
 * Apply LLM-generated descriptions to tiers and cities.
 *
 * @param {Object} tiers - Tier data object
 * @param {Object} descriptions - LLM response with tiers and cities
 * @returns {Object} - Updated tiers with descriptions
 */
export function applyDescriptions(tiers, descriptions) {
  if (!descriptions) return tiers;

  const updated = { ...tiers };

  // Apply tier paragraphs
  if (descriptions.tiers) {
    for (const [tierKey, paragraph] of Object.entries(descriptions.tiers)) {
      if (updated[tierKey] && paragraph) {
        updated[tierKey] = {
          ...updated[tierKey],
          paragraph,
        };
      }
    }
  }

  // Apply city descriptions
  if (descriptions.cities) {
    for (const tierKey of Object.keys(updated)) {
      if (updated[tierKey].cities) {
        updated[tierKey].cities = updated[tierKey].cities.map(city => {
          const cityDesc = descriptions.cities[city.cityId];
          if (cityDesc) {
            return { ...city, whyExpanded: cityDesc };
          }
          return city;
        });
      }
    }
  }

  return updated;
}

// Helper functions

function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function getMostCommon(arr) {
  if (!arr.length) return null;
  const counts = {};
  arr.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function getTopAttraction(city) {
  const cityData = city.cityData;
  if (!cityData) return null;

  let sites = cityData?.attractions?.sites || cityData?.attractions || [];
  if (!Array.isArray(sites)) sites = sites.sites || [];

  const top = sites[0];
  if (!top?.name) return null;

  let name = top.name;
  if (name.length > 35) {
    name = name.split('(')[0].trim();
    if (name.length > 35) {
      name = name.split(',')[0].trim();
    }
  }
  return name;
}
