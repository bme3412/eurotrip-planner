'use client';

import React from 'react';
import { Heart, Clock, MapPin, Star, Sun, Navigation, ExternalLink, Lightbulb, ChevronRight } from 'lucide-react';
import AttractionPhoto from './AttractionPhoto';
import {
  formatCost, formatDuration, getAllTips, getOverallScore,
  buildDirectionsUrl, overallScoreClass,
} from './lib/display';

/** Compact at-a-glance Google signals (rating + open-now). The full Google
 *  Maps / hours live in the detail modal. */
function GoogleBadges({ attraction }) {
  if (!attraction.googleRating && attraction.currentlyOpen === undefined) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {attraction.googleRating && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {attraction.googleRating.toFixed(1)}
          {attraction.googleReviewCount ? (
            <span className="ml-0.5 text-amber-600">({attraction.googleReviewCount.toLocaleString()})</span>
          ) : null}
        </span>
      )}
      {attraction.currentlyOpen !== undefined && (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
          attraction.currentlyOpen ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${attraction.currentlyOpen ? 'bg-green-500' : 'bg-red-500'}`} />
          {attraction.currentlyOpen ? 'Open now' : 'Closed'}
        </span>
      )}
    </div>
  );
}

function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
      <Icon className="h-3.5 w-3.5 text-gray-400" aria-hidden />
      {children}
    </span>
  );
}

/**
 * AttractionCard — a scannable summary for one experience. Practical data
 * (duration, best time, neighborhood, price, themes) is surfaced as chips; one
 * insider tip shows inline (no more hover-only overlay); the analytical score
 * breakdown moves to the detail modal. Clicking the card (or "Details") opens
 * the full ExperienceDetailModal.
 *
 * Props:
 *   • attraction, indexForPriority, cityName
 *   • isFavorite(item) => bool, onToggleFavorite(item)
 *   • onOpenDetail(item) — open the detail modal
 */
export default function AttractionCard({ attraction, indexForPriority, isFavorite, onToggleFavorite, cityName, onOpenDetail }) {
  if (!attraction) return null;

  const isFav = isFavorite?.(attraction) ?? false;
  const cardId = attraction.id || `attraction-${indexForPriority}`;
  const sizes = '(min-width: 1280px) 320px, (min-width: 768px) 288px, 100vw';
  const overall = getOverallScore(attraction);
  const tips = getAllTips(attraction);
  const moreTips = Math.max(0, tips.length - 1);
  const durationHours = attraction?.ratings?.suggested_duration_hours || (attraction?.duration_minutes ? attraction.duration_minutes / 60 : null);
  const directionsUrl = buildDirectionsUrl(attraction, cityName);
  const themes = Array.isArray(attraction.themes) ? attraction.themes.slice(0, 2) : [];
  // Mirror the modal: a curated booking URL, else the Google Maps place link.
  const bookUrl = attraction.website || attraction.googleUrl || null;
  const bookLabel = attraction.website ? 'Book' : 'Map';
  const open = () => onOpenDetail?.(attraction);
  const stop = (e) => e.stopPropagation();

  return (
    <article
      key={cardId}
      onClick={open}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white/95 shadow-md transition-all duration-300 hover:shadow-lg"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gray-100 sm:aspect-[3/4] sm:w-72">
          <AttractionPhoto
            attraction={attraction}
            priority={indexForPriority < 4}
            sizes={sizes}
            className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
          />

          {overall != null && (
            <span className={`absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${overallScoreClass(overall)}`}>
              <Star className="h-3 w-3 fill-current" /> {overall.toFixed(1)}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => { stop(e); onToggleFavorite?.(attraction); }}
            className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-colors ${
              isFav ? 'border-rose-600 bg-rose-500 text-white' : 'border-gray-200 bg-white/95 hover:bg-rose-50'
            }`}
            aria-label={isFav ? 'Remove from shortlist' : 'Save to shortlist'}
          >
            <Heart className={`h-4 w-4 ${isFav ? 'fill-white' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-snug text-gray-900">
                <button
                  type="button"
                  onClick={(e) => { stop(e); open(); }}
                  className="text-left hover:text-blue-700"
                >
                  {attraction.name}
                </button>
              </h3>
              {attraction.category && <p className="mt-0.5 text-sm capitalize text-gray-500">{attraction.category}</p>}
            </div>
            <span className="shrink-0 text-base font-semibold text-gray-900">{formatCost(attraction)}</span>
          </div>

          {/* Practical chips — the at-a-glance "how to do this" */}
          <div className="flex flex-wrap gap-2">
            {durationHours ? <Chip icon={Clock}>{formatDuration(durationHours)}</Chip> : null}
            {attraction.best_time ? <Chip icon={Sun}>{String(attraction.best_time).replace(/^\w/, (c) => c.toUpperCase())}</Chip> : null}
            {attraction.arrondissement ? <Chip icon={MapPin}>{attraction.arrondissement} arr.</Chip> : null}
            {themes.map((t) => (
              <span key={t} className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium capitalize text-blue-700">
                {t}
              </span>
            ))}
          </div>

          {attraction.description && (
            <p className="line-clamp-3 text-sm leading-relaxed text-gray-700">{attraction.description}</p>
          )}

          <GoogleBadges attraction={attraction} />

          {/* Inline tip teaser — accessible, not hover-only */}
          {tips.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
              <p className="text-sm leading-snug text-amber-900">
                <span className="line-clamp-2">{tips[0]}</span>
                {moreTips > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { stop(e); open(); }}
                    className="mt-0.5 font-semibold text-amber-700 underline-offset-2 hover:underline"
                  >
                    +{moreTips} more tip{moreTips > 1 ? 's' : ''}
                  </button>
                )}
              </p>
            </div>
          )}

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => { stop(e); open(); }}
              className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              View details <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stop}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Navigation className="h-3.5 w-3.5 text-gray-400" aria-hidden /> Directions
              </a>
            )}
            {bookUrl && (
              <a
                href={bookUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stop}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> {bookLabel}
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
