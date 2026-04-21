"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronDown, ChevronUp, Sun, Users, DollarSign, Calendar, Sparkles } from "lucide-react";

const COLUMNS = [
  { key: "rank", label: "#", sortable: false, width: "w-10" },
  { key: "name", label: "City", sortable: true, width: "flex-1 min-w-[120px]" },
  { key: "score", label: "Match", sortable: true, width: "w-24" },
  { key: "weather", label: "Weather", sortable: true, width: "w-24" },
  { key: "crowds", label: "Crowds", sortable: true, width: "w-20" },
  { key: "value", label: "Value", sortable: true, width: "w-20" },
  { key: "events", label: "Events", sortable: true, width: "w-16" },
  { key: "vibe", label: "Vibe", sortable: false, width: "w-48 hidden lg:table-cell" },
];

const CROWD_COLORS = {
  low: "text-green-600 bg-green-50",
  moderate: "text-amber-600 bg-amber-50",
  high: "text-red-600 bg-red-50",
};

const VALUE_COLORS = {
  budget: "text-green-600",
  moderate: "text-amber-600",
  premium: "text-purple-600",
};

/**
 * ScoreboardTable - Sortable table of city scores.
 *
 * @param {Object} props
 * @param {Array} props.cities - Array of city score objects
 * @param {number} props.initialLimit - Initial number of rows to show
 */
export default function ScoreboardTable({ cities = [], initialLimit = 5 }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState("desc");
  const [showAll, setShowAll] = useState(false);

  // Sort cities
  const sortedCities = useMemo(() => {
    const sorted = [...cities].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      // Handle nested weather
      if (sortKey === "weather") {
        aVal = a.weather?.highC ?? 0;
        bVal = b.weather?.highC ?? 0;
      }

      // Handle string comparisons
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Numeric comparison
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [cities, sortKey, sortDir]);

  // Limit display
  const displayCities = showAll ? sortedCities : sortedCities.slice(0, initialLimit);

  // Handle sort
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Handle row click
  const handleRowClick = (city) => {
    router.push(`/city-guides/${city.key}`);
  };

  if (cities.length === 0) {
    return (
      <div className="text-center py-8 text-hero-ink-muted">
        No cities scored for this period yet — try &quot;This week&quot;
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hero-line">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`py-3 px-2 text-left font-semibold text-hero-ink-muted ${col.width}`}
                aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
              >
                {col.sortable ? (
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-hero-ink transition-colors"
                  >
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayCities.map((city, index) => (
            <tr
              key={city.key}
              onClick={() => handleRowClick(city)}
              className="border-b border-hero-line/50 hover:bg-hero-accent-soft/40 cursor-pointer transition-colors"
            >
              {/* Rank */}
              <td className="py-3 px-2 font-bold text-hero-ink tabular-nums">
                {index + 1}
              </td>

              {/* City */}
              <td className="py-3 px-2">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={city.thumbnail || "/images/placeholder-city.jpg"}
                      alt={city.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div>
                    <div className="font-medium text-hero-ink">{city.name}</div>
                    <div className="text-xs text-hero-ink-muted">{city.country}</div>
                  </div>
                </div>
              </td>

              {/* Match score */}
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-hero-ink tabular-nums">
                    {city.score}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[60px]">
                    <div
                      className="h-full bg-hero-accent rounded-full"
                      style={{ width: `${city.score}%` }}
                    />
                  </div>
                </div>
              </td>

              {/* Weather */}
              <td className="py-3 px-2">
                <div className="flex items-center gap-1.5 text-hero-ink">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="tabular-nums">{city.weather?.highC ?? "--"}°</span>
                </div>
              </td>

              {/* Crowds */}
              <td className="py-3 px-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CROWD_COLORS[city.crowds] || ""}`}>
                  <Users className="w-3 h-3" />
                  {city.crowds}
                </span>
              </td>

              {/* Value */}
              <td className="py-3 px-2">
                <span className={`flex items-center gap-1 font-medium capitalize ${VALUE_COLORS[city.value] || ""}`}>
                  <DollarSign className="w-3 h-3" />
                  {city.value}
                </span>
              </td>

              {/* Events */}
              <td className="py-3 px-2">
                {city.events > 0 && (
                  <span className="flex items-center gap-1 text-purple-600">
                    <Calendar className="w-3 h-3" />
                    {city.events}
                  </span>
                )}
              </td>

              {/* Vibe */}
              <td className="py-3 px-2 hidden lg:table-cell">
                <span className="flex items-center gap-1.5 text-hero-ink-muted text-xs">
                  <Sparkles className="w-3 h-3 text-hero-accent" />
                  {city.vibe}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Show more button */}
      {cities.length > initialLimit && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm font-medium text-hero-accent hover:text-hero-accent-hover transition-colors"
          >
            {showAll ? "Show less" : `Show all ${cities.length} →`}
          </button>
        </div>
      )}
    </div>
  );
}
