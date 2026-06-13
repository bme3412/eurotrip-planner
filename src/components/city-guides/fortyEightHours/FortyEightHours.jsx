'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Sunrise, UtensilsCrossed, Sun, Moon, MapPin, Lightbulb, Clock } from 'lucide-react';
import { titleCaseFromSlug } from '@/lib/text';
import { useStopPhoto } from './useStopPhoto';

const PERIOD_META = {
  morning: { Icon: Sunrise, ring: 'bg-amber-100 text-amber-600' },
  midday: { Icon: UtensilsCrossed, ring: 'bg-rose-100 text-rose-600' },
  afternoon: { Icon: Sun, ring: 'bg-sky-100 text-sky-600' },
  evening: { Icon: Moon, ring: 'bg-indigo-100 text-indigo-600' },
};

function StopCard({ block, cityName, index }) {
  const { url, attribution } = useStopPhoto(block.placeName, cityName);
  const meta = PERIOD_META[block.period] || PERIOD_META.afternoon;
  const { Icon } = meta;

  return (
    <li className="relative pl-12 sm:pl-16">
      {/* Timeline node */}
      <span
        className={`absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-white shadow-sm sm:h-11 sm:w-11 ${meta.ring}`}
        aria-hidden
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md sm:flex">
        {/* Photo — fixed 3:2 ratio, pinned to top so it never stretches to the
            text column's height in the desktop flex row */}
        <div className="relative aspect-[3/2] w-full shrink-0 self-start bg-gradient-to-br from-gray-100 to-gray-200 sm:w-2/5">
          {url ? (
            <Image
              src={url}
              alt={block.placeName || block.title}
              fill
              sizes="(min-width: 640px) 40vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <Icon className="h-10 w-10" />
            </div>
          )}
          {url && attribution && (
            <span className="absolute bottom-1.5 right-2 text-[9px] text-white/80 drop-shadow-sm">© {attribution}</span>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 p-5">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            <span>{block.time}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">Stop {index}</span>
          </div>
          <h4 className="text-lg font-bold leading-snug text-gray-900">{block.title}</h4>
          {block.neighborhood && (
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="h-3 w-3" /> {block.neighborhood}
            </div>
          )}
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{block.body}</p>
          {block.tip && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
              <p className="text-xs leading-snug text-amber-900">{block.tip}</p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function DaySection({ day, cityName, startIndex }) {
  return (
    <section>
      <div className="mb-5 flex items-baseline gap-3">
        <h3 className="text-2xl font-extrabold tracking-tight text-gray-900">{day.label}</h3>
        {day.subtitle && <p className="text-sm font-medium text-purple-600">{day.subtitle}</p>}
      </div>
      <ol className="relative space-y-6 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-gray-200 sm:before:left-[22px]">
        {day.blocks.map((block, i) => (
          <StopCard key={i} block={block} cityName={cityName} index={startIndex + i} />
        ))}
      </ol>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-8 w-2/3 rounded bg-gray-200" />
      <div className="h-4 w-full rounded bg-gray-100" />
      {[0, 1].map((d) => (
        <div key={d} className="space-y-4">
          <div className="h-6 w-32 rounded bg-gray-200" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-gray-100" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * "48 Hours In…" tab — a NYT "36 Hours"-style two-day itinerary. Content is
 * fetched from /api/city-itinerary/48h (Claude-generated, grounded in the
 * city's data, cached server-side). Degrades to a friendly empty state.
 */
export default function FortyEightHours({ cityName }) {
  const displayName = titleCaseFromSlug(cityName);
  const [state, setState] = useState({ status: 'loading', itinerary: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', itinerary: null });
    const params = new URLSearchParams({ city: cityName, name: displayName });
    fetch(`/api/city-itinerary/48h?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { itinerary: null }))
      .then((data) => {
        if (cancelled) return;
        setState({ status: data?.itinerary ? 'ready' : 'empty', itinerary: data?.itinerary || null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'empty', itinerary: null });
      });
    return () => { cancelled = true; };
  }, [cityName, displayName]);

  if (state.status === 'loading') {
    return <div className="p-4 sm:p-6"><Skeleton /></div>;
  }

  if (state.status === 'empty' || !state.itinerary) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
          <div className="mb-3 text-4xl">🗺️</div>
          <h3 className="text-lg font-semibold text-gray-900">Itinerary coming soon</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">
            We&apos;re still crafting the perfect 48 hours in {displayName}. Check back shortly.
          </p>
        </div>
      </div>
    );
  }

  const { itinerary } = state;
  let runningIndex = 1;

  return (
    <div className="p-4 sm:p-6">
      {/* Editorial header */}
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-600">The Weekend Guide</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          {itinerary.title || `${displayName} in 48 Hours`}
        </h2>
        {itinerary.intro && (
          <p className="mt-3 text-lg leading-relaxed text-gray-700">{itinerary.intro}</p>
        )}
      </header>

      <div className="space-y-12">
        {itinerary.days.map((day, i) => {
          const startIndex = runningIndex;
          runningIndex += day.blocks.length;
          return <DaySection key={i} day={day} cityName={cityName} startIndex={startIndex} />;
        })}
      </div>

      <p className="mt-10 text-xs text-gray-400">
        Itinerary curated for {displayName} from our city guide. Hours and bookings change — confirm before you go.
      </p>
    </div>
  );
}
