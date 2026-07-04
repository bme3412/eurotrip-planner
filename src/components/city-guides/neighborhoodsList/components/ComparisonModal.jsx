import React from 'react';
import { Scale, X } from 'lucide-react';
import { getNeighborhoodIcon } from '../lib/icons.js';

const CATEGORIES = ['dining', 'shopping', 'nightlife', 'cultural', 'historic', 'green_spaces'];
const CATEGORY_LABELS = {
  dining: { label: 'Dining', icon: '🍽️' },
  shopping: { label: 'Shopping', icon: '🛍️' },
  nightlife: { label: 'Nightlife', icon: '🌃' },
  cultural: { label: 'Cultural', icon: '🎭' },
  historic: { label: 'Historic', icon: '🏛️' },
  green_spaces: { label: 'Green Spaces', icon: '🌳' },
};

function getScoreColor(score, maxScore) {
  if (score === maxScore && maxScore > 0) return 'bg-emerald-500';
  if (score >= 4) return 'bg-blue-500';
  if (score >= 3) return 'bg-amber-500';
  return 'bg-gray-400';
}

/**
 * Full-screen modal comparing 2-3 selected neighborhoods side-by-side across
 * category scores, "best for" tags, atmosphere tags, and metro stations.
 */
export default function ComparisonModal({ neighborhoods, onClose }) {
  if (!neighborhoods || neighborhoods.length < 2) return null;

  const gridStyle = { gridTemplateColumns: `200px repeat(${neighborhoods.length}, 1fr)` };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Compare Neighborhoods</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Header Row */}
          <div className="grid gap-4" style={gridStyle}>
            <div />
            {neighborhoods.map((n, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl mb-2">{getNeighborhoodIcon(n.name)}</div>
                <h3 className="font-bold text-gray-900">{n.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.character}</p>
              </div>
            ))}
          </div>

          {/* Category Rows */}
          <div className="mt-6 space-y-3">
            {CATEGORIES.map((cat) => {
              const scores = neighborhoods.map((n) => n.categories?.[cat] || 0);
              const maxScore = Math.max(...scores);

              return (
                <div key={cat} className="grid gap-4 items-center py-3 border-b border-gray-100" style={gridStyle}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_LABELS[cat]?.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{CATEGORY_LABELS[cat]?.label}</span>
                  </div>
                  {neighborhoods.map((n, i) => {
                    const score = n.categories?.[cat] || 0;
                    return (
                      <div key={i} className="flex items-center justify-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className={`h-full ${getScoreColor(score, maxScore)} transition-all`}
                            style={{ width: `${(score / 5) * 100}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${score === maxScore && maxScore > 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                          {score}/5
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Best For Row */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Best For</h4>
            <div className="grid gap-4" style={gridStyle}>
              <div />
              {neighborhoods.map((n, i) => (
                <div key={i} className="flex flex-wrap gap-1">
                  {(n.appeal?.best_for || []).slice(0, 3).map((item, j) => (
                    <span key={j} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Atmosphere Row */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Atmosphere</h4>
            <div className="grid gap-4" style={gridStyle}>
              <div />
              {neighborhoods.map((n, i) => (
                <div key={i} className="flex flex-wrap gap-1">
                  {(n.appeal?.atmosphere || []).slice(0, 3).map((item, j) => (
                    <span key={j} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Transit Row */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Metro Stations</h4>
            <div className="grid gap-4" style={gridStyle}>
              <div />
              {neighborhoods.map((n, i) => (
                <div key={i} className="text-sm text-gray-600">
                  {(n.practical_info?.transit || []).slice(0, 2).join(', ')}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
