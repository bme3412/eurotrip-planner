import { MONTH_NAMES } from './constants';
import { cachedFetch, withCache, generateCacheKey, CACHE_CONFIG } from '@/lib/mapCache';

/**
 * Fetch city rating for a specific date range
 * @param {Object} city - City object
 * @param {string} startDate - Start date in ISO format
 * @param {string} endDate - End date in ISO format
 * @returns {Promise<number>} - Average rating for the date range
 */
export const getCityRatingForDateRange = async (city, startDate, endDate) => {
  try {
    const cityName = city.title.toLowerCase();
    const countryName = city.country;
    const calendarPath = `/data/${countryName}/${cityName}/${cityName}-visit-calendar.json`;
    
    // Use cached fetch for calendar data
    const cacheKey = generateCacheKey('calendar', cityName, countryName);
    const calendar = await cachedFetch(calendarPath, cacheKey, CACHE_CONFIG.CALENDAR_CACHE_DURATION);
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    // Calculate total days in the trip
    const totalTripDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Initialize tracking variables
    let dayScoresSum = 0;
    let daysWithScores = 0;
    const monthsInRange = new Set();
    const monthData = {};
    
    // Process each day in the date range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const month = MONTH_NAMES[currentDate.getMonth()];
      const day = currentDate.getDate();
      
      // Track months for weather and tourism data
      if (!monthsInRange.has(month) && calendar.months[month]) {
        monthsInRange.add(month);
        const data = calendar.months[month];
        monthData[month] = {
          weatherHighC: data.weatherHighC,
          weatherLowC: data.weatherLowC,
          tourismLevel: data.tourismLevel
        };
      }
      
      // Get day score
      if (calendar.months[month]) {
        let foundScore = false;
        
        for (const range of calendar.months[month].ranges) {
          if (range.days.includes(day)) {
            // Base day score (1-5)
            let dayScore = range.score;
            
            // Add bonus for special events
            if (range.special === true) {
              dayScore += 0.5;
            }
            
            // Cap at 5
            dayScore = Math.min(5, dayScore);
            
            dayScoresSum += dayScore;
            daysWithScores++;
            foundScore = true;
            break;
          }
        }
        
        // If no specific score found for this day, use month average
        if (!foundScore && calendar.months[month].ranges.length > 0) {
          // Calculate month average if not already done
          if (!monthData[month].avgScore) {
            const ranges = calendar.months[month].ranges;
            const totalScore = ranges.reduce((sum, range) => sum + range.score * range.days.length, 0);
            const totalDays = ranges.reduce((sum, range) => sum + range.days.length, 0);
            monthData[month].avgScore = totalDays > 0 ? totalScore / totalDays : 3; // Default to average
          }
          
          dayScoresSum += monthData[month].avgScore;
          daysWithScores++;
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // If we have less than 60% coverage with day scores, fill in with averages
    const coverage = daysWithScores / totalTripDays;
    if (coverage < 0.6 && monthsInRange.size > 0) {
      // Add average scores for the missing days
      const missingDays = totalTripDays - daysWithScores;
      const avgMonthScore = Array.from(monthsInRange)
        .filter(month => monthData[month] && monthData[month].avgScore)
        .reduce((sum, month) => sum + monthData[month].avgScore, 0) / 
        Array.from(monthsInRange).filter(month => monthData[month] && monthData[month].avgScore).length || 3;
      
      dayScoresSum += avgMonthScore * missingDays;
      daysWithScores = totalTripDays;
    }
    
    // Calculate base score from days
    const baseScore = daysWithScores > 0 ? dayScoresSum / daysWithScores : 0;
    
    // Calculate additional factors
    let weatherScore = 0;
    let tourismScore = 0;
    
    Array.from(monthsInRange).forEach(month => {
      if (!monthData[month]) return;
      
      // Weather score
      if (monthData[month].weatherHighC && monthData[month].weatherLowC) {
        const avgTemp = (monthData[month].weatherHighC + monthData[month].weatherLowC) / 2;
        
        if (avgTemp >= 15 && avgTemp <= 25) {
          weatherScore += 5; // Ideal temperature
        } else if (avgTemp >= 10 && avgTemp < 15 || avgTemp > 25 && avgTemp <= 30) {
          weatherScore += 4; // Good temperature
        } else if (avgTemp >= 5 && avgTemp < 10 || avgTemp > 30 && avgTemp <= 35) {
          weatherScore += 3; // Acceptable temperature
        } else if (avgTemp >= 0 && avgTemp < 5 || avgTemp > 35) {
          weatherScore += 2; // Less ideal temperature
        } else {
          weatherScore += 1; // Poor temperature
        }
      }
      
      // Tourism level score (inverted - lower crowds are better)
      if (monthData[month].tourismLevel) {
        // Convert 1-10 scale to 1-5 and invert
        tourismScore += 6 - Math.min(5, Math.ceil(monthData[month].tourismLevel / 2));
      }
    });
    
    // Average the additional factors
    const avgWeatherScore = monthsInRange.size > 0 ? weatherScore / monthsInRange.size : 3;
    const avgTourismScore = monthsInRange.size > 0 ? tourismScore / monthsInRange.size : 3;
    
    // Calculate final score with weightings
    const weights = {
      baseScore: 0.7,
      weather: 0.15,
      tourism: 0.15
    };
    
    let finalScore = (
      weights.baseScore * baseScore +
      weights.weather * avgWeatherScore +
      weights.tourism * avgTourismScore
    );
    
    // For short trips (3 days or less), adjust score to be more favorable
    if (totalTripDays <= 3) {
      finalScore = Math.max(finalScore, finalScore * 1.1); // Boost by up to 10%
    }
    
    // For new destinations with limited data, use a more neutral score
    if (daysWithScores / totalTripDays < 0.3) {
      finalScore = Math.max(3.0, finalScore); // At least average for destinations with little data
    }
    
    // Ensure final score is in the valid range
    return Math.max(1, Math.min(5, finalScore));
  } catch (error) {
    console.error(`Error fetching rating for ${city.title}:`, error);
    return 0;
  }
};

/**
 * Fetch city rating for flexible months
 * @param {Object} city - City object
 * @param {Array<number>} selectedMonths - Array of month indices
 * @returns {Promise<number>} - Average rating for the selected months
 */
export const getCityRatingForMonths = async (city, selectedMonths) => {
  try {
    if (selectedMonths.length === 0) return 0;
    
    const cityName = city.title.toLowerCase();
    const countryName = city.country;
    const calendarPath = `/data/${countryName}/${cityName}/${cityName}-visit-calendar.json`;
    
    // Use cached fetch for calendar data
    const cacheKey = generateCacheKey('calendar', cityName, countryName);
    const calendar = await cachedFetch(calendarPath, cacheKey, CACHE_CONFIG.CALENDAR_CACHE_DURATION);
    
    // Define weights for different factors
    const weights = {
      score: 0.7,         // Base score from the calendar (considers local events and optimal visit times)
      weather: 0.15,      // Weather conditions during the month
      tourism: -0.15      // Negative weight for tourism levels (lower is better)
    };
    
    // Process each selected month
    const monthScores = [];
    
    for (const monthIndex of selectedMonths) {
      const monthName = MONTH_NAMES[monthIndex];
      
      if (calendar.months[monthName]) {
        const monthData = calendar.months[monthName];
        
        // Calculate weighted score for this month
        let monthScore = 0;
        let factorCount = 0;
        
        // Factor 1: Base ratings for days in the month (includes events and local factors)
        const totalDayScore = monthData.ranges.reduce((acc, range) => acc + range.score * range.days.length, 0);
        const totalDays = monthData.ranges.reduce((acc, range) => acc + range.days.length, 0);
        
        if (totalDays > 0) {
          const avgDayScore = totalDayScore / totalDays;
          monthScore += weights.score * avgDayScore;
          factorCount++;
        }
        
        // Factor 2: Weather conditions (if available)
        if (monthData.weatherHighC && monthData.weatherLowC) {
          // Normalize temperature to a 0-5 scale (adjust these thresholds as needed)
          // Assuming 15-25°C is ideal (scores 5), and extreme temps score lower
          const avgTemp = (monthData.weatherHighC + monthData.weatherLowC) / 2;
          let weatherScore;
          
          if (avgTemp >= 15 && avgTemp <= 25) {
            weatherScore = 5; // Ideal temperature range
          } else if (avgTemp >= 10 && avgTemp < 15) {
            weatherScore = 4; // Slightly cool but pleasant
          } else if (avgTemp > 25 && avgTemp <= 30) {
            weatherScore = 4; // Warm but manageable
          } else if (avgTemp >= 5 && avgTemp < 10) {
            weatherScore = 3; // Cool
          } else if (avgTemp > 30 && avgTemp <= 35) {
            weatherScore = 3; // Hot
          } else if (avgTemp >= 0 && avgTemp < 5) {
            weatherScore = 2; // Cold
          } else if (avgTemp > 35) {
            weatherScore = 2; // Very hot
          } else {
            weatherScore = 1; // Very cold (below 0°C)
          }
          
          monthScore += weights.weather * weatherScore;
          factorCount++;
        }
        
        // Factor 3: Tourism level (if available)
        if (monthData.tourismLevel) {
          // Convert tourism level (typically 1-10) to our 1-5 scale
          // We invert this because lower crowds are better
          const normalizedLevel = 6 - Math.min(5, Math.ceil(monthData.tourismLevel / 2));
          monthScore += weights.tourism * normalizedLevel;
          factorCount++;
        }
        
        // Add special event bonus - look for special events that might be interesting
        const specialEvents = monthData.ranges.filter(range => range.special === true);
        if (specialEvents.length > 0) {
          // Small bonus for having special events
          monthScore += 0.5;
        }
        
        // Normalize final score to ensure it's in the 1-5 range
        const finalMonthScore = Math.max(1, Math.min(5, monthScore));
        monthScores.push(finalMonthScore);
      }
    }
    
    // Calculate the overall average score for all selected months
    const avgScore = monthScores.length > 0 
      ? monthScores.reduce((sum, score) => sum + score, 0) / monthScores.length 
      : 0;
    
    return avgScore;
  } catch (error) {
    console.error(`Error fetching monthly rating for ${city.title}:`, error);
    return 0;
  }
};

/**
 * Get detailed calendar information for a city
 * @param {Object} city - City object
 * @param {string} startDate - Start date in ISO format (for exact dates mode)
 * @param {string} endDate - End date in ISO format (for exact dates mode)
 * @param {boolean} useFlexibleDates - Whether to use flexible dates mode
 * @param {Array<number>} selectedMonths - Array of selected month indices (for flexible dates mode)
 * @returns {Promise<Object|null>} - Calendar information or null if not available
 */
export const getCityCalendarInfo = async (city, startDate, endDate, useFlexibleDates, selectedMonths) => {
  try {
    const cityName = city.title.toLowerCase();
    const countryName = city.country;
    const calendarPath = `/data/${countryName}/${cityName}/${cityName}-visit-calendar.json`;
    
    // Use cached fetch for calendar data
    const cacheKey = generateCacheKey('calendar', cityName, countryName);
    const calendar = await cachedFetch(calendarPath, cacheKey, CACHE_CONFIG.CALENDAR_CACHE_DURATION);
    
    const eventsMap = new Map();
    const allNotes = new Set();
    let totalScore = 0;
    let daysCount = 0;
    let weatherInfo = [];
    
    if (useFlexibleDates) {
      for (const monthIndex of selectedMonths) {
        const monthName = MONTH_NAMES[monthIndex];
        if (calendar.months[monthName]) {
          const monthData = calendar.months[monthName];
          weatherInfo.push({
            month: monthData.name,
            high: monthData.weatherHighC,
            low: monthData.weatherLowC,
            tourism: monthData.tourismLevel
          });
          for (const range of monthData.ranges) {
            totalScore += range.score * range.days.length;
            daysCount += range.days.length;
            if (range.notes) {
              allNotes.add(range.notes);
            }
            if (range.special && range.event) {
              addEventToMap(eventsMap, range, monthData.name, range.days);
            }
          }
        }
      }
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return null;
      }
      const currentDate = new Date(start);
      const processedMonths = new Set();
      while (currentDate <= end) {
        const month = MONTH_NAMES[currentDate.getMonth()];
        const day = currentDate.getDate();
        if (!processedMonths.has(month) && calendar.months[month]) {
          processedMonths.add(month);
          const monthData = calendar.months[month];
          weatherInfo.push({
            month: monthData.name,
            high: monthData.weatherHighC,
            low: monthData.weatherLowC,
            tourism: monthData.tourismLevel
          });
        }
        if (calendar.months[month]) {
          for (const range of calendar.months[month].ranges) {
            if (range.days.includes(day)) {
              totalScore += range.score;
              daysCount++;
              if (range.notes) {
                allNotes.add(range.notes);
              }
              if (range.special && range.event) {
                const displayMonth = month.charAt(0).toUpperCase() + month.slice(1);
                addEventToMap(eventsMap, range, displayMonth, [day]);
              }
              break;
            }
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    const events = formatEvents(eventsMap);
    
    const avgScore = daysCount > 0 ? totalScore / daysCount : 0;
    
    return {
      avgScore: avgScore.toFixed(1),
      events: events,
      notes: [...allNotes],
      weatherInfo: weatherInfo
    };
  } catch (error) {
    console.error(`Error fetching calendar info for ${city.title}:`, error);
    return null;
  }
};

/**
 * Add an event to the events map
 * @param {Map} eventsMap - Map of events
 * @param {Object} range - Range object containing event information
 * @param {string} monthName - Month name
 * @param {Array<number>} days - Array of days
 */
function addEventToMap(eventsMap, range, monthName, days) {
  const eventKey = range.event;
  if (!eventsMap.has(eventKey)) {
    eventsMap.set(eventKey, {
      event: eventKey,
      dates: [],
      notes: range.notes
    });
  }
  for (const day of days) {
    eventsMap.get(eventKey).dates.push({
      month: monthName,
      day: day
    });
  }
}

/**
 * Format events for display
 * @param {Map} eventsMap - Map of events
 * @returns {Array} - Formatted events
 */
function formatEvents(eventsMap) {
  const events = [];
  for (const [key, eventData] of eventsMap.entries()) {
    events.push({
      id: key,
      title: eventData.event,
      dates: eventData.dates,
      notes: eventData.notes
    });
  }
  return events;
}

// Create cached versions of the rating functions
export const getCityRatingForDateRangeCached = withCache(
  getCityRatingForDateRange,
  (city, startDate, endDate) => generateCacheKey('rating_date_range', city.title, startDate, endDate),
  CACHE_CONFIG.RATING_CACHE_DURATION
);

export const getCityRatingForMonthsCached = withCache(
  getCityRatingForMonths,
  (city, selectedMonths) => generateCacheKey('rating_months', city.title, selectedMonths.join(',')),
  CACHE_CONFIG.RATING_CACHE_DURATION
);

export const getCityCalendarInfoCached = withCache(
  getCityCalendarInfo,
  (city, startDate, endDate, useFlexibleDates, selectedMonths) => 
    generateCacheKey('calendar_info', city.title, startDate, endDate, useFlexibleDates, selectedMonths.join(',')),
  CACHE_CONFIG.CALENDAR_CACHE_DURATION
);