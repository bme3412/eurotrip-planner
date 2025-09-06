'use client';

import React, { useState, useEffect } from 'react';

const ParisMonthlyContent = ({ monthlyData, cityName }) => {
  const [parisData, setParisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonthName = months[currentMonth];

  // Load Paris monthly data dynamically
  useEffect(() => {
    const loadParisData = async () => {
      try {
        setLoading(true);
        const monthFileName = currentMonthName.toLowerCase();
        const response = await fetch(`/data/France/paris/monthly/${monthFileName}.json`);
        if (response.ok) {
          const data = await response.json();
          setParisData(data[currentMonthName]);
        }
      } catch (error) {
        console.error('Error loading Paris data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (cityName.toLowerCase() === 'paris') {
      loadParisData();
    }
  }, [currentMonth, currentMonthName, cityName]);

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      if (direction === 'prev') {
        return prev === 0 ? 11 : prev - 1;
      } else {
        return prev === 11 ? 0 : prev + 1;
      }
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!parisData) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Paris in {currentMonthName}</h1>
          <p className="text-gray-600 text-sm">Discover what makes {currentMonthName} special in Paris</p>
        </div>
        
        <button
          onClick={() => navigateMonth('next')}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reasons to Visit */}
        {parisData.reasons_to_visit && parisData.reasons_to_visit.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Reasons to Visit
            </h3>
            <ul className="space-y-4">
              {parisData.reasons_to_visit.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">•</span>
                  <div>
                    <div className="font-semibold text-green-800 mb-1">{item.reason}</div>
                    <p className="text-sm text-green-700 leading-relaxed">{item.details}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Things to Consider */}
        {parisData.reasons_to_reconsider && parisData.reasons_to_reconsider.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
              <span className="text-amber-500 mr-2">⚠</span>
              Things to Consider
            </h3>
            <ul className="space-y-4">
              {parisData.reasons_to_reconsider.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-amber-500 mr-3 mt-1">•</span>
                  <div>
                    <div className="font-semibold text-amber-800 mb-1">{item.reason}</div>
                    <p className="text-sm text-amber-700 leading-relaxed">{item.details}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParisMonthlyContent;