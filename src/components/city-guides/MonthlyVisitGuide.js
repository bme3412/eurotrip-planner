'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Tab } from '@headlessui/react';

export default function MergedMonthlyGuide({ monthlyData, currentMonth }) {
  // Normalize monthlyData keys (e.g. "January" or "january" becomes "january")
  const normalizedData = useMemo(() => {
    const data = {};
    if (monthlyData) {
      Object.entries(monthlyData).forEach(([key, value]) => {
        data[key.toLowerCase()] = value;
      });
    }
    return data;
  }, [monthlyData]);

  // Default list includes standard months plus seasonal labels
  const defaultMonths = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
    'spring', 'summer', 'fall', 'winter'
  ];

  // Get available months (using default order if data is provided)
  const availableMonths = defaultMonths.filter(month => normalizedData[month]) || Object.keys(normalizedData);

  // Determine initial month: use prop if provided and exists, else default to current month name (in lower-case)
  const initialMonth = currentMonth 
    ? currentMonth.toLowerCase() 
    : new Date().toLocaleString('en-US', { month: 'long' }).toLowerCase();
  const [selectedMonth, setSelectedMonth] = useState(
    normalizedData[initialMonth] ? initialMonth : (availableMonths[0] || initialMonth)
  );

  // Helper to capitalize the first letter (for display)
  const formatMonthLabel = (month) => month.charAt(0).toUpperCase() + month.slice(1);

  // Compute a color style based on the “visit” data (if available)
  const getMonthColor = (month) => {
    const data = normalizedData[month];
    if (!data) return 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60';
    const proCount = data.reasons_to_visit ? data.reasons_to_visit.length : 0;
    const conCount = data.reasons_to_reconsider ? data.reasons_to_reconsider.length : 0;
    const score = proCount - conCount;
    if (score >= 3)
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 hover:border-green-300';
    if (score >= 1)
      return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 hover:border-blue-300';
    if (score === 0)
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 hover:border-yellow-300';
    return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 hover:border-orange-300';
  };

  // Get the data for the selected month
  const currentMonthData = normalizedData[selectedMonth] || {};

  // --- Render functions (merged from both components) ---

  const renderProsConsBadges = (items, type) => {
    if (!items || items.length === 0)
      return (
        <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
          No information available.
        </div>
      );
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg shadow-md p-5 border-l-4 transition duration-200 hover:shadow-lg ${
              type === 'pros' ? 'border-green-500' : 'border-red-500'
            }`}
          >
            <h4
              className={`font-bold text-base mb-2 flex items-center ${
                type === 'pros' ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {type === 'pros' ? (
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              )}
              {item.reason}
            </h4>
            <p className="text-gray-700 pl-7">{item.details}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderWeatherInfo = (weather) => {
    if (!weather) return null;
    return (
      <div className="bg-white rounded-lg shadow-md p-5 mb-5 transition duration-200 hover:shadow-lg">
        {weather.average_temperature && (
          <div className="flex items-center">
            <div className="bg-orange-100 p-2 rounded-full text-orange-600 mr-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v7.95l3.95 3.95a1 1 0 01-1.414 1.414l-4.242-4.243a1 1 0 01-.293-.707V3a1 1 0 011-1z"
                  clipRule="evenodd"
                ></path>
                <path d="M10 18a5 5 0 100-10 5 5 0 000 10z"></path>
              </svg>
            </div>
            <div>
              <span className="font-bold text-xl text-gray-800">
                {weather.average_temperature.high}°C
              </span>
              <span className="mx-2 text-gray-400">/</span>
              <span className="font-medium text-lg text-gray-600">
                {weather.average_temperature.low}°C
              </span>
              <div className="text-xs text-gray-500 mt-1">High / Low</div>
            </div>
          </div>
        )}
        {weather.precipitation && (
          <div className="flex items-center mt-4">
            <div className="bg-blue-100 p-2 rounded-full text-blue-600 mr-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
            <span className="text-gray-700">{weather.precipitation}</span>
          </div>
        )}
        {weather.general_tips && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-start">
            <div className="bg-yellow-100 p-2 rounded-full text-yellow-600 mr-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Weather Tips</h4>
              <p className="text-gray-600">{weather.general_tips}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTourismInfo = (tourism) => {
    if (!tourism) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {tourism.crowds && (
          <div className="bg-white rounded-lg shadow-md p-5 transition duration-200 hover:shadow-lg">
            <div className="flex items-start">
              <div className="bg-purple-100 p-2 rounded-full text-purple-600 mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Crowd Levels</h4>
                <p className="text-gray-600">{tourism.crowds}</p>
              </div>
            </div>
          </div>
        )}
        {tourism.pricing && (
          <div className="bg-white rounded-lg shadow-md p-5 transition duration-200 hover:shadow-lg">
            <div className="flex items-start">
              <div className="bg-green-100 p-2 rounded-full text-green-600 mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Pricing</h4>
                <p className="text-gray-600">{tourism.pricing}</p>
              </div>
            </div>
          </div>
        )}
        {tourism.overall_atmosphere && (
          <div className="bg-white rounded-lg shadow-md p-5 transition duration-200 hover:shadow-lg">
            <div className="flex items-start">
              <div className="bg-indigo-100 p-2 rounded-full text-indigo-600 mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Atmosphere</h4>
                <p className="text-gray-600">{tourism.overall_atmosphere}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEventsInfo = (events) => {
    if (!events || events.length === 0)
      return (
        <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
          No events scheduled during this period.
        </div>
      );
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-5">
        {events.map((event, index) => (
          <div
            key={index}
            className={`p-5 ${index !== events.length - 1 ? 'border-b border-gray-100' : ''} transition duration-200 hover:bg-blue-50`}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <h5 className="font-semibold text-gray-800 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                {event.name}
              </h5>
              {event.date && (
                <span className="text-sm bg-blue-100 text-blue-700 py-1 px-3 rounded-full font-medium">
                  {event.date}
                </span>
              )}
            </div>
            {event.description && (
              <p className="text-gray-600 mt-2 pl-7">{event.description}</p>
            )}
            {event.notes && (
              <div className="mt-3 pl-7 pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-500 italic flex items-start">
                  <svg className="w-4 h-4 text-yellow-500 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  {event.notes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderExperiencesInfo = (experiences) => {
    if (!experiences || experiences.length === 0)
      return (
        <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
          No recommended activities for this period.
        </div>
      );
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {experiences.map((exp, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden transition duration-200 hover:shadow-lg">
            <div className="p-5">
              <div className="flex items-start">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600 mr-3 flex-shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </div>
                <div>
                  <h5 className="font-bold text-gray-800 mb-1">{exp.activity}</h5>
                  {exp.where && (
                    <p className="text-sm text-blue-600 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                      {exp.where}
                    </p>
                  )}
                </div>
              </div>
              {exp.description && (
                <p className="text-gray-600 mt-3 pl-10">{exp.description}</p>
              )}
            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                {exp.best_time && (
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-500 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                    <div>
                      <span className="text-xs text-gray-500">Best time</span>
                      <p className="text-sm text-gray-700">{exp.best_time}</p>
                    </div>
                  </div>
                )}
                {exp.estimated_cost && (
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-500 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                    <div>
                      <span className="text-xs text-gray-500">Cost</span>
                      <p className="text-sm text-gray-700">{exp.estimated_cost}</p>
                    </div>
                  </div>
                )}
                {exp.weather_dependent !== undefined && (
                  <div className="flex items-center col-span-2">
                    <svg className="w-4 h-4 text-gray-500 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"></path>
                    </svg>
                    <div>
                      <span className="text-xs text-gray-500">Weather dependent</span>
                      <p className="text-sm text-gray-700">{exp.weather_dependent ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                )}
              </div>
              {exp.practical_tips && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex items-start">
                  <svg className="w-4 h-4 text-yellow-500 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 011 1v3a1 1 0 01-2 0V7a1 1 0 011-1z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Tip:</span> {exp.practical_tips}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // --- Main Layout ---

  if (!monthlyData || Object.keys(normalizedData).length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block p-4 rounded-full bg-gray-100 text-gray-500 mb-4">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Monthly Data Available</h3>
        <p className="text-gray-500">There is no monthly information available for this city yet.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Month Selector */}
      <div className="mb-8">
        <div className="flex items-center mb-5">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600 mr-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800">Monthly Guide</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {availableMonths.map((month) => {
            const isSelected = selectedMonth === month;
            let btnClass = 'py-2 px-1 text-center text-sm rounded-md border transition-all duration-200 ';
            if (isSelected) {
              btnClass += 'bg-blue-600 text-white border-blue-600 font-medium';
            } else {
              btnClass += getMonthColor(month);
            }
            return (
              <button
                key={month}
                className={btnClass}
                onClick={() => setSelectedMonth(month)}
                aria-label={`View ${formatMonthLabel(month)} information`}
              >
                {formatMonthLabel(month).substring(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Section */}
      {currentMonthData.overview && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-600">
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              {formatMonthLabel(selectedMonth)} Overview
            </h3>
            <p className="text-gray-600">{currentMonthData.overview}</p>
          </div>
        </div>
      )}

      {/* Visit Guide Section (if relevant data exists) */}
      {(currentMonthData.reasons_to_visit ||
        currentMonthData.reasons_to_reconsider ||
        currentMonthData.first_half ||
        currentMonthData.second_half) && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Visit Guide for {formatMonthLabel(selectedMonth)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {currentMonthData.reasons_to_visit && (
              <div>
                <h4 className="text-lg font-bold text-green-700 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  Reasons to Visit
                </h4>
                {renderProsConsBadges(currentMonthData.reasons_to_visit, 'pros')}
              </div>
            )}
            {currentMonthData.reasons_to_reconsider && (
              <div>
                <h4 className="text-lg font-bold text-red-700 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  Reasons to Reconsider
                </h4>
                {renderProsConsBadges(currentMonthData.reasons_to_reconsider, 'cons')}
              </div>
            )}
          </div>
          {(currentMonthData.first_half || currentMonthData.second_half) && (
            <Tab.Group>
              <div className="flex items-center mb-4">
                <div className="bg-indigo-100 p-2 rounded-full text-indigo-600 mr-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h1a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Detailed Breakdown
                </div>
              </div>
              <Tab.List className="flex space-x-2 rounded-xl bg-indigo-50 p-1 mb-4 shadow-sm">
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-3 text-sm font-medium leading-5 transition duration-200 ease-in-out focus:outline-none ${
                      selected
                        ? 'bg-white text-indigo-700 shadow-md'
                        : 'text-indigo-600 hover:bg-indigo-100/80 hover:text-indigo-800'
                    }`
                  }
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                    Early {formatMonthLabel(selectedMonth)}
                  </div>
                </Tab>
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-3 text-sm font-medium leading-5 transition duration-200 ease-in-out focus:outline-none ${
                      selected
                        ? 'bg-white text-indigo-700 shadow-md'
                        : 'text-indigo-600 hover:bg-indigo-100/80 hover:text-indigo-800'
                    }`
                  }
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                    Late {formatMonthLabel(selectedMonth)}
                  </div>
                </Tab>
              </Tab.List>
              <Tab.Panels className="mt-4">
                <Tab.Panel className="rounded-xl bg-white p-5 shadow-md">
                  {currentMonthData.first_half ? (
                    <div className="space-y-6">
                      {currentMonthData.first_half.weather && (
                        <div className="mb-8">
                          <h5 className="text-base font-bold text-gray-800 mb-3 border-b pb-2">
                            Weather Conditions
                          </h5>
                          {renderWeatherInfo(currentMonthData.first_half.weather)}
                        </div>
                      )}
                      {currentMonthData.first_half.tourism_level && (
                        <div className="mb-8">
                          <h5 className="text-base font-bold text-gray-800 mb-3 border-b pb-2">
                            Tourism & Crowds
                          </h5>
                          {renderTourismInfo(currentMonthData.first_half.tourism_level)}
                        </div>
                      )}
                      {currentMonthData.first_half.events_holidays &&
                        currentMonthData.first_half.events_holidays.length > 0 && (
                          <div className="mb-8">
                            <h5 className="text-base font-bold text-gray-800 mb-3 border-b pb-2">
                              Events & Holidays
                            </h5>
                            {renderEventsInfo(currentMonthData.first_half.events_holidays)}
                          </div>
                        )}
                      {currentMonthData.first_half.unique_experiences &&
                        currentMonthData.first_half.unique_experiences.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-base font-bold text-gray-800 mb-3 border-b pb-2">
                              Recommended Activities
                            </h5>
                            {renderExperiencesInfo(currentMonthData.first_half.unique_experiences)}
                          </div>
                        )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No detailed early month information available.</p>
                  )}
                </Tab.Panel>
                <Tab.Panel className="rounded-xl bg-white p-5 shadow-md">
                  {currentMonthData.second_half ? (
                    <div className="space-y-6">
                      {currentMonthData.second_half.weather && (
                        <div className="mb-8">
                          <h5 className="text-base font-bold text-gray-800 mb-3 border-b pb-2">
                            Weather Conditions
                          </h5>
                          {renderWeatherInfo(currentMonthData.second_half.weather)}
                        </div>
                      )}
                      {currentMonthData.second_half.tourism_level && (
                        <div className="mb-8">
                          <h5 className="text-base font-bold text-gray-800 mb-3 border-b pb-2">
                            Tourism & Crowds
                          </h5>
                          {renderTourismInfo(currentMonthData.second_half.tourism_level)}
                        </div>
                      )}
                      {currentMonthData.second_half.events_holidays &&
                        currentMonthData.second_half.events_holidays.length > 0 && (
                          <div className="mb-8">
                            <h5 className="text-base font-bold text-gray-800 mb-3 border-b pb-2">
                              Events & Holidays
                            </h5>
                            {renderEventsInfo(currentMonthData.second_half.events_holidays)}
                          </div>
                        )}
                      {currentMonthData.second_half.unique_experiences &&
                        currentMonthData.second_half.unique_experiences.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-base font-bold text-gray-800 mb-3 border-b pb-2">
                              Recommended Activities
                            </h5>
                            {renderExperiencesInfo(currentMonthData.second_half.unique_experiences)}
                          </div>
                        )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No detailed late month information available.</p>
                  )}
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          )}
        </div>
      )}

      {/* Events & Activities Section (if data exists outside of the detailed breakdown) */}
      {(currentMonthData.events ||
        currentMonthData.activities ||
        currentMonthData.tips ||
        (currentMonthData.weather &&
          !currentMonthData.first_half &&
          !currentMonthData.second_half)) && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Events & Activities for {formatMonthLabel(selectedMonth)}
          </h3>
          {currentMonthData.weather && !currentMonthData.first_half && !currentMonthData.second_half && (
            <div className="mb-6 p-4 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-800 mb-1 flex items-center">
                <span className="mr-2">🌤️</span>
                Weather
              </h4>
              <p className="text-gray-700">{currentMonthData.weather}</p>
              {currentMonthData.temperature && (
                <div className="mt-2 flex flex-wrap gap-4">
                  <div className="text-sm">
                    <span className="font-medium">Average High:</span>{' '}
                    {currentMonthData.temperature.high}°C
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Average Low:</span>{' '}
                    {currentMonthData.temperature.low}°C
                  </div>
                </div>
              )}
            </div>
          )}
          {currentMonthData.events && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="mr-2">🎭</span>
                Events & Festivals
              </h4>
              <ul className="space-y-3">
                {currentMonthData.events.map((event, index) => (
                  <li key={index} className="bg-gray-50 p-3 rounded-md">
                    <h5 className="font-medium">{event.name}</h5>
                    {event.date && (
                      <p className="text-sm text-gray-600 mt-1">📅 {event.date}</p>
                    )}
                    {event.description && (
                      <p className="text-sm mt-1">{event.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {currentMonthData.activities && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="mr-2">🚶</span>
                Recommended Activities
              </h4>
              <ul className="space-y-2">
                {currentMonthData.activities.map((activity, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    <div>
                      {typeof activity === 'string' ? (
                        <p>{activity}</p>
                      ) : (
                        <>
                          <p className="font-medium">{activity.name}</p>
                          {activity.description && (
                            <p className="text-sm mt-1">{activity.description}</p>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {currentMonthData.tips && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="mr-2">💡</span>
                Traveler Tips
              </h4>
              <ul className="space-y-2">
                {currentMonthData.tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-yellow-500 mr-2">•</span>
                    <p className="text-gray-700">{tip}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!(currentMonthData.events || currentMonthData.activities || currentMonthData.tips || currentMonthData.weather) && (
            <div className="text-center py-6">
              <p className="text-gray-500">
                Detailed events and activities information is not available for {formatMonthLabel(selectedMonth)}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
