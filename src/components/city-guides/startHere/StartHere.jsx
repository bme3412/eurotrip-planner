'use client';

import React from 'react';
import AirportRoutePanel from './components/AirportRoutePanel';
import FaqAccordion from './components/FaqAccordion';
import StartHereFooter from './components/StartHereFooter';
import { useStartHereData } from './hooks/useStartHereData';
import { useGettingInData } from './hooks/useGettingInData';

// Order the orientation narrative reads top-to-bottom: arrive, get around, then
// the practical know-how. Only keys present in the data render.
const NARRATIVE_ORDER = [
  'arrival',
  'gettingAround',
  'money',
  'connectivity',
  'timing',
  'quickWins',
];

// Render a prose block: split on blank lines into paragraphs and turn **bold**
// segments into <strong>. Keeps the data as lightweight markdown.
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

export default function StartHere({ cityName, cityData }) {
  const cityKey = cityName?.toLowerCase();
  const displayName =
    (cityName?.charAt(0).toUpperCase() + cityName?.slice(1)) || 'This City';

  const { narrative = {}, faqs = [] } = useStartHereData(cityKey, cityData?.country) || {};
  const {
    gettingInData,
    selectedAirport,
    selectedAirportData,
    selectedRouteId,
    handleSelectAirport,
    handleSelectRoute,
  } = useGettingInData(cityKey, cityData?.country);

  const sections = NARRATIVE_ORDER
    .map((key) => narrative[key])
    .filter((s) => s && s.content);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Orientation header + intro */}
      {(narrative.intro || sections.length > 0) && (
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
      )}

      {/* Structured airport/route picker — only cities that ship getting-in.json.
          For cities whose arrival info lives in the narrative above, this is skipped. */}
      {gettingInData && (
        <AirportRoutePanel
          displayName={displayName}
          gettingInData={gettingInData}
          selectedAirport={selectedAirport}
          selectedAirportData={selectedAirportData}
          selectedRouteId={selectedRouteId}
          onSelectAirport={handleSelectAirport}
          onSelectRoute={handleSelectRoute}
        />
      )}

      <FaqAccordion faqs={faqs} />

      <StartHereFooter />
    </div>
  );
}
