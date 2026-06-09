import OlivierMark from './OlivierMark';

/**
 * A short persona intro so Olivier reads as a person, not a feature. The
 * relationship is the product; this is where it starts.
 */
export default function MeetOlivier({ cityName }) {
  return (
    <section className="rounded-3xl border border-amber-100/70 bg-[#faf7f1] p-6 shadow-sm md:p-8">
      <div className="flex items-start gap-4">
        <OlivierMark size={52} />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Meet Olivier</p>
          <h2 className="mt-1 font-display text-2xl font-bold leading-tight text-gray-900 md:text-3xl">
            Like knowing someone in {cityName || 'every city'}.
          </h2>
          <p className="mt-2 max-w-2xl text-gray-600">
            Olivier isn&apos;t a chatbot you open — he&apos;s the friend who already has your itinerary and
            texts first. He knows when the rain&apos;s coming, which entrance has the shorter line, and the
            café just off the tourist drag — and he tells you the night before, not when you finally
            think to ask.
          </p>
        </div>
      </div>
    </section>
  );
}
