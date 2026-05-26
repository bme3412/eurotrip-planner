'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ShareButton from './ShareButton';
import { GOLD } from './_lib/constants';
import { buildExperienceScoreMap } from './_lib/helpers';
import { DayCard } from './_components/DayCard';
import { DayNavigation } from './_components/DayNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';

const ItineraryMap = dynamic(() => import('./ItineraryMap'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-zinc-800 md:h-[420px]" />,
});

const EditPanel = dynamic(() => import('@/components/itinerary/EditPanel'), {
  ssr: false,
  loading: () => null,
});

export default function ItineraryClient({
  plan,
  tripId,
  cityDisplay,
  citySlug,
  country = 'France',
  thumbnail,
  dateRangeLabel,
  interestsList,
  hasNormalizedDays = false,
  weather: initialWeather,
  experienceScores: initialScores,
}) {
  const { session } = useAuth();
  const [showMap, setShowMap] = useState(false);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const dayRefs = useRef([]);

  const [localPlan, setLocalPlan] = useState(plan);
  useEffect(() => { setLocalPlan(plan); }, [plan]);

  const [weather, setWeather] = useState(initialWeather);
  const [experienceScores, setExperienceScores] = useState(initialScores);
  const [hydrationTriggered, setHydrationTriggered] = useState(false);

  const handleCalendarDownload = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}/calendar`, {
        headers: getSupabaseAuthHeaders(session),
      });
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(cityDisplay || 'trip').replace(/\s+/g, '-')}-trip.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[calendar export]', error);
    }
  }, [cityDisplay, session, tripId]);

  // Hydrate weather + scores on demand: when edit panel opens, map shows, or scores already passed
  useEffect(() => {
    if (!hasNormalizedDays || hydrationTriggered) return;
    if (!editPanelOpen && !showMap && initialScores) return;

    setHydrationTriggered(true);

    const countryPath = country.toLowerCase();
    const cityPath = citySlug.toLowerCase();

    if (!weather) {
      fetch(`/data/${countryPath}/${cityPath}/${cityPath}-visit-calendar.json`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.months) {
            const startMonth = localPlan.days?.[0]?.date;
            if (startMonth) {
              const d = new Date(startMonth);
              const monthName = d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }).toLowerCase();
              setWeather(data.months[monthName]?.weatherDetails || null);
            }
          }
        })
        .catch(() => {});
    }

    if (!experienceScores) {
      fetch(`/data/${countryPath}/${cityPath}/${cityPath}-experiences.json`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setExperienceScores(buildExperienceScoreMap(data));
          }
        })
        .catch(() => {});
    }
  }, [hasNormalizedDays, hydrationTriggered, editPanelOpen, showMap, weather, experienceScores, initialScores, country, citySlug, localPlan.days]);

  // Pre-index experience scores for O(1) lookups in matchBadge
  const indexedScores = useMemo(() => {
    if (!experienceScores) return null;
    const index = new Map();
    for (const [key, value] of Object.entries(experienceScores)) {
      index.set(key, value);
      const words = key.split(/\s+/);
      if (words.length > 1) {
        words.forEach(word => {
          if (word.length > 4 && !index.has(word)) {
            index.set(word, value);
          }
        });
      }
    }
    return index;
  }, [experienceScores]);

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
              <button
                onClick={() => setEditPanelOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
              <ShareButton tripId={tripId} cityName={cityDisplay} />
              <button
                type="button"
                onClick={handleCalendarDownload}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-700 bg-transparent px-3.5 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
              >
                Calendar
              </button>
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
                <DayCard day={day} index={i} weather={weather} experienceScores={indexedScores} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Edit Panel ── */}
      {tripId && citySlug && (
        <EditPanel
          open={editPanelOpen}
          onClose={() => setEditPanelOpen(false)}
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
