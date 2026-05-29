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
  totalDestinationCount,
  cityRatings = {},
  onToggleCountryDropdown,
  onToggleCountry,
  onSearchChange,
  onDateChange,
  onDateTypeToggle,
  onMonthToggle,
  onRatingChange,
  showRankedListPanel,
  onToggleRankedList,
  onClearFilters,
}) => {
  // Phase 3: derive a single one-line summary that headlines the panel.
  // "Great fits" is computed from already-loaded ratings; when no dates
  // are selected the second clause simply disappears.
  const greatFits = Object.values(cityRatings).filter(
    (r) => typeof r === 'number' && r >= 4
  ).length;
  const showGreatFits =
    greatFits > 0 &&
    ((!filters.useFlexibleDates && filters.startDate && filters.endDate) ||
      (filters.useFlexibleDates && filters.selectedMonths.length > 0));

  return (
    <div className="bg-white p-4 shadow-md animate-fade-in w-full max-h-[80vh] overflow-y-auto rounded-t-2xl md:w-80 md:max-h-none md:overflow-visible md:rounded-lg">
      {/* Result-summary header */}
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h3 className="font-bold text-lg leading-tight">Filters</h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Showing <span className="font-semibold text-gray-800">{destinationCount}</span>
            {typeof totalDestinationCount === 'number' && (
              <> of <span className="font-semibold text-gray-800">{totalDestinationCount}</span></>
            )}{' '}
            {destinationCount === 1 ? 'city' : 'cities'}
            {showGreatFits && (
              <>
                {' · '}
                <span className="font-semibold text-green-700">{greatFits}</span> great fits
              </>
            )}
          </p>
        </div>
        {destinationCount > 0 && (
          <button
            onClick={onToggleRankedList}
            className={`shrink-0 text-xs font-medium flex items-center px-2 py-1 rounded transition-colors ${
              showRankedListPanel
                ? 'bg-blue-600 text-white'
                : 'text-blue-700 hover:bg-blue-50'
            }`}
            title={showRankedListPanel ? 'Hide ranked list' : 'Show ranked list'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            List
          </button>
        )}
      </div>

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