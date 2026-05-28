'use client';

import React from 'react';
import { useCitySection } from '@/hooks/useCitySection';

const DEFAULT_SEASONAL_NARRATIVE = {
  springFall: `<strong>April through June</strong> and <strong>September through October</strong> typically offer the most pleasant weather for exploring. Temperatures are comfortable, crowds are manageable, and you'll enjoy longer days without peak-season prices.`,
  summer: `<strong>July and August</strong> bring the warmest weather and longest days, perfect for outdoor activities. Expect peak tourist crowds and higher prices. Book popular attractions in advance.`,
  winter: `<strong>November through February</strong> offers a quieter experience with lower prices. While weather can be challenging, you'll find shorter queues and a more authentic local atmosphere.`,
  march: `<strong>March</strong> marks the transition to spring. Weather can be unpredictable, but this shoulder season offers good value and fewer crowds.`,
};

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
 * "Season by Season" prose block — four short paragraphs lazy-loaded
 * from /data/{Country}/{slug}/seasonal-prose.json with a generic fallback.
 */
export default function SeasonalProse({ cityName, country: _country }) {
  const { data: content } = useCitySection(cityName, 'prose.seasonal', {
    defaultValue: DEFAULT_SEASONAL_NARRATIVE,
    transform: (json) => (json?.narrative ? json.narrative : DEFAULT_SEASONAL_NARRATIVE),
  });

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
