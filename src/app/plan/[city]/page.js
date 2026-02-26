'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import DateRangePopover from '@/components/common/DateRangePopover';
import { useTripDates } from '@/hooks/useTripDates';
import { TRAVEL_STYLE_OPTIONS, getTravelStyleForPace } from '@/lib/planning/travelStyles';
import { useAuth } from '@/contexts/AuthContext';

const INTEREST_OPTIONS = [
  'Culture & History',
  'Food & Drink',
  'Nature & Outdoors',
  'Art & Museums',
  'Nightlife',
  'Shopping',
  'Photography',
  'Family Activities',
];

const BUDGET_OPTIONS = [
  { id: 'budget', label: 'Budget-Friendly', icon: '💰' },
  { id: 'moderate', label: 'Mid-Range', icon: '✨' },
  { id: 'premium', label: 'Premium', icon: '💎' },
];

function capitalize(s) {
  if (!s) return '';
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function PlanCityPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const citySlug = params.city;
  const cityDisplay = capitalize(citySlug);

  const { dates, setDates } = useTripDates({ mode: 'dates', start: '', end: '' });
  const [interests, setInterests] = useState([]);
  const [pace, setPace] = useState(TRAVEL_STYLE_OPTIONS[1].value);
  const [budget, setBudget] = useState('moderate');
  const [mustSee, setMustSee] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load city attractions for must-see step
  const [topAttractions, setTopAttractions] = useState([]);
  useEffect(() => {
    fetch(`/api/cities/${citySlug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const sites = data?.attractions?.sites || data?.attractions || [];
        setTopAttractions(
          sites
            .sort((a, b) => (b.ratings?.cultural_significance || 3) - (a.ratings?.cultural_significance || 3))
            .slice(0, 8)
        );
      })
      .catch(() => {});
  }, [citySlug]);

  const selectedStyle = useMemo(() => getTravelStyleForPace(pace), [pace]);
  const dateRange = useMemo(() => ({
    start: dates?.start || '',
    end: dates?.end || '',
  }), [dates]);

  const toggleInterest = (i) => {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const toggleMustSee = (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    setMustSee(prev => prev.includes(slug) ? prev.filter(x => x !== slug) : [...prev, slug]);
  };

  const steps = [
    {
      id: 'dates',
      title: `When are you visiting ${cityDisplay}?`,
      description: 'Pick your dates so we can optimize for weather, crowds, and events.',
      render: () => (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 shadow-sm">
            <DateRangePopover
              value={dateRange}
              onChange={(next) => {
                setDates({ mode: 'dates', ...next });
                setError(null);
              }}
              showSearchLabelOnSelection={false}
            />
          </div>
        </div>
      ),
      validate: () => {
        if (!dates?.start || !dates?.end) return 'Please select your travel dates.';
        return null;
      },
    },
    {
      id: 'style',
      title: 'Your travel style',
      description: 'How packed do you want your days?',
      render: () => (
        <div className="space-y-6">
          {/* Pace slider */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Pace</label>
            <input
              type="range"
              min={0}
              max={100}
              value={pace}
              onChange={(e) => setPace(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="mt-2 rounded-xl bg-indigo-50 px-4 py-3">
              <p className="font-semibold text-indigo-900">{selectedStyle.headline}</p>
              <p className="text-sm text-indigo-700">{selectedStyle.description}</p>
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">What interests you?</label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleInterest(opt)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    interests.includes(opt)
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'Budget and must-see attractions.',
      render: () => (
        <div className="space-y-6">
          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Budget level</label>
            <div className="grid grid-cols-3 gap-3">
              {BUDGET_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBudget(opt.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border px-4 py-4 text-sm font-medium transition-all ${
                    budget === opt.id
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Must-see */}
          {topAttractions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Must-see in {cityDisplay}</label>
              <div className="space-y-2">
                {topAttractions.map(att => {
                  const slug = att.name.toLowerCase().replace(/\s+/g, '-');
                  const checked = mustSee.includes(slug);
                  return (
                    <label key={att.name} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                      checked ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMustSee(att.name)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-900">{att.name}</span>
                        {att.type && <span className="ml-2 text-xs text-slate-500">{att.type}</span>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'review',
      title: 'Review & generate',
      description: 'Everything look good? Hit generate to build your itinerary.',
      render: () => (
        <div className="space-y-4">
          <dl className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">City</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{cityDisplay}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dates</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{dateRange.start} &rarr; {dateRange.end}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Style</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{selectedStyle.headline}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Budget</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 capitalize">{budget}</dd>
            </div>
            {interests.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interests</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {interests.map(i => (
                    <span key={i} className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{i}</span>
                  ))}
                </dd>
              </div>
            )}
            {mustSee.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Must-see</dt>
                <dd className="mt-1 text-sm text-slate-900">{mustSee.length} attraction{mustSee.length !== 1 ? 's' : ''} prioritized</dd>
              </div>
            )}
          </dl>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    const currentStep = steps[stepIndex];
    if (currentStep.validate) {
      const err = currentStep.validate();
      if (err) { setError(err); return; }
    }
    setError(null);
    setStepIndex(i => Math.min(i + 1, steps.length - 1));
  };

  const handleBack = () => {
    setError(null);
    setStepIndex(i => Math.max(i - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      city: citySlug,
      start_date: dates?.start || '',
      end_date: dates?.end || '',
      interests,
      pace,
      budget,
      must_see: mustSee,
      hotel_location: null,
      prebookings: {},
      user_id: user?.id || null,
    };

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Failed to save trip');
      }

      const trip = await res.json();
      router.push(`/itineraries/${trip.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4">
        <Link
          href={`/city-guides/${citySlug}`}
          className="inline-flex w-max items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600 hover:text-indigo-500"
        >
          &larr; Back to {cityDisplay} Guide
        </Link>

        <div className="rounded-3xl border border-white/40 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8">
          <header className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
              <span>Plan {cityDisplay}</span>
              <span>Step {stepIndex + 1} of {steps.length}</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-indigo-500 transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{currentStep.title}</h1>
              <p className="mt-2 text-sm text-slate-500 md:text-base">{currentStep.description}</p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>{currentStep.render()}</div>

            <footer className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={stepIndex === 0 ? () => router.push(`/city-guides/${citySlug}`) : handleBack}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
              >
                {stepIndex === 0 ? 'Cancel' : 'Back'}
              </button>

              {isLastStep ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm ${
                    isSubmitting ? 'cursor-not-allowed bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {isSubmitting ? 'Generating...' : 'Generate My Itinerary'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Continue
                </button>
              )}
            </footer>
          </form>
        </div>
      </div>
    </div>
  );
}
