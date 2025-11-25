'use client';

export function EmptyStateMessage() {
  return (
    <div className="p-8 text-center">
      <div className="inline-block p-4 rounded-full bg-gray-100 text-gray-500 mb-4">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">No Monthly Data Available</h3>
      <p className="text-gray-500">There is no monthly visit information available for this city yet.</p>
    </div>
  );
}