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
  onToggleCountryDropdown,
  onToggleCountry,
  onSearchChange,
  onDateChange,
  onDateTypeToggle,
  onMonthToggle,
  onRatingChange
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md w-72 animate-fade-in">
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
        dateFilters={{
          useFlexibleDates: filters.useFlexibleDates,
          startDate: filters.startDate,
          endDate: filters.endDate,
          selectedMonths: filters.selectedMonths
        }}
      />
      
      <div className="text-sm text-gray-500">
        Showing {destinationCount} cities
      </div>
    </div>
  );
};

export default FilterContainer;