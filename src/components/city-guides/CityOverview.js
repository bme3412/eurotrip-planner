'use client';
import React, { useState, useEffect } from 'react';
import { getCityDisplayName, getCityNickname, getCityDescription } from '@/utils/cityDataUtils';
import { Chip } from '@/components/common/Primitives';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Sun, Snowflake, Umbrella, Heart, Medal, ChevronLeft, ChevronRight, Clock, MapPin, CalendarDays, Wand2, Bookmark, Plus, Eye, Sunrise, Sunset, X, Check, ExternalLink } from 'lucide-react';

const CityOverview = ({ overview, cityName, visitCalendar, monthlyData, hideIntroHero = false }) => {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [activeTier, setActiveTier] = useState('All');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [thingsToDo, setThingsToDo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [overviewParagraph, setOverviewParagraph] = useState(null);
  
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
  
  // Load rich Things-to-Do data from public JSON, if available
  useEffect(() => {
    const loadThingsToDo = async () => {
      try {
        const country = (overview?.country || '').trim() || 'France';
        const citySlug = (cityName || '').toLowerCase();
        const url = `/data/${country}/${citySlug}/monthly/things-to-do.json`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return; // fall back silently
        const json = await res.json();
        if (json && Array.isArray(json.categories)) {
          setThingsToDo(json);
        }
      } catch (_) {
        // ignore and use fallback
      }
    };
    loadThingsToDo();
  }, [cityName, overview?.country]);

  // Load monthly overview paragraph (author-provided) if available
  useEffect(() => {
    const loadOverviewParagraph = async () => {
      try {
        const country = (overview?.country || '').trim() || 'France';
        const citySlug = (cityName || '').toLowerCase();
        const url = `/data/${country}/${citySlug}/monthly/monthly-taglines.json`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (json && typeof json.overview_paragraph === 'string') {
          setOverviewParagraph(json.overview_paragraph);
        }
      } catch (_) {}
    };
    loadOverviewParagraph();
  }, [cityName, overview?.country]);

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
  
  // Enhanced description with more engaging content
  const enhancedDescription = overview?.brief_description 
    ? overview.brief_description
    : `${cityName} is a beautiful city waiting to be discovered. With its rich history, vibrant culture, and welcoming atmosphere, it offers visitors an unforgettable experience.`;
  
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
      {overviewParagraph && (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-500"></div>
          <div className="p-5 md:p-6 space-y-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Best Time to Visit</h2>
            
            {/* Main summary */}
            <p className="text-[15px] md:text-[16px] leading-7 text-slate-700 [text-wrap:pretty] md:max-w-none">
              Paris shines brightest in <strong>spring (April–June)</strong> and <strong>early fall (September–October)</strong>, when the city strikes its perfect balance. 
              Cherry blossoms frame the Eiffel Tower, sidewalk cafés buzz with locals enjoying the sunshine, and 15–20°C (60–68°F) temperatures make exploring on foot pure joy. 
              Early fall brings the added magic of golden foliage in Luxembourg Gardens and Bois de Boulogne, plus the cultural season roars back with new museum exhibitions and theater premieres.
            </p>

            {/* 12-Month Calendar - Integrated */}
            <div className="mt-4">
              {/* Color Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-5 h-2.5 rounded mr-1.5" style={{backgroundColor: '#10b981'}}></div>
                  <span className="text-[11px] text-gray-600 font-medium">Perfect</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-2.5 rounded mr-1.5" style={{backgroundColor: '#34d399'}}></div>
                  <span className="text-[11px] text-gray-600 font-medium">Great</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-2.5 rounded mr-1.5" style={{backgroundColor: '#fbbf24'}}></div>
                  <span className="text-[11px] text-gray-600 font-medium">Decent</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-2.5 rounded mr-1.5" style={{backgroundColor: '#fb923c'}}></div>
                  <span className="text-[11px] text-gray-600 font-medium">Consider</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-2.5 rounded mr-1.5" style={{backgroundColor: '#ef4444'}}></div>
                  <span className="text-[11px] text-gray-600 font-medium">Avoid</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                {Array.from({ length: 12 }, (_, monthIndex) => {
                  const months = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ];
                  const currentYear = new Date().getFullYear();
                  const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
                  const firstDayOfMonth = new Date(currentYear, monthIndex, 1).getDay();
                  const days = [];
                  
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
                    
                    let weather = null;
                    if (monthData.weatherHighC && monthData.weatherLowC) {
                      weather = `${monthData.weatherLowC}-${monthData.weatherHighC}°C`;
                    } else {
                      const weatherMatch = range.notes.match(/\((\d+-\d+°C)\)/);
                      weather = weatherMatch ? weatherMatch[1] : null;
                    }
                    
                    const crowdPatterns = [
                      /(crowded|busy|fewer crowds|manageable crowds|peak tourism|high tourism|reduced crowds)/i,
                      /(low crowds|moderate crowds|high crowds)/i
                    ];
                    let crowdLevel = null;
                    for (const pattern of crowdPatterns) {
                      const match = range.notes.match(pattern);
                      if (match) {
                        crowdLevel = match[1];
                        break;
                      }
                    }
                    
                    const pricePatterns = [
                      /(free|paid|lower prices|higher prices|sales)/i,
                      /(expensive|cheap|affordable)/i
                    ];
                    let price = null;
                    for (const pattern of pricePatterns) {
                      const match = range.notes.match(pattern);
                      if (match) {
                        price = match[1];
                        break;
                      }
                    }
                    
                    return {
                      score: range.score,
                      special: range.special || false,
                      event: range.special ? range.event : null,
                      notes: range.notes || '',
                      weather: weather,
                      crowdLevel: crowdLevel,
                      price: price
                    };
                  };
                  
                  for (let i = 0; i < firstDayOfMonth; i++) {
                    days.push({ type: 'empty' });
                  }
                  
                  for (let i = 1; i <= daysInMonth; i++) {
                    const monthData = getMonthData(months[monthIndex]);
                    let dayDetails = monthData ? getDayDetails(i, monthData) : null;
                    const hasDetails = Boolean(dayDetails);
                    const rating = hasDetails ? dayDetails.score : 3;
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
                      isPlaceholder: !hasDetails
                    });
                  }
                  
                  return (
                    <div key={monthIndex} className={`border rounded-lg ${!getMonthData(months[monthIndex]) ? 'opacity-90' : ''}`}>
                      <div className="bg-gray-50 p-2 text-center border-b flex items-center justify-center gap-2">
                        <div className="text-xs font-medium text-gray-700">
                          {months[monthIndex].substring(0, 3)}
                        </div>
                        {!getMonthData(months[monthIndex]) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">general</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-gray-500 bg-gray-50">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                          <div key={i} className="p-1">{day}</div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-px overflow-visible">
                        {days.map((day, dayIndex) => (
                          day.type === 'empty' ? (
                            <div key={`empty-${dayIndex}`} className="aspect-square" />
                          ) : (
                            <div
                              key={`day-${day.dayOfMonth}`}
                              className={`day-cell aspect-square flex items-center justify-center text-[11px] relative cursor-pointer hover:scale-[1.03] transition-transform ${day.special ? 'hover:ring-2 hover:ring-red-400' : ''}`}
                              style={{ backgroundColor: day.color }}
                              onClick={() => toggleTooltip(day, monthIndex, day.dayOfMonth)}
                              onMouseEnter={() => setActiveTooltip(buildTooltipData(day, monthIndex, day.dayOfMonth))}
                              onMouseLeave={() => setActiveTooltip(null)}
                              aria-label={`Day ${day.dayOfMonth}${day.event ? `: ${day.event}` : ''}`}
                            >
                              <span className="text-white font-medium">{day.dayOfMonth}</span>
                              {day.special && (
                                <span className="absolute top-0.5 right-0.5 w-1 h-1 bg-red-500 rounded-full"></span>
                              )}

                              {activeTooltip && activeTooltip.monthIndex === monthIndex && activeTooltip.dayOfMonth === day.dayOfMonth && (
                                <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full z-40 w-52">
                                  <div className="rounded-md shadow-lg bg-white ring-1 ring-black/5 p-2">
                                    {activeTooltip.event && (
                                      <div className="text-xs font-semibold text-gray-900 mb-0.5 truncate" title={activeTooltip.event}>{activeTooltip.event}</div>
                                    )}
                                    {activeTooltip.notes && (
                                      <div className="text-[11px] text-gray-600 mb-1 line-clamp-2" title={activeTooltip.notes}>{activeTooltip.notes}</div>
                                    )}
                                    {!day.event && !day.notes && day.isPlaceholder && (
                                      <div className="text-[11px] text-gray-600">General guidance only — detailed day data coming soon.</div>
                                    )}
                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                      {activeTooltip.weather && (
                                        <div className="flex items-center text-[10px] text-gray-700">
                                          <span className="mr-1">🌡️</span>{activeTooltip.weather}
                                        </div>
                                      )}
                                      {activeTooltip.crowdLevel && (
                                        <div className="flex items-center text-[10px] text-gray-700">
                                          <span className="mr-1">👥</span>{activeTooltip.crowdLevel}
                                        </div>
                                      )}
                                      {activeTooltip.price && (
                                        <div className="flex items-center text-[10px] text-gray-700">
                                          <span className="mr-1">💰</span>{activeTooltip.price}
                                        </div>
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

            {/* Seasonal Details - Professional Prose */}
            <div className="space-y-4 text-[15px] md:text-[16px] leading-7 text-slate-700">
              <p>
                <strong className="text-gray-900">Spring & Early Fall (April–June, September–October)</strong> offer the best overall experience. 
                Café terraces hum with conversation, gardens burst into bloom or turn golden, and comfortable temperatures of 15–20°C (60–68°F) 
                make walking the city a pleasure. Crowds remain manageable, and Paris looks its most photogenic under soft seasonal light. 
                May and September consistently rank as the sweet spot for first-time visitors.
              </p>

              <p>
                <strong className="text-gray-900">Summer (July–August)</strong> brings long golden evenings that stretch past 10pm, 
                Bastille Day fireworks over the Eiffel Tower, Paris Plages pop-up beaches along the Seine, and open-air cinema in Parc de la Villette. 
                The tradeoff is significant: expect peak crowds at major attractions, the highest hotel rates of the year, 
                and some beloved local shops and restaurants closing for the traditional August holiday. Book popular sites weeks in advance.
              </p>

              <p>
                <strong className="text-gray-900">Winter (November–February)</strong> reveals Paris at its most intimate. 
                Twinkling holiday lights transform the Champs-Élysées, Christmas markets pop up across the city, and you can linger over 
                legendary hot chocolate at Angelina without the queues. Museum galleries feel nearly private. 
                Temperatures hover between 3–8°C (37–46°F)—cold but manageable with proper layers—and hotel rates drop significantly, 
                making this the best season for budget-conscious travelers.
              </p>

              <p>
                <strong className="text-gray-900">March</strong> marks the city&apos;s gentle awakening. Temperatures climb toward 12°C (54°F), 
                the first flowers appear in the Tuileries and Luxembourg Gardens, and outdoor terraces begin reopening their doors. 
                Pack layers and an umbrella—spring showers are part of the charm. This shoulder season offers excellent value 
                before the crowds arrive in earnest.
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Things to Do (reimagined with tier chips and cards) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="mb-4">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Things to Do</h2>
        </div>
        {(thingsToDo?.categories && thingsToDo.categories.length > 0) ? (
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
        ) : (
          <div className="text-sm text-gray-600">No activities available.</div>
        )}
      </div>


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

    </div>
  );
};

export default CityOverview;