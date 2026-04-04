'use client';

import { Train, Plane, Bus, Ship, Car, Clock, Euro, ExternalLink, ArrowRight } from 'lucide-react';

/**
 * TransportCard Component
 *
 * Displays transport information for travel days in multi-city itineraries.
 * Shows route, transport type, duration, price, and booking link.
 */

const TRANSPORT_ICONS = {
  train: { icon: Train, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  flight: { icon: Plane, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  bus: { icon: Bus, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  ferry: { icon: Ship, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  car: { icon: Car, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' }
};

function TransportIcon({ type }) {
  const config = TRANSPORT_ICONS[type] || TRANSPORT_ICONS.train;
  const Icon = config.icon;

  return (
    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${config.bg} ${config.border} border`}>
      <Icon className={`h-6 w-6 ${config.color}`} />
    </div>
  );
}

export default function TransportCard({ transfer, showTips = true }) {
  if (!transfer) return null;

  const { from, to, transport } = transfer;
  const config = TRANSPORT_ICONS[transport?.type] || TRANSPORT_ICONS.train;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950">
      {/* Header - Route */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <TransportIcon type={transport?.type} />
            <div>
              <h3 className="text-lg font-semibold text-white">
                {from?.name || from?.city} → {to?.name || to?.city}
              </h3>
              <p className="text-sm text-zinc-400">
                {from?.country} {from?.country !== to?.country && `→ ${to?.country}`}
              </p>
            </div>
          </div>

          {transport?.bookingUrl && (
            <a
              href={transport.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 rounded-full ${config.bg} border ${config.border} px-4 py-2 text-sm font-medium ${config.color} transition-all hover:scale-105 hover:brightness-110`}
            >
              <span>Book {transport.type}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {/* Transport Details */}
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Journey Time */}
          {transport?.journeyTime && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800">
                <Clock className="h-4 w-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Duration</p>
                <p className="mt-0.5 text-sm font-semibold text-white">{transport.journeyTime}</p>
              </div>
            </div>
          )}

          {/* Price Range */}
          {transport?.priceRange && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800">
                <Euro className="h-4 w-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Price Range</p>
                <p className="mt-0.5 text-sm font-semibold text-white">{transport.priceRange}</p>
              </div>
            </div>
          )}

          {/* Frequency */}
          {transport?.frequency && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800">
                <ArrowRight className="h-4 w-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Frequency</p>
                <p className="mt-0.5 text-sm font-semibold text-white">{transport.frequency}</p>
              </div>
            </div>
          )}
        </div>

        {/* Train Type (for trains) */}
        {transport?.type === 'train' && transport?.trainType && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
            <Train className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">{transport.trainType} Service</span>
          </div>
        )}

        {/* Travel Tips */}
        {showTips && (
          <div className="mt-6 space-y-2 rounded-lg bg-zinc-800/50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Travel Tips</h4>
            <ul className="space-y-1.5 text-sm text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[#c9963c]">•</span>
                <span>Book tickets in advance for best prices (especially for {transport?.type}s)</span>
              </li>
              {transport?.type === 'train' && (
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-[#c9963c]">•</span>
                  <span>Arrive at the station 15-20 minutes early</span>
                </li>
              )}
              {transport?.type === 'flight' && (
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-[#c9963c]">•</span>
                  <span>Arrive at the airport 2 hours early for international flights</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[#c9963c]">•</span>
                <span>Pack essentials in carry-on for easy access during travel</span>
              </li>
              {from?.country !== to?.country && (
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-[#c9963c]">•</span>
                  <span>
                    Crossing from {from?.country} to {to?.country} — check currency and voltage requirements
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Alternative Transport Options */}
        {transport?.alternativeUrl && (
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={transport.alternativeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-750"
            >
              <span>Compare All Transport Options</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact version of TransportCard for inline display
 */
export function TransportCardCompact({ transfer }) {
  if (!transfer) return null;

  const { from, to, transport } = transfer;
  const config = TRANSPORT_ICONS[transport?.type] || TRANSPORT_ICONS.train;
  const Icon = config.icon;

  return (
    <div className={`flex items-center justify-between rounded-lg border ${config.border} ${config.bg} p-3`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${config.color}`} />
        <div>
          <p className="text-sm font-medium text-white">
            {from?.name} → {to?.name}
          </p>
          <p className="text-xs text-zinc-400">
            {transport?.journeyTime} • {transport?.priceRange}
          </p>
        </div>
      </div>

      {transport?.bookingUrl && (
        <a
          href={transport.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`rounded-lg ${config.bg} border ${config.border} px-3 py-1.5 text-xs font-medium ${config.color} transition-all hover:brightness-110`}
        >
          Book
        </a>
      )}
    </div>
  );
}
