'use client';

import React from 'react';
import { CITY_SEASONAL_NARRATIVES, DEFAULT_SEASONAL_NARRATIVE } from '../_data/seasonalNarratives';

/**
 * Renders an HTML-like string containing <strong> tags as React elements.
 * Avoids dangerouslySetInnerHTML for content that comes from our own data
 * files but still contains inline emphasis.
 */
function renderSeasonalText(htmlString) {
  const parts = htmlString.split(/(<strong>.*?<\/strong>)/g);
  return parts.map((part, i) => {
    if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
      const text = part.replace(/<\/?strong>/g, '');
      return <strong key={i} className="text-gray-900">{text}</strong>;
    }
    return part;
  });
}

/**
 * "Season by Season" prose block — four short paragraphs sourced from
 * the per-city seasonal-narratives data file.
 */
export default function SeasonalProse({ cityName }) {
  const cityKey = cityName?.toLowerCase() || '';
  const content = CITY_SEASONAL_NARRATIVES[cityKey] || DEFAULT_SEASONAL_NARRATIVE;

  return (
    <div className="mt-6 pt-6 border-t border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Season by Season</h3>
      <div className="grid lg:grid-cols-2 gap-x-10 gap-y-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-900 mb-1.5">Spring & Early Fall</h4>
            <p className="text-[17px] leading-relaxed text-gray-700">
              {renderSeasonalText(content.springFall)}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-1.5">Summer</h4>
            <p className="text-[17px] leading-relaxed text-gray-700">
              {renderSeasonalText(content.summer)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-900 mb-1.5">Winter</h4>
            <p className="text-[17px] leading-relaxed text-gray-700">
              {renderSeasonalText(content.winter)}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-1.5">March</h4>
            <p className="text-[17px] leading-relaxed text-gray-700">
              {renderSeasonalText(content.march)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
