import React from 'react';
import { RouteSummaryWithData } from '../../../conversation/RouteSummary';
import ParsedItineraryCard from '../../../conversation/ParsedItineraryCard';
import { HeaderHint } from '../components/MessageComponents.jsx';
import {
  PlannerOptions,
  RoutePresetCards,
  PendingCityPicker,
} from '../components/WidgetComponents.jsx';
import InlineDatePicker from '../components/InlineDatePicker.jsx';

/**
 * Render the widget that corresponds to the current pending input slot.
 * Returns null when the active widget doesn't match the pending input type
 * (e.g. the planner has moved on to a different step).
 */
export default function usePendingInputRenderer({
  pendingInput,
  interaction,
  trip,
  onOptionSelect,
  onCitySelect,
  onCitiesSelect,
  onRoutePresetSelect,
  onDatesPick,
  onFlexibleMonth,
  onFlexible,
  onParsedItineraryConfirm,
  onParsedItineraryRefine,
}) {
  if (!pendingInput) return null;
  const activeWidget = interaction?.activeWidget || 'none';

  switch (pendingInput.type) {
    case 'render_options':
    case 'show_options':
      if (activeWidget !== 'route_options') return null;
      return (
        <PlannerOptions
          options={pendingInput.data.options}
          onSelect={onOptionSelect}
        />
      );
    case 'render_city_picker':
    case 'show_city_search': {
      if (activeWidget !== 'city_picker') return null;
      const hasSuggestions = (pendingInput.data?.suggestions || []).length > 0;
      const brief = trip?.brief || {};
      const hasBriefSignal = Boolean(
        brief.intent ||
        (brief.targetRegions || []).length ||
        (brief.intentSignals || []).length ||
        (brief.hardConstraints || []).length ||
        (brief.negativeConstraints || []).length ||
        (brief.notes || []).length
      );
      const isColdStart =
        pendingInput.data?.purpose === 'suggest_stops' &&
        !trip?.startCity &&
        !(trip?.stops || []).length &&
        !trip?.endCity &&
        !hasSuggestions &&
        !hasBriefSignal;
      if (isColdStart) {
        return (
          <RoutePresetCards onSelect={onRoutePresetSelect} />
        );
      }
      return (
        <PendingCityPicker
          pendingInput={pendingInput}
          onCitySelect={onCitySelect}
          onCitiesSelect={onCitiesSelect}
        />
      );
    }
    case 'show_city_cards':
      return (
        <HeaderHint label="Tap a day in the trip schedule above and pick the city you want." />
      );
    case 'render_nights_allocator':
    case 'show_days_allocation':
      // Night allocator widget is rendered at the top of the planner;
      // no inline chat hint needed.
      return null;
    case 'render_date_picker':
    case 'show_date_picker':
      if (activeWidget !== 'date_picker') return null;
      return (
        <div className="py-1">
          <InlineDatePicker
            pendingInput={pendingInput}
            currentDates={trip?.dates || null}
            onDatesPick={onDatesPick}
            onFlexibleMonth={onFlexibleMonth}
            onFlexible={onFlexible}
          />
        </div>
      );
    case 'show_route_summary':
      if (activeWidget !== 'route_review') return null;
      return (
        <div className="py-1">
          <RouteSummaryWithData
            trip={trip}
            showDays={pendingInput.data.showDays}
            showDates={pendingInput.data.showDates}
            confirmable={pendingInput.data.confirmable}
            onConfirm={() => onOptionSelect({ id: 'confirm', label: 'Looks good!' })}
            onEdit={() => onOptionSelect({ id: 'edit', label: 'Make changes' })}
          />
        </div>
      );
    case 'parse_itinerary':
      if (activeWidget !== 'route_review') return null;
      return (
        <div className="py-1">
          <ParsedItineraryCard
            data={pendingInput.data}
            onConfirm={onParsedItineraryConfirm}
            onRefine={onParsedItineraryRefine}
          />
        </div>
      );
    case 'confirm_changes':
      if (activeWidget !== 'route_review') return null;
      return (
        <div className="py-1 space-y-2">
          <div className="px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
            <p className="text-[12px] font-medium text-amber-900 mb-1.5">
              {pendingInput.data?.summary || 'Confirm these changes?'}
            </p>
            {pendingInput.data?.changes?.map((change, i) => (
              <div key={i} className="text-[11px] text-amber-800 flex gap-2">
                <span className="font-medium">{change.field}:</span>
                {change.from && <span className="line-through text-amber-600">{change.from}</span>}
                <span>{change.to}</span>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onOptionSelect({ id: 'confirm', label: 'Yes, apply those changes' })}
                className="px-3 py-1 text-[11px] font-medium rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => onOptionSelect({ id: 'reject', label: 'No, keep it as is' })}
                className="px-3 py-1 text-[11px] font-medium rounded-full border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Keep as is
              </button>
            </div>
          </div>
        </div>
      );
    case 'render_trip_card':
      if (activeWidget !== 'route_review') return null;
      return (
        <div className="py-1 px-3 rounded-xl border border-[#e5e0d8] bg-[#faf8f5] text-[12px] text-[#4a4540]">
          <p className="font-medium text-[#2a2520] mb-1">Trip updated</p>
          {pendingInput.data?.highlightChanges?.map((field, i) => (
            <span key={i} className="inline-block mr-1.5 px-2 py-0.5 rounded-full bg-[#e5e0d8] text-[10px]">{field}</span>
          ))}
        </div>
      );
    default:
      return null;
  }
}
