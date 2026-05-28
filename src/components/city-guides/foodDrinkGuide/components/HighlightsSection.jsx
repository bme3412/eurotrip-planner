'use client';

import React from 'react';
import { MapPin, Clock } from 'lucide-react';

export default function HighlightsSection({ highlights }) {
  if (!highlights || highlights.length === 0) return null;

  return (
    <section className="border-t border-gray-200 pt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
        Don&apos;t Miss
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {highlights.map((item, i) => (
          <div
            key={i}
            className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{item.name}</h3>
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                {item.type}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              {item.neighborhood && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {item.neighborhood}
                </span>
              )}
              {item.time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {item.time}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
