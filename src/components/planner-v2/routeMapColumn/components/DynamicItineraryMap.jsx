'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cityDisplayName } from '../lib/cityResolution.js';
import useRouteStats from '../hooks/useRouteStats.js';
import SelectedStopIndicator from './SelectedStopIndicator.jsx';
import DetailCard from './DetailCard.jsx';
import PreviewCard from './PreviewCard.jsx';

/**
 * Mapbox-rendered itinerary map. Lazy-loads `mapbox-gl` on mount, draws a
 * gradient route line between confirmed stops, places numbered markers + label
 * pills for confirmed stops and dashed dots for preview stops, and re-fits
 * bounds whenever the route or detail-card mode changes.
 *
 * The cleanup ref pattern (cancelled flag + markersRef/mapRef removal in the
 * effect's return) is the most fragile part of this component — preserve it
 * verbatim if you touch this file.
 */
export default function DynamicItineraryMap({
  routePoints,
  previewPoints,
  days,
  selectedDayIndex,
  onSelectDay,
  setCityNights,
  onSendMessage,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mapboxRef = useRef(null);
  const markersRef = useRef([]);
  const [loaded, setLoaded] = useState(false);
  const [detailMode, setDetailMode] = useState('compact');
  const selectedDay = days.find((day) => day.dayIndex === selectedDayIndex && day.point) ||
    days.find((day) => day.point) ||
    null;
  const mapPoints = routePoints.length > 0 ? routePoints : previewPoints;

  const lineCoordinates = useMemo(
    () => routePoints.map((point) => [point.lng, point.lat]),
    [routePoints]
  );
  const routeGradient = useMemo(() => {
    if (routePoints.length < 2) return '#d97706';
    const expression = ['interpolate', ['linear'], ['line-progress']];
    routePoints.forEach((point, index) => {
      expression.push(index / (routePoints.length - 1), point.color || '#d97706');
    });
    return expression;
  }, [routePoints]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || mapPoints.length === 0) return;

    let cancelled = false;
    (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      if (cancelled || !containerRef.current) return;

      mapboxRef.current = mapboxgl;
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      mapRef.current = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [mapPoints[0].lng, mapPoints[0].lat],
        zoom: mapPoints.length > 1 ? 4 : 6,
        attributionControl: false,
        interactive: true,
        pitchWithRotate: false,
        maxBounds: [
          [-25, 34],
          [45, 72],
        ],
        minZoom: 3,
        maxZoom: 13,
      });
      mapRef.current.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        'bottom-right'
      );
      mapRef.current.on('load', () => setLoaded(true));
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setLoaded(false);
    };
  }, [mapPoints]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!loaded || !map || !mapboxgl) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (map.getLayer('planner-route-line')) map.removeLayer('planner-route-line');
    if (map.getSource('planner-route')) map.removeSource('planner-route');

    if (lineCoordinates.length >= 2) {
      map.addSource('planner-route', {
        type: 'geojson',
        lineMetrics: true,
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: lineCoordinates,
          },
        },
      });
      map.addLayer({
        id: 'planner-route-line',
        type: 'line',
        source: 'planner-route',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': routePoints[0]?.color || '#d97706',
          'line-gradient': routeGradient,
          'line-width': 5,
          'line-opacity': 0.85,
        },
      });
    }

    const selectedCityId = selectedDay?.point?.id;
    routePoints.forEach((point, index) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `planner-itinerary-marker ${selectedCityId === point.id ? 'selected' : ''}`;
      el.style.setProperty('--marker-color', point.color || '#2a2520');
      el.innerHTML = `
        <span class="planner-itinerary-marker-num">${index + 1}</span>
        <span class="planner-itinerary-marker-label">${cityDisplayName(point)}</span>
      `;
      el.addEventListener('click', () => {
        const dayForCity = days.find((day) => day.cityId === point.id);
        if (dayForCity) onSelectDay(dayForCity.dayIndex);
      });
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });

    previewPoints.forEach((point) => {
      const el = document.createElement('div');
      el.className = 'planner-itinerary-preview-marker';
      el.style.setProperty('--marker-color', point.color || '#c9a227');
      el.innerHTML = `
        <span class="planner-itinerary-preview-dot"></span>
        <span class="planner-itinerary-marker-label">${cityDisplayName(point)}</span>
      `;
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });

    const bounds = new mapboxgl.LngLatBounds();
    mapPoints.forEach((point) => bounds.extend([point.lng, point.lat]));
    if (mapPoints.length === 1) {
      map.easeTo({ center: [mapPoints[0].lng, mapPoints[0].lat], zoom: 6, duration: 400 });
    } else {
      map.fitBounds(bounds, {
        padding: {
          top: 80,
          right: detailMode === 'expanded' ? 420 : 80,
          bottom: detailMode === 'hidden' ? 60 : 170,
          left: 60,
        },
        maxZoom: 7,
        duration: 500,
      });
    }
  }, [days, detailMode, lineCoordinates, loaded, mapPoints, onSelectDay, previewPoints, routeGradient, routePoints, selectedDay]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !selectedDay?.point) return;
    map.easeTo({
      center: [selectedDay.point.lng, selectedDay.point.lat],
      duration: 350,
    });
  }, [loaded, selectedDay]);

  const stats = useRouteStats(routePoints);
  const handleCompareTransport = useCallback(
    (from, to) => {
      if (!from?.name || !to?.name) return;
      onSendMessage?.(`Compare the best transport from ${from.name} to ${to.name}.`);
    },
    [onSendMessage]
  );

  return (
    <div className="relative h-full overflow-hidden bg-[#f7f3ec]">
      <div ref={containerRef} className="h-full min-h-[320px] w-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#faf8f5]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c9a227]/30 border-t-[#c9a227]" />
        </div>
      )}
      <SelectedStopIndicator selectedDay={selectedDay} />
      {routePoints.length > 0 && detailMode === 'hidden' && (
        <button
          type="button"
          onClick={() => setDetailMode('compact')}
          className="absolute bottom-4 right-4 z-20 rounded-full border border-[#e5e0d8] bg-white/95 px-4 py-2 text-sm font-semibold text-[#2a2520] shadow-lg backdrop-blur hover:bg-[#faf8f5]"
        >
          Show stop details
        </button>
      )}
      {routePoints.length > 0 && detailMode !== 'hidden' ? (
        <DetailCard
          selectedDay={selectedDay}
          routePoints={routePoints}
          stats={stats}
          mode={detailMode}
          onModeChange={setDetailMode}
          onSetCityNights={setCityNights}
          onCompareTransport={handleCompareTransport}
        />
      ) : (
        <PreviewCard previewPoints={previewPoints} />
      )}

      <style jsx global>{`
        .planner-itinerary-marker {
          border: 0;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transform: translateY(-6px);
        }
        .planner-itinerary-marker-num {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--marker-color, #2a2520);
          color: white;
          font-size: 12px;
          font-weight: 800;
          border: 2px solid white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
        }
        .planner-itinerary-marker.selected .planner-itinerary-marker-num {
          transform: scale(1.12);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--marker-color, #2a2520) 22%, transparent), 0 8px 18px rgba(0, 0, 0, 0.26);
        }
        .planner-itinerary-marker-label {
          margin-top: 4px;
          border-radius: 999px;
          border: 1px solid #e5e0d8;
          background: rgba(255, 255, 255, 0.95);
          color: #2a2520;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
          white-space: nowrap;
        }
        .planner-itinerary-preview-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translateY(-6px);
        }
        .planner-itinerary-preview-dot {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--marker-color, #c9a227) 16%, white);
          border: 2px dashed var(--marker-color, #c9a227);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        }
      `}</style>
    </div>
  );
}
