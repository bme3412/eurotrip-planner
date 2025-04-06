import { MONTH_NAMES } from './constants';

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
    
    const response = await fetch(calendarPath);
    if (!response.ok) {
      console.warn(`No calendar data found for ${cityName}`);
      return 0;
    }
    
    const calendar = await response.json();
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    let totalScore = 0;
    let daysCount = 0;
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const month = MONTH_NAMES[currentDate.getMonth()];
      const day = currentDate.getDate();
      
      if (calendar.months[month]) {
        for (const range of calendar.months[month].ranges) {
          if (range.days.includes(day)) {
            totalScore += range.score;
            daysCount++;
            break;
          }
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const avgScore = daysCount > 0 ? totalScore / daysCount : 0;
    return avgScore;
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
    
    const response = await fetch(calendarPath);
    if (!response.ok) {
      console.warn(`No calendar data found for ${cityName}`);
      return 0;
    }
    
    const calendar = await response.json();
    
    let totalScore = 0;
    let daysCount = 0;
    
    for (const monthIndex of selectedMonths) {
      const monthName = MONTH_NAMES[monthIndex];
      if (calendar.months[monthName]) {
        const monthData = calendar.months[monthName];
        totalScore += monthData.ranges.reduce((acc, range) => acc + range.score * range.days.length, 0);
        daysCount += monthData.ranges.reduce((acc, range) => acc + range.days.length, 0);
      }
    }
    
    const avgScore = daysCount > 0 ? totalScore / daysCount : 0;
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
    
    const response = await fetch(calendarPath);
    if (!response.ok) {
      return null;
    }
    
    const calendar = await response.json();
    
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
 * Format events from the events map
 * @param {Map} eventsMap - Map of events
 * @returns {Array<Object>} - Formatted events
 */
function formatEvents(eventsMap) {
  const events = [];
  for (const eventData of eventsMap.values()) {
    eventData.dates.sort((a, b) => {
      const monthOrder = MONTH_NAMES.indexOf(a.month.toLowerCase()) - MONTH_NAMES.indexOf(b.month.toLowerCase());
      if (monthOrder === 0) {
        return a.day - b.day;
      }
      return monthOrder;
    });
    
    let formattedDates = [];
    let rangeStart = null;
    let rangeEnd = null;
    
    eventData.dates.forEach((dateObj, index) => {
      if (rangeStart === null) {
        rangeStart = dateObj;
        rangeEnd = dateObj;
      } else {
        const prevDate = new Date(2023, MONTH_NAMES.indexOf(eventData.dates[index-1].month.toLowerCase()), eventData.dates[index-1].day);
        const currDate = new Date(2023, MONTH_NAMES.indexOf(dateObj.month.toLowerCase()), dateObj.day);
        const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        if (dayDiff === 1) {
          rangeEnd = dateObj;
        } else {
          formattedDates.push(formatDateRange(rangeStart, rangeEnd));
          rangeStart = dateObj;
          rangeEnd = dateObj;
        }
      }
      if (index === eventData.dates.length - 1) {
        formattedDates.push(formatDateRange(rangeStart, rangeEnd));
      }
    });
    
    events.push({
      event: eventData.event,
      dates: formattedDates,
      notes: eventData.notes
    });
  }
  return events;
}

/**
 * Format a date range
 * @param {Object} start - Start date object
 * @param {Object} end - End date object
 * @returns {string} - Formatted date range
 */
function formatDateRange(start, end) {
  if (start.month === end.month && start.day === end.day) {
    return `${start.month} ${start.day}`;
  } else if (start.month === end.month) {
    return `${start.month} ${start.day}-${end.day}`;
  } else {
    return `${start.month} ${start.day} - ${end.month} ${end.day}`;
  }
}