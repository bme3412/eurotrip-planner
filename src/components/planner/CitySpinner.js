'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Train, Plane, Bus, Ship, Clock, MapPin, ArrowRight, RotateCcw } from 'lucide-react';
import { calculateEaseScores, getAllCities, getRandomCities } from '@/lib/planning/easeScoreCalculator';
import dynamic from 'next/dynamic';

// Dynamically import RouteMap to avoid SSR issues with Mapbox
const RouteMap = dynamic(() => import('./RouteMap'), { ssr: false });

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

const TRIP_STYLES = [
  { id: 'everyone', label: 'Everyone', icon: '🌍', color: 'blue' },
  { id: 'families', label: 'Families', icon: '👨‍👩‍👧', color: 'green' },
  { id: 'couples', label: 'Couples', icon: '💑', color: 'pink' },
  { id: 'solo', label: 'Solo', icon: '🎒', color: 'purple' },
  { id: 'budget', label: 'Budget', icon: '💰', color: 'amber' },
  { id: 'luxury', label: 'Luxury', icon: '✨', color: 'gold' },
];

const POPULAR_CITIES = [
  { id: 'paris', name: 'Paris', country: 'France', flag: '🇫🇷' },
  { id: 'rome', name: 'Rome', country: 'Italy', flag: '🇮🇹' },
  { id: 'barcelona', name: 'Barcelona', country: 'Spain', flag: '🇪🇸' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱' },
  { id: 'prague', name: 'Prague', country: 'Czechia', flag: '🇨🇿' },
  { id: 'dubrovnik', name: 'Dubrovnik', country: 'Croatia', flag: '🇭🇷' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', flag: '🇵🇹' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', flag: '🇩🇪' },
  { id: 'vienna', name: 'Vienna', country: 'Austria', flag: '🇦🇹' },
];

const COUNTRY_FLAGS = {
  'Spain': '🇪🇸', 'France': '🇫🇷', 'Italy': '🇮🇹', 'Germany': '🇩🇪',
  'UK': '🇬🇧', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Portugal': '🇵🇹',
  'Austria': '🇦🇹', 'Switzerland': '🇨🇭', 'Czechia': '🇨🇿', 'Poland': '🇵🇱',
  'Croatia': '🇭🇷', 'Greece': '🇬🇷', 'Hungary': '🇭🇺', 'Ireland': '🇮🇪',
  'Denmark': '🇩🇰', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Finland': '🇫🇮',
  'Slovenia': '🇸🇮', 'Slovakia': '🇸🇰', 'Romania': '🇷🇴', 'Bulgaria': '🇧🇬',
  'Serbia': '🇷🇸', 'Estonia': '🇪🇪', 'Latvia': '🇱🇻', 'Lithuania': '🇱🇹',
  'Iceland': '🇮🇸', 'Malta': '🇲🇹', 'Monaco': '🇲🇨', 'Luxembourg': '🇱🇺',
  'Montenegro': '🇲🇪', 'Albania': '🇦🇱', 'North-Macedonia': '🇲🇰',
  'Bosnia-and-Herzegovina': '🇧🇦', 'Cyprus': '🇨🇾', 'San-Marino': '🇸🇲',
};

const TRANSPORT_ICONS = { train: Train, flight: Plane, bus: Bus, ferry: Ship };

const ITEM_HEIGHT = 72;
const DRUM_HEIGHT = 280;
const CENTER_OFFSET = (DRUM_HEIGHT / 2) - (ITEM_HEIGHT / 2);

// ═══════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════

function getFlag(country) {
  return COUNTRY_FLAGS[country] || '🏳️';
}

function formatName(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function easeQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

// ═══════════════════════════════════════════════════════
// DRUM COMPONENT
// ═══════════════════════════════════════════════════════

function Drum({ index, items, targetCity, isSpinning, onSpinComplete, delay = 0 }) {
  const stripRef = useRef(null);
  const animationRef = useRef(null);
  const [winner, setWinner] = useState(null);
  const [showPlaceholder, setShowPlaceholder] = useState(true);

  // Build the drum strip with random cities and target at the end
  const drumItems = useMemo(() => {
    if (!targetCity || items.length === 0) return [];

    // Create a list of random items followed by the target
    const others = items.filter(c => c.id !== targetCity.id);
    const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 15);
    return [...shuffled, targetCity];
  }, [targetCity, items]);

  useEffect(() => {
    if (!isSpinning || !targetCity || drumItems.length === 0) return;

    setShowPlaceholder(false);
    setWinner(null);

    const strip = stripRef.current;
    if (!strip) return;

    const targetIndex = drumItems.length - 1;
    const finalY = -(targetIndex * ITEM_HEIGHT) + CENTER_OFFSET;
    const duration = 3400;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime - delay;

      if (elapsed < 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeQuint(progress);

      strip.style.transform = `translateY(${finalY * easedProgress}px)`;

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setWinner(targetCity.id);
        if (onSpinComplete) onSpinComplete(index, targetCity);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, targetCity, drumItems, delay, index, onSpinComplete]);

  // Reset when not spinning and no target
  useEffect(() => {
    if (!isSpinning && !targetCity) {
      setShowPlaceholder(true);
      setWinner(null);
      if (stripRef.current) {
        stripRef.current.style.transform = 'translateY(0)';
      }
    }
  }, [isSpinning, targetCity]);

  const bgColors = [
    'bg-red-50', 'bg-amber-50', 'bg-green-50', 'bg-blue-50',
    'bg-purple-50', 'bg-teal-50', 'bg-yellow-50', 'bg-violet-50',
  ];

  return (
    <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        Next Stop #{index + 1}
      </div>

      <div
        className={`relative w-full h-[280px] bg-slate-50 border-2 rounded-xl overflow-hidden transition-all duration-300 ${
          isSpinning ? 'border-blue-400 shadow-lg shadow-blue-400/20' : 'border-slate-200'
        } ${winner ? 'animate-pulse-border' : ''}`}
      >
        {/* Fade overlays */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none" />

        {/* Center line indicator */}
        <div className="absolute top-1/2 left-2 right-2 -translate-y-1/2 h-[72px] rounded-lg border-2 border-blue-400/20 z-[5] pointer-events-none" />

        {/* Drum strip */}
        <div
          ref={stripRef}
          className="absolute top-0 left-0 right-0"
          style={{ willChange: 'transform' }}
        >
          {drumItems.map((city, i) => (
            <div
              key={`${city.id}-${i}`}
              className={`h-[72px] flex items-center justify-center flex-col gap-1 px-3 mx-2 my-0.5 rounded-lg select-none ${
                winner === city.id
                  ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 border-2 border-emerald-400 shadow-md'
                  : bgColors[i % bgColors.length]
              }`}
            >
              <span className={`text-2xl leading-none ${winner === city.id ? 'text-3xl' : ''}`}>
                {getFlag(city.country)}
              </span>
              <span className={`text-xs font-bold text-center leading-tight ${
                winner === city.id ? 'text-emerald-800 text-sm' : 'text-slate-600'
              }`}>
                {city.name}
              </span>
            </div>
          ))}
        </div>

        {/* Placeholder */}
        {showPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center text-3xl text-slate-200 z-[1]">
            ✈️
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// INFO PANEL COMPONENT
// ═══════════════════════════════════════════════════════

function InfoPanel({ fromCity, toCity, alternatives, onSwap, visible }) {
  if (!visible || !toCity) return null;

  const { transportType, transportTime, transportFrequency, allTransport, easeScore } = toCity;

  // Calculate distance estimate (rough km based on transport time)
  const distKm = transportTime ? Math.round(parseFloat(transportTime) * 100) : '~';

  const transportOptions = [];
  if (allTransport?.train) {
    const time = allTransport.train.journeyTime;
    if (time && time !== 'N/A') {
      transportOptions.push({
        type: 'train',
        icon: '🚂',
        label: 'Train',
        time,
        note: allTransport.train.frequency
      });
    }
  }
  if (allTransport?.flight) {
    const time = allTransport.flight.approxFlightTime;
    if (time && time !== 'N/A') {
      transportOptions.push({
        type: 'flight',
        icon: '✈️',
        label: 'Fly',
        time: `${time} + airport`,
        note: allTransport.flight.frequency
      });
    }
  }
  if (allTransport?.bus) {
    const time = allTransport.bus.journeyTime;
    if (time && time !== 'N/A') {
      transportOptions.push({
        type: 'bus',
        icon: '🚌',
        label: 'Bus',
        time,
        note: allTransport.bus.frequency
      });
    }
  }
  if (allTransport?.ferry) {
    const time = allTransport.ferry.journeyTime;
    if (time && time !== 'N/A') {
      transportOptions.push({
        type: 'ferry',
        icon: '⛴️',
        label: 'Ferry',
        time,
        note: allTransport.ferry.frequency
      });
    }
  }

  // Sort by fastest (approximation)
  transportOptions.sort((a, b) => {
    const parseTime = (t) => {
      const h = t.match(/(\d+)h/);
      const m = t.match(/(\d+)m/);
      return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
    };
    return parseTime(a.time) - parseTime(b.time);
  });

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full overflow-hidden"
    >
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-2 space-y-2">
        {/* From/Distance header */}
        <div className="flex items-center text-[10px] font-semibold text-slate-400">
          <span>From <strong className="text-slate-600">{fromCity}</strong></span>
          <span className="ml-auto bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-bold">
            ~{distKm} km
          </span>
        </div>

        {/* Transport options */}
        <div className="space-y-1">
          {transportOptions.map((opt, i) => (
            <div
              key={opt.type}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] ${
                i === 0 ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-600'
              }`}
            >
              <span className="text-sm w-4 text-center">{opt.icon}</span>
              <span className="font-semibold w-10">{opt.label}</span>
              <span className="font-bold">{opt.time}</span>
              {opt.note && opt.note !== 'N/A' && (
                <span className="text-[10px] text-slate-400 ml-1">{opt.note}</span>
              )}
              {i === 0 && (
                <span className="ml-auto bg-emerald-400 text-emerald-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                  Fastest
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Alternative cities */}
        {alternatives && alternatives.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[10px] font-semibold text-slate-400">Swap:</span>
            {alternatives.slice(0, 3).map(alt => (
              <button
                key={alt.id}
                onClick={() => onSwap(alt)}
                className="inline-flex items-center gap-1 px-2 py-1 border border-slate-200 rounded-full bg-white text-[11px] font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                {getFlag(alt.country)} {alt.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function CitySpinner({ onBuildTrip }) {
  // State
  const [activeFilter, setActiveFilter] = useState('everyone');
  const [selectedCity, setSelectedCity] = useState(null);
  const [allCities, setAllCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [cityPool, setCityPool] = useState([]);
  const [tripStops, setTripStops] = useState([null, null, null]);
  const [revealedPanels, setRevealedPanels] = useState([false, false, false]);
  const [alternatives, setAlternatives] = useState([[], [], []]);

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load all cities on mount
  useEffect(() => {
    getAllCities().then(cities => {
      setAllCities(cities.map(c => ({
        ...c,
        flag: getFlag(c.country),
      })));
    });
  }, []);

  // Handle click outside search
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchQuery) return [];
    return allCities
      .filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.country.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 10);
  }, [searchQuery, allCities]);

  // Handle city selection
  const handleSelectCity = useCallback((city) => {
    setSelectedCity(city);
    setSearchQuery('');
    setIsSearchOpen(false);
    setHighlightIndex(-1);
    // Reset drums
    setTripStops([null, null, null]);
    setRevealedPanels([false, false, false]);
    setAlternatives([[], [], []]);
    setSpinCount(0);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isSearchOpen || filteredCities.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, filteredCities.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelectCity(filteredCities[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  }, [isSearchOpen, filteredCities, highlightIndex, handleSelectCity]);

  // Handle spin
  const handleSpin = useCallback(async () => {
    if (!selectedCity || isSpinning) return;

    setIsSpinning(true);
    setSpinCount(prev => prev + 1);
    setRevealedPanels([false, false, false]);

    try {
      // Load scores from anchor city
      const scores = await calculateEaseScores(selectedCity.id);
      setCityPool(scores);

      // Get 3 random cities from top 12
      const excluded = [selectedCity.id];
      const stop1 = getRandomCities(scores, 1, excluded)[0];
      excluded.push(stop1?.id);

      const stop2 = getRandomCities(scores, 1, excluded)[0];
      excluded.push(stop2?.id);

      const stop3 = getRandomCities(scores, 1, excluded)[0];

      setTripStops([stop1 || null, stop2 || null, stop3 || null]);

      // Calculate alternatives for each stop
      const alt1 = scores.filter(c => !excluded.includes(c.id) && c.id !== stop1?.id).slice(0, 3);
      const alt2 = scores.filter(c => !excluded.includes(c.id) && c.id !== stop2?.id).slice(0, 3);
      const alt3 = scores.filter(c => !excluded.includes(c.id) && c.id !== stop3?.id).slice(0, 3);
      setAlternatives([alt1, alt2, alt3]);

    } catch (error) {
      console.error('[CitySpinner] Failed to load scores:', error);
    }
  }, [selectedCity, isSpinning]);

  // Handle spin completion for each drum
  const handleSpinComplete = useCallback((index) => {
    setRevealedPanels(prev => {
      const next = [...prev];
      next[index] = true;
      return next;
    });

    // Check if all drums done
    if (index === 2) {
      setTimeout(() => setIsSpinning(false), 100);
    }
  }, []);

  // Handle swap
  const handleSwap = useCallback((drumIndex, newCity) => {
    setTripStops(prev => {
      const next = [...prev];
      next[drumIndex] = newCity;
      return next;
    });
  }, []);

  // Handle build trip
  const handleBuildTrip = useCallback(() => {
    if (!selectedCity) return;
    const cities = [selectedCity.id, ...tripStops.filter(Boolean).map(s => s.id)];
    if (onBuildTrip) {
      onBuildTrip(cities);
    } else {
      console.log('[CitySpinner] Build trip:', cities);
    }
  }, [selectedCity, tripStops, onBuildTrip]);

  const hasResults = tripStops.some(Boolean) && revealedPanels.every(Boolean);

  return (
    <div className="w-full bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-5 md:p-6">
      {/* Trip Style Filters */}
      <div className="mb-5">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Trip Style
        </div>
        <div className="flex flex-wrap gap-2">
          {TRIP_STYLES.map(style => {
            const isActive = activeFilter === style.id;
            const colorClasses = {
              blue: isActive ? 'bg-blue-500 border-blue-500 text-white shadow-blue-500/30' : '',
              green: isActive ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/30' : '',
              pink: isActive ? 'bg-pink-500 border-pink-500 text-white shadow-pink-500/30' : '',
              purple: isActive ? 'bg-purple-500 border-purple-500 text-white shadow-purple-500/30' : '',
              amber: isActive ? 'bg-amber-500 border-amber-500 text-white shadow-amber-500/30' : '',
              gold: isActive ? 'bg-amber-600 border-amber-600 text-white shadow-amber-600/30' : '',
            };

            return (
              <button
                key={style.id}
                onClick={() => setActiveFilter(style.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-[13px] font-semibold transition-all duration-200 ${
                  isActive
                    ? `${colorClasses[style.color]} shadow-lg transform scale-[1.02]`
                    : 'border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 hover:scale-[1.02] hover:shadow-md'
                }`}
              >
                <span className="text-base">{style.icon}</span>
                <span>{style.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Your starting city
        </div>
        <div className="relative" ref={dropdownRef}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(e.target.value.length > 0);
              setHighlightIndex(-1);
            }}
            onFocus={() => { if (searchQuery) setIsSearchOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Search 200+ European cities..."
            className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-xl text-slate-900 text-[15px] font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Dropdown */}
          <AnimatePresence>
            {isSearchOpen && filteredCities.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-[220px] overflow-y-auto"
              >
                {filteredCities.map((city, i) => (
                  <button
                    key={city.id}
                    onClick={() => handleSelectCity(city)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                      i === highlightIndex ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{getFlag(city.country)}</span>
                    <span className="text-sm font-medium">{city.name}</span>
                    <span className="text-xs text-slate-400 ml-auto">{city.country}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Popular Cities */}
      <div className="mb-4">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Popular picks
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_CITIES.map(city => (
            <button
              key={city.id}
              onClick={() => handleSelectCity(city)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-[13px] font-medium transition-all ${
                selectedCity?.id === city.id
                  ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-500'
              }`}
            >
              <span>{city.flag}</span>
              <span>{city.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected City Badge */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <span className="text-xl">{getFlag(selectedCity.country)}</span>
              <span className="text-sm font-semibold text-slate-700">
                {selectedCity.name}, {selectedCity.country}
              </span>
              <button
                onClick={() => {
                  setSelectedCity(null);
                  setTripStops([null, null, null]);
                  setRevealedPanels([false, false, false]);
                  searchRef.current?.focus();
                }}
                className="ml-auto text-xs font-semibold text-blue-500 hover:underline"
              >
                Change →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      <hr className="border-slate-100 my-5" />

      {/* Drums */}
      <div className="flex gap-3 mb-5">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex-1 flex flex-col items-center min-w-0">
            <Drum
              index={i}
              items={cityPool}
              targetCity={tripStops[i]}
              isSpinning={isSpinning && tripStops[i] !== null}
              onSpinComplete={handleSpinComplete}
              delay={i * 750}
            />
            <AnimatePresence>
              {revealedPanels[i] && tripStops[i] && (
                <InfoPanel
                  fromCity={i === 0 ? selectedCity?.name : tripStops[i - 1]?.name}
                  toCity={tripStops[i]}
                  alternatives={alternatives[i]}
                  onSwap={(city) => handleSwap(i, city)}
                  visible={revealedPanels[i]}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Spin Button */}
      <button
        onClick={handleSpin}
        disabled={!selectedCity || isSpinning}
        className={`w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-[15px] rounded-xl shadow-lg transition-all duration-200 ${
          selectedCity && !isSpinning
            ? 'shadow-blue-500/40 hover:shadow-xl hover:shadow-indigo-500/50 hover:-translate-y-0.5 animate-pulse-glow'
            : 'shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
        }`}
      >
        {isSpinning ? (
          <span className="flex items-center justify-center gap-2">
            <RotateCcw className="h-5 w-5 animate-spin" />
            Building your route...
          </span>
        ) : selectedCity ? (
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg">🎰</span> Spin a route from {selectedCity.name}
          </span>
        ) : (
          <span className="opacity-70">Select a city above to spin</span>
        )}
      </button>

      {/* Result Banner */}
      <AnimatePresence>
        {hasResults && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="mt-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-200 rounded-2xl px-5 py-4 shadow-lg shadow-emerald-500/10"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-2xl shadow-md">
                🗺️
              </div>
              <div className="flex-1 min-w-0">
                <div className="sparkle-container text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">
                  Your Route
                  <span className="sparkle-1">✦</span>
                  <span className="sparkle-2">✦</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-white border border-emerald-200 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
                    {getFlag(selectedCity?.country)} {selectedCity?.name}
                  </span>
                  {tripStops.filter(Boolean).map((stop, i) => (
                    <span key={stop.id} className="flex items-center gap-2">
                      <span className="text-emerald-400">→</span>
                      <span className="inline-flex items-center gap-1.5 bg-white border border-emerald-200 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
                        {getFlag(stop.country)} {stop.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Route Map */}
            <div className="mt-4">
              <RouteMap
                cities={[
                  selectedCity,
                  ...tripStops.filter(Boolean)
                ]}
              />
            </div>

            {/* Build Trip Button */}
            <button
              onClick={handleBuildTrip}
              className="mt-4 w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              Build This Trip
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
