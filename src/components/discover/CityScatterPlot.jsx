'use client';

import { useState } from 'react';

/**
 * Country flags mapping
 */
const COUNTRY_FLAGS = {
  'Austria': '🇦🇹', 'Belgium': '🇧🇪', 'Bulgaria': '🇧🇬', 'Croatia': '🇭🇷',
  'Cyprus': '🇨🇾', 'Czechia': '🇨🇿', 'Denmark': '🇩🇰', 'Estonia': '🇪🇪',
  'Finland': '🇫🇮', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Greece': '🇬🇷',
  'Hungary': '🇭🇺', 'Ireland': '🇮🇪', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱',
  'Norway': '🇳🇴', 'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Spain': '🇪🇸',
  'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'UK': '🇬🇧', 'Slovenia': '🇸🇮',
  'Slovakia': '🇸🇰', 'Romania': '🇷🇴', 'Serbia': '🇷🇸', 'Montenegro': '🇲🇪',
  'Albania': '🇦🇱', 'Malta': '🇲🇹', 'Luxembourg': '🇱🇺', 'Monaco': '🇲🇨',
};

/**
 * Get temperature from city data
 */
function getTemperature(city) {
  const weatherHighlight = city.highlights?.find(h => h.type === 'weather');
  if (weatherHighlight?.name) {
    const match = weatherHighlight.name.match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Scatter plot visualization of cities by temperature and score
 */
export default function CityScatterPlot({ cities, onCityClick }) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [hoveredCity, setHoveredCity] = useState(null);

  // Calculate bounds
  const temps = cities.map(c => getTemperature(c)).filter(t => t !== null);
  const scores = cities.map(c => c.v4?.finalScore ?? (c.score || 3) * 20);

  const minTemp = Math.min(...temps, 5);
  const maxTemp = Math.max(...temps, 35);
  const minScore = Math.min(...scores, 40);
  const maxScore = Math.max(...scores, 100);

  // Chart dimensions
  const width = 800;
  const height = 500;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Scale functions
  const xScale = (temp) => {
    if (temp === null) return padding.left + plotWidth / 2;
    return padding.left + ((temp - minTemp) / (maxTemp - minTemp)) * plotWidth;
  };

  const yScale = (score) => {
    return padding.top + plotHeight - ((score - minScore) / (maxScore - minScore)) * plotHeight;
  };

  // Crowd level to color
  const crowdToColor = (level) => {
    const map = {
      'Very Low': '#10b981', 'very low': '#10b981',
      'Low': '#22c55e', 'low': '#22c55e',
      'Moderate': '#f59e0b', 'moderate': '#f59e0b',
      'High': '#f97316', 'high': '#f97316',
      'Very High': '#ef4444', 'very high': '#ef4444',
    };
    return map[level] || '#f59e0b';
  };

  // Generate grid lines
  const xTicks = [];
  for (let t = Math.ceil(minTemp / 5) * 5; t <= maxTemp; t += 5) {
    xTicks.push(t);
  }

  const yTicks = [];
  for (let s = Math.ceil(minScore / 10) * 10; s <= maxScore; s += 10) {
    yTicks.push(s);
  }

  // Qualitative band-zone labels (no raw numbers shown to the user).
  // Each marker is positioned at a representative score within its band.
  const bandMarkers = [
    { v: 90, label: 'Top Pick' },
    { v: 75, label: 'Great' },
    { v: 65, label: 'Good' },
    { v: 50, label: 'Fair' },
  ].filter((b) => b.v >= minScore && b.v <= maxScore);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Temperature vs Fit</h3>
          <p className="text-sm text-gray-500">Bubble color = crowd level (green = quieter, red = busier)</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-gray-600">Low crowds</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-gray-600">Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">High crowds</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        {xTicks.map(t => (
          <line
            key={`x-${t}`}
            x1={xScale(t)}
            y1={padding.top}
            x2={xScale(t)}
            y2={height - padding.bottom}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        {yTicks.map(s => (
          <line
            key={`y-${s}`}
            x1={padding.left}
            y1={yScale(s)}
            x2={width - padding.right}
            y2={yScale(s)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#9ca3af"
          strokeWidth="2"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#9ca3af"
          strokeWidth="2"
        />

        {/* X-axis labels */}
        {xTicks.map(t => (
          <text
            key={`xl-${t}`}
            x={xScale(t)}
            y={height - padding.bottom + 25}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            {t}°C
          </text>
        ))}

        {/* Y-axis band-zone labels (qualitative, no raw numbers) */}
        {bandMarkers.map(b => (
          <text
            key={`yl-${b.label}`}
            x={padding.left - 12}
            y={yScale(b.v) + 4}
            textAnchor="end"
            className="text-[10px] fill-gray-500 font-medium"
          >
            {b.label}
          </text>
        ))}

        {/* Axis titles */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          className="text-sm fill-gray-700 font-medium"
        >
          Temperature
        </text>
        <text
          x={15}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${height / 2})`}
          className="text-sm fill-gray-700 font-medium"
        >
          Match
        </text>

        {/* City dots */}
        {cities.map((city, i) => {
          const temp = getTemperature(city);
          const score = city.v4?.finalScore ?? (city.score || 3) * 20;
          const crowdLevel = city.crowdLevel || 'moderate';
          const cityName = city.title || city.cityName || city.cityId;
          const flag = COUNTRY_FLAGS[city.country] || '';
          const isHovered = hoveredCity === city.cityId;

          return (
            <g
              key={city.cityId || i}
              onClick={() => onCityClick(city.cityId || city.id)}
              onMouseEnter={() => setHoveredCity(city.cityId)}
              onMouseLeave={() => setHoveredCity(null)}
              className="cursor-pointer"
            >
              {/* Dot */}
              <circle
                cx={xScale(temp)}
                cy={yScale(score)}
                r={isHovered ? 14 : 10}
                fill={crowdToColor(crowdLevel)}
                opacity={isHovered ? 1 : 0.8}
                stroke={isHovered ? '#1f2937' : 'white'}
                strokeWidth={isHovered ? 2 : 1.5}
                className="transition-all duration-150"
              />

              {/* Rank number inside dot */}
              <text
                x={xScale(temp)}
                y={yScale(score) + 4}
                textAnchor="middle"
                className="text-[10px] fill-white font-bold pointer-events-none"
              >
                {i + 1}
              </text>

              {/* Hover label */}
              {isHovered && (
                <g>
                  <rect
                    x={xScale(temp) - 60}
                    y={yScale(score) - 45}
                    width="120"
                    height="28"
                    rx="6"
                    fill="#1f2937"
                  />
                  <text
                    x={xScale(temp)}
                    y={yScale(score) - 26}
                    textAnchor="middle"
                    className="text-xs fill-white font-medium"
                  >
                    {flag} {cityName}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
