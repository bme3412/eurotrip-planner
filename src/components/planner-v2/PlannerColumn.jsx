'use client';

import { useCallback, useMemo } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import CompactMessageList from './CompactMessageList';
import CompactChatInput from './CompactChatInput';
import SuggestedCityGrid from './SuggestedCityGrid';
import PlannerProgressBar from './PlannerProgressBar';
import citiesData from '@/generated/cities.json';

// Build short, contextual quick-reply suggestions from the gap analysis.
function deriveQuickReplies(gaps, trip) {
  const next = gaps?.nextQuestion;
  if (!next) return [];
  switch (next.field) {
    case 'cities':
      return [
        { id: 'paris-rome', label: 'Paris and Rome' },
        { id: 'classic', label: 'Classic European tour' },
        { id: 'surprise', label: 'Surprise me' },
      ];
    case 'duration':
      return [
        { id: '7n', label: '7 nights' },
        { id: '10n', label: '10 nights' },
        { id: '14n', label: '14 nights' },
      ];
    case 'routeShape':
      return next.options || [];
    case 'dates': {
      const fall = `September ${new Date().getFullYear() + 1}`;
      const spring = `May ${new Date().getFullYear() + 1}`;
      return [
        { id: 'fall', label: fall },
        { id: 'spring', label: spring },
        { id: 'flex', label: "I'm flexible" },
      ];
    }
    case 'transport':
      return next.options || [];
    case 'budget':
      return next.options || [];
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

export default function PlannerColumn({
  messages,
  isStreaming,
  pendingInput,
  trip,
  tripState,
  isFinalized,
  gaps,
  error,
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
  const showSuggestions = !trip.startCity && !isStreaming && messages.length > 0 && !pendingInput;

  const quickReplies = useMemo(
    () => (isFinalized || isStreaming || pendingInput ? [] : deriveQuickReplies(gaps, trip)),
    [gaps, trip, isFinalized, isStreaming, pendingInput]
  );

  const handleSurprise = useCallback(() => {
    onSendMessage('Surprise me with a great European trip!');
  }, [onSendMessage]);

  const handleLoop = useCallback(() => {
    onSendMessage('I want to stay in one city (a loop trip)');
  }, [onSendMessage]);

  const handleCityPick = useCallback((city) => {
    onCitySelect(city, 'start');
  }, [onCitySelect]);

  const handleQuickReply = useCallback(
    (option) => {
      if (!option) return;
      onSendMessage(option.label);
    },
    [onSendMessage]
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#e5e0d8]">
      {/* Column header */}
      <div className="px-4 py-3 border-b border-[#e5e0d8] shrink-0">
        <span className="text-[9px] uppercase tracking-[0.15em] text-[#8a8578] font-medium">
          01 &nbsp;Planner&nbsp;
          <span className="text-emerald-500">LIVE</span>
        </span>
      </div>

      {/* Messages + suggestions */}
      <div className="flex-1 overflow-y-auto min-h-0">
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
        />

        {showSuggestions && (
          <div className="px-3 pb-3">
            <SuggestedCityGrid
              citiesData={citiesData}
              onSelect={handleCityPick}
              label="Final city"
            />
          </div>
        )}

        {/* Inline error with retry — keeps users unstuck without reload */}
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
      </div>

      {/* Gap-driven quick replies (only when no other UI is competing) */}
      {quickReplies.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap gap-1.5 shrink-0 border-t border-[#e5e0d8]/50">
          {quickReplies.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleQuickReply(opt)}
              className="px-3 py-1.5 text-[11px] font-medium text-[#6a6459] bg-[#faf6eb] rounded-full border border-[#e5e0d8] hover:bg-[#f5ecd8] transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Loop / surprise shortcuts */}
      {!isFinalized && (
        <div className="px-3 py-2 flex gap-2 shrink-0">
          <button
            onClick={handleLoop}
            disabled={isStreaming}
            className="px-3 py-1.5 text-[11px] font-medium text-[#6a6459] bg-[#f5f0e8] rounded-full border border-[#e5e0d8] hover:bg-[#ebe6de] transition-colors disabled:opacity-40"
          >
            Same city (a loop)
          </button>
          <button
            onClick={handleSurprise}
            disabled={isStreaming}
            className="px-3 py-1.5 text-[11px] font-medium text-[#6a6459] bg-[#f5f0e8] rounded-full border border-[#e5e0d8] hover:bg-[#ebe6de] transition-colors disabled:opacity-40"
          >
            Surprise me
          </button>
        </div>
      )}

      {/* Chat input */}
      {!isFinalized && (
        <div className="px-3 py-3 shrink-0">
          <CompactChatInput
            onSend={onSendMessage}
            disabled={isStreaming}
          />
        </div>
      )}

      <PlannerProgressBar trip={trip} gaps={gaps} />
    </div>
  );
}
