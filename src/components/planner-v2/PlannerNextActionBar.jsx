'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buildSuggestedAllocation } from '@/lib/conversation/plannerActions';

export default function PlannerNextActionBar({
  interaction,
  latestPlannerAction,
  tripState,
  savedTripId,
  onSendMessage,
  onAcceptSuggestedAllocation,
}) {
  if (interaction?.showWelcome) return null;

  const suggestedAllocation = buildSuggestedAllocation(tripState);
  const capturedRouteAction =
    interaction?.nextAction?.id === 'captured-route' ? interaction.nextAction : null;
  const action = suggestedAllocation
    ? {
        id: 'apply-suggested-split',
        label: 'Apply suggested split',
        type: 'allocation',
      }
    : capturedRouteAction
      ? capturedRouteAction
      : latestPlannerAction?.nextPrompt?.toLowerCase().includes('transport')
        ? {
            id: 'compare-transport',
            label: 'Compare transport',
            type: 'chat',
            message: 'Compare the best transport between each leg.',
          }
        : interaction?.nextAction;

  if (!action) return null;

  const handlePrimary = () => {
    if (action?.type === 'allocation' && suggestedAllocation) {
      onAcceptSuggestedAllocation?.(suggestedAllocation);
      return;
    }
    if (action?.message) {
      onSendMessage?.(action.message);
    }
  };

  const canClick = action?.type === 'allocation' || action?.message;
  const checklist = action?.checklist || [];
  const completedCount = checklist.filter((item) => item.complete).length;
  const hasProgress = checklist.length > 0;

  return (
    <div className="border-t border-[#e5e0d8] bg-white px-3 py-2">
      <div className="flex items-center gap-3">
        {hasProgress && (
          <div className="flex shrink-0 items-center gap-1.5" aria-label={`Brief progress ${completedCount} of ${checklist.length}`}>
            <div className="flex items-center gap-1">
              {checklist.map((item) => (
                <span
                  key={item.id}
                  title={`${item.label}${item.complete ? ' — done' : ''}`}
                  className={`h-1.5 w-1.5 rounded-full ${
                    item.complete ? 'bg-emerald-500' : 'bg-[#e5d9bf]'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-semibold tabular-nums text-[#8a8578]">
              {completedCount}/{checklist.length}
            </span>
          </div>
        )}

        <p className="min-w-0 flex-1 truncate text-xs text-[#6a6459]">
          {action?.description || ''}
        </p>

        {savedTripId && action?.id === 'finalized' ? (
          <Link
            href={`/itineraries/${savedTripId}`}
            className="shrink-0 rounded-full bg-[#2a2520] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a1510]"
          >
            Open itinerary
          </Link>
        ) : canClick ? (
          <button
            type="button"
            onClick={handlePrimary}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#2a2520] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a1510]"
          >
            {action.label}
            <ArrowRight className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
