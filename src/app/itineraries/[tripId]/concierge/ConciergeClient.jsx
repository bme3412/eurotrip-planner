'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Moon, Sunrise, ArrowLeft, Loader2, Sparkles, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';
import { resolvePersona } from '@/lib/concierge/personas';
import ActivityImage from '@/components/itinerary/ActivityImage';
import ConciergeWaitlist from '@/components/home/ConciergeWaitlist';
import OlivierMark from './_components/OlivierMark';
import PushMock from './_components/PushMock';
import BriefCard from './_components/BriefCard';
import BriefSkeleton from './_components/BriefSkeleton';
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
import ConciergeOptIn from './_components/ConciergeOptIn';

/**
 * Concierge preview — a rich, multi-section taste of Olivier built from the trip's
 * real shape. Code owns the facts (via /api/trips/[id]/concierge-brief), Claude
 * owns the voice. Day selection lazily regenerates the rich day.
 */
export default function ConciergeClient({
  tripId,
  shareToken = null,
  cityDisplay: cityDisplayProp = null,
  dateRangeLabel: dateRangeLabelProp = null,
  heroImage: heroImageProp = null,
}) {
  const { user, session } = useAuth();
  const shareQuery = shareToken ? `?share=${encodeURIComponent(shareToken)}` : '';
  const authHeaders = useMemo(
    () => getSupabaseAuthHeaders(session, { 'Content-Type': 'application/json' }),
    [session]
  );

  const [cityDisplay, setCityDisplay] = useState(cityDisplayProp);
  const [dateRangeLabel, setDateRangeLabel] = useState(dateRangeLabelProp);
  const [heroImage, setHeroImage] = useState(heroImageProp);

  const [bundle, setBundle] = useState(null); // { meta, days, personalization }
  const [day, setDay] = useState(null); // last fully-generated day applied to the view
  const [activeDay, setActiveDay] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [dayError, setDayError] = useState(false);
  const [loadedDays, setLoadedDays] = useState(() => new Set()); // drives the chips' ready-dots

  // Generated days live for the page's lifetime — switching back is instant.
  const dayCacheRef = useRef(new Map()); // dayNumber → full day payload
  const inflightRef = useRef(new Map()); // dayNumber → pending promise (dedupes click vs prefetch)
  const wantedDayRef = useRef(null); // the day the user currently wants visible (race guard)

  /** Fetch + cache one day's generated payload; deduped per dayNumber. */
  const loadDay = useCallback(
    (dayNumber) => {
      const inflight = inflightRef.current;
      if (inflight.has(dayNumber)) return inflight.get(dayNumber);
      const p = (async () => {
        const res = await fetch(`/api/trips/${tripId}/concierge-brief${shareQuery}`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ dayNumber }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!data?.day) throw new Error('malformed');
        dayCacheRef.current.set(data.day.dayNumber, data.day);
        setLoadedDays((prev) => new Set(prev).add(data.day.dayNumber));
        return data;
      })().finally(() => inflight.delete(dayNumber));
      inflight.set(dayNumber, p);
      return p;
    },
    [tripId, authHeaders, shareQuery]
  );

  /**
   * Day-chip selection. The deterministic scaffold renders immediately (the
   * `view` below); the generated prose swaps in when ready. Cached days are
   * instant. Only the most recently wanted day may update the visible state,
   * so rapid clicks never show a stale day.
   */
  const requestDay = useCallback(
    (dayNumber) => {
      setDayError(false);
      setActiveDay(dayNumber);
      wantedDayRef.current = dayNumber;
      const cached = dayCacheRef.current.get(dayNumber);
      if (cached) {
        setDay(cached);
        return;
      }
      loadDay(dayNumber)
        .then((data) => {
          if (wantedDayRef.current === data.day.dayNumber) setDay(data.day);
        })
        .catch((err) => {
          console.error('[concierge] day fetch failed', err);
          if (wantedDayRef.current === dayNumber) setDayError(true);
        });
    },
    [loadDay]
  );

  /** Initial load: no dayNumber → the server picks the first real day. */
  const fetchInitial = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch(`/api/trips/${tripId}/concierge-brief${shareQuery}`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data?.day) throw new Error('malformed');
      setBundle({ meta: data.meta, days: data.days, personalization: data.personalization });
      dayCacheRef.current.set(data.day.dayNumber, data.day);
      setLoadedDays((prev) => new Set(prev).add(data.day.dayNumber));
      setDay(data.day);
      setActiveDay(data.day.dayNumber);
      wantedDayRef.current = data.day.dayNumber;
      setStatus('ready');
    } catch (err) {
      console.error('[concierge] fetch failed', err);
      setStatus('error');
    }
  }, [tripId, authHeaders, shareQuery]);

  // Warm every remaining real day in the background, one at a time, so chips
  // turn instant while the visitor reads day one. Best-effort: failures are
  // silent (the day just stays on-demand), and responses never touch the
  // visible state unless the user is currently waiting on that exact day.
  const didPrefetch = useRef(false);
  useEffect(() => {
    if (status !== 'ready' || !bundle?.days?.length || didPrefetch.current) return;
    didPrefetch.current = true;
    let cancelled = false;
    (async () => {
      for (const d of bundle.days) {
        if (cancelled) return;
        if (d.isTravelDay || dayCacheRef.current.has(d.dayNumber)) continue;
        try {
          const data = await loadDay(d.dayNumber);
          if (cancelled) return;
          if (wantedDayRef.current === data.day.dayNumber) setDay(data.day);
        } catch {
          /* prefetch is best-effort */
        }
        await new Promise((r) => setTimeout(r, 400));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, bundle, loadDay]);

  // Private trips: load display metadata client-side (no facts in SSR HTML).
  useEffect(() => {
    if (cityDisplayProp || !session?.access_token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}`, { headers: getSupabaseAuthHeaders(session) });
        if (!res.ok || cancelled) return;
        const trip = await res.json();
        const slug = trip.city || 'paris';
        const label = slug.charAt(0).toUpperCase() + slug.slice(1);
        setCityDisplay(label);
        if (trip.start_date && trip.end_date) {
          const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
          const fmtYear = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const s = new Date(`${trip.start_date}T00:00:00`);
          const e = new Date(`${trip.end_date}T00:00:00`);
          setDateRangeLabel(
            s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
              ? `${fmt.format(s)} – ${e.getDate()}, ${e.getFullYear()}`
              : `${fmt.format(s)} – ${fmtYear.format(e)}`
          );
        }
        const cityRes = await fetch(`/api/cities/${slug}`);
        if (!cityRes.ok || cancelled) return;
        const cityData = await cityRes.json();
        if (cancelled) return;
        setCityDisplay(cityData?.cityName || cityData?.name || label);
        const thumb = cityData?.thumbnail;
        if (thumb && thumb !== '/images/city-placeholder.svg') setHeroImage(thumb);
      } catch {
        // optional display polish
      }
    })();
    return () => { cancelled = true; };
  }, [cityDisplayProp, session, tripId]);

  // Auto-load the first day exactly once. fetchInitial's identity changes when
  // the auth session re-renders; without this guard those re-renders would
  // re-fire the (expensive, ~19s) brief request in a loop.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetchInitial();
  }, [fetchInitial]);

  const meta = bundle?.meta;
  const cadence = meta?.cadence;

  // What the day section renders: the generated day when we have it, else the
  // deterministic scaffold for the selected day (heading, hero, schedule render
  // instantly; the prose cards show a writing skeleton until `day` catches up).
  const view = useMemo(() => {
    if (day && day.dayNumber === activeDay) return day;
    const scaffold = bundle?.days?.find((d) => d.dayNumber === activeDay);
    return scaffold || day;
  }, [day, activeDay, bundle]);
  const writing = status === 'ready' && view && !view.briefs;
  const writer = useMemo(
    () => (view ? resolvePersona({ country: view.country, city: view.city }) : null),
    [view]
  );
  const act = view?.firstActivity;

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
              <Sparkles className="h-3.5 w-3.5" /> Early access · Olivier, your travel agent
            </div>
          </div>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.1] text-gray-900 md:text-5xl">
            A taste of your travel agent.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-gray-600">
            Three quiet messages a day, in the voice of someone who lives in{' '}
            <span className="font-semibold text-gray-900">{cityDisplay || 'your trip'}</span>
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
        <MeetOlivier cityName={cityDisplay} destinations={bundle?.meta?.destinations || []} />

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
            <p className="mt-1 text-sm text-gray-500">Try again in a moment — your travel agent is still in preview.</p>
          </div>
        )}

        {status === 'ready' && view && (
          <>
            {/* ── The day ── */}
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold text-gray-900 md:text-3xl">
                    {activeDay === bundle.days.find((d) => !d.isTravelDay)?.dayNumber ? 'Your first day' : `Day ${view.dayNumber}`}
                    {view.cityName ? ` in ${view.cityName}` : ''}
                  </h2>
                  {view.theme && <p className="text-sm text-gray-500">{view.theme}{view.dateLabel ? ` · ${view.dateLabel}` : ''}</p>}
                </div>
              </div>

              <DaySelector days={bundle.days} activeDay={activeDay} loading={writing} onSelect={requestDay} loadedDays={loadedDays} />

              {dayError && (
                <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
                  Couldn&apos;t load that day — try it again in a moment.
                </p>
              )}

              {/* activity banner */}
              {act && (
                <div className="relative mt-5 h-40 overflow-hidden rounded-2xl sm:h-48">
                  <ActivityImage
                    q={`${act.name} ${view.cityName}`}
                    placeId={act.placeId}
                    lat={act.lat}
                    lng={act.lng}
                    citySlug={view.city}
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
                <DaySchedule schedule={view.schedule} hotelName={view.hotelName} arrival={view.arrival} cityName={view.cityName} persona={view.persona || writer} />
              </div>

              {writing ? (
                /* Facts above rendered instantly from the itinerary; the voice
                   is still being written — skeletons, not a frozen old day. */
                <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
                  <div className="lg:sticky lg:top-6 lg:self-start">
                    <div className="mx-auto h-64 w-44 animate-pulse rounded-[2rem] bg-gray-200" />
                    <p className="mt-3 text-center text-xs text-gray-400">
                      {writer?.name || 'Olivier'} is writing day {view.dayNumber}…
                    </p>
                  </div>
                  <div className="space-y-5">
                    <BriefSkeleton icon={Moon} label="Evening brief" when="tonight · the night before" timeOfDay="evening" writerLine={`${writer?.name || 'Olivier'} is writing…`} />
                    <BriefSkeleton icon={Sunrise} label="Morning wake-up" when="~90 min before you go" timeOfDay="morning" />
                    <BriefSkeleton icon={Moon} label="Wind-down" when="around 9pm" timeOfDay="wind-down" />
                  </div>
                </div>
              ) : (
              <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
                {/* Left: how it arrives */}
                <div className="lg:sticky lg:top-6 lg:self-start">
                  <PushMock pushLine={day.pushLine} persona={day.persona} />
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
                    persona={day.persona}
                  >
                    {act && <RouteMap firstActivity={act} departBy={day.departBy} routeNote={day.routeNote} cityName={day.cityName} />}
                  </BriefCard>

                  <BriefCard
                    icon={Sunrise}
                    label="Morning wake-up"
                    when="~90 min before you go"
                    timeOfDay="morning"
                    body={day.briefs.morningWakeup.body}
                    meta={day.briefs.morningWakeup.meta}
                    persona={day.persona}
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
                    persona={day.persona}
                    handoff={day.handoff}
                  />
                </div>
              </div>
              )}
            </section>

            {/* ── Reactive magic ── */}
            {!writing && <ReactiveAlert reactive={day.reactive} persona={day.persona} />}

            {/* ── Mid-page conversion (peak interest) ── */}
            <MidCta targetId="concierge-waitlist" />

            {/* ── Ask Olivier ── */}
            <AskOlivier tripId={tripId} authHeaders={authHeaders} shareQuery={shareQuery} sample={writing ? null : day.sampleAsk} />

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
                  <RhythmTimeline days={bundle.days} activeDay={activeDay} onSelect={requestDay} />
                </div>
              </section>
            )}

            {/* ── Service shape ── */}
            <ServicePreview cadence={cadence} />
          </>
        )}

        {/* ── Turn it on (signed in) / early access (signed out) ── */}
        <div id="concierge-waitlist" className="scroll-mt-6">
          {user ? (
            <div className="mx-auto max-w-xl">
              <ConciergeOptIn tripId={tripId} />
            </div>
          ) : (
            <>
              <p className="mb-4 text-center text-sm font-medium text-gray-500">
                This is a preview. Want Olivier on your real trips?
              </p>
              <div className="mx-auto max-w-md">
                <ConciergeWaitlist heading="Get early access" />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
