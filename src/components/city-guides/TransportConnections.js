'use client';

import React, { useState, useMemo } from 'react';

// Utility function to get icon based on transportation type
const getTransportIcon = (type) => {
  if (type === 'train') return '🚄';
  if (type === 'flight') return '✈️';
  if (type === 'bus') return '🚌';
  return '🌍';
};

// Empty state component
const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
    <div className="w-12 h-12 text-gray-400 mb-3">🚆</div>
    <h3 className="mt-2 text-xl font-medium text-gray-600">{message}</h3>
    <p className="mt-2 text-gray-500">We don&apos;t have this information available yet.</p>
  </div>
);

const TransportConnections = ({ connections, currentCity = '' }) => {
  // --- HOOKS MOVED TO TOP ---
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeCountry, setActiveCountry] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  
  // Use useMemo safely after checking for connections
  const destinations = useMemo(() => {
    return connections?.destinations || []; 
  }, [connections]);
  
  const countries = useMemo(() => {
    if (!destinations.length) return ['all'];
    const uniqueCountries = [...new Set(destinations.map(dest => dest.country))];
    return ['all', ...uniqueCountries];
  }, [destinations]);

  const filteredDestinations = useMemo(() => {
    if (!destinations.length) return [];
    return destinations.filter(dest => {
      // Filter by transport type
      const hasSelectedTransport = 
        activeFilter === 'all' || 
        (activeFilter === 'train' && (dest.directWithinCountryTrain || dest.intraEuropeTrain)) ||
        (activeFilter === 'flight' && dest.intraEuropeFlight);
      
      // Filter by country
      const matchesCountry = 
        activeCountry === 'all' || 
        dest.country === activeCountry;
      
      return hasSelectedTransport && matchesCountry;
    });
  }, [destinations, activeFilter, activeCountry]);

  const destinationsByCountry = useMemo(() => {
    if (!filteredDestinations.length) return {};
    const grouped = {};
    
    filteredDestinations.forEach(dest => {
      if (!grouped[dest.country]) {
        grouped[dest.country] = [];
      }
      grouped[dest.country].push(dest);
    });
    
    return grouped;
  }, [filteredDestinations]);

  const stats = useMemo(() => {
    if (!destinations.length) {
      return { totalDestinations: 0, countriesCount: 0, trainDestinations: 0, flightDestinations: 0 };
    }
    const totalDestinations = destinations.length;
    const countriesCount = new Set(destinations.map(d => d.country)).size;
    const trainDestinations = destinations.filter(d => d.directWithinCountryTrain || d.intraEuropeTrain).length;
    const flightDestinations = destinations.filter(d => d.intraEuropeFlight).length;
    
    return {
      totalDestinations,
      countriesCount,
      trainDestinations,
      flightDestinations
    };
  }, [destinations]);
  // --- END OF MOVED HOOKS ---

  // Early return if no data (can happen after hooks are initialized)
  if (!connections) {
    return <EmptyState message="No Transportation Data Available" />;
  }
  
  // Handle the destinations-only format - check after hooks
  // Note: 'destinations' is already memoized safely above
  if (!destinations || destinations.length === 0) {
    return <EmptyState message="No Destination Data Available" />;
  }
  
  return (
    <div className="p-6">
      {/* Header section with city name */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-lg shadow-lg p-6 mb-8 text-white">
        <h2 className="text-2xl font-bold mb-3">Getting Around {currentCity}</h2>
        <p className="text-blue-100 mb-4">Transportation options and travel information</p>
      </div>
      
      {/* Filters and view toggle */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transport Type</label>
            <select 
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="all">All Transport</option>
              <option value="train">Train Only</option>
              <option value="flight">Flight Only</option>
            </select>
          </div>
          
          {countries.length > 2 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select 
                className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={activeCountry}
                onChange={(e) => setActiveCountry(e.target.value)}
              >
                {countries.map(country => (
                  <option key={country} value={country}>
                    {country === 'all' ? 'All Countries' : country}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-l-md ${
              viewMode === 'table' 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setViewMode('table')}
          >
            Table View
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-r-md ${
              viewMode === 'cards' 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setViewMode('cards')}
          >
            Card View
          </button>
        </div>
      </div>
      
      {/* Results count */}
      <div className="text-sm text-gray-500 mb-4">
        Showing {filteredDestinations.length} out of {destinations.length} destinations
      </div>
      
      {/* Table View */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Why Visit</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Train</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flight</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDestinations.map((dest, index) => (
                <tr key={`${dest.city}-${index}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <span className="text-lg mr-3 hidden md:block">{getTransportIcon(
                        dest.intraEuropeFlight ? 'flight' : 'train'
                      )}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{dest.city}</div>
                        <div className="text-xs text-gray-500">{dest.country}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{dest.whyGo}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(dest.directWithinCountryTrain || dest.intraEuropeTrain) ? (
                      <div className="text-sm">
                        <div className="font-medium text-green-600">
                          {dest.directWithinCountryTrain?.journeyTime || dest.intraEuropeTrain?.journeyTime}
                        </div>
                        <div className="text-xs text-gray-500">
                          {dest.directWithinCountryTrain?.frequency || dest.intraEuropeTrain?.frequency}
                          {(dest.directWithinCountryTrain?.stationInParis || dest.intraEuropeTrain?.stationInParis) && (
                            <div className="mt-1">
                              From: {dest.directWithinCountryTrain?.stationInParis || dest.intraEuropeTrain?.stationInParis}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Not available</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {dest.intraEuropeFlight ? (
                      <div className="text-sm">
                        <div className="font-medium text-blue-600">{dest.intraEuropeFlight.approxFlightTime}</div>
                        <div className="text-xs text-gray-500">
                          {dest.intraEuropeFlight.frequency}
                          {dest.intraEuropeFlight.airportsInParis && (
                            <div className="mt-1">
                              From: {dest.intraEuropeFlight.airportsInParis.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Not available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Card View */}
      {viewMode === 'cards' && (
        <div className="space-y-8">
          {Object.entries(destinationsByCountry).map(([country, dests]) => (
            <div key={country} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <span className="mr-2">🌍</span>
                  {country}
                  <span className="ml-2 text-sm font-normal text-gray-500">({dests.length} destinations)</span>
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dests.map((dest, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h4 className="font-medium text-gray-800">{dest.city}</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="text-sm text-gray-700">{dest.whyGo}</p>
                      
                      <div className="space-y-2 pt-2 border-t">
                        {(dest.directWithinCountryTrain || dest.intraEuropeTrain) && (
                          <div className="flex items-start">
                            <span className="text-lg mr-2">🚄</span>
                            <div>
                              <div className="text-sm font-medium">Train</div>
                              <div className="text-sm text-gray-600">
                                {dest.directWithinCountryTrain?.journeyTime || dest.intraEuropeTrain?.journeyTime} • {dest.directWithinCountryTrain?.frequency || dest.intraEuropeTrain?.frequency}
                              </div>
                              {(dest.directWithinCountryTrain?.stationInParis || dest.intraEuropeTrain?.stationInParis) && (
                                <div className="text-xs text-gray-500">
                                  From: {dest.directWithinCountryTrain?.stationInParis || dest.intraEuropeTrain?.stationInParis}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {dest.intraEuropeFlight && (
                          <div className="flex items-start">
                            <span className="text-lg mr-2">✈️</span>
                            <div>
                              <div className="text-sm font-medium">Flight</div>
                              <div className="text-sm text-gray-600">
                                {dest.intraEuropeFlight.approxFlightTime} • {dest.intraEuropeFlight.frequency}
                              </div>
                              {dest.intraEuropeFlight.airportsInParis && (
                                <div className="text-xs text-gray-500">
                                  From: {dest.intraEuropeFlight.airportsInParis.join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Additional Information */}
      <div className="bg-blue-50 p-6 rounded-lg mt-8 border border-blue-100">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Travel Tips</h3>
        <ul className="space-y-2 text-blue-700">
          <li className="flex items-start">
            <span className="mr-2 text-blue-500">•</span>
            <p>Book train tickets in advance to secure the best fares, especially for international journeys.</p>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-blue-500">•</span>
            <p>Consider rail passes if you plan to visit multiple destinations within a short period.</p>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-blue-500">•</span>
            <p>For flights, arrive at least 2 hours before international departures.</p>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-blue-500">•</span>
            <p>Check connection times when booking multi-leg journeys.</p>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TransportConnections;