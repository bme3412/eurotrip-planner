'use client';

import { GOLD, TIME_BLOCK } from '../_lib/constants';
import { fmtType, inferIndoor, matchBadge } from '../_lib/helpers';
import { ActivityPhoto, ExpandableText, IndoorBadge, QualityBadge } from './Badges';

export function GenericTimeBlock({ block, isLast, index, experienceScores }) {
  const act = block.activity;
  if (!act) return null;

  const timeKey = block.time?.toLowerCase();
  const cfg = TIME_BLOCK[timeKey] || TIME_BLOCK.morning;
  const timeRange = block.startTime && block.endTime ? `${block.startTime}–${block.endTime}` : null;
  const typeLabel = fmtType(act.type);
  const showType = typeLabel && !['Food Recommendation', 'Food', 'Neighborhood'].includes(typeLabel);
  const indoor = inferIndoor(act.type, act.name);
  const badge = matchBadge(act.name, experienceScores);
  const isFree = act.price && /free/i.test(act.price);
  const mapsUrl = act.latitude && act.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${act.latitude},${act.longitude}` : null;

  return (
    <div
      className="relative flex gap-4 animate-fade-in"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Minimal timeline */}
      <div className="flex flex-col items-center pt-3">
        <div
          className="h-1.5 w-1.5 shrink-0 rounded-full ring-2"
          style={{ backgroundColor: cfg.accent + '40', ringColor: cfg.lineColor }}
        />
        {!isLast && (
          <div className="mt-1.5 w-px flex-1 bg-zinc-800" />
        )}
      </div>

      {/* Activity card */}
      <div
        className="mb-5 flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-[#18181b] transition-colors duration-200 hover:border-zinc-700"
        style={{ borderLeftColor: cfg.accent + '60', borderLeftWidth: '2px' }}
      >
        {act.googlePlaceId && (
          <ActivityPhoto googlePlaceId={act.googlePlaceId} type={act.type} name={act.name} />
        )}

        <div className="px-4 py-3.5">
          {/* Time label row */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: cfg.accent }}>
              {cfg.label}
              {timeRange && (
                <span className="ml-2 font-normal normal-case tracking-normal text-zinc-600">· {timeRange}</span>
              )}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {act.isEvent && (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 ring-1 ring-amber-900/60">
                  ★ Event
                </span>
              )}
              {act._aiUpdated && (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c9963c] ring-1 ring-[#c9963c40]">
                  ✦ AI
                </span>
              )}
              {badge && <QualityBadge badge={badge} />}
              {isFree && !badge && (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 ring-1 ring-emerald-900">
                  Free
                </span>
              )}
              <IndoorBadge indoor={indoor} />
            </div>
          </div>

          {/* Name */}
          {!act.googlePlaceId && (
            <h4 className="mt-2 text-base font-semibold leading-snug text-white">{act.name}</h4>
          )}
          {act.googlePlaceId && (
            <h4 className="sr-only">{act.name}</h4>
          )}
          {showType && (
            <p className="mt-0.5 text-xs font-medium" style={{ color: GOLD + 'cc' }}>{typeLabel}</p>
          )}

          {act.description && (
            <div className="mt-2.5">
              <ExpandableText text={act.description} />
            </div>
          )}

          {/* Rainy-day backup for open-air stops in iffy weather */}
          {act.weatherBackup && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-sky-950/40 px-2.5 py-1.5 text-xs text-sky-300/90 ring-1 ring-sky-900/50">
              <svg className="mt-0.5 h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 11a3.5 3.5 0 0 1-.5-6.96A4 4 0 0 1 11.9 4.5H12a3 3 0 0 1 .3 5.98l-.6-1.04A2 2 0 0 0 12 5.5h-.96l-.13-.72A2.5 2.5 0 0 0 6 5.2l-.3.66-.72-.04A2 2 0 1 0 4.5 9.5h1l-.6 1.5H4.5Zm5 .5-1 3 2.5-2h-1.5l1-1h-1Z"/></svg>
              <span>Rainy-day backup: {act.weatherBackup}</span>
            </p>
          )}

          {/* Meta pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {act.duration && (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.5 4v4.25l3.5 2.08-.75 1.23L7 9V4h1.5Z"/></svg>
                {act.duration}
              </span>
            )}
            {act.price && (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                {act.price}
              </span>
            )}
            {act.neighborhood && (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                {act.neighborhood}
              </span>
            )}
          </div>

          {/* CTAs */}
          {(act.bookingUrl || mapsUrl) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {act.bookingUrl && (
                <a
                  href={act.bookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-black transition hover:opacity-90"
                  style={{ backgroundColor: GOLD }}
                >
                  Book / Visit ↗
                </a>
              )}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-transparent px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
                >
                  Map ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
