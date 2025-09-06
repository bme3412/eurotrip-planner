import React from 'react';

/**
 * Panel displaying a ranked list of filtered destinations.
 * @param {Object} props - Component props
 * @param {Array<Object>} props.destinationsWithRatings - Array of destination objects including rating
 * @param {Function} props.onClose - Function to close the entire panel
 * @param {Function} props.onCitySelect - Function to call when a city is selected for details view
 * @returns {JSX.Element} - Ranked list panel component
 */
const RankedListPanel = ({ destinationsWithRatings = [], onClose, onCitySelect }) => {
  // Sort destinations by rating, highest first
  const sortedDestinations = [...destinationsWithRatings].sort((a, b) => b.rating - a.rating);

  return (
    <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg w-72 max-h-[calc(100vh-4rem)] flex flex-col z-20 overflow-hidden">
      {/* Header (Always Visible) */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 flex-shrink-0">
        <h4 className="font-bold text-md text-gray-800">
          Ranked Destinations
        </h4>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-800"
          title="Close panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Content Area (Always shows the list now) */}
      <div className="overflow-y-auto flex-grow pr-2 -mr-2 custom-scrollbar">
        {sortedDestinations.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4">No destinations match the current filters.</p>
        ) : (
          <ul className="space-y-1 animate-fade-in">
            {sortedDestinations.map((dest, index) => (
              <li 
                key={dest.title}
                onClick={() => onCitySelect(dest)}
                className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <span className="font-medium text-gray-700 flex-1 mr-2 truncate">
                  {index + 1}. {dest.title}
                </span>
                <span className={`font-bold text-right whitespace-nowrap ${dest.rating >= 4 ? 'text-green-600' : dest.rating >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {(dest.rating || 0).toFixed(1)} ★
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RankedListPanel; 