// src/hooks/useCityData.js
import { useState, useEffect } from 'react';

export const useCityData = (cityName, countryName) => {
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCityData = async () => {
      if (!cityName || !countryName) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Format the city and country names for path construction
        const formattedCity = cityName.toLowerCase();
        const formattedCountry = countryName;
        
        // Check if we should load monthly data by season or by individual months
        // Some cities have separate files for each month, others have seasonal files
        let dataByMonth = {};
        
        try {
          // First try to load all individual month files
          const months = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
          ];
          
          for (const month of months) {
            try {
              // Dynamic import for each month's data
              const monthData = await import(`../data/${formattedCountry}/${formattedCity}/monthly/${month}.json`);
              dataByMonth[month] = monthData.default || monthData;
            } catch (monthErr) {
              // If month file doesn't exist, we'll try seasons instead
              console.log(`No monthly data for ${month} in ${cityName}`);
            }
          }
          
          // If no monthly data was loaded, try seasonal data
          if (Object.keys(dataByMonth).length === 0) {
            const seasons = ['spring', 'summer', 'fall', 'winter'];
            
            for (const season of seasons) {
              try {
                const seasonData = await import(`../data/${formattedCountry}/${formattedCity}/monthly/${season}.json`);
                
                // Map season data to corresponding months
                const seasonMonths = getMonthsForSeason(season);
                for (const month of seasonMonths) {
                  dataByMonth[month] = {
                    ...seasonData.default || seasonData,
                    seasonName: season
                  };
                }
              } catch (seasonErr) {
                console.log(`No data for ${season} in ${cityName}`);
              }
            }
          }
        } catch (err) {
          console.error('Error loading monthly data:', err);
          setError('Failed to load monthly data');
          setLoading(false);
          return;
        }
        
        // If no data was loaded by either method, throw an error
        if (Object.keys(dataByMonth).length === 0) {
          throw new Error(`No monthly data found for ${cityName}`);
        }
        
        // Also fetch additional city data
        try {
          const attractionsData = await import(`../data/${formattedCountry}/${formattedCity}/${formattedCity}_attractions.json`);
          const culinaryData = await import(`../data/${formattedCountry}/${formattedCity}/${formattedCity}_culinary_guide.json`);
          const seasonalActivities = await import(`../data/${formattedCountry}/${formattedCity}/${formattedCity}_seasonal_activities.json`);
          
          // Combine all data
          setMonthlyData({
            monthly: dataByMonth,
            attractions: attractionsData.default || attractionsData,
            culinary: culinaryData.default || culinaryData,
            seasonalActivities: seasonalActivities.default || seasonalActivities
          });
        } catch (additionalDataErr) {
          // Still set the monthly data even if additional data is missing
          setMonthlyData({ monthly: dataByMonth });
          console.warn(`Some additional data files missing for ${cityName}`);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching city data:', err);
        setError(`Failed to load data for ${cityName}`);
        setLoading(false);
      }
    };

    fetchCityData();
  }, [cityName, countryName]);

  // Helper function to map seasons to their respective months
  const getMonthsForSeason = (season) => {
    switch (season.toLowerCase()) {
      case 'spring':
        return ['march', 'april', 'may'];
      case 'summer':
        return ['june', 'july', 'august'];
      case 'fall':
        return ['september', 'october', 'november'];
      case 'winter':
        return ['december', 'january', 'february'];
      default:
        return [];
    }
  };

  return { cityData: monthlyData, loading, error };
};