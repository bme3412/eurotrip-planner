import Link from 'next/link';

const EXPLORE = [
  { label: 'City Guides', href: '/city-guides' },
  { label: 'Explore', href: '/explore' },
  { label: 'Plan a Trip', href: '/plan' },
  { label: 'Saved Trips', href: '/saved-trips' },
];

export default function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white/70 backdrop-blur print:hidden">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900">Euro&#x2011;Trip</span>
            <span className="text-zinc-400"> — </span>
            Plan your trip around <span className="italic">when</span> you go. 327 city
            guides across 40 countries, ranked for your exact dates.
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
            {EXPLORE.map((e) => (
              <Link key={e.href} href={e.href} className="text-zinc-600 hover:text-blue-600 transition-colors">
                {e.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-5 border-t border-black/5 pt-3 text-xs text-zinc-400">
          &copy; {new Date().getFullYear()} Euro&#x2011;Trip · Made for European travelers
        </div>
      </div>
    </footer>
  );
}
