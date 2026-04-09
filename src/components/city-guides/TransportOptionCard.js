'use client';

import React from 'react';
import { Train, Bus, Car, Smartphone, TramFront, Clock, Euro } from 'lucide-react';

// Icon mapping for transport types
const TRANSPORT_ICONS = {
  train: Train,
  bus: Bus,
  car: Car,
  taxi: Car,
  smartphone: Smartphone,
  rideshare: Smartphone,
  tram: TramFront,
};

/**
 * Format price display with optional range
 */
const formatPrice = (price) => {
  if (!price) return null;
  const symbol = price.currency === 'EUR' ? '€' : price.currency;
  if (price.amountMax && price.amountMax !== price.amount) {
    return `${symbol}${price.amount}–${price.amountMax}`;
  }
  return `${symbol}${price.amount}`;
};

/**
 * Format duration display
 */
const formatDuration = (duration) => {
  if (!duration) return null;
  if (duration.max && duration.max !== duration.min) {
    return `${duration.min}–${duration.max} min`;
  }
  return `${duration.min} min`;
};

/**
 * TransportOptionCard - Clickable card for selecting transport routes
 *
 * @param {Object} route - Route data from getting-in.json
 * @param {boolean} isActive - Whether this route is currently selected
 * @param {function} onClick - Callback when card is clicked
 * @param {boolean} compact - Use compact layout for mobile
 */
const TransportOptionCard = ({ route, isActive = false, onClick, compact = false }) => {
  const IconComponent = TRANSPORT_ICONS[route.icon] || TRANSPORT_ICONS[route.type] || Car;
  const price = formatPrice(route.price);
  const duration = formatDuration(route.duration);

  if (compact) {
    // Horizontal compact card for mobile/inline use
    return (
      <button
        onClick={onClick}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200
          ${isActive
            ? 'border-blue-500 bg-blue-50 shadow-sm'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }
        `}
        style={{
          borderLeftWidth: '3px',
          borderLeftColor: isActive ? route.color : 'transparent'
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${route.color}15` }}
        >
          <IconComponent
            className="w-4 h-4"
            style={{ color: route.color }}
          />
        </div>
        <div className="text-left min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">{route.name}</div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            {duration && <span>{duration}</span>}
            {price && <span className="font-medium">{price}</span>}
          </div>
        </div>
      </button>
    );
  }

  // Full card layout
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-xl border-2 transition-all duration-200
        ${isActive
          ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      {/* Header with icon and name */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${route.color}20` }}
        >
          <IconComponent
            className="w-5 h-5"
            style={{ color: route.color }}
          />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{route.name}</h4>
          {route.destination && (
            <p className="text-xs text-gray-500">to {route.destination}</p>
          )}
        </div>
      </div>

      {/* Time and Price */}
      <div className="flex items-center gap-4 mb-2">
        {duration && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{duration}</span>
          </div>
        )}
        {price && (
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
            <Euro className="w-4 h-4 text-gray-400" />
            <span>{price}</span>
          </div>
        )}
      </div>

      {/* Frequency */}
      {route.frequency && (
        <p className="text-xs text-gray-500 mb-2">{route.frequency}</p>
      )}

      {/* Pros/Cons badges */}
      {(route.pros?.length > 0 || route.cons?.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {route.pros?.slice(0, 2).map((pro, i) => (
            <span
              key={`pro-${i}`}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"
            >
              {pro}
            </span>
          ))}
          {route.cons?.slice(0, 1).map((con, i) => (
            <span
              key={`con-${i}`}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700"
            >
              {con}
            </span>
          ))}
        </div>
      )}

      {/* Selection indicator */}
      {isActive && (
        <div
          className="mt-3 h-1 rounded-full"
          style={{ backgroundColor: route.color }}
        />
      )}
    </button>
  );
};

/**
 * TransportOptionList - Grid/row of transport option cards
 */
export const TransportOptionList = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  layout = 'grid',
  compact = false
}) => {
  if (!routes || routes.length === 0) return null;

  const gridClass = layout === 'grid'
    ? 'grid grid-cols-2 lg:grid-cols-4 gap-3'
    : 'flex flex-wrap gap-2';

  return (
    <div className={gridClass}>
      {routes.map((route) => (
        <TransportOptionCard
          key={route.id}
          route={route}
          isActive={selectedRouteId === route.id}
          onClick={() => onSelectRoute(route.id)}
          compact={compact || layout === 'row'}
        />
      ))}
    </div>
  );
};

export default TransportOptionCard;
