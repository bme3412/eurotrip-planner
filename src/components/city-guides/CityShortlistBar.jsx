'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';

/**
 * CityShortlistBar — the page's single fixed bottom bar. It IS the existing
 * "Plan a Trip" CTA when nothing is shortlisted (zero regression), and grows
 * into a shortlist tray once the visitor has ❤️'d experiences.
 *
 * The shortlist is just the per-city favorites array (useFavorites), lifted to
 * CityPageClient. Tapping "Plan trip" hands the selection off to the planner
 * wizard via `/plan/{city}?seed=<slugs>` — the slugs match the wizard's own
 * must-see slugging, which feeds buildItinerary's +50 prioritisation.
 *
 * Visual language adapted from src/components/map/ShortlistTray.js.
 */

// Matches the wizard's slugging (plan/[city]/page.js): name → "watch-sunrise…".
const seedSlug = (name) => String(name || '').toLowerCase().replace(/\s+/g, '-');
// Keep the URL comfortably short; 12 must-sees is already generous for a plan.
const MAX_SEED = 12;

export default function CityShortlistBar({ cityName, displayName, favorites = [], onRemove }) {
  const citySlug = encodeURIComponent((cityName || '').toLowerCase());
  const count = favorites.length;

  const planHref = useMemo(() => {
    if (count === 0) return `/plan/${citySlug}`;
    const slugs = favorites
      .map((f) => seedSlug(f?.name))
      .filter(Boolean)
      .slice(0, MAX_SEED);
    if (slugs.length === 0) return `/plan/${citySlug}`;
    return `/plan/${citySlug}?seed=${slugs.map(encodeURIComponent).join(',')}`;
  }, [favorites, count, citySlug]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-lg border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] print:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4">
        {count === 0 ? (
          <>
            <div className="hidden sm:block text-sm text-gray-600">
              Ready to visit <span className="font-semibold text-gray-900">{displayName}</span>?
            </div>
            <Link
              href={planHref}
              className="ml-auto rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-700"
            >
              Plan a Trip to {displayName}
            </Link>
          </>
        ) : (
          <>
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {count}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Your {displayName} shortlist
              </p>
              <div className="mt-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {favorites.map((item) => (
                  <span
                    key={item.name}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                  >
                    <span className="max-w-[10rem] truncate">{item.name}</span>
                    {onRemove && (
                      <button
                        type="button"
                        onClick={() => onRemove(item)}
                        aria-label={`Remove ${item.name} from shortlist`}
                        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-slate-400 hover:text-slate-700"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={planHref}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-700"
              >
                <span className="hidden sm:inline">Plan trip ({count} saved)</span>
                <span className="sm:hidden">Plan ({count})</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
