// src/components/calendar/CityVisitCalendar.js
import React, { useState } from 'react';
import { 
  parisCalendar2025, 
  getMonthData, 
  getBestMonths, 
  getBestDaysInMonth,
  getWorstDaysInMonth,
  RATING_LABELS, 
  RATING_COLORS,
  WEATHER_DATA,
  TOURISM_LEVELS
} from '../../data/France/paris/paris-visit-calendar';

const CityVisitCalendar = ({ city = 'paris' }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);
  const [view, setView] = useState('calendar'); // calendar, best, worst
  
  // Get data for the selected month
  const monthData = getMonthData(selectedMonth);
  
  // Get the first day of the month (0 = Sunday, 6 = Saturday)
  const firstDayOfMonth = new Date(2025, selectedMonth - 1, 1).getDay();
  
  // Calculate best months to visit
  const bestMonths = getBestMonths();
  
  // Get best and worst days of the month
  const bestDays = getBestDaysInMonth(selectedMonth).slice(0, 5);
  const worstDays = getWorstDaysInMonth(selectedMonth).slice(0, 5);
  
  // Handle day selection
  const handleDayClick = (day) => {
    setSelectedDay(day);
  };
  
  // Format month name
  const getMonthName = (monthNum) => {
    return new Date(2025, monthNum - 1, 1).toLocaleString('default', { month: 'long' });
  };

  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">When to Visit {city.charAt(0).toUpperCase() + city.slice(1)}</h1>
        <p className="text-gray-600 mt-2">Plan your trip with our travel calendar showing the best and worst times to visit</p>
      </div>
      
      {/* View selector */}
      <div className="flex border-b">
        <button 
          onClick={() => setView('calendar')}
          className={`px-6 py-3 font-medium ${view === 'calendar' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
        >
          Calendar View
        </button>
        <button 
          onClick={() => setView('best')}
          className={`px-6 py-3 font-medium ${view === 'best' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
        >
          Best Times
        </button>
        <button 
          onClick={() => setView('worst')}
          className={`px-6 py-3 font-medium ${view === 'worst' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
        >
          Times to Avoid
        </button>
      </div>
      
      <div className="p-6">
        {view === 'calendar' && (
          <>
            {/* Month selector */}
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={() => setSelectedMonth(prev => Math.max(1, prev - 1))}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                disabled={selectedMonth === 1}
              >
                <span className="hidden sm:inline">Previous</span> Month
              </button>
              <h2 className="text-xl font-semibold">{getMonthName(selectedMonth)} 2025</h2>
              <button 
                onClick={() => setSelectedMonth(prev => Math.min(12, prev + 1))}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                disabled={selectedMonth === 12}
              >
                <span className="hidden sm:inline">Next</span> Month
              </button>
            </div>
            
            {/* Month overview */}
            <div className="mb-6 p-4 border rounded bg-gray-50">
              <h3 className="text-lg font-medium mb-2">Month Overview</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Weather:</strong> {WEATHER_DATA[selectedMonth].description}</p>
                  <p><strong>Avg. Temperature:</strong> {WEATHER_DATA[selectedMonth].tempLow}°C - {WEATHER_DATA[selectedMonth].tempHigh}°C</p>
                  <p><strong>Rainy Days:</strong> ~{WEATHER_DATA[selectedMonth].rainyDays} days</p>
                </div>
                <div>
                  <p><strong>Tourism Level:</strong> {TOURISM_LEVELS[selectedMonth]}/10</p>
                  <p><strong>Overall Rating:</strong> {bestMonths.find(m => m.month === selectedMonth).avgRating.toFixed(1)}/5</p>
                  <p><strong>Recommendation:</strong> {bestMonths.find(m => m.month === selectedMonth).avgRating >= 4 ? 'Highly Recommended' : bestMonths.find(m => m.month === selectedMonth).avgRating >= 3 ? 'Good Time to Visit' : 'Consider Other Months'}</p>
                </div>
              </div>
            </div>
            
            {/* Calendar legend */}
            <div className="flex flex-wrap gap-4 mb-4">
              {Object.entries(RATING_LABELS).map(([rating, label]) => (
                <div key={rating} className="flex items-center">
                  <div 
                    className="w-5 h-5 mr-2 rounded-sm" 
                    style={{ backgroundColor: RATING_COLORS[rating] }}
                  ></div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="mb-8">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before the 1st of the month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16 md:h-24 p-1"></div>
                ))}
                
                {/* Actual days of the month */}
                {monthData.map(day => (
                  <div 
                    key={day.date} 
                    className="h-16 md:h-24 p-1 border cursor-pointer transition-all hover:shadow-md"
                    style={{ backgroundColor: day.ratingColor }}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="font-medium">{day.day}</div>
                    {day.event && (
                      <div className="text-xs truncate mt-1" title={day.event.name}>
                        {day.event.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Selected day details */}
            {selectedDay && (
              <div className="border p-4 rounded mb-8 bg-white shadow">
                <h3 className="text-xl font-semibold mb-2">
                  {formatDate(selectedDay.date)}
                </h3>
                <div className="flex items-center mb-2">
                  <div 
                    className="w-5 h-5 mr-2 rounded-sm" 
                    style={{ backgroundColor: selectedDay.ratingColor }}
                  ></div>
                  <span>Rating: {selectedDay.ratingLabel}</span>
                </div>
                {selectedDay.event && (
                  <div className="mb-2">
                    <strong>Event:</strong> {selectedDay.event.name} - {selectedDay.event.impact}
                  </div>
                )}
                <div>
                  <strong>Notes:</strong>
                  <ul className="list-disc ml-5 mt-1">
                    {selectedDay.notes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
        
        {view === 'best' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Best Times to Visit Paris</h2>
            
            {/* Best months */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-3">Top Months</h3>
              <div className="space-y-4">
                {bestMonths.slice(0, 5).map((month, index) => (
                  <div 
                    key={month.month} 
                    className="flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => {setSelectedMonth(month.month); setView('calendar');}}
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full mr-4">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{month.monthName}</div>
                      <div className="text-sm text-gray-600">Average Rating: {month.avgRating.toFixed(1)}/5</div>
                    </div>
                    <div 
                      className="w-16 h-4 rounded"
                      style={{ backgroundColor: RATING_COLORS[Math.round(month.avgRating)] }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Best days in current month */}
            <div>
              <h3 className="text-lg font-medium mb-3">Best Days in {getMonthName(selectedMonth)}</h3>
              <div className="space-y-2">
                {bestDays.map(day => (
                  <div 
                    key={day.date} 
                    className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => {handleDayClick(day); setView('calendar');}}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{formatDate(day.date)}</div>
                      <div 
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: day.ratingColor }}
                      ></div>
                    </div>
                    <div className="text-sm mt-1">
                      {day.event ? `Event: ${day.event.name}` : 'No major events'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {view === 'worst' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Times to Avoid in Paris</h2>
            
            {/* Worst months */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-3">Less Favorable Months</h3>
              <div className="space-y-4">
                {[...bestMonths].reverse().slice(0, 5).map((month, index) => (
                  <div 
                    key={month.month} 
                    className="flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => {setSelectedMonth(month.month); setView('calendar');}}
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full mr-4">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{month.monthName}</div>
                      <div className="text-sm text-gray-600">Average Rating: {month.avgRating.toFixed(1)}/5</div>
                    </div>
                    <div 
                      className="w-16 h-4 rounded"
                      style={{ backgroundColor: RATING_COLORS[Math.round(month.avgRating)] }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Worst days in current month */}
            <div>
              <h3 className="text-lg font-medium mb-3">Dates to Avoid in {getMonthName(selectedMonth)}</h3>
              <div className="space-y-2">
                {worstDays.map(day => (
                  <div 
                    key={day.date} 
                    className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => {handleDayClick(day); setView('calendar');}}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{formatDate(day.date)}</div>
                      <div 
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: day.ratingColor }}
                      ></div>
                    </div>
                    <div className="text-sm mt-1">
                      {day.event ? 
                        `Event: ${day.event.name}` : 
                        day.rating <= 2 ? 'High crowds or unfavorable conditions' : 'Generally average conditions'
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Key times to avoid */}
            <div className="mt-8 p-4 border rounded bg-gray-50">
              <h3 className="text-lg font-medium mb-3">General Times to Avoid</h3>
              <ul className="list-disc ml-5 space-y-2">
                <li>
                  <strong>July and August:</strong> Peak tourist season with long lines at attractions, higher prices, and many locals on vacation
                </li>
                <li>
                  <strong>First week of August:</strong> Many restaurants and small shops closed as Parisians go on vacation
                </li>
                <li>
                  <strong>Fashion Weeks:</strong> Hotel prices increase significantly (late January, late February, late June, late September)
                </li>
                <li>
                  <strong>Major holidays:</strong> New Year's, Easter, Christmas Day - many attractions and restaurants closed
                </li>
                <li>
                  <strong>Days with major events:</strong> Bastille Day (July 14), Marathon day (April), Tour de France final (late July)
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
      
      {/* Tips section - always visible */}
      <div className="p-6 border-t bg-gray-50">
        <h3 className="text-lg font-medium mb-3">Travel Tips for Paris</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">How to Use This Calendar</h4>
            <ul className="list-disc ml-5 space-y-1 text-sm">
              <li>Green dates indicate optimal visiting times</li>
              <li>Yellow/orange dates are average conditions</li>
              <li>Red dates represent less favorable conditions</li>
              <li>Click on any date for detailed information</li>
              <li>Switch between views to see best/worst times</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">When Booking Your Trip</h4>
            <ul className="list-disc ml-5 space-y-1 text-sm">
              <li>Book accommodations 3-6 months in advance for green dates</li>
              <li>Consider purchasing skip-the-line tickets for major attractions</li>
              <li>Check for local holidays that might affect opening hours</li>
              <li>Review weather forecasts closer to your travel date</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CityVisitCalendar;