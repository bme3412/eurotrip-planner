/**
 * Initialize the map
 * @param {Object} container - Map container element
 * @param {Object} viewState - Initial view state
 * @param {Function} onViewStateChange - View state change handler
 * @returns {Promise<Object>} - Map instance and initialization result
 */
export const initializeMap = async (container, viewState, onViewStateChange) => {
    try {
      const mapboxgl = (await import('mapbox-gl')).default;
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      
      const map = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        pitch: viewState.pitch,
        bearing: viewState.bearing
      });
  
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      let isMoving = false;
      
      map.on('movestart', () => {
        isMoving = true;
      });
      
      map.on('moveend', () => {
        if (isMoving) {
          const newViewState = {
            longitude: map.getCenter().lng,
            latitude: map.getCenter().lat,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch()
          };
          isMoving = false;
          onViewStateChange(newViewState);
        }
      });
      
      // Add country boundaries layer when map loads
      map.on('load', () => {
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
      });
      
      return { map, mapboxgl, isMoving: false };
    } catch (error) {
      console.error("Error initializing map:", error);
      throw error;
    }
  };
  
  /**
   * Update map view
   * @param {Object} map - Map instance
   * @param {Object} viewState - New view state
   * @param {boolean} isMoving - Whether the map is moving
   * @returns {boolean} - New moving state
   */
  export const updateMapView = (map, viewState, isMoving) => {
    if (!map || isMoving) return isMoving;
    
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    
    const centerChanged = 
      Math.abs(currentCenter.lng - viewState.longitude) > 0.0001 ||
      Math.abs(currentCenter.lat - viewState.latitude) > 0.0001;
    const zoomChanged = Math.abs(currentZoom - viewState.zoom) > 0.01;
    
    if (centerChanged || zoomChanged) {
      const newIsMoving = true;
      map.jumpTo({
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        bearing: viewState.bearing,
        pitch: viewState.pitch
      });
      
      return newIsMoving;
    }
    
    return isMoving;
  };
  
  /**
   * Create a marker element
   * @param {Object} city - City data
   * @param {string} countryColor - Country color
   * @param {boolean} isCapital - Whether the city is a capital
   * @param {boolean} isMajorCity - Whether the city is a major city
   * @returns {HTMLElement} - Marker element
   */
  export const createMarkerElement = (city, countryColor, isCapital, isMajorCity) => {
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
    
    return el;
  };
  
  /**
   * Add loading indicator to marker
   * @param {HTMLElement} markerElement - Marker element
   * @param {number} markerSize - Marker size
   * @returns {HTMLElement} - Loading element
   */
  export const addLoadingIndicator = (markerElement, markerSize) => {
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
    markerElement.appendChild(loadingEl);
    
    return loadingEl;
  };
  
  /**
   * Create a popup
   * @param {Object} mapboxgl - Mapbox GL instance
   * @param {string} content - Popup content
   * @returns {Object} - Popup instance
   */
  export const createPopup = (mapboxgl, content) => {
    const popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      className: 'custom-popup map-center-popup',
      maxWidth: '320px',
      focusAfterOpen: false,
      offset: 0,
      anchor: 'center'
    });
    
    popup.setHTML(content);
    
    return popup;
  };
  
  /**
   * Center popup in view
   * @param {Object} map - Map instance
   * @param {Object} popup - Popup instance
   */
  export const centerPopupInView = (map, popup) => {
    // Set the popup at the current map center immediately
    const center = map.getCenter();
    
    // Add popup to map directly in the center
    popup.setLngLat(center).addTo(map);
    
    // Apply CSS to ensure the popup is properly centered
    setTimeout(() => {
      const popupContentEl = document.querySelector('.mapboxgl-popup-content');
      if (popupContentEl) {
        // Get the parent popup element
        const popupEl = popupContentEl.closest('.mapboxgl-popup');
        if (popupEl) {
          // Force the popup to be centered by setting CSS
          popupEl.style.transform = 'translate(-50%, -50%)';
          popupEl.style.left = '50%';
          popupEl.style.top = '50%';
        }
      }
    }, 0);
  };