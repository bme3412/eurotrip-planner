// src/components/city-guides/CityHeader.js
import React from 'react';
import Link from 'next/link';

const CityHeader = ({ cityName, country, summary }) => {
  // Get current month for seasonal recommendations
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonth = months[new Date().getMonth()];
  
  return (
    <header className="mb-12">
      <div className="flex flex-col-reverse md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <nav className="text-sm breadcrumbs mb-2">
            <ul className="flex space-x-2">
              <li>
                <Link href="/city-guides" className="text-blue-500 hover:text-blue-700">
                  City Guides
                </Link>
              </li>
              <li className="before:content-['/'] before:mx-2 before:text-gray-400">
                <Link href={`/regions/${country.toLowerCase()}`} className="text-blue-500 hover:text-blue-700">
                  {country}
                </Link>
              </li>
              <li className="before:content-['/'] before:mx-2 before:text-gray-400">
                <span className="text-gray-600">{cityName}</span>
              </li>
            </ul>
          </nav>
          
          <h1 className="text-4xl font-bold mb-2">{cityName}</h1>
          <p className="text-gray-600">{country}</p>
        </div>
        
        <div className="mb-4 md:mb-0">
          <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
            </svg>
            <span>Plan Your Visit</span>
          </button>
        </div>
      </div>
      
      {/* City summary section */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="md:flex items-start">
          <div className="md:w-2/3 md:pr-8">
            <h2 className="text-xl font-semibold mb-3">About {cityName}</h2>
            <div className="prose max-w-none">
              {summary ? (
                <p>{summary.description || summary.overview || 'A beautiful destination waiting to be explored.'}</p>
              ) : (
                <p>
                  {cityName} is a vibrant destination in {country} with rich culture, history, and 
                  unique attractions. Explore the city\s landmarks, museums, neighborhoods and local cuisine.
                </p>
              )}
            </div>
            
            {/* Seasonal recommendation */}
            <div className="mt-4 p-4 bg-white rounded-md border border-blue-100">
              <h3 className="text-md font-medium text-blue-800 mb-1">
                <span className="mr-2">🗓️</span>
                Visiting in {currentMonth}?
              </h3>
              <p className="text-sm text-gray-700">
                {summary?.seasonal_recommendations?.[currentMonth.toLowerCase()] || 
                  `${currentMonth} is a good time to experience ${cityName}. Check the seasonal activities section below for more details.`
                }
              </p>
            </div>
          </div>
          
          <div className="mt-6 md:mt-0 md:w-1/3">
            <div className="bg-white p-4 rounded-md shadow-sm">
              <h3 className="font-medium mb-3">Quick Facts</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">🏙️</span>
                  <div>
                    <span className="font-medium">Region:</span> {country}
                  </div>
                </li>
                {summary?.population && (
                  <li className="flex items-start">
                    <span className="mr-2">👥</span>
                    <div>
                      <span className="font-medium">Population:</span> {summary.population.toLocaleString()}
                    </div>
                  </li>
                )}
                {summary?.language && (
                  <li className="flex items-start">
                    <span className="mr-2">🗣️</span>
                    <div>
                      <span className="font-medium">Language:</span> {summary.language}
                    </div>
                  </li>
                )}
                {summary?.currency && (
                  <li className="flex items-start">
                    <span className="mr-2">💶</span>
                    <div>
                      <span className="font-medium">Currency:</span> {summary.currency}
                    </div>
                  </li>
                )}
                {summary?.best_time_to_visit && (
                  <li className="flex items-start">
                    <span className="mr-2">🗓️</span>
                    <div>
                      <span className="font-medium">Best time to visit:</span> {summary.best_time_to_visit}
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CityHeader;