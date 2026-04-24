import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white/70 backdrop-blur print:hidden">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-zinc-900">Euro&#x2011;Trip</h3>
            <p className="text-sm text-zinc-600">
              Plan your perfect European adventure with data-driven
              recommendations and seasonal insights.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-zinc-900">Features</h4>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li>Seasonal Activity Planning</li>
              <li>Weather-Based Recommendations</li>
              <li>City Connection Maps</li>
              <li>Cultural Event Calendar</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-zinc-900">Coverage</h4>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li>220+ European Cities</li>
              <li>39 Countries</li>
              <li>Monthly Activity Guides</li>
              <li>Transport Connections</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-zinc-900">Explore</h4>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li>
                <Link href="/city-guides" className="hover:text-indigo-600 transition-colors">
                  City Guides
                </Link>
              </li>
              <li>
                <Link href="/explore" className="hover:text-indigo-600 transition-colors">
                  Interactive Map
                </Link>
              </li>
              <li>
                <Link href="/plan" className="hover:text-indigo-600 transition-colors">
                  Plan a Trip
                </Link>
              </li>
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
