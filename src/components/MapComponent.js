"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';

function MapComponent({ viewState, onViewStateChange, destinations, onMarkerClick }) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const popupsRef = useRef([]);
  const isMoving = useRef(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [cityRatings, setCityRatings] = useState({});
  const [dateRangeLoading, setDateRangeLoading] = useState(false);
  const [filters, setFilters] = useState({
    countries: ['All'],
    searchTerm: '',
    startDate: '',
    endDate: '',
    minRating: 0, // Default to show all ratings
    useFlexibleDates: false, // Default to exact dates
    selectedMonths: [] // For flexible date mode
  });

  // Create a centralized popup reference
  const [currentPopup, setCurrentPopup] = useState(null);

  // Define country color mapping
  const countryColors = {
    'France': '#1E88E5',
    'Germany': '#D81B60',
    'Italy': '#43A047',
    'Spain': '#FB8C00',
    'Netherlands': '#FFC107',
    'Belgium': '#8E24AA',
    'Switzerland': '#F44336',
    'Austria': '#3949AB',
    'Czech Republic': '#00ACC1',
    'Poland': '#FF5722',
    'Hungary': '#5E35B1',
    'Croatia': '#B71C1C',
    'Greece': '#006064',
    'Denmark': '#004D40',
    'Norway': '#2E7D32',
    'Sweden': '#0277BD',
    'Finland': '#4A148C',
    'Portugal': '#F57C00',
    'Ireland': '#388E3C',
    'Estonia': '#0288D1',
    'Latvia': '#7B1FA2',
    'Lithuania': '#C2185B',
    'Slovenia': '#689F38',
    'Slovakia': '#FFA000'
  };

  // Get unique countries from destinations
  const countries = useMemo(() => {
    const uniqueCountries = ['All', ...new Set(destinations.map(city => city.country))].sort();
    return uniqueCountries;
  }, [destinations]);

  // Helper function to get city rating for a specific date range
  const getCityRatingForDateRange = async (city, startDate, endDate) => {
    try {
      const cityName = city.title.toLowerCase();
      const countryName = city.country;
      const calendarPath = `/data/${countryName}/${cityName}/${cityName}-visit-calendar.json`;
      
      const response = await fetch(calendarPath);
      if (!response.ok) {
        console.warn(`No calendar data found for ${cityName}`);
        return 0;
      }
      
      const calendar = await response.json();
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
      }
      
      let totalScore = 0;
      let daysCount = 0;
      
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const month = monthNames[currentDate.getMonth()];
        const day = currentDate.getDate();
        
        if (calendar.months[month]) {
          for (const range of calendar.months[month].ranges) {
            if (range.days.includes(day)) {
              totalScore += range.score;
              daysCount++;
              break;
            }
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const avgScore = daysCount > 0 ? totalScore / daysCount : 0;
      return avgScore;
    } catch (error) {
      console.error(`Error fetching rating for ${city.title}:`, error);
      return 0;
    }
  };

  // Fetch ratings for all cities when date range changes
  useEffect(() => {
    const fetchAllRatings = async () => {
      if ((!filters.startDate || !filters.endDate) && 
          (filters.useFlexibleDates && filters.selectedMonths.length === 0)) {
        return;
      }
      
      setDateRangeLoading(true);
      
      const ratings = {};
      const promises = destinations.map(async (city) => {
        let rating;
        if (filters.useFlexibleDates) {
          rating = await getCityRatingForMonths(city, filters.selectedMonths);
        } else {
          rating = await getCityRatingForDateRange(city, filters.startDate, filters.endDate);
        }
        ratings[city.title] = rating;
      });
      
      await Promise.all(promises);
      setCityRatings(ratings);
      setDateRangeLoading(false);
    };
    
    fetchAllRatings();
  }, [destinations, filters.startDate, filters.endDate, filters.useFlexibleDates, filters.selectedMonths]);

  // Helper function to get city rating for flexible months
  const getCityRatingForMonths = async (city, selectedMonths) => {
    try {
      if (selectedMonths.length === 0) return 0;
      
      const cityName = city.title.toLowerCase();
      const countryName = city.country;
      const calendarPath = `/data/${countryName}/${cityName}/${cityName}-visit-calendar.json`;
      
      const response = await fetch(calendarPath);
      if (!response.ok) {
        console.warn(`No calendar data found for ${cityName}`);
        return 0;
      }
      
      const calendar = await response.json();
      
      let totalScore = 0;
      let daysCount = 0;
      
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      
      for (const monthIndex of selectedMonths) {
        const monthName = monthNames[monthIndex];
        if (calendar.months[monthName]) {
          const monthData = calendar.months[monthName];
          totalScore += monthData.ranges.reduce((acc, range) => acc + range.score * range.days.length, 0);
          daysCount += monthData.ranges.reduce((acc, range) => acc + range.days.length, 0);
        }
      }
      
      const avgScore = daysCount > 0 ? totalScore / daysCount : 0;
      return avgScore;
    } catch (error) {
      console.error(`Error fetching monthly rating for ${city.title}:`, error);
      return 0;
    }
  };

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
    
    if (filters.startDate && filters.endDate && filters.minRating > 0) {
      results = results.filter(city => {
        const rating = cityRatings[city.title] || 0;
        return rating >= filters.minRating;
      });
    }
    
    setFilteredDestinations(results);
  }, [destinations, filters, cityRatings]);

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainer.current) return;

    const initializeMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        
        if (!mapInstance.current) {
          const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/outdoors-v12',
            center: [viewState.longitude, viewState.latitude],
            zoom: viewState.zoom,
            pitch: viewState.pitch,
            bearing: viewState.bearing
          });

          map.addControl(new mapboxgl.NavigationControl(), 'top-right');
          
          map.on('movestart', () => {
            isMoving.current = true;
          });
          
          map.on('moveend', () => {
            if (isMoving.current) {
              const newViewState = {
                longitude: map.getCenter().lng,
                latitude: map.getCenter().lat,
                zoom: map.getZoom(),
                bearing: map.getBearing(),
                pitch: map.getPitch()
              };
              isMoving.current = false;
              onViewStateChange(newViewState);
            }
          });
          
          mapInstance.current = map;
          
          map.on('load', async () => {
            map.addSource('country-boundaries', {
              type: 'vector',
              url: 'mapbox://mapbox.country-boundaries-v1'
            });
            
            map.addLayer({
              id: 'country-boundaries',
              type: 'line',
              source: 'country-boundaries',
              'source-layer': 'country_boundaries',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#888',
                'line-width': 1
              }
            });
            
            map.setPadding({
              top: 50,
              bottom: 50,
              left: 50,
              right: 50
            });
            
            await addMarkersWithPopups(mapboxgl);
          });
        }
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    initializeMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update map view when viewState changes from parent
  useEffect(() => {
    if (!mapInstance.current || isMoving.current) return;
    
    const currentCenter = mapInstance.current.getCenter();
    const currentZoom = mapInstance.current.getZoom();
    
    const centerChanged = 
      Math.abs(currentCenter.lng - viewState.longitude) > 0.0001 ||
      Math.abs(currentCenter.lat - viewState.latitude) > 0.0001;
    const zoomChanged = Math.abs(currentZoom - viewState.zoom) > 0.01;
    
    if (centerChanged || zoomChanged) {
      isMoving.current = true;
      mapInstance.current.jumpTo({
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        bearing: viewState.bearing,
        pitch: viewState.pitch
      });
      
      setTimeout(() => {
        isMoving.current = false;
      }, 100);
    }
  }, [viewState.longitude, viewState.latitude, viewState.zoom, viewState.bearing, viewState.pitch]);

  // Update markers when destinations or filters change
  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapInstance.current) return;
      
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        await addMarkersWithPopups(mapboxgl);
      } catch (error) {
        console.error("Error updating markers:", error);
      }
    };
    
    const citiesToDisplay = filteredDestinations.length > 0 ? filteredDestinations : destinations;
    
    if (citiesToDisplay && citiesToDisplay.length > 0) {
      updateMarkers();
    }
  }, [destinations, filteredDestinations]);

  // Helper function to get city calendar info
  const getCityCalendarInfo = async (city, startDate, endDate) => {
    try {
      const cityName = city.title.toLowerCase();
      const countryName = city.country;
      const calendarPath = `/data/${countryName}/${cityName}/${cityName}-visit-calendar.json`;
      
      const response = await fetch(calendarPath);
      if (!response.ok) {
        return null;
      }
      
      const calendar = await response.json();
      
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      
      const eventsMap = new Map();
      const allNotes = new Set();
      let totalScore = 0;
      let daysCount = 0;
      let weatherInfo = [];
      
      if (filters.useFlexibleDates) {
        for (const monthIndex of filters.selectedMonths) {
          const monthName = monthNames[monthIndex];
          if (calendar.months[monthName]) {
            const monthData = calendar.months[monthName];
            weatherInfo.push({
              month: monthData.name,
              high: monthData.weatherHighC,
              low: monthData.weatherLowC,
              tourism: monthData.tourismLevel
            });
            for (const range of monthData.ranges) {
              totalScore += range.score * range.days.length;
              daysCount += range.days.length;
              if (range.notes) {
                allNotes.add(range.notes);
              }
              if (range.special && range.event) {
                const eventKey = range.event;
                if (!eventsMap.has(eventKey)) {
                  eventsMap.set(eventKey, {
                    event: eventKey,
                    dates: [],
                    notes: range.notes
                  });
                }
                for (const day of range.days) {
                  eventsMap.get(eventKey).dates.push({
                    month: monthData.name,
                    day: day
                  });
                }
              }
            }
          }
        }
      } else {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return null;
        }
        const currentDate = new Date(start);
        const processedMonths = new Set();
        while (currentDate <= end) {
          const month = monthNames[currentDate.getMonth()];
          const day = currentDate.getDate();
          if (!processedMonths.has(month) && calendar.months[month]) {
            processedMonths.add(month);
            const monthData = calendar.months[month];
            weatherInfo.push({
              month: monthData.name,
              high: monthData.weatherHighC,
              low: monthData.weatherLowC,
              tourism: monthData.tourismLevel
            });
          }
          if (calendar.months[month]) {
            for (const range of calendar.months[month].ranges) {
              if (range.days.includes(day)) {
                totalScore += range.score;
                daysCount++;
                if (range.notes) {
                  allNotes.add(range.notes);
                }
                if (range.special && range.event) {
                  const eventKey = range.event;
                  if (!eventsMap.has(eventKey)) {
                    eventsMap.set(eventKey, {
                      event: eventKey,
                      dates: [],
                      notes: range.notes
                    });
                  }
                  eventsMap.get(eventKey).dates.push({
                    month: monthNames[currentDate.getMonth()].charAt(0).toUpperCase() + 
                           monthNames[currentDate.getMonth()].slice(1),
                    day: day
                  });
                }
                break;
              }
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      const events = [];
      for (const eventData of eventsMap.values()) {
        eventData.dates.sort((a, b) => {
          const monthOrder = monthNames.indexOf(a.month.toLowerCase()) - monthNames.indexOf(b.month.toLowerCase());
          if (monthOrder === 0) {
            return a.day - b.day;
          }
          return monthOrder;
        });
        
        let formattedDates = [];
        let rangeStart = null;
        let rangeEnd = null;
        
        eventData.dates.forEach((dateObj, index) => {
          if (rangeStart === null) {
            rangeStart = dateObj;
            rangeEnd = dateObj;
          } else {
            const prevDate = new Date(2023, monthNames.indexOf(eventData.dates[index-1].month.toLowerCase()), eventData.dates[index-1].day);
            const currDate = new Date(2023, monthNames.indexOf(dateObj.month.toLowerCase()), dateObj.day);
            const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
            if (dayDiff === 1) {
              rangeEnd = dateObj;
            } else {
              if (rangeStart.month === rangeEnd.month && rangeStart.day === rangeEnd.day) {
                formattedDates.push(`${rangeStart.month} ${rangeStart.day}`);
              } else if (rangeStart.month === rangeEnd.month) {
                formattedDates.push(`${rangeStart.month} ${rangeStart.day}-${rangeEnd.day}`);
              } else {
                formattedDates.push(`${rangeStart.month} ${rangeStart.day} - ${rangeEnd.month} ${rangeEnd.day}`);
              }
              rangeStart = dateObj;
              rangeEnd = dateObj;
            }
          }
          if (index === eventData.dates.length - 1) {
            if (rangeStart.month === rangeEnd.month && rangeStart.day === rangeEnd.day) {
              formattedDates.push(`${rangeStart.month} ${rangeStart.day}`);
            } else if (rangeStart.month === rangeEnd.month) {
              formattedDates.push(`${rangeStart.month} ${rangeStart.day}-${rangeEnd.day}`);
            } else {
              formattedDates.push(`${rangeStart.month} ${rangeStart.day} - ${rangeEnd.month} ${rangeEnd.day}`);
            }
          }
        });
        
        events.push({
          event: eventData.event,
          dates: formattedDates,
          notes: eventData.notes
        });
      }
      
      const avgScore = daysCount > 0 ? totalScore / daysCount : 0;
      
      return {
        avgScore: avgScore.toFixed(1),
        events: events,
        notes: [...allNotes],
        weatherInfo: weatherInfo
      };
    } catch (error) {
      console.error(`Error fetching calendar info for ${city.title}:`, error);
      return null;
    }
  };

  // Helper function to add markers with popups (updated marker click handler)
  const addMarkersWithPopups = async (mapboxgl) => {
    if (!mapInstance.current) {
      return;
    }
    
    const citiesToShow = filteredDestinations.length > 0 ? filteredDestinations : destinations;
    if (!citiesToShow || citiesToShow.length === 0) {
      return;
    }
    
    markersRef.current.forEach(marker => marker.remove());
    popupsRef.current.forEach(popup => popup.remove());
    markersRef.current = [];
    popupsRef.current = [];
    
    for (const city of citiesToShow) {
      if (!city.longitude || !city.latitude) {
        continue;
      }
      
      const countryColor = countryColors[city.country] || '#d63631';
      
      const isCapital = city.landmarks && city.landmarks.some(landmark => 
        landmark.includes('Capital') || landmark.includes('Palace') || 
        landmark.includes('Parliament') || landmark.includes('Royal')
      );
      const isMajorCity = ['Paris', 'Rome', 'London', 'Berlin', 'Madrid', 'Amsterdam', 
                           'Vienna', 'Prague', 'Budapest', 'Barcelona', 'Athens', 'Brussels', 
                           'Warsaw', 'Lisbon', 'Stockholm', 'Copenhagen', 'Oslo', 'Helsinki',
                           'Dublin', 'Zurich', 'Geneva'].includes(city.title);
      
      const markerSize = isCapital || isMajorCity ? 28 : 22;

      const el = document.createElement('div');
      el.className = 'cursor-pointer map-marker';
      el.style.width = `${markerSize}px`;
      el.style.height = `${markerSize}px`;
      el.innerHTML = `
        <svg height="${markerSize}" width="${markerSize}" viewBox="0 0 24 24" style="fill:${countryColor};stroke:#ffffff;stroke-width:1px">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
        </svg>
      `;
      
      const marker = new mapboxgl.Marker(el)
        .setLngLat([city.longitude, city.latitude])
        .addTo(mapInstance.current);
      
      el.addEventListener('click', async () => {
        // If the popup for this city is already open, exit early.
        if (currentPopup && currentPopup.cityTitle === city.title) {
          return;
        }
        
        // Close any existing popup
        if (currentPopup) {
          currentPopup.remove();
          setCurrentPopup(null);
        }
        
        onMarkerClick(city);
        
        // Create a loading indicator on the marker
        const loadingEl = document.createElement('div');
        loadingEl.className = 'marker-loading';
        loadingEl.style.position = 'absolute';
        loadingEl.style.top = `-10px`;
        loadingEl.style.left = `${markerSize / 2 - 5}px`;
        loadingEl.style.width = '10px';
        loadingEl.style.height = '10px';
        loadingEl.style.borderRadius = '50%';
        loadingEl.style.backgroundColor = '#ffffff';
        loadingEl.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.3)';
        loadingEl.style.zIndex = '100';
        loadingEl.style.animation = 'pulse 1s infinite';
        el.appendChild(loadingEl);
        
        try {
          let calendarInfo = null;
          if ((filters.startDate && filters.endDate) || 
              (filters.useFlexibleDates && filters.selectedMonths.length > 0)) {
            if (filters.useFlexibleDates) {
              calendarInfo = await getCityCalendarInfo(city, null, null);
            } else {
              calendarInfo = await getCityCalendarInfo(city, filters.startDate, filters.endDate);
            }
          }
          
          // Fly to the city's location
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
          
          if (loadingEl.parentNode) {
            loadingEl.parentNode.removeChild(loadingEl);
          }
          
          const popupContent = generatePopupContent(city, calendarInfo, countryColor);
          const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            className: 'custom-popup centered-popup',
            maxWidth: '320px',
            focusAfterOpen: false,
            offset: 0
          });
          popup.cityTitle = city.title;
          
          // Set the popup at the current map center
          const center = mapInstance.current.getCenter();
          popup.setLngLat(center).setHTML(popupContent).addTo(mapInstance.current);
          
          // Adjust the map so that the popup is vertically centered
          const popupContentEl = document.querySelector('.mapboxgl-popup-content');
          if (popupContentEl) {
            const popupHeight = popupContentEl.offsetHeight;
            const verticalOffset = popupHeight / 2;
            mapInstance.current.panBy([0, -verticalOffset], { duration: 300 });
          }
          
          setCurrentPopup(popup);
        } catch (error) {
          console.error("Error displaying popup:", error);
          if (loadingEl.parentNode) {
            loadingEl.parentNode.removeChild(loadingEl);
          }
        }
      });
      
      markersRef.current.push(marker);
    }
  };

  // Helper function to generate popup content
  const generatePopupContent = (city, calendarInfo, countryColor) => {
    let popupContent = `
      <div class="popup-content">
        <div style="border-top: 4px solid ${countryColor}; padding: 12px;">
          <h3 class="font-bold text-lg">${city.title || 'Unnamed City'}</h3>
          ${city.country ? `<p class="text-sm text-gray-600">${city.country}</p>` : ''}
          ${city.description ? `<p class="mt-2">${city.description}</p>` : ''}
    `;
    if (calendarInfo) {
      let dateDisplay;
      if (filters.useFlexibleDates) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
        const selectedMonthNames = filters.selectedMonths.map(i => monthNames[i]);
        dateDisplay = selectedMonthNames.join(', ');
      } else {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        const formattedStartDate = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const formattedEndDate = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateDisplay = `${formattedStartDate} - ${formattedEndDate}`;
      }
      
      const score = parseFloat(calendarInfo.avgScore);
      const fullStars = Math.floor(score);
      const halfStar = score - fullStars >= 0.5;
      const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
      
      const starRating = 
        '★'.repeat(fullStars) + 
        (halfStar ? '½' : '') + 
        '☆'.repeat(emptyStars);
      
      const weatherSummary = calendarInfo.weatherInfo.map(w => 
        `<div class="text-xs mb-1">
          <span class="font-medium">${w.month}:</span> ${w.low}°C to ${w.high}°C 
          <span class="ml-1 ${w.tourism > 7 ? 'text-amber-600' : ''}" title="Tourism level">
            ${w.tourism > 7 ? '👥 High season' : w.tourism > 4 ? '👤 Moderate' : '🧍 Low season'}
          </span>
        </div>`
      ).join('');
      
      let eventsList = '';
      if (calendarInfo.events.length > 0) {
        eventsList = `<div class="mt-2">
          <div class="text-sm font-semibold mb-1">Special Events:</div>
          <ul class="list-disc list-inside text-xs space-y-1">
            ${calendarInfo.events.map(e => `
              <li>
                <span class="font-medium">${e.dates.join(', ')}:</span> 
                ${e.event}
              </li>
            `).join('')}
          </ul>
        </div>`;
      }
      
      let notesSection = '';
      if (calendarInfo.notes.length > 0) {
        notesSection = `<div class="mt-2">
          <div class="text-sm font-semibold mb-1">Travel Notes:</div>
          <ul class="list-disc list-inside text-xs space-y-1">
            ${calendarInfo.notes.slice(0, 3).map(note => `<li>${note}</li>`).join('')}
          </ul>
        </div>`;
      }
      
      const dateTitle = filters.useFlexibleDates ? "Flexible Visit" : "Visit rating for";
      
      popupContent += `
        <div class="border-t border-gray-200 mt-3 pt-3">
          <div class="flex justify-between items-center">
            <div class="text-sm font-semibold">${dateTitle} ${dateDisplay}:</div>
            <div class="text-amber-500 font-bold">${starRating} (${calendarInfo.avgScore})</div>
          </div>
          <div class="mt-2">
            <div class="text-sm font-semibold mb-1">Weather & Tourism:</div>
            ${weatherSummary}
          </div>
          ${eventsList}
          ${notesSection}
        </div>
      `;
    }

    popupContent += `
          <div class="mt-3">
            <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-sm" 
                    onclick="window.location.href='/city-guides/${city.title?.toLowerCase().replace(/\s+/g, '-')}'">
              View City Guide
            </button>
          </div>
        </div>
      </div>
    `;

    return popupContent;
  };

  const handleSearchChange = (value) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setFilters(prev => ({
      ...prev,
      searchTerm: value
    }));
  };

  const handleDateRangeChange = (field, value) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMonthSelection = (month, selected) => {
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
  };

  const toggleDateMode = () => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setFilters(prev => ({
      ...prev,
      useFlexibleDates: !prev.useFlexibleDates
    }));
  };

  const handleRatingChange = (value) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setFilters(prev => ({
      ...prev,
      minRating: parseInt(value)
    }));
  };

  const toggleCountry = (country) => {
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
  };

  const handleToggleFilters = () => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setShowFilters(!showFilters);
    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.resize();
      }
    }, 300);
  };

  return (
    <>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      
      <div className="absolute top-4 left-4 z-10">
        <button 
          onClick={handleToggleFilters}
          className="bg-white p-2 rounded-full shadow-md mb-2 hover:bg-gray-100"
          title={showFilters ? "Hide filters" : "Show filters"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={showFilters ? "text-blue-500" : "text-gray-700"}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
        </button>
        
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow-md w-72 animate-fade-in">
            <h3 className="font-bold text-lg mb-3">Filters</h3>
            
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Countries</label>
              <div className="mb-2">
                <div 
                  className="w-full p-2 border border-gray-300 rounded-md flex justify-between items-center cursor-pointer bg-white"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                >
                  <div className="flex flex-wrap gap-1 max-w-[90%] overflow-hidden">
                    {filters.countries.includes('All') 
                      ? <span className="px-1">All Countries</span>
                      : filters.countries.map(country => (
                          <span key={country} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs flex items-center">
                            {country}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCountry(country);
                              }} 
                              className="ml-1 text-blue-500 hover:text-blue-800"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))
                    }
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${showCountryDropdown ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {showCountryDropdown && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {countries.map(country => (
                    <div 
                      key={country} 
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-100 ${
                        filters.countries.includes(country) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => toggleCountry(country)}
                    >
                      <span>{country}</span>
                      {filters.countries.includes(country) && (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input 
                type="text" 
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter city name..."
                value={filters.searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Visit Dates</label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-2">
                    {filters.useFlexibleDates ? 'Flexible' : 'Exact'}
                  </span>
                  <button 
                    onClick={toggleDateMode}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                      filters.useFlexibleDates ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span 
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        filters.useFlexibleDates ? 'translate-x-5' : 'translate-x-1'
                      }`} 
                    />
                  </button>
                </div>
              </div>
              
              {filters.useFlexibleDates ? (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-2">Select months to visit:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                      <div 
                        key={month}
                        onClick={() => handleMonthSelection(index, !filters.selectedMonths.includes(index))}
                        className={`cursor-pointer text-center py-1 px-2 rounded text-sm ${
                          filters.selectedMonths.includes(index) 
                            ? 'bg-blue-100 text-blue-800 font-medium' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {month}
                      </div>
                    ))}
                  </div>
                  {filters.selectedMonths.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Please select at least one month</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      value={filters.startDate}
                      onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      value={filters.endDate}
                      onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                      min={filters.startDate}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Rating</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={filters.minRating}
                onChange={(e) => handleRatingChange(e.target.value)}
                disabled={(!filters.startDate || !filters.endDate) && 
                          (filters.useFlexibleDates && filters.selectedMonths.length === 0)}
              >
                <option value="0">All Ratings</option>
                <option value="3">3+ ★★★☆☆</option>
                <option value="4">4+ ★★★★☆</option>
                <option value="5">5 ★★★★★</option>
              </select>
              {((!filters.startDate || !filters.endDate) && !filters.useFlexibleDates) || 
               (filters.useFlexibleDates && filters.selectedMonths.length === 0) ? (
                <p className="text-xs text-amber-600 mt-1">
                  {filters.useFlexibleDates ? 'Select at least one month' : 'Select a date range'} to filter by rating
                </p>
              ) : null}
              {dateRangeLoading && (
                <p className="text-xs text-blue-600 mt-1">Loading ratings for selected dates...</p>
              )}
            </div>
            
            <div className="text-sm text-gray-500">
              Showing {filteredDestinations.length || destinations.length} cities
            </div>
          </div>
        )}
      </div>
      
      {destinations?.length === 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded shadow-md">
          <p>No destination data available to display on the map.</p>
        </div>
      )}
    </>
  );
}

export default MapComponent;
