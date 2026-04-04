/**
 * Lambda handler for the WeatherData action group.
 * Function: get_weather_forecast
 *
 * Calls OpenWeatherMap 7-day forecast API and returns weather
 * for a city + date in the Bedrock Agent response format.
 */

const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

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

async function geocodeCity(city) {
  const res = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error(`Geocode failed: ${res.status}`);
  const data = await res.json();
  if (!data.length) throw new Error(`City not found: ${city}`);
  return { lat: data[0].lat, lon: data[0].lon, name: data[0].name, country: data[0].country };
}

async function getForecast(lat, lon) {
  const res = await fetch(
    `${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&cnt=40`
  );
  if (!res.ok) throw new Error(`Forecast failed: ${res.status}`);
  return res.json();
}

function findForecastForDate(forecastData, targetDate) {
  const items = forecastData.list || [];
  const matching = items.filter((item) => item.dt_txt?.startsWith(targetDate));

  if (matching.length === 0) return null;

  const morning = matching.find((i) => i.dt_txt?.includes('09:00')) || matching[0];
  const afternoon = matching.find((i) => i.dt_txt?.includes('15:00')) || matching[matching.length - 1];

  return {
    date: targetDate,
    morning: {
      temp: morning.main?.temp,
      feels_like: morning.main?.feels_like,
      weather: morning.weather?.[0]?.main,
      description: morning.weather?.[0]?.description,
      wind_speed: morning.wind?.speed,
      humidity: morning.main?.humidity,
      rain_probability: morning.pop,
    },
    afternoon: {
      temp: afternoon.main?.temp,
      feels_like: afternoon.main?.feels_like,
      weather: afternoon.weather?.[0]?.main,
      description: afternoon.weather?.[0]?.description,
      wind_speed: afternoon.wind?.speed,
      humidity: afternoon.main?.humidity,
      rain_probability: afternoon.pop,
    },
    is_bad_weather:
      morning.pop > 0.6 ||
      afternoon.pop > 0.6 ||
      ['Thunderstorm', 'Snow'].includes(morning.weather?.[0]?.main) ||
      ['Thunderstorm', 'Snow'].includes(afternoon.weather?.[0]?.main),
  };
}

export async function handler(event) {
  if (!API_KEY) {
    return bedrockResponse(event, { error: 'OPENWEATHERMAP_API_KEY not configured' });
  }

  const params = Object.fromEntries(
    (event.parameters || []).map((p) => [p.name, p.value])
  );

  const { city, date } = params;

  if (!city) {
    return bedrockResponse(event, { error: 'city parameter is required' });
  }

  const targetDate = date || new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  try {
    const geo = await geocodeCity(city);
    const forecast = await getForecast(geo.lat, geo.lon);
    const dayForecast = findForecastForDate(forecast, targetDate);

    if (!dayForecast) {
      return bedrockResponse(event, {
        city: geo.name,
        country: geo.country,
        date: targetDate,
        error: 'Forecast not available for this date (only covers 5 days ahead)',
      });
    }

    return bedrockResponse(event, {
      city: geo.name,
      country: geo.country,
      ...dayForecast,
    });
  } catch (err) {
    console.error('[weather] error:', err);
    return bedrockResponse(event, { error: err.message });
  }
}
