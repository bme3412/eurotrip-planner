/**
 * Generate popup content for a city marker
 * @param {Object} city - City object
 * @param {Object|null} calendarInfo - Calendar information for the city
 * @param {string} countryColor - Color for the country
 * @param {Object} filters - Current filter settings
 * @returns {string} - HTML content for the popup
 */
export const generatePopupContent = (city, calendarInfo, countryColor, filters) => {
    let popupContent = `
      <div class="popup-content">
        <div style="border-top: 4px solid ${countryColor}; padding: 12px;">
          <h3 class="font-bold text-lg">${city.title || 'Unnamed City'}</h3>
          ${city.country ? `<p class="text-sm text-gray-600">${city.country}</p>` : ''}
          ${city.description ? `<p class="mt-2">${city.description}</p>` : ''}
    `;
    
    if (calendarInfo) {
      popupContent += generateCalendarSection(calendarInfo, filters);
    }
  
    popupContent += `
          <div class="mt-3">
            <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-sm" 
                    onclick="window.location.href='/city-guides/${city.title?.toLowerCase().replace(/\\s+/g, '-')}'">
              View City Guide
            </button>
          </div>
        </div>
      </div>
    `;
  
    return popupContent;
  };
  
  /**
   * Generate the calendar section of the popup
   * @param {Object} calendarInfo - Calendar information for the city
   * @param {Object} filters - Current filter settings
   * @returns {string} - HTML content for the calendar section
   */
  function generateCalendarSection(calendarInfo, filters) {
    // Format date display
    let dateDisplay;
    if (filters.useFlexibleDates) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
      const selectedMonthNames = filters.selectedMonths.map(i => monthNames[i]);
      dateDisplay = selectedMonthNames.join(', ');
    } else {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      const formattedStartDate = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const formattedEndDate = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateDisplay = `${formattedStartDate} - ${formattedEndDate}`;
    }
    
    // Generate star rating
    const score = parseFloat(calendarInfo.avgScore);
    const fullStars = Math.floor(score);
    const halfStar = score - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    const starRating = 
      '★'.repeat(fullStars) + 
      (halfStar ? '½' : '') + 
      '☆'.repeat(emptyStars);
    
    // Weather summary
    const weatherSummary = calendarInfo.weatherInfo.map(w => 
      `<div class="text-xs mb-1">
        <span class="font-medium">${w.month}:</span> ${w.low}°C to ${w.high}°C 
        <span class="ml-1 ${w.tourism > 7 ? 'text-amber-600' : ''}" title="Tourism level">
          ${w.tourism > 7 ? '👥 High season' : w.tourism > 4 ? '👤 Moderate' : '🧍 Low season'}
        </span>
      </div>`
    ).join('');
    
    // Events list
    let eventsList = '';
    if (calendarInfo.events.length > 0) {
      eventsList = `<div class="mt-2">
        <div class="text-sm font-semibold mb-1">Special Events:</div>
        <ul class="list-disc list-inside text-xs space-y-1">
          ${calendarInfo.events.map(e => `
            <li>
              <span class="font-medium">${e.dates.join(', ')}:</span> 
              ${e.event}
            </li>
          `).join('')}
        </ul>
      </div>`;
    }
    
    // Notes section
    let notesSection = '';
    if (calendarInfo.notes.length > 0) {
      notesSection = `<div class="mt-2">
        <div class="text-sm font-semibold mb-1">Travel Notes:</div>
        <ul class="list-disc list-inside text-xs space-y-1">
          ${calendarInfo.notes.slice(0, 3).map(note => `<li>${note}</li>`).join('')}
        </ul>
      </div>`;
    }
    
    const dateTitle = filters.useFlexibleDates ? "Flexible Visit" : "Visit rating for";
    
    return `
      <div class="border-t border-gray-200 mt-3 pt-3">
        <div class="flex justify-between items-center">
          <div class="text-sm font-semibold">${dateTitle} ${dateDisplay}:</div>
          <div class="text-amber-500 font-bold">${starRating} (${calendarInfo.avgScore})</div>
        </div>
        <div class="mt-2">
          <div class="text-sm font-semibold mb-1">Weather & Tourism:</div>
          ${weatherSummary}
        </div>
        ${eventsList}
        ${notesSection}
      </div>
    `;
  }