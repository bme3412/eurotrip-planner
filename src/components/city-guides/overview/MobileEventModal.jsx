'use client';

import React from 'react';
import { MONTH_NAMES } from './lib/constants';

/**
 * Mobile-only event detail modal. Hidden on md+ screens via Tailwind's
 * `md:hidden`; the desktop equivalent is the hover tooltip inside
 * MonthlyCalendar.
 */
export default function MobileEventModal({ activeTooltip, onClose }) {
  if (!activeTooltip) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 md:hidden">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {MONTH_NAMES[activeTooltip.monthIndex]} {activeTooltip.dayOfMonth}
            </h3>
            <p className="text-sm text-gray-500">Special Event</p>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={onClose}
            aria-label="Close event details"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <h4 className="text-xl font-medium text-gray-900 mb-4">{activeTooltip.event}</h4>
          <p className="text-gray-600 leading-relaxed mb-4">{activeTooltip.notes}</p>

          <div className="space-y-3">
            {activeTooltip.weather && (
              <div className="flex items-center">
                <span className="text-gray-400 mr-3">🌡️</span>
                <span className="text-sm text-gray-700">Weather: {activeTooltip.weather}</span>
              </div>
            )}
            {activeTooltip.crowdLevel && (
              <div className="flex items-center">
                <span className="text-gray-400 mr-3">👥</span>
                <span className="text-sm text-gray-700">Crowds: {activeTooltip.crowdLevel}</span>
              </div>
            )}
            {activeTooltip.price && (
              <div className="flex items-center">
                <span className="text-gray-400 mr-3">💰</span>
                <span className="text-sm text-gray-700">Cost: {activeTooltip.price}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
