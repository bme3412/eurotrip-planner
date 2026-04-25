'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import CompactMessageList from './CompactMessageList';
import CompactChatInput from './CompactChatInput';
import PlannerProgressBar from './PlannerProgressBar';
import InlineItinerary from '../conversation/InlineItinerary';
import { CitySearchInput } from '../conversation/InputArea';
import { buildDayAssignments } from '@/lib/conversation/dayAssignments';
import { derivePlannerInteraction } from '@/lib/conversation/plannerInteraction';
import { buildSuggestedAllocation } from '@/lib/conversation/plannerActions';
import { getFlagForCountry } from '@/utils/countryFlags';

function SuggestedStopsPanel({ suggestions = [], selectedDayCount = 0, onSelectCity }) {
  if (!suggestions.length) return null;
  const regionLabels = [...new Set(suggestions.map((city) => city.regionFocus).filter(Boolean))];
  const label = regionLabels.length === 1
    ? `Good bases for ${regionLabels[0]}`
    : regionLabels.length > 1
      ? `Recommended bases for ${regionLabels.join(' + ')}`
      : 'Suggested stops for this route';

  return (
    <div className="mb-3 rounded-2xl border border-[#e5e0d8] bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
            {label}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#4a4540]">
            {selectedDayCount > 0
              ? `Choose one to add to the ${selectedDayCount} selected open night${selectedDayCount === 1 ? '' : 's'}.`
              : 'Choose a suggestion, or search another city below.'}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#f5f0e8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6a6459]">
          Ranked
        </span>
      </div>

      <div className="grid gap-2">
        {suggestions.slice(0, 5).map((city) => {
          const meta = [
            city.regionFocus || null,
            city.routeRole || null,
            city.rank ? `#${city.rank}` : null,
            Number.isFinite(city.score) ? `${Math.round(city.score)} fit` : null,
            city.travelTime || city.duration || null,
          ].filter(Boolean);

          return (
            <button
              key={city.id || `${city.name}-${city.country || ''}`}
              type="button"
              disabled={selectedDayCount === 0}
              onClick={() => onSelectCity(city)}
              className="group rounded-2xl border border-[#e5e0d8] bg-[#faf8f5] p-3 text-left transition hover:border-[#c9a227] hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold leading-tight text-[#2a2520]">
                    {city.country ? `${getFlagForCountry(city.country)} ` : ''}
                    {city.name}
                    {city.country ? (
                      <span className="font-sans text-sm font-normal text-[#8a8578]">, {city.country}</span>
                    ) : null}
                  </p>
                  {city.reason && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6a6459]">
                      {city.reason}
                    </p>
                  )}
                  {city.transportNote && (
                    <p className="mt-1 text-[11px] leading-relaxed text-[#8a8578]">
                      {city.transportNote}
                    </p>
                  )}
                  {meta.length > 0 && (
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8578]">
                      {meta.join(' · ')}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-[#2a2520] px-3 py-1.5 text-[11px] font-semibold text-white transition group-hover:bg-[#c9a227]">
                  Add
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RouteGapAllocator({ interaction, tripState, assignDaysToCity, addCity }) {
  const [selected, setSelected] = useState(() => new Set());

  const days = useMemo(() => buildDayAssignments(tripState), [tripState]);
  const freeDays = useMemo(
    () => {
      const totalNights = tripState?.dates?.totalNights;
      return days.filter((day) => {
        if (day.cityId) return false;
        // The final day is a checkout/departure day in the nights-based model,
        // so assigning it would accidentally create an extra night.
        if (Number.isFinite(totalNights) && day.dayIndex >= totalNights) return false;
        return true;
      });
    },
    [days, tripState?.dates?.totalNights]
  );
  const freeIndices = useMemo(
    () => freeDays.map((day) => day.dayIndex),
    [freeDays]
  );
  const suggestions = interaction.previewSuggestions || [];

  useEffect(() => {
    setSelected((prev) => {
      const valid = new Set(freeIndices);
      const next = new Set([...prev].filter((idx) => valid.has(idx)));
      if (next.size === 0 && freeIndices.length > 0) {
        freeIndices.forEach((idx) => next.add(idx));
      }
      return next;
    });
  }, [freeIndices]);

  const selectedIndices = useMemo(() => {
    const next = [...selected].filter((idx) => freeIndices.includes(idx));
    next.sort((a, b) => a - b);
    return next;
  }, [freeIndices, selected]);

  const toggleDay = useCallback((dayIndex) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dayIndex)) next.delete(dayIndex);
      else next.add(dayIndex);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(freeIndices));
  }, [freeIndices]);

  const handleCitySelect = useCallback(
    (city) => {
      if (!city?.name || selectedIndices.length === 0) return;
      const created = addCity?.({
        id: city.id,
        name: city.name,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
      });
      const cityId = created?.id || city.id || city.name.toLowerCase();
      assignDaysToCity?.(cityId, selectedIndices);
      setSelected(new Set());
    },
    [addCity, assignDaysToCity, selectedIndices]
  );

  if (
    !assignDaysToCity ||
    !addCity ||
    freeDays.length === 0 ||
    !interaction.showRouteAllocator
  ) {
    return null;
  }
  const title = interaction.copy?.status || 'Allocate nights';
  const subtitle = `Assign ${freeDays.length} open ${freeDays.length === 1 ? 'night' : 'nights'} to the selected route stop.`;

  return (
    <div className="mx-3 mb-3 rounded-2xl border border-[#e5e0d8] bg-[#faf8f5] p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
            {title}
          </p>
          <p className="mt-0.5 text-[12px] text-[#4a4540]">
            {subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={selectAll}
          className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8578] hover:text-[#2a2520]"
        >
          All free
        </button>
      </div>

      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
        {freeDays.map((day) => {
          const active = selected.has(day.dayIndex);
          return (
            <button
              key={day.dayIndex}
              type="button"
              onClick={() => toggleDay(day.dayIndex)}
              className={`min-w-[56px] rounded-xl border px-2 py-1.5 text-left transition-colors ${
                active
                  ? 'border-[#2a2520] bg-[#2a2520] text-white'
                  : 'border-dashed border-[#d5d0c8] bg-white text-[#8a8578] hover:border-[#b5b0a8]'
              }`}
              aria-pressed={active}
            >
              <span className="block text-[9px] uppercase tracking-[0.12em] opacity-70">
                Night {day.dayIndex + 1}
              </span>
              <span className="block text-[10px] font-medium">
                {day.date ? day.date.slice(5).replace('-', '/') : 'Free'}
              </span>
            </button>
          );
        })}
      </div>

      <SuggestedStopsPanel
        suggestions={suggestions}
        selectedDayCount={selectedIndices.length}
        onSelectCity={handleCitySelect}
      />

      <CitySearchInput
        purpose="stop"
        label="Search another city"
        placeholder="Search another city to add..."
        suggestions={[]}
        onSelect={handleCitySelect}
      />
    </div>
  );
}

const STARTER_PROMPTS = [
  {
    id: 'vibe',
    title: 'Start with a vibe',
    text: '10 days in late September, food, scenic stops, not too rushed.',
  },
  {
    id: 'anchors',
    title: 'Start with anchors',
    text: 'I fly into Paris and out of Rome. Fill the middle with beautiful stops, using whatever transport fits best.',
  },
  {
    id: 'open',
    title: 'Let it suggest',
    text: 'Surprise me with a first Europe route for two weeks in June.',
  },
];

function InitialPlannerWelcome({ onSendMessage }) {
  return (
    <div className="px-3 pb-4">
      <div className="rounded-3xl border border-[#e5e0d8] bg-gradient-to-br from-[#fbf7ef] via-white to-[#f3efe7] p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a8578]">
          Build from messy notes
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[#2a2520]">
          Tell me what you know. I&apos;ll turn it into a route.
        </h2>
        <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-[#6a6459]">
          You can name cities, countries, dates, bookings, constraints, or just the feeling of the trip.
          I&apos;ll infer the missing pieces, label assumptions, and ask one useful question at a time.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => onSendMessage(prompt.text)}
              className="rounded-2xl border border-[#e5e0d8] bg-white/80 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#c9a227]/50 hover:bg-white hover:shadow-sm"
            >
              <span className="block text-[11px] font-semibold text-[#2a2520]">
                {prompt.title}
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-[#8a8578]">
                {prompt.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GenerationPanel({
  generationPhase,
  itinerary,
  generationError,
  trip,
  savedTripId,
  confirmGeneration,
  cancelFinalization,
  retryGeneration,
  resetGeneration,
}) {
  if (generationPhase === 'idle') return null;

  if (generationPhase === 'confirming') {
    return (
      <div className="mx-3 mb-3 rounded-2xl border border-[#d9c58e] bg-[#fff8e5] p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6f18]">
          Ready to build
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold text-[#2a2520]">
          Generate the detailed day-by-day itinerary?
        </h3>
        <p className="mt-1 text-sm text-[#6a6459]">
          I’ll turn the route, dates, pace, and preferences into daily activities, travel days, and meal-friendly time blocks.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={confirmGeneration}
            className="rounded-full bg-[#2a2520] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a1510]"
          >
            Build itinerary
          </button>
          <button
            type="button"
            onClick={cancelFinalization}
            className="rounded-full border border-[#d9c58e] bg-white px-4 py-2 text-sm font-semibold text-[#6a6459] hover:bg-[#fffaf0]"
          >
            Keep editing
          </button>
        </div>
      </div>
    );
  }

  if (generationPhase === 'generating') {
    return (
      <div className="mx-3 mb-3 rounded-2xl border border-[#e5e0d8] bg-white p-4">
        <InlineItinerary itinerary={null} isLoading trip={trip} />
      </div>
    );
  }

  if (generationPhase === 'error') {
    return (
      <div className="mx-3 mb-3 rounded-2xl border border-red-200 bg-red-50 p-4">
        <InlineItinerary
          itinerary={null}
          error={generationError || 'Generation failed.'}
          trip={trip}
          onRetry={retryGeneration}
        />
      </div>
    );
  }

  if (generationPhase === 'complete') {
    return (
      <div className="mx-3 mb-3 rounded-2xl border border-emerald-200 bg-white p-4">
        <InlineItinerary
          itinerary={itinerary}
          trip={trip}
          onStartOver={resetGeneration}
        />
        {savedTripId && (
          <div className="mt-3 flex justify-center">
            <Link
              href={`/itineraries/${savedTripId}`}
              className="rounded-full bg-[#2a2520] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a1510]"
            >
              Open full itinerary
            </Link>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function PinnedPlannerAction({ action, tripState, onSendMessage, onAcceptSuggestedAllocation }) {
  const suggestedAllocation = buildSuggestedAllocation(tripState);
  if (!action && !suggestedAllocation) return null;
  const saveLabel = action?.saveStatus === 'saving'
    ? 'Saving...'
    : action?.saveStatus === 'saved'
      ? 'Saved'
      : action?.saveStatus === 'error'
        ? 'Save issue'
        : null;

  return (
    <div className="border-t border-[#e5e0d8] bg-[#fffaf0] px-3 py-2">
      <div className="rounded-2xl border border-[#eadfc8] bg-white px-3 py-2 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
              Latest route action
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#2a2520]">
              {action?.title || 'Ready to assign dates'}
            </p>
            {(action?.nextPrompt || suggestedAllocation) && (
              <p className="mt-1 text-xs leading-relaxed text-[#6a6459]">
                {action?.nextPrompt || 'Apply a suggested night split, then compare transport between each leg.'}
              </p>
            )}
          </div>
          {saveLabel && (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              action?.saveStatus === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-[#f5f0e8] text-[#6a6459]'
            }`}>
              {saveLabel}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
        {suggestedAllocation && (
          <button
            type="button"
            onClick={() => onAcceptSuggestedAllocation?.(suggestedAllocation)}
            className="rounded-full bg-[#2a2520] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a1510]"
          >
            Apply suggested split
          </button>
        )}
        {action?.nextPrompt?.toLowerCase().includes('transport') && (
          <button
            type="button"
            onClick={() => onSendMessage('Compare the best transport between each leg.')}
            className="rounded-full border border-[#e5e0d8] bg-white px-3 py-1.5 text-xs font-semibold text-[#2a2520] hover:bg-[#faf8f5]"
          >
            Compare transport
          </button>
        )}
        </div>
      </div>
    </div>
  );
}

export default function PlannerColumn({
  messages,
  isStreaming,
  pendingInput,
  trip,
  tripState,
  isFinalized,
  gaps,
  interaction: providedInteraction,
  error,
  generationPhase,
  itinerary,
  generationError,
  savedTripId,
  onSendMessage,
  onOptionSelect,
  onCitySelect,
  onRoutePresetSelect,
  onDismissError,
  onRetry,
  onParsedItineraryConfirm,
  onParsedItineraryRefine,
  assignDaysToCity,
  addCity,
  confirmGeneration,
  cancelFinalization,
  retryGeneration,
  resetGeneration,
  latestPlannerAction,
  acceptSuggestedAllocation,
}) {
  const scrollContainerRef = useRef(null);

  const derivedInteraction = useMemo(
    () => derivePlannerInteraction({
      tripState,
      gaps,
      pendingInput,
      messages,
      generationPhase,
      isStreaming,
      isFinalized,
    }),
    [gaps, generationPhase, isFinalized, isStreaming, messages, pendingInput, tripState]
  );
  const interaction = providedInteraction || derivedInteraction;
  const quickReplies = interaction.quickReplies;
  const placeholder = isStreaming
    ? 'Thinking...'
    : isFinalized
      ? 'Trip finalized'
      : interaction.copy.placeholder;

  const handleQuickReply = useCallback(
    (option) => {
      if (!option) return;
      onSendMessage(option.label);
    },
    [onSendMessage]
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#e5e0d8]">
      {/* Thin top border — no label needed */}
      <div className="border-b border-[#e5e0d8] shrink-0" />

      {/* Messages + suggestions — this div is the scroll container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
        <CompactMessageList
          messages={messages}
          isStreaming={isStreaming}
          pendingInput={interaction.pendingInput}
          interaction={interaction}
          trip={trip}
          onOptionSelect={onOptionSelect}
          onCitySelect={onCitySelect}
          onRoutePresetSelect={onRoutePresetSelect}
          onParsedItineraryConfirm={onParsedItineraryConfirm}
          onParsedItineraryRefine={onParsedItineraryRefine}
          scrollContainerRef={scrollContainerRef}
        />

        {interaction.showWelcome && (
          <InitialPlannerWelcome onSendMessage={onSendMessage} />
        )}

        {/* Inline error with retry */}
        {error && (
          <div className="px-3 pb-3">
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-red-700">
                  Something went wrong.
                </p>
                <p className="text-[11px] text-red-600 mt-0.5 break-words">
                  {String(error)}
                </p>
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 text-[11px] text-red-700 hover:text-red-900"
                >
                  <RotateCcw className="w-3 h-3" /> Retry
                </button>
              )}
              {onDismissError && (
                <button
                  type="button"
                  onClick={onDismissError}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick replies — inline after messages so they scroll with the conversation */}
        {quickReplies.length > 0 && (
          <div className="px-3 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {quickReplies.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleQuickReply(opt)}
                  className="px-3 py-1.5 text-[11px] font-medium text-[#6a6459] bg-[#faf6eb] rounded-full border border-[#e5e0d8] hover:bg-[#f5ecd8] hover:border-[#c9a227]/40 transition-all active:scale-95"
                >
                  {opt.emoji && <span className="mr-1">{opt.emoji}</span>}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <RouteGapAllocator
          interaction={interaction}
          tripState={tripState}
          assignDaysToCity={assignDaysToCity}
          addCity={addCity}
        />

        <GenerationPanel
          generationPhase={generationPhase}
          itinerary={itinerary}
          generationError={generationError}
          trip={trip}
          savedTripId={savedTripId}
          confirmGeneration={confirmGeneration}
          cancelFinalization={cancelFinalization}
          retryGeneration={retryGeneration}
          resetGeneration={resetGeneration}
        />
      </div>

      {/* Chat input — visible unless actively generating */}
      {generationPhase !== 'generating' && (
        <>
          <PinnedPlannerAction
            action={latestPlannerAction}
            tripState={tripState}
            onSendMessage={onSendMessage}
            onAcceptSuggestedAllocation={acceptSuggestedAllocation}
          />
          <div className="px-3 py-3 shrink-0">
            <CompactChatInput
              onSend={onSendMessage}
              disabled={isStreaming}
              placeholder={placeholder}
            />
          </div>
        </>
      )}

      <PlannerProgressBar gaps={gaps} interaction={interaction} />
    </div>
  );
}
