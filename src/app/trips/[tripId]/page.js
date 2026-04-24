"use server";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getTripWithDetails } from "@/lib/trips/tripsRepository";

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TIME_BLOCK_ICONS = {
  morning: '☀️',
  lunch: '🍽',
  afternoon: '🏛️',
  evening: '🌆',
  night: '🌙',
};

export async function generateMetadata({ params }) {
  const { tripId } = await params;
  try {
    const trip = await getTripWithDetails(tripId);
    if (!trip) return { title: 'Trip Not Found' };
    const cityName = capitalize(trip.city);
    return {
      title: `${trip.title || `${cityName} Trip`} | EuroTrip Planner`,
      description: `${cityName} itinerary: ${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}`,
      openGraph: {
        title: trip.title || `${cityName} Trip`,
        description: `Explore ${cityName} with this curated itinerary`,
      },
    };
  } catch {
    return { title: 'Trip' };
  }
}

export default async function SharedTripPage({ params }) {
  const { tripId } = await params;
  let trip;

  try {
    trip = await getTripWithDetails(tripId);
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Unable to load this trip.</p>
      </div>
    );
  }

  if (!trip) notFound();

  const cityName = capitalize(trip.city);
  const hasDays = trip.days?.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 py-12">
      <div className="mx-auto max-w-3xl px-4 space-y-8">
        <header className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-xl backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">Shared itinerary</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{trip.title || `${cityName} Trip`}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
          </p>
          {trip.interests?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {trip.interests.map((i) => (
                <span key={i} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{i}</span>
              ))}
            </div>
          )}
        </header>

        {hasDays ? (
          <section className="space-y-6">
            {trip.days.map((day) => (
              <article key={day.id} className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                <header className="mb-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    {day.theme || `Day ${day.day_number}`}
                  </span>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">{formatDate(day.date)}</h3>
                </header>
                <div className="space-y-3">
                  {(day.activities || []).map((act) => (
                    <div key={act.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {TIME_BLOCK_ICONS[act.time_block] || '📍'} {act.time_block}
                        {act.start_time && ` · ${act.start_time}`}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{act.name}</p>
                      {act.description && (
                        <p className="mt-1 text-sm text-slate-600">{act.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        {act.duration_minutes && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">⏳ {act.duration_minutes} min</span>
                        )}
                        {act.neighborhood && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">📍 {act.neighborhood}</span>
                        )}
                        {act.price_range && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">💶 {act.price_range}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-slate-500">This trip doesn&apos;t have a detailed itinerary yet.</p>
          </div>
        )}

        <div className="text-center">
          <Link
            href={`/plan/${trip.city}`}
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Create your own {cityName} trip →
          </Link>
        </div>
      </div>
    </div>
  );
}
