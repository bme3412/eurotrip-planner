'use client';

import React from 'react';
import { renderInlineBold } from '../lib/markdown';

function Section({ title, content }) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="font-display text-2xl font-semibold text-gray-900 mb-3 tracking-tight">{title}</h2>
      <div className="prose prose-lg max-w-none">
        {content.split('\n\n').map((paragraph, i) => (
          <p
            key={i}
            className="text-gray-700 leading-relaxed mb-4 last:mb-0 text-[17px]"
          >
            {renderInlineBold(paragraph)}
          </p>
        ))}
      </div>
    </section>
  );
}

export default function IntroSections({ intro = null, sections }) {
  const half = Math.ceil(sections.length / 2);
  const leftSections = sections.slice(0, half);
  const rightSections = sections.slice(half);

  return (
    <article className="max-w-4xl mx-auto lg:max-w-none">
      {intro && (
        <p className="text-xl md:text-2xl text-gray-800 leading-relaxed mb-10 font-medium max-w-4xl">
          {intro}
        </p>
      )}

      <div className="grid lg:grid-cols-2 gap-x-12 gap-y-2">
        <div className="divide-y divide-gray-100 lg:divide-y-0">
          {leftSections.map((section, i) => (
            <div key={i} className="py-5 first:pt-0 lg:py-0 lg:mb-8">
              <Section title={section.title} content={section.content} />
            </div>
          ))}
        </div>

        <div className="divide-y divide-gray-100 lg:divide-y-0">
          {rightSections.map((section, i) => (
            <div key={i} className="py-5 first:pt-0 lg:py-0 lg:mb-8">
              <Section title={section.title} content={section.content} />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
