'use client';

import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

/**
 * Date Selection Step Component
 * First step in the travel filter process
 */
const DateSelectionStep = ({
  dateType,
  setDateType,
  exactDates,
  setExactDates,
  month,
  setMonth,
  goToNextStep
}) => {
  // Handle selecting date type
  const handleDateTypeSelect = (type) => {
    setDateType(type);
  };

  // Handle month selection
  const handleMonthSelect = (selectedMonth) => {
    setMonth(selectedMonth);
  };

  // Handle exact date changes
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setExactDates((prev) => ({ ...prev, [name]: value }));
  };

  // Check if date selection is complete
  const isDateStepComplete = () => {
    return dateType === 'exact'
      ? exactDates.start && exactDates.end
      : Boolean(month);
  };

  // Calculate trip duration in days
  const calculateTripDuration = () => {
    if (exactDates.start && exactDates.end) {
      return Math.max(
        1,
        Math.ceil(
          (new Date(exactDates.end) - new Date(exactDates.start)) /
            (1000 * 60 * 60 * 24)
        )
      );
    }
    return 0;
  };

  // List of months
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div className="space-y-6">
      {/* Header with step indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium text-gray-800">
          <span className="text-blue-600 font-bold">When</span>{" "}
          would you like to travel?
        </h3>
        <div className="text-blue-600 font-medium">
          Step 1 of 3
        </div>
      </div>

      {/* Date type selection buttons */}
      <div className="flex space-x-4">
        <button
          className={`flex-1 py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm ${
            dateType === 'exact'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
          onClick={() => handleDateTypeSelect('exact')}
        >
          <Calendar className="w-5 h-5" />
          <span className="font-medium text-lg">Exact Dates</span>
        </button>

        <button
          className={`flex-1 py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm ${
            dateType === 'flexible'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
          onClick={() => handleDateTypeSelect('flexible')}
        >
          <Calendar className="w-5 h-5" />
          <span className="font-medium text-lg">Flexible Dates</span>
        </button>
      </div>

      {/* Exact dates selection */}
      {dateType === 'exact' && (
        <div className="mt-6 p-6 bg-gray-50 rounded-xl">
          <h4 className="text-lg font-medium text-gray-700 mb-4">Select your exact travel dates:</h4>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Start Date
              </label>
              <input
                type="date"
                name="start"
                value={exactDates.start}
                onChange={handleDateChange}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                End Date
              </label>
              <input
                type="date"
                name="end"
                value={exactDates.end}
                onChange={handleDateChange}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Trip duration indicator */}
          {exactDates.start && exactDates.end && (
            <div className="mt-4 bg-blue-50 p-4 rounded-xl">
              <p className="text-blue-800 flex items-center text-lg">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Trip Duration: <span className="font-bold ml-1">{calculateTripDuration()} days</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Flexible dates (month selection) */}
      {dateType === 'flexible' && (
        <div className="mt-6 p-6 bg-gray-50 rounded-xl">
          <h4 className="text-lg font-medium text-gray-700 mb-4">Which month are you considering?</h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {months.map((m) => (
              <button
                key={m}
                className={`py-3 px-2 text-base rounded-xl transition-all duration-200 shadow-sm hover:bg-gray-200 ${
                  month === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
                onClick={() => handleMonthSelect(m)}
              >
                {m.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Next button */}
      <div className="pt-4 flex justify-end">
        {isDateStepComplete() && (
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg flex items-center space-x-2 shadow-md hover:bg-blue-700 transition-colors duration-200 font-medium"
            onClick={goToNextStep}
          >
            <span>Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DateSelectionStep;