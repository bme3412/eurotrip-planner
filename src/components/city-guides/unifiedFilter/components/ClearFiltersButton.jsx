'use client';

import React from 'react';

export default function ClearFiltersButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-3 text-sm text-red-600 hover:text-red-700 font-semibold hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      Clear All
    </button>
  );
}
