'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronRight, Sun, Cloud, Sunrise, PartyPopper } from 'lucide-react';
import { getCityDaylightHours } from '@/lib/daylight';

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
 * Color palette for the rank standing-bar — cycles through earthy/muted tones.
 * The palette is meaningful (a per-rank colour cue) rather than a vestigial tick.
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
 * Weather icon (lucide) + tone based on temperature
 */
function weatherDescriptor(temp) {
  if (temp === null || temp === undefined) return { Icon: Cloud, tone: 'text-gray-400' };
  if (temp >= 20) return { Icon: Sun, tone: 'text-amber-500' };
  if (temp >= 12) return { Icon: Sun, tone: 'text-amber-400' };
  return { Icon: Cloud, tone: 'text-slate-400' };
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
    1: 'bg-emerald-500',
    2: 'bg-emerald-400',
    3: 'bg-amber-400',
    4: 'bg-orange-400',
    5: 'bg-red-400',
  };

  return (
    <div className="flex items-end gap-[3px] h-3.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-1 rounded-[1px] transition-all ${
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

  // Event happening during the trip window — shown as an inline chip on the row
  // (replaces the disconnected "What's on" strip), so the event sits next to the
  // city it belongs to.
  const eventHighlight = city.highlights?.find((h) => h.type === 'event');
  const eventName = eventHighlight?.name;

  // Daylight hours for the travel date. Uses the city's real coordinates (sunrise
  // equation) when available — so it varies per city instead of being identical
  // across a whole country — and falls back to the coarse band estimate otherwise.
  const daylightHours = getCityDaylightHours(city, startDate || new Date());

  // Standing-bar colour based on rank
  const sidebarColor = SIDEBAR_COLORS[rank % SIDEBAR_COLORS.length];

  const cityHref = city.cityId || city.id;
  const handleActivate = () => onClick(cityHref);

  const { Icon: WeatherIcon, tone: weatherTone } = weatherDescriptor(tempNum);

  return (
    <article
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
      className="group relative grid grid-cols-[1.75rem_minmax(0,1fr)] sm:grid-cols-[3rem_minmax(0,1fr)] gap-3 sm:gap-5 bg-white py-4 sm:py-5 cursor-pointer rounded-sm transition-colors hover:bg-gray-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-hero-accent focus-visible:ring-offset-2"
    >
      {/* Editorial rank numeral — left margin index. */}
      <div className="flex flex-col items-center pt-1">
        <span className="font-display text-2xl sm:text-4xl font-semibold leading-none text-hero-ink tabular-nums">
          {rank + 1}
        </span>
        {/* Standing bar: width scales inversely with rank so the list reads as a
            ranked leaderboard without inventing a noisy numeric score. */}
        <span className="mt-2 h-[3px] w-6 rounded-full bg-hero-line overflow-hidden" aria-hidden="true">
          <span
            className={`block h-full ${sidebarColor} opacity-80`}
            style={{ width: `${Math.max(20, 100 - rank * 5)}%` }}
          />
        </span>
      </div>

      {/* Entry body — single horizontal row on sm+, stacked on mobile. The
          flexible name/dek block absorbs the slack so the ledger + CTA sit
          together on the right with no empty mid-row gap. */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        {/* Framed image */}
        <div className="relative h-40 w-full flex-shrink-0 overflow-hidden rounded-md ring-1 ring-hero-line sm:h-[5.5rem] sm:w-36">
          <Image
            src={imageSrc}
            alt={cityName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 144px"
            onError={() => setImgError(true)}
            unoptimized={imageSrc.endsWith('.svg')}
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-md" aria-hidden="true" />
        </div>

        {/* Name + dek */}
        <div className="min-w-0 sm:flex-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-hero-ink-muted">
            {flag && <span className="text-sm leading-none">{flag}</span>}
            <span className="truncate">{country}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="mt-0.5 truncate font-display text-xl sm:text-2xl font-semibold leading-tight text-hero-ink">
              {cityName}
            </h3>
            <ChevronRight
              className={`hidden sm:block h-4 w-4 shrink-0 text-hero-line transition-transform ${isHovered ? 'translate-x-0.5 text-hero-ink-muted' : ''}`}
              aria-hidden="true"
            />
          </div>
          {eventName && (
            <span className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
              <PartyPopper className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{eventName}</span>
            </span>
          )}
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-hero-ink-muted line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Stat ledger — captioned, hairline-divided cells. Equal-width on mobile
            (flex-1) so it fills the card; content-width on desktop (sm:flex-none)
            so it tucks neatly beside the CTA. */}
        <dl className="flex w-auto flex-shrink-0 divide-x divide-hero-line overflow-hidden rounded-md border border-hero-line">
          <div className="flex flex-col gap-0.5 px-3 py-1.5 sm:px-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-hero-ink-muted">Temp</dt>
            <dd className="flex h-5 items-center gap-1.5">
              {tempNum !== null ? (
                <>
                  <WeatherIcon className={`h-4 w-4 ${weatherTone}`} aria-hidden="true" />
                  <span className="font-display text-base font-semibold text-hero-ink tabular-nums">{tempNum}°</span>
                </>
              ) : (
                <span className="text-sm text-hero-ink-muted">—</span>
              )}
            </dd>
          </div>

          <div className="flex flex-col gap-0.5 px-3 py-1.5 sm:px-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-hero-ink-muted">Crowds</dt>
            <dd className="flex h-5 min-w-0 items-center gap-1.5" aria-label={`${crowdLevel} crowds`}>
              <CrowdBars level={crowdLevel} />
              <span className="min-w-0 truncate text-xs font-medium text-hero-ink">{crowdLevel}</span>
            </dd>
          </div>

          <div className="flex flex-col gap-0.5 px-3 py-1.5 sm:px-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-hero-ink-muted">Daylight</dt>
            <dd className="flex h-5 items-center gap-1.5">
              {daylightHours != null ? (
                <>
                  <Sunrise className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span className="font-display text-base font-semibold text-hero-ink tabular-nums">{daylightHours}h</span>
                </>
              ) : (
                <span className="text-sm text-hero-ink-muted">—</span>
              )}
            </dd>
          </div>
        </dl>

        {/* Primary action — refined ghost pill that fills on hover so the main
            action is unmistakable without shouting. */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onStartPlan?.();
          }}
          className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border border-hero-ink/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-hero-ink transition-colors hover:border-hero-ink hover:bg-hero-ink hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-hero-accent focus-visible:ring-offset-2 sm:self-auto"
        >
          Start itinerary
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isHovered ? 'translate-x-0.5' : ''}`} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
