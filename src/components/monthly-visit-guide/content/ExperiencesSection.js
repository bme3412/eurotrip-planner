'use client';

export function ExperiencesSection({ experiences }) {
  if (!experiences || experiences.length === 0) return (
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h5 className="font-bold text-gray-800 mb-1">{exp.activity}</h5>
                {exp.where && (
                  <p className="text-sm text-blue-600 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
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
                  <svg className="w-4 h-4 text-gray-500 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                  </svg>
                  <div>
                    <span className="text-xs text-gray-500">Best time</span>
                    <p className="text-sm text-gray-700">{exp.best_time}</p>
                  </div>
                </div>
              )}
              
              {exp.estimated_cost && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-500 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"></path>
                  </svg>
                  <div>
                    <span className="text-xs text-gray-500">Cost</span>
                    <p className="text-sm text-gray-700">{exp.estimated_cost}</p>
                  </div>
                </div>
              )}
              
              {exp.weather_dependent !== undefined && (
                <div className="flex items-center col-span-2">
                  <svg className="w-4 h-4 text-gray-500 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
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
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-500 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                  </svg>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Tip:</span> {exp.practical_tips}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}