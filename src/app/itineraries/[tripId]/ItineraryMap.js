'use client';

import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function ItineraryMap({ markers }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !markers?.length) return;
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return; // no token → leave the slot empty

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    // Map creation can throw (no WebGL support, bad token). Never let that crash
    // the whole itinerary page — just skip the map.
    let map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [markers[0].lng, markers[0].lat],
        zoom: 12,
        attributionControl: false,
      });
    } catch (err) {
      console.warn('[ItineraryMap] map unavailable:', err?.message || err);
      return;
    }

    map.on('error', () => {}); // swallow tile/style errors (offline, quota)
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    const bounds = new mapboxgl.LngLatBounds();

    for (const m of markers) {
      bounds.extend([m.lng, m.lat]);

      const el = document.createElement('div');
      Object.assign(el.style, {
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        background: m.color,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: '700',
        border: '2.5px solid white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        cursor: 'pointer',
      });
      el.textContent = m.dayNum;

      new mapboxgl.Marker({ element: el })
        .setLngLat([m.lng, m.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 18, closeButton: false, maxWidth: '220px' })
            .setHTML(
              `<div style="padding:6px 10px">` +
              `<div style="font-size:11px;font-weight:600;color:#6366F1;text-transform:uppercase;letter-spacing:0.05em">Day ${m.dayNum} · ${m.timeBlock || ''}</div>` +
              `<div style="font-size:14px;font-weight:700;margin-top:2px">${m.name}</div>` +
              `</div>`
            )
        )
        .addTo(map);
    }

    map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
    mapRef.current = map;

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, [markers]);

  return <div ref={containerRef} className="h-72 w-full md:h-[420px]" />;
}
