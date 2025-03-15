// src/utils/calendarDataLoader.js
export const loadCalendarData = async (city) => {
    try {
      // Normalize the city name to lowercase
      const normalizedCity = city.toLowerCase();
      
      // Get the country for the city
      const countryMap = {
        'paris': 'France',
        'nice': 'France',
        'amsterdam': 'Netherlands',
        'berlin': 'Germany',
        // Add other cities and their countries here
      };
      
      const country = countryMap[normalizedCity] || '';
      
      if (!country) {
        throw new Error(`Country not found for city: ${normalizedCity}`);
      }
      
      // Dynamic import based on city and country
      const calendarData = await import(`@/data/${country}/${normalizedCity}/${normalizedCity}-visit-calendar.json`);
      return calendarData.default;
    } catch (error) {
      console.error('Error loading calendar data:', error);
      return null;
    }
  };