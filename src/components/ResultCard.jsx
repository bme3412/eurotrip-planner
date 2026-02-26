'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const scoreColor = (score) => {
  if (score >= 4.5) return 'bg-emerald-100 text-emerald-800';
  if (score >= 4) return 'bg-emerald-100 text-emerald-800';
  if (score >= 3) return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
};

function CalendarIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function EventHighlight({ highlight }) {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <CalendarIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="text-xs font-bold text-amber-700 truncate">{highlight.date}</span>
        <span className="text-amber-300 text-xs">·</span>
        <span className="text-xs font-bold text-gray-900 truncate">{highlight.name}</span>
      </div>
      {highlight.description && (
        <p className="text-xs text-gray-600 leading-snug line-clamp-2 ml-5">
          {highlight.description}
        </p>
      )}
    </div>
  );
}

function SecondaryEventPill({ highlight }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
      <CalendarIcon className="w-3 h-3 text-gray-400 shrink-0" />
      <span className="text-[11px] font-semibold text-gray-500 truncate">{highlight.date}</span>
      <span className="text-gray-300 text-[11px]">·</span>
      <span className="text-[11px] text-gray-600 truncate">{highlight.name}</span>
    </div>
  );
}

export default function ResultCard({ item, index, dates }) {
  const dateQuery = dates?.start && dates?.end
    ? `?start=${dates.start}&end=${dates.end}`
    : '';
  const href = item.cityId ? `/city-guides/${item.cityId}${dateQuery}` : '#';
  const planHref = item.cityId
    ? `/plan/${item.cityId}${dates?.start ? `?mode=dates&start=${dates.start}&end=${dates.end}` : ''}`
    : '#';

  const [imgError, setImgError] = useState(false);
  const imageSrc = imgError || !item.image ? '/images/city-placeholder.svg' : item.image;

  // Separate event highlights from crowd/season signals
  const eventHighlights = (item.highlights || []).filter(h => h.type === 'event');
  const primaryEvent = eventHighlights[0] || null;
  const secondaryEvents = eventHighlights.slice(1, 3);
  const nonEventHighlight = !primaryEvent
    ? (item.highlights || []).find(h => h.type !== 'event')
    : null;

  return (
    <article id={item.cityId} className="card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col">
      {/* Image — links to city guide */}
      <Link href={href} className="block group relative h-44 shrink-0">
        <Image
          src={imageSrc}
          alt={item.title}
          fill
          style={{ objectFit: 'cover' }}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          onError={() => setImgError(true)}
          unoptimized={imageSrc.endsWith('.svg')}
        />
        {/* Gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Score + rank badge — top left */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className="badge bg-white/90 backdrop-blur font-semibold text-xs">
            #{index + 1}
          </span>
          {typeof item.score === 'number' && (
            <span className={`badge ${scoreColor(item.score)} font-bold text-xs`}>
              {item.score.toFixed(1)}/5
            </span>
          )}
          {/* Event indicator badge — shows there's something happening */}
          {primaryEvent && (
            <span className="badge bg-amber-400/90 text-amber-900 font-bold text-[10px] backdrop-blur flex items-center gap-1">
              <CalendarIcon className="w-2.5 h-2.5" />
              Event
            </span>
          )}
        </div>

        {/* Crowd badge — top right */}
        {item.crowdLevel && (
          <div className="absolute right-3 top-3">
            <span className="badge bg-white/90 backdrop-blur text-xs">
              {item.crowdLevel} crowds
            </span>
          </div>
        )}
      </Link>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-grow gap-2.5">

        {/* City name */}
        <Link href={href} className="group">
          <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
            {item.title}
          </h3>
        </Link>

        {/* Primary event highlight — the main reason to go */}
        {primaryEvent && <EventHighlight highlight={primaryEvent} />}

        {/* Secondary events — compact pills */}
        {secondaryEvents.length > 0 && (
          <div className="flex flex-col gap-1">
            {secondaryEvents.map((h, i) => (
              <SecondaryEventPill key={i} highlight={h} />
            ))}
          </div>
        )}

        {/* When no events — fall back to season/crowd reason */}
        {!primaryEvent && (item.why || nonEventHighlight) && (
          <p className="text-xs text-gray-600 bg-blue-50 rounded-lg px-3 py-2 leading-snug border border-blue-100">
            {nonEventHighlight?.description || item.why}
          </p>
        )}

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <span key={t} className="badge text-xs">{t}</span>
            ))}
          </div>
        )}

        {/* Plan CTA — pushed to bottom */}
        <div className="mt-auto pt-1">
          <Link
            href={planHref}
            onClick={(e) => e.stopPropagation()}
            className="block w-full text-center text-sm font-bold text-blue-600 hover:text-white border border-blue-200 hover:bg-blue-600 hover:border-blue-600 rounded-full py-2 transition-all duration-200"
          >
            Plan this trip →
          </Link>
        </div>
      </div>
    </article>
  );
}
