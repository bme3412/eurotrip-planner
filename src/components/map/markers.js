'use client';

import { getStandardCategory, getCategoryColor, getMarkerSize } from './helpers';
import { buildAttractionPopup } from './popups';

export const buildMarkerHtml = ({ index, color, isSelected }) => {
  const scale = isSelected ? 1.4 : 1.0;
  const ring = isSelected ? `box-shadow: 0 0 0 4px rgba(59,130,246,0.25), 0 0 0 8px rgba(59,130,246,0.15);` : '';
  return `
    <div class="marker-container" style="transform: scale(${scale});">
      <div class="marker-pin" style="background-color: ${color}; ${ring} box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 2px solid white;">
        <span class="marker-text" style="font-weight: bold; font-size: 11px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${index + 1}</span>
      </div>
      <div class="marker-pulse" style="background-color: ${color}"></div>
    </div>
  `;
};

export const addAttractionMarkers = ({ map, mapboxgl, attractions, selectedAttraction }) => {
  const markers = [];
  attractions.forEach((attraction, index) => {
    let lng, lat;
    if (attraction.coordinates) {
      lng = attraction.coordinates.longitude || attraction.coordinates.lng;
      lat = attraction.coordinates.latitude || attraction.coordinates.lat;
    } else {
      lng = attraction.longitude;
      lat = attraction.latitude;
    }
    if (!lng || !lat) return;

    const category = attraction.category || attraction.type || 'Uncategorized';
    const color = getCategoryColor(category);
    const isSelected = selectedAttraction && attraction?.name === selectedAttraction?.name;

    const markerEl = document.createElement('div');
    markerEl.className = 'custom-marker';
    markerEl.setAttribute('data-attraction-name', attraction.name);
    markerEl.innerHTML = buildMarkerHtml({ index, color, isSelected });

    const standardCategory = getStandardCategory(category);
    const popupHtml = buildAttractionPopup(attraction, color, standardCategory);
    const popup = new mapboxgl.Popup({
      offset: 16,
      closeButton: false,
      closeOnClick: true,
      maxWidth: '200px',
      className: 'custom-popup'
    }).setHTML(`<div class="popup-container" style="padding:6px 8px"><strong>${attraction.name || ''}</strong></div>`);

    const marker = new mapboxgl.Marker(markerEl).setLngLat([lng, lat]).setPopup(popup).addTo(map);
    markers.push(marker);

    if (isSelected) {
      try { marker.togglePopup(); } catch (_) {}
      const targetZoom = Math.max(map.getZoom(), 15);
      map.easeTo({ center: [lng, lat], zoom: targetZoom, duration: 900, easing: t => t });
    }
  });
  return markers;
};


