'use client';

import React, { useState } from 'react';
import { ChevronDown, MapPin, Clock, Heart, ExternalLink } from 'lucide-react';
import { buildDirectionsUrl } from '../../attractions/lib/display';
import { buildReservationUrl } from '../lib/links';

export default function RestaurantCard({ restaurant, category, cityName = null, isFavorite = null, onToggleFavorite = null }) {
  const [expanded, setExpanded] = useState(false);
  const isFav = isFavorite?.(restaurant) ?? false;

  const neighborhood = restaurant.neighborhood || restaurant.location;
  // No coordinates in the culinary data — the builder falls back to a
  // "name, neighborhood, city" Maps query.
  const mapsUrl = buildDirectionsUrl(
    { name: restaurant.name, address: neighborhood },
    cityName,
  );

  const isBar = category === 'bars';
  const isCoffee = category === 'coffee_shops';
  const isStreetFood = category === 'street_food';

  const signature =
    restaurant.signature_dishes ||
    restaurant.signature_drinks ||
    restaurant.must_try ||
    restaurant.specialties;

  const signatureLabel = isBar
    ? 'Try:'
    : isCoffee
    ? 'Must try:'
    : isStreetFood
    ? 'Specialties:'
    : 'Signature:';

  const hasExpandable =
    restaurant.atmosphere || restaurant.local_tips || restaurant.booking_tips;

  // Reservation link for places that actually take bookings — a Google-search
  // reserve link on a street stall or café is noise.
  const takesReservations = !isCoffee && !isStreetFood;
  const reserveUrl = takesReservations ? buildReservationUrl(restaurant, cityName) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900">{restaurant.name}</h4>
            {restaurant.michelin_stars > 0 && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                {Array(restaurant.michelin_stars).fill('★').join('')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {restaurant.cuisine_type || restaurant.type || restaurant.specialty || 'Restaurant'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {restaurant.price_range && (
            <span className="text-sm font-medium text-gray-700">
              {restaurant.price_range}
            </span>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(restaurant)}
              className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-colors ${
                isFav
                  ? 'border-rose-600 bg-rose-500 text-white'
                  : 'border-gray-200 bg-white hover:bg-rose-50'
              }`}
              aria-label={isFav ? 'Remove from favorites' : 'Save to favorites'}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-white' : 'text-gray-600'}`} />
            </button>
          )}
        </div>
      </div>

      {/* Quick info */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-600">
        {neighborhood && (
          mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-blue-600 hover:underline underline-offset-2 transition-colors"
              aria-label={`Open ${restaurant.name} in Maps`}
            >
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {neighborhood}
            </a>
          ) : (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {neighborhood}
            </span>
          )
        )}
        {restaurant.best_time && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {restaurant.best_time}
          </span>
        )}
      </div>

      {/* Signature dishes or drinks */}
      {signature && (
        <div className="mt-3">
          <p className="text-sm text-gray-700">
            <span className="font-medium">{signatureLabel}</span>{' '}
            {signature.slice(0, 3).join(', ')}
          </p>
        </div>
      )}

      {/* Actions: details expander + reservation link */}
      {(hasExpandable || reserveUrl) && (
        <div className="mt-3 flex items-center justify-between gap-3">
          {hasExpandable ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {expanded ? 'Show less' : 'More details'}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          ) : (
            <span />
          )}
          {reserveUrl && (
            <a
              href={reserveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
              aria-label={`Reserve a table at ${restaurant.name}`}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Reserve
            </a>
          )}
        </div>
      )}

      {/* Expandable details */}
      {hasExpandable && (
        <>
          {expanded && (
            <div className="mt-3 space-y-2 text-sm text-gray-600 border-t border-gray-100 pt-3">
              {restaurant.atmosphere && (
                <p>
                  <span className="font-medium text-gray-700">Atmosphere:</span>{' '}
                  {restaurant.atmosphere}
                </p>
              )}
              {restaurant.local_tips && (
                <p>
                  <span className="font-medium text-gray-700">Local tip:</span>{' '}
                  {restaurant.local_tips}
                </p>
              )}
              {restaurant.booking_tips && (
                <p>
                  <span className="font-medium text-gray-700">Booking:</span>{' '}
                  {restaurant.booking_tips}
                </p>
              )}
              {restaurant.dress_code && (
                <p>
                  <span className="font-medium text-gray-700">Dress code:</span>{' '}
                  {restaurant.dress_code}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
