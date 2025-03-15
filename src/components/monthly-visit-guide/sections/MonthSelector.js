'use client';

import { getMonthColor } from '../utils/monthUtils';

export function MonthSelector({ months, monthlyData, selectedMonth, setSelectedMonth }) {
  return (
    <div className="mb-8">
      <div className="flex items-center mb-5">
        <div className="bg-blue-100 p-2 rounded-full text-blue-600 mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800">Best Time to Visit</h3>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-md mb-4">
        <ColorLegend />
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {months.map((month) => {
            const isAvailable = monthlyData && !!monthlyData[month];
            const isSelected = selectedMonth === month;
            let btnClass = 'py-2 px-1 text-center text-sm rounded-md border transition-all duration-200 ';
            
            if (!isAvailable) {
              btnClass += 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60';
            } else if (isSelected) {
              btnClass += 'bg-blue-600 text-white border-blue-600 font-medium';
            } else {
              btnClass += getMonthColor(month, monthlyData);
            }
            
            return (
              <button
                key={month}
                className={btnClass}
                onClick={() => isAvailable && setSelectedMonth(month)}
                disabled={!isAvailable}
                aria-label={`View ${month} information`}
              >
                {month.substring(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ColorLegend() {
  return (
    <div className="flex flex-wrap items-center mb-4 gap-3">
      <div className="flex space-x-2">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
          <span className="text-xs text-gray-600">Excellent</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
          <span className="text-xs text-gray-600">Good</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
          <span className="text-xs text-gray-600">Average</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-orange-500 mr-1"></div>
          <span className="text-xs text-gray-600">Less Ideal</span>
        </div>
      </div>
    </div>
  );
}