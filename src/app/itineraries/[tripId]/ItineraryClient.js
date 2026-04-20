'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ShareButton from './ShareButton';

const ItineraryMap = dynamic(() => import('./ItineraryMap'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-zinc-800 md:h-[420px]" />,
});

const PlannerChat = dynamic(() => import('@/components/itinerary/PlannerChat'), {
  ssr: false,
  loading: () => null,
});

// ─── Design tokens ───────────────────────────────────────────────────────
const GOLD = '#c9963c';
const GOLD_DIM = '#c9963c60';

// Time block config — no emoji, clean labels, dark-mode accent colors
const TIME_BLOCK = {
  early_morning: { label: 'Early Morning', accent: '#92400e', lineColor: '#92400e50' },
  morning:       { label: 'Morning',       accent: '#b45309', lineColor: '#b4530950' },
  late_morning:  { label: 'Late Morning',  accent: '#b45309', lineColor: '#b4530950' },
  lunch:         { label: 'Lunch',         accent: '#9a3412', lineColor: '#9a341250' },
  afternoon:     { label: 'Afternoon',     accent: '#1d4ed8', lineColor: '#1d4ed850' },
  late_afternoon:{ label: 'Late Afternoon',accent: '#1d4ed8', lineColor: '#1d4ed850' },
  evening:       { label: 'Evening',       accent: '#9f1239', lineColor: '#9f123950' },
  night:         { label: 'Night',         accent: '#5b21b6', lineColor: '#5b21b650' },
};

const INDOOR_KW = ['museum', 'gallery', 'church', 'cathedral', 'chapel', 'restaurant', 'cafe',
  'bistro', 'brasserie', 'bar', 'market hall', 'library', 'theater', 'theatre', 'opera',
  'cinema', 'palace', 'basilica', 'synagogue', 'mosque', 'crypt', 'aquarium', 'indoor'];
const OUTDOOR_KW = ['park', 'garden', 'jardin', 'plaza', 'square', 'place', 'beach',
  'plage', 'viewpoint', 'bridge', 'pont', 'river', 'seine', 'walk', 'promenade', 'trail',
  'canal', 'outdoor'];

// ─── Helpers ──────────────────────────────────────────────────────────────

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDayDate(dateStr) {
  if (!dateStr) return dateStr;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
    }).format(d);
  }
  const d = parseDate(dateStr);
  return d
    ? new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(d)
    : dateStr;
}

function fmtType(type) {
  if (!type) return null;
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function renderRich(text) {
  if (!text) return null;
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-zinc-200">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

function inferIndoor(type, name) {
  const s = `${type || ''} ${name || ''}`.toLowerCase();
  if (INDOOR_KW.some(k => s.includes(k))) return true;
  if (OUTDOOR_KW.some(k => s.includes(k))) return false;
  return null;
}

function matchBadge(name, scores) {
  if (!scores || !name) return null;
  const key = name.toLowerCase().trim();
  let match = scores[key];
  if (!match) {
    for (const [k, v] of Object.entries(scores)) {
      if (key.includes(k) || k.includes(key)) { match = v; break; }
    }
  }
  if (!match) return null;
  if (match.score >= 8.5) return { label: 'Must-see', cls: 'border border-[#c9963c60] text-[#c9963c]' };
  if (match.score >= 7.0) return { label: 'Top-rated', cls: 'border border-sky-800 text-sky-400' };
  return null;
}

// ─── Animation ────────────────────────────────────────────────────────────

const cardV = {
  hidden: { opacity: 0, y: 16 },
  visible: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

const blockV = {
  hidden: { opacity: 0, x: -6 },
  visible: i => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.3 } }),
};

// ─── Small components ─────────────────────────────────────────────────────

function ActivityPhoto({ googlePlaceId, type, name }) {
  const [failed, setFailed] = useState(false);

  if (!googlePlaceId || failed) {
    const grads = {
      museum: 'from-zinc-800 to-zinc-900', gallery: 'from-zinc-800 to-zinc-900',
      church: 'from-stone-800 to-stone-900', chapel: 'from-stone-800 to-stone-900',
      cathedral: 'from-stone-800 to-stone-900', basilica: 'from-stone-800 to-stone-900',
      park: 'from-zinc-800 to-zinc-900', garden: 'from-zinc-800 to-zinc-900',
      restaurant: 'from-zinc-800 to-zinc-900', food: 'from-zinc-800 to-zinc-900',
    };
    const t = (type || '').toLowerCase();
    const grad = Object.entries(grads).find(([k]) => t.includes(k))?.[1] || 'from-zinc-800 to-zinc-900';
    return (
      <div className={`flex h-36 items-end bg-gradient-to-br ${grad} px-4 pb-3`}>
        <span className="text-sm font-medium text-zinc-300">{name}</span>
      </div>
    );
  }

  return (
    <div className="relative h-36 w-full overflow-hidden">
      <Image
        src={`/api/google-photos?placeId=${encodeURIComponent(googlePlaceId)}&w=600`}
        alt={name || ''}
        fill
        className="object-cover"
        sizes="(min-width: 768px) 600px, 100vw"
        onError={() => setFailed(true)}
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <span className="absolute bottom-3 left-4 text-sm font-semibold text-white drop-shadow">{name}</span>
    </div>
  );
}

function ExpandableText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 2);
  }, [text]);

  return (
    <div>
      <div ref={ref} className={`text-sm leading-relaxed text-zinc-400 ${expanded ? '' : 'line-clamp-3'}`}>
        {renderRich(text)}
      </div>
      {clamped && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-1.5 text-xs font-medium transition-colors"
          style={{ color: GOLD }}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

function WeatherBadge({ weather }) {
  if (!weather) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-zinc-400 ring-1 ring-zinc-700">
      {weather.highC}°/{weather.lowC}°C · {weather.sunshineHours}h sun
    </span>
  );
}

function IndoorBadge({ indoor }) {
  if (indoor === null || indoor === undefined) return null;
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 ring-1 ring-zinc-700">
      {indoor ? 'Indoor' : 'Outdoor'}
    </span>
  );
}

function QualityBadge({ badge }) {
  if (!badge) return null;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

// ─── GenericTimeBlock ──────────────────────────────────────────────────────

function GenericTimeBlock({ block, isLast, index, experienceScores }) {
  const act = block.activity;
  if (!act) return null;

  const timeKey = block.time?.toLowerCase();
  const cfg = TIME_BLOCK[timeKey] || TIME_BLOCK.morning;
  const timeRange = block.startTime && block.endTime ? `${block.startTime}–${block.endTime}` : null;
  const typeLabel = fmtType(act.type);
  const showType = typeLabel && !['Food Recommendation', 'Food', 'Neighborhood'].includes(typeLabel);
  const indoor = inferIndoor(act.type, act.name);
  const badge = matchBadge(act.name, experienceScores);
  const isFree = act.price && /free/i.test(act.price);
  const mapsUrl = act.latitude && act.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${act.latitude},${act.longitude}` : null;

  return (
    <motion.div
      className="relative flex gap-4"
      variants={blockV}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-30px' }}
      custom={index}
    >
      {/* Minimal timeline */}
      <div className="flex flex-col items-center pt-3">
        <div
          className="h-1.5 w-1.5 shrink-0 rounded-full ring-2"
          style={{ backgroundColor: cfg.accent + '40', ringColor: cfg.lineColor }}
        />
        {!isLast && (
          <div className="mt-1.5 w-px flex-1 bg-zinc-800" />
        )}
      </div>

      {/* Activity card */}
      <div
        className="mb-5 flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-[#18181b] transition-colors duration-200 hover:border-zinc-700"
        style={{ borderLeftColor: cfg.accent + '60', borderLeftWidth: '2px' }}
      >
        {act.googlePlaceId && (
          <ActivityPhoto googlePlaceId={act.googlePlaceId} type={act.type} name={act.name} />
        )}

        <div className="px-4 py-3.5">
          {/* Time label row */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: cfg.accent }}>
              {cfg.label}
              {timeRange && (
                <span className="ml-2 font-normal normal-case tracking-normal text-zinc-600">· {timeRange}</span>
              )}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {act._aiUpdated && (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c9963c] ring-1 ring-[#c9963c40]">
                  ✦ AI
                </span>
              )}
              {badge && <QualityBadge badge={badge} />}
              {isFree && !badge && (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 ring-1 ring-emerald-900">
                  Free
                </span>
              )}
              <IndoorBadge indoor={indoor} />
            </div>
          </div>

          {/* Name */}
          {!act.googlePlaceId && (
            <h4 className="mt-2 text-base font-semibold leading-snug text-white">{act.name}</h4>
          )}
          {act.googlePlaceId && (
            <h4 className="sr-only">{act.name}</h4>
          )}
          {showType && (
            <p className="mt-0.5 text-xs font-medium" style={{ color: GOLD + 'cc' }}>{typeLabel}</p>
          )}

          {act.description && (
            <div className="mt-2.5">
              <ExpandableText text={act.description} />
            </div>
          )}

          {/* Meta pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {act.duration && (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.5 4v4.25l3.5 2.08-.75 1.23L7 9V4h1.5Z"/></svg>
                {act.duration}
              </span>
            )}
            {act.price && (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                {act.price}
              </span>
            )}
            {act.neighborhood && (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                {act.neighborhood}
              </span>
            )}
          </div>

          {/* CTAs */}
          {(act.bookingUrl || mapsUrl) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {act.bookingUrl && (
                <a
                  href={act.bookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-black transition hover:opacity-90"
                  style={{ backgroundColor: GOLD }}
                >
                  Book / Visit ↗
                </a>
              )}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-transparent px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
                >
                  Map ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── DayCard ──────────────────────────────────────────────────────────────

function DayCard({ day, index, weather, experienceScores }) {
  const neighborhoods = day.timeBlocks
    ? [...new Set(day.timeBlocks.map(b => b.activity?.neighborhood).filter(Boolean))]
    : [];
  const dayNum = day.dayNumber || index + 1;

  return (
    <motion.article
      id={`day-${dayNum}`}
      className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111113]"
      variants={cardV}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      custom={index}
    >
      {/* Day header */}
      <header className="flex items-start gap-5 border-b border-zinc-800/80 px-6 py-5">
        {/* Large serif day number */}
        <div className="shrink-0 pt-0.5">
          <span
            className="font-serif text-5xl font-light leading-none tabular-nums select-none"
            style={{ color: GOLD, letterSpacing: '-0.03em' }}
          >
            {dayNum}
          </span>
        </div>

        <div className="min-w-0 flex-1 pt-1.5">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h3 className="text-base font-semibold text-white">
              {formatDayDate(day.date) || day.date}
            </h3>
            {day.theme && (
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">{day.theme}</span>
            )}
            {weather && <WeatherBadge weather={weather} />}
          </div>
          {neighborhoods.length > 0 && (
            <p className="mt-1 truncate text-xs text-zinc-600">
              {neighborhoods.join(' → ')}
            </p>
          )}
        </div>
      </header>

      {day.timeBlocks && (
        <div className="px-6 py-5">
          {day.timeBlocks.map((block, i) => (
            <GenericTimeBlock
              key={`${block.time}-${i}`}
              block={block}
              isLast={i === day.timeBlocks.length - 1}
              index={i}
              experienceScores={experienceScores}
            />
          ))}
        </div>
      )}
    </motion.article>
  );
}

// ─── DayNavigation ────────────────────────────────────────────────────────

function DayNavigation({ days, activeDayIndex, onDayClick }) {
  return (
    <div className="sticky top-[64px] z-30 -mx-4 overflow-x-auto border-b border-zinc-800 bg-[#0c0c0e]/95 px-4 py-3 shadow-lg backdrop-blur-lg">
      <div className="flex items-center gap-2">
        <span className="mr-2 shrink-0 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
          Jump to
        </span>
        {days.map((day, i) => {
          const num = day.dayNumber || i + 1;
          const active = i === activeDayIndex;
          return (
            <button
              key={day.date || i}
              onClick={() => onDayClick(i)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all"
              style={active
                ? { backgroundColor: GOLD, color: '#000' }
                : { backgroundColor: '#27272a', color: '#71717a' }
              }
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function ItineraryClient({
  plan,
  tripId,
  cityDisplay,
  citySlug,
  thumbnail,
  dateRangeLabel,
  interestsList,
  weather,
  experienceScores,
}) {
  const [showMap, setShowMap] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const dayRefs = useRef([]);

  const [localPlan, setLocalPlan] = useState(plan);
  useEffect(() => { setLocalPlan(plan); }, [plan]);

  const handleActivityUpdate = useCallback((dayNumber, timeBlock, newActivity) => {
    setLocalPlan((prev) => {
      if (!prev?.days) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.dayNumber !== dayNumber && day.day_number !== dayNumber) return day;
          if (day.timeBlocks) {
            return {
              ...day,
              timeBlocks: day.timeBlocks.map((block) =>
                block.time === timeBlock
                  ? { ...block, activity: { ...block.activity, ...newActivity, _aiUpdated: true } }
                  : block
              ),
            };
          }
          return day;
        }),
      };
    });

    const dayIdx = (dayNumber ?? 1) - 1;
    const el = dayRefs.current[dayIdx];
    if (el) {
      el.classList.add('ring-2', 'ring-[#c9963c]', 'ring-offset-2', 'ring-offset-[#0c0c0e]');
      setTimeout(() => el.classList.remove('ring-2', 'ring-[#c9963c]', 'ring-offset-2', 'ring-offset-[#0c0c0e]'), 2500);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = dayRefs.current.indexOf(entry.target);
            if (idx !== -1) setActiveDayIndex(idx);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );
    for (const ref of dayRefs.current) {
      if (ref) observer.observe(ref);
    }
    return () => observer.disconnect();
  }, [localPlan.days.length]);

  const handleDayClick = useCallback((idx) => {
    const el = dayRefs.current[idx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const mapMarkers = useMemo(() => {
    const out = [];
    for (const day of localPlan.days) {
      const dayNum = day.dayNumber || 0;
      for (const b of day.timeBlocks || []) {
        const a = b.activity;
        if (a?.latitude && a?.longitude) {
          out.push({ lat: a.latitude, lng: a.longitude, name: a.name, dayNum, color: GOLD, timeBlock: b.time });
        }
      }
    }
    return out;
  }, [localPlan.days]);

  const hasMap = mapMarkers.length > 0;
  const hasHero = thumbnail && thumbnail !== '/images/city-placeholder.svg';

  return (
    <div
      className="min-h-screen"
      style={{ background: 'radial-gradient(ellipse at 30% 0%, #1a1208 0%, #0c0c0e 55%)' }}
    >
      {/* ── Hero ── */}
      {hasHero ? (
        <div className="relative h-56 w-full overflow-hidden sm:h-64 md:h-[320px]">
          <Image src={thumbnail} alt={cityDisplay} fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-black/50 to-black/20" />
          <div className="absolute inset-x-0 bottom-0 px-6 pb-8 md:px-8 md:pb-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
              {cityDisplay} — Itinerary
            </p>
            <h1 className="mt-1.5 font-serif text-3xl font-light text-white sm:text-4xl md:text-5xl" style={{ letterSpacing: '-0.01em' }}>
              Your {cityDisplay} trip
            </h1>
            {localPlan.summary && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">{localPlan.summary}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="border-b border-zinc-800/60 px-6 pb-8 pt-12 md:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
              {cityDisplay} — Itinerary
            </p>
            <h1 className="mt-2 font-serif text-4xl font-light text-white md:text-5xl" style={{ letterSpacing: '-0.01em' }}>
              Your {cityDisplay} trip
            </h1>
            {localPlan.summary && (
              <p className="mt-2 text-sm text-zinc-400">{localPlan.summary}</p>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* ── Info strip ── */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-800 bg-[#111113]">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Dates</dt>
                <dd className="mt-0.5 font-semibold text-zinc-200">{dateRangeLabel}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Style</dt>
                <dd className="mt-0.5 font-semibold text-zinc-200">{localPlan.travelStyle.headline}</dd>
                <p className="text-[11px] text-zinc-500">{localPlan.travelStyle.description}</p>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Focus</dt>
                <dd className="mt-0.5 font-semibold text-zinc-200">{interestsList}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <ShareButton tripId={tripId} cityName={cityDisplay} />
              <a
                href={`/api/trips/${tripId}/calendar`}
                download
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-700 bg-transparent px-3.5 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
              >
                Calendar
              </a>
              <Link
                href={`/plan/${citySlug}`}
                className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-transparent px-3.5 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
              >
                ← Preferences
              </Link>
            </div>
          </div>
        </div>

        {/* ── Map toggle ── */}
        {hasMap && (
          <div className="mb-8">
            <button
              onClick={() => setShowMap(v => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-transparent px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            >
              {showMap ? 'Hide map' : 'Show trip map'}
            </button>
            {showMap && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="mt-4 overflow-hidden rounded-xl border border-zinc-800"
              >
                <ItineraryMap markers={mapMarkers} />
              </motion.div>
            )}
          </div>
        )}

        {/* ── Book immediately ── */}
        {localPlan.bookImmediately?.length > 0 && (
          <section className="mb-8 overflow-hidden rounded-2xl border border-[#c9963c30] bg-[#c9963c08] px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: GOLD }}>
              Reserve these first
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {localPlan.bookImmediately.map((item) => (
                <div key={item.title} className="rounded-xl border border-zinc-800 bg-[#111113] px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{item.type}</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-200">{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.note}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Day-by-day plan ── */}
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
              Day-by-day plan
            </h2>
            <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c9963c] ring-1 ring-[#c9963c40]">
              Draft
            </span>
          </div>

          {localPlan.days.length > 3 && (
            <DayNavigation days={localPlan.days} activeDayIndex={activeDayIndex} onDayClick={handleDayClick} />
          )}

          <div className="flex flex-col gap-4">
            {localPlan.days.map((day, i) => (
              <div
                key={day.date || i}
                ref={el => { dayRefs.current[i] = el; }}
                className="rounded-2xl transition-all duration-700"
              >
                <DayCard day={day} index={i} weather={weather} experienceScores={experienceScores} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── AI Planner Chat ── */}
      {tripId && citySlug && (
        <PlannerChat
          tripId={tripId}
          citySlug={citySlug}
          cityDisplay={cityDisplay}
          plan={localPlan}
          onActivityUpdate={handleActivityUpdate}
        />
      )}
    </div>
  );
}
