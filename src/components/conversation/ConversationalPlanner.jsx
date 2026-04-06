'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageList, ErrorMessage } from './ChatArea';
import { ChatInput } from './InputArea';
import ContextPanel from './ContextPanel';
import MobileDrawer, { MobileMapButton } from './MobileDrawer';
import TripComplete from './TripComplete';
import { useConversation } from '@/hooks/useConversation';

/**
 * ConversationalPlanner - Main component for the conversational trip planning experience
 */
export default function ConversationalPlanner() {
  const router = useRouter();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

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
            Plan Your Trip
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Chat with me to create your perfect European adventure
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
