import { COUNTRY_COLORS, MAJOR_CITIES } from './constants';

// Simple HTML escaping function
const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') {
    // Handle non-string inputs gracefully, perhaps stringify objects
    unsafe = typeof unsafe === 'object' && unsafe !== null ? JSON.stringify(unsafe) : String(unsafe);
  }
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}

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
      <div class="popup-content" style="width: 320px; max-height: 500px;">
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
    if (calendarInfo.events && calendarInfo.events.length > 0) {
      eventsList = `<div class="mt-3">
        <div class="text-sm font-semibold mb-2">Special Events:</div>
        <ul class="list-none text-xs space-y-3">
          ${calendarInfo.events.map(e => {
            // Extract event text safely
            const eventText = typeof e === 'string' ? e : (e.event || e.title || JSON.stringify(e));
            
            // Extract and format dates intelligently
            let datesText = '';
            if (Array.isArray(e.dates) && e.dates.length > 0) {
              // Format dates and condense ranges for consecutive dates
              // First extract all dates as month/day objects
              const formattedDates = e.dates.map(d => {
                if (d === null || d === undefined) return null;
                
                // Special handling for date objects with month and day properties
                if (typeof d === 'object' && d !== null && d.month && d.day) {
                  return { month: d.month, day: parseInt(d.day, 10) };
                }
                
                // Other formats
                if (typeof d === 'object') {
                  if (d.date) return { raw: String(d.date) };
                  if (d.name) return { raw: String(d.name) };
                  return { raw: JSON.stringify(d) };
                }
                
                return { raw: String(d) };
              }).filter(Boolean); // Remove nulls
              
              // If we have month/day objects, we can try to condense them
              if (formattedDates.length > 0 && formattedDates[0].month && formattedDates[0].day) {
                const month = formattedDates[0].month;
                let allSameMonth = true;
                let consecutive = true;
                
                // Check if all dates are from the same month
                for (let i = 1; i < formattedDates.length; i++) {
                  if (formattedDates[i].month !== month) {
                    allSameMonth = false;
                    break;
                  }
                }
                
                // Check if dates are consecutive
                if (allSameMonth && formattedDates.length > 1) {
                  // Sort dates by day
                  formattedDates.sort((a, b) => a.day - b.day);
                  
                  for (let i = 1; i < formattedDates.length; i++) {
                    if (formattedDates[i].day !== formattedDates[i-1].day + 1) {
                      consecutive = false;
                      break;
                    }
                  }
                }
                
                // Format as range if consecutive, otherwise comma-separated list
                if (allSameMonth && consecutive && formattedDates.length > 2) {
                  datesText = `${month} ${formattedDates[0].day}-${formattedDates[formattedDates.length-1].day}`;
                } else if (allSameMonth) {
                  // If same month but not consecutive, list days only
                  datesText = `${month} ${formattedDates.map(d => d.day).join(', ')}`;
                } else {
                  // Different months, list each date fully
                  datesText = formattedDates.map(d => `${d.month} ${d.day}`).join(', ');
                }
              } else {
                // Fall back to simple joining for non-month/day objects
                datesText = formattedDates.map(d => d.raw || '').filter(Boolean).join(', ');
              }
            } else if (e.dates !== null && e.dates !== undefined) {
              // Handle single date object
              if (typeof e.dates === 'object' && e.dates !== null) {
                if (e.dates.month && e.dates.day) {
                  datesText = `${e.dates.month} ${e.dates.day}`;
                } else if (e.dates.date) {
                  datesText = String(e.dates.date);
                } else {
                  datesText = JSON.stringify(e.dates);
                }
              } else {
                datesText = String(e.dates);
              }
            }

            return `
            <li class="flex items-start border-l-4 border-blue-300 pl-2 bg-blue-50 rounded-r py-1">
              <div class="w-full">
                ${datesText ? `<div class="font-medium text-blue-600">${escapeHtml(datesText)}</div>` : ''}
                <div class="text-gray-800">${escapeHtml(eventText)}</div>
              </div>
            </li>
          `}).join('')}
        </ul>
      </div>`;
    }
    
    // Notes section
    let notesSection = '';
    if (calendarInfo.notes && calendarInfo.notes.length > 0) {
      notesSection = `<div class="mt-3">
        <div class="text-sm font-semibold mb-2">Travel Notes:</div>
        <ul class="list-none text-xs space-y-2">
          ${calendarInfo.notes.slice(0, 3).map(note => {
            // Extract note text safely
            const noteText = typeof note === 'string' ? note : (note.note || note.text || JSON.stringify(note));
            return `
            <li class="flex items-start border-l-4 border-amber-300 pl-2 bg-amber-50 rounded-r py-1">
              <div class="text-gray-800">${escapeHtml(noteText)}</div>
            </li>`;
            }).join('')}
        </ul>
      </div>`;
    }
    
    const dateTitle = filters.useFlexibleDates ? "Flexible Visit" : "Visit rating for";
    
    const html = `
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
  
    return html;
  }