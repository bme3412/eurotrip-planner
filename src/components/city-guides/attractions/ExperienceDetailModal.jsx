'use client';

import React, { useEffect, useRef } from 'react';
import {
  X, Heart, Clock, MapPin, Star, ExternalLink, Navigation,
  Sun, Ticket, Lightbulb, CalendarRange,
} from 'lucide-react';
import AttractionPhoto from './AttractionPhoto';
import { SCORE_FACTORS } from './lib/constants';
import {
  formatCost, formatDuration, getAllTips, getOverallScore,
  buildDirectionsUrl, overallScoreClass,
} from './lib/display';

/** Normalise the various opening-hours shapes the enrich data can carry. */
function openingHoursList(hours) {
  if (Array.isArray(hours)) return hours;
  if (Array.isArray(hours?.weekdayDescriptions)) return hours.weekdayDescriptions;
  if (typeof hours === 'string') return [hours];
  return null;
}

function Fact({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

/**
 * ExperienceDetailModal — the full "everything about this experience" hub.
 * Surfaces the data the card can't: full description + editorial summary, ALL
 * insider tips, opening hours, the score breakdown, themes, and get-there
 * links. Accessible: Escape + backdrop close, focus moves to the close button,
 * background scroll is locked while open.
 */
export default function ExperienceDetailModal({ experience, onClose, isFavorite, onToggleFavorite, cityName }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!experience) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Remember the element that opened the modal so focus returns to it on
    // close (WCAG 2.4.3). For mouse clicks on the card (a div) this is <body>
    // and the restore is a harmless no-op; for keyboard users it matters.
    const trigger = typeof document !== 'undefined' ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (trigger && typeof trigger.focus === 'function') trigger.focus();
    };
  }, [experience, onClose]);

  if (!experience) return null;

  const a = experience;
  const fav = isFavorite?.(a) ?? false;
  const tips = getAllTips(a);
  const overall = getOverallScore(a);
  const hours = openingHoursList(a.googleOpeningHours);
  const directionsUrl = buildDirectionsUrl(a, cityName);
  const factorScores = a.factorScores || a.scores;
  const durationHours = a?.ratings?.suggested_duration_hours || (a?.duration_minutes ? a.duration_minutes / 60 : null);
  const where = a.address || (a.arrondissement ? `${a.arrondissement} arr.` : null);
  const titleId = 'experience-detail-title';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero */}
        <div className="relative h-52 shrink-0 bg-gray-100 sm:h-60">
          <AttractionPhoto attraction={a} priority sizes="(min-width: 640px) 42rem, 100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />

          <div className="absolute right-3 top-3 flex items-center gap-2">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(a)}
                aria-label={fav ? 'Remove from shortlist' : 'Save to shortlist'}
                className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-colors ${
                  fav ? 'border-rose-600 bg-rose-500 text-white' : 'border-white/40 bg-white/90 text-gray-700 hover:bg-rose-50'
                }`}
              >
                <Heart className={`h-4 w-4 ${fav ? 'fill-white' : ''}`} />
              </button>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/90 text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {overall != null && (
            <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${overallScoreClass(overall)}`}>
              <Star className="h-3 w-3 fill-current" /> {overall.toFixed(1)}/10
            </span>
          )}

          <div className="absolute inset-x-0 bottom-0 p-4">
            <h2 id={titleId} className="text-2xl font-bold leading-tight text-white drop-shadow">{a.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
              {a.category && <span className="capitalize">{a.category}</span>}
              {where && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden /> {where}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {/* Live Google signals */}
          {(a.googleRating || a.currentlyOpen !== undefined) && (
            <div className="flex flex-wrap items-center gap-2">
              {a.googleRating && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {a.googleRating.toFixed(1)}
                  {a.googleReviewCount ? <span className="ml-0.5 text-amber-600">({a.googleReviewCount.toLocaleString()})</span> : null}
                </span>
              )}
              {a.currentlyOpen !== undefined && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${a.currentlyOpen ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${a.currentlyOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                  {a.currentlyOpen ? 'Open now' : 'Closed now'}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {a.description && <p className="text-[15px] leading-relaxed text-gray-700">{a.description}</p>}
          {a.googleEditorialSummary && a.googleEditorialSummary !== a.description && (
            <p className="text-sm italic leading-relaxed text-gray-500">{a.googleEditorialSummary}</p>
          )}

          {/* Quick facts */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Fact icon={Sun} label="Best time" value={a.best_time ? String(a.best_time).replace(/^\w/, (c) => c.toUpperCase()) : null} />
            <Fact icon={Clock} label="Duration" value={durationHours ? formatDuration(durationHours) : null} />
            <Fact icon={Ticket} label="Cost" value={formatCost(a)} />
            <Fact icon={CalendarRange} label="Season" value={a.seasonality ? String(a.seasonality).replace(/^\w/, (c) => c.toUpperCase()) : null} />
          </div>

          {/* Opening hours */}
          {hours && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Clock className="h-4 w-4 text-gray-400" aria-hidden /> Opening hours
              </h3>
              <ul className="space-y-0.5 text-sm text-gray-600">
                {hours.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </section>
          )}

          {/* Insider tips — ALL of them */}
          {tips.length > 0 && (
            <section className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                <Lightbulb className="h-4 w-4" aria-hidden /> Insider tips
              </h3>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-amber-900">
                    <span className="mt-0.5 text-amber-500">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Themes */}
          {Array.isArray(a.themes) && a.themes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {a.themes.map((t) => (
                <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">{t}</span>
              ))}
            </div>
          )}

          {/* Why we rank it — the score breakdown moved here from the card */}
          {factorScores && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Why we rank it</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {SCORE_FACTORS.slice(0, 6).map(({ key, label, icon }) => {
                  const value = factorScores?.[key];
                  if (typeof value !== 'number') return null;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="shrink-0 text-base">{icon}</span>
                      <span className="flex-1 text-sm text-gray-600">{label.replace('{city}', cityName || 'this city')}</span>
                      <div className="flex items-center gap-2">
                        <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 sm:block">
                          <span className="block h-full rounded-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(10, value)) * 10}%` }} />
                        </span>
                        <span className="w-9 text-right text-sm font-bold text-gray-900">{value}/10</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 bg-white p-3">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(a)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                fav ? 'bg-rose-500 text-white hover:bg-rose-600' : 'border border-gray-200 bg-white text-gray-700 hover:bg-rose-50'
              }`}
            >
              <Heart className={`h-4 w-4 ${fav ? 'fill-white' : ''}`} />
              {fav ? 'Saved' : 'Save'}
            </button>
          )}
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Navigation className="h-4 w-4" aria-hidden /> Directions
            </a>
          )}
          {(a.website || a.googleUrl) && (
            <a
              href={a.website || a.googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <ExternalLink className="h-4 w-4" aria-hidden /> {a.website ? 'Book / Visit' : 'Google Maps'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
