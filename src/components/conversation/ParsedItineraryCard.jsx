'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus, ArrowUp, ArrowDown, Trash2, CheckCircle2, AlertTriangle, MapPin } from 'lucide-react';
import { getFlagForCountry } from '@/utils/countryFlags';

function totalNights(cities) {
  return cities.reduce((sum, c) => sum + (c.nights || 0), 0);
}

function formatDateShort(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CityRow({ city, index, isFirst, isLast, onNightsChange, onRemove, onMoveUp, onMoveDown, unresolved }) {
  const dateLabel = useMemo(() => {
    if (city.startDate && city.endDate) {
      return `${formatDateShort(city.startDate)} – ${formatDateShort(city.endDate)}`;
    }
    if (city.startDate) return `from ${formatDateShort(city.startDate)}`;
    return null;
  }, [city.startDate, city.endDate]);

  return (
    <div className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
      unresolved
        ? 'bg-amber-50/60 border-amber-200'
        : 'bg-white border-slate-200 hover:border-slate-300'
    }`}>
      {/* Order */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center">
        {index + 1}
      </div>

      {/* Pin */}
      <MapPin className={`w-4 h-4 flex-shrink-0 ${unresolved ? 'text-amber-600' : 'text-slate-400'}`} />

      {/* City + subtext */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-slate-800 truncate">
            {city.country && (
              <span className="mr-1" aria-hidden="true">
                {getFlagForCountry(city.country)}
              </span>
            )}
            {city.name}
          </span>
          {city.country && (
            <span className="text-[11px] text-slate-500 truncate">{city.country}</span>
          )}
          {unresolved && (
            <span className="text-[10px] font-medium text-amber-700 uppercase tracking-wider">
              Not in dataset
            </span>
          )}
        </div>
        {(city.notes || dateLabel) && (
          <div className="text-xs text-slate-500 truncate mt-0.5">
            {dateLabel}
            {dateLabel && city.notes ? ' · ' : ''}
            {city.notes}
          </div>
        )}
      </div>

      {/* Nights stepper */}
      <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-1 py-1 border border-slate-200">
        <button
          type="button"
          onClick={() => onNightsChange(Math.max(0, (city.nights || 0) - 1))}
          className="w-6 h-6 rounded-md text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-30 transition-colors"
          disabled={!city.nights}
          aria-label="Subtract one night"
        >
          <Minus className="w-3 h-3 mx-auto" />
        </button>
        <span className="w-8 text-center text-xs font-semibold text-slate-700 tabular-nums">
          {city.nights ?? '—'}
          <span className="text-[9px] text-slate-400 ml-0.5">n</span>
        </span>
        <button
          type="button"
          onClick={() => onNightsChange((city.nights || 0) + 1)}
          className="w-6 h-6 rounded-md text-slate-500 hover:bg-white hover:text-slate-800 transition-colors"
          aria-label="Add one night"
        >
          <Plus className="w-3 h-3 mx-auto" />
        </button>
      </div>

      {/* Reorder + remove */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className="w-6 h-6 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 transition-colors"
          aria-label="Move up"
        >
          <ArrowUp className="w-3 h-3 mx-auto" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="w-6 h-6 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 transition-colors"
          aria-label="Move down"
        >
          <ArrowDown className="w-3 h-3 mx-auto" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="w-6 h-6 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          aria-label="Remove city"
        >
          <Trash2 className="w-3 h-3 mx-auto" />
        </button>
      </div>
    </div>
  );
}

/**
 * ParsedItineraryCard
 *
 * Renders a parse_itinerary tool result as an editable summary. Users can
 * tweak nights, reorder, remove cities, and then either confirm ("Looks right")
 * to hand the structured trip to the planner, or send the parsed state back
 * to the agent as a text describe message.
 *
 * Props:
 *   data      - { cities: [...], unresolved: [...], totalNights, flags, confidence }
 *   onConfirm - (cities) => void  invoked when user confirms the structure
 *   onRefine  - (summary) => void invoked when user wants to tweak via chat
 */
export default function ParsedItineraryCard({ data, onConfirm, onRefine }) {
  const initial = useMemo(() => (data?.cities || []).map((c, i) => ({ ...c, _key: `${c.id || c.name}-${i}` })), [data]);
  const [cities, setCities] = useState(initial);

  const unresolved = data?.unresolved || [];
  const flags = data?.flags || [];
  const confidence = data?.confidence || 'medium';

  const sumNights = totalNights(cities);

  const handleNightsChange = (idx, next) => {
    setCities((prev) => prev.map((c, i) => (i === idx ? { ...c, nights: next } : c)));
  };
  const handleRemove = (idx) => {
    setCities((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleMove = (idx, dir) => {
    setCities((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm?.(cities.map((c, i) => ({ ...c, order: i + 1 })));
  };

  const handleRefine = () => {
    const summary = cities
      .map((c) => (c.nights ? `${c.nights}n ${c.name}` : c.name))
      .join(' → ');
    onRefine?.(`Actually — change this: ${summary}`);
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-800">
            Your trip, as I read it
          </span>
        </div>
        <div className="text-xs text-slate-500 tabular-nums">
          {cities.length} {cities.length === 1 ? 'city' : 'cities'} · {sumNights || '—'} nights
        </div>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div className="px-4 pt-3 space-y-1.5">
          {flags.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>{f.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Resolved cities */}
      <div className="px-3 py-3 space-y-2">
        {cities.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">
            No cities left. Refine the trip and I&apos;ll re-parse.
          </div>
        ) : (
          cities.map((c, i) => (
            <CityRow
              key={c._key}
              city={c}
              index={i}
              isFirst={i === 0}
              isLast={i === cities.length - 1}
              onNightsChange={(n) => handleNightsChange(i, n)}
              onRemove={() => handleRemove(i)}
              onMoveUp={() => handleMove(i, -1)}
              onMoveDown={() => handleMove(i, 1)}
              unresolved={false}
            />
          ))
        )}

        {/* Unresolved (dataset misses) */}
        {unresolved.map((c, i) => (
          <CityRow
            key={`u-${i}`}
            city={c}
            index={cities.length + i}
            isFirst
            isLast
            onNightsChange={() => {}}
            onRemove={() => {}}
            onMoveUp={() => {}}
            onMoveDown={() => {}}
            unresolved
          />
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center gap-2">
        <button
          type="button"
          onClick={handleRefine}
          className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors"
        >
          Not quite — let me describe
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={cities.length === 0}
          className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          Looks right — review it
        </button>
      </div>

      {confidence === 'low' && (
        <div className="px-4 pb-3 -mt-1 text-[11px] text-slate-500">
          Low confidence parse — double-check each stop before confirming.
        </div>
      )}
    </div>
  );
}
