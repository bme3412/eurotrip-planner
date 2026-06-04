import React from 'react';
import { 
  CountryFilter, 
  SearchInput, 
  DateFilter, 
  RatingFilter 
} from './FilterComponents';

/**
 * Filter container component 
 * @param {Object} props - Component props
 * @param {Array<string>} props.countries - Available countries
 * @param {Object} props.filters - Current filter settings
 * @param {boolean} props.showCountryDropdown - Whether country dropdown is shown
 * @param {boolean} props.dateRangeLoading - Whether date range loading is in progress
 * @param {number} props.destinationCount - Number of filtered destinations
 * @param {Object} props.cityRatings - City ratings data
 * @param {Function} props.onToggleCountryDropdown - Country dropdown toggle handler
 * @param {Function} props.onToggleCountry - Country toggle handler
 * @param {Function} props.onSearchChange - Search change handler
 * @param {Function} props.onDateChange - Date change handler
 * @param {Function} props.onDateTypeToggle - Date type toggle handler
 * @param {Function} props.onMonthToggle - Month toggle handler
 * @param {Function} props.onRatingChange - Rating change handler
 * @param {boolean} props.showRankedListPanel - Whether the ranked list panel is shown
 * @param {Function} props.onToggleRankedList - Handler to toggle the ranked list panel
 * @returns {JSX.Element} - Filter container component
 */
const FilterContainer = ({
  countries,
  filters,
  showCountryDropdown,
  dateRangeLoading,
  destinationCount,
  cityRatings = {},
  onToggleCountryDropdown,
  onToggleCountry,
  onSearchChange,
  onDateChange,
  onDateTypeToggle,
  onMonthToggle,
  onRatingChange,
  onClearFilters,
}) => {
  return (
    <div className="bg-white/95 backdrop-blur p-4 shadow-lg ring-1 ring-slate-200 animate-fade-in w-full max-h-[80vh] overflow-y-auto rounded-t-2xl md:w-80 md:max-h-none md:overflow-visible md:rounded-2xl">
      {/* The trip dates + city count live in the top-left date badge (single
          source); this panel is just the controls. */}
      <h3 className="mb-3 font-bold text-lg leading-tight">Filters</h3>

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

      <DateFilter
        dateFilters={{
          useFlexibleDates: filters.useFlexibleDates,
          startDate: filters.startDate,
          endDate: filters.endDate,
          selectedMonths: filters.selectedMonths
        }}
        onDateTypeToggle={onDateTypeToggle}
        onDateChange={onDateChange}
        onMonthToggle={onMonthToggle}
      />

      <RatingFilter
        minRating={filters.minRating}
        disabled={false}
        loading={dateRangeLoading}
        onRatingChange={onRatingChange}
        cityRatings={cityRatings}
        destinationCount={destinationCount}
        dateFilters={{
          useFlexibleDates: filters.useFlexibleDates,
          startDate: filters.startDate,
          endDate: filters.endDate,
          selectedMonths: filters.selectedMonths
        }}
      />

      {destinationCount === 0 && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No cities match. Try widening dates or clearing countries.
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