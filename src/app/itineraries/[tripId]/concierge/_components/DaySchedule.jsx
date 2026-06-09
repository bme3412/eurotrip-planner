import { BedDouble, Plane, Clock } from 'lucide-react';

/**
 * "Your whole day" — the full stop list for the selected day plus the real
 * bookings Olivier is working around. Proves he read the itinerary, not just the
 * first line.
 */
export default function DaySchedule({ schedule = [], hotelName, arrival }) {
  if (!schedule.length && !hotelName && !arrival) return null;

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <Clock className="h-3.5 w-3.5" /> The whole day he&apos;s working around
      </div>

      {schedule.length > 0 && (
        <ol className="mt-4 space-y-3">
          {schedule.map((s, i) => (
            <li key={i} className="flex items-baseline gap-3">
              <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-blue-600">
                {s.time || '—'}
              </span>
              <span className="h-1.5 w-1.5 shrink-0 translate-y-1 rounded-full bg-blue-200" />
              <span className="min-w-0">
                <span className="text-sm font-medium text-gray-900">{s.name}</span>
                {s.neighborhood && <span className="text-sm text-gray-400"> · {s.neighborhood}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}

      {(hotelName || arrival) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {arrival && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <Plane className="h-3.5 w-3.5" />
              {arrival.fromCity ? `Landing from ${arrival.fromCity}` : 'Arrival day'}
            </span>
          )}
          {hotelName && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
              <BedDouble className="h-3.5 w-3.5 text-gray-400" /> {hotelName}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
