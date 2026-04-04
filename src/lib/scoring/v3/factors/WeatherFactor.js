/**
 * Weather Factor for V3 Scoring
 *
 * Calculates weather score based on:
 * - Temperature comfort (relative to traveler preferences)
 * - Precipitation probability
 * - General conditions (sunny, cloudy, etc.)
 * - UV index and extreme weather warnings
 */

import { BaseFactor } from '../core/BaseFactor.js';
import { normalizeTemperatureComfort } from '../utils/normalizers.js';

export class WeatherFactor extends BaseFactor {
  /**
   * Check if we have weather data.
   */
  hasRequiredData(input) {
    const { enrichmentData, cityData } = input;

    // Need either real-time weather or historical averages
    return !!(
      enrichmentData?.weather ||
      enrichmentData?.forecast ||
      cityData?.climate ||
      cityData?.visitCalendar?.months
    );
  }

  /**
   * Calculate weather score.
   */
  calculate(input) {
    const { enrichmentData, cityData, travelerProfile, startDate } = input;

    // Try real-time weather first
    const weather = enrichmentData?.weather || enrichmentData?.forecast;

    if (weather) {
      return this.calculateFromRealWeather(weather, travelerProfile);
    }

    // Fall back to historical/climate data
    return this.calculateFromClimate(cityData, startDate, travelerProfile);
  }

  /**
   * Calculate from real-time or forecast weather data.
   */
  calculateFromRealWeather(weather, travelerProfile) {
    // Extract temperature (handle various formats)
    const temp = this.extractTemperature(weather);
    const tempScore = this.calculateTempScore(temp, travelerProfile);

    // Precipitation score
    const precipProb = weather.precipitationProbability ?? weather.precipitation_probability ?? weather.rainChance ?? 0;
    const precipScore = this.calculatePrecipScore(precipProb);

    // Conditions score
    const condition = weather.condition || weather.description || weather.weatherCode;
    const conditionScore = this.calculateConditionScore(condition);

    // Weighted combination
    const rawScore = Math.round(
      tempScore * 0.45 +
      precipScore * 0.30 +
      conditionScore * 0.25
    );

    // High confidence for real-time data
    const confidence = weather._fetchedAt ? 0.95 : 0.85;

    // Build human-readable reason
    const tempStr = temp != null ? `${Math.round(temp)}°C` : 'unknown temp';
    const condStr = this.getConditionLabel(condition);

    let reason;
    if (rawScore >= 70) {
      reason = `Great weather: ${tempStr}, ${condStr}`;
    } else if (rawScore >= 50) {
      reason = `Fair weather: ${tempStr}, ${condStr}`;
    } else {
      reason = `Challenging weather: ${tempStr}, ${condStr}`;
    }

    return this.buildResult(
      rawScore,
      confidence,
      reason,
      'api',
      {
        avgTemp: temp,
        condition: condStr,
        precipitationProbability: precipProb,
        tempScore,
        precipScore,
        conditionScore,
      }
    );
  }

  /**
   * Calculate from historical climate/calendar data.
   */
  calculateFromClimate(cityData, startDate, travelerProfile) {
    // Try to get month data
    const month = startDate ? new Date(startDate).getMonth() : new Date().getMonth();
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const monthName = monthNames[month];

    // Check climate data
    if (cityData?.climate?.[monthName]) {
      const climate = cityData.climate[monthName];
      const avgTemp = climate.avgTemp ?? climate.avgHigh ?? climate.temperature;
      const rainfall = climate.rainfall ?? climate.precipitation ?? climate.rainyDays;

      const tempScore = this.calculateTempScore(avgTemp, travelerProfile);
      const precipScore = rainfall != null
        ? this.calculatePrecipScoreFromRainfall(rainfall)
        : 70; // Default if no rain data

      const rawScore = Math.round(tempScore * 0.6 + precipScore * 0.4);

      return this.buildResult(
        rawScore,
        0.6, // Lower confidence for historical
        `Historical avg: ${avgTemp ? Math.round(avgTemp) + '°C' : 'unknown'}`,
        'static',
        {
          avgTemp,
          monthAnalyzed: monthName,
          isHistorical: true,
        }
      );
    }

    // Try visit calendar weather notes
    const calendarMonth = cityData?.visitCalendar?.months?.find(m =>
      m.name?.toLowerCase() === monthName || m.month?.toLowerCase() === monthName
    );

    if (calendarMonth?.weather) {
      const weatherNote = calendarMonth.weather.toLowerCase();
      let score = 60; // Default

      if (weatherNote.includes('hot') || weatherNote.includes('warm') || weatherNote.includes('sunny')) {
        score = 75;
      } else if (weatherNote.includes('mild') || weatherNote.includes('pleasant')) {
        score = 80;
      } else if (weatherNote.includes('cold') || weatherNote.includes('rainy')) {
        score = 45;
      } else if (weatherNote.includes('snow') || weatherNote.includes('freezing')) {
        score = 35;
      }

      return this.buildResult(
        score,
        0.5,
        `Calendar notes: ${calendarMonth.weather}`,
        'static',
        { weatherNote: calendarMonth.weather, monthAnalyzed: monthName }
      );
    }

    // No weather data available
    return this.getFallbackResult('No weather data available');
  }

  /**
   * Extract temperature from various weather data formats.
   */
  extractTemperature(weather) {
    // Direct temperature field
    if (weather.temperature != null) return weather.temperature;
    if (weather.temp != null) return weather.temp;
    if (weather.avgTemp != null) return weather.avgTemp;

    // From high/low
    if (weather.high != null && weather.low != null) {
      return (weather.high + weather.low) / 2;
    }
    if (weather.tempHigh != null && weather.tempLow != null) {
      return (weather.tempHigh + weather.tempLow) / 2;
    }

    // From feels_like
    if (weather.feelsLike != null) return weather.feelsLike;
    if (weather.feels_like != null) return weather.feels_like;

    return null;
  }

  /**
   * Calculate temperature comfort score.
   */
  calculateTempScore(temp, travelerProfile) {
    if (temp == null) return 50;

    // Get preferred temperature range from profile or defaults
    const idealMin = this.getProfileValue(travelerProfile, 'tempMin', 18);
    const idealMax = this.getProfileValue(travelerProfile, 'tempMax', 26);
    const idealMid = (idealMin + idealMax) / 2;

    // Perfect score at ideal, degrades as we move away
    const deviation = Math.abs(temp - idealMid);
    const range = (idealMax - idealMin) / 2;

    if (deviation <= range) {
      // Within ideal range
      return 90 - (deviation / range) * 10;
    }

    // Outside ideal range - linear degradation
    const overRange = deviation - range;
    return Math.max(20, 80 - overRange * 4);
  }

  /**
   * Calculate precipitation score from probability (0-100).
   */
  calculatePrecipScore(precipProb) {
    if (precipProb <= 10) return 95;
    if (precipProb <= 20) return 85;
    if (precipProb <= 30) return 75;
    if (precipProb <= 50) return 60;
    if (precipProb <= 70) return 45;
    return 30;
  }

  /**
   * Calculate precipitation score from rainfall amount (mm).
   */
  calculatePrecipScoreFromRainfall(rainfall) {
    if (rainfall <= 30) return 90;
    if (rainfall <= 60) return 75;
    if (rainfall <= 100) return 60;
    if (rainfall <= 150) return 45;
    return 30;
  }

  /**
   * Calculate condition score from weather description/code.
   */
  calculateConditionScore(condition) {
    if (!condition) return 60;

    const condLower = String(condition).toLowerCase();

    // Sunny/clear conditions
    if (condLower.includes('clear') || condLower.includes('sunny')) {
      return 95;
    }

    // Partly cloudy
    if (condLower.includes('partly') || condLower.includes('few clouds')) {
      return 85;
    }

    // Cloudy but dry
    if (condLower.includes('cloudy') || condLower.includes('overcast')) {
      return 70;
    }

    // Light rain/drizzle
    if (condLower.includes('drizzle') || condLower.includes('light rain')) {
      return 50;
    }

    // Rain
    if (condLower.includes('rain') || condLower.includes('shower')) {
      return 35;
    }

    // Snow
    if (condLower.includes('snow')) {
      return 40; // Can be nice for winter activities
    }

    // Storm/severe
    if (condLower.includes('storm') || condLower.includes('thunder')) {
      return 20;
    }

    // Fog
    if (condLower.includes('fog') || condLower.includes('mist')) {
      return 55;
    }

    // Default for unknown conditions
    return 60;
  }

  /**
   * Get human-readable condition label.
   */
  getConditionLabel(condition) {
    if (!condition) return 'unknown conditions';

    const condLower = String(condition).toLowerCase();

    if (condLower.includes('clear') || condLower.includes('sunny')) return 'sunny';
    if (condLower.includes('partly')) return 'partly cloudy';
    if (condLower.includes('cloudy') || condLower.includes('overcast')) return 'cloudy';
    if (condLower.includes('rain')) return 'rainy';
    if (condLower.includes('snow')) return 'snowy';
    if (condLower.includes('storm')) return 'stormy';
    if (condLower.includes('fog')) return 'foggy';

    return condition;
  }
}
