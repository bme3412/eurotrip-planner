'use client';

import React from 'react';

const FILTERS = [
  { id: 'all', label: 'All Spots' },
  { id: 'iconic', label: '📍 Iconic' },
  { id: 'hidden', label: '💎 Hidden Gems' },
];

export default function PhotoFilterBar({ filter, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 mr-2">Show:</span>
      {FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === f.id
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
