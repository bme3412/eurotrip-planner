'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Pencil, CalendarDays, Sparkles } from 'lucide-react';
import ShareButton from './ShareButton';
import { formatDayDate } from './_lib/helpers';
import ItineraryView from '@/components/itinerary/ItineraryView';
import RegenerateDayControl from '@/components/itinerary/RegenerateDayControl';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentInvited } from '@/hooks/useAgentInvited';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';
import { accommodationsByCity, getBookings, pickInbound, pickOutbound } from '@/lib/planning/tripBookings';

const EditPanel = dynamic(() => import('@/components/itinerary/EditPanel'), {
  ssr: false,
  loading: () => null,
});

/**
 * Saved itinerary page. Renders the shared <ItineraryView> (same component the
 * post-generation overlay uses) and injects the page's own actions —
 * Travel agent / Edit / Share / Calendar — into the hero, keeping the Edit panel
 * and live activity editing.
 */
export default function ItineraryClient({
  plan,
  tripState = null,
  tripId,
  cityDisplay,
  citySlug,
  country = 'France',
  thumbnail,
  dateRangeLabel,
  interestsList,
  shareToken = null,
}) {
  const { session } = useAuth();
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);

  // Where "Travel agent" leads: invited owners get the REAL agent (Trip Home
  // thread); everyone else (signed out, share viewers, not yet invited) keeps
  // the concierge preview. Trip Home needs write access, so share viewers
  // always get the preview regardless of their own invite.
  const agentInvited = useAgentInvited() && !shareToken;

  // Warm the concierge's first-day brief so clicking "Travel agent" lands on a
  // durably cached page instead of a ~19s generation. Fire-and-forget; the
  // server dedupes a warm request against a real click in flight, and an
  // already-cached brief makes this a cheap no-op read.
  const warmedRef = useRef(false);
  const warmConcierge = useCallback(() => {
    if (warmedRef.current) return;
    warmedRef.current = true;
    const shareQuery = shareToken ? `?share=${encodeURIComponent(shareToken)}` : '';
    fetch(`/api/trips/${tripId}/concierge-brief${shareQuery}`, {
      method: 'POST',
      headers: getSupabaseAuthHeaders(session, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({}),
    }).catch(() => { /* warming is best-effort */ });
  }, [tripId, session, shareToken]);

  useEffect(() => {
    const t = setTimeout(warmConcierge, 3000);
    return () => clearTimeout(t);
  }, [warmConcierge]);

  const handleCalendarDownload = useCallback(async () => {
    try {
      const shareQuery = shareToken ? `?share=${encodeURIComponent(shareToken)}` : '';
      const res = await fetch(`/api/trips/${tripId}/calendar${shareQuery}`, {
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
  }, [cityDisplay, session, tripId, shareToken]);

  const handleActivityUpdate = useCallback((dayNumber, timeBlock, newActivity) => {
    setLocalPlan((prev) => {
      if (!prev?.days) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.dayNumber !== dayNumber && day.day_number !== dayNumber) return day;
          if (!day.timeBlocks) return day;
          return {
            ...day,
            timeBlocks: day.timeBlocks.map((block) =>
              block.time === timeBlock
                ? { ...block, activity: { ...block.activity, ...newActivity, _aiUpdated: true } }
                : block
            ),
          };
        }),
      };
    });
  }, []);

  // Adapt the saved single/multi-city plan into the shape ItineraryView expects.
  const adapted = useMemo(() => {
    const days = (localPlan.days || []).map((d) => ({
      ...d,
      cityName: d.cityName || cityDisplay,
      city: d.city || citySlug,
      country: d.country || country,
      isTravelDay: d.isTravelDay || false,
      dateLabel: d.dateLabel || formatDayDate(d.date) || d.date,
    }));

    // Fold captured lodging + flights (from trip_state jsonb) onto the rebuilt
    // days so the saved page shows them too — no DB columns needed. Accommodation
    // attaches to each city's first day; inbound/outbound flights frame the trip.
    const acc = tripState ? accommodationsByCity(tripState) : {};
    const flights = tripState ? getBookings(tripState) : [];
    const inbound = pickInbound(flights);
    const outbound = pickOutbound(flights);
    const seenCity = new Set();
    for (const d of days) {
      if (d.isTravelDay) continue;
      if (!seenCity.has(d.city)) {
        seenCity.add(d.city);
        if (acc[d.city]) d.accommodation = acc[d.city];
      }
    }
    const firstReal = days.find((d) => !d.isTravelDay);
    const lastReal = [...days].reverse().find((d) => !d.isTravelDay);
    if (inbound && firstReal) firstReal.arrival = inbound;
    if (outbound && lastReal) lastReal.departure = outbound;

    const cityOrder = [];
    for (const d of days) {
      if (d.isTravelDay || !d.cityName) continue;
      if (!cityOrder.some((c) => c.name === d.cityName)) {
        cityOrder.push({ city: d.city, name: d.cityName, country: d.country });
      }
    }
    const cities = cityOrder.length ? cityOrder : [{ city: citySlug, name: cityDisplay, country }];
    const cityDays = days.filter((d) => !d.isTravelDay);

    // Only surface a real narrative intro. The normalized-day rebuild produces a
    // generic stats string ("14 days, 50 activities — curated for your … pace")
    // that just duplicates the hero meta line, so drop that shape.
    const rawIntro = localPlan.summary || '';
    const isGenericStats = /\d+\s*days?,\s*\d+\s*activit/i.test(rawIntro);
    const intro = rawIntro && !isGenericStats ? rawIntro : null;

    return {
      intro,
      cities,
      bookImmediately: localPlan.bookImmediately || [],
      meta: {
        startDate: days[0]?.date || null,
        endDate: days[days.length - 1]?.date || null,
        totalCities: cities.length,
        totalCityDays: cityDays.length,
        totalDays: days.length,
      },
      days,
    };
  }, [localPlan, tripState, cityDisplay, citySlug, country]);

  const heroActions = (
    <>
      <Link
        href={agentInvited ? `/trips/${tripId}/today` : `/itineraries/${tripId}/concierge`}
        onMouseEnter={warmConcierge}
        onFocus={warmConcierge}
        onTouchStart={warmConcierge}
        className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        <Sparkles className="h-3.5 w-3.5" /> Travel agent
      </Link>
      <button
        type="button"
        onClick={() => setEditPanelOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-white"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </button>
      <ShareButton tripId={tripId} cityName={cityDisplay} />
      <button
        type="button"
        onClick={handleCalendarDownload}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
      >
        <CalendarDays className="h-3.5 w-3.5" /> Calendar
      </button>
    </>
  );

  const hasHero = thumbnail && thumbnail !== '/images/city-placeholder.svg';

  return (
    <>
      <ItineraryView
        itinerary={adapted}
        showPhotos
        heroImage={hasHero ? thumbnail : null}
        actions={heroActions}
        // Owners can redo a whole day with free-text steering; share viewers
        // and travel days don't get the control.
        dayActions={
          session && !shareToken
            ? (d) =>
                d.isTravelDay ? null : (
                  <RegenerateDayControl
                    tripId={tripId}
                    dayNumber={d.dayNumber}
                    authHeaders={getSupabaseAuthHeaders(session, { 'Content-Type': 'application/json' })}
                  />
                )
            : null
        }
      />

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
    </>
  );
}
