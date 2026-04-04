'use client';

import { loadMonthlyDataCached, hasMonthlyData, getMonthlyDataCacheStats } from './monthlyDataLoader';

/**
 * Debug utilities for testing monthly data loading
 * Use these functions in the browser console to test monthly data
 */

// Test function to load and display monthly data for a city
export const testMonthlyData = async (country = 'France', cityName = 'paris') => {
  console.log(`Testing monthly data for ${cityName}, ${country}...`);
  
  try {
    // Check if data is available first
    const hasData = await hasMonthlyData(country, cityName);
    console.log(`Monthly data available: ${hasData}`);
    
    if (hasData) {
      // Load the data
      const startTime = performance.now();
      const data = await loadMonthlyDataCached(country, cityName);
      const endTime = performance.now();
      
      console.log(`Loaded in ${endTime - startTime}ms`);
      console.log('Available months:', Object.keys(data));
      console.log('Sample January data:', data.January ? 'Available' : 'Missing');
      
      // Show cache stats
      const cacheStats = getMonthlyDataCacheStats();
      console.log('Cache stats:', cacheStats);
      
      return data;
    } else {
      console.log('No monthly data available for this city');
      return null;
    }
  } catch (error) {
    console.error('Error testing monthly data:', error);
    return null;
  }
};

// Test multiple cities
export const testMultipleCities = async () => {
  const cities = [
    { country: 'France', name: 'paris' },
    { country: 'Germany', name: 'berlin' },
    { country: 'Spain', name: 'madrid' },
    { country: 'Italy', name: 'rome' }
  ];
  
  console.log('Testing monthly data for multiple cities...');
  
  for (const city of cities) {
    console.log(`\n--- ${city.name.toUpperCase()}, ${city.country} ---`);
    await testMonthlyData(city.country, city.name);
  }
};

// Clear cache and reload
export const testCachePerformance = async (country = 'France', cityName = 'paris') => {
  console.log('Testing cache performance...');
  
  // First load (should be slow)
  const start1 = performance.now();
  await loadMonthlyDataCached(country, cityName);
  const end1 = performance.now();
  console.log(`First load: ${end1 - start1}ms`);
  
  // Second load (should be fast - from cache)
  const start2 = performance.now();
  await loadMonthlyDataCached(country, cityName);
  const end2 = performance.now();
  console.log(`Second load (cached): ${end2 - start2}ms`);
  
  console.log(`Cache speedup: ${Math.round((end1 - start1) / (end2 - start2))}x faster`);
};

// Make functions available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.testMonthlyData = testMonthlyData;
  window.testMultipleCities = testMultipleCities;
  window.testCachePerformance = testCachePerformance;
  
  console.log('Monthly data debug functions available:');
  console.log('- testMonthlyData(country, cityName)');
  console.log('- testMultipleCities()');
  console.log('- testCachePerformance(country, cityName)');
}