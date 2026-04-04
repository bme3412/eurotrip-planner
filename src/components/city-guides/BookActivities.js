'use client';

import { searchUrl, trackAffiliateClick } from '@/lib/affiliates/affiliateLinks';

const PLATFORMS = [
  { id: 'getyourguide', label: 'GetYourGuide', icon: '🎫' },
  { id: 'viator', label: 'Viator', icon: '🗺️' },
  { id: 'bookingcom', label: 'Booking.com', icon: '🏨', sublabel: 'Hotels' },
];

export default function BookActivities({ cityName, country }) {
  if (!cityName) return null;

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Book Activities in {cityName}</h3>
      <p className="text-sm text-gray-600 mb-4">Find tours, tickets, and experiences from trusted partners.</p>
      <div className="flex flex-wrap gap-3">
        {PLATFORMS.map(p => {
          const url = searchUrl(p.id, { city: cityName, country: country || '' });
          if (!url) return null;
          return (
            <a
              key={p.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackAffiliateClick({ provider: p.id, city: cityName, activityName: 'search', url })}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700 hover:shadow-sm transition-all"
            >
              <span>{p.icon}</span>
              <span>Browse on {p.label}</span>
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-gray-400">
        Some links may earn us a commission at no extra cost to you.
      </p>
    </div>
  );
}
