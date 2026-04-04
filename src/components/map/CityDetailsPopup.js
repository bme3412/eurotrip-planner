import React, { useState, useEffect } from 'react';
import { getCityCalendarInfo } from './mapUtils'; // Assuming this function fetches travel details

/**
 * Popup panel showing detailed information for a selected city, 
 * including travel-specific info for the selected dates.
 * @param {Object} props - Component props
 * @param {Object} props.city - The selected city object (full details)
 * @param {Object} props.dateFilters - Current date filters from MapComponent
 * @param {Function} props.onClose - Function to close this popup
 * @returns {JSX.Element | null} - City details popup component or null
 */
const CityDetailsPopup = ({ city, dateFilters, onClose }) => {
  const [calendarInfo, setCalendarInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!city || !dateFilters) return;

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const info = await getCityCalendarInfo(
          city,
          dateFilters.startDate,
          dateFilters.endDate,
          dateFilters.useFlexibleDates,
          dateFilters.selectedMonths
        );
        setCalendarInfo(info);
      } catch (err) {
        console.error(`Error fetching calendar info for ${city.title}:`, err);
        setError('Could not load travel details.');
        setCalendarInfo(null); // Clear any old info
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if we have relevant date filters
    const hasDateFilters = 
      (!dateFilters.useFlexibleDates && dateFilters.startDate && dateFilters.endDate) || 
      (dateFilters.useFlexibleDates && dateFilters.selectedMonths.length > 0);

    if (hasDateFilters) {
      fetchDetails();
    } else {
      // If no date filters, clear calendar info
      setCalendarInfo(null);
      setIsLoading(false);
      setError(null);
    }

  }, [city, dateFilters]); // Re-fetch if city or date filters change

  if (!city) return null;

  const rating = city.rating || 0; // Rating should be passed within the city object now

  return (
    <div 
      className="absolute top-4 right-[20rem] /* Position left of RankedListPanel */ \
                 bg-white p-4 rounded-lg shadow-lg w-80 max-h-[calc(100vh-4rem)] \
                 flex flex-col z-30 animate-slide-in-left overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 flex-shrink-0">
        <h4 className="font-bold text-md text-gray-800 truncate pr-2" title={city.title}>{city.title} Details</h4>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-800 flex-shrink-0"
          title="Close details"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content Area */}
      <div className="overflow-y-auto flex-grow pr-2 -mr-2 custom-scrollbar">
        <p className="text-xs text-gray-500 mb-2">{city.country}</p>
        <p className={`font-bold text-lg mb-3 ${rating >= 4 ? 'text-green-600' : rating >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
          Rating: {rating.toFixed(1)} ★
        </p>
        
        {city.description && (
          <p className="text-sm text-gray-700 mb-3">
            {city.description}
          </p>
        )}
        
        {city.landmarks && city.landmarks.length > 0 && (
          <div className="mb-3">
            <h6 className="font-semibold text-sm text-gray-700 mb-1">Key Landmarks:</h6>
            <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
              {city.landmarks.map((landmark, idx) => <li key={idx}>{landmark}</li>)}
            </ul>
          </div>
        )}

        {/* Travel Specific Info */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h6 className="font-semibold text-sm text-gray-700 mb-2">Travel Info for Selected Dates</h6>
          {isLoading && <p className="text-sm text-gray-500 italic">Loading travel details...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          
          {!isLoading && !error && !calendarInfo && (
             <p className="text-sm text-gray-500 italic">No date filters selected or no specific info available.</p>
          )}

          {calendarInfo && (
            <div className="space-y-2 text-sm">
              {calendarInfo.averageTemperature !== undefined && (
                <p>Avg Temp: <span className="font-medium">{calendarInfo.averageTemperature}°C</span></p>
              )}
              {calendarInfo.weatherDescription && (
                <p>Weather: <span className="font-medium">{calendarInfo.weatherDescription}</span></p>
              )}
              {calendarInfo.events && calendarInfo.events.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Events/Festivals:</p>
                  <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                    {calendarInfo.events.map((event, idx) => (
                      <li key={event.id ? `event-${event.id}` : `event-${event.title || 'item'}-${idx}`}>
                        {typeof event === 'string' ? event : event.title || JSON.stringify(event)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {calendarInfo.notes && calendarInfo.notes.length > 0 && (
                 <div>
                  <p className="font-medium mb-1">Notes:</p>
                  <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                    {calendarInfo.notes.map((note, idx) => (
                      <li key={note.id ? `note-${note.id}` : `note-idx-${idx}`}>
                        {typeof note === 'string' ? note : note.text || note.note || JSON.stringify(note)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CityDetailsPopup; 