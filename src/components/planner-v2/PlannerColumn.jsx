'use client';

import { useCallback, useMemo, useRef } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import CompactMessageList from './CompactMessageList';
import CompactChatInput from './CompactChatInput';
import PlannerProgressBar from './PlannerProgressBar';

// Build contextual quick-reply suggestions from gap analysis + trip state.
function deriveQuickReplies(gaps, trip, tripState) {
  const next = gaps?.nextQuestion;
  if (!next) return [];

  const cities = tripState?.route?.cities || [];
  const cityCount = cities.length;

  switch (next.field) {
    case 'cities': {
      const replies = [
        { id: 'surprise', label: 'Surprise me', emoji: '\uD83C\uDFB2' },
        { id: 'classic', label: 'Classic European tour', emoji: '\uD83C\uDFDB\uFE0F' },
      ];
      if (cityCount === 0) {
        replies.push({ id: 'loop', label: 'One-city deep dive', emoji: '\uD83D\uDCCD' });
      }
      return replies;
    }
    case 'duration': {
      if (cityCount <= 1) {
        return [
          { id: '3n', label: '3 nights' },
          { id: '5n', label: '5 nights' },
          { id: '7n', label: '7 nights' },
        ];
      }
      const suggested = Math.max(7, cityCount * 3);
      return [
        { id: 'suggested', label: `${suggested} nights` },
        { id: '10n', label: '10 nights' },
        { id: '14n', label: '14 nights' },
      ];
    }
    case 'routeShape':
      return next.options || [];
    case 'dates': {
      const now = new Date();
      const month = now.getMonth();
      const replies = [];
      if (month >= 9 || month <= 2) {
        // Winter: suggest spring
        replies.push({ id: 'spring', label: `Spring ${now.getFullYear() + (month <= 2 ? 0 : 1)}` });
      } else {
        // Spring/Summer: suggest fall
        replies.push({ id: 'fall', label: `Fall ${now.getFullYear()}` });
      }
      replies.push({ id: 'flex', label: "I'm flexible" });
      return replies;
    }
    case 'transport':
      return [
        { id: 'train', label: 'Train' },
        { id: 'flight', label: 'Flight' },
        { id: 'mix', label: 'Mix of both' },
      ];
    case 'budget':
      return [
        { id: 'budget', label: 'Budget' },
        { id: 'moderate', label: 'Moderate' },
        { id: 'premium', label: 'Premium' },
      ];
    case 'travelers':
      return [
        { id: 'solo', label: 'Solo' },
        { id: 'couple', label: 'Couple' },
        { id: 'family', label: 'Family' },
        { id: 'friends', label: 'Friends' },
      ];
    case 'interests':
      return [
        { id: 'culture', label: 'Culture and museums' },
        { id: 'food', label: 'Food and wine' },
        { id: 'nature', label: 'Nature and hikes' },
      ];
    default:
      return [];
  }
}

// Context-aware placeholder based on gap analysis.
function derivePlaceholder(gaps, isStreaming, isFinalized, generationPhase) {
  if (isStreaming) return 'Thinking...';
  if (generationPhase === 'complete') return 'Want to make changes?';
  if (isFinalized) return 'Trip finalized';

  const next = gaps?.nextQuestion;
  if (!next) return 'Anything else to add?';

  const map = {
    cities: 'Type a city name, like "Paris" or "Barcelona"...',
    duration: 'How many nights? e.g. "10 nights"...',
    dates: 'When are you going? e.g. "September 2027"...',
    routeShape: 'One city or multi-city trip?',
    transport: 'Train, flight, or a mix?',
    budget: "What's your budget style?",
    travelers: "Who's coming along?",
    interests: 'What do you love? Food, art, nature...',
    accommodation: 'Hotels, Airbnb, hostels?',
  };
  return map[next.field] || 'Tell me more about your trip...';
}

export default function PlannerColumn({
  messages,
  isStreaming,
  pendingInput,
  trip,
  tripState,
  isFinalized,
  gaps,
  error,
  generationPhase,
  onSendMessage,
  onOptionSelect,
  onCitySelect,
  onDaysChange,
  onDateSelect,
  onDismissError,
  onRetry,
  onParsedItineraryConfirm,
  onParsedItineraryRefine,
}) {
  const scrollContainerRef = useRef(null);

  const quickReplies = useMemo(
    () => (isFinalized || isStreaming || pendingInput ? [] : deriveQuickReplies(gaps, trip, tripState)),
    [gaps, trip, tripState, isFinalized, isStreaming, pendingInput]
  );

  const placeholder = useMemo(
    () => derivePlaceholder(gaps, isStreaming, isFinalized, generationPhase),
    [gaps, isStreaming, isFinalized, generationPhase]
  );

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
          pendingInput={pendingInput}
          trip={trip}
          onOptionSelect={onOptionSelect}
          onCitySelect={onCitySelect}
          onDaysChange={onDaysChange}
          onDateSelect={onDateSelect}
          onParsedItineraryConfirm={onParsedItineraryConfirm}
          onParsedItineraryRefine={onParsedItineraryRefine}
          scrollContainerRef={scrollContainerRef}
        />

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

      <PlannerProgressBar gaps={gaps} />
    </div>
  );
}
