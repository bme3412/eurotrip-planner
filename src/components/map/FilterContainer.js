import React from 'react';
import { CountryFilter, SearchInput } from './FilterComponents';
import DateFilterSection from './DateFilterSection';

/**
 * Filter container component.
 *
 * Holds the trip dates (calendar / flexible months) plus the browse filters
 * (Countries + Search) in a single panel. The former Destination Rating control
 * was removed — quality is conveyed by the ranked-list bands.
 *
 * @param {Object} props - Component props
 * @param {Array<string>} props.countries - Available countries
 * @param {Object} props.filters - Current filter settings
 * @param {boolean} props.showCountryDropdown - Whether country dropdown is shown
 * @param {number} props.destinationCount - Number of filtered destinations
 * @param {Function} props.onToggleCountryDropdown - Country dropdown toggle handler
 * @param {Function} props.onToggleCountry - Country toggle handler
 * @param {Function} props.onSearchChange - Search change handler
 * @param {Function} props.onPickDateRange - Commit exact { start, end } dates
 * @param {Function} props.onDateTypeToggle - Flip Exact <-> Flexible
 * @param {Function} props.onMonthToggle - Toggle a flexible month
 * @param {Function} props.onClearDates - Clear just the date selection
 * @param {Function} props.onClearFilters - Clear all filters handler
 * @returns {JSX.Element} - Filter container component
 */
const FilterContainer = ({
  countries,
  filters,
  showCountryDropdown,
  destinationCount,
  onToggleCountryDropdown,
  onToggleCountry,
  onSearchChange,
  onPickDateRange,
  onDateTypeToggle,
  onMonthToggle,
  onClearDates,
  onClearFilters,
}) => {
  return (
    <div className="bg-white/95 backdrop-blur p-4 shadow-lg ring-1 ring-slate-200 animate-fade-in w-full max-h-[80vh] overflow-y-auto rounded-t-2xl md:w-80 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto md:rounded-2xl">
      <h3 className="mb-3 font-bold text-lg leading-tight">Filters</h3>

      <DateFilterSection
        dateFilters={{
          useFlexibleDates: filters.useFlexibleDates,
          startDate: filters.startDate,
          endDate: filters.endDate,
          selectedMonths: filters.selectedMonths,
        }}
        onPickRange={onPickDateRange}
        onDateTypeToggle={onDateTypeToggle}
        onMonthToggle={onMonthToggle}
        onClearDates={onClearDates}
      />

      <CountryFilter
        countries={countries}
        selectedCountries={filters.countries}
        showDropdown={showCountryDropdown}
        onToggleDropdown={onToggleCountryDropdown}
        onToggleCountry={onToggleCountry}
      />

      <SearchInput
        searchTerm={filters.searchTerm}
        onSearchChange={onSearchChange}
      />

      {destinationCount === 0 && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No cities match. Try clearing countries or your search.
        </div>
      )}

      {onClearFilters && (
        <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 underline-offset-2 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterContainer;
