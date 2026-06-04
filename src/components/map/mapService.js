import { COUNTRY_COLORS, MAJOR_CITIES } from './constants';

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
        // Colored basemap, consistent with every other map in the app
        // (city guides, airport, itinerary all use streets-v12).
        style: 'mapbox://styles/mapbox/streets-v12',
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
            'line-color': '#d4dae2',
            'line-width': 0.6
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
  
  // -------------------------------------------------------------
  // Phase 1: GeoJSON source + clustered layers (see lovely-baking-piglet.md)
  // -------------------------------------------------------------

  const isCapitalLike = (city) =>
    Array.isArray(city.landmarks) && city.landmarks.some((l) =>
      /Capital|Palace|Parliament|Royal/.test(l)
    );

  /**
   * Build a GeoJSON FeatureCollection from the destinations array.
   * Each feature carries enough properties for marker styling and downstream
   * lookups, including the V4 ranking for the active dates (`cityRankings`,
   * keyed by city id) so markers can be painted by band — see applyRankedPaint.
   * @param {Array<Object>} cities
   * @param {Object} [cityRankings] - id -> { score, rank, tier, band }
   * @returns {Object} GeoJSON FeatureCollection
   */
  export const buildCitiesGeoJSON = (cities, cityRankings = {}) => ({
    type: 'FeatureCollection',
    features: (cities || [])
      .filter((c) => Number.isFinite(c.longitude) && Number.isFinite(c.latitude))
      .map((c) => {
        const key = c.id || c.title;
        const r = cityRankings[key];
        return {
          type: 'Feature',
          id: key,
          geometry: {
            type: 'Point',
            coordinates: [c.longitude, c.latitude],
          },
          properties: {
            id: key,
            title: c.title,
            country: c.country,
            isCapital: isCapitalLike(c),
            isMajor: MAJOR_CITIES.includes(c.title),
            // Limited-data cities are painted as unranked (muted, unlabeled) so
            // the map only emphasizes cities we actually have signal on.
            ranked: Boolean(r) && !r.limited,
            score: r?.score ?? 0,
            rank: r?.rank ?? 0,
          },
        };
      }),
  });

  // Qualitative band colors (must match src/lib/scoring/qualitative.js).
  const BAND_COLORS = {
    top: '#10b981',
    great: '#34d399',
    good: '#fbbf24',
    fair: '#fb923c',
    unranked: '#cbd5e1',
  };

  /**
   * Build a Mapbox style expression that maps a feature's
   * `country` property to its brand color.
   * @returns {Array}
   */
  export const buildCountryColorExpression = () => {
    const expr = ['match', ['get', 'country']];
    for (const [country, color] of Object.entries(COUNTRY_COLORS)) {
      expr.push(country, color);
    }
    expr.push('#d63631'); // fallback
    return expr;
  };

  /**
   * Idempotently add the `cities` source and the three layers
   * (clusters, cluster-count, unclustered-point).
   * @param {Object} map - Mapbox map instance
   * @param {Object} geojson - FeatureCollection
   */
  export const addCitiesSourceAndLayers = (map, geojson) => {
    if (!map || map.getSource('cities')) return;

    map.addSource('cities', {
      type: 'geojson',
      data: geojson,
      // Clustering disabled per user preference: every city is rendered
      // as its own dot at all zoom levels. We keep the GeoJSON-source
      // perf win — filtering still happens via setData / setFilter, not
      // by destroying DOM markers.
      cluster: false,
    });

    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'cities',
      paint: {
        'circle-color': buildCountryColorExpression(),
        'circle-radius': [
          'case',
          ['any', ['get', 'isCapital'], ['get', 'isMajor']],
          8,
          6,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    // City-name labels make the markers informative. They only show for ranked
    // cities (top picks at any zoom, the rest as you zoom in); Mapbox's symbol
    // collision keeps them from overlapping. A white halo keeps them legible
    // over the colored basemap.
    map.addLayer({
      id: 'city-labels',
      type: 'symbol',
      source: 'cities',
      layout: {
        'text-field': ['get', 'title'],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 8, 13],
        'text-anchor': 'top',
        'text-offset': [0, 0.7],
        'text-allow-overlap': false,
        'text-optional': true,
      },
      paint: {
        'text-color': '#1f2937',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
        // Label ranked cities only: top picks from the start, the rest from
        // zoom ~5.5+ so the low-zoom view isn't cluttered. The zoom interpolate
        // must be the top-level expression (Mapbox rule), so the ranked/score
        // gating lives in each stop's output.
        'text-opacity': [
          'interpolate', ['linear'], ['zoom'],
          3, ['case', ['all', ['get', 'ranked'], ['>=', ['get', 'score'], 73]], 1, 0],
          5.5, ['case', ['get', 'ranked'], 1, 0],
        ],
      },
    });
  };

  /**
   * Switch the marker paint between two modes:
   *   - ranked: color/size/opacity driven by each city's V4 band+score for the
   *     active dates; unranked cities are dimmed so the ranked set pops.
   *   - neutral: the default country-colored dots (no dates selected).
   * Called whenever the ranking set changes. Reads feature props set by
   * buildCitiesGeoJSON, so the data must carry rankings for `hasRankings` mode.
   * @param {Object} map
   * @param {boolean} hasRankings
   */
  // Highlight ring driven by feature-state (set from list hover / selection).
  const STROKE_COLOR = [
    'case',
    ['boolean', ['feature-state', 'selected'], false], '#2563eb',
    ['boolean', ['feature-state', 'hovered'], false], '#0f172a',
    '#ffffff',
  ];

  export const applyRankedPaint = (map, hasRankings) => {
    if (!map || !map.getLayer('unclustered-point')) return;

    map.setPaintProperty('unclustered-point', 'circle-stroke-color', STROKE_COLOR);

    if (hasRankings) {
      map.setPaintProperty('unclustered-point', 'circle-color', [
        'case', ['get', 'ranked'],
        ['step', ['get', 'score'], BAND_COLORS.fair, 55, BAND_COLORS.good, 64, BAND_COLORS.great, 73, BAND_COLORS.top],
        BAND_COLORS.unranked,
      ]);
      map.setPaintProperty('unclustered-point', 'circle-radius', [
        'interpolate', ['linear'], ['zoom'],
        3, ['case', ['>=', ['get', 'score'], 73], 5.5, ['get', 'ranked'], 4, 2.5],
        6, ['case', ['>=', ['get', 'score'], 73], 8, ['get', 'ranked'], 6, 3.5],
        10, ['case', ['>=', ['get', 'score'], 73], 12, ['get', 'ranked'], 9, 5],
      ]);
      map.setPaintProperty('unclustered-point', 'circle-opacity', ['case', ['get', 'ranked'], 1, 0.4]);
      map.setPaintProperty('unclustered-point', 'circle-stroke-width', [
        'case',
        ['boolean', ['feature-state', 'selected'], false], 3,
        ['boolean', ['feature-state', 'hovered'], false], 2.5,
        ['get', 'ranked'], 1.5, 0.5,
      ]);
    } else {
      map.setPaintProperty('unclustered-point', 'circle-color', buildCountryColorExpression());
      map.setPaintProperty('unclustered-point', 'circle-radius', [
        'interpolate', ['linear'], ['zoom'],
        3, ['case', ['any', ['get', 'isCapital'], ['get', 'isMajor']], 4, 3],
        8, ['case', ['any', ['get', 'isCapital'], ['get', 'isMajor']], 8, 6],
      ]);
      map.setPaintProperty('unclustered-point', 'circle-opacity', 1);
      map.setPaintProperty('unclustered-point', 'circle-stroke-width', [
        'case',
        ['boolean', ['feature-state', 'selected'], false], 3,
        ['boolean', ['feature-state', 'hovered'], false], 2.5,
        2,
      ]);
    }
  };

  /**
   * Replace the data backing the `cities` source.
   * Cluster regeneration happens automatically.
   * @param {Object} map
   * @param {Object} geojson
   */
  export const setCitiesData = (map, geojson) => {
    if (!map) return;
    const src = map.getSource('cities');
    if (src) src.setData(geojson);
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