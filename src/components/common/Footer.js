import Link from 'next/link';

const FEATURES = [
  'Date-specific city rankings',
  'Day-by-day itineraries',
  'Weather & crowd insights',
  'Cultural event calendar',
];

const COVERAGE = [
  '327 city guides',
  '220 cities scored for timing',
  '40 countries',
  'Transport connections',
];

const EXPLORE = [
  { label: 'City Guides', href: '/city-guides' },
  { label: 'Interactive Map', href: '/explore' },
  { label: 'Plan a Trip', href: '/plan' },
  { label: 'Saved Trips', href: '/saved-trips' },
];

export default function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white/70 backdrop-blur print:hidden">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-zinc-900">Euro&#x2011;Trip</h3>
            <p className="text-sm text-zinc-600">
              Plan your whole European trip around when you go — the right cities,
              day-by-day itineraries, and in-depth guides for every destination.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-zinc-900">Features</h4>
            <ul className="space-y-2 text-sm text-zinc-600">
              {FEATURES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-zinc-900">Coverage</h4>
            <ul className="space-y-2 text-sm text-zinc-600">
              {COVERAGE.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-zinc-900">Explore</h4>
            <ul className="space-y-2 text-sm text-zinc-600">
              {EXPLORE.map((e) => (
                <li key={e.href}>
                  <Link href={e.href} className="hover:text-blue-600 transition-colors">
                    {e.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between text-sm text-zinc-500">
          <span>&copy; {new Date().getFullYear()} Euro&#x2011;Trip. All rights reserved.</span>
          <div className="mt-2 sm:mt-0 flex items-center space-x-4">
            <span>Made for European travelers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
