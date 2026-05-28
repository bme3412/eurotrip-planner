'use client';

import React from 'react';

/**
 * Global styled-jsx block for markers + Mapbox popup overrides.
 *
 * Kept as a styled-jsx component so the styles ship with the map only when the
 * map is rendered. Class names (`custom-marker`, `marker-container`,
 * `marker-pin`, `marker-text`, `marker-pulse`, `marker-label`,
 * `popup-container`, `popup-title`, `popup-category`, `popup-description`,
 * `popup-details`, `popup-detail-item`, `popup-detail-icon`,
 * `popup-detail-text`, `selected-popup`) are referenced from the DOM marker
 * factory and popup HTML builders under `./dom/`.
 */
export default function MapStyles() {
  return (
    <style jsx global>{`
      .marker-container {
        position: relative;
        width: 30px;
        height: 40px;
        cursor: pointer;
        transform-origin: bottom center;
        transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .custom-marker {
        transition: filter 0.35s ease-out, z-index 0s;
      }

      .marker-pin {
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .marker-pin:hover {
        transform: rotate(-45deg) scale(1.2);
      }

      .marker-text {
        transform: rotate(45deg);
        color: white;
        font-size: 12px;
        font-weight: bold;
      }

      .marker-pulse {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        transform: translateX(8px);
        animation: pulse 2s infinite;
      }
      .marker-label {
        position: absolute;
        top: -18px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.9);
        color: #111827;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 6px;
        padding: 2px 6px;
        font-size: 11px;
        white-space: nowrap;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        display: none;
        pointer-events: none;
      }
      .labels-visible .marker-label {
        display: block;
      }
      .custom-marker.marker-selected .marker-label {
        display: none !important;
      }

      @keyframes pulse {
        0% {
          transform: translateX(8px) scale(0.5);
          opacity: 1;
        }
        70% {
          transform: translateX(8px) scale(2);
          opacity: 0;
        }
        100% {
          transform: translateX(8px) scale(0.5);
          opacity: 0;
        }
      }

      .mapboxgl-popup {
        max-width: 450px !important;
      }
      .mapboxgl-popup-content {
        padding: 18px !important;
        overflow: visible !important;
        border-radius: 14px !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2) !important;
        max-width: 450px !important;
        word-wrap: break-word !important;
        white-space: normal !important;
      }

      .mapboxgl-popup-close-button {
        font-size: 22px !important;
        padding: 6px 12px !important;
        color: #6b7280 !important;
        top: 4px !important;
        right: 4px !important;
      }

      .mapboxgl-popup-close-button:hover {
        color: #111827 !important;
        background: transparent !important;
      }

      .selected-popup .mapboxgl-popup-content {
        min-width: 360px;
        max-width: 440px !important;
        animation: popupFadeIn 0.25s ease-out;
      }

      @keyframes popupFadeIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .mapboxgl-popup-tip {
        border-bottom-color: white !important;
      }

      .selected-popup {
        transform-origin: top center;
      }

      .mapboxgl-popup {
        transition: transform 0.3s ease-out;
      }

      .selected-popup .mapboxgl-popup-content ::-webkit-scrollbar {
        width: 6px;
      }
      .selected-popup .mapboxgl-popup-content ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      .selected-popup .mapboxgl-popup-content ::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }
      .selected-popup .mapboxgl-popup-content ::-webkit-scrollbar-thumb:hover {
        background: #a1a1a1;
      }

      .popup-container {
        padding: 14px;
        max-width: 380px;
      }

      .popup-title {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 4px;
        line-height: 1.2;
      }

      .popup-category {
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
      }

      .popup-main-category {
        opacity: 0.8;
        font-style: italic;
      }

      .popup-description {
        font-size: 13px;
        color: #4b5563;
        margin-bottom: 12px;
        line-height: 1.4;
      }

      .popup-details {
        background-color: #f9fafb;
        margin: 0 -12px -12px -12px;
        padding: 8px 12px;
        border-top: 1px solid #e5e7eb;
      }

      .popup-detail-item {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
        font-size: 12px;
      }

      .popup-detail-item:last-child {
        margin-bottom: 0;
      }

      .popup-detail-icon {
        margin-right: 6px;
        flex-shrink: 0;
      }

      .popup-detail-text {
        color: #4b5563;
      }

      .mapboxgl-ctrl-group {
        border-radius: 8px !important;
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
      }

      .mapboxgl-ctrl button {
        width: 32px !important;
        height: 32px !important;
      }
    `}</style>
  );
}
