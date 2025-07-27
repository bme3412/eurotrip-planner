'use client';

import React, { useEffect, useRef } from 'react';
import { useMapData } from '@/context/MapDataContext';
import { 
  getCityRatingForDateRangeCached, 
  getCityRatingForMonthsCached, 
  getCityCalendarInfoCached 
} from './mapUtils';
import { getCitiesData } from '@/components/city-guides/cityData';

/**
 * Data Preloader Component
 * Loads city data in the background to eliminate loading delays
 */
const DataPreloader = ({ destinations = [] }) => {
  const { state, actions } = useMapData();
  const preloadQueue = useRef(new Set());
  const isPreloading = useRef(false);
  
  // Get all cities if destinations not provided
  const allCities = destinations.length > 0 ? destinations : getCitiesData().map(city => ({
    title: city.name,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    description: city.description
  }));

  // Preload city ratings for common date ranges
  const preloadCityRatings = async () => {
    if (isPreloading.current) return;
    isPreloading.current = true;
    
    const commonDateRanges = [
      { start: '2024-06-01', end: '2024-08-31', name: 'summer_2024' },
      { start: '2024-09-01', end: '2024-11-30', name: 'fall_2024' },
      { start: '2024-12-01', end: '2025-02-28', name: 'winter_2024' },
      { start: '2025-03-01', end: '2025-05-31', name: 'spring_2025' },
      { start: '2025-06-01', end: '2025-08-31', name: 'summer_2025' }
    ];

    const commonMonths = [
      [5, 6, 7], // Summer
      [8, 9, 10], // Fall
      [11, 0, 1], // Winter
      [2, 3, 4]  // Spring
    ];

    try {
      // Preload ratings for date ranges
      for (const range of commonDateRanges) {
        const promises = allCities.slice(0, 20).map(async (city) => {
          const cacheKey = `rating_${city.title}_${range.name}`;
          if (preloadQueue.current.has(cacheKey)) return;
          
          preloadQueue.current.add(cacheKey);
          
          try {
            const rating = await getCityRatingForDateRangeCached(city, range.start, range.end);
            actions.setCityRatings({ [city.title]: rating });
          } catch (error) {
            console.warn(`Failed to preload rating for ${city.title}:`, error);
          } finally {
            preloadQueue.current.delete(cacheKey);
          }
        });
        
        await Promise.allSettled(promises);
      }

      // Preload ratings for month selections
      for (const months of commonMonths) {
        const promises = allCities.slice(0, 20).map(async (city) => {
          const cacheKey = `rating_months_${city.title}_${months.join(',')}`;
          if (preloadQueue.current.has(cacheKey)) return;
          
          preloadQueue.current.add(cacheKey);
          
          try {
            const rating = await getCityRatingForMonthsCached(city, months);
            actions.setCityRatings({ [city.title]: rating });
          } catch (error) {
            console.warn(`Failed to preload month rating for ${city.title}:`, error);
          } finally {
            preloadQueue.current.delete(cacheKey);
          }
        });
        
        await Promise.allSettled(promises);
      }

    } catch (error) {
      console.error('Error in preloadCityRatings:', error);
    } finally {
      isPreloading.current = false;
    }
  };

  // Preload calendar data for popular cities
  const preloadCalendarData = async () => {
    const popularCities = allCities.slice(0, 15); // Preload top 15 cities
    
    try {
      const promises = popularCities.map(async (city) => {
        const cacheKey = `calendar_${city.title}`;
        if (preloadQueue.current.has(cacheKey)) return;
        
        preloadQueue.current.add(cacheKey);
        
        try {
          const calendarInfo = await getCityCalendarInfoCached(
            city, 
            '2024-06-01', 
            '2024-08-31', 
            false, 
            []
          );
          
          if (calendarInfo) {
            actions.setCalendarData(cacheKey, calendarInfo);
          }
        } catch (error) {
          console.warn(`Failed to preload calendar for ${city.title}:`, error);
        } finally {
          preloadQueue.current.delete(cacheKey);
        }
      });
      
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error in preloadCalendarData:', error);
    }
  };

  // Start preloading when component mounts
  useEffect(() => {
    // Delay preloading to avoid blocking initial render
    const timer = setTimeout(() => {
      preloadCityRatings();
      preloadCalendarData();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Preload data when filters change (for current filter state)
  useEffect(() => {
    const { currentFilters } = state;
    
    if (currentFilters.startDate && currentFilters.endDate) {
      // Preload ratings for current date range
      const promises = allCities.slice(0, 10).map(async (city) => {
        const cacheKey = `rating_current_${city.title}`;
        if (preloadQueue.current.has(cacheKey)) return;
        
        preloadQueue.current.add(cacheKey);
        
        try {
          let rating;
          if (currentFilters.useFlexibleDates) {
            rating = await getCityRatingForMonthsCached(city, currentFilters.selectedMonths);
          } else {
            rating = await getCityRatingForDateRangeCached(city, currentFilters.startDate, currentFilters.endDate);
          }
          actions.setCityRatings({ [city.title]: rating });
        } catch (error) {
          console.warn(`Failed to preload current rating for ${city.title}:`, error);
        } finally {
          preloadQueue.current.delete(cacheKey);
        }
      });
      
      Promise.allSettled(promises);
    }
  }, [state.currentFilters.startDate, state.currentFilters.endDate, state.currentFilters.useFlexibleDates, state.currentFilters.selectedMonths]);

  // This component doesn't render anything
  return null;
};

export default DataPreloader; 