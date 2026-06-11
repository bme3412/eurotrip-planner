'use client';

import { Check, Loader2, ArrowRight } from 'lucide-react';
import SectionHeading from './SectionHeading';

const DONE_STEPS = [
  <>Mapped the route · Paris → Berlin → Kraków → Nice</>,
  <>Balanced 14 nights · 3 / 3 / 2 / 3</>,
  <>Checked June · weather, crowds, festivals</>,
  <>Folded in your flights &amp; stays</>,
];

export default function HowItWorks({ onScrollToDatePicker }) {
  return (
    <section className="px-6 py-16 md:py-24 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <SectionHeading
          align="center"
          eyebrow="The Planner"
          title="Describe the trip. Watch it build itself."
          subtitle="It doesn't hand you a list to sort through — it does the work."
          className="mb-10"
        />

        {/* Planner card */}
        <div className="rounded-2xl bg-white border border-gray-200/80 shadow-sm p-6 sm:p-8">
          {/* Prompt */}
          <div className="flex items-start gap-4">
            <span className="text-sm font-medium text-gray-400 pt-0.5">You</span>
            <p className="text-lg font-medium text-gray-900">
              &ldquo;Paris, Berlin, Kraków, then Nice — two weeks in June, mostly trains.&rdquo;
            </p>
          </div>

          <div className="my-5 border-t border-gray-100" />

          {/* Checklist */}
          <ul className="space-y-3.5">
            {DONE_STEPS.map((step, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-800">
                <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                <span className="text-base">{step}</span>
              </li>
            ))}
            <li className="flex items-center gap-3 text-blue-600">
              <Loader2 className="flex-shrink-0 w-5 h-5 animate-spin" />
              <span className="text-base font-medium">Placing day-by-day stops…</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <button
            onClick={onScrollToDatePicker}
            className="btn-primary group gap-2 px-8 py-4 text-base"
          >
            Plan a trip
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
