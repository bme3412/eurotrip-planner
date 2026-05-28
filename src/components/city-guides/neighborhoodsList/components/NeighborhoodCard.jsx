import React, { useState } from 'react';
import { Check, Clock, MapPin, Train, X } from 'lucide-react';
import TipsOverlay from './TipsOverlay.jsx';
import { getInsiderTips } from '../lib/constants.js';
import { getNeighborhoodIcon } from '../lib/icons.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'eat', label: 'Eat & Drink' },
  { id: 'see', label: 'See & Do' },
  { id: 'tips', label: 'Tips' },
];

const OVERVIEW_CATEGORIES = [
  { key: 'dining', icon: '🍽️', label: 'Dining' },
  { key: 'shopping', icon: '🛍️', label: 'Shopping' },
  { key: 'nightlife', icon: '🌃', label: 'Nightlife' },
  { key: 'cultural', icon: '🎭', label: 'Cultural' },
];

/**
 * Tabbed neighborhood card. Owns its own UI state (`activeTab`, `isHovered`).
 * Compare mode + selection state come in via props from the orchestrator.
 */
export default function NeighborhoodCard({ neighborhood, isSelected, onToggleSelect, isCompareMode, connections }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isHovered, setIsHovered] = useState(false);

  const tips = getInsiderTips(neighborhood);
  const atmospheres = neighborhood.appeal?.atmosphere || [];
  const bestFor = neighborhood.appeal?.best_for || [];

  return (
    <div
      className={`group bg-white rounded-2xl shadow-sm border-2 transition-all duration-200 overflow-hidden ${
        isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200 hover:shadow-md hover:border-gray-300'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with image placeholder and tips overlay */}
      <div className="relative h-40 bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl opacity-60">{getNeighborhoodIcon(neighborhood.name)}</span>
        </div>

        {isCompareMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white/90 border-gray-300 hover:border-purple-400'
            }`}
          >
            {isSelected && <Check className="w-4 h-4" />}
          </button>
        )}

        {neighborhood.location?.central && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Central
          </div>
        )}

        <TipsOverlay tips={tips} />
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-bold text-gray-900 text-lg">{neighborhood.name}</h3>
          {neighborhood.alternate_names && neighborhood.alternate_names.length > 0 && (
            <p className="text-xs text-gray-500">{neighborhood.alternate_names[0]}</p>
          )}
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{neighborhood.character}</p>
        </div>

        {atmospheres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {atmospheres.slice(0, 3).map((atm, i) => (
              <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                {atm}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-3">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="min-h-[140px]">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {OVERVIEW_CATEGORIES.map((cat) => (
                  <div key={cat.key} className="flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${((neighborhood.categories?.[cat.key] || 0) / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-6">{neighborhood.categories?.[cat.key] || 0}/5</span>
                  </div>
                ))}
              </div>

              {bestFor.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Best for</div>
                  <div className="flex flex-wrap gap-1">
                    {bestFor.slice(0, 3).map((item, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'eat' && (
            <div className="space-y-2">
              {(neighborhood.highlights?.dining || []).slice(0, 3).map((place, i) => (
                <div key={i} className="p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">{place.name}</span>
                    <span className="text-xs text-gray-500">{place.price_range}</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {place.cuisine} • {place.known_for}
                  </p>
                </div>
              ))}
              {(!neighborhood.highlights?.dining || neighborhood.highlights.dining.length === 0) && (
                <p className="text-sm text-gray-500 italic">No dining info available</p>
              )}
            </div>
          )}

          {activeTab === 'see' && (
            <div className="space-y-2">
              {(neighborhood.highlights?.attractions || []).slice(0, 3).map((place, i) => (
                <div key={i} className="p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getNeighborhoodIcon(place.type)}</span>
                    <span className="font-medium text-sm text-gray-900">{place.name}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{place.appeal}</p>
                </div>
              ))}
              {(!neighborhood.highlights?.attractions || neighborhood.highlights.attractions.length === 0) && (
                <p className="text-sm text-gray-500 italic">No attractions info available</p>
              )}
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-3">
              {neighborhood.stay_here_if && neighborhood.stay_here_if.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 mb-1">
                    <Check className="w-3 h-3" />
                    Stay here if
                  </div>
                  <ul className="space-y-0.5">
                    {neighborhood.stay_here_if.slice(0, 2).map((item, i) => (
                      <li key={i} className="text-xs text-gray-600">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {neighborhood.avoid_if && neighborhood.avoid_if.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-medium text-red-600 mb-1">
                    <X className="w-3 h-3" />
                    Skip if
                  </div>
                  <ul className="space-y-0.5">
                    {neighborhood.avoid_if.slice(0, 2).map((item, i) => (
                      <li key={i} className="text-xs text-gray-600">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {neighborhood.practical_info?.transit && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <Train className="w-3 h-3" />
                    Metro Stations
                  </div>
                  <p className="text-xs text-gray-600">
                    {neighborhood.practical_info.transit.slice(0, 3).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Connections */}
        {connections && connections.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-2">
              <MapPin className="w-3 h-3" />
              Nearby Neighborhoods
            </div>
            <div className="flex flex-wrap gap-2">
              {connections.slice(0, 2).map((conn, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>
                    {conn.walkTime} min to {conn.to}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
