'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Bookmark, Check, Clock, MapPin, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';

const MAX_SEASONAL_SCORE = 8;

const clamp01 = (value) => Math.min(1, Math.max(0, value));

const normalizeValue = (value, bounds) => {
  if (typeof value !== 'number' || Number.isNaN(value) || !bounds) return null;
  const { min, max } = bounds;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (Math.abs(max - min) < 1e-6) return 0.5;
  return clamp01((value - min) / (max - min));
};

const CATEGORY_MULTIPLIERS = {
  hiddencorners: 0.86,
  daytrips_seasonal: 0.92,
  fooddrink: 0.95,
  parkgardens: 0.96,
  latenight: 0.97,
  afternoon: 1.02,
  evening: 1.03
};

const THEME_ADJUSTMENTS = {
  hidden_gem: -0.08,
  neighborhoods: -0.04,
  day_trip: -0.06,
  parks: -0.02,
  art: 0.02,
  history: 0.05,
  views: 0.05,
  nightlife: 0.02,
  food: 0.02
};

const ICONIC_KEYWORDS = [
  'eiffel',
  'louvre',
  'notre-dame',
  'arc de triomphe',
  'versailles',
  'sainte-chapelle',
  'sacre',
  'musée d\'orsay',
  'musee d\'orsay',
  'montmartre',
  'pompidou',
  'palace of versailles',
  'seine river cruise'
];

const SORT_OPTIONS = [
  { id: 'score-desc', label: 'Score: High to Low' },
  { id: 'score-asc', label: 'Score: Low to High' },
  { id: 'name-asc', label: 'Name: A → Z' },
  { id: 'name-desc', label: 'Name: Z → A' },
  { id: 'category-asc', label: 'Category A → Z' },
  { id: 'category-desc', label: 'Category Z → A' }
];

// Curated filter definitions
const CURATED_FILTERS = [
  { id: 'all', label: 'All', icon: '✨', description: 'Show all experiences' },
  { id: 'must-do', label: 'Must Do', icon: '⭐', description: 'Essential Paris experiences' },
  { id: 'free', label: 'Free', icon: '🆓', description: 'No cost to enjoy' },
  { id: 'summer', label: 'Best in Summer', icon: '☀️', description: 'Perfect for warm weather' },
  { id: 'winter', label: 'Best in Winter', icon: '❄️', description: 'Cozy indoor activities' },
  { id: 'rainy', label: 'Rainy Day', icon: '🌧️', description: 'Weather-proof options' },
  { id: 'family', label: 'Family Friendly', icon: '👨‍👩‍👧', description: 'Great for kids' },
];

// Helper to capitalize city name
const capitalizeCity = (name) => {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const AttractionsList = ({ attractions, categories, cityName, monthlyData, experiencesUrl = null, limit = Infinity }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterType, setDateFilterType] = useState('none');
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [experiences, setExperiences] = useState(null);
  const [quickFilters, setQuickFilters] = useState({ indoorOnly: false, outdoorOnly: false, freeOnly: false, shortVisitsOnly: false, budgetOnly: false });
  const [sortOption, setSortOption] = useState('score-desc');
  const [activeCategories, setActiveCategories] = useState([]);
  const [curatedFilter, setCuratedFilter] = useState('all');
  
  // New state for UI improvements
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Auth state for Supabase
  const { user, isSupabaseConfigured } = useAuth();
  
  // Properly capitalize city name
  const displayCityName = capitalizeCity(cityName);
  
  // Load favorites from Supabase (if logged in) or localStorage
  useEffect(() => {
    const loadFavorites = async () => {
      if (user && isSupabaseConfigured) {
        // Load from Supabase
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data, error } = await supabase
            .from('saved_experiences')
            .select('*')
            .eq('user_id', user.id)
            .eq('city_name', cityName);
          
          if (!error && data) {
            // Transform Supabase data to match local format
            const transformed = data.map(item => ({
              name: item.experience_name,
              category: item.category,
              subcategory: item.subcategory,
              description: item.description,
              ...(item.experience_data || {})
            }));
            setFavorites(transformed);
          }
        }
      } else {
        // Load from localStorage
        const stored = localStorage.getItem(`favorites-${cityName}`);
        if (stored) {
          try {
            setFavorites(JSON.parse(stored));
          } catch (e) {
            console.error('Failed to parse favorites', e);
          }
        }
      }
    };
    
    loadFavorites();
  }, [cityName, user, isSupabaseConfigured]);
  
  // Save/remove favorite - uses Supabase if logged in, localStorage otherwise
  const toggleFavorite = async (item) => {
    const itemId = item.name || item.activity || item.title;
    const isFav = favorites.some(f => (f.name || f.activity || f.title) === itemId);
    
    if (user && isSupabaseConfigured) {
      // Use Supabase
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      if (isFav) {
        // Remove from Supabase
        const { error } = await supabase
          .from('saved_experiences')
          .delete()
          .eq('user_id', user.id)
          .eq('city_name', cityName)
          .eq('experience_name', itemId);
        
        if (!error) {
          setFavorites(favorites.filter(f => (f.name || f.activity || f.title) !== itemId));
          showToast(`Removed "${itemId}" from favorites`);
        } else {
          console.error('Error removing favorite:', error);
        }
      } else {
        // Add to Supabase
        const { error } = await supabase
          .from('saved_experiences')
          .insert({
            user_id: user.id,
            city_name: cityName,
            experience_name: itemId,
            category: item.category || null,
            subcategory: item.subcategory || null,
            description: item.description || item.shortDescription || null,
            image: item.image || null,
            location: item.location || item.neighborhood || null,
            duration: item.duration || null,
            price_level: item.priceLevel || item.cost || null,
            rating: item.rating || null,
            tags: item.tags || item.themes || null,
            experience_data: item, // Store full item as JSON
          });
        
        if (!error) {
          setFavorites([...favorites, item]);
          showToast(`Saved "${itemId}" to favorites`);
        } else {
          console.error('Error saving favorite:', error);
        }
      }
    } else {
      // Use localStorage
      let newFavorites;
      if (isFav) {
        newFavorites = favorites.filter(f => (f.name || f.activity || f.title) !== itemId);
        showToast(`Removed "${itemId}" from favorites`);
      } else {
        newFavorites = [...favorites, item];
        showToast(`Saved "${itemId}" to favorites`);
      }
      
      setFavorites(newFavorites);
      localStorage.setItem(`favorites-${cityName}`, JSON.stringify(newFavorites));
    }
  };
  
  const isFavorite = (item) => {
    const itemId = item.name || item.activity || item.title;
    return favorites.some(f => (f.name || f.activity || f.title) === itemId);
  };
  
  // Toast notification
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const rankingLenses = useMemo(() => ([
    {
      id: 'overall',
      label: 'Balanced',
      description: 'Blend of cultural impact, experience quality, and practical ease'
    },
    {
      id: 'cultural',
      label: 'Cultural Icons',
      description: 'Places with standout heritage, storytelling, and wow-factor moments'
    },
    {
      id: 'experience',
      label: 'Immersive Moments',
      description: 'Experiences with strong on-the-ground vibes and visit quality'
    },
    {
      id: 'practical',
      label: 'Easy Wins',
      description: 'Great value, easy logistics, and weather-resistant picks'
    }
  ]), []);
  const [rankingLens, setRankingLens] = useState('overall');

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

  const computeAggregateFactors = useCallback((factors) => {
    if (!factors || typeof factors !== 'object') return null;
    const get = (k) => (typeof factors[k] === 'number' ? factors[k] : null);
    const avg = (keys) => {
      const vals = keys.map(get).filter((v) => typeof v === 'number');
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    return {
      culturalValue: avg(['cultural_historical_significance', 'uniqueness_to_paris', 'educational_value']),
      experienceQuality: avg(['visitor_experience_quality', 'crowd_management', 'family_friendliness', 'photo_instagram_appeal']),
      practicalEase: avg(['accessibility', 'weather_independence', 'value_for_money'])
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    async function load() {
      if (!experiencesUrl) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(experiencesUrl, { cache: 'no-store' });
        if (!res.ok) {
          setIsLoading(false);
          return;
        }
        const json = await res.json();
        const cats = json?.categories || {};
        const out = [];
        const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        Object.keys(cats).forEach((key) => {
          const arr = Array.isArray(cats[key]) ? cats[key] : [];
          arr.forEach((item, idx) => {
            const total = item?.scores?.total_score ?? 0;
            const { total_score, ...factors } = item?.scores || {};
            const factorScores = factors;
            const themes = Array.isArray(item?.themes) ? item.themes.filter(Boolean).map((t) => String(t).toLowerCase()) : [];
            out.push({
              id: `${slugify(item?.name)}-${idx}`,
              name: item?.name,
              description: item?.description,
              image: item?.image || item?.image_url || item?.photo || item?.photo_url || null,
              type: (item?.themes && item.themes[0]) || 'activity',
              category: key,
              themes,
              latitude: item?.lat,
              longitude: item?.lon,
              website: item?.booking_url || null,
              price_range: item?.pricing_tier || null,
              ratings: {
                cultural_significance: item?.scores?.cultural_historical_significance || null,
                suggested_duration_hours: item?.duration_minutes ? item.duration_minutes / 60 : null,
                cost_estimate: item?.estimated_cost_eur || null,
              },
              compositeScore: typeof total === 'number' ? Number(total) : 0,
              factorScores,
              aggregates: computeAggregateFactors(factorScores)
            });
          });
        });
        out.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
        const top = out.slice(0, limit);
        if (!cancelled) {
          setExperiences(top);
          setIsLoading(false);
        }
      } catch (_) {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [experiencesUrl, limit, computeAggregateFactors]);

  const dataSource = useMemo(() => {
    return Array.isArray(experiences) && experiences.length > 0 ? experiences : attractions;
  }, [experiences, attractions]);

  const categoryFilters = useMemo(() => {
    const collected = new Set();
    if (Array.isArray(categories)) {
      categories.forEach((cat) => {
        if (typeof cat === 'string' && cat.trim()) {
          collected.add(cat.trim());
        }
      });
    }
    if (collected.size === 0 && Array.isArray(dataSource)) {
      dataSource.forEach((item) => {
        if (item?.category && typeof item.category === 'string' && item.category.trim()) {
          collected.add(item.category.trim());
        }
      });
    }
    return Array.from(collected)
      .map((label) => ({
        id: label.toLowerCase(),
        label
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, dataSource]);

  const activeCategorySet = useMemo(() => new Set(activeCategories), [activeCategories]);

  const getMonthFromDate = useCallback((dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return monthNames[date.getMonth()];
  }, []);

  const isDateInRange = (dateString, start, end) => {
    if (!dateString || !start || !end) return false;
    const date = new Date(dateString);
    const startDate = new Date(start);
    const endDate = new Date(end);
    return date >= startDate && date <= endDate;
  };

  const getSeasonalScore = useCallback((attraction, month) => {
    if (month === 'all') return 0;
    const monthData = monthlyData?.[month.charAt(0).toUpperCase() + month.slice(1)];
    if (!monthData) return 0;

    let score = 0;
    if (attraction.indoor === false) {
      const weather = monthData.first_half?.weather || monthData.second_half?.weather;
      if (weather?.average_temperature) {
        const temp = weather.average_temperature;
        const highTemp = temp.high_celsius || parseInt(temp.high, 10);
        const lowTemp = temp.low_celsius || parseInt(temp.low, 10);
        if (Number.isFinite(highTemp) && Number.isFinite(lowTemp)) {
          const avgTemp = (highTemp + lowTemp) / 2;
          if (avgTemp >= 15 && avgTemp <= 25) score += 3;
          else if (avgTemp >= 10 && avgTemp <= 30) score += 2;
          else if (avgTemp >= 5 && avgTemp <= 35) score += 1;
        }
      }
    }

    const seasonalNotes = monthData.first_half?.seasonal_notes || monthData.second_half?.seasonal_notes || '';
    if (seasonalNotes.toLowerCase().includes((attraction.name || '').toLowerCase())) {
      score += 2;
    }

    if (attraction.seasonal_notes) {
      const attractionSeasonalNotes = attraction.seasonal_notes.toLowerCase();
      const monthKeywords = {
        january: ['winter', 'cold', 'snow'],
        february: ['winter', 'cold', 'snow'],
        march: ['spring', 'bloom', 'mild'],
        april: ['spring', 'bloom', 'cherry', 'mild'],
        may: ['spring', 'bloom', 'warm'],
        june: ['summer', 'warm', 'sunny'],
        july: ['summer', 'hot', 'peak'],
        august: ['summer', 'hot', 'peak'],
        september: ['autumn', 'fall', 'mild'],
        october: ['autumn', 'fall', 'cool'],
        november: ['autumn', 'fall', 'cold'],
        december: ['winter', 'cold', 'christmas']
      };
      (monthKeywords[month] || []).forEach((keyword) => {
        if (attractionSeasonalNotes.includes(keyword)) {
          score += 1;
        }
      });
    }

    return score;
  }, [monthlyData]);

  const overallScoreClass = (score) => {
    if (typeof score !== 'number') return 'bg-gray-100 text-gray-800';
    if (score >= 9) return 'bg-emerald-100 text-emerald-800';
    if (score >= 8) return 'bg-blue-100 text-blue-800';
    if (score >= 7) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getEffectiveMonth = useCallback(() => {
    if (dateFilterType === 'exact' && selectedDate) {
      return getMonthFromDate(selectedDate);
    }
    if (dateFilterType === 'range' && startDate && endDate) {
      return getMonthFromDate(startDate);
    }
    if (dateFilterType === 'month') {
      return selectedMonth;
    }
    return 'all';
  }, [dateFilterType, selectedDate, startDate, endDate, selectedMonth, getMonthFromDate]);

  const getPriceIcon = (priceRange) => {
    if (!priceRange) return '€€';
    const value = String(priceRange).toLowerCase();
    if (value.includes('free')) return '🆓';
    if (value.includes('budget') || value.includes('low')) return '€';
    if (value.includes('moderate')) return '€€';
    if (value.includes('expensive') || value.includes('premium') || value.includes('high')) return '€€€';
    return '€€';
  };

  const getTypeIcon = (type) => {
    switch (String(type || '').toLowerCase()) {
      case 'monument':
      case 'monument / tower':
      case 'tower':
      case 'government building':
        return '🏛️';
      case 'museum':
        return '🖼️';
      case 'cathedral':
      case 'basilica':
      case 'chapel':
        return '⛪';
      case 'park':
      case 'garden':
        return '🌳';
      case 'square':
      case 'plaza':
        return '🏙️';
      case 'district':
      case 'neighborhood':
        return '🏘️';
      case 'street':
        return '🛣️';
      case 'activity':
      case 'experience':
        return '🎯';
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
      default:
        return '📍';
    }
  };

  const getSignificanceColor = (significance) => {
    if (!significance) return 'bg-gray-100 text-gray-800';
    if (significance >= 9) return 'bg-green-100 text-green-800';
    if (significance >= 8) return 'bg-blue-100 text-blue-800';
    if (significance >= 7) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getSeasonalScoreColor = (score) => {
    if (score >= 5) return 'bg-green-100 text-green-800';
    if (score >= 3) return 'bg-blue-100 text-blue-800';
    if (score >= 1) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-600';
  };

  const formatDuration = (durationHours) => {
    const numeric = Number(durationHours);
    if (!Number.isFinite(numeric) || numeric <= 0) return 'Flexible';
    if (numeric < 1) return `${Math.round(numeric * 60)} mins`;
    if (Number.isInteger(numeric)) return `${numeric}h`;
    return `${numeric.toFixed(1)}h`;
  };

  const formatCost = (attraction) => {
    // Check for free experiences first
    if (attraction?.estimated_cost_eur === 0 || attraction?.pricing_tier === 'free') {
      return 'Free';
    }
    // Check estimated cost from data
    if (attraction?.estimated_cost_eur && attraction.estimated_cost_eur > 0) {
      return `~€${Math.round(attraction.estimated_cost_eur)}`;
    }
    const estimate = Number(attraction?.ratings?.cost_estimate);
    if (Number.isFinite(estimate) && estimate > 0) {
      return `~€${Math.round(estimate)}`;
    }
    if (Number.isFinite(estimate) && estimate === 0) {
      return 'Free';
    }
    if (attraction?.price_range) {
      const label = String(attraction.price_range);
      if (label.toLowerCase().includes('free')) return 'Free';
      if (label.length > 28) {
        return `${label.slice(0, 25).trimEnd()}…`;
      }
      return label;
    }
    return 'Varies';
  };

  const getPriceRangeScore = useCallback((priceRange) => {
    if (!priceRange) return 5;
    const normalized = String(priceRange).toLowerCase();
    if (normalized.includes('free')) return 9;
    if (normalized.includes('budget') || normalized.includes('low')) return 7.5;
    if (normalized.includes('moderate')) return 6;
    if (normalized.includes('premium') || normalized.includes('high') || normalized.includes('expensive')) return 4.5;
    return 5;
  }, []);

  const getRawMetrics = useCallback((attraction) => {
    if (!attraction || typeof attraction !== 'object') {
      return {
        cultural: null,
        experience: null,
        practical: null,
        composite: null
      };
    }

    const composites = typeof attraction?.compositeScore === 'number' ? attraction.compositeScore : null;
    const culturalAggregate = typeof attraction?.aggregates?.culturalValue === 'number' ? attraction.aggregates.culturalValue : null;
    const culturalFallback =
      typeof attraction?.ratings?.cultural_significance === 'number'
        ? attraction.ratings.cultural_significance
        : typeof attraction?.factorScores?.cultural_historical_significance === 'number'
          ? attraction.factorScores.cultural_historical_significance
          : null;

    const experienceAggregate = typeof attraction?.aggregates?.experienceQuality === 'number' ? attraction.aggregates.experienceQuality : null;
    const experienceFallbackCandidates = [
      typeof attraction?.factorScores?.visitor_experience_quality === 'number' ? attraction.factorScores.visitor_experience_quality : null,
      typeof attraction?.factorScores?.crowd_management === 'number' ? attraction.factorScores.crowd_management : null,
      typeof attraction?.factorScores?.family_friendliness === 'number' ? attraction.factorScores.family_friendliness : null,
      typeof attraction?.factorScores?.photo_instagram_appeal === 'number' ? attraction.factorScores.photo_instagram_appeal : null
    ].filter((v) => typeof v === 'number' && !Number.isNaN(v));

    const practicalAggregate = typeof attraction?.aggregates?.practicalEase === 'number' ? attraction.aggregates.practicalEase : null;

    const priceScore = getPriceRangeScore(attraction?.price_range);
    const duration = Number(attraction?.ratings?.suggested_duration_hours);
    let durationScore = null;
    if (Number.isFinite(duration)) {
      if (duration <= 1) durationScore = 9;
      else if (duration <= 1.5) durationScore = 8;
      else if (duration <= 2.5) durationScore = 7;
      else if (duration <= 4) durationScore = 6;
      else durationScore = Math.max(3, 10 - duration);
    }
    const indoorScore =
      attraction.indoor === true ? 8
        : attraction.indoor === false ? 6
          : 7;

    const practicalCandidates = [
      practicalAggregate,
      priceScore,
      durationScore,
      indoorScore
    ].filter((v) => typeof v === 'number' && !Number.isNaN(v));

    const average = (values) => {
      if (!values || values.length === 0) return null;
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    };

    return {
      cultural: culturalAggregate ?? culturalFallback ?? composites,
      experience: experienceAggregate ?? average(experienceFallbackCandidates) ?? composites,
      practical: practicalAggregate ?? average(practicalCandidates) ?? composites,
      composite: composites
    };
  }, [getPriceRangeScore]);

  const scoringBounds = useMemo(() => {
    if (!Array.isArray(dataSource) || dataSource.length === 0) {
      return {
        cultural: null,
        experience: null,
        practical: null,
        composite: null
      };
    }
    const metrics = dataSource.map(getRawMetrics);
    const computeBounds = (key) => {
      const values = metrics
        .map((metric) => metric[key])
        .filter((value) => typeof value === 'number' && !Number.isNaN(value));
      if (values.length === 0) return null;
      const min = Math.min(...values);
      const max = Math.max(...values);
      return {
        min,
        max
      };
    };
    return {
      cultural: computeBounds('cultural'),
      experience: computeBounds('experience'),
      practical: computeBounds('practical'),
      composite: computeBounds('composite')
    };
  }, [dataSource, getRawMetrics]);

  const getLensScore = useCallback((attraction, seasonalScore = 0) => {
    if (!attraction || typeof attraction !== 'object') return 0;

    const metrics = getRawMetrics(attraction);

    const culturalNorm = normalizeValue(metrics.cultural, scoringBounds.cultural);
    const experienceNorm = normalizeValue(metrics.experience, scoringBounds.experience);
    const practicalNorm = normalizeValue(metrics.practical, scoringBounds.practical);
    const compositeNorm = normalizeValue(metrics.composite, scoringBounds.composite);
    const fallbackNorm = compositeNorm ?? 0.5;
    const resolve = (value) => (value == null ? fallbackNorm : value);

    const balanced =
      resolve(culturalNorm) * 0.4 +
      resolve(experienceNorm) * 0.35 +
      resolve(practicalNorm) * 0.25;

    let lensNormalized;
    switch (rankingLens) {
      case 'cultural':
        lensNormalized = resolve(culturalNorm);
        break;
      case 'experience':
        lensNormalized = resolve(experienceNorm);
        break;
      case 'practical':
        lensNormalized = resolve(practicalNorm);
        break;
      default:
        lensNormalized = balanced;
        break;
    }

    lensNormalized = clamp01(lensNormalized);

    const categoryKey = typeof attraction.category === 'string'
      ? attraction.category.toLowerCase()
      : null;
    const categoryMultiplier = categoryKey && CATEGORY_MULTIPLIERS[categoryKey] ? CATEGORY_MULTIPLIERS[categoryKey] : 1;
    lensNormalized = clamp01(lensNormalized * categoryMultiplier);

    let themeList = [];
    if (Array.isArray(attraction.themes) && attraction.themes.length > 0) {
      themeList = attraction.themes;
    } else if (attraction.type) {
      themeList = [String(attraction.type).toLowerCase()];
    }
    const themeAdjustment = themeList.reduce((acc, theme) => acc + (THEME_ADJUSTMENTS[theme] || 0), 0);
    lensNormalized = clamp01(lensNormalized + themeAdjustment);

    const name = String(attraction.name || '').toLowerCase();
    if (ICONIC_KEYWORDS.some((keyword) => name.includes(keyword))) {
      lensNormalized = clamp01(lensNormalized + 0.08);
    }

    if (dateFilterType !== 'none') {
      const seasonalNormalized = clamp01((seasonalScore || 0) / MAX_SEASONAL_SCORE);
      const combined = lensNormalized * 0.7 + seasonalNormalized * 0.3;
      return clamp01(combined) * 10;
    }

    return lensNormalized * 10;
  }, [dateFilterType, rankingLens, getRawMetrics, scoringBounds]);

  const getDateFilterDisplay = () => {
    switch (dateFilterType) {
      case 'exact':
        return selectedDate ? `📅 ${new Date(selectedDate).toLocaleDateString()}` : '📅 Select Date';
      case 'range':
        return (startDate && endDate) ? `📅 ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}` : '📅 Select Date Range';
      case 'month': {
        const month = months.find((m) => m.value === selectedMonth);
        return month ? `${month.icon} ${month.label}` : '📅 Select Month';
      }
      default:
        return '📅 No Date Filter';
    }
  };

  // Curated filter matching function
  const matchesCuratedFilter = useCallback((attraction, filter) => {
    if (filter === 'all') return true;
    
    const scores = attraction.factorScores || attraction.scores || {};
    const name = (attraction.name || '').toLowerCase();
    const totalScore = attraction.compositeScore || scores.total_score || 0;
    const weatherIndependence = scores.weather_independence ?? 5;
    const familyFriendliness = scores.family_friendliness ?? 5;
    
    switch (filter) {
      case 'must-do':
        // High score (≥8) OR iconic landmark
        const isIconic = ICONIC_KEYWORDS.some(keyword => name.includes(keyword));
        return totalScore >= 8 || isIconic;
      
      case 'free':
        // Free experiences
        const isFreeExperience = attraction.estimated_cost_eur === 0 || 
          attraction.pricing_tier === 'free' ||
          String(attraction.price_range || '').toLowerCase().includes('free');
        return isFreeExperience;
        
      case 'summer':
        // Outdoor activities, lower weather independence (outdoor), good for warm weather
        // Also include parks, views, outdoor themes
        const isSummerTheme = (attraction.themes || []).some(t => 
          ['views', 'parks', 'neighborhoods', 'gardens'].includes(t?.toLowerCase())
        );
        const isOutdoor = weatherIndependence <= 6;
        const summerCategory = ['morning', 'afternoon', 'parkgardens'].includes(
          (attraction.category || '').toLowerCase()
        );
        return isOutdoor || isSummerTheme || summerCategory;
        
      case 'winter':
        // Indoor activities, high weather independence, or cozy indoor experiences
        const isIndoor = weatherIndependence >= 7;
        const winterTheme = (attraction.themes || []).some(t => 
          ['art', 'history', 'food', 'museums'].includes(t?.toLowerCase())
        );
        const winterCategory = ['afternoon', 'evening', 'latenight', 'fooddrink'].includes(
          (attraction.category || '').toLowerCase()
        );
        return isIndoor || winterTheme || winterCategory;
        
      case 'rainy':
        // Weather-independent activities (score >= 7)
        return weatherIndependence >= 7;
        
      case 'family':
        // Family-friendly activities (score >= 7)
        return familyFriendliness >= 7;
        
      default:
        return true;
    }
  }, []);

  const filteredAttractions = useMemo(() => {
    const effectiveMonth = getEffectiveMonth();
    return dataSource
      .filter((attraction) => {
        // Curated filter check
        if (curatedFilter !== 'all' && !matchesCuratedFilter(attraction, curatedFilter)) {
          return false;
        }
        
        const normalizedCategory = typeof attraction.category === 'string' ? attraction.category.trim().toLowerCase() : '';
        if (activeCategorySet.size > 0 && !activeCategorySet.has(normalizedCategory)) {
          return false;
        }

        if (searchTerm && !attraction.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !attraction.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        if (quickFilters.indoorOnly && attraction.indoor === false) return false;
        if (quickFilters.outdoorOnly && attraction.indoor === true) return false;
        if (quickFilters.freeOnly && String(attraction.price_range || '').toLowerCase().includes('free') === false) return false;
        if (quickFilters.budgetOnly && !['budget', 'free'].some((token) => String(attraction.price_range || '').toLowerCase().includes(token))) return false;
        if (quickFilters.shortVisitsOnly && !(Number(attraction?.ratings?.suggested_duration_hours) > 0 && Number(attraction?.ratings?.suggested_duration_hours) <= 1.5)) return false;

        if (dateFilterType === 'exact' && selectedDate) {
          if (attraction.available_dates && !attraction.available_dates.includes(selectedDate)) return false;
        } else if (dateFilterType === 'range' && startDate && endDate) {
          if (attraction.available_dates && !attraction.available_dates.some((date) => isDateInRange(date, startDate, endDate))) return false;
        } else if (dateFilterType === 'month' && selectedMonth !== 'all') {
          if (attraction.available_dates && !attraction.available_dates.some((date) => {
            const month = getMonthFromDate(date);
            return month === selectedMonth;
          })) {
            return false;
          }
        }

        return true;
      })
      .map((attraction) => {
        const seasonalScore = getSeasonalScore(attraction, effectiveMonth);
        const lensScore = getLensScore(attraction, seasonalScore);
        return {
          ...attraction,
          seasonalScore,
          lensScore
        };
      })
      .sort((a, b) => {
        const lensDiffDesc = (b.lensScore || 0) - (a.lensScore || 0);
        const lensDiffAsc = -lensDiffDesc;
        const seasonalDiffDesc = (b.seasonalScore || 0) - (a.seasonalScore || 0);
        const seasonalDiffAsc = -seasonalDiffDesc;
        const compDiffDesc = (b.compositeScore || 0) - (a.compositeScore || 0);
        const compDiffAsc = -compDiffDesc;
        const nameDiffAsc = String(a.name || '').localeCompare(String(b.name || ''));
        const nameDiffDesc = -nameDiffAsc;
        const categoryDiffAsc = String(a.category || '').localeCompare(String(b.category || ''));
        const categoryDiffDesc = -categoryDiffAsc;
        const culturalDiffDesc = (b.ratings?.cultural_significance || 0) - (a.ratings?.cultural_significance || 0);
        const culturalDiffAsc = -culturalDiffDesc;

        switch (sortOption) {
          case 'score-asc':
            if (lensDiffAsc !== 0) return lensDiffAsc;
            if (seasonalDiffAsc !== 0) return seasonalDiffAsc;
            if (compDiffAsc !== 0) return compDiffAsc;
            if (nameDiffAsc !== 0) return nameDiffAsc;
            return culturalDiffAsc;
          case 'name-asc':
            if (nameDiffAsc !== 0) return nameDiffAsc;
            if (categoryDiffAsc !== 0) return categoryDiffAsc;
            return lensDiffDesc;
          case 'name-desc':
            if (nameDiffDesc !== 0) return nameDiffDesc;
            if (categoryDiffDesc !== 0) return categoryDiffDesc;
            return lensDiffDesc;
          case 'category-asc':
            if (categoryDiffAsc !== 0) return categoryDiffAsc;
            if (nameDiffAsc !== 0) return nameDiffAsc;
            return lensDiffDesc;
          case 'category-desc':
            if (categoryDiffDesc !== 0) return categoryDiffDesc;
            if (nameDiffDesc !== 0) return nameDiffDesc;
            return lensDiffDesc;
          case 'score-desc':
          default:
            if (lensDiffDesc !== 0) return lensDiffDesc;
            if (seasonalDiffDesc !== 0) return seasonalDiffDesc;
            if (compDiffDesc !== 0) return compDiffDesc;
            if (nameDiffAsc !== 0) return nameDiffAsc;
            return culturalDiffDesc;
        }
      });
  }, [dataSource, searchTerm, quickFilters, dateFilterType, selectedDate, startDate, endDate, selectedMonth, getEffectiveMonth, getSeasonalScore, getLensScore, getMonthFromDate, activeCategorySet, sortOption, curatedFilter, matchesCuratedFilter]);

  const highlightAttractions = useMemo(() => filteredAttractions.slice(0, 4), [filteredAttractions]);
  const remainingAttractions = useMemo(() => filteredAttractions.slice(4), [filteredAttractions]);
  const activeLens = useMemo(() => rankingLenses.find((lens) => lens.id === rankingLens) || rankingLenses[0], [rankingLens, rankingLenses]);
  const hasActiveQuickFilters = useMemo(
    () => Object.values(quickFilters).some(Boolean) || searchTerm.trim() !== '' || dateFilterType !== 'none' || activeCategories.length > 0 || curatedFilter !== 'all',
    [quickFilters, searchTerm, dateFilterType, activeCategories, curatedFilter]
  );

  const [visibleCount, setVisibleCount] = useState(100);
  const containerRef = useRef(null);

  const handleCategoryToggle = useCallback((categoryId) => {
    setActiveCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  }, []);

  const clearCategoryFilters = useCallback(() => {
    setActiveCategories([]);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      if (el.getBoundingClientRect().bottom < window.innerHeight + 800) {
        setVisibleCount((n) => Math.min(n + 24, remainingAttractions.length));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [remainingAttractions.length]);

  useEffect(() => {
    setVisibleCount(100);
  }, [remainingAttractions.length]);

  // Score factors for display
  const scoreFactors = [
    { key: 'uniqueness_to_paris', label: 'Uniqueness to Paris', weight: 15, icon: '✨' },
    { key: 'visitor_experience_quality', label: 'Experience Quality', weight: 15, icon: '⭐' },
    { key: 'cultural_historical_significance', label: 'Cultural Significance', weight: 12, icon: '🏛️' },
    { key: 'value_for_money', label: 'Value for Money', weight: 12, icon: '💰' },
    { key: 'photo_instagram_appeal', label: 'Photo Appeal', weight: 10, icon: '📸' },
    { key: 'accessibility', label: 'Accessibility', weight: 10, icon: '♿' },
    { key: 'crowd_management', label: 'Crowd Levels', weight: 8, icon: '👥' },
    { key: 'weather_independence', label: 'Weather Proof', weight: 8, icon: '🌧️' },
    { key: 'family_friendliness', label: 'Family Friendly', weight: 5, icon: '👨‍👩‍👧' },
    { key: 'educational_value', label: 'Educational Value', weight: 5, icon: '📚' },
  ];

  // Score display component - simple grid, larger text
  const ScoreDisplay = ({ factorScores }) => (
    <div className="pt-4 border-t border-gray-100">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {scoreFactors.slice(0, 6).map(({ key, label, icon }) => {
          const value = factorScores?.[key] ?? 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-lg shrink-0">{icon}</span>
              <span className="text-sm text-gray-700 flex-1">{label}</span>
              <span className="text-sm font-bold text-gray-900">{value}/10</span>
            </div>
          );
        })}
      </div>
    </div>
  );
  
  // Tips overlay component - shows on photo hover
  const TipsOverlay = ({ tips }) => {
    if (!tips || tips.length === 0) return null;
    return (
      <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-xl border border-gray-100 w-full">
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">💡</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };
  
  // Generate practical tips based on experience data - detailed and actionable
  const generateTips = (attraction) => {
    const tips = [];
    
    // Get scores from either factorScores or scores object
    const scores = attraction.factorScores || attraction.scores || {};
    const weatherScore = scores.weatherIndependence || scores.weather_independence;
    const accessScore = scores.accessibility;
    const crowdScore = scores.crowdManagement || scores.crowd_management;
    const name = attraction.name?.toLowerCase() || '';
    
    // Specific tips for known attractions
    if (name.includes('place du tertre') || name.includes('street performers')) {
      tips.push('The square gets packed midday—visit after 6pm when day-trippers leave and the evening performers arrive.');
      tips.push('Café prices are steep here; grab a cheaper drink on nearby Rue Lepic and return to watch the show.');
    } else if (name.includes('sacré') || name.includes('montmartre')) {
      if (accessScore && accessScore <= 7) {
        tips.push('The 270 steps can be tiring—take the Montmartre funicular (€2.15, included with metro pass) if you prefer.');
      }
      tips.push('Arrive before 9am to catch the basilica in peaceful morning light, before tour groups arrive.');
    } else if (name.includes('eiffel')) {
      tips.push('Book summit tickets 2–3 months ahead online (€29.40) to skip the 2+ hour queues.');
      tips.push('The hourly sparkle show runs for 5 minutes after sunset—best viewed from Trocadéro.');
    } else if (name.includes('louvre')) {
      tips.push('Skip the pyramid queue—enter via the underground Carrousel du Louvre mall or the less-crowded Porte des Lions.');
      tips.push('Free for under-26 EU residents and everyone on the first Saturday evening of each month (6–9:45pm).');
      tips.push('Download the free Louvre app for self-guided routes; the "Masterpieces" trail takes about 90 minutes.');
    } else if (name.includes('orsay')) {
      tips.push('Head straight to the 5th floor when doors open at 9:30am—the clock views are magical in morning light.');
      tips.push('Free for under-26 EU residents; Thursdays stay open until 9:45pm with smaller evening crowds.');
    } else if (name.includes('pantheon') || name.includes('panthéon')) {
      tips.push('Dome access runs April–October only and requires 206 steps—arrive early as slots fill up fast.');
      tips.push('Free on the first Sunday of each month (Nov–March) and for under-26 EU residents year-round.');
    } else if (name.includes('moonlit montmartre') || (name.includes('montmartre') && name.includes('walk') && (name.includes('night') || name.includes('moon')))) {
      tips.push('Start around 10pm when restaurants empty and streets quiet down—the atmosphere peaks between 11pm and midnight.');
      tips.push('Wear sturdy shoes for uneven cobblestones and steep hills; the Rue Foyatier staircase can be slippery when wet.');
      tips.push('For a perfect finale, reserve €35 tickets to Au Lapin Agile—the intimate 90-minute cabaret is a time capsule.');
    } else if (name.includes('caves du louvre') || (name.includes('wine tasting') && name.includes('louvre'))) {
      tips.push('Book the "French Wine Exploration" (€39) for the best intro, or splurge on "Create Your Own Wine" (€65) to take home a personalized bottle.');
      tips.push('Sessions fill up fast—reserve 3–5 days ahead online, especially for weekend afternoons.');
      tips.push('Eat a light lunch beforehand; the cheese pairings are generous but won\'t fully line your stomach for five wines.');
    } else if (name.includes('seine') && name.includes('cruise')) {
      tips.push('Evening cruises offer the best views as monuments light up—book Bateaux Mouches or Vedettes du Pont Neuf.');
    } else if (name.includes('canal saint-martin') && name.includes('morning')) {
      tips.push('Start at Place de la République and walk north—the light is best on the Quai de Valmy side before noon.');
      tips.push('Ten Belles (10 Rue de la Grange aux Belles) serves some of Paris\'s best coffee—get there before 9am.');
      tips.push('Watch for the swing bridges opening—boats pass through the locks roughly every 20 minutes in summer.');
    } else if (name.includes('canal saint-martin') || (name.includes('apéro') && name.includes('canal'))) {
      tips.push('Grab wine at Le Verre Volé (67 Rue de Lancry) and cheese at Fromagerie Tentation—both a short walk from the canal.');
      tips.push('Best spots: the steps near Hôtel du Nord or the Passerelle Alibert footbridge for sunset views.');
      tips.push('Bring a corkscrew and napkins—and take your empties; locals respect the quays.');
    } else if (name.includes('pont des arts')) {
      tips.push('Arrive 30 minutes before sunset to claim a prime spot—the bridge gets crowded at golden hour.');
      tips.push('Street vendors on the Left Bank sell wine by the glass; bring your own picnic for better value.');
      tips.push('Stay after sunset to watch the Eiffel Tower sparkle at the top of each hour.');
    } else if (name.includes('pompidou')) {
      tips.push('Free for under-26 EU residents; free for everyone on the first Sunday of each month.');
      tips.push('The rooftop restaurant has the same views as the 6th floor—grab a drink even without museum entry.');
      tips.push('Skip the ground floor queue by booking timed tickets online; Thursday evenings (until 9pm) are quieter.');
    } else if (name.includes('sainte-chapelle') || name.includes('stained glass')) {
      tips.push('Book the 9am slot online—morning sun through east-facing windows creates the most magical light.');
      tips.push('Combo ticket with Conciergerie (€18.50) saves money and skips both queues.');
      tips.push('Sunny days are essential; overcast skies mute the colors dramatically. Check the forecast.');
    } else if (name.includes('arts et métiers') || name.includes('arts et metiers')) {
      tips.push('Free for under-26 EU residents and everyone on the first Sunday of each month.');
      tips.push('Don\'t miss the chapel nave—Foucault\'s pendulum and Blériot\'s plane are the showstoppers.');
      tips.push('The Arts et Métiers metro station is themed to the museum—worth a look even if you\'re not riding.');
    } else if (name.includes('saint-ouen') || name.includes('flea market')) {
      tips.push('Arrive by 9am Saturday for first pick—dealers set up early and the best pieces go fast.');
      tips.push('Take Metro Line 4 to Porte de Clignancourt; the market is a 5-minute walk north.');
      tips.push('Haggle respectfully—start at 30% below asking price and meet in the middle. Cash is king.');
    } else if (name.includes('île saint-louis') || name.includes('ile saint-louis')) {
      tips.push('Walk the lower quays (stairs near Pont Marie) for the most romantic Seine views and fewer crowds.');
      tips.push('Berthillon closes Mon–Tue, but nearby shops on the same street sell the same ice cream.');
      tips.push('The western tip at sunset offers a perfect view of Notre-Dame silhouetted against the sky.');
    } else if (name.includes('hôtel de ville') || name.includes('hotel de ville')) {
      tips.push('Check paris.fr for current exhibitions—shows change every few months and are always free.');
      tips.push('Enter via the main facade on Place de l\'Hôtel de Ville; bring ID as security checks bags.');
      tips.push('The esplanade hosts a free ice rink (Dec–Mar) and beach volleyball (Jul–Aug)—combine with your visit.');
    } else if (name.includes('zadkine')) {
      tips.push('Combine with Luxembourg Gardens (2-minute walk)—the perfect pairing for a Left Bank afternoon.');
      tips.push('The garden is best in late spring when wisteria blooms frame the sculptures.');
      tips.push('Closed Mondays; free entry but temporary exhibitions may have a small fee.');
    } else if (name.includes('saint-germain') && name.includes('boulevard')) {
      tips.push('Start at Saint-Germain-des-Prés metro—the church and famous cafés are right at the exit.');
      tips.push('Café de Flore and Les Deux Magots are pricey (€8 espresso)—worth one visit for the history.');
      tips.push('Duck into Rue de Buci for cheaper lunch spots and a lively street market (mornings).');
    } else {
      // Generic but helpful tips based on data
      
      // Weather/timing tips
      if (attraction.best_time === 'morning') {
        tips.push('Morning visits offer the best experience—softer light and smaller crowds before 10am.');
      } else if (attraction.best_time === 'evening' || attraction.best_time === 'sunset') {
        tips.push('Plan to arrive 30–45 minutes before sunset for the magical golden hour atmosphere.');
      }
      
      // Weather independence
      if (weatherScore && weatherScore <= 5) {
        tips.push('This is an outdoor experience—check the forecast and have a covered backup nearby.');
      } else if (weatherScore && weatherScore >= 8) {
        tips.push('Mostly indoors, making it a reliable option for rainy days.');
      }
      
      // Accessibility with practical alternatives
      if (accessScore && accessScore <= 5) {
        tips.push('Involves significant stairs or walking—check if elevator access is available before visiting.');
      }
      
      // Cost tips with context
      if (attraction.estimated_cost_eur === 0 || attraction.pricing_tier === 'free') {
        tips.push('Free to visit—bring a blanket or snacks to make the most of your time here.');
      } else if (attraction.estimated_cost_eur && attraction.estimated_cost_eur > 15) {
        tips.push(`Entry is around €${attraction.estimated_cost_eur}—book online to save time and sometimes get a discount.`);
      }
      
      // Crowd management
      if (crowdScore && crowdScore <= 5) {
        tips.push('Can get very crowded—weekday mornings or the last hour before closing are typically quieter.');
      }
    }
    
    return tips.slice(0, 2); // Return max 2 tips
  };

  const renderHighlightCard = (attraction, index) => {
    if (!attraction) return null;
    const attractionId = attraction.id || `highlight-${index}`;

    return (
      <div
        key={`highlight-${attractionId}`}
        className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        {/* Image Section - Tall format for maximum photo visibility */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
          {attraction.image ? (
            <Image
              src={attraction.image}
              alt={attraction.name}
              fill
              sizes="(min-width: 1280px) 400px, (min-width: 768px) 45vw, 95vw"
              className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
              {getTypeIcon(attraction.type)}
            </div>
          )}
          
          {/* Top Badge */}
          <div className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm z-10">
            #{index + 1} Top Pick
          </div>
          
          {/* Favorite button - always visible */}
          <button 
            onClick={(e) => { e.stopPropagation(); toggleFavorite(attraction); }}
            className={`absolute top-3 right-3 z-10 h-8 w-8 rounded-full backdrop-blur-sm border shadow-sm flex items-center justify-center transition-colors ${
              isFavorite(attraction) 
                ? 'bg-blue-500 border-blue-600 text-white' 
                : 'bg-white/95 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
            }`}
            aria-label={isFavorite(attraction) ? "Remove from favorites" : "Save to favorites"}
          >
            <Bookmark className={`h-4 w-4 ${isFavorite(attraction) ? 'fill-white text-white' : 'text-gray-600'}`} />
          </button>
          
          {/* Tips Overlay on hover */}
          <TipsOverlay tips={generateTips(attraction)} />
        </div>
        
        {/* Content Section */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 leading-snug">{attraction.name}</h3>
            {attraction.category && (
              <p className="text-xs text-gray-500 mt-1">{attraction.category}</p>
            )}
          </div>

          {attraction.description && (
            <p className="text-sm text-gray-600">{attraction.description}</p>
          )}

          {/* Info Row - without redundant location */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              {formatDuration(attraction?.ratings?.suggested_duration_hours || attraction?.duration_minutes / 60)}
            </span>
            {attraction.arrondissement && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {attraction.arrondissement} arr.
              </span>
            )}
          </div>
          
          {/* Scores inline */}
          {(attraction.factorScores || attraction.scores) && (
            <ScoreDisplay factorScores={attraction.factorScores || attraction.scores} />
          )}
          
          {/* Cost & Website */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-900">{formatCost(attraction)}</span>
            {attraction.website && (
              <a
                href={attraction.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Book / Visit →
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderExperienceCard = (attraction, index, offset = 0) => {
    if (!attraction) return null;
    const attractionId = attraction.id || `experience-${offset + index}`;
    const tips = generateTips(attraction);

    return (
      <div
        key={attractionId}
        className="group rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row">
          {/* Image - Large tall format for maximum photo visibility */}
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100 sm:w-80 shrink-0">
            {attraction.image ? (
              <Image
                src={attraction.image}
                alt={attraction.name}
                fill
                sizes="(min-width: 1280px) 320px, (min-width: 768px) 280px, 100vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
                {getTypeIcon(attraction.type)}
              </div>
            )}
            
            {/* Favorite button - always visible */}
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFavorite(attraction); }}
              className={`absolute top-3 right-3 z-10 h-8 w-8 rounded-full backdrop-blur-sm border shadow-sm flex items-center justify-center transition-colors ${
                isFavorite(attraction) 
                  ? 'bg-blue-500 border-blue-600 text-white' 
                  : 'bg-white/95 border-gray-200 hover:bg-blue-50'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${isFavorite(attraction) ? 'fill-white' : 'text-gray-600'}`} />
            </button>
            
            {/* Tips Overlay on hover */}
            <TipsOverlay tips={tips} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 leading-snug">{attraction.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{attraction.category}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-base font-semibold text-gray-900">{formatCost(attraction)}</span>
              </div>
            </div>

            {attraction.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{attraction.description}</p>
            )}

            {/* Info Row - without redundant location */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-gray-400" />
                {formatDuration(attraction?.ratings?.suggested_duration_hours || attraction?.duration_minutes / 60)}
              </span>
              {attraction.arrondissement && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {attraction.arrondissement} arr.
                </span>
              )}
            </div>
            
            {/* Scores inline */}
            {(attraction.factorScores || attraction.scores) && (
              <ScoreDisplay factorScores={attraction.factorScores || attraction.scores} />
            )}

            {/* Website link if available */}
            {attraction.website && (
              <div className="pt-2">
                <a
                  href={attraction.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Book / Visit site →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="h-32 bg-gray-200" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 flex gap-4">
            <div className="h-36 w-44 bg-gray-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-1/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Simplified Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Discover {displayCityName}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredAttractions.length} experiences to explore
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveQuickFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setQuickFilters({ indoorOnly: false, outdoorOnly: false, freeOnly: false, shortVisitsOnly: false, budgetOnly: false });
                setDateFilterType('none');
                setSelectedMonth('all');
                setActiveCategories([]);
                setCuratedFilter('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Curated Collection Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {CURATED_FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => setCuratedFilter(filter.id)}
              className={`group flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                curatedFilter === filter.id
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={filter.description}
            >
              <span className={`text-base transition-transform duration-200 ${curatedFilter === filter.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {filter.icon}
              </span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
        
        {/* Active filter info + Sort */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {curatedFilter !== 'all' ? (
              <>
                <span className="text-lg">{CURATED_FILTERS.find(f => f.id === curatedFilter)?.icon}</span>
                <span>{CURATED_FILTERS.find(f => f.id === curatedFilter)?.description}</span>
                <span className="text-gray-300">•</span>
              </>
            ) : null}
            <span className="font-medium text-gray-900">{filteredAttractions.length} experiences</span>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : highlightAttractions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Spotlight picks</h2>
          <div className="space-y-4">
            {highlightAttractions.map((attraction, index) => renderExperienceCard(attraction, index, 0))}
          </div>
        </section>
      )}

      {filteredAttractions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center">
          <div className="text-4xl">🧭</div>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">No experiences match right now</h3>
          <p className="mt-2 text-sm text-slate-600">
            Try clearing a filter or widening your search — we&apos;ll surface fresh ideas instantly.
          </p>
        </div>
      ) : (
        <section ref={containerRef} className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-slate-900">All curated experiences</h2>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500 md:text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                {filteredAttractions.length} total
              </span>
              {dateFilterType !== 'none' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                  Focused on {getDateFilterDisplay()}
                </span>
              )}
            </div>
          </div>

          {remainingAttractions.length > 0 ? (
            <div className="space-y-4">
              {remainingAttractions.slice(0, visibleCount).map((attraction, index) =>
                renderExperienceCard(attraction, index, highlightAttractions.length)
              )}
            </div>
          ) : (
            highlightAttractions.length > 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-6 text-sm text-gray-600">
                You&apos;ve already seen every standout for this lens in the spotlight section above.
              </div>
            )
          )}
        </section>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <Check className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttractionsList;
