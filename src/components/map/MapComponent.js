"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { COUNTRY_COLORS, MAJOR_CITIES, INITIAL_FILTERS } from './constants';
import { 
  getCityRatingForDateRange, 
  getCityRatingForMonths, 
  getCityCalendarInfo 
} from './mapUtils';
import { generatePopupContent } from './mapPopup';
import { 
  initializeMap, 
  updateMapView, 
  createMarkerElement, 
  addLoadingIndicator, 
  createPopup, 
  centerPopupInView 
} from './mapService';
import { FilterToggleButton } from './FilterComponents';
import FilterContainer from './FilterContainer';
import RankedListPanel from './RankedListPanel';
import LoadingOverlay from '../common/LoadingOverlay';
import CityDetailsPopup from './CityDetailsPopup';

/**
 * Map Component
 * Renders an interactive map with city markers and filters
 */
function MapComponent({ viewState, onViewStateChange, destinations, onMarkerClick }) {
  // Refs
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const mapboxGLRef = useRef(null);
  const markersRef = useRef([]);
  const popupsRef = useRef([]);
  const isMoving = useRef(false);
  const mapInitialized = useRef(false); // Ref to track initialization
  
  // State
  const [showFilters, setShowFilters] = useState(true);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [cityRatings, setCityRatings] = useState({});
  const [dateRangeLoading, setDateRangeLoading] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPopup, setCurrentPopup] = useState(null);
  const [showRankedListPanel, setShowRankedListPanel] = useState(false);
  const [selectedCityForDetails, setSelectedCityForDetails] = useState(null);

  // Memoized values
  const countries = useMemo(() => {
    return ['All', ...new Set(destinations.map(city => city.country))].sort();
  }, [destinations]);

  // Effect for initializing map
  useEffect(() => {
    // Prevent re-initialization if already done or container not ready
    if (mapInitialized.current || !mapContainer.current) {
      return;
    }
    mapInitialized.current = true; // Mark as initialized

    const setupMap = async () => {
      console.log("[MapComponent] Attempting map initialization...");
      try {
        const { map, mapboxgl, isMoving: movingState } = await initializeMap(
          mapContainer.current, 
          viewState, 
          onViewStateChange
        );
        
        console.log("[MapComponent] Map initialized successfully.");
        mapInstance.current = map;
        mapboxGLRef.current = mapboxgl;
        isMoving.current = movingState;
        
        map.once('load', async () => {
          console.log("[MapComponent] Map 'load' event fired.");
          await updateMarkers();
        });
      } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("[MapComponent] CRITICAL ERROR setting up map:", error);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      }
    };

    setupMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        mapInitialized.current = false; // Reset on unmount
      }
    };
  }, []);

  // Update map view when viewState changes from parent
  useEffect(() => {
    if (!mapInstance.current) return;
    
    const newIsMoving = updateMapView(
      mapInstance.current, 
      viewState, 
      isMoving.current
    );
    
    if (newIsMoving) {
      isMoving.current = newIsMoving;
      setTimeout(() => {
        isMoving.current = false;
      }, 100);
    }
  }, [viewState.longitude, viewState.latitude, viewState.zoom, viewState.bearing, viewState.pitch]);

  // Effect for filtering destinations
  useEffect(() => {
    let results = [...destinations];
    
    if (!filters.countries.includes('All')) {
      results = results.filter(city => filters.countries.includes(city.country));
    }
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      results = results.filter(city => 
        city.title?.toLowerCase().includes(term) || 
        city.country?.toLowerCase().includes(term) ||
        (city.description && city.description.toLowerCase().includes(term))
      );
    }
    
    // Apply rating filters if we have date selection
    if (filters.minRating > 0) {
      const hasDateFilters = 
        (!filters.useFlexibleDates && filters.startDate && filters.endDate) || 
        (filters.useFlexibleDates && filters.selectedMonths.length > 0);
      
      if (hasDateFilters) {
        // Round to first decimal place for more consistent filtering
        const ratingToUse = parseInt(filters.minRating);
        
        // Filter based on ratings
        const filteredByRating = results.filter(city => {
          const rating = cityRatings[city.title] || 0;
          const roundedRating = Math.round(rating * 10) / 10; // Round to 1 decimal
          return roundedRating >= ratingToUse;
        });
        
        results = filteredByRating;
      }
    }
    
    setFilteredDestinations(results);
  }, [destinations, filters, cityRatings]);

  // Fetch ratings for all cities when date range changes
  useEffect(() => {
    const fetchAllRatings = async () => {
      // Check if we need to fetch ratings
      const shouldFetchRatings = 
        (!filters.useFlexibleDates && filters.startDate && filters.endDate) || 
        (filters.useFlexibleDates && filters.selectedMonths.length > 0);
        
      if (!shouldFetchRatings) {
        // Clear ratings and return
        setCityRatings({});
        return;
      }
      
      setDateRangeLoading(true);
      
      try {
        const ratings = {};
        const promises = destinations.map(async (city) => {
          try {
            let rating;
            if (filters.useFlexibleDates) {
              rating = await getCityRatingForMonths(city, filters.selectedMonths);
            } else {
              rating = await getCityRatingForDateRange(city, filters.startDate, filters.endDate);
            }
            ratings[city.title] = rating;
          } catch (error) {
            console.error(`Error fetching rating for ${city.title}:`, error);
            ratings[city.title] = 0; // Set default rating on error
          }
        });
        
        await Promise.all(promises);
        setCityRatings(ratings);
      } catch (error) {
        console.error("Error fetching ratings:", error);
      } finally {
        setDateRangeLoading(false);
      }
    };
    
    fetchAllRatings();
  }, [destinations, filters.startDate, filters.endDate, filters.useFlexibleDates, filters.selectedMonths]);

  // Update markers when destinations or filters change
  useEffect(() => {
    if (!mapInstance.current || !mapboxGLRef.current) return;
    updateMarkers();
  }, [filteredDestinations]);

  /**
   * Update markers on the map
   */
  const updateMarkers = async () => {
    if (!mapInstance.current || !mapboxGLRef.current) return;
    
    const citiesToShow = filteredDestinations.length > 0 ? filteredDestinations : destinations;
    if (!citiesToShow || citiesToShow.length === 0) {
      return;
    }
    
    // Remove existing markers and popups
    markersRef.current.forEach(marker => marker.remove());
    popupsRef.current.forEach(popup => popup.remove());
    markersRef.current = [];
    popupsRef.current = [];
    
    for (const city of citiesToShow) {
      if (!city.longitude || !city.latitude) {
        continue;
      }
      
      const countryColor = COUNTRY_COLORS[city.country] || '#d63631';
      
      const isCapital = city.landmarks && city.landmarks.some(landmark => 
        landmark.includes('Capital') || landmark.includes('Palace') || 
        landmark.includes('Parliament') || landmark.includes('Royal')
      );
      const isMajorCity = MAJOR_CITIES.includes(city.title);
      
      const markerSize = isCapital || isMajorCity ? 28 : 22;
      const el = createMarkerElement(city, countryColor, isCapital, isMajorCity);
      
      const marker = new mapboxGLRef.current.Marker(el)
        .setLngLat([city.longitude, city.latitude])
        .addTo(mapInstance.current);
      
      el.addEventListener('click', () => handleMarkerClick(city, el, markerSize, countryColor));
      
      markersRef.current.push(marker);
    }
  };

  /**
   * Handle marker click
   * @param {Object} city - City data
   * @param {HTMLElement} markerElement - Marker element
   * @param {number} markerSize - Marker size
   * @param {string} countryColor - Country color
   */
  const handleMarkerClick = async (city, markerElement, markerSize, countryColor) => {
    // If the popup for this city is already open, exit early
    if (currentPopup && currentPopup.cityTitle === city.title) {
      return;
    }
    
    // Close any existing popup
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    
    // Notify parent component
    onMarkerClick(city);
    
    // Add loading indicator
    const loadingEl = addLoadingIndicator(markerElement, markerSize);
    
    try {
      let calendarInfo = null;
      if ((filters.startDate && filters.endDate) || 
          (filters.useFlexibleDates && filters.selectedMonths.length > 0)) {
        calendarInfo = await getCityCalendarInfo(
          city, 
          filters.startDate, 
          filters.endDate, 
          filters.useFlexibleDates, 
          filters.selectedMonths
        );
      }
      
      // Fly to the city's location with the popup already displayed
      mapInstance.current.flyTo({
        center: [city.longitude, city.latitude],
        zoom: mapInstance.current.getZoom(),
        duration: 800,
        essential: true
      });
      
      // Wait for flyTo to complete
      await new Promise(resolve => {
        const moveEndHandler = () => {
          mapInstance.current.off('moveend', moveEndHandler);
          resolve();
        };
        mapInstance.current.on('moveend', moveEndHandler);
      });
      
      // Remove loading indicator
      if (loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
      
      // Create popup content
      const popupContent = generatePopupContent(city, calendarInfo, countryColor, filters);
      
      // Create and set up popup in the center of the viewport
      const popup = createPopup(mapboxGLRef.current, popupContent);
      popup.cityTitle = city.title;
      
      // Use the centerPopupInView function to position the popup
      centerPopupInView(mapInstance.current, popup);
      
      // Add custom style to ensure the popup appears centered
      setTimeout(() => {
        const popupElement = document.querySelector('.mapboxgl-popup');
        if (popupElement) {
          popupElement.style.transform = 'translate(-50%, -50%)';
          popupElement.style.left = '50%';
          popupElement.style.top = '50%';
        }
      }, 10);
      
      setCurrentPopup(popup);
    } catch (error) {
      console.error("Error displaying popup:", error);
      if (loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
    }
  };

  /**
   * Filter event handlers
   */
  const handleToggleFilters = useCallback(() => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setShowFilters(prev => !prev);
    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.resize();
      }
    }, 300);
  }, [currentPopup]);

  const handleSearchChange = useCallback((value) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setFilters(prev => ({
      ...prev,
      searchTerm: value
    }));
  }, [currentPopup]);

  const handleDateRangeChange = useCallback((field, value) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  }, [currentPopup]);

  const handleMonthSelection = useCallback((month, selected) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setFilters(prev => {
      const currentMonths = prev.selectedMonths || [];
      let newMonths;
      if (selected) {
        newMonths = [...currentMonths, month];
      } else {
        newMonths = currentMonths.filter(m => m !== month);
      }
      return {
        ...prev,
        selectedMonths: newMonths
      };
    });
  }, [currentPopup]);

  const toggleDateMode = useCallback(() => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setFilters(prev => ({
      ...prev,
      useFlexibleDates: !prev.useFlexibleDates
    }));
  }, [currentPopup]);

  const handleRatingChange = useCallback((value) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setFilters(prev => ({
      ...prev,
      minRating: parseInt(value)
    }));
  }, [currentPopup]);

  const toggleCountry = useCallback((country) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setFilters(prev => {
      if (country === 'All') {
        return {
          ...prev,
          countries: ['All']
        };
      }
      let newCountries = prev.countries.filter(c => c !== 'All');
      if (newCountries.includes(country)) {
        newCountries = newCountries.filter(c => c !== country);
      } else {
        newCountries.push(country);
      }
      if (newCountries.length === 0) {
        newCountries = ['All'];
      }
      return {
        ...prev,
        countries: newCountries
      };
    });
  }, [currentPopup]);

  const handleToggleCountryDropdown = useCallback(() => {
    setShowCountryDropdown(prev => !prev);
  }, []);

  const toggleRankedListPanel = useCallback(() => {
    setShowRankedListPanel(prev => !prev);
    if (showRankedListPanel) {
      setSelectedCityForDetails(null);
    }
  }, [showRankedListPanel]);

  const handleShowCityDetails = useCallback((city) => {
    setSelectedCityForDetails(city);
  }, []);

  const handleCloseCityDetails = useCallback(() => {
    setSelectedCityForDetails(null);
  }, []);

  return (
    <div className="relative h-screen">
      <div ref={mapContainer} className="absolute top-0 bottom-0 w-full" style={{ height: '100%' }} />
      
      <div className="absolute top-4 left-4 z-10 flex flex-col items-start">
        <FilterToggleButton showFilters={showFilters} onToggle={handleToggleFilters} />
        {showFilters && (
          <FilterContainer 
            countries={['All', ...Object.keys(destinations.reduce((acc, d) => ({ ...acc, [d.country]: true }), {}))]}
            filters={filters}
            showCountryDropdown={showCountryDropdown}
            dateRangeLoading={dateRangeLoading}
            destinationCount={filteredDestinations.length} 
            cityRatings={cityRatings}
            onToggleCountryDropdown={handleToggleCountryDropdown}
            onToggleCountry={toggleCountry}
            onSearchChange={handleSearchChange}
            onDateChange={handleDateRangeChange}
            onDateTypeToggle={toggleDateMode}
            onMonthToggle={handleMonthSelection}
            onRatingChange={handleRatingChange}
            showRankedListPanel={showRankedListPanel}
            onToggleRankedList={toggleRankedListPanel}
          />
        )}
      </div>
      
      {showRankedListPanel && (
        <RankedListPanel 
          destinationsWithRatings={filteredDestinations.map(dest => ({
            ...dest,
            rating: cityRatings[dest.title] || 0
          }))}
          onClose={toggleRankedListPanel} 
          onCitySelect={handleShowCityDetails}
        />
      )}
      
      {selectedCityForDetails && (
        <CityDetailsPopup
          city={selectedCityForDetails}
          dateFilters={{
            startDate: filters.startDate,
            endDate: filters.endDate,
            useFlexibleDates: filters.useFlexibleDates,
            selectedMonths: filters.selectedMonths
          }}
          onClose={handleCloseCityDetails}
        />
      )}
      
      <LoadingOverlay isLoading={dateRangeLoading} text="Calculating best travel times..." />
    </div>
  );
}

export default MapComponent;