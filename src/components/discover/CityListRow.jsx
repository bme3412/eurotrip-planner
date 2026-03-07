'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

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
  'Kosov': '🇽🇰', 'Liechtensetin': '🇱🇮',
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

/**
 * Circular score badge (0-100 scale)
 */
function ScoreCircle({ score }) {
  const circumference = 2 * Math.PI * 18;
  const progress = (score / 100) * circumference;

  // Color based on score
  let strokeColor = 'stroke-amber-400';
  if (score >= 85) strokeColor = 'stroke-emerald-400';
  else if (score >= 75) strokeColor = 'stroke-green-400';
  else if (score >= 65) strokeColor = 'stroke-amber-400';
  else if (score >= 55) strokeColor = 'stroke-orange-400';
  else strokeColor = 'stroke-red-400';

  return (
    <div className="relative w-11 h-11 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        {/* Background circle */}
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="3"
        />
        {/* Progress circle */}
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          className={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
        {score}
      </span>
    </div>
  );
}

/**
 * Calculate approximate daylight hours based on month and latitude
 */
function getDaylightHours(month, country) {
  // Approximate daylight hours by month for mid-European latitudes
  const baseDaylight = {
    0: 8.5,   // January
    1: 10,    // February
    2: 12,    // March
    3: 14,    // April
    4: 15.5,  // May
    5: 16.5,  // June
    6: 16,    // July
    7: 14.5,  // August
    8: 12.5,  // September
    9: 10.5,  // October
    10: 9,    // November
    11: 8,    // December
  };

  // Latitude adjustments by country (rough approximation)
  const latitudeAdjust = {
    'Norway': 2, 'Sweden': 1.5, 'Finland': 2, 'Iceland': 2.5,
    'Denmark': 0.5, 'UK': 0.3, 'Ireland': 0.3, 'Estonia': 1,
    'Latvia': 0.8, 'Lithuania': 0.5, 'Poland': 0.2,
    'Spain': -0.5, 'Portugal': -0.5, 'Italy': -0.3, 'Greece': -0.5,
    'Malta': -0.7, 'Cyprus': -0.7,
  };

  const base = baseDaylight[month] || 12;
  const adjust = latitudeAdjust[country] || 0;

  // In summer, northern countries get more light; in winter, less
  const isSummer = month >= 4 && month <= 8;
  const adjusted = isSummer ? base + adjust : base - (adjust * 0.5);

  return Math.round(adjusted * 2) / 2; // Round to nearest 0.5
}

export default function CityListRow({ city, rank, onClick, startDate }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Extract data
  const cityName = city.title || city.cityName || city.cityId?.replace(/-/g, ' ');
  const country = city.country || '';
  const flag = COUNTRY_FLAGS[country] || '';
  const score = city.v4?.finalScore || Math.round((city.score || 3.5) * 20) || 75;

  // Get image
  const imageSrc = imgError || !city.image
    ? '/images/city-placeholder.svg'
    : city.image;

  // Get temperature from highlights (format: "24°C") or V4 breakdown
  const weatherHighlight = city.highlights?.find(h => h.type === 'weather');
  let tempNum = null;
  if (weatherHighlight?.name) {
    const match = weatherHighlight.name.match(/(\d+)/);
    if (match) tempNum = parseInt(match[1], 10);
  }

  // Get crowd level
  const crowdLevel = city.crowdLevel || city.v4?.factors?.crowds?.details?.crowdLevel || 'Moderate';

  // Get description/why text
  const description = city.why || city.highlights?.[0]?.description || '';

  // Calculate daylight hours based on travel date
  const travelMonth = startDate ? new Date(startDate).getMonth() : new Date().getMonth();
  const daylightHours = getDaylightHours(travelMonth, country);

  // Sidebar color based on rank
  const sidebarColor = SIDEBAR_COLORS[rank % SIDEBAR_COLORS.length];

  return (
    <div
      onClick={() => onClick(city.cityId || city.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
        isHovered ? 'scale-[1.01]' : ''
      }`}
    >
      {/* Image with overlay containing rank, flag, city name */}
      <div className="relative w-48 h-32 flex-shrink-0">
        <Image
          src={imageSrc}
          alt={cityName}
          fill
          className="object-cover"
          sizes="192px"
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
      <div className="flex-1 p-4 flex items-center gap-4">
        {/* Score circle */}
        <ScoreCircle score={score} />

        {/* City info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 text-lg">
              {cityName}
            </h3>
            <span className="text-gray-400 text-sm">{country}</span>
          </div>

          {description && (
            <p className="text-sm text-gray-600 line-clamp-1">
              {description}
            </p>
          )}
        </div>

        {/* Weather + Crowds + Daylight */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Temperature */}
          {tempNum !== null && (
            <div className="flex items-center gap-1">
              <span className="text-lg">{getWeatherIcon(tempNum)}</span>
              <span className="text-sm font-medium text-gray-700">{tempNum}°</span>
            </div>
          )}

          {/* Crowd bars */}
          <CrowdBars level={crowdLevel} />

          {/* Daylight hours */}
          <div className="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg text-xs font-semibold">
            {daylightHours}h
          </div>

          {/* Arrow */}
          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
        </div>
      </div>
    </div>
  );
}
