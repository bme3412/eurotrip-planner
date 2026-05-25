'use client';

import { useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import CompactMessageList from './CompactMessageList';
import CompactChatInput from './CompactChatInput';
import PlannerProgressBar from './PlannerProgressBar';
import PlannerNextActionBar from './PlannerNextActionBar';
import InlineItinerary from '../conversation/InlineItinerary';
import { derivePlannerInteraction } from '@/lib/conversation/plannerInteraction';

const STARTER_PROMPTS = [
  {
    id: 'vibe',
    title: 'A vibe',
    text: '10 days in late September, food, scenic stops, not too rushed.',
  },
  {
    id: 'anchors',
    title: 'Known flights',
    text: 'I fly into Paris and out of Rome. Fill the middle with beautiful stops, using whatever transport fits best.',
  },
  {
    id: 'open',
    title: 'Surprise me',
    text: 'Surprise me with a first Europe route for two weeks in June.',
  },
];

function InitialPlannerWelcome({ onSendMessage }) {
  return (
    <div className="px-3 pb-4">
      <div className="rounded-3xl border border-[#e5e0d8] bg-gradient-to-br from-[#fbf7ef] via-white to-[#f3efe7] p-4 shadow-sm">
        <h2 className="mt-1 font-display text-xl font-semibold text-[#2a2520]">
          Start with whatever you know.
        </h2>
        <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-[#6a6459]">
          Name a city, paste flights, describe a vibe, or pick one of these examples.
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
  onDatesPick,
  onFlexibleMonth,
  onFlexible,
  onDismissError,
  onRetry,
  onParsedItineraryConfirm,
  onParsedItineraryRefine,
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
          onDatesPick={onDatesPick}
          onFlexibleMonth={onFlexibleMonth}
          onFlexible={onFlexible}
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
          <div className="px-3 py-3 shrink-0">
            <CompactChatInput
              onSend={onSendMessage}
              disabled={isStreaming}
              placeholder={placeholder}
            />
          </div>
          <PlannerNextActionBar
            interaction={interaction}
            latestPlannerAction={latestPlannerAction}
            tripState={tripState}
            savedTripId={savedTripId}
            onSendMessage={onSendMessage}
            onAcceptSuggestedAllocation={acceptSuggestedAllocation}
          />
        </>
      )}

      <PlannerProgressBar gaps={gaps} interaction={interaction} />
    </div>
  );
}
