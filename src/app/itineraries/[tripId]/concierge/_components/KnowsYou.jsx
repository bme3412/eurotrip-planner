'use client';

import { Gauge, Heart, Plane, BedDouble, Compass } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import OlivierMark from './OlivierMark';

/**
 * "He already knows you" — proves the concierge is personal by surfacing the
 * traveler's own signals: pace, interests, inbound flight, hotel, and any saved
 * experiences for the city (read via the existing useFavorites hook).
 */
function nameOf(item) {
  if (!item) return null;
  if (typeof item === 'string') return item;
  return item.name || item.title || item.experienceName || null;
}

export default function KnowsYou({ personalization, cityName }) {
  const p = personalization || {};
  const { favorites } = useFavorites(cityName || '');
  const saved = (favorites || []).map(nameOf).filter(Boolean).slice(0, 3);

  const chips = [];
  if (p.pace) chips.push({ icon: Gauge, label: `${p.pace} pace`, hint: 'so mornings stay unhurried' });
  if (p.interests?.length) chips.push({ icon: Compass, label: p.interests.slice(0, 3).join(', '), hint: 'what he steers you toward' });
  if (p.arrival?.fromCity) chips.push({ icon: Plane, label: `Arriving from ${p.arrival.fromCity}`, hint: 'he frames day one around your landing' });
  if (p.hotelName) chips.push({ icon: BedDouble, label: p.hotelName, hint: 'every route starts from your door' });

  if (!chips.length && !saved.length) return null;

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm md:p-7">
      <div className="flex items-center gap-3">
        <OlivierMark size={36} />
        <div>
          <p className="font-bold text-gray-900">He already knows you</p>
          <p className="text-xs text-gray-500">Every brief is shaped by what you told us — no setup.</p>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {chips.map((c, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl bg-gray-50 px-3.5 py-3">
              <c.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div className="min-w-0">
                <p className="text-sm font-semibold capitalize text-gray-900">{c.label}</p>
                <p className="text-xs text-gray-500">{c.hint}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {saved.length > 0 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50/60 px-3.5 py-3">
          <Heart className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p className="text-sm leading-snug text-rose-900">
            You saved <span className="font-semibold">{saved.join(', ')}</span> — Olivier would find the right morning to slot {saved.length > 1 ? 'them' : 'it'} in.
          </p>
        </div>
      )}
    </div>
  );
}
