'use client';
import React from 'react';
import MonthlyTabbedView from './MonthlyTabbedView';

/**
 * Thin wrapper around MonthlyTabbedView: guards the no-data case and passes
 * the month-selection plumbing through. (The old per-day tooltip modal and
 * "Year-Round Guide" highlight grid that used to live here were unreachable
 * dead code — removed.)
 */
const MonthlyGuideSection = ({
  cityName,
  monthlyData,
  visitCalendar,
  countryName,
  selectedMonth = null,
  onMonthChange = null,
  focusSignal = 0,
  showFooter = true,
}) => {
  if (!monthlyData || Object.keys(monthlyData).length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Monthly Guide Coming Soon</h3>
        <p className="text-gray-500">We&apos;re working on detailed monthly guides for {cityName}. Check back soon!</p>
      </div>
    );
  }

  return (
    <MonthlyTabbedView
      visitCalendar={visitCalendar}
      monthlyData={monthlyData}
      cityName={cityName}
      countryName={countryName}
      selectedMonth={selectedMonth}
      onMonthChange={onMonthChange}
      focusSignal={focusSignal}
      showFooter={showFooter}
    />
  );
};

export default MonthlyGuideSection;
