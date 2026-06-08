'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Pencil, CalendarDays, ArrowLeft } from 'lucide-react';
import ShareButton from './ShareButton';
import { formatDayDate } from './_lib/helpers';
import ItineraryView from '@/components/itinerary/ItineraryView';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';

const EditPanel = dynamic(() => import('@/components/itinerary/EditPanel'), {
  ssr: false,
  loading: () => null,
});

/**
 * Saved itinerary page. Renders the shared <ItineraryView> (same component the
 * post-generation overlay uses) and injects the page's own actions —
 * Edit / Share / Calendar / Preferences — into the hero, keeping the Edit panel
 * and live activity editing.
 */
export default function ItineraryClient({
  plan,
  tripId,
  cityDisplay,
  citySlug,
  country = 'France',
  thumbnail,
  dateRangeLabel,
  interestsList,
}) {
  const { session } = useAuth();
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);

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
  }, [localPlan, cityDisplay, citySlug, country]);

  const heroActions = (
    <>
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
      <Link
        href={`/plan/${citySlug}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Preferences
      </Link>
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
