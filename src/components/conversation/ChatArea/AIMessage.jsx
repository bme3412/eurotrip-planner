'use client';

import { motion } from 'framer-motion';
import QuickReplies from '../InputArea/QuickReplies';
import CitySearchInput from '../InputArea/CitySearchInput';
import CityCards from '../InputArea/CityCards';
import DaysSlider from '../InputArea/DaysSlider';
import DatePicker from '../InputArea/DatePicker';
import RouteSummary from '../RouteSummary';

/**
 * Get fallback options based on current trip state
 * This ensures conversation can always continue even if AI doesn't call a tool
 */
function getFallbackOptions(trip) {
  if (!trip) return null;

  // No start city yet - can't show fallback (need city search)
  if (!trip.startCity) return null;

  // Has start city but no end city decision
  if (trip.endCity === undefined) {
    return {
      type: 'show_options',
      data: {
        options: [
          { id: 'roundtrip', label: `Return to ${trip.startCity.name}`, emoji: '🔄' },
          { id: 'oneway', label: 'End somewhere else', emoji: '✈️' },
          { id: 'flexible', label: "I'm flexible", emoji: '🤷' },
        ],
      },
    };
  }

  // Has end city but no duration
  if (!trip.totalDays) {
    return {
      type: 'show_options',
      data: {
        options: [
          { id: 'short', label: '3-4 days', description: 'Weekend getaway', emoji: '⚡' },
          { id: 'week', label: '5-7 days', description: 'A good week', emoji: '📅' },
          { id: 'twoweeks', label: '10-14 days', description: 'Full adventure', emoji: '🗺️' },
          { id: 'custom', label: 'Let me specify', emoji: '✏️' },
        ],
      },
    };
  }

  // Has duration but no stops - offer to add or skip
  if (!trip.stops || trip.stops.length === 0) {
    return {
      type: 'show_options',
      data: {
        options: [
          { id: 'suggest', label: 'Suggest cities for me', emoji: '✨' },
          { id: 'search', label: 'I have cities in mind', emoji: '🔍' },
          { id: 'skip', label: 'Skip to dates', emoji: '⏭️' },
        ],
      },
    };
  }

  // Has stops but no days allocation - this needs DaysSlider, can't fallback easily
  if (!trip.daysPerCity || Object.keys(trip.daysPerCity).length === 0) {
    return null; // Let the AI handle this with proper sliders
  }

  // Has days but no dates
  if (!trip.dates) {
    return {
      type: 'show_options',
      data: {
        options: [
          { id: 'specific', label: 'Pick specific dates', emoji: '📆' },
          { id: 'month', label: 'Just pick a month', emoji: '🗓️' },
          { id: 'flexible', label: "I'm flexible on dates", emoji: '🤷' },
        ],
      },
    };
  }

  // Everything set - offer to confirm
  return {
    type: 'show_options',
    data: {
      options: [
        { id: 'confirm', label: 'Looks good!', emoji: '✅' },
        { id: 'edit', label: 'Make changes', emoji: '✏️' },
      ],
    },
  };
}

/**
 * AIMessage - Renders an AI message with optional rich content
 */
export default function AIMessage({
  content,
  richContent,
  isLatest,
  pendingInput,
  trip,
  onOptionSelect,
  onCitySelect,
  onDaysChange,
  onDateSelect,
}) {
  // Get fallback options if AI didn't provide a tool
  const fallbackInput = isLatest && !pendingInput ? getFallbackOptions(trip) : null;
  // Render rich content based on pending input type
  const renderPendingInput = () => {
    if (!pendingInput || !isLatest) return null;

    switch (pendingInput.type) {
      case 'show_options':
        return (
          <QuickReplies
            options={pendingInput.data.options}
            allowMultiple={pendingInput.data.allowMultiple}
            onSelect={onOptionSelect}
          />
        );

      case 'show_city_search':
        return (
          <CitySearchInput
            purpose={pendingInput.data.purpose}
            suggestions={pendingInput.data.suggestions}
            onSelect={onCitySelect}
          />
        );

      case 'show_city_cards':
        return (
          <CityCards
            cities={pendingInput.data.cities}
            allowMultiple={pendingInput.data.allowMultiple}
            fromCity={pendingInput.data.fromCity}
            onSelect={onCitySelect}
          />
        );

      case 'show_days_allocation':
        return (
          <DaysSlider
            cities={pendingInput.data.cities}
            totalDays={pendingInput.data.totalDays}
            onChange={onDaysChange}
          />
        );

      case 'show_date_picker':
        return (
          <DatePicker
            mode={pendingInput.data.mode || 'range'}
            suggestedStart={pendingInput.data.suggestedStart}
            duration={pendingInput.data.duration}
            onSelect={onDateSelect}
          />
        );

      case 'show_route_summary':
        return (
          <RouteSummary
            showDays={pendingInput.data.showDays}
            showDates={pendingInput.data.showDates}
            confirmable={pendingInput.data.confirmable}
            onConfirm={() => onOptionSelect({ id: 'confirm', label: 'Looks good!' })}
            onEdit={() => onOptionSelect({ id: 'edit', label: 'Make changes' })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex gap-3 max-w-3xl">
      {/* AI Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
        <span className="text-white text-sm font-medium">E</span>
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {/* Text content */}
        {content && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-slate-100"
          >
            <p className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </motion.div>
        )}

        {/* Rich content from message */}
        {richContent && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-3"
          >
            {/* Render based on richContent.type */}
          </motion.div>
        )}

        {/* Pending interactive input */}
        {pendingInput && isLatest && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              delay: 0.15,
            }}
            className="mt-3"
          >
            {renderPendingInput()}
          </motion.div>
        )}

        {/* Fallback options when AI didn't call a tool */}
        {fallbackInput && isLatest && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              delay: 0.3,
            }}
            className="mt-3"
          >
            <QuickReplies
              options={fallbackInput.data.options}
              onSelect={onOptionSelect}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
