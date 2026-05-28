'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function FoodFooter({ cityName, displayName }) {
  return (
    <footer className="border-t border-gray-200 pt-8 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <nav className="flex items-center text-sm text-gray-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-gray-700 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
          <Link href="/city-guides" className="hover:text-gray-700 transition-colors">
            City Guides
          </Link>
          <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
          <Link
            href={`/city-guides/${cityName?.toLowerCase()}`}
            className="hover:text-gray-700 transition-colors"
          >
            {displayName}
          </Link>
          <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
          <span className="text-gray-900 font-medium">Food + Drink</span>
        </nav>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Prices, hours, and availability may change. Always check current information before visiting.
      </p>
    </footer>
  );
}
