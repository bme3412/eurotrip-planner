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
  onRatingChange
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md w-80 animate-fade-in">
      <h3 className="font-bold text-lg mb-3">Filters</h3>
      
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
        dateFilters={{
          useFlexibleDates: filters.useFlexibleDates,
          startDate: filters.startDate,
          endDate: filters.endDate,
          selectedMonths: filters.selectedMonths
        }}
      />
      
      <div className="mt-4 p-2 bg-blue-50 rounded-md border border-blue-100">
        <div className="text-sm text-blue-800 font-medium">
          Showing {destinationCount} {destinationCount === 1 ? 'city' : 'cities'}
        </div>
        {destinationCount === 0 && (
          <div className="text-xs text-blue-600 mt-1">
            Try adjusting your filters to see more results
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterContainer;