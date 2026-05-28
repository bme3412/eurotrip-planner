'use client';

import React, { useState } from 'react';
import { ChevronDown, MapPin, Clock } from 'lucide-react';

export default function RestaurantCard({ restaurant, category }) {
  const [expanded, setExpanded] = useState(false);

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
        <span className="text-sm font-medium text-gray-700 shrink-0">
          {restaurant.price_range}
        </span>
      </div>

      {/* Quick info */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-600">
        {(restaurant.neighborhood || restaurant.location) && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            {restaurant.neighborhood || restaurant.location}
          </span>
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

      {/* Expandable details */}
      {hasExpandable && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {expanded ? 'Show less' : 'More details'}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>

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
