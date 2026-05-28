'use client';

import React from 'react';
import { Camera, MapPin, Star, ChevronRight } from 'lucide-react';

export default function SpotDetailModal({ spot, onClose }) {
  if (!spot) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative h-48 bg-gradient-to-br from-violet-200 via-purple-100 to-pink-200 flex items-center justify-center">
          <Camera className="w-16 h-16 text-violet-400" />
          {spot.iconic && (
            <span className="absolute top-4 left-4 px-3 py-1 bg-amber-400 text-amber-900 text-sm font-bold rounded-full flex items-center gap-1">
              <Star className="w-4 h-4 fill-current" /> Iconic Spot
            </span>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 rotate-45" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(85vh-12rem)]">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{spot.name}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              <span>{spot.neighborhood} arrondissement</span>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed">{spot.description}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-xs text-amber-600 font-medium mb-1">Best Time</div>
              <div className="text-sm text-amber-900 font-semibold">{spot.bestTime}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-blue-600 font-medium mb-1">Crowd Level</div>
              <div className="text-sm text-blue-900 font-semibold">{spot.crowdLevel}</div>
            </div>
          </div>

          {spot.tips && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-900 mb-1">💡 Pro Tip</div>
              <p className="text-sm text-gray-600">{spot.tips}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
