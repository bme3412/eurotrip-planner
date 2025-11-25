'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';

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

const AttractionsList = ({ attractions, categories, cityName, monthlyData, experiencesUrl = null, limit = 50 }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAttractions, setExpandedAttractions] = useState({});
  const [dateFilterType, setDateFilterType] = useState('none');
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [experiences, setExperiences] = useState(null);
  const [quickFilters, setQuickFilters] = useState({ indoorOnly: false, outdoorOnly: false, freeOnly: false, shortVisitsOnly: false, budgetOnly: false });
  const [sortOption, setSortOption] = useState('score-desc');
  const [activeCategories, setActiveCategories] = useState([]);

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
        if (!cancelled) setExperiences(top);
      } catch (_) {
        // ignore fetch errors for now
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

  const toggleExpanded = (attractionId) => {
    setExpandedAttractions((prev) => ({
      ...prev,
      [attractionId]: !prev[attractionId]
    }));
  };

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
    const estimate = Number(attraction?.ratings?.cost_estimate);
    if (Number.isFinite(estimate) && estimate >= 0) {
      return `~€${Math.round(estimate)}`;
    }
    if (attraction?.price_range) {
      const label = String(attraction.price_range);
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

  const filteredAttractions = useMemo(() => {
    const effectiveMonth = getEffectiveMonth();
    return dataSource
      .filter((attraction) => {
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
  }, [dataSource, searchTerm, quickFilters, dateFilterType, selectedDate, startDate, endDate, selectedMonth, getEffectiveMonth, getSeasonalScore, getLensScore, getMonthFromDate, activeCategorySet, sortOption]);

  const highlightAttractions = useMemo(() => filteredAttractions.slice(0, 4), [filteredAttractions]);
  const remainingAttractions = useMemo(() => filteredAttractions.slice(4), [filteredAttractions]);
  const activeLens = useMemo(() => rankingLenses.find((lens) => lens.id === rankingLens) || rankingLenses[0], [rankingLens, rankingLenses]);
  const hasActiveQuickFilters = useMemo(
    () => Object.values(quickFilters).some(Boolean) || searchTerm.trim() !== '' || dateFilterType !== 'none' || activeCategories.length > 0,
    [quickFilters, searchTerm, dateFilterType, activeCategories]
  );

  const [visibleCount, setVisibleCount] = useState(24);
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
    setVisibleCount(24);
  }, [remainingAttractions.length]);

  const renderHighlightCard = (attraction, index) => {
    if (!attraction) return null;
    const attractionId = attraction.id || `highlight-${index}`;
    const isExpanded = expandedAttractions[attractionId] || false;
    const showSeasonal = dateFilterType !== 'none' && typeof attraction.seasonalScore === 'number';

    return (
      <div
        key={`highlight-${attractionId}`}
        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
      >
        <div className="relative h-32 w-full overflow-hidden bg-slate-100">
          {attraction.image ? (
            <Image
              src={attraction.image}
              alt={attraction.name}
              fill
              sizes="(min-width: 1280px) 360px, (min-width: 768px) 40vw, 90vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl text-slate-400">
              {getTypeIcon(attraction.type)}
            </div>
          )}
          <div className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            Top pick #{index + 1}
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 line-clamp-2">{attraction.name}</h3>
              <div className="mt-1 flex flex-wrap gap-1 text-[11px] uppercase tracking-wide text-slate-500">
                {attraction.category && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    {attraction.category}
                  </span>
                )}
                {attraction.type && (
                  <span className="rounded-full bg-slate-50 px-2 py-0.5">
                    {attraction.type}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {typeof attraction.lensScore === 'number' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {activeLens.label} {attraction.lensScore.toFixed(1)}
                </span>
              )}
              {showSeasonal && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getSeasonalScoreColor(attraction.seasonalScore)}`}>
                  {typeof attraction.seasonalScore === 'number' ? attraction.seasonalScore.toFixed(1) : attraction.seasonalScore}★ seasonal
                </span>
              )}
            </div>
          </div>

          {attraction.description && (
            <p className={`text-sm text-slate-600 ${isExpanded ? '' : 'line-clamp-3'}`}>
              {attraction.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
              {attraction.indoor === true ? '🛋️ Indoor friendly' : attraction.indoor === false ? '🌤️ Outdoor' : '🌆 Mixed setting'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
              ⏱ {formatDuration(attraction?.ratings?.suggested_duration_hours)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
              💶 {formatCost(attraction)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => toggleExpanded(attractionId)}
              className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
            >
              {isExpanded ? 'Hide details' : 'Quick details'}
            </button>
            {attraction.website && (
              <a
                href={attraction.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
              >
                Visit site →
              </a>
            )}
          </div>

          {isExpanded && (
            <div className="space-y-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
              {attraction.best_time && (
                <p>
                  <span className="font-semibold text-slate-700">Best time:</span> {attraction.best_time}
                </p>
              )}
              {attraction.seasonal_notes && (
                <p>
                  <span className="font-semibold text-slate-700">Seasonal note:</span> {attraction.seasonal_notes}
                </p>
              )}
              {attraction.booking_tips && (
                <p>
                  <span className="font-semibold text-slate-700">Booking tip:</span> {attraction.booking_tips}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExperienceCard = (attraction, index, offset = 0) => {
    if (!attraction) return null;
    const attractionId = attraction.id || `experience-${offset + index}`;
    const isExpanded = expandedAttractions[attractionId] || false;
    const showSeasonal = dateFilterType !== 'none' && typeof attraction.seasonalScore === 'number';

    return (
      <div
        key={attractionId}
        className="group rounded-2xl border border-slate-200 bg-white/95 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-lg"
      >
        <div className="flex flex-col gap-4 p-5 md:flex-row">
          <div className="relative h-36 w-full overflow-hidden rounded-xl bg-slate-100 md:w-44">
            {attraction.image ? (
              <Image
                src={attraction.image}
                alt={attraction.name}
                fill
                sizes="(min-width: 1280px) 256px, (min-width: 768px) 200px, 90vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-slate-400">
                {getTypeIcon(attraction.type)}
              </div>
            )}
            {typeof attraction.lensScore === 'number' && (
              <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                {activeLens.label}
                <span>{attraction.lensScore.toFixed(1)}</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {attraction.category && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                      {attraction.category}
                    </span>
                  )}
                  {attraction.type && (
                    <span className="rounded-full bg-slate-50 px-2 py-0.5">{attraction.type}</span>
                  )}
                  {attraction.neighborhood && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                      {attraction.neighborhood}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 leading-tight">{attraction.name}</h3>
              </div>

              <div className="flex flex-col items-end gap-2 text-sm">
                {attraction.ratings?.cultural_significance && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${getSignificanceColor(attraction.ratings.cultural_significance)}`}>
                    Culture {attraction.ratings.cultural_significance.toFixed(1)}
                  </span>
                )}
                {showSeasonal && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${getSeasonalScoreColor(attraction.seasonalScore)}`}>
                    Seasonal {typeof attraction.seasonalScore === 'number' ? attraction.seasonalScore.toFixed(1) : attraction.seasonalScore}★
                  </span>
                )}
                {typeof attraction.compositeScore === 'number' && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${overallScoreClass(attraction.compositeScore)}`}>
                    Composite {attraction.compositeScore.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {attraction.description && (
              <p className={`text-sm text-slate-600 ${isExpanded ? '' : 'line-clamp-3'}`}>
                {attraction.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                {attraction.indoor === true ? '🛋️ Indoor friendly' : attraction.indoor === false ? '🌤️ Outdoor' : '🌆 Mixed setting'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                ⏱ {formatDuration(attraction?.ratings?.suggested_duration_hours)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                💶 {formatCost(attraction)}
              </span>
              {attraction.arrondissement && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                  📍 {attraction.arrondissement}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => toggleExpanded(attractionId)}
                className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
              >
                {isExpanded ? 'Hide details' : 'More about this spot'}
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {attraction.latitude && attraction.longitude && (
                  <button
                    type="button"
                    onClick={() => console.log('map', attraction.latitude, attraction.longitude)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Show on map
                  </button>
                )}
                {attraction.website && (
                  <a
                    href={attraction.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-blue-600 px-4 py-1 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Visit site
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-4 text-sm text-slate-600">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Best Time</h4>
                <p className="mt-1 text-slate-700">{attraction.best_time || 'Flexible'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seasonal Notes</h4>
                <p className="mt-1 text-slate-700">{attraction.seasonal_notes || 'No major callouts'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking Tips</h4>
                <p className="mt-1 text-slate-700">{attraction.booking_tips || 'Walk-up friendly'}</p>
              </div>
            </div>

            {(attraction.aggregates || attraction.factorScores) && (
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                <div className="rounded-xl bg-white/90 p-3 text-center">
                  <div className="text-sm font-semibold text-slate-900">
                    {attraction.aggregates?.culturalValue
                      ? attraction.aggregates.culturalValue.toFixed(2)
                      : attraction.factorScores?.cultural_historical_significance ?? '—'}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Cultural Impact</div>
                </div>
                <div className="rounded-xl bg-white/90 p-3 text-center">
                  <div className="text-sm font-semibold text-slate-900">
                    {attraction.aggregates?.experienceQuality
                      ? attraction.aggregates.experienceQuality.toFixed(2)
                      : attraction.factorScores?.visitor_experience_quality ?? '—'}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Visit Quality</div>
                </div>
                <div className="rounded-xl bg-white/90 p-3 text-center">
                  <div className="text-sm font-semibold text-slate-900">
                    {attraction.aggregates?.practicalEase
                      ? attraction.aggregates.practicalEase.toFixed(2)
                      : attraction.factorScores?.accessibility ?? '—'}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Practical Ease</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">
            {cityName} Experiences & Attractions
          </h1>
          <p className="text-sm text-slate-600 md:text-base">
            Crafted for curious travelers with a{' '}
            <span className="font-semibold text-slate-800">{activeLens.label.toLowerCase()}</span>{' '}
            lens.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500 md:text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            {filteredAttractions.length} matches
          </span>
          {dateFilterType !== 'none' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
              {getDateFilterDisplay()}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
        <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
          <div className="space-y-4">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                <svg className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                </svg>
              </span>
              <input
                type="search"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 md:text-base"
                placeholder={`Search experiences in ${cityName}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setQuickFilters((f) => ({ ...f, indoorOnly: !f.indoorOnly, outdoorOnly: false }))}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  quickFilters.indoorOnly
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Indoor friendly
              </button>
              <button
                type="button"
                onClick={() => setQuickFilters((f) => ({ ...f, outdoorOnly: !f.outdoorOnly, indoorOnly: false }))}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  quickFilters.outdoorOnly
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Outdoor highlights
              </button>
              <button
                type="button"
                onClick={() => setQuickFilters((f) => ({ ...f, shortVisitsOnly: !f.shortVisitsOnly }))}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  quickFilters.shortVisitsOnly
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ≤ 90 min
              </button>
              <button
                type="button"
                onClick={() =>
                  setQuickFilters((f) => ({
                    ...f,
                    freeOnly: !f.freeOnly,
                    budgetOnly: f.freeOnly ? f.budgetOnly : false
                  }))
                }
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  quickFilters.freeOnly
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Free
              </button>
              <button
                type="button"
                onClick={() => setQuickFilters((f) => ({ ...f, budgetOnly: !f.budgetOnly, freeOnly: false }))}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  quickFilters.budgetOnly
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Budget-friendly
              </button>
            </div>

            {categoryFilters.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Focus categories
                </div>
                <div className="flex flex-wrap gap-2">
                  {categoryFilters.map((category) => {
                    const isActive = activeCategorySet.has(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategoryToggle(category.id)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                          isActive ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
                {activeCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCategoryFilters}
                    className="text-xs font-semibold text-slate-500 underline hover:text-slate-700"
                  >
                    Clear categories
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Season focus
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedMonth(value);
                  setDateFilterType(value === 'all' ? 'none' : 'month');
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.icon} {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sort results
              </label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveQuickFilters && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setQuickFilters({ indoorOnly: false, outdoorOnly: false, freeOnly: false, shortVisitsOnly: false, budgetOnly: false });
                    setDateFilterType('none');
                    setSelectedMonth('all');
                    setSelectedDate('');
                    setStartDate('');
                    setEndDate('');
                    setActiveCategories([]);
                    setSortOption('score-desc');
                  }}
                  className="text-xs font-semibold text-slate-500 underline hover:text-slate-700"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ranking lens
          </div>
          <div className="flex flex-wrap gap-2">
            {rankingLenses.map((lens) => (
              <button
                key={lens.id}
                type="button"
                onClick={() => setRankingLens(lens.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  rankingLens === lens.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lens.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 md:text-sm">{activeLens.description}.</p>
        </div>
      </div>

      {highlightAttractions.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Spotlight picks</h2>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {activeLens.label} lens
              <span aria-hidden="true">•</span> Top {highlightAttractions.length}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {highlightAttractions.map((attraction, index) => renderHighlightCard(attraction, index))}
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
              {visibleCount < remainingAttractions.length && (
                <div className="text-center text-sm text-slate-500">
                  Scrolling reveals more ideas automatically
                </div>
              )}
            </div>
          ) : (
            highlightAttractions.length > 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-6 text-sm text-slate-600">
                You&apos;ve already seen every standout for this lens in the spotlight section above.
              </div>
            )
          )}
        </section>
      )}
    </div>
  );
};

export default AttractionsList;
