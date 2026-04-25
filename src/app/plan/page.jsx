'use client';

import { Suspense, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { MessageSquare, List } from 'lucide-react';

const ThreeColumnPlanner = dynamic(
  () => import('@/components/planner-v2/ThreeColumnPlanner'),
  {
    ssr: false,
    loading: () => <PlannerLoading label="Loading planner..." />,
  }
);

const AnchoredWizard = dynamic(
  () => import('@/components/trip-planner/AnchoredWizard'),
  {
    ssr: false,
    loading: () => <PlannerLoading label="Loading trip wizard..." />,
  }
);

function PlannerLoading({ label = 'Loading...' }) {
  return (
    <div className="h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#c9a227] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#8a8578] text-sm">{label}</p>
      </div>
    </div>
  );
}

const MODES = [
  { id: 'conversation', label: 'Describe', Icon: MessageSquare },
  { id: 'wizard', label: 'Step by step', Icon: List },
];

function buildInitialPlannerMessage(searchParams) {
  const q = searchParams.get('q')?.trim();
  if (q) return q;

  const city = searchParams.get('cityName') || searchParams.get('city');
  const cities = searchParams.get('cities')?.split(',').filter(Boolean) || [];
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const rank = searchParams.get('rank');
  const reason = searchParams.get('reason');

  if (cities.length > 1) {
    const dates = startDate && endDate ? ` from ${startDate} to ${endDate}` : '';
    return `Build a Europe route using these ranked city picks: ${cities.join(', ')}${dates}. Compare the tradeoffs and create a sensible itinerary route.`;
  }

  if (!city) return null;

  const parts = [`Plan a trip to ${city}`];
  if (startDate && endDate) parts.push(`from ${startDate} to ${endDate}`);
  const context = [];
  if (rank) context.push(`ranked #${rank}`);
  if (reason) context.push(reason);
  if (context.length > 0) parts.push(`It was ${context.join('; ')}.`);
  return parts.join(' ');
}

function PlanContent() {
  const searchParams = useSearchParams();

  const urlMode = searchParams.get('mode');
  const q = buildInitialPlannerMessage(searchParams);
  const tripId = searchParams.get('tripId') || null;
  const localTripId = searchParams.get('localTripId') || null;
  const hasWizardParams =
    searchParams.get('cities') || searchParams.get('start') || searchParams.get('end');

  const defaultMode =
    urlMode === 'wizard' || (!q && hasWizardParams) ? 'wizard' : 'conversation';

  const [mode, setMode] = useState(defaultMode);

  const preloadConversation = useCallback(() => {
    import('@/components/planner-v2/ThreeColumnPlanner');
  }, []);
  const preloadWizard = useCallback(() => {
    import('@/components/trip-planner/AnchoredWizard');
  }, []);

  const wizardProps = {
    initialStartCityId: searchParams.get('start') || null,
    initialEndCityId: searchParams.get('end') || null,
    initialStartDate: searchParams.get('startDate') || null,
    initialEndDate: searchParams.get('endDate') || null,
    isAuditMode: searchParams.get('mode') === 'audit',
    auditCityIds: searchParams.get('cities')?.split(',').filter(Boolean) || [],
  };

  return (
    <div className="fixed inset-0 top-[56px] flex flex-col bg-[#faf8f5] overflow-hidden z-10">
      {/* Top header bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-[#e5e0d8] shrink-0 bg-white/85 backdrop-blur">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#8a8578] font-medium leading-none">
            Plan a Trip
          </p>
          <h1 className="mt-0.5 leading-tight truncate">
            <span className="font-display text-base sm:text-lg text-[#2a2520] font-semibold">
              Describe your trip.
            </span>{' '}
            <span className="hidden sm:inline text-sm text-[#8a8578]">
              We&apos;ll build the route.
            </span>
          </h1>
          <p className="text-[11px] text-[#8a8578] mt-0.5 hidden xl:block">
            Start with a city, a season, or a mood. The route assembles as you chat,
            the map updates in real time, and the itinerary fills in with photos and rail connections.
          </p>
        </div>

        {/* Mode toggle */}
        <div
          role="tablist"
          aria-label="Planning mode"
          className="inline-flex gap-0.5 p-0.5 bg-white/80 backdrop-blur rounded-xl border border-[#e5e0d8] shadow-sm shrink-0"
        >
          {MODES.map((tab) => {
            const active = mode === tab.id;
            const { Icon } = tab;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setMode(tab.id)}
                onMouseEnter={
                  tab.id === 'conversation' ? preloadConversation : preloadWizard
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-white text-[#2a2520] shadow-sm'
                    : 'text-[#8a8578] hover:text-[#2a2520]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#2a2520]' : 'text-[#8a8578]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area: full remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === 'conversation' ? (
          <ThreeColumnPlanner
            initialUserMessage={q}
            initialTripId={tripId}
            initialLocalTripId={localTripId}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <AnchoredWizard {...wizardProps} />
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<PlannerLoading />}>
      <PlanContent />
    </Suspense>
  );
}
