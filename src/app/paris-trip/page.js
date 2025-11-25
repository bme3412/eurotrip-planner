'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DateRangePopover from '../../components/common/DateRangePopover';
import { useTripDates } from '../../hooks/useTripDates';
import { useTravelData } from '../../context/TravelDataProvider';
import { TRAVEL_STYLE_OPTIONS, getTravelStyleForPace } from '../../lib/planning/travelStyles.js';

const INTEREST_OPTIONS = [
  'Art & Design',
  'History',
  'Food & Wine',
  'Hidden Gems',
  'Nightlife',
  'Fashion & Shopping',
  'Parks & Outdoors',
  'Family Friendly',
];

const BUDGET_OPTIONS = [
  { id: 'budget', label: 'Budget-Friendly' },
  { id: 'moderate', label: 'Comfort' },
  { id: 'premium', label: 'Luxury' },
];

const PREBOOKING_KEYS = [
  {
    id: 'flights',
    label: 'Flights booked',
    description: 'Tell us when you land so airport transfers and first-night plans line up.',
  },
  {
    id: 'hotel',
    label: 'Hotel booked',
    description: 'Helps us keep walks efficient and surface late-night bites nearby.',
  },
  {
    id: 'activities',
    label: 'Activities booked',
    description: "We'll weave these around your day and suggest complements or alternates.",
  },
];

const PREBOOKING_SUGGESTIONS = {
  flights: ['Confirmation number', 'Airline & flight times', 'Departure airport', 'Return flight'],
  hotel: ['Hotel name & address', 'Reservation code', 'Check-in/check-out times', 'Special requests'],
  activities: ['Experience name', 'Meeting point', 'Voucher/reference code', 'Who is attending'],
};

const defaultDateRange = { start: '', end: '' };

export default function ParisTripPlannerPage() {
  const { setTravelParams } = useTravelData();
  const { dates, setDates } = useTripDates({ mode: 'dates', ...defaultDateRange });
  const router = useRouter();

  const [hotelLocation, setHotelLocation] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [pace, setPace] = useState(TRAVEL_STYLE_OPTIONS[1].value);
  const [budget, setBudget] = useState(BUDGET_OPTIONS[1].id);
  const [prebookings, setPrebookings] = useState({
    flights: false,
    hotel: false,
    activities: false,
  });
  const [prebookingNotes, setPrebookingNotes] = useState({
    flights: '',
    hotel: '',
    activities: '',
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  const selectedTravelStyle = useMemo(() => getTravelStyleForPace(pace), [pace]);
  const paceDescriptor = selectedTravelStyle?.headline ?? 'Balanced explorer';

  const currentDateRange = useMemo(() => {
    if (dates?.mode === 'dates') {
      return {
        start: dates?.start || '',
        end: dates?.end || '',
      };
    }
    return defaultDateRange;
  }, [dates]);

  const markUnsaved = () => setIsSaved(false);

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]
    );
    markUnsaved();
  };

  const togglePrebooking = (key) => {
    setPrebookings((prev) => {
      const nextValue = !prev[key];
      if (!nextValue) {
        setPrebookingNotes((notes) => ({ ...notes, [key]: '' }));
      }
      return { ...prev, [key]: nextValue };
    });
    markUnsaved();
  };

  const handlePrebookingNotesChange = (key, value) => {
    setPrebookingNotes((prev) => ({ ...prev, [key]: value }));
    markUnsaved();
  };

  const handlePrebookingSuggestion = (key, suggestion) => {
    setPrebookingNotes((prev) => {
      const existing = prev[key] ?? '';
      const normalized = existing.toLowerCase();
      if (normalized.includes(suggestion.toLowerCase())) {
        return prev;
      }
      const prefix = existing.trim().length > 0 ? `${existing.trim()}\n` : '';
      return {
        ...prev,
        [key]: `${prefix}${suggestion}: `,
      };
    });
    markUnsaved();
  };

  const steps = [
    {
      id: 'dates',
      title: 'When are you visiting Paris?',
      description: 'Pick your arrival and departure dates so we can align around events and opening hours.',
      render: () => (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 shadow-sm">
                  <DateRangePopover
                    value={currentDateRange}
                    onChange={(next) => {
                      setDates({ mode: 'dates', ...next });
                      setStepError(null);
                      markUnsaved();
                    }}
                    showSearchLabelOnSelection={false}
                  />
          </div>
          <p className="text-sm text-slate-500">
            We&apos;ll tailor your plan to seasonal happenings and keep an eye on closures while you&apos;re in town.
          </p>
        </div>
      ),
    },
    {
      id: 'hotel',
      title: 'Where will you be staying?',
      description: 'Optional, but helps us calculate walking times and suggest nearby cafés or landmarks.',
      render: () => (
        <div className="space-y-4">
          <input
            type="text"
            value={hotelLocation}
            onChange={(event) => {
              setHotelLocation(event.target.value);
              setStepError(null);
              markUnsaved();
            }}
            placeholder="Hotel name, neighborhood, or arrondissement"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <p className="text-sm text-slate-500">
            No place picked yet? You can leave this blank and fill it in later.
          </p>
        </div>
      ),
    },
    {
      id: 'prebookings',
      title: 'What have you already booked?',
      description: 'Let us know about anything that&apos;s locked in so we can plan around it.',
      render: () => (
        <div className="space-y-5">
          {PREBOOKING_KEYS.map(({ id, label, description }) => {
            const active = prebookings[id];
            const suggestions = PREBOOKING_SUGGESTIONS[id] ?? [];
            return (
              <div key={id} className="space-y-3">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm transition ${
                    active
                      ? 'border-indigo-400 bg-indigo-50/80 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={active}
                    onChange={() => {
                      togglePrebooking(id);
                      setStepError(null);
                    }}
                  />
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs font-medium text-slate-500">{description}</span>
                  </span>
                </label>
                {active && (
                  <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-4 shadow-sm transition">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                          Helpful details
                        </span>
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handlePrebookingSuggestion(id, suggestion)}
                            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={prebookingNotes[id]}
                        onChange={(event) => handlePrebookingNotesChange(id, event.target.value)}
                        rows={3}
                        placeholder="Add notes, codes, or anything we should heed"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ),
    },
    {
      id: 'pace',
      title: 'How do you like to explore?',
      description: 'Choose the vibe that matches how you like to move through a city.',
      render: () => (
        <div className="space-y-4">
          <div className="grid gap-3">
            {TRAVEL_STYLE_OPTIONS.map((option) => {
              const active = option.id === selectedTravelStyle?.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setPace(option.value);
                    setStepError(null);
                    markUnsaved();
                  }}
                  className={`rounded-2xl border px-5 py-4 text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                    active
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">
                        {option.label}
                      </p>
                      <h3 className="text-base font-semibold text-slate-900">
                        {option.headline}
                      </h3>
                      <p className="text-sm text-slate-500">{option.description}</p>
                    </div>
                    <span
                      className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                        active ? 'border-indigo-600 text-indigo-600' : 'border-slate-300 text-slate-400'
                      }`}
                    >
                      {active ? '✓' : option.id === 'unhurried' ? '1' : option.id === 'balanced' ? '2' : '3'}
                    </span>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {option.cues.map((cue) => (
                      <li
                        key={cue}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          active
                            ? 'border-indigo-400 bg-white/90 text-indigo-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        {cue}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-slate-500">
            We use this to balance must-see icons with breathing room, then propose swaps if your days start to feel off.
          </p>
        </div>
      ),
    },
    {
      id: 'interests',
      title: 'What excites you most about Paris?',
      description: 'Pick a few interests so we can spotlight the moments you care about.',
      render: () => (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => {
              const active = selectedInterests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => {
                    toggleInterest(interest);
                    setStepError(null);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm hover:bg-indigo-500'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-slate-500">
            Choose at least one focus area. We&apos;ll layer in seasonal highlights automatically.
          </p>
        </div>
      ),
    },
    {
      id: 'budget',
      title: 'How would you describe your budget comfort level?',
      description: 'This helps us suggest the right mix of bistros, splurges, and skip-the-line passes.',
      render: () => (
        <div className="grid gap-3 sm:grid-cols-3">
          {BUDGET_OPTIONS.map(({ id, label }) => (
            <label
              key={id}
              className={`flex cursor-pointer flex-col gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition ${
                budget === id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
              }`}
            >
              <input
                type="radio"
                name="budget"
                value={id}
                checked={budget === id}
                onChange={() => {
                  setBudget(id);
                  setStepError(null);
                  markUnsaved();
                }}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              {label}
            </label>
          ))}
        </div>
      ),
    },
    {
      id: 'summary',
      title: 'Ready for your Paris plan?',
      description: 'Review the highlights we captured before we save your preferences.',
      render: () => {
        const activePrebookings = PREBOOKING_KEYS.filter(({ id }) => prebookings[id]);
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-700 shadow-inner">
              <dl className="space-y-3">
                <div className="flex justify-between gap-3">
                  <dt className="font-medium text-slate-900">Dates</dt>
                  <dd className="text-right">
                    {currentDateRange.start && currentDateRange.end
                      ? `${currentDateRange.start} → ${currentDateRange.end}`
                      : 'Not yet selected'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-medium text-slate-900">Stay</dt>
                  <dd className="text-right">{hotelLocation.trim() || 'Still deciding'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-medium text-slate-900">Pace</dt>
                  <dd className="text-right">
                    {selectedTravelStyle?.headline ?? 'Balanced explorer'}
                    <span className="block text-xs font-medium text-slate-500">
                      {selectedTravelStyle?.label ?? 'Balanced explorer'}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-medium text-slate-900">Budget</dt>
                  <dd className="text-right">
                    {BUDGET_OPTIONS.find((option) => option.id === budget)?.label ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-900">Interests</dt>
                  <dd className="mt-1 flex flex-wrap justify-end gap-2">
                    {selectedInterests.length > 0 ? (
                      selectedInterests.map((interest) => (
                        <span
                          key={interest}
                          className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700"
                        >
                          {interest}
                        </span>
                      ))
                    ) : (
                      <span className="text-right text-slate-500">Add at least one interest</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-900">Pre-bookings</dt>
                  <dd className="mt-1 space-y-2">
                    {activePrebookings.length > 0 ? (
                      activePrebookings.map(({ id, label }) => (
                        <div key={id} className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs text-slate-600">
                          <p className="font-medium text-slate-800">{label}</p>
                          {prebookingNotes[id] ? (
                            <p className="mt-1 text-slate-500">{prebookingNotes[id]}</p>
                          ) : (
                            <p className="mt-1 text-slate-400">No additional notes provided.</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-right text-slate-500">Nothing booked yet</p>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            <p className="text-sm text-slate-500">
              Feeling unsure about any detail? You can always come back and update these preferences later.
            </p>
          </div>
        );
      },
    },
  ];

  const validateStep = (index) => {
    const { id } = steps[index];
    if (id === 'dates') {
      if (!currentDateRange.start || !currentDateRange.end) {
        return 'Please add both your arrival and departure dates.';
      }
    }
    if (id === 'interests') {
      if (selectedInterests.length === 0) {
        return 'Choose at least one interest so we can tailor your itinerary.';
      }
    }
    return null;
  };

  const validateBeforeSubmit = () => {
    if (!currentDateRange.start || !currentDateRange.end) {
      return 'Add your travel dates before saving.';
    }
    if (selectedInterests.length === 0) {
      return 'Pick at least one interest before finishing.';
    }
    return null;
  };

  const handleNext = () => {
    const error = validateStep(stepIndex);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setStepError(null);
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleRestart = () => {
    setStepError(null);
    setStepIndex(0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = validateBeforeSubmit();
    if (error) {
      setStepError(error);
      return;
    }

    const prebookingPayload = Object.fromEntries(
      PREBOOKING_KEYS.map(({ id }) => [
        id,
        {
          booked: prebookings[id],
          details: prebookings[id] ? prebookingNotes[id].trim() || null : null,
        },
      ])
    );

    const payload = {
      city: 'Paris',
      start_date: currentDateRange.start,
      end_date: currentDateRange.end,
      interests: selectedInterests,
      pace,
      budget,
      hotel_location: hotelLocation.trim() || null,
      prebookings: prebookingPayload,
    };

    setSubmissionError(null);
    setIsSubmitting(true);
    setIsSaved(false);

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody?.error || "We couldn't save your Paris trip yet. Try again shortly.";
        throw new Error(message);
      }

      const createdTrip = await response.json();

      setTravelParams((prev) => ({ ...prev, parisTrip: payload }));
      setIsSaved(true);
      setStepError(null);
      router.push(`/itineraries/${createdTrip.id}`);
    } catch (err) {
      console.error('Failed to create trip', err);
      setSubmissionError(err.message || "We couldn't save your Paris trip yet. Try again shortly.");
      setIsSaved(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4">
        <Link
          href="/"
          className="inline-flex w-max items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600 transition-colors hover:text-indigo-500"
        >
          ← Back to EuroExplorer
        </Link>

        <div className="rounded-3xl border border-white/40 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8">
          <header className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
              <span>Paris MVP</span>
              <span>
                Step {stepIndex + 1} of {steps.length}
              </span>
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
            {stepError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {stepError}
              </div>
            )}

            <div>{currentStep.render()}</div>

            <footer className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={isFirstStep ? handleRestart : handleBack}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700 sm:self-start"
              >
                {isFirstStep ? 'Start over' : 'Back'}
              </button>

              {isLastStep ? (
                <div className="flex flex-col gap-3 sm:items-end">
                  {submissionError && (
                    <div className="max-w-sm rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                      {submissionError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                      isSubmitting ? 'cursor-not-allowed bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Paris trip preferences'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                  Continue
                </button>
              )}
            </footer>
          </form>
        </div>

        {isSaved && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 shadow-sm">
            Paris trip preferences saved! We&apos;ll use these details when generating your itinerary.
          </div>
        )}
      </div>
    </div>
  );
}
