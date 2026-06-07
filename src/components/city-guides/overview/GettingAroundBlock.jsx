'use client';

import React from 'react';
import { useStartHereData } from '../startHere/hooks/useStartHereData';

// Render a prose block: blank-line paragraphs + **bold** segments → <strong>.
function Prose({ content }) {
  if (!content) return null;
  const paragraphs = String(content).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="space-y-2.5">
      {paragraphs.map((para, pi) => (
        <p key={pi} className="text-[14.5px] leading-7 text-slate-600">
          {para.split(/(\*\*[^*]+\*\*)/g).map((seg, si) =>
            seg.startsWith('**') && seg.endsWith('**') ? (
              <strong key={si} className="font-semibold text-slate-900">{seg.slice(2, -2)}</strong>
            ) : (
              <React.Fragment key={si}>{seg}</React.Fragment>
            )
          )}
        </p>
      ))}
    </div>
  );
}

/**
 * GettingAroundBlock — the airport-to-city and getting-around essentials, shown
 * on the Overview landing (folded in from the former "Getting In" tab). Loads
 * the city's start-here prose and renders the intro + "From the Airport" +
 * "Getting Around" sections. Renders nothing until the prose lands.
 */
export default function GettingAroundBlock({ cityName, displayName }) {
  const { narrative = {} } = useStartHereData(cityName?.toLowerCase()) || {};
  const sections = ['arrival', 'gettingAround']
    .map((k) => narrative[k])
    .filter((s) => s && s.content);

  if (!narrative.intro && sections.length === 0) return null;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
        Getting in &amp; around
      </p>
      <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
        Getting to {displayName}
      </h2>
      {narrative.intro && (
        <p className="mt-3 max-w-[72ch] text-[15.5px] md:text-base leading-7 text-slate-700">
          {narrative.intro}
        </p>
      )}
      {sections.length > 0 && (
        <div className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {sections.map((s) => (
            <div key={s.title}>
              <h3 className="mb-2 text-[15px] font-semibold tracking-tight text-slate-900">
                {s.title}
              </h3>
              <Prose content={s.content} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
