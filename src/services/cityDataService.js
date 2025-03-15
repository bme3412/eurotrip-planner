// src/services/cityDataService.js

/**
 * Service for handling city data loading and processing
 * This provides a central location for fetching and transforming data for city guides
 */

/**
 * Get the optimal visit time data for a specific city
 * This is used by the calendar component to show color-coded best times to visit
 * 
 * @param {string} cityName - Name of the city 
 * @param {string} countryName - Name of the country
 * @returns {Promise<object>} Monthly data for the city
 */
export async function getOptimalVisitData(cityName, countryName) {
    if (!cityName || !countryName) {
      return null;
    }
    
    try {
      // Normalize the city and country names for path construction
      const formattedCity = cityName.toLowerCase().replace(/\s+/g, '-');
      const formattedCountry = countryName;
      
      // Create path to monthly data
      const monthlyPath = `/data/${formattedCountry}/${formattedCity}/monthly`;
      
      // First check if we have individual month files
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      
      // Try to load monthly data
      let monthlyData = {};
      let usesSeasonalData = false;
      
      try {
        // Attempt to load individual month files first
        for (const month of monthNames) {
          try {
            const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
            const response = await fetch(`${monthlyPath}/${month}.json`);
            
            if (response.ok) {
              const data = await response.json();
              monthlyData[capitalizedMonth] = data;
            }
          } catch (err) {
            // Individual month file not found, we'll try seasonal data next
            console.log(`Month data not found for ${month} in ${cityName}`);
          }
        }
        
        // If we didn't find any monthly data, try seasonal data
        if (Object.keys(monthlyData).length === 0) {
          const seasons = ['spring', 'summer', 'fall', 'winter'];
          
          for (const season of seasons) {
            try {
              const capitalizedSeason = season.charAt(0).toUpperCase() + season.slice(1);
              const response = await fetch(`${monthlyPath}/${season}.json`);
              
              if (response.ok) {
                const data = await response.json();
                monthlyData[capitalizedSeason] = data;
                usesSeasonalData = true;
              }
            } catch (err) {
              console.log(`Season data not found for ${season} in ${cityName}`);
            }
          }
        }
        
        // If we still don't have any data, try the combined approach
        // Some cities might have a combined file with all months
        if (Object.keys(monthlyData).length === 0) {
          try {
            const response = await fetch(`/data/${formattedCountry}/${formattedCity}/${formattedCity}_monthly_data.json`);
            
            if (response.ok) {
              monthlyData = await response.json();
            }
          } catch (err) {
            console.log(`Combined monthly data not found for ${cityName}`);
          }
        }
        
        return {
          data: monthlyData,
          usesSeasonalData
        };
        
      } catch (err) {
        console.error(`Error loading monthly data for ${cityName}:`, err);
        return null;
      }
    } catch (err) {
      console.error(`Error in getOptimalVisitData for ${cityName}:`, err);
      return null;
    }
  }
  
  /**
   * Process monthly data to calculate optimal visit times
   * This transforms raw data into a format the calendar can use for visualization
   * 
   * @param {object} monthlyData - Raw monthly data for the city
   * @returns {object} Processed data with optimal visit times
   */
  export function processOptimalVisitTimes(monthlyData) {
    if (!monthlyData || Object.keys(monthlyData).length === 0) {
      return {};
    }
    
    const processedData = {};
    
    // Process each month's data
    Object.entries(monthlyData).forEach(([month, data]) => {
      const monthProcessed = {
        summary: data.summary || '',
        pros: data.pros || [],
        cons: data.cons || [],
        firstHalf: processHalfMonth(data.firstHalf || {}),
        secondHalf: processHalfMonth(data.secondHalf || {})
      };
      
      processedData[month] = monthProcessed;
    });
    
    return processedData;
  }
  
  /**
   * Helper function to process half-month data
   */
  function processHalfMonth(halfData) {
    return {
      weather: halfData.weather || {},
      crowds: halfData.crowds || {},
      specialEvents: halfData.specialEvents || [],
      rating: calculateOverallRating(halfData)
    };
  }
  
  /**
   * Calculate overall rating for a half-month period
   */
  function calculateOverallRating(halfData) {
    if (!halfData) return 'Average';
    
    let factors = 0;
    let totalScore = 0;
    
    // Weather factor
    if (halfData.weather && halfData.weather.rating) {
      totalScore += convertRatingToScore(halfData.weather.rating);
      factors++;
    }
    
    // Crowds factor (inverted)
    if (halfData.crowds && halfData.crowds.rating) {
      totalScore += invertRating(convertRatingToScore(halfData.crowds.rating));
      factors++;
    }
    
    // Special events bonus
    if (halfData.specialEvents && halfData.specialEvents.length > 0) {
      totalScore += halfData.specialEvents.length * 0.2; // Small bonus per event
      factors++;
    }
    
    // If we have no factors, return average
    if (factors === 0) return 'Average';
    
    // Calculate average score
    const averageScore = totalScore / factors;
    
    // Convert back to rating
    return scoreToRating(averageScore);
  }
  
  /**
   * Convert rating strings to numerical scores
   */
  function convertRatingToScore(rating) {
    if (!rating) return 3;
    
    const normalized = rating.toLowerCase();
    
    if (normalized.includes('excellent')) return 5;
    if (normalized.includes('very good')) return 4.5;
    if (normalized.includes('good')) return 4;
    if (normalized.includes('above average')) return 3.5;
    if (normalized.includes('average')) return 3;
    if (normalized.includes('below average')) return 2.5;
    if (normalized.includes('poor')) return 2;
    if (normalized.includes('very poor')) return 1.5;
    if (normalized.includes('avoid')) return 1;
    
    return 3; // Default to average
  }
  
  /**
   * Invert a rating (used for crowd levels where lower is better)
   */
  function invertRating(score) {
    return 6 - score;
  }
  
  /**
   * Convert numerical score back to rating string
   */
  function scoreToRating(score) {
    if (score >= 4.75) return 'Excellent';
    if (score >= 4.25) return 'Very Good';
    if (score >= 3.75) return 'Good';
    if (score >= 3.25) return 'Above Average';
    if (score >= 2.75) return 'Average';
    if (score >= 2.25) return 'Below Average';
    if (score >= 1.75) return 'Poor';
    if (score >= 1.25) return 'Very Poor';
    return 'Avoid';
  }