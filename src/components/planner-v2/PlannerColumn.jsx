'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Cloud, CloudOff, RotateCcw, Save, X, Map as MapIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CompactMessageList from './CompactMessageList';
import CompactChatInput from './CompactChatInput';
import PlannerProgressBar from './PlannerProgressBar';
import PlannerNextActionBar from './PlannerNextActionBar';
import ItineraryBuildingState from './ItineraryBuildingState';
import InlineItinerary from '../conversation/InlineItinerary';
import ItineraryOverlay from '../itinerary/ItineraryOverlay';
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

function SaveStatusBar({
  saveStatus,
  saveError,
  savedTripId,
  localTripId,
  user,
  isSupabaseConfigured,
  onSaveNow,
  onSignIn,
}) {
  const isLocal = saveStatus === 'saved_local' || (!savedTripId && localTripId);
  const status = saveError
    ? {
        label: saveError,
        detail: 'Your latest change may not be synced.',
        Icon: AlertTriangle,
        tone: 'border-red-200 bg-red-50 text-red-800',
      }
    : saveStatus === 'saving'
      ? {
          label: 'Saving...',
          detail: 'Keeping your trip up to date.',
          Icon: Save,
          tone: 'border-[#e5e0d8] bg-[#faf8f5] text-[#6a6459]',
        }
      : isLocal
        ? {
            label: 'Saved on this device',
            detail: user ? 'Syncing to your account when possible.' : 'Sign in to access it anywhere.',
            Icon: CloudOff,
            tone: 'border-amber-200 bg-amber-50 text-amber-900',
          }
        : savedTripId || saveStatus === 'saved'
          ? {
              label: 'Saved to your account',
              detail: 'You can reopen and edit this from My Trips.',
              Icon: CheckCircle2,
              tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
            }
          : {
              label: 'Draft not saved yet',
              detail: 'Add a city and dates to enable autosave.',
              Icon: Save,
              tone: 'border-[#e5e0d8] bg-white text-[#6a6459]',
            };

  const { Icon } = status;

  return (
    <div className="border-b border-[#e5e0d8] bg-white px-3 py-2">
      <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${status.tone}`}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold">{status.label}</p>
          <p className="truncate text-[11px] opacity-75">{status.detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isSupabaseConfigured && !user && isLocal && (
            <button
              type="button"
              onClick={onSignIn}
              className="rounded-full bg-[#2a2520] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1a1510]"
            >
              Sync
            </button>
          )}
          <button
            type="button"
            onClick={onSaveNow}
            className="inline-flex items-center gap-1 rounded-full border border-current/20 bg-white/70 px-3 py-1.5 text-[11px] font-semibold hover:bg-white"
          >
            <Cloud className="h-3 w-3" aria-hidden="true" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

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
  tripState,
  savedTripId,
  localTripId,
  retryGeneration,
  resetGeneration,
  onUpdateActivity,
}) {
  // Full-screen rich itinerary overlay — auto-opens once generation completes.
  const [overlayOpen, setOverlayOpen] = useState(false);
  useEffect(() => {
    if (generationPhase === 'complete') setOverlayOpen(true);
  }, [generationPhase]);

  if (generationPhase === 'idle') return null;

  // There is no 'confirming' gate — build is one click. finalize (agent) and the
  // bottom-bar CTA both go straight to 'generating'.

  const cityCount = itinerary?.meta?.totalCities || itinerary?.cities?.length || 0;
  const dayCount = itinerary?.meta?.totalDays || itinerary?.days?.length || 0;
  const firstCity = itinerary?.cities?.[0] || tripState?.route?.cities?.[0] || null;
  const citySlug = firstCity?.id || firstCity?.city || null;
  const cityDisplay = firstCity?.name || firstCity?.cityName || 'Trip';

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {generationPhase === 'generating' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-3 mb-3"
          >
            <ItineraryBuildingState tripState={tripState} />
          </motion.div>
        )}

        {generationPhase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mx-3 mb-3 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <InlineItinerary
              itinerary={null}
              error={generationError || 'Generation failed.'}
              trip={trip}
              onRetry={retryGeneration}
            />
          </motion.div>
        )}

        {generationPhase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mx-3 mb-3 rounded-2xl border border-emerald-200 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2a2520]">Your itinerary is ready</p>
                <p className="text-xs text-[#8a8578]">
                  {dayCount} days{cityCount ? ` · ${cityCount} ${cityCount === 1 ? 'city' : 'cities'}` : ''}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOverlayOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#2a2520] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a1510]"
              >
                <MapIcon className="h-4 w-4" /> View itinerary
              </button>
              {savedTripId && (
                <Link
                  href={`/itineraries/${savedTripId}`}
                  className="rounded-full border border-[#e5e0d8] bg-white px-4 py-2 text-sm font-semibold text-[#6a6459] hover:bg-[#faf8f5]"
                >
                  Open full page
                </Link>
              )}
              {localTripId && !savedTripId && (
                <Link
                  href="/saved-trips"
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  Saved in My Trips
                </Link>
              )}
              {/* Non-destructive: keep editing the route/days with the itinerary
                  still intact. "Start over" is the explicit discard. */}
              <button
                type="button"
                onClick={resetGeneration}
                className="rounded-full border border-[#e5e0d8] bg-white px-4 py-2 text-sm font-semibold text-[#6a6459] hover:bg-[#faf8f5]"
              >
                Start over
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {generationPhase === 'complete' && overlayOpen && (
        <ItineraryOverlay
          itinerary={itinerary}
          trip={trip}
          savedTripId={savedTripId}
          citySlug={citySlug}
          cityDisplay={cityDisplay}
          onActivityUpdate={onUpdateActivity}
          onClose={() => setOverlayOpen(false)}
          onKeepEditing={() => setOverlayOpen(false)}
        />
      )}
    </>
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
  localTripId,
  saveStatus,
  saveError,
  user,
  isSupabaseConfigured,
  onSendMessage,
  onOptionSelect,
  onCitySelect,
  onCitiesSelect,
  onRoutePresetSelect,
  onDatesPick,
  onFlexibleMonth,
  onFlexible,
  onDismissError,
  onRetry,
  onParsedItineraryConfirm,
  onParsedItineraryRefine,
  confirmGeneration,
  retryGeneration,
  resetGeneration,
  onUpdateActivity,
  onSaveNow,
  onSignIn,
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

      <SaveStatusBar
        saveStatus={saveStatus}
        saveError={saveError}
        savedTripId={savedTripId}
        localTripId={localTripId}
        user={user}
        isSupabaseConfigured={isSupabaseConfigured}
        onSaveNow={onSaveNow}
        onSignIn={onSignIn}
      />

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
          onCitiesSelect={onCitiesSelect}
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
          tripState={tripState}
          savedTripId={savedTripId}
          localTripId={localTripId}
          retryGeneration={retryGeneration}
          resetGeneration={resetGeneration}
          onUpdateActivity={onUpdateActivity}
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
            onBuildItinerary={confirmGeneration}
            onAcceptSuggestedAllocation={acceptSuggestedAllocation}
          />
        </>
      )}

      <PlannerProgressBar gaps={gaps} interaction={interaction} />
    </div>
  );
}
