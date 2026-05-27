'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import DateRangePopover from '@/components/common/DateRangePopover';
import { useTripDates } from '@/hooks/useTripDates';
import { getTravelStyleForPace } from '@/lib/planning/travelStyles';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';
import { cityById } from '@/generated/cityIndex';

// ── Pace options (replaces slider) ───────────────────────────────────
const PACE_CARDS = [
  {
    id: 'relaxed',
    label: 'Relaxed',
    pace: 15,
    rate: '2–3 things/day',
    description: 'Long lunches, unplanned detours, and time to just wander.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    pace: 50,
    rate: '3–4 things/day',
    description: 'A mix of highlights and breathing room. Never rushed.',
  },
  {
    id: 'active',
    label: 'Active',
    pace: 85,
    rate: '5–6 things/day',
    description: 'Early starts, full days, and maximum ground covered.',
  },
];

// ── Interest options with icons ──────────────────────────────────────
const INTEREST_OPTIONS = [
  { id: 'Culture & History',  icon: '🏛',  sub: 'History & landmarks' },
  { id: 'Food & Drink',       icon: '🍽',  sub: 'Eat like locals' },
  { id: 'Art & Museums',      icon: '🎨',  sub: 'Galleries & exhibitions' },
  { id: 'Nature & Outdoors',  icon: '🌿',  sub: 'Parks, hikes, coast' },
  { id: 'Architecture',       icon: '🏗',  sub: 'Buildings & design' },
  { id: 'Nightlife',          icon: '🌙',  sub: 'Bars, clubs & late nights' },
  { id: 'Shopping',           icon: '🛍',  sub: 'Markets & boutiques' },
  { id: 'Photography',        icon: '📷',  sub: 'Views & hidden spots' },
  { id: 'Live Music',         icon: '🎵',  sub: 'Concerts & street music' },
  { id: 'Family Activities',  icon: '👨‍👩‍👧', sub: 'Kid-friendly activities' },
];

// ── Budget options (no emoji) ────────────────────────────────────────
const BUDGET_OPTIONS = [
  { id: 'budget',   label: 'Budget',    description: 'Hostels, street food, free attractions' },
  { id: 'moderate', label: 'Mid-Range', description: '3-star hotels, sit-down meals, some paid entry' },
  { id: 'premium',  label: 'Premium',   description: '4–5 star stays, tasting menus, skip-the-line tickets' },
];

function capitalize(s) {
  if (!s) return '';
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDateRange(start, end) {
  if (!start || !end) return null;
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  const nights = Math.round((e - s) / (1000 * 60 * 60 * 24));
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${nights} night${nights !== 1 ? 's' : ''} · ${fmt(s)}–${fmt(e)}`;
}

export default function PlanCityPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useAuth();
  const citySlug = params.city;
  const cityDisplay = capitalize(citySlug);

  const { dates, setDates } = useTripDates({ mode: 'dates', start: '', end: '' });
  const [interests, setInterests] = useState([]);
  const [pace, setPace] = useState(PACE_CARDS[1].pace);
  const [paceId, setPaceId] = useState('balanced');
  const [budget, setBudget] = useState('moderate');
  const [mustSee, setMustSee] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [backdropError, setBackdropError] = useState(false);

  const [topAttractions, setTopAttractions] = useState([]);
  useEffect(() => {
    // Fetch directly from static file instead of API — reuses warm cache from CityCard hover
    const cityInfo = cityById[citySlug];
    const country = cityInfo?.country?.toLowerCase() || 'france';
    fetch(`/data/${country}/${citySlug}/index.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const sites = data?.attractions?.sites || data?.attractions || [];
        setTopAttractions(
          sites
            .sort((a, b) => (b.ratings?.cultural_significance || 3) - (a.ratings?.cultural_significance || 3))
            .slice(0, 8)
        );
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          console.error(`Failed to load attractions for ${citySlug}:`, err);
        }
      });
  }, [citySlug]);

  const selectedBudget = BUDGET_OPTIONS.find(b => b.id === budget) || BUDGET_OPTIONS[1];
  const dateRange = useMemo(() => ({
    start: dates?.start || '',
    end: dates?.end || '',
  }), [dates]);

  const nightsLabel = useMemo(
    () => formatDateRange(dateRange.start, dateRange.end),
    [dateRange.start, dateRange.end]
  );

  const toggleInterest = (id) => {
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectPace = (card) => {
    setPaceId(card.id);
    setPace(card.pace);
  };

  const toggleMustSee = useCallback((name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    setMustSee(prev => prev.includes(slug) ? prev.filter(x => x !== slug) : [...prev, slug]);
  }, []);

  // Memoize steps to avoid recreating on every keystroke — only update when deps change
  const steps = useMemo(() => [
    {
      id: 'dates',
      title: `When are you visiting ${cityDisplay}?`,
      description: 'Pick your dates so we can optimize for weather, crowds, and events.',
      render: () => (
        <div className="space-y-3">
          <DateRangePopover
            value={dateRange}
            onChange={(next) => {
              setDates({ mode: 'dates', ...next });
              setError(null);
            }}
            showSearchLabelOnSelection={false}
          />
          {nightsLabel && (
            <p className="text-center text-sm text-slate-400 tracking-wide">{nightsLabel}</p>
          )}
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
      description: 'How do you want to spend your days?',
      render: () => (
        <div className="space-y-7">
          {/* Pace cards */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Pace</label>
            <div className="grid grid-cols-3 gap-3">
              {PACE_CARDS.map(card => {
                const active = paceId === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => selectPace(card)}
                    className={`flex flex-col gap-1.5 rounded-2xl border px-3 py-4 text-left transition-all ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-900'}`}>{card.label}</span>
                    <span className={`text-xs font-medium tabular-nums ${active ? 'text-slate-300' : 'text-indigo-600'}`}>{card.rate}</span>
                    <span className={`text-xs leading-snug ${active ? 'text-slate-400' : 'text-slate-500'}`}>{card.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interest cards */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">What interests you?</label>
            <div className="grid grid-cols-2 gap-2.5">
              {INTEREST_OPTIONS.map(opt => {
                const active = interests.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleInterest(opt.id)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white'
                    }`}
                  >
                    <span className="text-xl leading-none shrink-0" aria-hidden>{opt.icon}</span>
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold leading-tight ${active ? 'text-white' : 'text-slate-900'}`}>{opt.id}</div>
                      <div className={`text-xs leading-tight mt-0.5 ${active ? 'text-slate-400' : 'text-slate-500'}`}>{opt.sub}</div>
                    </div>
                  </button>
                );
              })}
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
        <div className="space-y-7">
          {/* Budget — segmented control */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Budget level</label>
            <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-slate-50 p-1 gap-1">
              {BUDGET_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBudget(opt.id)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    budget === opt.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-sm text-slate-500 text-center">{selectedBudget.description}</p>
          </div>

          {/* Must-see */}
          {topAttractions.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                Must-see in {cityDisplay}
              </label>
              <div className="space-y-1.5">
                {topAttractions.map(att => {
                  const slug = att.name.toLowerCase().replace(/\s+/g, '-');
                  const checked = mustSee.includes(slug);
                  return (
                    <label
                      key={att.name}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                        checked ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMustSee(att.name)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div className="flex-1 min-w-0 flex items-baseline gap-2">
                        <span className={`text-sm font-medium ${checked ? 'text-slate-900' : 'text-slate-700'}`}>{att.name}</span>
                        {(att.neighborhood || att.type) && (
                          <span className="text-xs text-slate-400 truncate">
                            {att.neighborhood || att.type}
                          </span>
                        )}
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
      description: "Everything look good? We'll build your day-by-day plan now.",
      render: () => (
        <div className="space-y-4">
          <dl className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">City</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{cityDisplay}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Dates</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{nightsLabel || `${dateRange.start} → ${dateRange.end}`}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Pace</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{PACE_CARDS.find(c => c.id === paceId)?.label}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Budget</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{selectedBudget.label}</dd>
            </div>
            {interests.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Interests</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {interests.map(i => (
                    <span key={i} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{i}</span>
                  ))}
                </dd>
              </div>
            )}
            {mustSee.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Must-see</dt>
                <dd className="mt-1 text-sm text-slate-900">{mustSee.length} attraction{mustSee.length !== 1 ? 's' : ''} prioritized</dd>
              </div>
            )}
          </dl>
        </div>
      ),
    },
  ], [cityDisplay, dateRange, dates, setDates, nightsLabel, paceId, selectPace, interests, toggleInterest, budget, setBudget, selectedBudget, topAttractions, mustSee, toggleMustSee]);

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
    };

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: getSupabaseAuthHeaders(session, { 'Content-Type': 'application/json' }),
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
  const backdropSrc = `/images/city-page/${citySlug}.jpg`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4">
        <Link
          href={`/city-guides/${citySlug}`}
          className="inline-flex w-max items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 hover:text-slate-700 transition-colors"
        >
          &larr; {cityDisplay}
        </Link>

        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-xl backdrop-blur">
          {/* City backdrop strip */}
          <div className="relative h-20 overflow-hidden bg-slate-900">
            {!backdropError && (
              <img
                src={backdropSrc}
                alt=""
                aria-hidden
                onError={() => setBackdropError(true)}
                className="absolute inset-0 h-full w-full object-cover object-center opacity-40"
              />
            )}
            {/* Step indicator overlay */}
            <div className="absolute inset-0 flex items-end px-6 pb-3">
              <div className="flex items-center gap-3 w-full">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                  Plan {cityDisplay}
                </span>
                <div className="flex-1 flex items-center gap-1.5">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= stepIndex ? 'bg-white' : 'bg-white/25'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-white/60 tabular-nums">{stepIndex + 1} / {steps.length}</span>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <header className="mb-7">
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{currentStep.title}</h1>
              <p className="mt-1.5 text-sm text-slate-400 md:text-base">{currentStep.description}</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>{currentStep.render()}</div>

              <footer className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={stepIndex === 0 ? () => router.push(`/city-guides/${citySlug}`) : handleBack}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {stepIndex === 0 ? 'Cancel' : '← Back'}
                </button>

                {isLastStep ? (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`inline-flex items-center justify-center rounded-full px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition-all ${
                      isSubmitting ? 'cursor-not-allowed bg-slate-400' : 'bg-slate-900 hover:bg-slate-700'
                    }`}
                  >
                    {isSubmitting ? 'Building your plan...' : 'Generate Itinerary →'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 transition-all"
                  >
                    Continue →
                  </button>
                )}
              </footer>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
