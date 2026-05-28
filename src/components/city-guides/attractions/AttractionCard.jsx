'use client';

import React from 'react';
import Image from 'next/image';
import { Heart, Clock, MapPin, Star, ExternalLink } from 'lucide-react';
import GooglePlacePhoto from '@/components/common/GooglePlacePhoto';
import { SCORE_FACTORS } from './lib/constants';
import { formatCost, formatDuration, getTypeIcon, generateTips } from './lib/display';

/**
 * 6-factor score grid shown under each card.
 */
function ScoreDisplay({ factorScores, cityName }) {
  const cityLabel = cityName || 'this city';
  return (
    <div className="pt-4 border-t border-gray-100">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {SCORE_FACTORS.slice(0, 6).map(({ key, label, icon }) => {
          const value = factorScores?.[key] ?? 0;
          const resolvedLabel = label.replace('{city}', cityLabel);
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-lg shrink-0">{icon}</span>
              <span className="text-sm text-gray-700 flex-1">{resolvedLabel}</span>
              <span className="text-sm font-bold text-gray-900">{value}/10</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Google Places badges — rating, "Open now" pill, link out to Maps.
 */
function GoogleBadges({ attraction }) {
  const hasGoogleData = attraction.googleRating || attraction.currentlyOpen !== undefined || attraction.googleUrl;
  if (!hasGoogleData) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {attraction.googleRating && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {attraction.googleRating.toFixed(1)}
          {attraction.googleReviewCount && (
            <span className="text-amber-600 ml-0.5">({attraction.googleReviewCount.toLocaleString()})</span>
          )}
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
      {attraction.googleUrl && (
        <a
          href={attraction.googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Google Maps
        </a>
      )}
    </div>
  );
}

/**
 * Practical-tips overlay shown on photo hover.
 */
function TipsOverlay({ tips }) {
  if (!tips || tips.length === 0) return null;
  return (
    <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-xl border border-gray-100 w-full">
        <ul className="space-y-1.5">
          {tips.map((tip, i) => (
            <li key={i} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">💡</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Photo block — prefers Google photo by `photoName`, then `placeId`, then
 * the JSON-supplied `image`, then a typed emoji fallback.
 */
function AttractionPhoto({ attraction, priority, sizes }) {
  if (attraction.googlePhotos?.[0]?.name) {
    return (
      <GooglePlacePhoto
        photoName={attraction.googlePhotos[0].name}
        maxWidth={640}
        alt={attraction.name}
        fill
        sizes={sizes}
        className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
        priority={priority}
        fallback={attraction.image ? (
          <Image src={attraction.image} alt={attraction.name} fill sizes={sizes} className="object-cover object-center" />
        ) : null}
      />
    );
  }
  if (attraction.googlePlaceId) {
    return (
      <GooglePlacePhoto
        placeId={attraction.googlePlaceId}
        maxWidth={640}
        alt={attraction.name}
        fill
        sizes={sizes}
        className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
        priority={priority}
        fallback={attraction.image ? (
          <Image src={attraction.image} alt={attraction.name} fill sizes={sizes} className="object-cover object-center" />
        ) : null}
      />
    );
  }
  if (attraction.image) {
    return (
      <Image
        src={attraction.image}
        alt={attraction.name}
        fill
        sizes={sizes}
        className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
      {getTypeIcon(attraction.type)}
    </div>
  );
}

/**
 * AttractionCard — the horizontal-on-desktop, vertical-on-mobile card that
 * the AttractionsList renders for every visible attraction.
 *
 * Props:
 *   • attraction       — the attraction object
 *   • indexForPriority — overall index in the grid; first 4 get `priority`
 *   • isFavorite       — (item) => boolean
 *   • onToggleFavorite — (item) => void
 */
export default function AttractionCard({ attraction, indexForPriority, isFavorite, onToggleFavorite, cityName }) {
  if (!attraction) return null;
  const tips = generateTips(attraction);
  const isFav = isFavorite(attraction);
  const cardId = attraction.id || `attraction-${indexForPriority}`;
  const sizes = '(min-width: 1280px) 320px, (min-width: 768px) 280px, 100vw';

  return (
    <div
      key={cardId}
      className="group rounded-2xl border border-gray-100 bg-white/95 shadow-md transition-all duration-300 hover:shadow-lg overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100 sm:w-80 shrink-0">
          <AttractionPhoto attraction={attraction} priority={indexForPriority < 4} sizes={sizes} />

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(attraction); }}
            className={`absolute top-3 right-3 z-10 h-8 w-8 rounded-full backdrop-blur-sm border shadow-sm flex items-center justify-center transition-colors ${
              isFav
                ? 'bg-rose-500 border-rose-600 text-white'
                : 'bg-white/95 border-gray-200 hover:bg-rose-50'
            }`}
            aria-label={isFav ? 'Remove from favorites' : 'Save to favorites'}
          >
            <Heart className={`h-4 w-4 ${isFav ? 'fill-white' : 'text-gray-600'}`} />
          </button>

          <TipsOverlay tips={tips} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 leading-snug">{attraction.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{attraction.category}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-base font-semibold text-gray-900">{formatCost(attraction)}</span>
            </div>
          </div>

          {attraction.description && (
            <p className="text-sm text-gray-700 leading-relaxed">{attraction.description}</p>
          )}

          <GoogleBadges attraction={attraction} />

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-400" />
              {formatDuration(attraction?.ratings?.suggested_duration_hours || attraction?.duration_minutes / 60)}
            </span>
            {attraction.arrondissement && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-gray-400" />
                {attraction.arrondissement} arr.
              </span>
            )}
          </div>

          {(attraction.factorScores || attraction.scores) && (
            <ScoreDisplay factorScores={attraction.factorScores || attraction.scores} cityName={cityName} />
          )}

          {attraction.website && (
            <div className="pt-2">
              <a
                href={attraction.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Book / Visit site →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
