'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCityById, getCityByName } from '@/lib/cities/lookup';
import { buildDayAssignments, parseIsoDate } from '@/lib/conversation/dayAssignments';
import { getFlagForCountry } from '@/utils/countryFlags';

const MAP_CITY_PALETTE = [
  '#d97706',
  '#0d9488',
  '#7c3aed',
  '#db2777',
  '#0369a1',
  '#16a34a',
  '#b45309',
  '#4338ca',
];

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDayDate(value) {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function cityDisplayName(city) {
  if (!city?.name) return '';
  return city.country ? `${getFlagForCountry(city.country)} ${city.name}` : city.name;
}

function resolveCity(city) {
  const id = city?.id || city?.name?.toLowerCase();
  const canonical = getCityById(id) || getCityByName(city?.name);
  return {
    ...city,
    id,
    name: city?.name || canonical?.name || id,
    country: city?.country || canonical?.country || null,
    latitude: city?.latitude || canonical?.latitude || null,
    longitude: city?.longitude || canonical?.longitude || null,
    description: canonical?.description || null,
  };
}

function buildRoutePoints(tripState) {
  const cities = [...(tripState?.route?.cities || [])]
    .map(resolveCity)
    .filter((city) => city.id && city.name)
    .sort((a, b) => {
      const ao = Number.isFinite(a.order) ? a.order : 999;
      const bo = Number.isFinite(b.order) ? b.order : 999;
      return ao - bo;
    });

  return cities
    .map((city, index) => ({
      ...city,
      index,
      color: MAP_CITY_PALETTE[index % MAP_CITY_PALETTE.length],
      lng: city.longitude,
      lat: city.latitude,
    }))
    .filter((city) => Number.isFinite(city.lng) && Number.isFinite(city.lat));
}

function buildPreviewPoints(interaction, routePoints) {
  const confirmedIds = new Set(routePoints.map((point) => point.id));
  return (interaction?.previewSuggestions || [])
    .map(resolveCity)
    .filter((city) => city.id && city.name && !confirmedIds.has(city.id))
    .map((city, index) => ({
      ...city,
      index,
      color: '#c9a227',
      lng: city.longitude,
      lat: city.latitude,
    }))
    .filter((city) => Number.isFinite(city.lng) && Number.isFinite(city.lat));
}

function buildDayTabs(tripState, routePoints) {
  const days = buildDayAssignments(tripState);
  if (days.length > 0) {
    return days.map((day) => {
      const point = routePoints.find((city) => city.id === day.cityId);
      return {
        ...day,
        point,
        label: `Day ${day.dayIndex + 1}`,
        dateLabel: formatDayDate(day.date),
      };
    });
  }

  return routePoints.flatMap((point) => {
    const nights = Number.isFinite(point.nights) && point.nights > 0 ? point.nights : 1;
    return Array.from({ length: nights }, (_, offset) => ({
      dayIndex: point.index + offset,
      cityId: point.id,
      cityName: point.name,
      date: null,
      point,
      label: `Day ${point.index + offset + 1}`,
      dateLabel: null,
    }));
  });
}

function EmptyMapState() {
  return (
    <div className="relative flex h-full min-h-[320px] items-center justify-center overflow-hidden bg-[#f7f3ec] p-8">
      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-[12%] top-[18%] h-24 w-24 rounded-full border border-[#e5e0d8]" />
        <div className="absolute right-[16%] top-[28%] h-16 w-16 rounded-full border border-[#e5e0d8]" />
        <div className="absolute bottom-[18%] left-[30%] h-20 w-20 rounded-full border border-[#e5e0d8]" />
        <div className="absolute left-[20%] right-[20%] top-1/2 border-t border-dashed border-[#d5d0c8]" />
      </div>
      <div className="relative max-w-sm rounded-3xl border border-[#e5e0d8] bg-white/85 p-5 text-center shadow-sm backdrop-blur">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a8578]">
          Itinerary map
        </p>
        <h3 className="mt-2 font-display text-xl font-semibold text-[#2a2520]">
          Your route becomes a day-by-day map.
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[#6a6459]">
          Add a city, paste a flight, or describe a route. Days, pins, and route details
          will appear here as the plan takes shape.
        </p>
      </div>
    </div>
  );
}

function DayTabs({ days, selectedIndex, onSelectDay }) {
  if (days.length === 0) return null;
  return (
    <div className="absolute left-3 right-3 top-3 z-20 flex gap-2 overflow-x-auto pb-1">
      {days.map((day) => {
        const active = selectedIndex === day.dayIndex;
        const disabled = !day.point;
        return (
          <button
            key={`${day.dayIndex}-${day.cityId || 'free'}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelectDay(day.dayIndex)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur transition-all ${
              active
                ? 'border-[#2a2520] bg-[#2a2520] text-white'
                : disabled
                  ? 'border-[#e5e0d8] bg-white/70 text-[#b5b0a8]'
                  : 'border-[#e5e0d8] bg-white/90 text-[#2a2520] hover:bg-white'
            }`}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}

function DetailCard({ selectedDay, routePoints, stats, mode, onModeChange }) {
  const point = selectedDay?.point || routePoints[0];
  if (!point) return null;

  const routeIndex = routePoints.findIndex((city) => city.id === point.id);
  const nextPoint = routePoints[routeIndex + 1] || null;
  const nights = Number.isFinite(point.nights) ? point.nights : null;
  const routeNames = routePoints.map((city) => city.name).filter(Boolean);
  const routeUrl = routePoints.length > 1
    ? (() => {
        const origin = routePoints[0];
        const destination = routePoints[routePoints.length - 1];
        const waypoints = routePoints.slice(1, -1);
        const params = new URLSearchParams({
          api: '1',
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          travelmode: 'transit',
        });
        if (waypoints.length > 0) {
          params.set(
            'waypoints',
            waypoints.map((city) => `${city.lat},${city.lng}`).join('|')
          );
        }
        return `https://www.google.com/maps/dir/?${params.toString()}`;
      })()
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.name} ${point.country || ''}`)}`;

  const handleCopyRoute = () => {
    const text = routeNames.join(' -> ');
    navigator.clipboard?.writeText(text);
  };

  const expanded = mode === 'expanded';

  return (
    <div className={`absolute bottom-4 right-4 z-20 w-[min(360px,calc(100%-2rem))] overflow-y-auto rounded-3xl border border-[#e5e0d8] bg-white/95 p-4 shadow-xl backdrop-blur ${
      expanded ? 'top-20' : 'max-h-[220px]'
    }`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8578]">
            {selectedDay?.label || `Stop ${routeIndex + 1}`}
            {selectedDay?.dateLabel ? ` · ${selectedDay.dateLabel}` : ''}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-[#2a2520]">
            <span className="font-sans" aria-hidden="true">
              {point.country ? `${getFlagForCountry(point.country)} ` : ''}
            </span>
            {point.name}
          </h3>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onModeChange(expanded ? 'compact' : 'expanded')}
            className="rounded-full border border-[#e5e0d8] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6a6459] hover:bg-[#faf8f5]"
          >
            {expanded ? 'Less' : 'More'}
          </button>
          <button
            type="button"
            onClick={() => onModeChange('hidden')}
            className="rounded-full border border-[#e5e0d8] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6a6459] hover:bg-[#faf8f5]"
          >
            Hide
          </button>
        </div>
      </div>
      {point.country && (
        <p className="mt-1 text-sm text-[#8a8578]">{point.country}</p>
      )}

      {expanded && (
        <p className="mt-4 text-sm leading-relaxed text-[#4a4540]">
          {point.description ||
            `${point.name} is part of the current route. Use the conversation or schedule above to tune nights, add stops, or reshape the order.`}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={routeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl bg-[#2a2520] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a1510]"
        >
          Open route
        </a>
        <button
          type="button"
          onClick={handleCopyRoute}
          className="inline-flex items-center justify-center rounded-xl border border-[#e5e0d8] bg-white px-4 py-2 text-sm font-semibold text-[#2a2520] hover:bg-[#faf8f5]"
        >
          Copy route
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-[#faf8f5] p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8578]">Stay</p>
          <p className="mt-1 text-sm font-semibold text-[#2a2520]">
            {nights != null ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : 'Flexible'}
          </p>
        </div>
        <div className="rounded-2xl bg-[#faf8f5] p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8578]">Route stop</p>
          <p className="mt-1 text-sm font-semibold text-[#2a2520]">
            {routeIndex + 1} of {routePoints.length}
          </p>
        </div>
      </div>

      {nextPoint && (
        <div className="mt-4 rounded-2xl border border-[#e5e0d8] p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8578]">Next leg</p>
          <p className="mt-1 text-sm font-semibold text-[#2a2520]">
            {cityDisplayName(point)} to {cityDisplayName(nextPoint)}
          </p>
          <p className="mt-1 text-xs text-[#8a8578]">
            Approx. {Math.round(haversine(point.lat, point.lng, nextPoint.lat, nextPoint.lng))} km.
          </p>
        </div>
      )}

      {stats && expanded && (
        <div className="mt-4 border-t border-[#e5e0d8] pt-4 text-xs text-[#6a6459]">
          <div className="flex justify-between">
            <span>Total distance</span>
            <span className="font-semibold text-[#2a2520]">{stats.distance}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Suggested mode</span>
            <span className="font-semibold text-[#2a2520]">{stats.mode}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewCard({ previewPoints }) {
  if (previewPoints.length === 0) return null;
  return (
    <div className="absolute bottom-4 right-4 z-20 w-[min(340px,calc(100%-2rem))] rounded-3xl border border-dashed border-[#c9a227]/60 bg-white/95 p-4 shadow-xl backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8578]">
        Preview suggestions
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[#4a4540]">
        These stops are options from the current interaction. They are not committed until you pick one.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {previewPoints.map((point) => (
          <span
            key={point.id}
            className="rounded-full border border-[#e5e0d8] bg-[#faf8f5] px-2.5 py-1 text-[11px] font-semibold text-[#2a2520]"
          >
            {cityDisplayName(point)}
          </span>
        ))}
      </div>
    </div>
  );
}

function DynamicItineraryMap({ routePoints, previewPoints, days, selectedDayIndex, onSelectDay }) {
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

  return (
    <div className="relative h-full overflow-hidden bg-[#f7f3ec]">
      <div ref={containerRef} className="h-full min-h-[320px] w-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#faf8f5]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c9a227]/30 border-t-[#c9a227]" />
        </div>
      )}
      <DayTabs days={days} selectedIndex={selectedDay?.dayIndex} onSelectDay={onSelectDay} />
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

function useRouteStats(routePoints) {
  return useMemo(() => {
    if (routePoints.length < 2) return null;

    let totalKm = 0;
    for (let i = 0; i < routePoints.length - 1; i++) {
      const from = routePoints[i];
      const to = routePoints[i + 1];
      totalKm += haversine(from.lat, from.lng, to.lat, to.lng);
    }

    if (totalKm === 0) return null;
    return {
      distance: `${Math.round(totalKm)} km`,
      mode: totalKm > 800 ? 'Flight or mixed rail' : 'Rail-friendly',
    };
  }, [routePoints]);
}

export default function RouteMapColumn({ tripState, interaction }) {
  const routePoints = useMemo(() => buildRoutePoints(tripState), [tripState]);
  const previewPoints = useMemo(
    () => buildPreviewPoints(interaction, routePoints),
    [interaction, routePoints]
  );
  const days = useMemo(
    () => buildDayTabs(tripState, routePoints),
    [routePoints, tripState]
  );
  const firstAssignedDay = days.find((day) => day.point)?.dayIndex ?? null;
  const [selectedDayIndex, setSelectedDayIndex] = useState(firstAssignedDay);

  useEffect(() => {
    if (firstAssignedDay == null) {
      setSelectedDayIndex(null);
      return;
    }
    setSelectedDayIndex((current) => {
      const stillExists = days.some((day) => day.dayIndex === current && day.point);
      return stillExists ? current : firstAssignedDay;
    });
  }, [days, firstAssignedDay]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-slate-200 shrink-0" />

      <div className="flex-1 relative min-h-0">
        {routePoints.length === 0 && previewPoints.length === 0 ? (
          <EmptyMapState />
        ) : (
          <DynamicItineraryMap
            routePoints={routePoints}
            previewPoints={previewPoints}
            days={days}
            selectedDayIndex={selectedDayIndex}
            onSelectDay={setSelectedDayIndex}
          />
        )}
      </div>
    </div>
  );
}
