"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * SelectedCityCard
 *
 * Phase 4 unified replacement for the Mapbox HTML popup. Renders the
 * currently-selected city in the bottom-left corner of the map with a
 * hero strip, country chip, optional description, and three actions:
 *
 *   1. Add to shortlist  — placeholder until phase 5 (useShortlist).
 *   2. City guide        — link into /city-guides/[city].
 *   3. Start plan        — link into /plan with the city preselected.
 *
 * Why this exists: previously the Mapbox HTML popup and a separate
 * React panel were both visible after a marker click. The plan
 * (lovely-baking-piglet.md) calls for a single React-owned card; the
 * HTML popup path stays in `mapPopup.js` for fallback / future reuse.
 */
function SelectedCityCard({ city, ranking = null, startDate = null, endDate = null, onClose, onAddToShortlist, alreadyShortlisted = false }) {
  // Resolve a hero image. Server-side data carries `thumbnail` like
  // `/images/cities/{Country}/{slug}/thumbnail.jpeg`; if it's missing,
  // derive the same path from country + id as a best-effort fallback.
  const heroSrc = useMemo(() => {
    if (city?.thumbnail) return city.thumbnail;
    if (!city?.country || !city?.id) return null;
    const countrySegment = String(city.country).replace(/\s+/g, "-");
    return `/images/cities/${countrySegment}/${city.id}/thumbnail.jpeg`;
  }, [city]);

  if (!city) return null;

  const slug =
    city.id ||
    (city.title ? city.title.toLowerCase().replace(/\s+/g, "-") : "");

  const guideHref = slug ? `/city-guides/${slug}` : "/city-guides";
  const planHref = (() => {
    const params = new URLSearchParams();
    params.set("city", slug);
    params.set("cityName", city.title || "");
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return `/plan?${params.toString()}`;
  })();

  return (
    <div
      // Phase 6: on mobile the card docks to the bottom edge as a
      // bottom-sheet (full width, rounded top only). On desktop it
      // stays in the bottom-left corner as a compact card.
      className="absolute z-20 inset-x-0 bottom-0 w-full overflow-hidden rounded-t-3xl border-t border-slate-200 bg-white/95 shadow-xl backdrop-blur md:inset-x-auto md:bottom-4 md:left-4 md:w-[min(360px,calc(100%-2rem))] md:rounded-3xl md:border"
      role="dialog"
      aria-label={`${city.title} details`}
    >
      {/* Hero strip. Falls back to a neutral slate band if the image
          fails — keeps the card height stable either way. */}
      <div className="relative h-32 w-full bg-slate-200">
        {heroSrc && (
          <Image
            src={heroSrc}
            alt={city.title || "City"}
            fill
            sizes="360px"
            className="object-cover"
            // We don't know which images will actually exist for every
            // city until phase 5, so swallow load errors silently.
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close selected city"
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow ring-1 ring-slate-200 hover:text-slate-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="p-5">
        {city.country && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {city.country}
          </span>
        )}
        <h2 className="mt-2 text-2xl font-bold leading-tight text-slate-950">
          {city.title}
        </h2>

        {/* Ranking context for the active dates (from the V4 engine). Falls
            back to the plain description when no dates are set / city unranked. */}
        {ranking ? (
          <>
            {/* Surface ordinal rank only for the top tier — below it, rank is
                false precision given how compressed the scores are. */}
            {ranking.band?.key === 'top' && ranking.rank ? (
              <p className="mt-2 text-xs font-bold text-emerald-700">
                Ranked #{ranking.rank} for your dates
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {ranking.band && (
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ranking.band.bg} ${ranking.band.text}`}>
                  {ranking.band.label} for your dates
                </span>
              )}
              {ranking.weather?.highC != null && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {ranking.weather.highC}°C
                </span>
              )}
              {ranking.crowdLevel && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 capitalize">
                  {ranking.crowdLevel} crowds
                </span>
              )}
            </div>
            {(ranking.whyExpanded || ranking.why) && (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                {ranking.whyExpanded || ranking.why}
              </p>
            )}
          </>
        ) : (
          city.description && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
              {city.description}
            </p>
          )
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {/* Phase 5: wired into useShortlist via ExploreMap. When the
              city is already in the tray the button collapses into a
              non-interactive "Added" state. */}
          <button
            type="button"
            onClick={onAddToShortlist}
            disabled={!onAddToShortlist}
            className={
              alreadyShortlisted
                ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"
                : "inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            }
            title={
              alreadyShortlisted
                ? "Already in your shortlist"
                : onAddToShortlist
                ? "Add to shortlist"
                : "Shortlist full"
            }
          >
            {alreadyShortlisted ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
            )}
            {alreadyShortlisted ? "Added to shortlist" : "Add to shortlist"}
          </button>
          <Link
            href={guideHref}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300"
          >
            City guide
          </Link>
          <Link
            href={planHref}
            className="inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            Plan now →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SelectedCityCard;
