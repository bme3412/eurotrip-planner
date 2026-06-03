'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  X, Sun, Cloud, Sunrise, PartyPopper, ChevronRight,
  BookOpen, Users, CalendarRange, Thermometer,
} from 'lucide-react';
import { getCityDaylightHours } from '@/lib/daylight';
import { formatDateRange, getNights } from '@/lib/utils/dates';

/**
 * Country code to flag emoji mapping (shared with CityListRow).
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

const CROWD_COPY = {
  'Very Low': 'Very quiet — you’ll have the streets mostly to yourself.',
  'Low': 'Quiet — light foot traffic at the major sights.',
  'Moderate': 'Steady — popular spots are busy but manageable.',
  'High': 'Busy — expect lines and crowds at headline attractions.',
  'Very High': 'Very busy — peak-season crowds throughout.',
  'Extreme': 'Packed — book everything well ahead.',
};

function weatherDescriptor(temp) {
  if (temp === null || temp === undefined) return { Icon: Cloud, tone: 'text-gray-400' };
  if (temp >= 20) return { Icon: Sun, tone: 'text-amber-500' };
  if (temp >= 12) return { Icon: Sun, tone: 'text-amber-400' };
  return { Icon: Cloud, tone: 'text-slate-400' };
}

function StatCard({ icon: Icon, tone, label, value, sub }) {
  return (
    <div className="rounded-xl border border-hero-line bg-gray-50/70 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-hero-ink-muted">
        <Icon className={`h-3.5 w-3.5 ${tone || ''}`} aria-hidden />
        {label}
      </div>
      <div className="mt-1 font-display text-lg font-semibold text-hero-ink tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] leading-snug text-hero-ink-muted">{sub}</div>}
    </div>
  );
}

/**
 * CityDateModal — a date-specific snapshot for a ranked city. Distinct from the
 * evergreen city guide: everything here is framed around the selected travel
 * window (temperature, crowds, daylight and any festival landing in the range).
 * Always links out to the full city guide and the itinerary planner.
 *
 * Accessible: Escape + backdrop close, focus moves to the close button, and the
 * background scroll is locked while the modal is open.
 */
export default function CityDateModal({ city, rank, dates, onClose, onStartPlan }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!city) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const trigger = typeof document !== 'undefined' ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (trigger && typeof trigger.focus === 'function') trigger.focus();
    };
  }, [city, onClose]);

  if (!city) return null;

  const cityName = city.title || city.cityName || city.cityId?.replace(/-/g, ' ');
  const country = city.country || '';
  const flag = COUNTRY_FLAGS[country] || '';
  const cityHref = city.cityId || city.id;
  const imageSrc = city.image || '/images/city-placeholder.svg';

  // Date-specific stats
  const dateRange = formatDateRange(dates?.start, dates?.end);
  const nights = getNights(dates?.start, dates?.end);

  const highC = city.weather?.highC;
  const lowC = city.weather?.lowC;
  let tempNum = typeof highC === 'number' ? highC : null;
  if (tempNum === null) {
    const wh = city.highlights?.find((h) => h.type === 'weather');
    const match = wh?.name?.match(/(\d+)/);
    if (match) tempNum = parseInt(match[1], 10);
  }
  const { Icon: WeatherIcon, tone: weatherTone } = weatherDescriptor(tempNum);

  const crowdLevel = city.crowdLevel || city.v4?.factors?.crowds?.details?.crowdLevel || 'Moderate';
  const daylightHours = getCityDaylightHours(city, dates?.start || new Date());

  const description = city.whyExpanded || city.why || '';

  const eventHighlight = city.highlights?.find((h) => h.type === 'event');
  const tags = Array.isArray(city.tags) ? city.tags : [];

  const titleId = 'city-date-modal-title';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero */}
        <div className="relative h-44 shrink-0 bg-gray-100 sm:h-52">
          <Image
            src={imageSrc}
            alt={cityName}
            fill
            className="object-cover"
            sizes="(min-width: 640px) 32rem, 100vw"
            unoptimized={imageSrc.endsWith('.svg')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25" />

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/90 text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>

          {typeof rank === 'number' && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-hero-ink shadow-sm backdrop-blur-sm">
              #{rank + 1}
            </span>
          )}

          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
              {flag && <span className="text-sm leading-none">{flag}</span>}
              <span>{country}</span>
            </div>
            <h2 id={titleId} className="mt-0.5 font-display text-2xl font-semibold leading-tight text-white drop-shadow">
              {cityName}
            </h2>
            {dateRange && (
              <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/90">
                <CalendarRange className="h-3.5 w-3.5" aria-hidden />
                <span>{dateRange}{nights ? ` · ${nights} nights` : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-hero-ink-muted">
            What to expect on these dates
          </p>

          {/* Date-specific stat grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <StatCard
              icon={WeatherIcon}
              tone={weatherTone}
              label="Temp"
              value={tempNum !== null ? `${tempNum}°` : '—'}
              sub={typeof lowC === 'number' && tempNum !== null ? `Low ${lowC}°` : 'Daytime high'}
            />
            <StatCard
              icon={Users}
              label="Crowds"
              value={crowdLevel}
            />
            <StatCard
              icon={Sunrise}
              tone="text-amber-500"
              label="Daylight"
              value={daylightHours != null ? `${daylightHours}h` : '—'}
              sub="per day"
            />
          </div>

          {/* Crowd context line */}
          {CROWD_COPY[crowdLevel] && (
            <p className="text-sm leading-relaxed text-hero-ink-muted">{CROWD_COPY[crowdLevel]}</p>
          )}

          {/* Festival / event landing in the window */}
          {eventHighlight?.name && (
            <section className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                <PartyPopper className="h-4 w-4" aria-hidden />
                <span>{eventHighlight.name}</span>
              </div>
              {eventHighlight.description && (
                <p className="mt-1.5 text-sm leading-relaxed text-amber-900/90">{eventHighlight.description}</p>
              )}
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-amber-700">
                Happening during your dates
              </p>
            </section>
          )}

          {/* Why this city, this week */}
          {description && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-hero-ink">
                <Thermometer className="h-4 w-4 text-hero-ink-muted" aria-hidden /> Why now
              </h3>
              <p className="text-[15px] leading-relaxed text-hero-ink-muted">{description}</p>
            </section>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex shrink-0 items-center gap-2 border-t border-hero-line bg-white p-3">
          {cityHref && (
            <a
              href={`/city-guides/${cityHref}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-hero-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-hero-ink transition-colors hover:bg-gray-50"
            >
              <BookOpen className="h-4 w-4" aria-hidden /> City guide
            </a>
          )}
          <button
            type="button"
            onClick={onStartPlan}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-hero-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800"
          >
            Start itinerary
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
