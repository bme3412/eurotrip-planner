'use client';

import { CalendarDays, Gauge, ListOrdered } from 'lucide-react';

const STEPS = [
  {
    icon: CalendarDays,
    title: 'Pick your dates',
    body: 'Choose your exact travel window — or just describe the trip in plain words.',
  },
  {
    icon: Gauge,
    title: 'We rate 220 cities',
    body: 'Each city is rated on weather, crowds, seasonal events, and value for those specific days.',
  },
  {
    icon: ListOrdered,
    title: 'Get your ranked shortlist',
    body: 'See where everywhere lands for your trip, then start planning the winner in one click.',
  },
];

const STATS = [
  { value: '220', label: 'Cities' },
  { value: '41', label: 'Countries' },
  { value: '365', label: 'Days analyzed' },
  { value: '$0', label: 'No signup' },
];

export default function HowItWorks({ onScrollToDatePicker }) {
  return (
    <section className="px-6 py-20 bg-gray-50 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-3">
            <span className="w-8 h-px bg-blue-600"></span>
            How it works
            <span className="w-8 h-px bg-blue-600"></span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            From your dates to a ranked shortlist.
          </h2>
        </div>

        {/* Steps */}
        <div className="grid gap-6 sm:grid-cols-3 mb-14">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative rounded-2xl bg-white border border-gray-100 p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-gray-300">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1.5">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
              </div>
            );
          })}
        </div>

        {/* Trust / stats band */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-gray-200 border border-gray-200">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white px-4 py-6 text-center">
              <div className="text-3xl font-extrabold text-gray-900">{s.value}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <button
            onClick={onScrollToDatePicker}
            className="group inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white font-bold rounded-full hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Start with your dates
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
