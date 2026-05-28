import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Insider-tip overlay revealed on neighborhood card hover. Renders a gradient
 * scrim plus up to 3 tips, or nothing if the neighborhood has none.
 */
export default function TipsOverlay({ tips }) {
  if (!tips || tips.length === 0) return null;
  return (
    <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-t from-black/60 via-black/20 to-transparent">
      <div className="w-full">
        <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Insider Tips
        </div>
        <ul className="space-y-1.5">
          {tips.map((tip, i) => (
            <li key={i} className="text-sm text-white leading-relaxed flex items-start gap-2">
              <span className="text-amber-400 mt-0.5 shrink-0">💡</span>
              <span className="line-clamp-2">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
