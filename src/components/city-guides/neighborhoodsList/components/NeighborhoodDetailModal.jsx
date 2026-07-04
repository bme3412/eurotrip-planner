'use client';

import React, { useEffect, useRef } from 'react';
import {
  X, MapPin, Train, ShieldCheck, Footprints, CalendarDays, Check,
  ArrowRight, Landmark, Lightbulb,
} from 'lucide-react';
import { getNeighborhoodIcon } from '../lib/icons.js';
import { getInsiderTips, getNearbyNeighborhoods } from '../lib/constants.js';

const CATEGORY_META = {
  cultural: { label: 'Cultural', icon: '🎭' },
  historic: { label: 'Historic', icon: '🏛️' },
  dining: { label: 'Dining', icon: '🍽️' },
  shopping: { label: 'Shopping', icon: '🛍️' },
  nightlife: { label: 'Nightlife', icon: '🌃' },
  green_spaces: { label: 'Green space', icon: '🌳' },
  touristy: { label: 'Touristy', icon: '📸' },
  residential: { label: 'Residential', icon: '🏠' },
};
const CATEGORY_ORDER = ['cultural', 'historic', 'dining', 'shopping', 'nightlife', 'green_spaces', 'touristy', 'residential'];

function Section({ title, icon: Icon, children }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        {Icon ? <Icon className="h-4 w-4 text-gray-400" aria-hidden /> : null}
        {title}
      </h3>
      {children}
    </section>
  );
}

function ChipRow({ label, items, className }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span key={it} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{it}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * NeighborhoodDetailModal — the full deep-dive for a single neighborhood.
 * Surfaces everything the card truncates or hides: character, history, the full
 * 8-category profile, all dining/sights, all tips, practical info, and
 * data-driven bordering neighborhoods (click to jump to that neighborhood).
 *
 * Accessible: Escape + backdrop close, focus moves to close on open and returns
 * to the trigger on close, background scroll locked.
 */
export default function NeighborhoodDetailModal({ neighborhood, allNeighborhoods = [], onClose, onOpenByName, cityName }) {
  const headingRef = useRef(null);
  const bodyRef = useRef(null);

  // Capture the opening trigger + lock scroll for the modal's whole lifetime;
  // restore both on unmount (focus returns to whatever opened the modal).
  useEffect(() => {
    const trigger = typeof document !== 'undefined' ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      if (trigger && typeof trigger.focus === 'function') trigger.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // When the shown neighborhood changes (initial open OR a border-chip jump),
  // move focus into the heading and scroll to top. Focusing the heading keeps
  // focus inside the dialog, avoids yanking focus to the close button on
  // user-driven jumps, and makes screen readers announce the new neighborhood.
  useEffect(() => {
    headingRef.current?.focus();
    bodyRef.current?.scrollTo?.({ top: 0 });
  }, [neighborhood]);

  if (!neighborhood) return null;

  const n = neighborhood;
  const tips = getInsiderTips(n, Infinity);
  const nearby = getNearbyNeighborhoods(n, allNeighborhoods);
  const dining = n.highlights?.dining || [];
  const attractions = n.highlights?.attractions || [];
  const history = n.history || {};
  const pi = n.practical_info || {};
  const landmarks = n.location?.landmarks || [];
  const notableEvents = Array.isArray(history.notable_events) ? history.notable_events : [];
  const titleId = 'neighborhood-detail-title';

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
        {/* Header banner */}
        <div className="relative h-40 shrink-0 overflow-hidden bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl opacity-60">{getNeighborhoodIcon(n.name)}</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

          {n.location?.central && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 backdrop-blur-sm">
              <MapPin className="h-3 w-3" /> Central
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/90 text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute inset-x-0 bottom-0 p-4">
            <h2 ref={headingRef} tabIndex={-1} id={titleId} className="text-2xl font-bold leading-tight text-white drop-shadow focus:outline-none">{n.name}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-white/90">
              {n.alternate_names?.length > 0 && <span>{n.alternate_names.join(' · ')}</span>}
            </div>
          </div>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {n.location?.description && (
            <p className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {n.location.description}
            </p>
          )}

          {n.character && <p className="text-[15px] leading-relaxed text-gray-700">{n.character}</p>}

          {/* Appeal chips */}
          {(n.appeal?.known_for?.length || n.appeal?.atmosphere?.length || n.appeal?.best_for?.length) ? (
            <div className="space-y-3">
              <ChipRow label="Known for" items={n.appeal?.known_for} className="bg-amber-50 text-amber-800" />
              <ChipRow label="Atmosphere" items={n.appeal?.atmosphere} className="bg-blue-100 text-blue-700" />
              <ChipRow label="Best for" items={n.appeal?.best_for} className="bg-blue-100 text-blue-700" />
            </div>
          ) : null}

          {/* Full category profile */}
          {n.categories && (
            <Section title="Neighborhood profile">
              <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {CATEGORY_ORDER.filter((k) => typeof n.categories[k] === 'number').map((k) => {
                  const v = n.categories[k];
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-sm">{CATEGORY_META[k].icon}</span>
                      <span className="flex-1 text-sm text-gray-600">{CATEGORY_META[k].label}</span>
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                        <span className="block h-full rounded-full bg-blue-500" style={{ width: `${(Math.max(0, Math.min(5, v)) / 5) * 100}%` }} />
                      </span>
                      <span className="w-7 text-right text-xs font-bold text-gray-700">{v}/5</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* History */}
          {(history.overview || history.significance || notableEvents.length > 0) && (
            <Section title="History">
              {history.overview && <p className="text-sm leading-relaxed text-gray-700">{history.overview}</p>}
              {history.significance && <p className="mt-2 text-sm leading-relaxed text-gray-600">{history.significance}</p>}
              {notableEvents.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {notableEvents.map((ev, i) => {
                    const text = typeof ev === 'string' ? ev : [ev?.year, ev?.event || ev?.name || ev?.description].filter(Boolean).join(' — ');
                    return <li key={i} className="text-sm text-gray-600">• {text}</li>;
                  })}
                </ul>
              )}
            </Section>
          )}

          {/* Eat & Drink */}
          {dining.length > 0 && (
            <Section title="Eat & drink">
              <div className="space-y-2">
                {dining.map((place, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">{place.name}</span>
                      {place.price_range && <span className="text-xs text-gray-500">{place.price_range}</span>}
                    </div>
                    {(place.cuisine || place.known_for) && (
                      <p className="text-xs text-gray-600">{[place.cuisine, place.known_for].filter(Boolean).join(' • ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* See & Do */}
          {attractions.length > 0 && (
            <Section title="See & do">
              <div className="space-y-2">
                {attractions.map((place, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getNeighborhoodIcon(place.type)}</span>
                      <span className="text-sm font-medium text-gray-900">{place.name}</span>
                    </div>
                    {place.appeal && <p className="mt-0.5 text-xs text-gray-600">{place.appeal}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Stay / skip */}
          {(n.stay_here_if?.length > 0 || n.avoid_if?.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {n.stay_here_if?.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <Check className="h-3.5 w-3.5" /> Stay here if
                  </div>
                  <ul className="space-y-1">
                    {n.stay_here_if.map((item, i) => <li key={i} className="text-sm text-gray-600">• {item}</li>)}
                  </ul>
                </div>
              )}
              {n.avoid_if?.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-red-600">
                    <X className="h-3.5 w-3.5" /> Skip if
                  </div>
                  <ul className="space-y-1">
                    {n.avoid_if.map((item, i) => <li key={i} className="text-sm text-gray-600">• {item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Insider tips */}
          {tips.length > 0 && (
            <section className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                <Lightbulb className="h-4 w-4" aria-hidden /> Insider tips
              </h3>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-amber-900">
                    <span className="mt-0.5 text-amber-500">•</span><span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Practical info */}
          {(pi.walkability || pi.safety || pi.best_time_to_visit || pi.transit?.length) ? (
            <Section title="Getting around & practical info" icon={MapPin}>
              <div className="space-y-2 text-sm text-gray-700">
                {pi.best_time_to_visit && (
                  <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden /> <span><span className="font-medium">Best time:</span> {pi.best_time_to_visit}</span></p>
                )}
                {pi.walkability && (
                  <p className="flex items-start gap-2"><Footprints className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden /> <span>{pi.walkability}</span></p>
                )}
                {pi.safety && (
                  <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden /> <span>{pi.safety}</span></p>
                )}
                {pi.transit?.length > 0 && (
                  <p className="flex items-start gap-2"><Train className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden /> <span><span className="font-medium">Metro:</span> {pi.transit.join(', ')}</span></p>
                )}
              </div>
            </Section>
          ) : null}

          {/* Nearby + landmarks */}
          {(nearby.length > 0 || landmarks.length > 0) && (
            <Section title="Nearby & landmarks" icon={Landmark}>
              {nearby.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Bordering neighborhoods</div>
                  <div className="flex flex-wrap gap-2">
                    {nearby.map((b) => (
                      b.resolved && onOpenByName ? (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => onOpenByName(b.resolved.name)}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
                        >
                          {b.name}
                          {b.walkTime ? <span className="text-gray-400">· {b.walkTime} min</span> : null}
                          <ArrowRight className="h-3 w-3 text-gray-400" aria-hidden />
                        </button>
                      ) : (
                        <span
                          key={b.name}
                          title={`${b.name} — not covered in this guide`}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500"
                        >
                          {b.name}{b.walkTime ? <span className="text-gray-400">· {b.walkTime} min</span> : null}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}
              {landmarks.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Landmarks</div>
                  <div className="flex flex-wrap gap-1.5">
                    {landmarks.map((l) => (
                      <span key={l} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{l}</span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
