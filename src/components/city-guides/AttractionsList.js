'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';

const AttractionsList = ({ attractions, categories, cityName, monthlyData, experiencesUrl = null, limit = 50, forceList = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAttractions, setExpandedAttractions] = useState({});
  const [viewMode, setViewMode] = useState(forceList || experiencesUrl ? 'list' : 'grid'); // 'grid' or 'list'
  const [dateFilterType, setDateFilterType] = useState('none'); // 'none', 'exact', 'range', 'month'
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [experiences, setExperiences] = useState(null);
  
  // Month options for filtering
  const months = [
    { value: 'all', label: 'All Year', icon: '📅' },
    { value: 'january', label: 'January', icon: '❄️' },
    { value: 'february', label: 'February', icon: '❄️' },
    { value: 'march', label: 'March', icon: '🌸' },
    { value: 'april', label: 'April', icon: '🌸' },
    { value: 'may', label: 'May', icon: '🌺' },
    { value: 'june', label: 'June', icon: '☀️' },
    { value: 'july', label: 'July', icon: '☀️' },
    { value: 'august', label: 'August', icon: '☀️' },
    { value: 'september', label: 'September', icon: '🍂' },
    { value: 'october', label: 'October', icon: '🍂' },
    { value: 'november', label: 'November', icon: '🍁' },
    { value: 'december', label: 'December', icon: '❄️' }
  ];
  // Helper to compute 3 high-level factor buckets from raw factor scores
  const computeAggregateFactors = useCallback((factors) => {
    if (!factors || typeof factors !== 'object') return null;
    const get = (k) => (typeof factors[k] === 'number' ? factors[k] : null);
    const avg = (arr) => {
      const vals = arr.map(get).filter((v) => typeof v === 'number');
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    return {
      culturalValue: avg(['cultural_historical_significance', 'uniqueness_to_paris', 'educational_value']),
      experienceQuality: avg(['visitor_experience_quality', 'crowd_management', 'family_friendliness', 'photo_instagram_appeal']),
      practicalEase: avg(['accessibility', 'weather_independence', 'value_for_money'])
    };
  }, []);

  // Load enriched experiences JSON (optional): flatten categories and compute composite score
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!experiencesUrl) return;
      try {
        const res = await fetch(experiencesUrl, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const cats = json?.categories || {};
        const out = [];
        const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        Object.keys(cats).forEach((key) => {
          const arr = Array.isArray(cats[key]) ? cats[key] : [];
          arr.forEach((it, idx) => {
            const total = it?.scores?.total_score ?? 0;
            const { total_score, ...factors } = it?.scores || {};
            const factorScores = factors;
            out.push({
              id: `${slugify(it?.name)}-${idx}`,
              name: it?.name,
              description: it?.description,
              type: (it?.themes && it.themes[0]) || 'activity',
              category: key,
              latitude: it?.lat,
              longitude: it?.lon,
              website: it?.booking_url || null,
              price_range: it?.pricing_tier || null,
              ratings: {
                cultural_significance: it?.scores?.cultural_historical_significance || null,
                suggested_duration_hours: it?.duration_minutes ? (it.duration_minutes / 60) : null,
                cost_estimate: it?.estimated_cost_eur || null,
              },
              compositeScore: typeof total === 'number' ? Number(total) : 0,
              factorScores,
              aggregates: computeAggregateFactors(factorScores)
            });
          });
        });
        out.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
        const top = out.slice(0, limit);
        if (!cancelled) setExperiences(top);
      } catch (_) {}
    }
    load();
    return () => { cancelled = true; };
  }, [experiencesUrl, limit, computeAggregateFactors]);

  // Choose data source
  const dataSource = useMemo(() => {
    return Array.isArray(experiences) && experiences.length > 0 ? experiences : attractions;
  }, [experiences, attractions]);

  // Memoize callback functions to prevent re-renders
  const getMonthFromDate = useCallback((dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return monthNames[date.getMonth()];
  }, []);

  // Check if date is in range
  const isDateInRange = (dateString, start, end) => {
    if (!dateString || !start || !end) return false;
    const date = new Date(dateString);
    const startDate = new Date(start);
    const endDate = new Date(end);
    return date >= startDate && date <= endDate;
  };

  // Seasonal scoring system
  const getSeasonalScore = useCallback((attraction, month) => {
    if (month === 'all') return 0;
    
    let score = 0;
    const monthData = monthlyData?.[month.charAt(0).toUpperCase() + month.slice(1)];
    
    if (!monthData) return 0;

    // Check if attraction is indoor/outdoor and weather considerations
    if (attraction.indoor === false) {
      // Outdoor attractions get seasonal consideration
      const weather = monthData.first_half?.weather || monthData.second_half?.weather;
      if (weather) {
        const temp = weather.average_temperature;
        if (temp) {
          const highTemp = temp.high_celsius || parseInt(temp.high);
          const lowTemp = temp.low_celsius || parseInt(temp.low);
          const avgTemp = (highTemp + lowTemp) / 2;
          
          // Score based on temperature comfort
          if (avgTemp >= 15 && avgTemp <= 25) score += 3; // Ideal temperature
          else if (avgTemp >= 10 && avgTemp <= 30) score += 2; // Good temperature
          else if (avgTemp >= 5 && avgTemp <= 35) score += 1; // Acceptable temperature
        }
      }
    }

    // Check for seasonal notes that mention the attraction
    const seasonalNotes = monthData.first_half?.seasonal_notes || monthData.second_half?.seasonal_notes || '';
    if (seasonalNotes.toLowerCase().includes(attraction.name.toLowerCase())) {
      score += 2;
    }

    // Check attraction's seasonal notes
    if (attraction.seasonal_notes) {
      const attractionSeasonalNotes = attraction.seasonal_notes.toLowerCase();
      const monthKeywords = {
        'january': ['winter', 'cold', 'snow'],
        'february': ['winter', 'cold', 'snow'],
        'march': ['spring', 'bloom', 'mild'],
        'april': ['spring', 'bloom', 'cherry', 'mild'],
        'may': ['spring', 'bloom', 'warm'],
        'june': ['summer', 'warm', 'sunny'],
        'july': ['summer', 'hot', 'peak'],
        'august': ['summer', 'hot', 'peak'],
        'september': ['autumn', 'fall', 'mild'],
        'october': ['autumn', 'fall', 'cool'],
        'november': ['autumn', 'fall', 'cold'],
        'december': ['winter', 'cold', 'christmas']
      };
      
      const monthKeywordsList = monthKeywords[month] || [];
      monthKeywordsList.forEach(keyword => {
        if (attractionSeasonalNotes.includes(keyword)) {
          score += 1;
        }
      });
    }

    return score;
  }, [monthlyData]);

  // Get effective month for scoring
  const getEffectiveMonth = useCallback(() => {
    if (dateFilterType === 'exact' && selectedDate) {
      return getMonthFromDate(selectedDate);
    } else if (dateFilterType === 'range' && startDate && endDate) {
      // Use the start date for scoring (could be enhanced to average across range)
      return getMonthFromDate(startDate);
    } else if (dateFilterType === 'month') {
      return selectedMonth;
    }
    return 'all';
  }, [dateFilterType, selectedDate, startDate, endDate, selectedMonth, getMonthFromDate]);

  // Toggle expanded state for an attraction
  const toggleExpanded = (attractionId) => {
    setExpandedAttractions(prev => ({
      ...prev,
      [attractionId]: !prev[attractionId]
    }));
  };
  
  // Memoize heavy filtering and sorting operations
  const filteredAttractions = useMemo(() => {
    return dataSource
      .filter(attraction => 
        searchTerm === '' || attraction.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        attraction.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(attraction => ({
        ...attraction,
        seasonalScore: getSeasonalScore(attraction, getEffectiveMonth())
      }))
      .sort((a, b) => {
        if (dateFilterType !== 'none') {
          return (b.seasonalScore || 0) - (a.seasonalScore || 0);
        }
        const comp = (b.compositeScore || 0) - (a.compositeScore || 0);
        if (comp !== 0) return comp;
        return (b.ratings?.cultural_significance || 0) - (a.ratings?.cultural_significance || 0);
      });
  }, [dataSource, searchTerm, dateFilterType, getEffectiveMonth, getSeasonalScore]);
  
  // Format price range for display
  const getPriceIcon = (priceRange) => {
    switch(priceRange?.toLowerCase()) {
      case 'free':
        return '🆓';
      case 'budget':
        return '€';
      case 'moderate':
        return '€€';
      case 'expensive':
        return '€€€';
      default:
        return priceRange;
    }
  };
  
  // Determine best icon for the type of attraction
  const getTypeIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'monument':
        return '🏛️';
      case 'museum':
        return '🏛️';
      case 'cathedral':
      case 'basilica':
      case 'chapel':
        return '⛪';
      case 'park':
      case 'garden':
        return '🌳';
      case 'square':
        return '🏙️';
      case 'district':
        return '🏘️';
      case 'street':
        return '🛣️';
      case 'activity':
        return '🎭';
      case 'historical site':
      case 'historical district':
        return '🏺';
      case 'opera house':
      case 'concert hall':
        return '🎭';
      case 'cemetery':
        return '⚰️';
      case 'harbor':
        return '⚓';
      case 'zoo':
        return '🦁';
      case 'lake':
        return '🌊';
      case 'entertainment district':
        return '🎪';
      case 'architecture':
        return '🏢';
      case 'government building':
        return '🏛️';
      default:
        return '📍';
    }
  };

  // Get a background color based on the cultural significance
  const getSignificanceClass = (significance) => {
    if (!significance) return '';
    if (significance >= 9) return 'border-l-4 border-green-500';
    if (significance >= 8) return 'border-l-4 border-blue-500';
    if (significance >= 7) return 'border-l-4 border-indigo-400';
    return '';
  };

  // Get significance color for badges
  const getSignificanceColor = (significance) => {
    if (!significance) return 'bg-gray-100 text-gray-800';
    if (significance >= 9) return 'bg-green-100 text-green-800';
    if (significance >= 8) return 'bg-blue-100 text-blue-800';
    if (significance >= 7) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Get seasonal score color
  const getSeasonalScoreColor = (score) => {
    if (score >= 5) return 'bg-green-100 text-green-800';
    if (score >= 3) return 'bg-blue-100 text-blue-800';
    if (score >= 1) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-600';
  };

  // Get date filter display text
  const getDateFilterDisplay = () => {
    switch (dateFilterType) {
      case 'exact':
        return selectedDate ? `📅 ${new Date(selectedDate).toLocaleDateString()}` : '📅 Select Date';
      case 'range':
        return (startDate && endDate) ? `📅 ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}` : '📅 Select Date Range';
      case 'month':
        const month = months.find(m => m.value === selectedMonth);
        return month ? `${month.icon} ${month.label}` : '📅 Select Month';
      default:
        return '📅 No Date Filter';
    }
  };
  
  // Basic virtualization for grid/list: only render the first N, and progressively increase as user scrolls
  const [visibleCount, setVisibleCount] = useState(24);
  const containerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      if (el.getBoundingClientRect().bottom < window.innerHeight + 800) {
        setVisibleCount((n) => Math.min(n + 24, filteredAttractions.length));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [filteredAttractions.length]);

  return (
    <div className="p-6">
      {/* Enhanced Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {cityName} Attractions
        </h1>
        <p className="text-gray-600">
          Discover the best places to visit in {cityName} with our curated list of attractions
        </p>
      </div>

      {/* Filters (search only) */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col space-y-4">
          {/* Search bar */}
          <div className="w-full">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                </svg>
              </div>
              <input 
                type="search" 
                className="block w-full p-4 pl-12 text-gray-900 border border-gray-300 rounded-xl bg-white focus:ring-blue-500 focus:border-blue-500 shadow-sm" 
                placeholder="Search attractions in Paris..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        
          {/* View mode toggle (hidden when forceList) */}
          <div className="flex justify-between items-center">
            {!forceList && (
              <div className="flex space-x-2">
                <button
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setViewMode('grid')}
                >
                  Grid View
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setViewMode('list')}
                >
                  List View
                </button>
              </div>
            )}
            {/* Hide results count per request */}
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAttractions.slice(0, visibleCount).map((attraction, idx) => {
            const attractionId = attraction.id || `attraction-${idx}`;
            const isExpanded = expandedAttractions[attractionId] || false;
            
            return (
              <div key={attractionId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Card Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getTypeIcon(attraction.type)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{attraction.name}</h3>
                        <p className="text-sm text-gray-500">{attraction.type}</p>
                      </div>
                    </div>
                      <div className="flex flex-col items-end space-y-1">
                      <span className="text-lg">{getPriceIcon(attraction.price_range)}</span>
                        {typeof attraction.compositeScore === 'number' && !Number.isNaN(attraction.compositeScore) && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            {attraction.compositeScore.toFixed(2)}
                          </span>
                        )}
                      {attraction.ratings?.cultural_significance && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSignificanceColor(attraction.ratings.cultural_significance)}`}>
                          {attraction.ratings.cultural_significance.toFixed(1)}
                        </span>
                      )}
                      {dateFilterType !== 'none' && attraction.seasonalScore !== undefined && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeasonalScoreColor(attraction.seasonalScore)}`}>
                          {attraction.seasonalScore}★
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">
                        {attraction.ratings?.suggested_duration_hours ? `${attraction.ratings.suggested_duration_hours}h` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Duration</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">
                        {attraction.ratings?.cost_estimate ? `€${attraction.ratings.cost_estimate}` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Cost</div>
                    </div>
                  </div>
                  
                  {/* Description Preview and 3 aggregated factors */}
                  <p className="text-gray-700 text-sm mb-3">
                    {attraction.description}
                  </p>
                  {attraction.aggregates && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-sm font-semibold text-gray-900">
                          {typeof attraction.aggregates.culturalValue === 'number' ? attraction.aggregates.culturalValue.toFixed(2) : '—'}
                        </div>
                        <div className="text-[11px] text-gray-500">Cultural Impact</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-sm font-semibold text-gray-900">
                          {typeof attraction.aggregates.experienceQuality === 'number' ? attraction.aggregates.experienceQuality.toFixed(2) : '—'}
                        </div>
                        <div className="text-[11px] text-gray-500">Visit Quality</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-sm font-semibold text-gray-900">
                          {typeof attraction.aggregates.practicalEase === 'number' ? attraction.aggregates.practicalEase.toFixed(2) : '—'}
                        </div>
                        <div className="text-[11px] text-gray-500">Logistics & Value</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Map action only (no details toggle) */}
                  {attraction.latitude && attraction.longitude && (
                    <div className="flex">
                      <button 
                        className="py-2 px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        onClick={() => {
                          console.log(`Show ${attraction.name} on map at ${attraction.latitude}, ${attraction.longitude}`);
                        }}
                      >
                        Map
                      </button>
                    </div>
                  )}
                </div>

                {/* Always-on details section */}
                <div className="border-t border-gray-100 bg-gray-50 p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Best Time</h4>
                        <p className="text-sm text-gray-700">{attraction.best_time || '—'}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Seasonal Notes</h4>
                        <p className="text-sm text-gray-700">{attraction.seasonal_notes || '—'}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Booking Tips</h4>
                        <p className="text-sm text-gray-700">{attraction.booking_tips || '—'}</p>
                      </div>
                    </div>
                    {dateFilterType !== 'none' && attraction.seasonalScore !== undefined && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Seasonal Appeal</h4>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getSeasonalScoreColor(attraction.seasonalScore)}`}>
                            {attraction.seasonalScore} out of 5 stars
                          </span>
                          <span className="text-sm text-gray-600">for {getDateFilterDisplay()}</span>
                        </div>
                      </div>
                    )}
                    {attraction.factorScores && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Score Breakdown</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(attraction.factorScores).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between bg-white rounded border border-gray-200 px-2 py-1 text-xs">
                              <span className="text-gray-600 capitalize">{k.replace(/_/g, ' ')}</span>
                              <span className="font-semibold text-gray-900">{typeof v === 'number' ? v.toFixed(2) : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {attraction.website && (
                      <div>
                        <a href={attraction.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">Visit Website →</a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* List View */}
      {viewMode === 'list' && (
        <div ref={containerRef} className="space-y-4">
          {filteredAttractions.slice(0, visibleCount).map((attraction, idx) => {
            const attractionId = attraction.id || `attraction-${idx}`;
            const isExpanded = expandedAttractions[attractionId] || false;
            
            return (
              <div key={attractionId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl">{getTypeIcon(attraction.type)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{attraction.name}</h3>
                        <p className="text-sm text-gray-500">{attraction.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {attraction.ratings?.suggested_duration_hours ? `${attraction.ratings.suggested_duration_hours}h` : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">Duration</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {getPriceIcon(attraction.price_range)}
                        </div>
                        <div className="text-xs text-gray-500">Price</div>
                      </div>
                      {typeof attraction.compositeScore === 'number' && !Number.isNaN(attraction.compositeScore) && (
                        <div className="text-center">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            {attraction.compositeScore.toFixed(2)}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">Overall</div>
                        </div>
                      )}
                      {dateFilterType !== 'none' && attraction.seasonalScore !== undefined && (
                        <div className="text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeasonalScoreColor(attraction.seasonalScore)}`}>
                            {attraction.seasonalScore}★
                          </span>
                          <div className="text-xs text-gray-500 mt-1">Seasonal</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mt-3">{attraction.description}</p>
                  {attraction.aggregates && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-sm font-semibold text-gray-900">
                          {typeof attraction.aggregates.culturalValue === 'number' ? attraction.aggregates.culturalValue.toFixed(2) : '—'}
                        </div>
                        <div className="text-[11px] text-gray-500">Cultural Impact</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-sm font-semibold text-gray-900">
                          {typeof attraction.aggregates.experienceQuality === 'number' ? attraction.aggregates.experienceQuality.toFixed(2) : '—'}
                        </div>
                        <div className="text-[11px] text-gray-500">Visit Quality</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-sm font-semibold text-gray-900">
                          {typeof attraction.aggregates.practicalEase === 'number' ? attraction.aggregates.practicalEase.toFixed(2) : '—'}
                        </div>
                        <div className="text-[11px] text-gray-500">Logistics & Value</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-100 bg-gray-50 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Best Time to Visit</h4>
                      <p className="text-sm text-gray-700">{attraction.best_time || '—'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Seasonal Notes</h4>
                      <p className="text-sm text-gray-700">{attraction.seasonal_notes || '—'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Booking Tips</h4>
                      <p className="text-sm text-gray-700">{attraction.booking_tips || '—'}</p>
                    </div>
                  </div>
                  {dateFilterType !== 'none' && attraction.seasonalScore !== undefined && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-2">Seasonal Appeal</h4>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getSeasonalScoreColor(attraction.seasonalScore)}`}>
                          {attraction.seasonalScore} out of 5 stars
                        </span>
                        <span className="text-sm text-gray-600">for {getDateFilterDisplay()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Empty State */}
      {filteredAttractions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No attractions found</h3>
          <p className="text-gray-500">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
};

export default AttractionsList;