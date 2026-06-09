'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Moon, Sunrise, ArrowLeft, Loader2, Sparkles, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';
import ActivityImage from '@/components/itinerary/ActivityImage';
import ConciergeWaitlist from '@/components/home/ConciergeWaitlist';
import OlivierMark from './_components/OlivierMark';
import PushMock from './_components/PushMock';
import BriefCard from './_components/BriefCard';
import WeatherStrip from './_components/WeatherStrip';
import RouteMap from './_components/RouteMap';
import ReactiveAlert from './_components/ReactiveAlert';
import DaySelector from './_components/DaySelector';
import RhythmTimeline from './_components/RhythmTimeline';
import AskOlivier from './_components/AskOlivier';
import KnowsYou from './_components/KnowsYou';
import ServicePreview from './_components/ServicePreview';
import MeetOlivier from './_components/MeetOlivier';
import DaySchedule from './_components/DaySchedule';
import MidCta from './_components/MidCta';

/**
 * Concierge preview — a rich, multi-section taste of Olivier built from the trip's
 * real shape. Code owns the facts (via /api/trips/[id]/concierge-brief), Claude
 * owns the voice. Day selection lazily regenerates the rich day.
 */
export default function ConciergeClient({ tripId, cityDisplay, dateRangeLabel, heroImage }) {
  const { session } = useAuth();
  const authHeaders = useMemo(
    () => getSupabaseAuthHeaders(session, { 'Content-Type': 'application/json' }),
    [session]
  );

  const [bundle, setBundle] = useState(null); // { meta, days, personalization }
  const [day, setDay] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [dayLoading, setDayLoading] = useState(false);

  const fetchDay = useCallback(
    async (dayNumber) => {
      const initial = dayNumber == null;
      if (initial) setStatus('loading');
      else setDayLoading(true);
      try {
        const res = await fetch(`/api/trips/${tripId}/concierge-brief`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(dayNumber != null ? { dayNumber } : {}),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!data?.day) throw new Error('malformed');
        setBundle({ meta: data.meta, days: data.days, personalization: data.personalization });
        setDay(data.day);
        setActiveDay(data.day.dayNumber);
        setStatus('ready');
      } catch (err) {
        console.error('[concierge] fetch failed', err);
        if (initial) setStatus('error');
      } finally {
        if (!initial) setDayLoading(false);
      }
    },
    [tripId, authHeaders]
  );

  // Auto-load the first day exactly once. fetchDay's identity changes when the
  // auth session re-renders; without this guard those re-renders would re-fire
  // the (expensive, ~19s) brief request in a loop.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetchDay(null);
  }, [fetchDay]);

  const meta = bundle?.meta;
  const cadence = meta?.cadence;
  const act = day?.firstActivity;

  return (
    <div className="min-h-screen bg-[#faf8f3]">
      {/* ── Hero ── */}
      <header className="relative overflow-hidden border-b border-amber-100/70">
        {heroImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#faf8f3] via-[#faf8f3]/85 to-[#faf8f3]/55" />
          </>
        )}
        <div className="relative mx-auto max-w-5xl px-6 pt-10 pb-12">
          <Link
            href={`/itineraries/${tripId}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back to itinerary
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <OlivierMark size={44} />
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <Sparkles className="h-3.5 w-3.5" /> Coming soon · Olivier, your concierge
            </div>
          </div>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.1] text-gray-900 md:text-5xl">
            A taste of your concierge.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-gray-600">
            Three quiet messages a day, in the voice of someone who lives in{' '}
            <span className="font-semibold text-gray-900">{cityDisplay}</span>
            {dateRangeLabel ? ` · ${dateRangeLabel}` : ''}. Here&apos;s how it would feel.
          </p>

          {cadence && (
            <div className="mt-6 inline-flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-amber-100/70 bg-white/70 px-5 py-3 text-sm backdrop-blur">
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                <Sparkles className="h-4 w-4 text-blue-500" /> ≈{cadence.totalTouches} messages
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">across your {meta.totalRealDays} days</span>
              <span className="text-gray-400">·</span>
              <span className="inline-flex items-center gap-1.5 text-gray-600">
                <Clock className="h-4 w-4 text-blue-500" /> always in {cadence.timezone}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-14 px-6 py-12">
        {/* ── Meet Olivier (persona) — shown immediately ── */}
        <MeetOlivier cityName={cityDisplay} />

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-100/70 bg-white px-6 py-20 text-center shadow-sm">
            <OlivierMark size={48} />
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <p className="font-semibold text-gray-900">Olivier is reading your itinerary…</p>
            <p className="text-sm text-gray-500">Drafting your first day in {cityDisplay}.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-2xl border border-amber-100/70 bg-white px-6 py-12 text-center shadow-sm">
            <p className="font-semibold text-gray-900">Olivier couldn&apos;t draft your preview just now.</p>
            <p className="mt-1 text-sm text-gray-500">Try again in a moment — the concierge is still in preview.</p>
          </div>
        )}

        {status === 'ready' && day && (
          <>
            {/* ── The day ── */}
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold text-gray-900 md:text-3xl">
                    {activeDay === bundle.days.find((d) => !d.isTravelDay)?.dayNumber ? 'Your first day' : `Day ${day.dayNumber}`}
                    {day.cityName ? ` in ${day.cityName}` : ''}
                  </h2>
                  {day.theme && <p className="text-sm text-gray-500">{day.theme}{day.dateLabel ? ` · ${day.dateLabel}` : ''}</p>}
                </div>
              </div>

              <DaySelector days={bundle.days} activeDay={activeDay} loading={dayLoading} onSelect={fetchDay} />

              {/* activity banner */}
              {act && (
                <div className="relative mt-5 h-40 overflow-hidden rounded-2xl sm:h-48">
                  <ActivityImage
                    q={`${act.name} ${day.cityName}`}
                    placeId={act.placeId}
                    lat={act.lat}
                    lng={act.lng}
                    citySlug={day.city}
                    w={1200}
                    alt={act.name}
                    className="absolute inset-0 h-full w-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Tomorrow opens with</p>
                    <p className="font-display text-xl font-semibold text-white">{act.name}</p>
                    {act.startTime && <p className="text-sm text-white/80">{act.startTime}{act.neighborhood ? ` · ${act.neighborhood}` : ''}</p>}
                  </div>
                </div>
              )}

              {/* whole-day schedule + real bookings */}
              <div className="mt-5">
                <DaySchedule schedule={day.schedule} hotelName={day.hotelName} arrival={day.arrival} />
              </div>

              <div className={`mt-6 grid gap-8 lg:grid-cols-[280px_1fr] ${dayLoading ? 'opacity-60 transition-opacity' : ''}`}>
                {/* Left: how it arrives */}
                <div className="lg:sticky lg:top-6 lg:self-start">
                  <PushMock pushLine={day.pushLine} />
                  <p className="mt-3 text-center text-xs text-gray-400">A glance is all it takes.</p>
                </div>

                {/* Right: the three briefs */}
                <div className="space-y-5">
                  <BriefCard
                    icon={Moon}
                    label="Evening brief"
                    when="tonight · the night before"
                    timeOfDay="evening"
                    body={day.briefs.eveningBrief.body}
                    delight={day.briefs.eveningBrief.delight}
                    decision={day.briefs.eveningBrief.decision}
                    meta={day.briefs.eveningBrief.meta}
                  >
                    {act && <RouteMap firstActivity={act} departBy={day.departBy} routeNote={day.routeNote} />}
                  </BriefCard>

                  <BriefCard
                    icon={Sunrise}
                    label="Morning wake-up"
                    when="~90 min before you go"
                    timeOfDay="morning"
                    body={day.briefs.morningWakeup.body}
                    meta={day.briefs.morningWakeup.meta}
                  >
                    {day.weather && <WeatherStrip weather={day.weather} />}
                  </BriefCard>

                  <BriefCard
                    icon={Moon}
                    label="Wind-down"
                    when="around 9pm"
                    timeOfDay="wind-down"
                    body={day.briefs.windDown.body}
                    tomorrowTease={day.briefs.windDown.tomorrowTease}
                    signoff={day.signoff}
                    meta={day.briefs.windDown.meta}
                  />
                </div>
              </div>
            </section>

            {/* ── Reactive magic ── */}
            <ReactiveAlert reactive={day.reactive} />

            {/* ── Mid-page conversion (peak interest) ── */}
            <MidCta targetId="concierge-waitlist" />

            {/* ── Ask Olivier ── */}
            <AskOlivier tripId={tripId} authHeaders={authHeaders} sample={day.sampleAsk} />

            {/* ── Knows you ── */}
            <KnowsYou personalization={bundle.personalization} cityName={meta?.cityName} />

            {/* ── Rhythm across the trip ── */}
            {bundle.days.length > 1 && (
              <section>
                <h2 className="font-display text-2xl font-bold text-gray-900 md:text-3xl">The rhythm across your trip</h2>
                <p className="mt-2 max-w-2xl text-gray-600">
                  The product isn&apos;t any one message — it&apos;s the cadence. Tap a day to hear how Olivier would open it.
                </p>
                <div className="mt-6">
                  <RhythmTimeline days={bundle.days} activeDay={activeDay} onSelect={fetchDay} />
                </div>
              </section>
            )}

            {/* ── Service shape ── */}
            <ServicePreview cadence={cadence} />
          </>
        )}

        {/* ── Early access ── */}
        <div id="concierge-waitlist" className="scroll-mt-6">
          <p className="mb-4 text-center text-sm font-medium text-gray-500">
            This is a preview. Want Olivier on your real trips?
          </p>
          <div className="mx-auto max-w-md">
            <ConciergeWaitlist heading="Get early access" />
          </div>
        </div>
      </main>
    </div>
  );
}
