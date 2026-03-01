/**
 * Lambda handler for the CityData action group.
 * Function: get_city_attractions
 *
 * Reads curated city JSON from S3, filters by interests/exclusions,
 * and returns top attractions in the Bedrock Agent response format.
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({});
const BUCKET = process.env.CITY_DATA_BUCKET;

const cityCache = new Map();

async function loadCityData(city) {
  const slug = city.toLowerCase().replace(/\s+/g, '-');
  if (cityCache.has(slug)) return cityCache.get(slug);

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `${slug}.json`,
    });
    const response = await s3.send(command);
    const body = await response.Body.transformToString();
    const data = JSON.parse(body);
    cityCache.set(slug, data);
    return data;
  } catch (err) {
    if (err.name === 'NoSuchKey') return null;
    throw err;
  }
}

function bedrockResponse(event, result) {
  return {
    messageVersion: '1.0',
    response: {
      actionGroup: event.actionGroup,
      function: event.function,
      functionResponse: {
        responseBody: {
          TEXT: { body: JSON.stringify(result) },
        },
      },
    },
  };
}

export async function handler(event) {
  const params = Object.fromEntries(
    (event.parameters || []).map((p) => [p.name, p.value])
  );

  const { city, interests: interestsRaw, exclude_names: excludeRaw } = params;

  if (!city) {
    return bedrockResponse(event, { error: 'city parameter is required' });
  }

  const cityData = await loadCityData(city);
  if (!cityData) {
    return bedrockResponse(event, { error: `No data found for city: ${city}` });
  }

  let attractions = Array.isArray(cityData.attractions) ? cityData.attractions : [];

  let interests = [];
  if (interestsRaw) {
    try { interests = JSON.parse(interestsRaw); } catch { interests = [interestsRaw]; }
  }

  if (interests.length > 0) {
    const interestLower = interests.map((i) => i.toLowerCase());
    attractions = attractions.filter((a) => {
      const text = `${a.type || ''} ${a.name || ''} ${a.description || ''}`.toLowerCase();
      return interestLower.some((tag) => text.includes(tag));
    });
  }

  let excludeNames = [];
  if (excludeRaw) {
    try { excludeNames = JSON.parse(excludeRaw); } catch { excludeNames = [excludeRaw]; }
  }

  if (excludeNames.length > 0) {
    const excludeLower = excludeNames.map((n) => n.toLowerCase());
    attractions = attractions.filter((a) => !excludeLower.includes((a.name || '').toLowerCase()));
  }

  const results = attractions.slice(0, 15).map((a) => ({
    name: a.name,
    type: a.type,
    description: a.description?.slice(0, 150),
    price_range: a.price_range,
    indoor: a.indoor,
    latitude: a.latitude,
    longitude: a.longitude,
    best_time: a.best_time,
  }));

  return bedrockResponse(event, { city, total: results.length, attractions: results });
}
