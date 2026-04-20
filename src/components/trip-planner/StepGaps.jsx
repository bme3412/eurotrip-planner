'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { getSuggestionsForGap, enrichSuggestionsWithDateScores } from '@/lib/planning/gapSuggester';
import {
  Train,
  Plane,
  Bus,
  Ship,
  Zap,
  Clock,
  Route,
  Sun,
  Users,
  Ticket,
  Star,
} from './icons';
import FilterChip, { FilterChipGroup } from './FilterChip';
import CityDetailModal from './CityDetailModal';
import InterestFilterChips, { INTEREST_OPTIONS } from './InterestFilterChips';
import RemainingDaysBar from './RemainingDaysBar';
import DayAllocationControls from './DayAllocationControls';
import RouteValidationPanel from './RouteValidationPanel';
import AIRouteSuggester from './AIRouteSuggester';

// Transport type icons and labels
const TRANSPORT_TYPES = {
  all: { label: 'All', Icon: null },
  train: { label: 'Train', Icon: Train },
  flight: { label: 'Flight', Icon: Plane },
  bus: { label: 'Bus', Icon: Bus },
};

// Travel time filter options (in minutes)
const TIME_FILTERS = {
  quick: { label: '<2h', max: 120 },
  medium: { label: '2-4h', min: 120, max: 240 },
  long: { label: '4h+', min: 240 },
};

// Group cities by travel time bucket
function groupByTravelTime(cities) {
  return {
    quick: cities.filter(c => c.travelMinutes < 120),
    medium: cities.filter(c => c.travelMinutes >= 120 && c.travelMinutes < 240),
    long: cities.filter(c => c.travelMinutes >= 240),
  };
}

// Time filter config with icons
const TIME_FILTER_CONFIG = {
  quick: { label: '<2h', Icon: Zap },
  medium: { label: '2-4h', Icon: Clock },
  long: { label: '4h+', Icon: Route },
};

/**
 * Filter chips component - using unified FilterChip with gold colors
 */
function FilterChips({
  transportFilter,
  setTransportFilter,
  timeFilters,
  setTimeFilters,
  interestFilters,
  setInterestFilters,
  userPreferences,
}) {
  const toggleTimeFilter = (key) => {
    setTimeFilters(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleInterestFilter = (id) => {
    setInterestFilters(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="space-y-3 px-4 py-3 bg-[#faf8f5] border-b border-[#e5e0d8]">
      {/* Interest filters row */}
      <InterestFilterChips
        activeFilters={interestFilters}
        userPreferences={userPreferences}
        onToggle={toggleInterestFilter}
      />

      {/* Transport type row */}
      <FilterChipGroup label="Transport">
        {Object.entries(TRANSPORT_TYPES).map(([key, { label, Icon }]) => (
          <FilterChip
            key={key}
            label={label}
            icon={Icon}
            isActive={transportFilter === key}
            onClick={() => setTransportFilter(key)}
          />
        ))}
      </FilterChipGroup>

      {/* Travel time row - multi-select with gold color */}
      <FilterChipGroup label="Travel Time">
        {Object.entries(TIME_FILTER_CONFIG).map(([key, { label, Icon }]) => (
          <FilterChip
            key={key}
            label={label}
            icon={Icon}
            isActive={timeFilters[key]}
            onClick={() => toggleTimeFilter(key)}
            multiSelect
          />
        ))}
      </FilterChipGroup>
    </div>
  );
}

/**
 * Grouped city list with show more
 */
function GroupedCityList({
  groupKey,
  groupLabel,
  GroupIcon,
  cities,
  hoveredSuggestion,
  onPreview,
  onHover,
  defaultVisible = 5,
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleCities = expanded ? cities : cities.slice(0, defaultVisible);
  const hasMore = cities.length > defaultVisible;

  if (cities.length === 0) return null;

  return (
    <div className="mb-4 last:mb-0">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-5 h-5 rounded flex items-center justify-center bg-[#f5f3f0]">
          {GroupIcon && <GroupIcon className="w-3.5 h-3.5 text-[#a08545]" />}
        </div>
        <span className="text-xs font-medium text-[#6a6459]">{groupLabel}</span>
        <span className="text-[10px] text-[#8a8578]">· {cities.length} options</span>
      </div>

      {/* City list */}
      <div className="space-y-2 px-3">
        {visibleCities.map((city) => (
          <CityListItem
            key={city.id}
            city={city}
            isHovered={hoveredSuggestion?.id === city.id}
            onPreview={onPreview}
            onHover={onHover}
          />
        ))}
      </div>

      {/* Show more button */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center py-2 text-xs text-[#a08545] hover:text-[#c9a227] transition-colors"
        >
          {expanded ? 'Show less' : `Show ${cities.length - defaultVisible} more...`}
        </button>
      )}
    </div>
  );
}

function formatShortDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Filled gap display - compact card showing selection
 */
function FilledGapCard({ gap, selection, onClear }) {
  return (
    <div className="p-4 rounded-xl bg-[#f0f7f4] border border-[#4a7c59]/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#4a7c59]/15 flex items-center justify-center">
            <Check className="w-4 h-4 text-[#4a7c59]" />
          </div>
          <div>
            <div
              className="font-light text-[#2a2520] text-base"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {selection.cityName}
            </div>
            <div className="text-xs text-[#6a6459]">
              {selection.days} days • {selection.transportTime}
              {gap.previousCityName ? ` from ${gap.previousCityName}` : gap.nextCityName ? ` to ${gap.nextCityName}` : ''}
            </div>
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-[#6a6459] hover:text-[#a08545] transition-colors"
        >
          Change
        </button>
      </div>
    </div>
  );
}

// Map transport type to lucide icon component
const TRANSPORT_ICON_MAP = {
  train: Train,
  flight: Plane,
  bus: Bus,
  ferry: Ship,
};

/**
 * City list item for suggestions - now with thumbnail and preview
 */
function CityListItem({ city, isHovered, onPreview, onHover }) {
  const [imgError, setImgError] = useState(false);
  const dateScore = city.dateScore;

  // Get transport icon component
  const TransportIcon = TRANSPORT_ICON_MAP[city.transportType?.toLowerCase()] || Train;

  // Determine thumbnail source with fallback
  const thumbnailSrc = imgError
    ? '/images/city-placeholder.svg'
    : city.thumbnail || `/images/city-thumbnail/${city.country?.replace(/\s+/g, '-')}/${city.id}-thumbnail.jpeg`;

  return (
    <button
      onClick={() => onPreview(city)}
      onMouseEnter={() => onHover?.(city)}
      onMouseLeave={() => onHover?.(null)}
      className={`
        w-full p-3 rounded-xl border transition-all text-left group
        ${isHovered
          ? 'bg-[#faf6eb] border-[#c9a227]/50'
          : 'bg-white hover:bg-[#faf6eb] border-[#e5e0d8] hover:border-[#c9a227]/40'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#f5f3f0]">
          <Image
            src={thumbnailSrc}
            alt={city.name}
            fill
            className="object-cover"
            onError={() => setImgError(true)}
            sizes="48px"
          />
          {/* Score badge overlay */}
          {city.score >= 75 && (
            <div className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded bg-[#c9a227] flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">{city.score}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-light text-[#2a2520]"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {city.name}
                </span>
                {city.score >= 80 && (
                  <Star className="w-3 h-3 text-[#c9a227]" fill="currentColor" />
                )}
              </div>
              <div className="text-[10px] text-[#8a8578]">{city.country}</div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-[10px] text-[#6a6459]">
                <TransportIcon className="w-3 h-3" />
                {city.transportTime}
              </div>
              {city.endCityConnection && (
                <div className="text-[10px] text-[#8a8578]">
                  → {Math.round(city.endCityConnection.travelMinutes / 60)}h to end
                </div>
              )}
              <div className="text-[10px] text-[#a08545]">
                {city.recommendedDays}d rec
              </div>
            </div>
          </div>

          {/* Short tagline or weather/event */}
          {(city.shortTagline || dateScore) && (
            <div className="flex items-center gap-2 mt-1.5 text-[10px]">
              {city.shortTagline && !dateScore?.events && (
                <span className="text-[#6a6459] italic truncate">
                  {city.shortTagline}
                </span>
              )}
              {dateScore?.weather && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  dateScore.weather.color === 'green' ? 'bg-[#f0f7f4] text-[#4a7c59]' :
                  dateScore.weather.color === 'amber' ? 'bg-[#fef7e6] text-[#a08545]' :
                  'bg-[#fef2f2] text-[#991b1b]'
                }`}>
                  <Sun className="w-3 h-3" />
                  {dateScore.weather.label}
                </span>
              )}
              {dateScore?.events && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0f0ff] text-[#5b5b9d] truncate">
                  <Ticket className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{dateScore.events.name?.slice(0, 20) || 'Event'}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * Single gap card with city list (no embedded map)
 */
function GapCard({
  gap,
  selection,
  allSelections,
  preferences,
  onFillGap,
  onClearGap,
  onUpdateSelection,
  onSuggestionsLoaded,
  hoveredSuggestion,
  onHoverSuggestion,
  remainingDays,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [previewCity, setPreviewCity] = useState(null);

  // Filter state - default to showing all time ranges
  const [transportFilter, setTransportFilter] = useState('all');
  const [timeFilters, setTimeFilters] = useState({ quick: true, medium: true, long: true });
  const [interestFilters, setInterestFilters] = useState([]);

  const previousCity = gap.previousCity || null;
  const nextCity = gap.nextCity || null;
  const hasConnectedCity = previousCity || nextCity;

  // Check if user has interests selected (for Best for You group)
  const hasInterests = preferences?.interests?.length > 0;

  const loadSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      // First, load basic suggestions (fast)
      const results = await getSuggestionsForGap({
        fromCity: previousCity,
        toCity: nextCity,
        gapStart: gap.startDate,
        gapEnd: gap.endDate,
        preferences, // Pass preferences for interest/pace scoring
      });
      setSuggestions(results);
      // Report suggestions to parent for the unified map
      onSuggestionsLoaded?.(results);

      // Then, enrich with date scores asynchronously (slower, but progressive)
      enrichSuggestionsWithDateScores(results, gap.startDate, gap.endDate)
        .then(enriched => {
          setSuggestions(enriched);
          onSuggestionsLoaded?.(enriched);
        })
        .catch(err => console.warn('[StepGaps] Date enrichment failed:', err));
    } catch (error) {
      console.error('[StepGaps] Failed to load suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [previousCity, nextCity, gap.startDate, gap.endDate, preferences, onSuggestionsLoaded]);

  useEffect(() => {
    if (hasConnectedCity && !selection) {
      loadSuggestions();
    }
  }, [hasConnectedCity, selection, loadSuggestions]);

  // Apply filters to suggestions
  const filteredSuggestions = useMemo(() => {
    const filtered = suggestions.filter(city => {
      // Transport filter
      if (transportFilter !== 'all' && city.transportType !== transportFilter) {
        return false;
      }

      // Interest filter - if any interests selected, city must match at least one
      if (interestFilters.length > 0) {
        const cityInterests = city.interestMatches || [];
        const hasMatch = interestFilters.some(interest => cityInterests.includes(interest));
        if (!hasMatch) return false;
      }

      // Time filter - any selected bucket matches
      const anyTimeSelected = timeFilters.quick || timeFilters.medium || timeFilters.long;
      if (!anyTimeSelected) return true; // If nothing selected, show all

      const minutes = city.travelMinutes || 0;
      if (timeFilters.quick && minutes < 120) return true;
      if (timeFilters.medium && minutes >= 120 && minutes < 240) return true;
      if (timeFilters.long && minutes >= 240) return true;

      return false;
    });

    // Safeguard: if filtering results in zero matches, show all suggestions
    // This prevents confusing "no matches" when there are valid suggestions
    return filtered.length > 0 ? filtered : suggestions;
  }, [suggestions, transportFilter, timeFilters, interestFilters]);

  // Group filtered suggestions by travel time, with optional "Best for You" group
  const groupedSuggestions = useMemo(() => {
    const timeGroups = groupByTravelTime(filteredSuggestions);

    // If user has interests, create a "Best for You" group with matching cities
    if (hasInterests) {
      const bestForYou = filteredSuggestions
        .filter(city => city.hasInterestMatch)
        .slice(0, 5); // Top 5 matches

      return {
        bestForYou,
        ...timeGroups,
      };
    }

    return timeGroups;
  }, [filteredSuggestions, hasInterests]);

  // Update parent with filtered suggestions for map display
  useEffect(() => {
    if (filteredSuggestions.length > 0) {
      onSuggestionsLoaded?.(filteredSuggestions);
    }
  }, [filteredSuggestions, onSuggestionsLoaded]);

  // Open modal to preview city details
  const handlePreview = (city) => {
    setPreviewCity(city);
  };

  // Actually select the city (called from modal)
  const handleSelect = (city) => {
    onFillGap(gap.id, {
      city: city.id,
      cityName: city.name,
      country: city.country,
      days: city.recommendedDays,
      transportTime: city.transportTime,
      transportType: city.transportType,
    });
    setPreviewCity(null);
  };

  // If already filled, show compact card
  if (selection) {
    return (
      <FilledGapCard
        gap={gap}
        selection={selection}
        onClear={() => onClearGap(gap.id)}
      />
    );
  }

  return (
    <div className="rounded-xl bg-[#faf8f5] border border-[#e5e0d8] overflow-hidden">
      {/* Gap header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f5f3f0] transition-colors"
      >
        <div className="text-left">
          <div
            className="text-base font-light text-[#2a2520]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {gap.days} days to fill
          </div>
          <div className="text-xs text-[#8a8578] mt-0.5">
            {formatShortDate(gap.startDate)} – {formatShortDate(gap.endDate)}
            {gap.previousCityName ? (
              <span className="ml-1">• after {gap.previousCityName}</span>
            ) : gap.nextCityName ? (
              <span className="ml-1">• before {gap.nextCityName}</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {suggestions.length > 0 && (
            <span className="text-xs text-[#a08545]">
              {filteredSuggestions.length}/{suggestions.length} shown
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#8a8578]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8a8578]" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-12 border-t border-[#e5e0d8]">
                <div className="w-5 h-5 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
                <span className="ml-3 text-sm text-[#6a6459]">Finding destinations...</span>
              </div>
            )}

            {/* No connected city */}
            {!isLoading && !hasConnectedCity && (
              <div className="text-center py-10 border-t border-[#e5e0d8]">
                <div className="text-[#8a8578] text-sm font-light">
                  Add an anchor city first to get suggestions
                </div>
              </div>
            )}

            {/* No suggestions found */}
            {!isLoading && hasConnectedCity && suggestions.length === 0 && (
              <div className="text-center py-10 border-t border-[#e5e0d8]">
                <div className="text-[#8a8578] text-sm font-light">
                  No direct connections found. Try a different anchor.
                </div>
              </div>
            )}

            {/* Filter chips + grouped city list */}
            {!isLoading && suggestions.length > 0 && (
              <>
                {/* Filter chips */}
                <FilterChips
                  transportFilter={transportFilter}
                  setTransportFilter={setTransportFilter}
                  timeFilters={timeFilters}
                  setTimeFilters={setTimeFilters}
                  interestFilters={interestFilters}
                  setInterestFilters={setInterestFilters}
                  userPreferences={preferences?.interests || []}
                />

                {/* Grouped city lists */}
                <div className="max-h-[400px] overflow-y-auto py-3">
                  {filteredSuggestions.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-[#8a8578] text-sm font-light">
                        No matches for current filters
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Best for You group - shown when user has interests */}
                      {groupedSuggestions.bestForYou?.length > 0 && (
                        <GroupedCityList
                          groupKey="bestForYou"
                          groupLabel="Best for You"
                          GroupIcon={Star}
                          cities={groupedSuggestions.bestForYou}
                          hoveredSuggestion={hoveredSuggestion}
                          onPreview={handlePreview}
                          onHover={onHoverSuggestion}
                          defaultVisible={5}
                        />
                      )}
                      <GroupedCityList
                        groupKey="quick"
                        groupLabel="Quick"
                        GroupIcon={Zap}
                        cities={groupedSuggestions.quick}
                        hoveredSuggestion={hoveredSuggestion}
                        onPreview={handlePreview}
                        onHover={onHoverSuggestion}
                      />
                      <GroupedCityList
                        groupKey="medium"
                        groupLabel="Medium"
                        GroupIcon={Clock}
                        cities={groupedSuggestions.medium}
                        hoveredSuggestion={hoveredSuggestion}
                        onPreview={handlePreview}
                        onHover={onHoverSuggestion}
                      />
                      <GroupedCityList
                        groupKey="long"
                        groupLabel="Further"
                        GroupIcon={Route}
                        cities={groupedSuggestions.long}
                        hoveredSuggestion={hoveredSuggestion}
                        onPreview={handlePreview}
                        onHover={onHoverSuggestion}
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* City detail modal */}
      <CityDetailModal
        city={previewCity}
        isOpen={!!previewCity}
        onClose={() => setPreviewCity(null)}
        onSelect={handleSelect}
        gapStart={gap.startDate}
        gapEnd={gap.endDate}
      />
    </div>
  );
}

/**
 * View mode toggle component
 */
function ViewModeToggle({ viewMode, onChangeMode }) {
  return (
    <div className="flex rounded-lg border border-[#e5e0d8] bg-[#faf8f5] p-1 gap-1">
      <button
        onClick={() => onChangeMode('browse')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-light transition-all ${
          viewMode === 'browse'
            ? 'bg-white text-[#2a2520] shadow-sm'
            : 'text-[#6a6459] hover:text-[#2a2520]'
        }`}
      >
        <MapPin className="w-4 h-4" />
        Browse Cities
      </button>
      <button
        onClick={() => onChangeMode('ai')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-light transition-all ${
          viewMode === 'ai'
            ? 'bg-white text-[#2a2520] shadow-sm'
            : 'text-[#6a6459] hover:text-[#2a2520]'
        }`}
      >
        <Star className="w-4 h-4" />
        AI Suggest
      </button>
    </div>
  );
}

/**
 * CurrentRouteCard - Shows a city in the current route
 */
function CurrentRouteCard({ city, days, label, isRemovable, onRemove }) {
  return (
    <div className="flex-shrink-0 w-[180px] p-4 bg-white rounded-xl border border-[#e5e0d8] shadow-sm">
      <div className="text-[9px] font-semibold text-[#8a8578] uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-4 h-4 text-[#a08545]" />
        <span className="font-medium text-[#2a2520]">{city.name || city.cityName}</span>
      </div>
      <div className="text-xs text-[#6a6459]">{days} days</div>
      {isRemovable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 text-xs text-[#a5a098] hover:text-[#991b1b]"
        >
          Remove
        </button>
      )}
    </div>
  );
}

/**
 * CurrentRouteDisplay - Shows the full current route as cards
 */
function CurrentRouteDisplay({ startCity, endCity, intermediateStops, startCityDays, endCityDays, onRemoveStop }) {
  if (!startCity) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Route className="w-4 h-4 text-[#a08545]" />
        <span className="text-sm font-medium text-[#2a2520]">Your Current Route</span>
        <span className="text-xs text-[#8a8578]">
          ({1 + (intermediateStops?.length || 0) + (endCity ? 1 : 0)} cities)
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {/* Start City */}
        <CurrentRouteCard
          city={startCity}
          days={startCityDays?.length || 0}
          label="Start"
        />

        {/* Intermediate Stops */}
        {intermediateStops?.map((stop, idx) => (
          <CurrentRouteCard
            key={stop.id}
            city={stop.city}
            days={stop.days?.length || 0}
            label={`Stop ${idx + 1}`}
            isRemovable
            onRemove={() => onRemoveStop?.(stop.id)}
          />
        ))}

        {/* End City */}
        {endCity && (
          <CurrentRouteCard
            city={endCity}
            days={endCityDays?.length || 0}
            label="End"
          />
        )}
      </div>
    </div>
  );
}

/**
 * StepGaps - Main component for filling gaps in the trip
 */
export default function StepGaps({
  gaps,
  gapSelections,
  anchors,
  preferences,
  onFillGap,
  onClearGap,
  onUpdateSelection,
  onAcceptAIRoute,
  onSuggestionsLoaded,
  hoveredSuggestion,
  onHoverSuggestion,
  startCity,
  endCity,
  intermediateStops = [],
  startCityDays = [],
  endCityDays = [],
  tripDates,
  onRemoveStop,
  onOptimizeRoute,
}) {
  const [viewMode, setViewMode] = useState('browse'); // 'browse' | 'ai'

  // Calculate total gap days and selections for remaining days bar
  const totalGapDays = gaps.reduce((sum, gap) => sum + gap.days, 0);
  const selections = Object.values(gapSelections || {});

  // Handle AI route acceptance
  const handleAcceptAIRoute = (route) => {
    // Convert AI route format to gapSelections format
    route.cities.forEach((city, idx) => {
      onFillGap(gaps[0]?.id || 'main-gap', {
        city: city.cityId || city.id,
        cityName: city.cityName || city.name,
        country: city.country,
        days: city.days,
        transportTime: city.transportTime,
        transportType: city.transportType,
      });
    });
    // Switch back to browse mode to show results
    setViewMode('browse');
  };

  // Check if there are any stops at all (including intermediate from Step 1)
  const hasIntermediateStops = intermediateStops.length > 0;
  const hasGapSelections = selections.length > 0;
  const hasAnyStops = hasIntermediateStops || hasGapSelections;

  // Combine all stops for route validation
  const allStopsForValidation = useMemo(() => {
    const combined = [];

    // Add intermediate stops from Step 1
    intermediateStops.forEach(stop => {
      combined.push({
        city: stop.city?.id || stop.id,
        cityName: stop.city?.name || stop.cityName,
        country: stop.city?.country || stop.country,
        days: stop.days?.length || stop.days || 0,
      });
    });

    // Add gap selections
    selections.forEach(sel => {
      combined.push({
        city: sel.city,
        cityName: sel.cityName,
        country: sel.country,
        days: sel.days,
      });
    });

    return combined;
  }, [intermediateStops, selections]);

  return (
    <div className="space-y-4">
      {/* Current Route - always show if there's a start city */}
      <CurrentRouteDisplay
        startCity={startCity}
        endCity={endCity}
        intermediateStops={intermediateStops}
        startCityDays={startCityDays}
        endCityDays={endCityDays}
        onRemoveStop={onRemoveStop}
      />

      {/* View mode toggle - only show if there are gaps to fill */}
      {gaps.length > 0 && (
        <ViewModeToggle viewMode={viewMode} onChangeMode={setViewMode} />
      )}

      {/* Remaining days bar - shows allocation progress */}
      {totalGapDays > 0 && (
        <RemainingDaysBar
          totalDays={totalGapDays}
          selections={selections}
          startCityName={startCity?.name}
          endCityName={endCity?.name}
        />
      )}

      {/* Route Validation Panel - shows when there are stops */}
      {hasAnyStops && startCity && endCity && (
        <RouteValidationPanel
          stops={allStopsForValidation}
          startCity={startCity}
          endCity={endCity}
          onOptimize={onOptimizeRoute}
        />
      )}

      {/* AI Suggest Mode */}
      {viewMode === 'ai' && startCity && endCity && gaps.length > 0 && (
        <AIRouteSuggester
          startCity={startCity}
          endCity={endCity}
          gapDays={totalGapDays}
          gapStart={gaps[0].startDate}
          gapEnd={gaps[0].endDate}
          preferences={preferences}
          onAcceptRoute={handleAcceptAIRoute}
          onBack={() => setViewMode('browse')}
        />
      )}

      {/* Browse Mode - Gap cards */}
      {viewMode === 'browse' && gaps.length > 0 && (
        <>
          <div className="space-y-4">
            {gaps.map((gap, index) => (
              <GapCard
                key={gap.id}
                gap={gap}
                selection={gapSelections[gap.id]}
                allSelections={gapSelections}
                preferences={preferences}
                onFillGap={onFillGap}
                onClearGap={onClearGap}
                onUpdateSelection={onUpdateSelection}
                onSuggestionsLoaded={index === 0 ? onSuggestionsLoaded : undefined}
                hoveredSuggestion={hoveredSuggestion}
                onHoverSuggestion={onHoverSuggestion}
                remainingDays={totalGapDays - selections.reduce((sum, s) => sum + (s.days || 0), 0)}
              />
            ))}
          </div>

        </>
      )}
    </div>
  );
}
