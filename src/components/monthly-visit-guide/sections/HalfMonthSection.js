'use client';

import { Tab } from '@headlessui/react';
import { MonthDetail } from './MonthDetail';

export function HalfMonthSection({ selectedMonth, months, firstHalf, secondHalf }) {
  return (
    <Tab.Group>
      <div className="flex items-center mb-4">
        <div className="bg-indigo-100 p-2 rounded-full text-indigo-600 mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h1a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1zm2 5a1 1 0 011-1h8a1 1 0 110 2H8a1 1 0 01-1-1zm0 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800">Detailed Monthly Breakdown</h3>
      </div>
      <Tab.List className="flex space-x-2 rounded-xl bg-indigo-50 p-1 mb-4 shadow-sm">
        <Tab
          className={({ selected }) =>
            `w-full rounded-lg py-3 text-sm font-medium leading-5 transition duration-200 ease-in-out focus:outline-none ${
              selected
                ? 'bg-white text-indigo-700 shadow-md'
                : 'text-indigo-600 hover:bg-indigo-100/80 hover:text-indigo-800'
            }`
          }
        >
          <div className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path>
            </svg>
            Early {selectedMonth}
          </div>
        </Tab>
        <Tab
          className={({ selected }) =>
            `w-full rounded-lg py-3 text-sm font-medium leading-5 transition duration-200 ease-in-out focus:outline-none ${
              selected
                ? 'bg-white text-indigo-700 shadow-md'
                : 'text-indigo-600 hover:bg-indigo-100/80 hover:text-indigo-800'
            }`
          }
        >
          <div className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
            </svg>
            Late {selectedMonth}
          </div>
        </Tab>
      </Tab.List>
      <Tab.Panels className="mt-4">
        <Tab.Panel className="rounded-xl bg-white p-5 shadow-md">
          {firstHalf && (
            <MonthDetail
              selectedMonth={selectedMonth}
              dateRange={firstHalf.date_range || `${selectedMonth} 1–15`}
              weather={firstHalf.weather}
              tourismLevel={firstHalf.tourism_level}
              events={firstHalf.events_holidays}
              experiences={firstHalf.unique_experiences}
            />
          )}
        </Tab.Panel>
        <Tab.Panel className="rounded-xl bg-white p-5 shadow-md">
          {secondHalf && (
            <MonthDetail
              selectedMonth={selectedMonth}
              dateRange={secondHalf.date_range || `${selectedMonth} 16–${new Date(new Date().getFullYear(), months.indexOf(selectedMonth) + 1, 0).getDate()}`}
              weather={secondHalf.weather}
              tourismLevel={secondHalf.tourism_level}
              events={secondHalf.events_holidays}
              experiences={secondHalf.unique_experiences}
            />
          )}
        </Tab.Panel>
      </Tab.Panels>
    </Tab.Group>
  );
}