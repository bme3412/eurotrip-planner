'use client';

export function WeatherSection({ weather }) {
  if (!weather) return null;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-5 mb-5 transition duration-200 hover:shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {weather.average_temperature && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Temperature</h4>
            <div className="flex items-center">
              <div className="bg-orange-100 p-2 rounded-full text-orange-600 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v7.95l3.95 3.95a1 1 0 01-1.414 1.414l-4.242-4.243a1 1 0 01-.293-.707V3a1 1 0 011-1z" clipRule="evenodd" />
                  <path d="M10 18a5 5 0 100-10 5 5 0 000 10z" />
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
          </div>
        )}
        
        {weather.precipitation && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Precipitation</h4>
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-gray-700">{weather.precipitation}</span>
            </div>
          </div>
        )}
      </div>
      
      {weather.general_tips && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-start">
            <div className="bg-yellow-100 p-2 rounded-full text-yellow-600 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Weather Tips</h4>
              <p className="text-gray-600">{weather.general_tips}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}