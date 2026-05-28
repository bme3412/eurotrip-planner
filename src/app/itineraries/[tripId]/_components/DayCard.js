'use client';

import { GOLD } from '../_lib/constants';
import { formatDayDate } from '../_lib/helpers';
import { WeatherBadge } from './Badges';
import { GenericTimeBlock } from './GenericTimeBlock';

export function DayCard({ day, index, weather, experienceScores }) {
  const neighborhoods = day.timeBlocks
    ? [...new Set(day.timeBlocks.map(b => b.activity?.neighborhood).filter(Boolean))]
    : [];
  const dayNum = day.dayNumber || index + 1;

  return (
    <article
      id={`day-${dayNum}`}
      className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111113] animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Day header */}
      <header className="flex items-start gap-5 border-b border-zinc-800/80 px-6 py-5">
        {/* Large serif day number */}
        <div className="shrink-0 pt-0.5">
          <span
            className="font-serif text-5xl font-light leading-none tabular-nums select-none"
            style={{ color: GOLD, letterSpacing: '-0.03em' }}
          >
            {dayNum}
          </span>
        </div>

        <div className="min-w-0 flex-1 pt-1.5">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h3 className="text-base font-semibold text-white">
              {day.dateLabel || formatDayDate(day.date) || day.date}
            </h3>
            {day.theme && (
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">{day.theme}</span>
            )}
            {weather && <WeatherBadge weather={weather} />}
          </div>
          {neighborhoods.length > 0 && (
            <p className="mt-1 truncate text-xs text-zinc-600">
              {neighborhoods.join(' → ')}
            </p>
          )}
        </div>
      </header>

      {day.timeBlocks && (
        <div className="px-6 py-5">
          {day.timeBlocks.map((block, i) => (
            <GenericTimeBlock
              key={`${block.time}-${i}`}
              block={block}
              isLast={i === day.timeBlocks.length - 1}
              index={i}
              experienceScores={experienceScores}
            />
          ))}
        </div>
      )}
    </article>
  );
}
