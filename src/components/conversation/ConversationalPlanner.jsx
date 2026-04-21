'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageList, ErrorMessage } from './ChatArea';
import { ChatInput } from './InputArea';
import ContextPanel from './ContextPanel';
import MobileDrawer, { MobileMapButton } from './MobileDrawer';
import TripComplete from './TripComplete';
import { useConversation } from '@/hooks/useConversation';

/**
 * ConversationalPlanner - Main component for the conversational trip planning experience
 *
 * Props:
 *   initialUserMessage - Optional. If provided, automatically sent as the user's
 *     first message after the opening assistant turn completes. Used by /plan?q=...
 *     to honor a CommandBar query.
 */
export default function ConversationalPlanner({ initialUserMessage = null } = {}) {
  const router = useRouter();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const seededRef = useRef(false);

  const {
    messages,
    trip,
    isStreaming,
    pendingInput,
    error,
    hasStarted,
    isFinalized,
    sendMessage,
    startConversation,
    handleOptionSelect,
    handleCitySelect,
    confirmParsedItinerary,
    updateTrip,
    reset,
    retry,
    dismissError,
  } = useConversation();

  // Check if trip has any cities selected
  const tripHasCities = trip.startCity || trip.stops?.length > 0 || trip.endCity;

  // Start conversation on mount
  useEffect(() => {
    if (!hasStarted) {
      startConversation();
    }
  }, [hasStarted, startConversation]);

  // After the opening assistant turn finishes, if we were handed an initial
  // user message (from /plan?q=...), dispatch it once.
  useEffect(() => {
    if (!initialUserMessage) return;
    if (seededRef.current) return;
    if (!hasStarted) return;
    if (isStreaming) return;
    if (messages.length === 0) return;
    seededRef.current = true;
    sendMessage(initialUserMessage);
  }, [initialUserMessage, hasStarted, isStreaming, messages.length, sendMessage]);

  // Handle text input submission
  const handleSendMessage = useCallback((text) => {
    sendMessage(text);
  }, [sendMessage]);

  // Handle option selection from quick replies
  const handleOption = useCallback((option) => {
    handleOptionSelect(option);
  }, [handleOptionSelect]);

  // Handle city selection from search or cards
  const handleCity = useCallback((city, purpose) => {
    if (city === null) {
      // User skipped
      sendMessage("I'll skip adding more cities for now");
      return;
    }
    handleCitySelect(city, purpose);
  }, [handleCitySelect, sendMessage]);

  // Handle days allocation
  const handleDaysChange = useCallback((daysMap) => {
    updateTrip({ daysPerCity: daysMap });
    // Format message
    const entries = Object.entries(daysMap);
    const summary = entries.map(([, days]) => `${days}d`).join(', ');
    sendMessage(`I'll go with: ${summary}`);
  }, [updateTrip, sendMessage]);

  // Handle parse_itinerary confirm (from ParsedItineraryCard)
  const handleParsedItineraryConfirm = useCallback((cities) => {
    confirmParsedItinerary(cities);
  }, [confirmParsedItinerary]);

  // Handle parse_itinerary refine - drop the card, hand the summary
  // back to the agent as a new user message so it can re-parse.
  const handleParsedItineraryRefine = useCallback((summary) => {
    sendMessage(summary);
  }, [sendMessage]);

  // Handle date selection
  const handleDateSelect = useCallback((dates) => {
    updateTrip({ dates });
    if (dates.start && dates.end) {
      sendMessage(`I'll travel from ${dates.start} to ${dates.end}`);
    } else if (dates.month) {
      sendMessage(`I'll travel sometime in ${dates.month}`);
    } else {
      sendMessage("I'm flexible on dates");
    }
  }, [updateTrip, sendMessage]);

  // Switch to advanced (wizard) mode
  const handleSwitchToAdvanced = useCallback(() => {
    // Store current trip state and redirect to wizard
    // For now, just redirect
    router.push('/trip-planner?mode=wizard');
  }, [router]);

  // Handle planning a specific city
  const handlePlanCity = useCallback((city) => {
    // Navigate to city-specific planner
    const citySlug = city.name.toLowerCase().replace(/\s+/g, '-');
    router.push(`/plan/${citySlug}`);
  }, [router]);

  // If trip is finalized, show completion screen
  if (isFinalized) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <TripComplete
          trip={trip}
          onStartOver={reset}
          onPlanCity={handlePlanCity}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex-shrink-0 px-6 py-4 bg-white border-b border-slate-200">
          <h1 className="text-xl font-semibold text-slate-800">
            Plan or review a trip
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tell us about your trip, paste a draft to review, or ask about anywhere in Europe.
          </p>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <MessageList
              messages={messages}
              isStreaming={isStreaming}
              pendingInput={pendingInput}
              trip={trip}
              onOptionSelect={handleOption}
              onCitySelect={handleCity}
              onDaysChange={handleDaysChange}
              onDateSelect={handleDateSelect}
              onParsedItineraryConfirm={handleParsedItineraryConfirm}
              onParsedItineraryRefine={handleParsedItineraryRefine}
            />
          </div>

          {/* Error state */}
          {error && !isStreaming && (
            <ErrorMessage
              error={error}
              onRetry={retry}
              onDismiss={dismissError}
            />
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 px-4 py-4 bg-white border-t border-slate-200">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isStreaming}
            placeholder={
              pendingInput
                ? "Or type your own response..."
                : "Type a message..."
            }
          />
        </div>
      </div>

      {/* Context panel (map + summary) - Desktop */}
      <div className="hidden lg:block w-96 border-l border-slate-200 bg-white">
        <ContextPanel
          trip={trip}
          onSwitchToAdvanced={handleSwitchToAdvanced}
        />
      </div>

      {/* Mobile: Floating map button */}
      <MobileMapButton
        onClick={() => setIsMobileDrawerOpen(true)}
        tripHasCities={tripHasCities}
      />

      {/* Mobile: Drawer with map and summary */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      >
        <ContextPanel
          trip={trip}
          onSwitchToAdvanced={handleSwitchToAdvanced}
        />
      </MobileDrawer>
    </div>
  );
}
