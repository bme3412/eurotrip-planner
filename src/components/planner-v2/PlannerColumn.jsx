'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import CompactMessageList from './CompactMessageList';
import CompactChatInput from './CompactChatInput';
import PlannerProgressBar from './PlannerProgressBar';
import { CitySearchInput } from '../conversation/InputArea';
import { buildDayAssignments } from '@/lib/conversation/dayAssignments';
import { derivePlannerInteraction } from '@/lib/conversation/plannerInteraction';
import { getFlagForCountry } from '@/utils/countryFlags';

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

      {suggestions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((city) => (
            <button
              key={city.id}
              type="button"
              disabled={selectedIndices.length === 0}
              onClick={() => handleCitySelect(city)}
              className="rounded-full border border-[#e5e0d8] bg-white px-2.5 py-1 text-[11px] font-medium text-[#2a2520] hover:bg-[#f5f0e8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {city.country ? `${getFlagForCountry(city.country)} ` : ''}
              {city.name}
            </button>
          ))}
        </div>
      )}

      <CitySearchInput
        purpose="stop"
        suggestions={suggestions.map((city) => city.name)}
        onSelect={handleCitySelect}
      />
    </div>
  );
}

const STARTER_PROMPTS = [
  {
    id: 'vibe',
    title: 'Start with a vibe',
    text: '10 days in late September, food, trains, not too rushed.',
  },
  {
    id: 'anchors',
    title: 'Start with anchors',
    text: 'I fly into Paris and out of Rome. Fill the middle with beautiful train stops.',
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
      </div>

      {/* Chat input — visible unless actively generating */}
      {generationPhase !== 'generating' && (
        <div className="px-3 py-3 shrink-0">
          <CompactChatInput
            onSend={onSendMessage}
            disabled={isStreaming}
            placeholder={placeholder}
          />
        </div>
      )}

      <PlannerProgressBar gaps={gaps} interaction={interaction} />
    </div>
  );
}
