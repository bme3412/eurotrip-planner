'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ShareButton from './ShareButton';

const ItineraryMap = dynamic(() => import('./ItineraryMap'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-2xl bg-slate-200/50 md:h-[420px]" />,
});

// ─── Config ─────────────────────────────────────────────────────────────

const TIME_BLOCK = {
  morning:   { icon: '☀️', label: 'Morning',   border: 'border-l-amber-400',  dot: 'bg-amber-100',  ring: 'ring-amber-200' },
  lunch:     { icon: '🍽️', label: 'Lunch',      border: 'border-l-orange-400', dot: 'bg-orange-100', ring: 'ring-orange-200' },
  afternoon: { icon: '🏛️', label: 'Afternoon',  border: 'border-l-sky-400',    dot: 'bg-sky-100',    ring: 'ring-sky-200' },
  evening:   { icon: '🌆', label: 'Evening',    border: 'border-l-purple-400', dot: 'bg-purple-100', ring: 'ring-purple-200' },
  night:     { icon: '🌙', label: 'Night',      border: 'border-l-indigo-400', dot: 'bg-indigo-100', ring: 'ring-indigo-200' },
};

const DAY_COLORS = [
  '#4F46E5', '#0891B2', '#059669', '#D97706', '#DC2626',
  '#7C3AED', '#DB2777', '#2563EB', '#65A30D', '#EA580C',
];

const INDOOR_KW = ['museum', 'gallery', 'church', 'cathedral', 'chapel', 'restaurant', 'cafe',
  'bistro', 'brasserie', 'bar', 'market hall', 'library', 'theater', 'theatre', 'opera',
  'cinema', 'palace', 'basilica', 'synagogue', 'mosque', 'crypt', 'aquarium', 'indoor'];
const OUTDOOR_KW = ['park', 'garden', 'jardin', 'plaza', 'square', 'place', 'beach',
  'plage', 'viewpoint', 'bridge', 'pont', 'river', 'seine', 'walk', 'promenade', 'trail',
  'canal', 'outdoor'];

// ─── Helpers ────────────────────────────────────────────────────────────

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
      ? <strong key={i} className="font-semibold text-slate-800">{part}</strong>
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
  if (match.score >= 8.5) return { label: 'Must-see', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
  if (match.score >= 7.0) return { label: 'Highly rated', cls: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' };
  return null;
}

// ─── Animation ──────────────────────────────────────────────────────────

const cardV = {
  hidden: { opacity: 0, y: 20 },
  visible: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } }),
};

const blockV = {
  hidden: { opacity: 0, x: -10 },
  visible: i => ({ opacity: 1, x: 0, transition: { delay: i * 0.05, duration: 0.35 } }),
};

// ─── Small Components ───────────────────────────────────────────────────

function ActivityPhoto({ googlePlaceId, type, name }) {
  const [failed, setFailed] = useState(false);

  if (!googlePlaceId || failed) {
    const gradients = {
      museum: 'from-indigo-400 to-purple-500', gallery: 'from-indigo-400 to-purple-500',
      church: 'from-amber-400 to-orange-500', chapel: 'from-amber-400 to-orange-500',
      cathedral: 'from-amber-400 to-orange-500', basilica: 'from-amber-400 to-orange-500',
      park: 'from-emerald-400 to-teal-500', garden: 'from-emerald-400 to-teal-500',
      restaurant: 'from-orange-400 to-red-400', food: 'from-orange-400 to-red-400',
      cafe: 'from-amber-300 to-orange-400', bistro: 'from-amber-300 to-orange-400',
      monument: 'from-slate-400 to-slate-600', tower: 'from-slate-400 to-slate-600',
    };
    const t = (type || '').toLowerCase();
    const grad = Object.entries(gradients).find(([k]) => t.includes(k))?.[1] || 'from-slate-300 to-slate-400';
    return (
      <div className={`flex h-36 items-end bg-gradient-to-br ${grad} px-4 pb-3`}>
        <span className="text-sm font-semibold text-white/90 drop-shadow-sm">{name}</span>
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <span className="absolute bottom-3 left-4 text-sm font-semibold text-white drop-shadow-sm">{name}</span>
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
      <div
        ref={ref}
        className={`text-sm leading-relaxed text-slate-600 ${expanded ? '' : 'line-clamp-3'}`}
      >
        {renderRich(text)}
      </div>
      {clamped && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-1 text-xs font-medium text-indigo-500 transition-colors hover:text-indigo-700"
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
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-100">
      ☁️ {weather.highC}°/{weather.lowC}°C · {weather.sunshineHours}h sun
    </span>
  );
}

function IndoorBadge({ indoor }) {
  if (indoor === null || indoor === undefined) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
      indoor ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'
    }`}>
      {indoor ? 'Indoor' : 'Outdoor'}
    </span>
  );
}

function QualityBadge({ badge }) {
  if (!badge) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

// ─── GenericTimeBlock ───────────────────────────────────────────────────

function GenericTimeBlock({ block, isLast, index, experienceScores }) {
  const act = block.activity;
  if (!act) return null;

  const cfg = TIME_BLOCK[block.time?.toLowerCase()] || TIME_BLOCK.morning;
  const timeRange = block.startTime && block.endTime ? `${block.startTime} – ${block.endTime}` : null;
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
      {/* Timeline dot + connector */}
      <div className="flex flex-col items-center pt-1">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${cfg.dot} ring-2 ${cfg.ring}`}>
          {cfg.icon}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-gradient-to-b from-slate-200 to-transparent" />}
      </div>

      {/* Card */}
      <div className={`mb-5 flex-1 overflow-hidden rounded-2xl border-l-4 ${cfg.border} bg-white shadow-sm transition-shadow hover:shadow-md`}>
        {act.googlePlaceId && (
          <ActivityPhoto googlePlaceId={act.googlePlaceId} type={act.type} name={act.name} />
        )}

        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {cfg.label}
              {timeRange && <span className="ml-1.5 font-normal normal-case tracking-normal">· {timeRange}</span>}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {badge && <QualityBadge badge={badge} />}
              {isFree && !badge && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 ring-1 ring-emerald-200">Free</span>
              )}
              <IndoorBadge indoor={indoor} />
            </div>
          </div>

          {!act.googlePlaceId && (
            <h4 className="mt-2 text-base font-bold text-slate-900">{act.name}</h4>
          )}
          {act.googlePlaceId && (
            <h4 className="mt-2 text-base font-bold text-slate-900 sr-only">{act.name}</h4>
          )}
          {showType && <p className="mt-0.5 text-xs font-medium text-indigo-500">{typeLabel}</p>}

          {act.description && (
            <div className="mt-2">
              <ExpandableText text={act.description} />
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {act.duration && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/60">
                <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.5 4v4.25l3.5 2.08-.75 1.23L7 9V4h1.5Z"/></svg>
                {act.duration}
              </span>
            )}
            {act.price && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/60">
                {isFree ? '🆓' : '💶'} {act.price}
              </span>
            )}
            {act.neighborhood && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/60">
                📍 {act.neighborhood}
              </span>
            )}
          </div>

          {(act.bookingUrl || mapsUrl) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {act.bookingUrl && (
                <a href={act.bookingUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500">
                  Book / Visit site <span aria-hidden="true">↗</span>
                </a>
              )}
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800">
                  Map <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── ParisBlock ─────────────────────────────────────────────────────────

function ParisBlock({ block, index }) {
  const { slot, slotType, item, transferMinutes, longTransfer, transferFrom, transferDistanceKm } = block;
  if (!item) return null;

  return (
    <motion.div
      variants={blockV}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={index}
      className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4"
    >
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
        <span className="text-lg leading-none">{slotType === 'food' ? '🍽' : '📍'}</span> {slot}
      </p>
      <div className="mt-1 flex flex-col gap-1">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer"
            className="text-sm font-semibold text-indigo-600 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500">
            {item.name}
          </a>
        ) : (
          <p className="text-sm font-semibold text-slate-900">{item.name}</p>
        )}
        {item.subtitle && <p className="text-xs font-medium text-indigo-500">{item.subtitle}</p>}
        {item.arrondissement && <p className="text-xs font-medium text-slate-500">Arr. {item.arrondissement}</p>}
      </div>
      {item.friendlyDetails?.length > 0 && (
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
          {item.friendlyDetails.map((line, idx) => (
            <p key={idx}>{renderRich(line)}</p>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {item.bestTime && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">🕒 {item.bestTime}</span>
        )}
        {item.durationHours && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">⏳ {item.durationHours}h</span>
        )}
        {item.price && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">💶 {item.price}</span>
        )}
        {item.transit?.closest_metro?.[0] && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            🚇 L{item.transit.closest_metro[0].line} · {item.transit.closest_metro[0].station}
          </span>
        )}
      </div>
      {transferMinutes != null && (
        <p className={`mt-3 text-xs ${longTransfer ? 'text-amber-600' : 'text-slate-500'}`}>
          {longTransfer
            ? `Plan about ${transferMinutes} min${transferDistanceKm ? ` (~${transferDistanceKm} km)` : ''} from ${transferFrom || 'the previous stop'}`
            : `Quick hop: ~${transferMinutes} min${transferDistanceKm ? ` (~${transferDistanceKm} km)` : ''} from ${transferFrom || 'the previous stop'}`}
        </p>
      )}
      {item.url && (
        <a href={item.url} target="_blank" rel="noreferrer"
          className="mt-3 inline-flex w-max items-center gap-2 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500">
          Book tickets online <span aria-hidden="true">↗︎</span>
        </a>
      )}
    </motion.div>
  );
}

// ─── DayCard ────────────────────────────────────────────────────────────

function DayCard({ day, index, weather, experienceScores }) {
  const hasGenericBlocks = day.timeBlocks && !day.blocks;
  const neighborhoods = hasGenericBlocks
    ? [...new Set(day.timeBlocks.map(b => b.activity?.neighborhood).filter(Boolean))]
    : [];
  const zoneSummary = day.zones?.length ? [...new Set(day.zones)].join(' → ') : null;

  return (
    <motion.article
      id={`day-${day.dayNumber || index + 1}`}
      className="rounded-3xl border border-slate-200 bg-white shadow-sm"
      variants={cardV}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      custom={index}
    >
      <header className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
        {day.dayNumber != null && (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-sm"
            style={{ backgroundColor: DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length] }}
          >
            {day.dayNumber}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{formatDayDate(day.date) || day.date}</h3>
            {day.theme && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600">
                {day.theme}
              </span>
            )}
            {weather && <WeatherBadge weather={weather} />}
          </div>
          {(zoneSummary || neighborhoods.length > 0) && (
            <p className="mt-1 truncate text-xs text-slate-500">
              📍 {zoneSummary || neighborhoods.join(' → ')}
            </p>
          )}
        </div>
      </header>

      {hasGenericBlocks && (
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

      {day.blocks && (
        <div className="space-y-5 px-6 py-5">
          {day.blocks.map((block, i) => (
            <ParisBlock key={`${block.slot}-${i}`} block={block} index={i} />
          ))}
          {day.supporting?.length > 0 && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600">Evening wind-down</p>
              {day.supporting.map((item) => (
                <div key={item.title} className="mt-2 space-y-1">
                  <p className="text-sm font-semibold text-indigo-900">{item.title}</p>
                  {item.subtitle && <p className="text-xs font-medium text-indigo-600">{item.subtitle}</p>}
                  {item.description && <p className="text-sm text-indigo-700">{item.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
}

// ─── DayNavigation ──────────────────────────────────────────────────────

function DayNavigation({ days, activeDayIndex, onDayClick }) {
  return (
    <div className="sticky top-[64px] z-30 -mx-4 overflow-x-auto border-b border-slate-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-lg">
      <div className="flex items-center gap-2">
        <span className="mr-2 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Jump to
        </span>
        {days.map((day, i) => {
          const num = day.dayNumber || i + 1;
          const active = i === activeDayIndex;
          return (
            <button
              key={day.date || i}
              onClick={() => onDayClick(i)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                active
                  ? 'scale-110 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
              style={active ? { backgroundColor: DAY_COLORS[(num - 1) % DAY_COLORS.length] } : undefined}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────

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

  // Track which day is in view
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
  }, [plan.days.length]);

  const handleDayClick = useCallback((idx) => {
    const el = dayRefs.current[idx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const mapMarkers = useMemo(() => {
    const out = [];
    for (const day of plan.days) {
      const dayNum = day.dayNumber || 0;
      const color = DAY_COLORS[(dayNum - 1) % DAY_COLORS.length];
      for (const b of day.timeBlocks || []) {
        const a = b.activity;
        if (a?.latitude && a?.longitude) {
          out.push({ lat: a.latitude, lng: a.longitude, name: a.name, dayNum, color, timeBlock: b.time });
        }
      }
      for (const b of day.blocks || []) {
        if (b.item?.latitude && b.item?.longitude) {
          out.push({ lat: b.item.latitude, lng: b.item.longitude, name: b.item.name, dayNum, color, timeBlock: b.slot });
        }
      }
    }
    return out;
  }, [plan.days]);

  const hasMap = mapMarkers.length > 0;
  const hasHero = thumbnail && thumbnail !== '/images/city-placeholder.svg';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
      {/* ── Hero ── */}
      {hasHero ? (
        <div className="relative h-52 w-full overflow-hidden sm:h-60 md:h-72">
          <Image src={thumbnail} alt={cityDisplay} fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 px-6 pb-6 md:px-8 md:pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
              {cityDisplay} Itinerary
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white drop-shadow-sm sm:text-3xl md:text-4xl">
              Your {cityDisplay} trip
            </h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">{plan.summary}</p>
          </div>
        </div>
      ) : (
        <div className="px-6 pt-12 md:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-500">{cityDisplay} Itinerary</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">Your {cityDisplay} trip</h1>
            <p className="mt-2 text-sm text-slate-500">{plan.summary}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* ── Info strip ── */}
        <div className="mb-8 rounded-2xl border border-white/60 bg-white/95 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Dates</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{dateRangeLabel}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Style</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{plan.travelStyle.headline}</dd>
                <p className="text-[11px] text-slate-400">{plan.travelStyle.description}</p>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Focus</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{interestsList}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <ShareButton tripId={tripId} cityName={cityDisplay} />
              <a
                href={`/api/trips/${tripId}/calendar`}
                download
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
              >
                📅 Calendar
              </a>
              <Link
                href={`/plan/${citySlug}`}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
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
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
            >
              🗺️ {showMap ? 'Hide trip map' : 'Show trip map'}
            </button>
            {showMap && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="mt-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
              >
                <ItineraryMap markers={mapMarkers} />
              </motion.div>
            )}
          </div>
        )}

        {/* ── Book immediately ── */}
        {plan.bookImmediately?.length > 0 && (
          <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <h2 className="text-base font-bold text-amber-900">Reserve these first</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {plan.bookImmediately.map((item) => (
                <div key={item.title} className="rounded-xl border border-amber-200 bg-white px-3 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">{item.type}</p>
                  <p className="mt-1 text-sm font-semibold text-amber-900">{item.title}</p>
                  <p className="mt-1 text-xs text-amber-700">{item.note}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Day-by-day plan ── */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Your day-by-day plan</h2>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 ring-1 ring-amber-200">
              Draft
            </span>
          </div>

          {plan.days.length > 3 && (
            <DayNavigation days={plan.days} activeDayIndex={activeDayIndex} onDayClick={handleDayClick} />
          )}

          <div className="flex flex-col gap-5">
            {plan.days.map((day, i) => (
              <div key={day.date || i} ref={el => { dayRefs.current[i] = el; }}>
                <DayCard day={day} index={i} weather={weather} experienceScores={experienceScores} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
