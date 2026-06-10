import AgentMark from './AgentMark';
import OlivierMark from './OlivierMark';
import { personasForTrip } from '@/lib/concierge/personas';

/**
 * A short persona intro so Olivier reads as a person, not a feature. The
 * relationship is the product; this is where it starts. When the trip crosses
 * into his network's territory, his locals get a row of their own.
 */
export default function MeetOlivier({ cityName, destinations = [] }) {
  const network = personasForTrip(destinations).filter((p) => p.id !== 'olivier');

  return (
    <section className="rounded-3xl border border-amber-100/70 bg-[#faf7f1] p-6 shadow-sm md:p-8">
      <div className="flex items-start gap-4">
        <OlivierMark size={52} />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Olivier, your travel agent</p>
          <h2 className="mt-1 font-display text-2xl font-bold leading-tight text-gray-900 md:text-3xl">
            Like knowing someone in {cityName || 'every city'}.
          </h2>
          <p className="mt-2 max-w-2xl text-gray-600">
            Olivier isn&apos;t a chatbot you open — he&apos;s the agent who already has your itinerary and
            texts first. He knows when the rain&apos;s coming, which entrance has the shorter line, and the
            café just off the tourist drag — and he tells you the night before, not when you finally
            think to ask.
          </p>

          {network.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-amber-100/70 pt-4">
              <span className="flex -space-x-1.5">
                {network.map((p) => (
                  <AgentMark key={p.id} persona={p} size={30} title={p.intro} className="ring-2 ring-[#faf7f1]" />
                ))}
              </span>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">His network on this trip:</span>{' '}
                {network.map((p, i) => (
                  <span key={p.id} title={p.intro}>
                    {i > 0 && ' · '}
                    {p.name} in {p.city}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
