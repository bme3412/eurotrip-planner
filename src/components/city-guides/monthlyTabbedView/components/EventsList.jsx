import React from 'react';

/**
 * Vertical "Events & Holidays" list shown below the calendar grid.
 * Renders nothing when there are no events for the selected month.
 */
export default function EventsList({ events }) {
  if (!events || events.length === 0) return null;
  return (
    <section>
      <h4 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Events & Holidays</h4>
      <div className="space-y-4">
        {events.map((ev, idx) => (
          <div key={`event-${idx}`} className="border-l-2 border-gray-300 pl-4">
            <h5 className="font-semibold text-gray-900 text-[15px]">{ev.name || ev.event || 'Event'}</h5>
            {ev.date && <p className="text-sm text-gray-500">{ev.date}</p>}
            {ev.description && <p className="text-sm text-gray-700 mt-1 leading-relaxed">{ev.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
