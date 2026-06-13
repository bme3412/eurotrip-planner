'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Scale, Users, X } from 'lucide-react';

import ComparisonModal from './components/ComparisonModal.jsx';
import NeighborhoodCard from './components/NeighborhoodCard.jsx';
import NeighborhoodDetailModal from './components/NeighborhoodDetailModal.jsx';
import useNeighborhoodFilters from './hooks/useNeighborhoodFilters.js';
import { EDITORS_PICKS, NEIGHBORHOOD_SORTS, PERSONAS } from './lib/constants.js';
import { titleCaseFromSlug } from '@/lib/text';

/**
 * Orchestrator for the "Neighborhoods" tab of a city guide.
 *
 * Owns: search/persona filters, compare-mode toggle, selection set, and the
 * comparison modal. Pure UI; data comes in via the `neighborhoods` prop.
 */
export default function NeighborhoodsList({ neighborhoods, cityName }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [sortBy, setSortBy] = useState('recommended');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [detailNeighborhood, setDetailNeighborhood] = useState(null);

  const { uniqueNeighborhoods, filteredNeighborhoods } = useNeighborhoodFilters({
    neighborhoods,
    searchTerm,
    selectedPersona,
    sortBy,
  });

  const openByName = useCallback((name) => {
    const match = uniqueNeighborhoods.find((n) => n.name === name);
    if (match) setDetailNeighborhood(match);
  }, [uniqueNeighborhoods]);

  const closeDetail = useCallback(() => setDetailNeighborhood(null), []);

  // name -> editor's-pick reason, surfaced as a badge on the matching grid card
  // (replaces the separate spotlight row, which duplicated those neighborhoods).
  const editorsPickReasons = useMemo(
    () => new Map(EDITORS_PICKS.map((pick) => [pick.name, pick.reason])),
    [],
  );

  const toggleCompareSelect = useCallback((neighborhood) => {
    setSelectedForCompare((prev) => {
      const isSelected = prev.some((n) => n.name === neighborhood.name);
      if (isSelected) return prev.filter((n) => n.name !== neighborhood.name);
      if (prev.length >= 3) return [...prev.slice(1), neighborhood];
      return [...prev, neighborhood];
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedPersona(null);
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Explore {titleCaseFromSlug(cityName)} Neighborhoods</h1>
          <p className="text-sm text-gray-600 mt-1">{filteredNeighborhoods.length} neighborhoods to discover</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor="neighborhood-sort">Sort neighborhoods</label>
          <select
            id="neighborhood-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
          >
            {NEIGHBORHOOD_SORTS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.id === 'recommended' ? 'Sort: Recommended' : opt.label}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setIsCompareMode(!isCompareMode);
              if (isCompareMode) setSelectedForCompare([]);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isCompareMode ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            {isCompareMode ? 'Exit Compare' : 'Compare'}
          </button>

          {isCompareMode && selectedForCompare.length >= 2 && (
            <button
              onClick={() => setShowComparison(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Compare {selectedForCompare.length}
            </button>
          )}
        </div>
      </div>

      {/* Compare-mode hint */}
      {isCompareMode && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
          <Scale className="w-5 h-5 text-purple-600 shrink-0" />
          <p className="text-sm text-purple-800">
            Select 2-3 neighborhoods to compare side-by-side.
            <span className="font-medium"> {selectedForCompare.length}/3 selected</span>
          </p>
        </div>
      )}

      {/* Persona filters + search */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-gray-800">I&apos;m a...</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map((persona) => {
            const Icon = persona.icon;
            const isActive = selectedPersona?.id === persona.id;
            return (
              <button
                key={persona.id}
                onClick={() => setSelectedPersona(isActive ? null : persona)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-purple-100 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {persona.label}
              </button>
            );
          })}

          {(selectedPersona || searchTerm) && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        <div className="mt-3">
          <input
            type="search"
            placeholder="Search neighborhoods..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
          />
        </div>
      </div>

      {/* Results count */}
      {(selectedPersona || searchTerm) && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{filteredNeighborhoods.length} neighborhoods</span>
          {selectedPersona && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">for {selectedPersona.label}</span>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredNeighborhoods.map((neighborhood) => (
          <div key={neighborhood.id} id={`neighborhood-${neighborhood.name.replace(/\s+/g, '-').toLowerCase()}`}>
            <NeighborhoodCard
              neighborhood={neighborhood}
              cityName={cityName}
              isSelected={selectedForCompare.some((n) => n.name === neighborhood.name)}
              onToggleSelect={() => toggleCompareSelect(neighborhood)}
              isCompareMode={isCompareMode}
              onOpenDetail={setDetailNeighborhood}
              onOpenByName={openByName}
              allNeighborhoods={uniqueNeighborhoods}
              isEditorsPick={editorsPickReasons.has(neighborhood.name)}
              pickReason={editorsPickReasons.get(neighborhood.name)}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredNeighborhoods.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <div className="text-4xl mb-4">🏘️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No neighborhoods found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your filters or search</p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {showComparison && (
        <ComparisonModal neighborhoods={selectedForCompare} onClose={() => setShowComparison(false)} />
      )}

      {detailNeighborhood && (
        <NeighborhoodDetailModal
          neighborhood={detailNeighborhood}
          allNeighborhoods={uniqueNeighborhoods}
          onClose={closeDetail}
          onOpenByName={openByName}
          cityName={cityName}
        />
      )}
    </div>
  );
}
