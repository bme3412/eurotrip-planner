// src/components/monthly-visit-guide/sections/MonthDetail.js
import React from 'react';
import ProsConsSection from './ProsConsSection';

const MonthDetail = ({ monthData, monthName }) => {
  // If no month data is provided, show empty state
  if (!monthData) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-500">No data available for {monthName}</h3>
        <p className="mt-2 text-sm text-gray-400">We don\t have specific information for this month yet.</p>
      </div>
    );
  }

  // Helper function to get weather icon based on description
  const getWeatherIcon = (description) => {
    const lowerDesc = description?.toLowerCase() || '';
    
    if (lowerDesc.includes('sun') || lowerDesc.includes('clear')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    } else if (lowerDesc.includes('rain') || lowerDesc.includes('shower')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    } else if (lowerDesc.includes('snow') || lowerDesc.includes('freez')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    } else if (lowerDesc.includes('cloud') || lowerDesc.includes('overcast')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    }
  };

  // Helper function to get rating badge color
  const getRatingColor = (rating) => {
    const lowerRating = rating?.toLowerCase() || '';
    
    if (lowerRating.includes('excellent') || lowerRating.includes('very good')) {
      return 'bg-green-100 text-green-800';
    } else if (lowerRating.includes('good')) {
      return 'bg-green-50 text-green-700';
    } else if (lowerRating.includes('average')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (lowerRating.includes('below') || lowerRating.includes('poor')) {
      return 'bg-orange-100 text-orange-800';
    } else if (lowerRating.includes('avoid') || lowerRating.includes('very poor')) {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  // Extract first and second half data
  const firstHalf = monthData.firstHalf || {};
  const secondHalf = monthData.secondHalf || {};

  // Handle cases where data might be structured differently
  const weatherFirst = firstHalf.weather || {};
  const weatherSecond = secondHalf.weather || {};
  const crowdsFirst = firstHalf.crowds || {};
  const crowdsSecond = secondHalf.crowds || {};

  // Extract special events from both halves of the month
  const specialEvents = [
    ...(firstHalf.specialEvents || []),
    ...(secondHalf.specialEvents || [])
  ].filter(Boolean); // Remove any undefined values

  return (
    <div className="p-6">
      {/* Month Overview */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-3">{monthName} Overview</h3>
        {monthData.summary ? (
          <p className="text-gray-700">{monthData.summary}</p>
        ) : (
          <p className="text-gray-500 italic">No summary available for {monthName}.</p>
        )}
        
        {/* Pros and Cons */}
        <div className="mt-6">
          <ProsConsSection 
            pros={monthData.pros || []} 
            cons={monthData.cons || []} 
          />
        </div>
      </div>

      {/* Weather Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b">
            <h4 className="font-medium text-blue-900">Early {monthName} (1st-15th)</h4>
          </div>
          <div className="p-4">
            {weatherFirst && weatherFirst.description ? (
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 mt-1">
                  {getWeatherIcon(weatherFirst.description)}
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-700">{weatherFirst.description}</p>
                  {weatherFirst.temperature && (
                    <p className="text-sm font-medium mt-1">
                      Temp: {weatherFirst.temperature}
                    </p>
                  )}
                  {weatherFirst.rating && (
                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${getRatingColor(weatherFirst.rating)}`}>
                      {weatherFirst.rating}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Weather data not available</p>
            )}
            
            {/* Crowds info */}
            {crowdsFirst && crowdsFirst.level && (
              <div className="mt-4 pt-4 border-t">
                <h5 className="text-sm font-medium mb-2">Crowd Levels</h5>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">{crowdsFirst.level}</p>
                    {crowdsFirst.rating && (
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${getRatingColor(crowdsFirst.rating)}`}>
                        {crowdsFirst.rating}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b">
            <h4 className="font-medium text-blue-900">Late {monthName} (16th-End)</h4>
          </div>
          <div className="p-4">
            {weatherSecond && weatherSecond.description ? (
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 mt-1">
                  {getWeatherIcon(weatherSecond.description)}
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-700">{weatherSecond.description}</p>
                  {weatherSecond.temperature && (
                    <p className="text-sm font-medium mt-1">
                      Temp: {weatherSecond.temperature}
                    </p>
                  )}
                  {weatherSecond.rating && (
                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${getRatingColor(weatherSecond.rating)}`}>
                      {weatherSecond.rating}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Weather data not available</p>
            )}
            
            {/* Crowds info */}
            {crowdsSecond && crowdsSecond.level && (
              <div className="mt-4 pt-4 border-t">
                <h5 className="text-sm font-medium mb-2">Crowd Levels</h5>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">{crowdsSecond.level}</p>
                    {crowdsSecond.rating && (
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${getRatingColor(crowdsSecond.rating)}`}>
                        {crowdsSecond.rating}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Special Events Section */}
      {specialEvents && specialEvents.length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-medium mb-3">Special Events in {monthName}</h4>
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
            <ul className="space-y-3">
              {specialEvents.map((event, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800">{event.name || event}</p>
                    {event.date && <p className="text-xs text-gray-600 mt-0.5">{event.date}</p>}
                    {event.description && <p className="text-sm text-gray-700 mt-1">{event.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Budget Tips */}
      {monthData.budgetTips && monthData.budgetTips.length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-medium mb-3">Budget Tips for {monthName}</h4>
          <div className="bg-green-50 border border-green-100 rounded-lg p-4">
            <ul className="space-y-2">
              {monthData.budgetTips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="ml-3 text-sm text-gray-700">{tip}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Travel Recommendations */}
      {monthData.recommendations && (
        <div className="mb-8">
          <h4 className="text-lg font-medium mb-3">Recommendations for {monthName}</h4>
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <div className="text-sm text-gray-700">
              {typeof monthData.recommendations === 'string' ? (
                <p>{monthData.recommendations}</p>
              ) : (
                <ul className="space-y-2">
                  {monthData.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622a12.02 12.02 0 00-.382-3.016z" />
                        </svg>
                      </div>
                      <p className="ml-3">{rec}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Activities Section */}
      {monthData.activities && monthData.activities.length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-medium mb-3">Recommended Activities in {monthName}</h4>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <ul className="space-y-2">
              {monthData.activities.map((activity, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">{activity.name || activity}</p>
                    {activity.description && <p className="text-xs text-gray-600 mt-1">{activity.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthDetail;