"use server";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCityData } from "@/lib/data-utils";
import { buildParisRecommendations } from "@/lib/planning/buildParisRecommendations";

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateRange(start, end) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return "Flexible dates";

  const sameMonth = startDate.getMonth() === endDate.getMonth();
  const sameYear = startDate.getFullYear() === endDate.getFullYear();

  const startFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? { year: "numeric" } : {}),
  });
  const endFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (sameMonth && sameYear) {
    return `${startDate.getDate()}–${endDate.getDate()} ${startFormatter.format(startDate)}`;
  }

  const startPart = sameYear ? startFormatter.format(startDate) : endFormatter.format(startDate);
  const endPart = endFormatter.format(endDate);
  return `${startPart} → ${endPart}`;
}

async function fetchTrip(tripId) {
  try {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single();
    if (error) {
      if (error.code === "PGRST116" || error.code === "42P01") {
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Failed to load trip", error);
    throw error;
  }
}

function buildFriendlyDetails(item) {
  const lines = [];
  if (item.description) {
    lines.push(item.description.replace(/(^\w)/, (c) => c.toUpperCase()));
  }

  const minDur = item.visitProfile?.min_duration_hours ?? item.durationHours;
  const maxDur = item.visitProfile?.max_duration_hours;
  const block = item.visitProfile?.ideal_time_block;
  const bestTime = item.bestTime || item.openingHours?.weekday;

  if (bestTime || minDur || block) {
    const tidbits = [];
    if (bestTime) tidbits.push(`Sweet spot: ${bestTime.toLowerCase()}.`);
    if (minDur && maxDur && maxDur !== minDur) {
      tidbits.push(`Expect to linger for ${minDur}-${maxDur} hrs.`);
    } else if (minDur) {
      tidbits.push(`Give it about ${minDur} hr${minDur > 1 ? 's' : ''}.`);
    }
    if (block) tidbits.push(`Feels best as a ${block.toLowerCase()} moment.`);
    if (tidbits.length) lines.push(tidbits.join(' '));
  }

  if (item.bookingTips) lines.push(item.bookingTips);

  if (!item.bookingTips && item.transit?.closest_metro?.[0]) {
    const metro = item.transit.closest_metro[0];
    const walk = metro.walk_minutes ?? 5;
    lines.push(`Closest metro: line ${metro.line} ${metro.station} — about ${walk} min on foot.`);
  }

  return lines;
}

function renderRichText(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <strong key={`bold-${idx}`} className="font-semibold text-slate-800">
        {part}
      </strong>
    ) : (
      <span key={`text-${idx}`}>{part}</span>
    )
  );
}

function DayCard({ day }) {
  const zoneSummary = day.zones?.length ? [...new Set(day.zones)].join(' → ') : null;
  return (
    <article className="rounded-3xl border border-slate-300 bg-white px-6 py-7 shadow-lg shadow-slate-200/60 transition-transform hover:-translate-y-0.5">
      <header className="flex flex-col gap-3 pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">{day.theme}</span>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">{day.date}</h3>
        </div>
        {zoneSummary && (
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <span className="inline-flex h-2 w-2 rounded-full bg-slate-500" />
            {zoneSummary}
          </div>
        )}
      </header>
      <div className="space-y-6">
        {day.blocks.map(({ slot, slotType, item, transferMinutes, longTransfer, transferFrom, transferDistanceKm }, index) => (
            <div key={`${slot}-${index}`} className="relative">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  <span className="text-lg leading-none">{slotType === 'food' ? '🍽' : '📍'}</span> {slot}
                </p>
                <div className="mt-1 flex flex-col gap-1">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-indigo-600 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  )}
                  {item.subtitle && <p className="text-xs font-medium text-indigo-500">{item.subtitle}</p>}
                  {item.arrondissement && (
                    <p className="text-xs font-medium text-slate-500">Arr. {item.arrondissement}</p>
                  )}
                </div>
                <div className="mt-3 space-y-3 text-base leading-7 text-slate-700">
                  {buildFriendlyDetails(item).map((line, idx) => (
                    <p key={`detail-${idx}`}>{renderRichText(line)}</p>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
                  {item.bestTime && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-slate-700">
                      🕒 {item.bestTime}
                    </span>
                  )}
                  {item.openingHours?.weekday && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-slate-700">
                      ⏰ {item.openingHours.weekday}
                    </span>
                  )}
                  {item.durationHours && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-slate-700">
                      ⏳ {item.durationHours}h
                    </span>
                  )}
                  {item.price && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-slate-700">
                      💶 {item.price}
                    </span>
                  )}
                  {item.transit?.closest_metro?.[0] && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-slate-700">
                      🚇 L{item.transit.closest_metro[0].line} · {item.transit.closest_metro[0].station}
                    </span>
                  )}
                </div>
                {transferMinutes != null && (
                  <p className={`mt-3 text-xs ${longTransfer ? 'text-amber-600' : 'text-slate-500'}`}>
                    {longTransfer
                      ? `Heads up—plan about ${transferMinutes} min${transferDistanceKm ? ` (~${transferDistanceKm} km)` : ''} from ${transferFrom || 'the previous stop'}.`
                      : `Quick hop: about ${transferMinutes} min${transferDistanceKm ? ` (~${transferDistanceKm} km)` : ''} from ${transferFrom || 'the previous stop'}.`}
                  </p>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex w-max items-center gap-2 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
                  >
                    Book tickets online
                    <span aria-hidden="true">↗︎</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      {day.supporting?.length ? (
        <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600">Evening wind-down</p>
          {day.supporting.map((item) => (
            <div key={item.title} className="mt-2 space-y-1">
              <p className="text-sm font-semibold text-indigo-900">{item.title}</p>
              {item.subtitle && <p className="text-xs font-medium text-indigo-600">{item.subtitle}</p>}
              {item.description && <p className="text-sm text-indigo-700">{item.description}</p>}
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default async function ItineraryPage({ params }) {
  const { tripId } = await params;
  let trip;
  try {
    trip = await fetchTrip(tripId);
  } catch (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 py-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 text-slate-700">
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-6 shadow-sm">
            <h1 className="text-xl font-semibold text-red-800">We couldn&apos;t load this itinerary yet</h1>
            <p className="mt-2 text-sm text-red-700">
              Something went wrong while connecting to Supabase. Double-check that your environment variables are set and try again.
            </p>
            <Link
              href="/paris-trip"
              className="mt-4 inline-flex w-max items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800"
            >
              ← Back to trip preferences
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    notFound();
  }

  const cityData = await getCityData('paris');
  const plan = buildParisRecommendations(trip, cityData);

  const dateRangeLabel = formatDateRange(trip.start_date, trip.end_date);
  const interestsList = trip.interests?.length ? trip.interests.join(' · ') : 'Paris essentials';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4">
        <header className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-xl backdrop-blur md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">Paris MVP preview</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">Your Paris itinerary draft</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">{plan.summary}</p>
            </div>
            <Link
              href="/paris-trip"
              className="inline-flex items-center justify-center rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              ← Update preferences
            </Link>
          </div>
          <dl className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm text-slate-600 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dates</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{dateRangeLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Travel style</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{plan.travelStyle.headline}</dd>
              <p className="text-xs text-slate-500">{plan.travelStyle.description}</p>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Focus areas</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{interestsList}</dd>
            </div>
          </dl>
        </header>

        {plan.bookImmediately.length > 0 && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 shadow-sm">
            <h2 className="text-lg font-semibold text-amber-900">Reserve these first</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {plan.bookImmediately.map((item) => (
                <div key={item.title} className="rounded-2xl border border-amber-200 bg-white px-4 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">{item.type}</p>
                  <p className="mt-2 text-sm font-semibold text-amber-900">{item.title}</p>
                  <p className="mt-2 text-sm text-amber-700">{item.note}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Day-by-day game plan</h2>
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">Draft</span>
          </div>
          <div className="flex flex-col gap-6">
            {plan.days.map((day) => (
              <DayCard key={day.date} day={day} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
