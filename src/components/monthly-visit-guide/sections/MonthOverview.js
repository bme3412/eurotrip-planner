'use client';

export function MonthOverview({ selectedMonth, overview }) {
  return (
    <div className="mb-6">
      <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-600">
        <h3 className="text-xl font-bold text-gray-800 mb-3">
          Visiting in {selectedMonth}
        </h3>
        <p className="text-gray-600">
          {overview || `Here's our guidance for visiting during ${selectedMonth}. Review the highlights, considerations, and detailed information to plan your trip.`}
        </p>
      </div>
    </div>
  );
}