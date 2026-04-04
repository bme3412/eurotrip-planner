// src/utils/travelUtils.js

/**
 * Calculate the distance (in kilometers) between two geographical coordinates using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of the first coordinate.
 * @param {number} lon1 - Longitude of the first coordinate.
 * @param {number} lat2 - Latitude of the second coordinate.
 * @param {number} lon2 - Longitude of the second coordinate.
 * @returns {number} - The distance in kilometers.
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  /**
   * Format a duration given in minutes to a string in "Xh Ym" format.
   *
   * @param {number} totalMinutes - Total duration in minutes.
   * @returns {string} - Formatted duration string.
   */
  export const formatDuration = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };
  
  // Default average speeds in km/h for different transportation modes.
  const DEFAULT_AVERAGE_SPEEDS = {
    train: 100,
    bus: 80,
    plane: 800,
  };
  
  /**
   * Determine the optimal travel time and mode between two cities.
   *
   * @param {string} fromCity - The starting city's name.
   * @param {object} destination - The destination object which should include a `coords` property with `lat` and `lon`.
   * @param {object} cityCoordinates - An object mapping city names to their coordinates, e.g., { CityName: { lat: number, lon: number } }.
   * @param {object} [averageSpeeds=DEFAULT_AVERAGE_SPEEDS] - An object with average speeds (km/h) for different transport modes.
   * @returns {object|null} - Returns an object with `mode` (string) and `minutes` (number) properties, or null if coordinates are missing.
   */
  export const getOptimalTravelTime = (
    fromCity,
    destination,
    cityCoordinates,
    averageSpeeds = DEFAULT_AVERAGE_SPEEDS
  ) => {
    const fromCoords = cityCoordinates[fromCity];
    if (!fromCoords || !destination.coords) return null;
  
    // Calculate the distance in kilometers.
    const distance = calculateDistance(
      fromCoords.lat,
      fromCoords.lon,
      destination.coords.lat,
      destination.coords.lon
    );
  
    // Calculate travel time (in minutes) for each mode.
    const travelTimes = {
      train: (distance / averageSpeeds.train) * 60,
      bus: (distance / averageSpeeds.bus) * 60,
      plane: (distance / averageSpeeds.plane) * 60,
    };
  
    // Find the mode with the shortest travel time.
    const bestMode = Object.keys(travelTimes).reduce((modeA, modeB) =>
      travelTimes[modeA] < travelTimes[modeB] ? modeA : modeB
    );
  
    return { mode: bestMode, minutes: Math.round(travelTimes[bestMode]) };
  };
  
  /**
   * Determine if a trip qualifies as a day trip based on the round-trip travel time.
   *
   * @param {string} fromCity - The starting city's name.
   * @param {object} destination - The destination object which should include a `coords` property with `lat` and `lon`.
   * @param {object} cityCoordinates - An object mapping city names to their coordinates.
   * @param {object} [averageSpeeds=DEFAULT_AVERAGE_SPEEDS] - An object with average speeds (km/h) for different transport modes.
   * @param {number} [maxRoundTripMinutes=480] - Maximum allowable round-trip duration in minutes (default is 480 minutes, or 8 hours).
   * @returns {boolean} - Returns true if the round-trip time is within the specified limit, false otherwise.
   */
  export const isDayTrip = (
    fromCity,
    destination,
    cityCoordinates,
    averageSpeeds = DEFAULT_AVERAGE_SPEEDS,
    maxRoundTripMinutes = 480
  ) => {
    const optimal = getOptimalTravelTime(fromCity, destination, cityCoordinates, averageSpeeds);
    if (!optimal) return false;
    // Check if the round-trip duration is within the limit.
    return optimal.minutes * 2 <= maxRoundTripMinutes;
  };
  