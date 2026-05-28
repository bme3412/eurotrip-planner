'use client';
import { CITY_SEASONAL_NARRATIVES, DEFAULT_SEASONAL_NARRATIVE } from "./_data/seasonalNarratives";
import React, { useState, useEffect, useMemo } from 'react';
import { getCityDisplayName, getCityNickname, getCityDescription } from '@/utils/cityDataUtils';
import { Chip } from '@/components/common/Primitives';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Sun, Snowflake, Umbrella, Heart, Medal, ChevronLeft, ChevronRight, Clock, MapPin, CalendarDays, Wand2, Bookmark, Plus, Eye, Sunrise, Sunset, X, Check, ExternalLink } from 'lucide-react';
import { fetchCityDataUrl, getCityPaths } from '@/lib/city-data';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const RATING_COLORS = {
  5: '#10b981',
  4: '#34d399',
  3: '#fbbf24',
  2: '#fb923c',
  1: '#ef4444'
};

const RATING_LABELS = {
  5: 'Excellent',
  4: 'Good',
  3: 'Average',
  2: 'Below Avg',
  1: 'Avoid'
};

const TRAVELER_LABELS = {
  all: 'Everyone',
  families: 'Families',
  couples: 'Couples',
  solo: 'Solo travelers',
  budget: 'Budget travelers',
  luxury: 'Luxury travelers'
};

const mostFrequent = (items) => {
  const counts = items.filter(Boolean).reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
};

const formatMonthList = (months, fallback = 'See calendar') => {
  if (!months?.length) return fallback;
  return months.slice(0, 2).join(' / ');
};

const getSeasonalNeighborhoods = (cityName) => {
  const cityKey = cityName?.toLowerCase() || '';
  if (cityKey.includes('paris')) {
    return [
      { season: 'Spring', neighborhood: 'Saint-Germain + Luxembourg Gardens', reason: 'cafe terraces, garden blooms, and easy museum pairing' },
      { season: 'Summer', neighborhood: 'Canal Saint-Martin + the Seine', reason: 'waterside evenings, picnics, and open-air pop-ups' },
      { season: 'Fall', neighborhood: 'Le Marais + covered passages', reason: 'gallery hopping, boutiques, and rain-friendly wandering' },
      { season: 'Winter', neighborhood: 'Montmartre + Palais-Royal', reason: 'cozy bistros, holiday lights, and atmospheric walks' }
    ];
  }

  return [
    { season: 'Spring', neighborhood: 'Historic center', reason: 'best balance of walking weather and classic sights' },
    { season: 'Summer', neighborhood: 'Parks + waterfront areas', reason: 'long evenings and outdoor dining' },
    { season: 'Fall', neighborhood: 'Museum districts', reason: 'culture-heavy days when weather turns mixed' },
    { season: 'Winter', neighborhood: 'Old town + covered markets', reason: 'cozy indoor stops and seasonal food' }
  ];
};

const CityOverview = ({ overview, cityName, visitCalendar, monthlyData, hideIntroHero = false, onOpenMonthlyGuide }) => {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [activeTier, setActiveTier] = useState('All');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [thingsToDo, setThingsToDo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [overviewParagraph, setOverviewParagraph] = useState(null);
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState(null);
  const [travelerTypeFilter, setTravelerTypeFilter] = useState('all');
  const [hoveredModalDay, setHoveredModalDay] = useState(null);
  const [compareMonths, setCompareMonths] = useState(['April', 'September']);
  const [tripFit, setTripFit] = useState({
    traveler: 'couples',
    budget: 'mid',
    crowd: 'balanced'
  });
  const cityPaths = useMemo(() => getCityPaths(overview?.country, cityName), [overview?.country, cityName]);
  
  // Quick View Modal state
  const [quickViewItem, setQuickViewItem] = useState(null);
  
  // Favorites state
  const [favorites, setFavorites] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`favorites-${cityName}`);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse favorites', e);
      }
    }
  }, [cityName]);
  
  // Save favorites to localStorage
  const toggleFavorite = (item) => {
    const itemId = item.activity || item.title || item.name;
    const isFavorite = favorites.some(f => (f.activity || f.title || f.name) === itemId);
    
    let newFavorites;
    if (isFavorite) {
      newFavorites = favorites.filter(f => (f.activity || f.title || f.name) !== itemId);
      showToast(`Removed "${itemId}" from favorites`);
    } else {
      newFavorites = [...favorites, item];
      showToast(`Saved "${itemId}" to favorites`);
    }
    
    setFavorites(newFavorites);
    localStorage.setItem(`favorites-${cityName}`, JSON.stringify(newFavorites));
  };
  
  const isFavorite = (item) => {
    const itemId = item.activity || item.title || item.name;
    return favorites.some(f => (f.activity || f.title || f.name) === itemId);
  };
  
  // Toast notification
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add click outside handler to close tooltip
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeTooltip && !event.target.closest('.day-cell')) {
        setActiveTooltip(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeTooltip]);
  // Get dynamic city information
  const displayName = getCityDisplayName({ overview }, cityName);
  const nickname = getCityNickname({ overview });
  const description = getCityDescription({ overview }, cityName);
  
  // Get city icon based on name
  const getCityIcon = (cityName) => {
    const cityNameLower = cityName.toLowerCase();
    
    if (cityNameLower.includes('paris')) return "✨";
    if (cityNameLower.includes('rome')) return "🏛️";
    if (cityNameLower.includes('barcelona')) return "🏰";
    if (cityNameLower.includes('amsterdam')) return "🚲";
    if (cityNameLower.includes('berlin')) return "🕊️";
    if (cityNameLower.includes('venice')) return "🛶";
    if (cityNameLower.includes('lisbon')) return "🌅";
    if (cityNameLower.includes('pamplona')) return "🐂";
    if (cityNameLower.includes('reykjavik')) return "🌌";
    
    return "✨";
  };

  const cityIcon = getCityIcon(cityName);
  
  // Check if things-to-do data is already in monthlyData (from SSR), otherwise fetch
  useEffect(() => {
    // Already have it from SSR?
    if (monthlyData?.['things-to-do']?.categories) {
      setThingsToDo(monthlyData['things-to-do']);
      return;
    }
    // Fallback: fetch if not in monthlyData
    const loadThingsToDo = async () => {
      try {
        const url = cityPaths.monthlyThingsToDo;
        const json = await fetchCityDataUrl(url, { cache: 'force-cache' });
        if (json && Array.isArray(json.categories)) {
          setThingsToDo(json);
        }
      } catch (_) {
        // ignore and use fallback
      }
    };
    loadThingsToDo();
  }, [cityPaths.monthlyThingsToDo, monthlyData]);

  // Check if taglines data is already in monthlyData (from SSR), otherwise fetch
  useEffect(() => {
    // Already have it from SSR?
    const taglines = monthlyData?.['monthly-taglines'] || monthlyData?.['taglines'];
    if (taglines?.overview_paragraph) {
      setOverviewParagraph(taglines.overview_paragraph);
      return;
    }
    // Fallback: fetch if not in monthlyData
    const loadOverviewParagraph = async () => {
      try {
        const url = cityPaths.monthlyTaglines;
        const json = await fetchCityDataUrl(url, { cache: 'force-cache' });
        if (json && typeof json.overview_paragraph === 'string') {
          setOverviewParagraph(json.overview_paragraph);
        }
      } catch (_) {}
    };
    loadOverviewParagraph();
  }, [cityPaths.monthlyTaglines, monthlyData]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTier, showFreeOnly]);

  const renderPaginationControls = (localPage, totalItems) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (localPage - 1) * pageSize + 1;
    const end = Math.min(totalItems, localPage * pageSize);

    const makePageBtn = (p) => (
      <button
        key={`p-${p}`}
        onClick={() => setCurrentPage(p)}
        className={`px-3 py-1.5 text-sm rounded-md border ${p === localPage ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
        aria-current={p === localPage ? 'page' : undefined}
      >
        {p}
      </button>
    );

    const pageButtons = () => {
      const buttons = [];
      const windowSize = 5;
      const first = 1;
      const last = totalPages;
      const startPage = Math.max(first, localPage - 2);
      const endPage = Math.min(last, startPage + windowSize - 1);
      if (startPage > first) {
        buttons.push(makePageBtn(first));
        if (startPage > first + 1) buttons.push(<span key="dots-start" className="px-1 text-gray-400">…</span>);
      }
      for (let p = startPage; p <= endPage; p++) buttons.push(makePageBtn(p));
      if (endPage < last) {
        if (endPage < last - 1) buttons.push(<span key="dots-end" className="px-1 text-gray-400">…</span>);
        buttons.push(makePageBtn(last));
      }
      return buttons;
    };

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-sm text-gray-600">Showing {start}-{end} of {totalItems}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, localPage - 1))}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            disabled={localPage === 1}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          {pageButtons()}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, localPage + 1))}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            disabled={localPage === totalPages}
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="ml-2 text-sm border-gray-300 rounded-md"
          >
            <option value={6}>6 / page</option>
            <option value={9}>9 / page</option>
            <option value={12}>12 / page</option>
          </select>
        </div>
      </div>
    );
  };

  // Visual style helpers for stronger, punchier UI
  const TONE_STYLES = {
    emerald: {
      headerBg: 'bg-gradient-to-br from-blue-100 to-blue-200',
      accentBar: 'bg-gradient-to-r from-blue-500 via-blue-500 to-blue-600',
      ring: 'ring-blue-200',
      labelBg: 'bg-emerald-50',
      labelText: 'text-emerald-700',
      labelBorder: 'border-emerald-200',
      chipSoft: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
      chipSolid: 'bg-blue-700 text-white border-blue-700',
      icon: 'text-blue-600'
    },
    amber: {
      headerBg: 'bg-gradient-to-br from-blue-100 to-blue-200',
      accentBar: 'bg-gradient-to-r from-blue-500 via-blue-500 to-blue-600',
      ring: 'ring-blue-200',
      labelBg: 'bg-amber-50',
      labelText: 'text-amber-700',
      labelBorder: 'border-amber-200',
      chipSoft: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
      chipSolid: 'bg-blue-700 text-white border-blue-700',
      icon: 'text-blue-600'
    },
    sky: {
      headerBg: 'bg-gradient-to-br from-blue-100 to-blue-200',
      accentBar: 'bg-gradient-to-r from-blue-500 via-blue-500 to-blue-600',
      ring: 'ring-blue-200',
      labelBg: 'bg-sky-50',
      labelText: 'text-sky-700',
      labelBorder: 'border-sky-200',
      chipSoft: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
      chipSolid: 'bg-blue-700 text-white border-blue-700',
      icon: 'text-blue-600'
    },
    indigo: {
      headerBg: 'bg-gradient-to-br from-blue-100 to-blue-200',
      accentBar: 'bg-gradient-to-r from-blue-500 via-blue-500 to-blue-600',
      ring: 'ring-blue-200',
      labelBg: 'bg-indigo-50',
      labelText: 'text-indigo-700',
      labelBorder: 'border-indigo-200',
      chipSoft: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
      chipSolid: 'bg-blue-700 text-white border-blue-700',
      icon: 'text-blue-600'
    },
    rose: {
      headerBg: 'bg-gradient-to-br from-blue-100 to-blue-200',
      accentBar: 'bg-gradient-to-r from-blue-500 via-blue-500 to-blue-600',
      ring: 'ring-blue-200',
      labelBg: 'bg-rose-50',
      labelText: 'text-rose-700',
      labelBorder: 'border-rose-200',
      chipSoft: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
      chipSolid: 'bg-blue-700 text-white border-blue-700',
      icon: 'text-blue-600'
    },
    gray: {
      headerBg: 'bg-gradient-to-br from-blue-100 to-blue-200',
      accentBar: 'bg-gradient-to-r from-blue-500 via-blue-500 to-blue-600',
      ring: 'ring-blue-200',
      labelBg: 'bg-gray-50',
      labelText: 'text-gray-700',
      labelBorder: 'border-gray-200',
      chipSoft: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
      chipSolid: 'bg-blue-700 text-white border-blue-700',
      icon: 'text-blue-600'
    }
  };

  const TIER_META = {
    'Must Do': { tone: 'emerald', Icon: Medal },
    'Best in Summer': { tone: 'amber', Icon: Sun },
    'Best in Winter': { tone: 'sky', Icon: Snowflake },
    'Rainy Day Favorites': { tone: 'indigo', Icon: Umbrella },
    'Local Experiences': { tone: 'rose', Icon: Heart }
  };

  // Button-specific styles that keep the structure polished but allow tier color accents
  const BUTTON_STYLES = {
    emerald: {
      active: 'bg-emerald-600 text-white border-emerald-600 focus:ring-emerald-500',
      inactive: 'text-emerald-700 bg-white border-emerald-300 hover:bg-emerald-50',
      icon: 'text-emerald-600'
    },
    amber: {
      active: 'bg-amber-600 text-white border-amber-600 focus:ring-amber-500',
      inactive: 'text-amber-700 bg-white border-amber-300 hover:bg-amber-50',
      icon: 'text-amber-600'
    },
    sky: {
      active: 'bg-sky-600 text-white border-sky-600 focus:ring-sky-500',
      inactive: 'text-sky-700 bg-white border-sky-300 hover:bg-sky-50',
      icon: 'text-sky-600'
    },
    indigo: {
      active: 'bg-indigo-600 text-white border-indigo-600 focus:ring-indigo-500',
      inactive: 'text-indigo-700 bg-white border-indigo-300 hover:bg-indigo-50',
      icon: 'text-indigo-600'
    },
    rose: {
      active: 'bg-rose-600 text-white border-rose-600 focus:ring-rose-500',
      inactive: 'text-rose-700 bg-white border-rose-300 hover:bg-rose-50',
      icon: 'text-rose-600'
    },
    gray: {
      active: 'bg-gray-900 text-white border-gray-900 focus:ring-gray-500',
      inactive: 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50',
      icon: 'text-gray-500'
    }
  };
  
  // Build tooltip data for a given day
  const buildTooltipData = (day, monthIndex, dayOfMonth) => ({
    monthIndex,
    dayOfMonth,
    event: day.event,
    notes: day.notes,
    weather: day.weather,
    crowdLevel: day.crowdLevel,
    price: day.price
  });

  // Toggle tooltip via click (mobile-friendly)
  const toggleTooltip = (day, monthIndex, dayOfMonth) => {
    if (!day) return;
    const next = buildTooltipData(day, monthIndex, dayOfMonth);
    const isSame = activeTooltip && activeTooltip.monthIndex === monthIndex && activeTooltip.dayOfMonth === dayOfMonth;
    setActiveTooltip(isSame ? null : next);
  };
  
  // Extract data from overview
  const practicalInfo = overview?.practical_info;
  const population = overview?.population;
  const sections = overview?.sections || [];
  const whyVisit = overview?.why_visit;
  const seasonalNotes = overview?.seasonal_notes;
  const bestMonthsOverall = visitCalendar?.bestTimeRecommendations?.overall?.best || [];
  const avoidMonthsOverall = visitCalendar?.bestTimeRecommendations?.overall?.avoid || [];
  
  // Enhanced description with more engaging content
  const enhancedDescription = overview?.brief_description
    ? overview.brief_description
    : `${cityName} is a beautiful city waiting to be discovered. With its rich history, vibrant culture, and welcoming atmosphere, it offers visitors an unforgettable experience.`;

  // Memoize calendar data computation to avoid recalculating on every render
  const calendarData = useMemo(() => {
    if (!visitCalendar?.months) return null;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const getDayDetails = (day, monthData, filter) => {
      if (!monthData?.ranges) return null;
      const range = monthData.ranges.find(r => r.days.includes(day));
      if (!range) return null;

      let weather = null;
      if (monthData.weatherDetails) {
        weather = `${monthData.weatherDetails.lowC}-${monthData.weatherDetails.highC}°C`;
      } else if (monthData.weatherHighC && monthData.weatherLowC) {
        weather = `${monthData.weatherLowC}-${monthData.weatherHighC}°C`;
      }

      let adjustedScore = range.score;
      if (filter !== 'all' && range.travelerTypes?.[filter] !== undefined) {
        adjustedScore = Math.round((range.score + range.travelerTypes[filter]) / 2);
      }

      return {
        score: adjustedScore,
        special: range.special || false,
        event: range.event || null,
        notes: range.notes || '',
        weather,
        crowdLevel: range.crowdLevel || null,
        price: range.price || null,
        considerations: range.considerations || []
      };
    };

    return MONTH_NAMES.map((monthName, monthIndex) => {
      const monthData = visitCalendar.months[monthName.toLowerCase()];
      const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
      const firstDayOfMonth = new Date(currentYear, monthIndex, 1).getDay();
      const isCurrentMonth = monthIndex === currentMonth;

      const days = [];
      for (let i = 0; i < firstDayOfMonth; i++) {
        days.push({ type: 'empty' });
      }

      let specialEventsCount = 0;
      for (let i = 1; i <= daysInMonth; i++) {
        const details = monthData ? getDayDetails(i, monthData, travelerTypeFilter) : null;
        const rating = details?.score || 3;
        if (details?.special) specialEventsCount++;
        days.push({
          type: 'day',
          dayOfMonth: i,
          rating,
          color: RATING_COLORS[rating],
          special: details?.special,
          event: details?.event,
          notes: details?.notes,
          weather: details?.weather,
          crowdLevel: details?.crowdLevel,
          price: details?.price,
          isPlaceholder: !details
        });
      }

      return { monthName, monthIndex, days, isCurrentMonth, specialEventsCount };
    });
  }, [visitCalendar, travelerTypeFilter]);

  const monthInsights = useMemo(() => {
    if (!calendarData?.length) return [];

    return calendarData.map((month) => {
      const monthData = visitCalendar?.months?.[month.monthName.toLowerCase()] || {};
      const days = month.days.filter((day) => day.type === 'day');
      const scoredDays = days.filter((day) => !day.isPlaceholder);
      const scoreSource = scoredDays.length > 0 ? scoredDays : days;
      const averageScore = scoreSource.length
        ? scoreSource.reduce((sum, day) => sum + (day.rating || 3), 0) / scoreSource.length
        : 3;
      const weatherDetails = monthData.weatherDetails || {};
      const crowdLevel = monthData.crowdLevel || mostFrequent(days.map((day) => day.crowdLevel));
      const priceLevel = monthData.priceLevel || mostFrequent(days.map((day) => day.price));

      return {
        ...month,
        averageScore,
        rating: Math.max(1, Math.min(5, Math.round(averageScore))),
        weatherLabel: weatherDetails.lowC !== undefined && weatherDetails.highC !== undefined
          ? `${weatherDetails.lowC}-${weatherDetails.highC}°C`
          : null,
        daylightLabel: weatherDetails.daylightHours ? `${weatherDetails.daylightHours}h daylight` : null,
        crowdLevel,
        priceLevel,
        monthData
      };
    });
  }, [calendarData, visitCalendar]);

  const bestTravelerMonth = useMemo(() => {
    if (travelerTypeFilter === 'all' || !visitCalendar?.months) return null;

    const rankedMonths = MONTH_NAMES.map((monthName) => {
      const ranges = visitCalendar.months?.[monthName.toLowerCase()]?.ranges || [];
      const travelerScores = ranges
        .map((range) => range.travelerTypes?.[travelerTypeFilter])
        .filter((score) => typeof score === 'number');

      if (!travelerScores.length) return null;

      return {
        monthName,
        score: travelerScores.reduce((sum, score) => sum + score, 0) / travelerScores.length
      };
    }).filter(Boolean);

    return rankedMonths.sort((a, b) => b.score - a.score)[0]?.monthName || null;
  }, [travelerTypeFilter, visitCalendar]);

  const valueMonths = useMemo(() => {
    const valueCandidates = monthInsights
      .map((month) => {
        const priceText = String(month.priceLevel || '').toLowerCase();
        const crowdText = String(month.crowdLevel || '').toLowerCase();
        const valueBonus = priceText.includes('low') || priceText.includes('value') ? 0.6 : 0;
        const crowdBonus = crowdText.includes('low') || crowdText.includes('moderate') ? 0.3 : 0;
        return { monthName: month.monthName, score: month.averageScore + valueBonus + crowdBonus };
      })
      .sort((a, b) => b.score - a.score);

    return valueCandidates.slice(0, 2).map((month) => month.monthName);
  }, [monthInsights]);

  const tripFitRecommendations = useMemo(() => {
    const crowdPenalty = {
      quiet: ['very high', 'high'],
      balanced: ['very high'],
      lively: []
    }[tripFit.crowd] || [];

    return monthInsights
      .map((month) => {
        const priceText = String(month.priceLevel || '').toLowerCase();
        const crowdText = String(month.crowdLevel || '').toLowerCase();
        let score = month.averageScore;

        if (tripFit.budget === 'budget' && (priceText.includes('low') || priceText.includes('value'))) score += 0.7;
        if (tripFit.budget === 'luxury' && month.specialEventsCount > 0) score += 0.35;
        if (crowdPenalty.some((term) => crowdText.includes(term))) score -= 0.8;

        const ranges = month.monthData?.ranges || [];
        const travelerScores = ranges
          .map((range) => range.travelerTypes?.[tripFit.traveler])
          .filter((value) => typeof value === 'number');
        if (travelerScores.length) {
          score += (travelerScores.reduce((sum, value) => sum + value, 0) / travelerScores.length - 3) * 0.35;
        }

        return { ...month, fitScore: score };
      })
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 3);
  }, [monthInsights, tripFit]);

  const comparisonInsights = useMemo(
    () => compareMonths
      .map((monthName) => monthInsights.find((month) => month.monthName === monthName))
      .filter(Boolean),
    [compareMonths, monthInsights]
  );

  const updateCompareMonth = (index, monthName) => {
    setCompareMonths((current) => {
      const next = [...current];
      next[index] = monthName;
      return next;
    });
  };

  const openMonthlyGuide = (monthName) => {
    if (onOpenMonthlyGuide) {
      onOpenMonthlyGuide(monthName);
      setSelectedCalendarMonth(null);
      setHoveredModalDay(null);
    }
  };

  const planMonthHref = (monthName, eventName = null) => {
    const citySlug = encodeURIComponent(cityName?.toLowerCase() || 'paris');
    const params = new URLSearchParams({
      city: cityName || 'Paris',
      month: monthName
    });

    if (eventName) params.set('event', eventName);

    return `/plan/${citySlug}?${params.toString()}`;
  };

  const seasonalNeighborhoods = useMemo(() => getSeasonalNeighborhoods(cityName), [cityName]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Optional intro header (hidden when a page-level hero is present) */}
      {!hideIntroHero && (
        <div className="relative bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <div className="relative p-6 md:p-8">
            <div className="flex items-center mb-3">
              <span className="text-3xl mr-3">{cityIcon}</span>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">{displayName}</h1>
                {nickname && (
                  <p className="text-base md:text-lg text-gray-600">{nickname}</p>
                )}
              </div>
            </div>
            <p className="text-[15.5px] md:text-[16.5px] leading-7 text-slate-700">
              {enhancedDescription}
            </p>
          </div>
        </div>
      )}







      {/* Best Time to Visit / Overview paragraph */}
      {(overviewParagraph || visitCalendar) && (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-500"></div>
          <div className="p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Interactive date calendar</p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                  Best Time to Visit {displayName}
                </h2>
              </div>
              {visitCalendar?.bestTimeRecommendations?.overall && (
                <span className="text-sm px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-medium hidden sm:inline-flex items-center gap-1.5">
                  <span>✨</span> Best overall: {visitCalendar.bestTimeRecommendations.overall.best?.[0] || 'April-June'}
                </span>
              )}
            </div>

            {(bestMonthsOverall.length > 0 || avoidMonthsOverall.length > 0) && (
              <div className="flex flex-wrap gap-2 text-sm">
                {bestMonthsOverall.slice(0, 3).map((m) => (
                  <span key={`best-${m}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    🌿 Best: {m}
                  </span>
                ))}
                {avoidMonthsOverall.slice(0, 2).map((m) => (
                  <span key={`avoid-${m}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                    ⚠️ Skip: {m}
                  </span>
                ))}
              </div>
            )}
            
            {/* Main summary - matching Start Here prose style */}
            {overviewParagraph && (
              <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-medium max-w-4xl">
                {overviewParagraph}
              </p>
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Best overall',
                  value: formatMonthList(bestMonthsOverall, monthInsights[0]?.monthName || 'April-June'),
                  detail: 'Prime weather and classic Paris atmosphere',
                  tone: 'emerald'
                },
                {
                  label: 'Best value',
                  value: formatMonthList(valueMonths, 'November-February'),
                  detail: 'Good scores with lighter crowds or softer pricing',
                  tone: 'blue'
                },
                {
                  label: 'Plan around',
                  value: formatMonthList(avoidMonthsOverall, 'August peak closures'),
                  detail: 'Higher friction from crowds, closures, or weather',
                  tone: 'rose'
                },
                {
                  label: `Best for ${TRAVELER_LABELS[travelerTypeFilter]?.toLowerCase() || 'your style'}`,
                  value: bestTravelerMonth || formatMonthList(bestMonthsOverall),
                  detail: 'Updates when you change traveler type below',
                  tone: 'violet'
                }
              ].map((card) => {
                const toneClasses = {
                  emerald: 'bg-emerald-50 border-emerald-100 text-emerald-800',
                  blue: 'bg-blue-50 border-blue-100 text-blue-800',
                  rose: 'bg-rose-50 border-rose-100 text-rose-800',
                  violet: 'bg-violet-50 border-violet-100 text-violet-800'
                };

                return (
                  <div key={card.label} className={`rounded-xl border p-4 ${toneClasses[card.tone]}`}>
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-75">{card.label}</div>
                    <div className="mt-1 text-lg font-bold text-gray-950">{card.value}</div>
                    <p className="mt-1 text-sm leading-snug text-gray-600">{card.detail}</p>
                  </div>
                );
              })}
            </div>

            {/* Traveler Type Filter - "Best for" */}
            {visitCalendar?.travelerTypes && (
              <div className="flex flex-wrap items-center gap-2 py-1.5">
                <span className="text-xs font-medium text-gray-500">Best time for:</span>
                {['all', 'families', 'couples', 'solo', 'budget', 'luxury'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTravelerTypeFilter(type)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      travelerTypeFilter === type
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {type === 'all' ? '🌍 Everyone' : 
                     type === 'families' ? '👨‍👩‍👧 Families' :
                     type === 'couples' ? '💑 Couples' :
                     type === 'solo' ? '🎒 Solo' :
                     type === 'budget' ? '💰 Budget' : '✨ Luxury'}
                  </button>
                ))}
              </div>
            )}

            {monthInsights.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Compare months</h3>
                      <p className="text-sm text-gray-600">Choose two windows and compare weather, crowds, events, and value.</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[0, 1].map((index) => (
                      <select
                        key={`compare-select-${index}`}
                        value={compareMonths[index]}
                        onChange={(event) => updateCompareMonth(index, event.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800"
                        aria-label={`Compare month ${index + 1}`}
                      >
                        {MONTH_NAMES.map((monthName) => (
                          <option key={monthName} value={monthName}>{monthName}</option>
                        ))}
                      </select>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {comparisonInsights.map((month) => (
                      <div key={`compare-${month.monthName}`} className="rounded-lg bg-white p-3 ring-1 ring-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{month.monthName}</span>
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                            style={{ backgroundColor: RATING_COLORS[month.rating] }}
                          >
                            {RATING_LABELS[month.rating]}
                          </span>
                        </div>
                        <dl className="mt-3 space-y-1 text-sm text-gray-600">
                          <div className="flex justify-between gap-3">
                            <dt>Weather</dt>
                            <dd className="font-medium text-gray-800">{month.weatherLabel || 'Mixed'}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt>Crowds</dt>
                            <dd className="font-medium text-gray-800">{month.crowdLevel || 'Moderate'}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt>Events</dt>
                            <dd className="font-medium text-gray-800">{month.specialEventsCount}</dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <h3 className="text-lg font-bold text-gray-900">Find your best trip window</h3>
                  <p className="text-sm text-gray-600">Tune the calendar around how you like to travel.</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Style
                      <select
                        value={tripFit.traveler}
                        onChange={(event) => setTripFit((current) => ({ ...current, traveler: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-gray-800"
                      >
                        {['families', 'couples', 'solo', 'budget', 'luxury'].map((type) => (
                          <option key={type} value={type}>{TRAVELER_LABELS[type]}</option>
                        ))}
                      </select>
                    </label>

                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Budget
                      <select
                        value={tripFit.budget}
                        onChange={(event) => setTripFit((current) => ({ ...current, budget: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-gray-800"
                      >
                        <option value="budget">Value</option>
                        <option value="mid">Balanced</option>
                        <option value="luxury">Splurge-worthy</option>
                      </select>
                    </label>

                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Crowds
                      <select
                        value={tripFit.crowd}
                        onChange={(event) => setTripFit((current) => ({ ...current, crowd: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-gray-800"
                      >
                        <option value="quiet">Prefer quiet</option>
                        <option value="balanced">Balanced</option>
                        <option value="lively">Love energy</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {tripFitRecommendations.map((month) => (
                      <button
                        key={`fit-${month.monthName}`}
                        type="button"
                        onClick={() => setSelectedCalendarMonth(month.monthName)}
                        className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                      >
                        {month.monthName} · {RATING_LABELS[month.rating]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedCalendarMonth && (() => {
              const selectedInsight = monthInsights.find((month) => month.monthName === selectedCalendarMonth);
              if (!selectedInsight) return null;

              return (
                <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Selected month</p>
                      <h3 className="text-xl font-bold text-gray-900">
                        {selectedCalendarMonth} looks {RATING_LABELS[selectedInsight.rating]?.toLowerCase() || 'promising'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {selectedInsight.weatherLabel || 'Seasonal weather'} · {selectedInsight.crowdLevel || 'moderate'} crowds · {selectedInsight.specialEventsCount} {selectedInsight.specialEventsCount === 1 ? 'highlighted event' : 'highlighted events'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={planMonthHref(selectedCalendarMonth)}
                        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Plan {selectedCalendarMonth}
                      </Link>
                      {onOpenMonthlyGuide && (
                        <button
                          type="button"
                          onClick={() => openMonthlyGuide(selectedCalendarMonth)}
                          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                        >
                          Open {selectedCalendarMonth} guide
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedCalendarMonth(null)}
                        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 12-Month Calendar - Enhanced */}
            <div className="mt-3">
              {/* Color Legend */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mb-2.5 p-1.5 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-5 h-2.5 rounded mr-1.5" style={{backgroundColor: '#10b981'}}></div>
                  <span className="text-[11px] text-gray-600 font-medium">Excellent (5)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-2.5 rounded mr-1.5" style={{backgroundColor: '#34d399'}}></div>
                  <span className="text-[11px] text-gray-600 font-medium">Good (4)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-2.5 rounded mr-1.5" style={{backgroundColor: '#fbbf24'}}></div>
                  <span className="text-[11px] text-gray-600 font-medium">Average (3)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-2.5 rounded mr-1.5" style={{backgroundColor: '#fb923c'}}></div>
                  <span className="text-[11px] text-gray-600 font-medium">Below Avg (2)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-2.5 rounded mr-1.5" style={{backgroundColor: '#ef4444'}}></div>
                  <span className="text-[11px] text-gray-600 font-medium">Avoid (1)</span>
                </div>
                <span className="text-[11px] text-gray-500 ml-2">• = Special Event</span>
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                {Array.from({ length: 12 }, (_, monthIndex) => {
                  const months = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ];
                  const currentYear = new Date().getFullYear();
                  const currentMonth = new Date().getMonth();
                  const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
                  const firstDayOfMonth = new Date(currentYear, monthIndex, 1).getDay();
                  const days = [];
                  const isCurrentMonth = monthIndex === currentMonth;
                  
                  const RATING_COLORS = {
                    5: '#10b981',
                    4: '#34d399',
                    3: '#fbbf24',
                    2: '#fb923c',
                    1: '#ef4444'
                  };
                  
                  const getMonthData = (monthName) => {
                    if (!visitCalendar || !visitCalendar.months) return null;
                    return visitCalendar.months[monthName.toLowerCase()];
                  };
                  
                  const getDayDetails = (day, monthData) => {
                    if (!monthData || !monthData.ranges) return null;
                    const range = monthData.ranges.find(r => r.days.includes(day));
                    if (!range) return null;
                    
                    // Use actual data fields instead of regex parsing
                    let weather = null;
                    if (monthData.weatherDetails) {
                      weather = `${monthData.weatherDetails.lowC}-${monthData.weatherDetails.highC}°C`;
                    } else if (monthData.weatherHighC && monthData.weatherLowC) {
                      weather = `${monthData.weatherLowC}-${monthData.weatherHighC}°C`;
                    }
                    
                    // Apply traveler type filter
                    let adjustedScore = range.score;
                    if (travelerTypeFilter !== 'all' && range.travelerTypes) {
                      const travelerScore = range.travelerTypes[travelerTypeFilter];
                      if (travelerScore !== undefined) {
                        // Blend the general score with the specific traveler type score
                        adjustedScore = Math.round((range.score + travelerScore) / 2);
                      }
                    }
                    
                    return {
                      score: adjustedScore,
                      originalScore: range.score,
                      special: range.special || false,
                      event: range.event || null,
                      notes: range.notes || '',
                      weather: weather,
                      crowdLevel: range.crowdLevel || null,
                      price: range.price || null,
                      considerations: range.considerations || [],
                      travelerTypes: range.travelerTypes || null,
                      location: range.location || null
                    };
                  };
                  
                  const monthData = getMonthData(months[monthIndex]);
                  
                  for (let i = 0; i < firstDayOfMonth; i++) {
                    days.push({ type: 'empty' });
                  }
                  
                  // Count special events in this month
                  let specialEventsCount = 0;
                  
                  for (let i = 1; i <= daysInMonth; i++) {
                    let dayDetails = monthData ? getDayDetails(i, monthData) : null;
                    const hasDetails = Boolean(dayDetails);
                    const rating = hasDetails ? dayDetails.score : 3;
                    if (dayDetails?.special) specialEventsCount++;
                    days.push({
                      type: 'day',
                      dayOfMonth: i,
                      rating,
                      color: RATING_COLORS[rating],
                      special: dayDetails && dayDetails.special,
                      event: dayDetails && dayDetails.event,
                      notes: dayDetails && dayDetails.notes,
                      weather: dayDetails && dayDetails.weather,
                      crowdLevel: dayDetails && dayDetails.crowdLevel,
                      price: dayDetails && dayDetails.price,
                      considerations: dayDetails?.considerations || [],
                      isPlaceholder: !hasDetails
                    });
                  }
                  
                  // Calculate average score for the month
                  const avgScore = monthData?.tourismLevel 
                    ? Math.min(5, Math.max(1, Math.round(6 - monthData.tourismLevel / 2)))
                    : 3;
                  
                  return (
                    <div 
                      key={monthIndex} 
                      className={`border rounded-lg transition-all cursor-pointer hover:shadow-md hover:border-indigo-300 ${
                        !monthData ? 'opacity-90' : ''
                      } ${isCurrentMonth ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => setSelectedCalendarMonth(months[monthIndex])}
                    >
                      <div className="bg-gray-50 p-2 text-center border-b flex items-center justify-center gap-1.5">
                        <div className="text-xs font-semibold text-gray-700">
                          {months[monthIndex]}
                        </div>
                        {isCurrentMonth && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500 text-white">Now</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-gray-500 bg-gray-50">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                          <div key={i} className="p-0.5">{day}</div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-px overflow-visible">
                        {days.map((day, dayIndex) => (
                          day.type === 'empty' ? (
                            <div key={`empty-${dayIndex}`} className="aspect-square" />
                          ) : (
                            <div
                              key={`day-${day.dayOfMonth}`}
                              className="day-cell aspect-square flex items-center justify-center text-[10px] relative transition-transform cursor-pointer hover:scale-105"
                              style={{ backgroundColor: day.color }}
                              onMouseEnter={() => setActiveTooltip(buildTooltipData(day, monthIndex, day.dayOfMonth))}
                              onMouseLeave={() => setActiveTooltip(null)}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedCalendarMonth(months[monthIndex]);
                                setHoveredModalDay(day.dayOfMonth);
                              }}
                              aria-label={`Day ${day.dayOfMonth}${day.event ? `: ${day.event}` : ''}`}
                            >
                              <span className="text-white font-medium text-[9px]">{day.dayOfMonth}</span>
                              {day.special && (
                                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                              )}

                              {activeTooltip && activeTooltip.monthIndex === monthIndex && activeTooltip.dayOfMonth === day.dayOfMonth && (
                                <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full z-50 w-56">
                                  <div className="rounded-lg shadow-xl bg-white ring-1 ring-black/10 p-2.5">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] text-gray-500">{months[monthIndex]} {day.dayOfMonth}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${day.color}20`, color: day.color }}>
                                        Score: {day.rating}/5
                                      </span>
                                    </div>
                                    {activeTooltip.event && (
                                      <div className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1">
                                        <span>🎉</span>{activeTooltip.event}
                                      </div>
                                    )}
                                    {activeTooltip.notes && (
                                      <div className="text-[11px] text-gray-600 mb-1.5 line-clamp-2">{activeTooltip.notes}</div>
                                    )}
                                    {!day.event && !day.notes && day.isPlaceholder && (
                                      <div className="text-[11px] text-gray-500 italic">General guidance — tap month for details.</div>
                                    )}
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {activeTooltip.weather && (
                                        <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                                          🌡️ {activeTooltip.weather}
                                        </span>
                                      )}
                                      {activeTooltip.crowdLevel && (
                                        <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                                          👥 {activeTooltip.crowdLevel}
                                        </span>
                                      )}
                                      {activeTooltip.price && (
                                        <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                                          💰 {activeTooltip.price}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mx-auto h-2 w-2 rotate-45 bg-white shadow translate-y-[-5px]"></div>
                                </div>
                              )}
                            </div>
                          )
                        ))}
                      </div>
                      
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legacy month modal replaced by the inline selected-month panel above. */}
            {false && selectedCalendarMonth && visitCalendar?.months?.[selectedCalendarMonth.toLowerCase()] && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={() => { setSelectedCalendarMonth(null); setHoveredModalDay(null); }}
              >
                <div 
                  className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(() => {
                    const monthData = visitCalendar.months[selectedCalendarMonth.toLowerCase()];
                    const weatherDetails = monthData.weatherDetails || {};
                    const highlight = visitCalendar.monthlyHighlights?.[selectedCalendarMonth.toLowerCase()];
                    
                    // Build calendar days for the modal
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                        'July', 'August', 'September', 'October', 'November', 'December'];
                    const monthIndex = monthNames.findIndex(m => m.toLowerCase() === selectedCalendarMonth.toLowerCase());
                    const currentYear = new Date().getFullYear();
                    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
                    const firstDayOfMonth = new Date(currentYear, monthIndex, 1).getDay();
                    
                    const RATING_COLORS = {
                      5: '#10b981',
                      4: '#34d399',
                      3: '#fbbf24',
                      2: '#fb923c',
                      1: '#ef4444'
                    };
                    
                    const RATING_LABELS = {
                      5: 'Excellent',
                      4: 'Good',
                      3: 'Average',
                      2: 'Below Average',
                      1: 'Avoid'
                    };
                    
                    // Get day details
                    const getDayDetails = (day) => {
                      if (!monthData.ranges) return null;
                      const range = monthData.ranges.find(r => r.days.includes(day));
                      if (!range) return null;
                      return {
                        score: range.score,
                        special: range.special || false,
                        event: range.event || null,
                        notes: range.notes || '',
                        crowdLevel: range.crowdLevel || null,
                        price: range.price || null,
                        considerations: range.considerations || [],
                        location: range.location || null,
                        travelerTypes: range.travelerTypes || null
                      };
                    };
                    
                    // Build days array
                    const modalDays = [];
                    for (let i = 0; i < firstDayOfMonth; i++) {
                      modalDays.push({ type: 'empty' });
                    }
                    for (let i = 1; i <= daysInMonth; i++) {
                      const details = getDayDetails(i);
                      modalDays.push({
                        type: 'day',
                        dayOfMonth: i,
                        ...details,
                        color: RATING_COLORS[details?.score || 3]
                      });
                    }
                    
                    // Get current hovered day details
                    const hoveredDetails = hoveredModalDay ? getDayDetails(hoveredModalDay) : null;
                    
                    return (
                      <>
                        {/* Modal Header */}
                        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{selectedCalendarMonth} {currentYear}</h3>
                              {highlight && (
                                <p className="text-sm text-gray-500 mt-0.5">{highlight}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={planMonthHref(selectedCalendarMonth)}
                                className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                Plan this month
                              </Link>
                              {onOpenMonthlyGuide && (
                                <button
                                  type="button"
                                  onClick={() => openMonthlyGuide(selectedCalendarMonth)}
                                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                                >
                                  Open monthly guide
                                </button>
                              )}
                              <button 
                                onClick={() => { setSelectedCalendarMonth(null); setHoveredModalDay(null); }}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Split Panel Content */}
                        <div className="flex flex-1 overflow-hidden">
                          {/* LEFT PANEL - Calendar */}
                          <div className="w-1/2 p-5 border-r border-gray-200 overflow-y-auto">
                            {/* Calendar Grid */}
                            <div className="bg-gray-50 rounded-xl p-3">
                              {/* Day headers */}
                              <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 mb-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                  <div key={i} className="py-1">{d}</div>
                                ))}
                              </div>
                              
                              {/* Day cells */}
                              <div className="grid grid-cols-7 gap-1">
                                {modalDays.map((day, idx) => (
                                  day.type === 'empty' ? (
                                    <div key={`empty-${idx}`} className="aspect-square" />
                                  ) : (
                                    <div
                                      key={`day-${day.dayOfMonth}`}
                                      className={`aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all relative ${
                                        hoveredModalDay === day.dayOfMonth 
                                          ? 'ring-2 ring-indigo-500 ring-offset-1 scale-105' 
                                          : 'hover:scale-105'
                                      }`}
                                      style={{ backgroundColor: day.color }}
                                      onMouseEnter={() => setHoveredModalDay(day.dayOfMonth)}
                                    >
                                      <span className="text-white font-bold text-sm">{day.dayOfMonth}</span>
                                      {day.special && (
                                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                      )}
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>
                            
                            {/* Legend */}
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                              {[5, 4, 3, 2, 1].map(score => (
                                <div key={score} className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded" style={{ backgroundColor: RATING_COLORS[score] }}></div>
                                  <span className="text-[10px] text-gray-600">{RATING_LABELS[score]}</span>
                                </div>
                              ))}
                            </div>
                            
                          </div>
                          
                          {/* RIGHT PANEL - Day Details (Prose Style) */}
                          <div className="w-1/2 p-6 bg-white overflow-y-auto border-l border-gray-100">
                            {hoveredModalDay && hoveredDetails ? (
                              <div className="max-w-none">
                                {/* Day Header */}
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-xl font-bold text-gray-900">
                                    {selectedCalendarMonth} {hoveredModalDay}
                                  </h4>
                                  <span 
                                    className="px-2.5 py-0.5 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: RATING_COLORS[hoveredDetails.score || 3] }}
                                  >
                                    {RATING_LABELS[hoveredDetails.score || 3]}
                                  </span>
                                </div>
                                
                                {/* Special Event */}
                                {hoveredDetails.special && hoveredDetails.event && (
                                  <div className="mb-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-100">
                                    <p className="text-base font-semibold text-gray-900">
                                      {hoveredDetails.event}
                                      {hoveredDetails.location && (
                                        <span className="font-normal text-gray-500"> — {hoveredDetails.location}</span>
                                      )}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Link
                                        href={planMonthHref(selectedCalendarMonth, hoveredDetails.event)}
                                        className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                                      >
                                        Plan around this event
                                      </Link>
                                      {onOpenMonthlyGuide && (
                                        <button
                                          type="button"
                                          onClick={() => openMonthlyGuide(selectedCalendarMonth)}
                                          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
                                        >
                                          See nearby events
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Integrated prose: notes + weather + crowds + tips */}
                                <div className="text-[15px] leading-relaxed text-gray-700 space-y-3">
                                  {hoveredDetails.notes && (
                                    <p>{hoveredDetails.notes}</p>
                                  )}
                                  
                                  <p>
                                    Temperatures around {weatherDetails.lowC ?? '?'}–{weatherDetails.highC ?? '?'}°C with {weatherDetails.daylightHours ?? '?'} hours of daylight.
                                    {hoveredDetails.crowdLevel && (
                                      <> Expect {hoveredDetails.crowdLevel.toLowerCase()} crowds</>
                                    )}
                                    {hoveredDetails.price && (
                                      <> and {hoveredDetails.price.toLowerCase()} pricing</>
                                    )}
                                    .
                                  </p>
                                  
                                  {hoveredDetails.considerations && hoveredDetails.considerations.length > 0 && (
                                    <p>{hoveredDetails.considerations.join('. ')}.</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Default state - Month overview */
                              <div className="max-w-none">
                                <h4 className="text-xl font-bold text-gray-900 mb-4">{selectedCalendarMonth}</h4>
                                
                                <div className="text-[15px] leading-relaxed text-gray-700 space-y-3">
                                  <p>
                                    Hover over any date on the calendar to see detailed information about that day.
                                  </p>
                                  
                                  <p>
                                    Temperatures this month range from {weatherDetails.lowC ?? '?'}°C to {weatherDetails.highC ?? '?'}°C, 
                                    with about {weatherDetails.daylightHours ?? '?'} hours of daylight 
                                    (sunrise {weatherDetails.sunrise ?? '?'}, sunset {weatherDetails.sunset ?? '?'}).
                                  </p>
                                  
                                  <p>
                                    Expect {monthData.crowdLevel?.toLowerCase() || 'moderate'} crowds 
                                    and {monthData.priceLevel?.toLowerCase() || 'standard'} prices. 
                                    Plan for around {weatherDetails.rainDays ?? '?'} rainy days this month.
                                  </p>

                                  <div className="rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100">
                                    <h5 className="font-semibold text-gray-900">Booking and packing notes</h5>
                                    <p className="mt-2 text-sm text-gray-700">
                                      Reserve major museums and signature restaurants ahead when events or peak weekends overlap. Pack light layers, comfortable walking shoes, and a rain shell if the month has frequent showers.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Seasonal Details - Narrative Prose matching Start Here style */}
            {(() => {
              const cityKey = cityName?.toLowerCase() || '';
              const seasonalContent = CITY_SEASONAL_NARRATIVES[cityKey] || DEFAULT_SEASONAL_NARRATIVE;

              // Helper to render HTML string with strong tags
              const renderSeasonalText = (htmlString) => {
                // Split by <strong> tags and render appropriately
                const parts = htmlString.split(/(<strong>.*?<\/strong>)/g);
                return parts.map((part, i) => {
                  if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
                    const text = part.replace(/<\/?strong>/g, '');
                    return <strong key={i} className="text-gray-900">{text}</strong>;
                  }
                  return part;
                });
              };

              return (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Season by Season</h3>
                  <div className="grid lg:grid-cols-2 gap-x-10 gap-y-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1.5">Spring & Early Fall</h4>
                        <p className="text-[17px] leading-relaxed text-gray-700">
                          {renderSeasonalText(seasonalContent.springFall)}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900 mb-1.5">Summer</h4>
                        <p className="text-[17px] leading-relaxed text-gray-700">
                          {renderSeasonalText(seasonalContent.summer)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1.5">Winter</h4>
                        <p className="text-[17px] leading-relaxed text-gray-700">
                          {renderSeasonalText(seasonalContent.winter)}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900 mb-1.5">March</h4>
                        <p className="text-[17px] leading-relaxed text-gray-700">
                          {renderSeasonalText(seasonalContent.march)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Neighborhood by season</p>
                  <h3 className="text-xl font-bold text-gray-900">Where to base your days after you choose dates</h3>
                </div>
                <Link
                  href={`/plan/${encodeURIComponent(cityName?.toLowerCase() || 'paris')}`}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Turn this into a trip
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {seasonalNeighborhoods.map((item) => (
                  <div key={item.season} className="rounded-lg bg-white p-4 ring-1 ring-gray-200">
                    <div className="text-sm font-semibold text-blue-700">{item.season}</div>
                    <div className="mt-1 font-bold text-gray-900">{item.neighborhood}</div>
                    <p className="mt-2 text-sm leading-snug text-gray-600">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Things to Do section has been moved to the Experiences tab */}
      {/* The curated filters (Must Do, Summer, Winter, Rainy Day, Family) are now in AttractionsList */}
      {false && (
        (thingsToDo?.categories && thingsToDo.categories.length > 0) ? (
          (() => {
            const categories = thingsToDo.categories;
            const availableTiers = categories.map(c => c.title);

            const toneForTier = (tier) => {
              return (TIER_META[tier]?.tone) || 'gray';
            };

            const iconForTier = (tier) => {
              const M = TIER_META[tier];
              if (!M) return null;
              const Ico = M.Icon;
              const tone = toneForTier(tier);
              const colorClass = TONE_STYLES[tone]?.icon || 'text-gray-600';
              return <Ico className={`h-5 w-5 ${colorClass}`} />;
            };

            const allItems = categories.flatMap(cat => (cat.items || []).map(it => ({...it, __tier: cat.title})));
            const filteredItems = (activeTier === 'All' ? allItems : (categories.find(c => c.title === activeTier)?.items || []).map(it => ({...it, __tier: activeTier})))
              .filter(it => !showFreeOnly || it.isFree || (it.cost && String(it.cost).toLowerCase().includes('free')));
            const totalItems = filteredItems.length;
            const startIdx = (currentPage - 1) * pageSize;
            const selectedItems = filteredItems.slice(startIdx, startIdx + pageSize);

            const renderRating = (item) => {
              const rating = typeof item.rating === 'number' ? item.rating : 0;
              const fullStars = Math.round(rating);
              const stars = Array.from({ length: 5 }, (_, i) => (i < fullStars ? '★' : '☆')).join('');
              const label = rating ? `${rating.toFixed(1)} (${item.rating_count || 0})` : 'Rate this';
              return (
                <div className="flex items-center gap-2 text-amber-500">
                  <span className="text-sm leading-none">{stars}</span>
                  <span className="text-xs text-gray-600">{label}</span>
                </div>
              );
            };

            return (
              <div className="space-y-5">
                {/* Filter chips */}
                <div className="flex flex-wrap gap-2">
                  {["All", ...availableTiers].map(tier => {
                    const tone = tier === 'All' ? 'gray' : (TIER_META[tier]?.tone || 'gray');
                    const style = BUTTON_STYLES[tone];
                    const isActive = activeTier === tier;
                    return (
                      <button
                        key={tier}
                        onClick={() => setActiveTier(tier)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors shadow-sm focus:outline-none focus:ring-2 ${isActive ? style.active : style.inactive}`}
                        aria-pressed={isActive}
                      >
                        {tier === 'All' ? <Star className={`h-5 w-5 ${style.icon}`} /> : iconForTier(tier)}
                        {tier}
                      </button>
                    );
                  })}
                  {(() => {
                    const style = BUTTON_STYLES['emerald'];
                    const isActive = showFreeOnly;
                    return (
                      <button
                        onClick={() => setShowFreeOnly(v => !v)}
                        className={`ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors shadow-sm focus:outline-none focus:ring-2 ${isActive ? style.active : style.inactive}`}
                        aria-pressed={isActive}
                        title="Show only free activities"
                      >
                        <span className="font-medium">Free</span>
                      </button>
                    );
                  })()}
                </div>

                {/* Grid of cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {selectedItems.map((item, idx) => {
                    const tone = toneForTier(item.__tier);
                    const ST = TONE_STYLES[tone];
                    
                    // Determine best time of day from optimal_time or tags
                    const getBestTimeIcon = () => {
                      const timeStr = (item.optimal_time || '').toLowerCase() + ' ' + (item.tags || []).join(' ').toLowerCase();
                      if (/(morning|sunrise|early|breakfast)/.test(timeStr)) return { icon: Sunrise, label: 'Morning', color: 'text-amber-500' };
                      if (/(evening|sunset|night|dinner|twilight)/.test(timeStr)) return { icon: Sunset, label: 'Evening', color: 'text-orange-500' };
                      if (/(afternoon|lunch|midday)/.test(timeStr)) return { icon: Sun, label: 'Afternoon', color: 'text-yellow-500' };
                      return null;
                    };
                    const bestTime = getBestTimeIcon();
                    
                return (
                      <div key={idx} className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200">
                        {/* Media area */}
                        <div className="relative w-full aspect-[16/9] bg-gray-100">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.activity}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              style={{ objectPosition: item.imagePosition || 'center' }}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">Image coming soon</div>
                          )}
                          {/* Gradient overlay for better text readability */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          {/* Cost badge */}
                          <div className={`absolute top-2 left-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-white/95 backdrop-blur-sm border ${ST.chipSoft}`}>
                            {item.cost || '—'}
                          </div>
                          
                          {/* Tier icon */}
                          <div className="absolute top-2 right-2">
                            <button className="h-8 w-8 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200 shadow-sm flex items-center justify-center hover:bg-white transition-colors"
                              aria-label={item.__tier}>
                              {iconForTier(item.__tier)}
                            </button>
                          </div>
                          
                          {/* Quick actions - appear on hover */}
                          <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}
                              className={`h-8 w-8 rounded-full backdrop-blur-sm border shadow-sm flex items-center justify-center transition-colors ${
                                isFavorite(item) 
                                  ? 'bg-blue-500 border-blue-600 text-white' 
                                  : 'bg-white/95 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                              }`}
                              aria-label={isFavorite(item) ? "Remove from favorites" : "Save to favorites"}
                              title={isFavorite(item) ? "Saved" : "Save"}
                            >
                              <Bookmark className={`h-4 w-4 ${isFavorite(item) ? 'fill-white text-white' : 'text-gray-600'}`} />
                            </button>
                            <button 
                              className="h-8 w-8 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200 shadow-sm flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                              aria-label="Add to itinerary"
                              title="Add to itinerary"
                            >
                              <Plus className="h-4 w-4 text-gray-600" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setQuickViewItem(item); }}
                              className="h-8 w-8 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200 shadow-sm flex items-center justify-center hover:bg-violet-50 hover:border-violet-300 transition-colors"
                              aria-label="Quick view"
                              title="Quick view"
                            >
                              <Eye className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="p-4 space-y-2.5">
                          {/* Title and rating */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug">{item.activity}</h3>
                            {typeof item.rating === 'number' && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                <span className="text-sm font-medium text-gray-700">{item.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Description */}
                          {item.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{item.description}</p>
                          )}
                          
                          {/* Meta info row: duration, neighborhood, best time */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            {item.duration && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                {item.duration}
                              </span>
                            )}
                            {item.neighborhood && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                                {item.neighborhood}
                              </span>
                            )}
                            {bestTime && (
                              <span className="inline-flex items-center gap-1">
                                <bestTime.icon className={`h-3.5 w-3.5 ${bestTime.color}`} />
                                {bestTime.label}
                              </span>
                            )}
                          </div>
                          
                          {/* Tags */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {(() => {
                              const keywordTone = (t) => {
                                const low = String(t).toLowerCase();
                                if (/(summer|sun|outdoor|picnic|evening)/.test(low)) return 'amber';
                                if (/(winter|cold|indoor|cozy)/.test(low)) return 'sky';
                                if (/(rain|rainy|umbrella|museum|indoor)/.test(low)) return 'indigo';
                                if (/(local|market|neighborhood|wine)/.test(low)) return 'rose';
                                if (/(must|iconic|highlight)/.test(low)) return 'emerald';
                                return 'gray';
                              };
                              const makePill = (label, pillTone) => (
                                <span key={label} className={`text-[11px] px-2 py-0.5 rounded-full border ${BUTTON_STYLES[pillTone].inactive}`}>{label}</span>
                              );
                              const pills = [];
                              if (item.__tier) pills.push(makePill(item.__tier, TIER_META[item.__tier]?.tone || 'gray'));
                              if (Array.isArray(item.tags)) {
                                item.tags.slice(0, 2).forEach(tag => pills.push(makePill(tag, keywordTone(tag))));
                              }
                              return pills;
                            })()}
                          </div>
                        </div>
                      </div>
                );
                  })}
          </div>

                {/* Pagination */}
                {renderPaginationControls(currentPage, totalItems)}

                {selectedItems.length === 0 && (
                  <div className="text-sm text-gray-600">No activities match the current filters.</div>
                )}
                  </div>
            );
          })()
        ) : overview?.things_to_do_tiers ? (
          (() => {
            const tierOrder = ['Must Do','Best in Summer','Best in Winter','Rainy Day Favorites','Local Experiences'];
            const availableTiers = tierOrder.filter(t => overview.things_to_do_tiers[t]);

            const toneForTier = (tier) => {
              const t = tier.toLowerCase();
              if (t === 'must do') return 'emerald';
              if (t === 'best in summer') return 'amber';
              if (t === 'best in winter') return 'sky';
              if (t === 'rainy day favorites') return 'indigo';
              if (t === 'local experiences') return 'rose';
              return 'gray';
            };

            const iconForTier = (tier) => {
              const t = tier.toLowerCase();
              if (t === 'must do') return '⭐';
              if (t === 'best in summer') return '☀️';
              if (t === 'best in winter') return '❄️';
              if (t === 'rainy day favorites') return '☔';
              if (t === 'local experiences') return '❤️';
              return '•';
            };

            const allItems = availableTiers.flatMap(tier => (overview.things_to_do_tiers[tier] || []).map(it => ({...it, __tier: tier})));
            const selectedItems = (activeTier === 'All' ? allItems : (overview.things_to_do_tiers[activeTier] || []).map(it => ({...it, __tier: activeTier})))
              .filter(it => !showFreeOnly || (it.cost && String(it.cost).toLowerCase().includes('free')));

            return (
              <div className="space-y-5">
                {/* Filter chips */}
                <div className="flex flex-wrap gap-2">
                  {["All", ...availableTiers].map(tier => (
                    <button
                      key={tier}
                      onClick={() => setActiveTier(tier)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${activeTier === tier ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      aria-pressed={activeTier === tier}
                    >
                      <span className="text-base">{iconForTier(tier)}</span>
                      {tier}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowFreeOnly(v => !v)}
                    className={`ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${showFreeOnly ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    aria-pressed={showFreeOnly}
                    title="Show only free activities"
                  >
                    💶 Free Activities
                  </button>
                </div>

                {/* Grid of cards (legacy overview data) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedItems.map((item, idx) => {
                    const tone = toneForTier(item.__tier);
                    return (
                      <div key={idx} className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                        {/* Media placeholder */}
                        <div className={`h-36 bg-gradient-to-br from-${tone}-50 to-white flex items-end justify-between p-3`}> 
                          <div className="text-xs px-2 py-1 rounded-full bg-black/50 text-white">
                            {item.cost || '—'}
                          </div>
                          <div className="text-xl">{iconForTier(item.__tier)}</div>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 line-clamp-2 pr-2">{item.activity}</h3>
                            <span className={`text-[10px] uppercase tracking-wide font-medium text-${tone}-700 bg-${tone}-100 px-2 py-0.5 rounded-full`}>{item.__tier}</span>
                          </div>
                          {item.optimal_time && (
                            <p className="text-sm text-gray-600 line-clamp-2">{item.optimal_time}</p>
                          )}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.cost && (
                              <Chip tone={tone}>{item.cost}</Chip>
                            )}
                            {item.optimal_time && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{item.optimal_time.split(' ')[0]}</span>
                            )}
                          </div>
                    </div>
                  </div>
                    );
                  })}
                </div>

                {selectedItems.length === 0 && (
                  <div className="text-sm text-gray-600">No activities match the current filters.</div>
                )}
              </div>
            );
          })()
        ) : null
      )}


      {/* Mobile-friendly Event Modal (only renders on small screens via CSS) */}
      {activeTooltip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 md:hidden">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][activeTooltip.monthIndex]} {activeTooltip.dayOfMonth}
                </h3>
                <p className="text-sm text-gray-500">Special Event</p>
              </div>
              <button 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setActiveTooltip(null)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h4 className="text-xl font-medium text-gray-900 mb-4">{activeTooltip.event}</h4>
              <p className="text-gray-600 leading-relaxed mb-4">{activeTooltip.notes}</p>
              
              {/* Event Details */}
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
      )}

      {/* Quick View Modal */}
      {quickViewItem && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setQuickViewItem(null)}
        >
          <div 
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with image */}
            <div className="relative h-48 sm:h-56 bg-gray-100">
              {quickViewItem.image ? (
                <Image
                  src={quickViewItem.image}
                  alt={quickViewItem.activity || quickViewItem.title}
                  fill
                  className="object-cover"
                  style={{ objectPosition: quickViewItem.imagePosition || 'center' }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <MapPin className="h-12 w-12" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Close button */}
              <button 
                onClick={() => setQuickViewItem(null)}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              {/* Title overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                  {quickViewItem.activity || quickViewItem.title}
                </h2>
                {quickViewItem.__tier && (
                  <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white">
                    {quickViewItem.__tier}
                  </span>
                )}
              </div>
            </div>
            
            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(85vh-14rem)]">
              {/* Rating and cost */}
              <div className="flex items-center justify-between">
                {typeof quickViewItem.rating === 'number' && (
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-gray-900">{quickViewItem.rating.toFixed(1)}</span>
                    <span className="text-gray-500 text-sm">rating</span>
                  </div>
                )}
                {quickViewItem.cost && (
                  <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                    {quickViewItem.cost}
                  </span>
                )}
              </div>
              
              {/* Description */}
              {quickViewItem.description && (
                <p className="text-gray-700 leading-relaxed">{quickViewItem.description}</p>
              )}
              
              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {quickViewItem.duration && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{quickViewItem.duration}</span>
                  </div>
                )}
                {quickViewItem.neighborhood && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{quickViewItem.neighborhood}</span>
                  </div>
                )}
                {quickViewItem.optimal_time && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 col-span-2">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    <span>{quickViewItem.optimal_time}</span>
                  </div>
                )}
              </div>
              
              {/* Tips */}
              {quickViewItem.tips && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <h4 className="font-medium text-amber-800 mb-1">💡 Tips</h4>
                  <p className="text-sm text-amber-700">{quickViewItem.tips}</p>
                </div>
              )}
              
              {/* Tags */}
              {quickViewItem.tags && quickViewItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {quickViewItem.tags.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { toggleFavorite(quickViewItem); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
                    isFavorite(quickViewItem)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${isFavorite(quickViewItem) ? 'fill-white' : ''}`} />
                  {isFavorite(quickViewItem) ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={() => setQuickViewItem(null)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom fade-in duration-300">
          <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <Check className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Footer - aligned with Start Here styling */}
      <footer className="mt-12 border-t border-gray-200 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
          <span className="text-gray-700 font-semibold">Plan smarter. Travel better.</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/city-guides" className="text-gray-600 hover:text-gray-900 transition-colors">
              Browse all cities
            </Link>
            <Link href="mailto:hello@eurotrip.guide" className="text-gray-600 hover:text-gray-900 transition-colors">
              Get support
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default CityOverview;
