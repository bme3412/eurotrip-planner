'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { GOLD } from '../_lib/constants';
import { renderRich } from '../_lib/helpers';

export function ActivityPhoto({ googlePlaceId, type, name }) {
  const [failed, setFailed] = useState(false);

  if (!googlePlaceId || failed) {
    const grads = {
      museum: 'from-zinc-800 to-zinc-900', gallery: 'from-zinc-800 to-zinc-900',
      church: 'from-stone-800 to-stone-900', chapel: 'from-stone-800 to-stone-900',
      cathedral: 'from-stone-800 to-stone-900', basilica: 'from-stone-800 to-stone-900',
      park: 'from-zinc-800 to-zinc-900', garden: 'from-zinc-800 to-zinc-900',
      restaurant: 'from-zinc-800 to-zinc-900', food: 'from-zinc-800 to-zinc-900',
    };
    const t = (type || '').toLowerCase();
    const grad = Object.entries(grads).find(([k]) => t.includes(k))?.[1] || 'from-zinc-800 to-zinc-900';
    return (
      <div className={`flex h-36 items-end bg-gradient-to-br ${grad} px-4 pb-3`}>
        <span className="text-sm font-medium text-zinc-300">{name}</span>
      </div>
    );
  }

  return (
    <div className="relative h-36 w-full overflow-hidden">
      <Image
        src={`/api/google-photos?placeId=${encodeURIComponent(googlePlaceId)}&w=600`}
        alt={name || ''}
        fill
        className="object-cover"
        sizes="(min-width: 768px) 600px, 100vw"
        onError={() => setFailed(true)}
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <span className="absolute bottom-3 left-4 text-sm font-semibold text-white drop-shadow">{name}</span>
    </div>
  );
}

export function ExpandableText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 2);
  }, [text]);

  return (
    <div>
      <div ref={ref} className={`text-sm leading-relaxed text-zinc-400 ${expanded ? '' : 'line-clamp-3'}`}>
        {renderRich(text)}
      </div>
      {clamped && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-1.5 text-xs font-medium transition-colors"
          style={{ color: GOLD }}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

export function WeatherBadge({ weather }) {
  if (!weather) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-zinc-400 ring-1 ring-zinc-700">
      {weather.highC}°/{weather.lowC}°C · {weather.sunshineHours}h sun
    </span>
  );
}

export function IndoorBadge({ indoor }) {
  if (indoor === null || indoor === undefined) return null;
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 ring-1 ring-zinc-700">
      {indoor ? 'Indoor' : 'Outdoor'}
    </span>
  );
}

export function QualityBadge({ badge }) {
  if (!badge) return null;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>
      {badge.label}
    </span>
  );
}
