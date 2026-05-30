import React from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { getNeighborhoodIcon } from '../lib/icons.js';

/**
 * Editor's-pick spotlight tile — large gradient card used above the main
 * neighborhood grid. Clicking scrolls to the matching card in the grid.
 */
export default function SpotlightCard({ neighborhood, reason, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View ${neighborhood.name} guide — ${reason}`}
      className="group relative bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); }
      }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="1" fill-rule="evenodd"%3E%3Cpath d="M0 40L40 0H20L0 20M40 40V20L20 40"/%3E%3C/g%3E%3C/svg%3E")',
        }}
      />

      <div className="absolute top-4 right-4 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        Editor&apos;s Pick
      </div>

      <div className="relative z-10">
        <span className="text-4xl mb-3 block">{getNeighborhoodIcon(neighborhood.name)}</span>
        <h3 className="text-xl font-bold mb-1">{neighborhood.name}</h3>
        <p className="text-purple-200 text-sm mb-3">{reason}</p>
        <p className="text-white/80 text-sm line-clamp-2">{neighborhood.character}</p>

        <div className="flex flex-wrap gap-2 mt-4">
          {(neighborhood.appeal?.atmosphere || []).slice(0, 2).map((atm, i) => (
            <span key={i} className="px-2 py-1 bg-white/20 rounded-full text-xs">
              {atm}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronDown className="w-5 h-5 rotate-[-90deg]" />
      </div>
    </div>
  );
}
