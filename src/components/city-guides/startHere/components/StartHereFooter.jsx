'use client';

import React from 'react';
import Link from 'next/link';

export default function StartHereFooter() {
  return (
    <footer className="mt-10 pt-6 border-t border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
        <span className="text-gray-500 font-medium">Plan smarter. Travel better.</span>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/city-guides"
            className="text-gray-500 hover:text-indigo-600 transition-colors font-medium"
          >
            Browse all cities
          </Link>
          <Link
            href="mailto:hello@eurotrip.guide"
            className="text-gray-500 hover:text-indigo-600 transition-colors font-medium"
          >
            Get support
          </Link>
        </div>
      </div>
    </footer>
  );
}
