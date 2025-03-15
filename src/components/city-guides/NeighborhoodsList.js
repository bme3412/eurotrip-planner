// src/components/city-guides/NeighborhoodsList.js
'use client';

import React, { useState } from 'react';

const NeighborhoodCard = ({ neighborhood }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Get appropriate icon for the vibe
  const getVibeIcon = (vibe) => {
    if (!vibe) return '';
    
    const vibeText = vibe.toLowerCase();
    if (vibeText.includes('trendy') || vibeText.includes('hip')) return '🔥';
    if (vibeText.includes('historic') || vibeText.includes('traditional')) return '🏛️';
    if (vibeText.includes('quiet') || vibeText.includes('peaceful')) return '🧘';
    if (vibeText.includes('upscale') || vibeText.includes('luxury')) return '💎';
    if (vibeText.includes('bohemian') || vibeText.includes('artistic')) return '🎨';
    if (vibeText.includes('lively') || vibeText.includes('bustling')) return '🎭';
    if (vibeText.includes('family')) return '👨‍👩‍👧‍👦';
    if (vibeText.includes('tourist')) return '📸';
    if (vibeText.includes('local')) return '🏠';
    return '📍';
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold">{neighborhood.name}</h3>
            {neighborhood.vibe && (
              <div className="mt-1 text-sm text-gray-600 flex items-center">
                <span className="mr-1">{getVibeIcon(neighborhood.vibe)}</span>
                {neighborhood.vibe}
              </div>
            )}
          </div>
          <div className="text-gray-400">
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 pt-0 border-t border-gray-100">
          <p className="text-gray-700 my-3">{neighborhood.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {neighborhood.known_for && (
              <div>
                <h4 className="font-medium text-gray-900">Known For</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 mt-1">
                  {Array.isArray(neighborhood.known_for) ? (
                    neighborhood.known_for.map((item, index) => (
                      <li key={`known-${neighborhood.id}-${index}`}>{item}</li>
                    ))
                  ) : (
                    <li key={`known-${neighborhood.id}-0`}>{neighborhood.known_for}</li>
                  )}
                </ul>
              </div>
            )}
            
            {neighborhood.best_for && (
              <div>
                <h4 className="font-medium text-gray-900">Best For</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 mt-1">
                  {Array.isArray(neighborhood.best_for) ? (
                    neighborhood.best_for.map((item, index) => (
                      <li key={`best-${neighborhood.id}-${index}`}>{item}</li>
                    ))
                  ) : (
                    <li key={`best-${neighborhood.id}-0`}>{neighborhood.best_for}</li>
                  )}
                </ul>
              </div>
            )}
            
            {neighborhood.dont_miss && (
              <div>
                <h4 className="font-medium text-gray-900">Don\t Miss</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 mt-1">
                  {Array.isArray(neighborhood.dont_miss) ? (
                    neighborhood.dont_miss.map((item, index) => (
                      <li key={`miss-${neighborhood.id}-${index}`}>{item}</li>
                    ))
                  ) : (
                    <li key={`miss-${neighborhood.id}-0`}>{neighborhood.dont_miss}</li>
                  )}
                </ul>
              </div>
            )}
            
            {neighborhood.tips && (
              <div>
                <h4 className="font-medium text-gray-900">Tips</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 mt-1">
                  {Array.isArray(neighborhood.tips) ? (
                    neighborhood.tips.map((item, index) => (
                      <li key={`tip-${neighborhood.id}-${index}`}>{item}</li>
                    ))
                  ) : (
                    <li key={`tip-${neighborhood.id}-0`}>{neighborhood.tips}</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const NeighborhoodsList = ({ neighborhoods }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add unique IDs to neighborhoods if they don't have them already
  const neighborhoodsWithIds = neighborhoods.map((neighborhood, index) => ({
    ...neighborhood,
    id: neighborhood.id || `neighborhood-${index}`
  }));
  
  // Filter neighborhoods based on search
  const filteredNeighborhoods = neighborhoodsWithIds.filter(neighborhood => 
    neighborhood.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (neighborhood.vibe && neighborhood.vibe.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search neighborhoods by name or vibe..."
          className="w-full p-3 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="space-y-4">
        {filteredNeighborhoods.map((neighborhood) => (
          <NeighborhoodCard key={neighborhood.id} neighborhood={neighborhood} />
        ))}
        
        {filteredNeighborhoods.length === 0 && (
          <p className="text-center text-gray-500 py-8">No neighborhoods match your search</p>
        )}
      </div>
    </div>
  );
};

export default NeighborhoodsList;