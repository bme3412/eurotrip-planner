'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { getDaylightHours } from '@/lib/daylight';

/**
 * Country code to flag emoji mapping
 */
const COUNTRY_FLAGS = {
  'Austria': '🇦🇹', 'Belgium': '🇧🇪', 'Bulgaria': '🇧🇬', 'Bosnia-and-Herzegovina': '🇧🇦',
  'Croatia': '🇭🇷', 'Cyprus': '🇨🇾', 'Czechia': '🇨🇿', 'Denmark': '🇩🇰',
  'Estonia': '🇪🇪', 'Finland': '🇫🇮', 'France': '🇫🇷', 'Germany': '🇩🇪',
  'Greece': '🇬🇷', 'Hungary': '🇭🇺', 'Iceland': '🇮🇸', 'Ireland': '🇮🇪',
  'Italy': '🇮🇹', 'Kosovo': '🇽🇰', 'Latvia': '🇱🇻', 'Liechtenstein': '🇱🇮',
  'Lithuania': '🇱🇹', 'Luxembourg': '🇱🇺', 'Malta': '🇲🇹', 'Monaco': '🇲🇨',
  'Montenegro': '🇲🇪', 'Netherlands': '🇳🇱', 'North-Macedonia': '🇲🇰', 'Norway': '🇳🇴',
  'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Romania': '🇷🇴', 'San-Marino': '🇸🇲',
  'Serbia': '🇷🇸', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮', 'Spain': '🇪🇸',
  'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'UK': '🇬🇧', 'Albania': '🇦🇱',
  'Andorra': '🇦🇩', 'Belarus': '🇧🇾', 'Moldova': '🇲🇩', 'Ukraine': '🇺🇦',
};

/**
 * Color palette for city sidebar - cycles through earthy/muted tones
 */
const SIDEBAR_COLORS = [
  'bg-[#2d4a3e]', // forest green
  'bg-[#8b4513]', // saddle brown
  'bg-[#6b705c]', // olive gray
  'bg-[#d4a574]', // tan/camel
  'bg-[#7c6f64]', // taupe
  'bg-[#4a5568]', // slate
  'bg-[#744210]', // brown
  'bg-[#285e61]', // teal
  'bg-[#5f4b3d]', // mocha
  'bg-[#4a6741]', // sage
];

/**
 * Get weather icon based on temperature
 */
function getWeatherIcon(temp) {
  if (temp === null || temp === undefined) return '🌡️';
  if (temp >= 28) return '☀️';
  if (temp >= 20) return '🌤️';
  if (temp >= 12) return '⛅';
  if (temp >= 5) return '🌥️';
  return '❄️';
}

/**
 * Crowd level to bar visualization
 */
function CrowdBars({ level }) {
  const levelMap = {
    'Very Low': 1,
    'Low': 2,
    'Moderate': 3,
    'High': 4,
    'Very High': 5,
    'Extreme': 5,
  };

  const count = levelMap[level] || 3;
  const colorMap = {
    1: 'bg-emerald-400',
    2: 'bg-green-400',
    3: 'bg-amber-400',
    4: 'bg-orange-400',
    5: 'bg-red-400',
  };

  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-1 rounded-sm transition-all ${
            i <= count ? colorMap[count] : 'bg-gray-200'
          }`}
          style={{ height: `${40 + i * 12}%` }}
        />
      ))}
    </div>
  );
}

// ScoreCircle / TierIndicator removed: on the results list every visible row is
// already a top pick, so a per-row tier badge was identical across rows and
// redundant with the rank number. Daylight now comes from the shared helper.

export default function CityListRow({ city, rank, onClick, onStartPlan, startDate }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Extract data
  const cityName = city.title || city.cityName || city.cityId?.replace(/-/g, ' ');
  const country = city.country || '';
  const flag = COUNTRY_FLAGS[country] || '';
  // Note: score removed - using tier-based display instead

  // Get image
  const imageSrc = imgError || !city.image
    ? '/images/city-placeholder.svg'
    : city.image;

  // Get temperature from weather object, highlights, or V4 breakdown
  let tempNum = city.weather?.highC || null;
  if (!tempNum) {
    const weatherHighlight = city.highlights?.find(h => h.type === 'weather');
    if (weatherHighlight?.name) {
      const match = weatherHighlight.name.match(/(\d+)/);
      if (match) tempNum = parseInt(match[1], 10);
    }
  }

  // Get crowd level
  const crowdLevel = city.crowdLevel || city.v4?.factors?.crowds?.details?.crowdLevel || 'Moderate';

  // Get description/why text - prefer expanded description if available
  const description = city.whyExpanded || city.why || city.highlights?.[0]?.description || '';

  // Daylight hours for the travel month. Parsed in local time (the shared helper
  // avoids the UTC month-shift bug) and shown as whole hours — it's a coarse
  // latitude estimate, so 0.5h precision was misleading.
  const daylightHours = getDaylightHours(startDate || new Date(), country);

  // Sidebar color based on rank
  const sidebarColor = SIDEBAR_COLORS[rank % SIDEBAR_COLORS.length];

  const cityHref = city.cityId || city.id;
  const handleActivate = () => onClick(cityHref);

  return (
    <div
      id={`city-${cityHref}`}
      role="button"
      tabIndex={0}
      aria-label={`View ${cityName}${country ? `, ${country}` : ''} guide`}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleActivate();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex flex-col sm:flex-row bg-white rounded-xl overflow-hidden cursor-pointer transition-shadow duration-200 shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        isHovered ? 'sm:shadow-md' : ''
      }`}
    >
      {/* Image with overlay containing rank, flag, city name */}
      <div className="relative w-full h-36 sm:w-44 sm:h-auto sm:min-h-[8.5rem] flex-shrink-0">
        <Image
          src={imageSrc}
          alt={cityName}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 176px"
          onError={() => setImgError(true)}
          unoptimized={imageSrc.endsWith('.svg')}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Rank badge - top left */}
        <div className="absolute top-2 left-2">
          <span className={`${sidebarColor} text-white text-xs font-bold px-2 py-0.5 rounded`}>
            {rank + 1}
          </span>
        </div>

        {/* Flag + city name - bottom */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">{flag}</span>
            <span className="text-white text-xs font-semibold uppercase tracking-wide truncate">
              {cityName}
            </span>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
        {/* City info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="font-bold text-gray-900 text-lg truncate">
              {cityName}
            </h3>
            <span className="text-gray-400 text-sm shrink-0">{country}</span>
          </div>

          {description && (
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Weather + Crowds + Daylight + action */}
        <div className="flex items-center gap-4 flex-shrink-0 flex-wrap sm:flex-nowrap">
          {/* Temperature */}
          {tempNum !== null && (
            <div className="flex items-center gap-1" title="Average daytime high">
              <span className="text-lg" aria-hidden="true">{getWeatherIcon(tempNum)}</span>
              <span className="text-sm font-medium text-gray-700">{tempNum}°</span>
            </div>
          )}

          {/* Crowd bars */}
          <div title={`${crowdLevel} crowds`} aria-label={`${crowdLevel} crowds`}>
            <CrowdBars level={crowdLevel} />
          </div>

          {/* Daylight hours */}
          {daylightHours != null && (
            <div
              className="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg text-xs font-semibold"
              title="Approx. daylight hours"
            >
              {daylightHours}h
            </div>
          )}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStartPlan?.();
            }}
            className="ml-auto sm:ml-0 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Start itinerary
          </button>

          {/* Arrow */}
          <ChevronRight className={`hidden sm:block w-5 h-5 text-gray-400 transition-transform ${isHovered ? 'translate-x-1' : ''}`} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
