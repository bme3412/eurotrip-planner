'use client';

import React, { useState, useRef } from 'react';
import SearchWithSuggestions from './components/SearchWithSuggestions';
import CountryDropdown from './components/CountryDropdown';
import RegionChips from './components/RegionChips';
import ActiveFilterPills from './components/ActiveFilterPills';
import ClearFiltersButton from './components/ClearFiltersButton';
import { useSearchSuggestions } from './hooks/useSearchSuggestions';
import { useKeyboardSuggestionNav } from './hooks/useKeyboardSuggestionNav';
import { useOutsideClick } from './hooks/useOutsideClick';

function getCountryButtonLabel(selectedCountries) {
  if (!selectedCountries || selectedCountries.length === 0) return 'All Countries';
  if (selectedCountries.length === 1) return selectedCountries[0];
  return `${selectedCountries.length} Countries`;
}

const UnifiedFilter = ({
  selectedRegion,
  selectedCountries,
  handleRegionChange,
  handleCountryChange,
  countries = [],
  cities = [],
  searchTerm,
  onSearchChange,
  onClearFilters,
  onCitySelect,
}) => {
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const countryDropdownRef = useRef(null);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  const searchSuggestions = useSearchSuggestions(searchTerm, cities);

  const { selectedIndex: selectedSuggestionIndex, handleKeyDown: handleSearchKeyDown } =
    useKeyboardSuggestionNav({
      searchTerm,
      suggestions: searchSuggestions,
      onSelect: (city) => {
        if (onCitySelect) onCitySelect(city);
      },
      onEscape: () => setIsSearchFocused(false),
    });

  useOutsideClick([countryDropdownRef], () => setIsCountryDropdownOpen(false));
  useOutsideClick([searchRef], () => setIsSearchFocused(false));

  const hasActiveFilters =
    (selectedRegion !== 'All' && selectedRegion !== 'All Regions') ||
    selectedCountries.length > 0 ||
    Boolean(searchTerm);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all duration-300">
      {/* Search and Country Row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchWithSuggestions
          ref={searchRef}
          suggestionsRef={suggestionsRef}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onFocus={() => setIsSearchFocused(true)}
          onKeyDown={handleSearchKeyDown}
          isSearchFocused={isSearchFocused}
          suggestions={searchSuggestions}
          selectedSuggestionIndex={selectedSuggestionIndex}
          onSuggestionClick={() => {
            setIsSearchFocused(false);
            onSearchChange('');
          }}
        />

        <CountryDropdown
          ref={countryDropdownRef}
          isOpen={isCountryDropdownOpen}
          onToggle={() => setIsCountryDropdownOpen((prev) => !prev)}
          selectedCountries={selectedCountries}
          countries={countries}
          onCountryChange={handleCountryChange}
          buttonLabel={getCountryButtonLabel(selectedCountries)}
        />

        {hasActiveFilters && <ClearFiltersButton onClick={onClearFilters} />}
      </div>

      <RegionChips
        selectedRegion={selectedRegion}
        onRegionChange={handleRegionChange}
      />

      <ActiveFilterPills
        selectedRegion={selectedRegion}
        selectedCountries={selectedCountries}
        onRegionChange={handleRegionChange}
        onCountryChange={handleCountryChange}
      />
    </div>
  );
};

export default UnifiedFilter;
