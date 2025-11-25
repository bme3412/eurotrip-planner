'use server';

export function EventsSection({ events }) {
  if (!events || events.length === 0) return (
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
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
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
                <svg className="w-4 h-4 text-yellow-500 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                </svg>
                {event.notes}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}