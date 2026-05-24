'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { buildSuggestedAllocation } from '@/lib/conversation/plannerActions';

function saveLabelFor(action) {
  if (action?.saveStatus === 'saving') return 'Saving';
  if (action?.saveStatus === 'saved') return 'Saved';
  if (action?.saveStatus === 'error') return 'Save issue';
  return null;
}

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
  const saveLabel = saveLabelFor(latestPlannerAction);
  const action = suggestedAllocation
    ? {
        id: 'apply-suggested-split',
        label: 'Apply suggested split',
        description: 'Use the recommended night split, then compare transport between stops.',
        type: 'allocation',
      }
    : latestPlannerAction?.nextPrompt?.toLowerCase().includes('transport')
      ? {
          id: 'compare-transport',
          label: 'Compare transport',
          description: latestPlannerAction.nextPrompt,
          type: 'chat',
          message: 'Compare the best transport between each leg.',
        }
      : interaction?.nextAction;

  if (!action && !latestPlannerAction && !saveLabel) return null;

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
  const title = action?.id === 'captured-route'
    ? 'Route captured'
    : latestPlannerAction?.title || interaction?.copy?.status || 'Next step';
  const description =
    action?.description ||
    latestPlannerAction?.nextPrompt ||
    latestPlannerAction?.confirmation ||
    'Keep shaping the route from the timeline or chat.';

  return (
    <div className="border-t border-[#e5e0d8] bg-[#fffaf0] px-3 py-2">
      <div className="rounded-2xl border border-[#eadfc8] bg-white px-3 py-2 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
                Next step
              </p>
              {saveLabel && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                  latestPlannerAction?.saveStatus === 'error'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-[#f5f0e8] text-[#6a6459]'
                }`}>
                  <CheckCircle2 className="h-3 w-3" />
                  {saveLabel}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm font-semibold text-[#2a2520]">
              {title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#6a6459]">
              {description}
            </p>
          </div>

          {savedTripId && action?.id === 'finalized' ? (
            <Link
              href={`/itineraries/${savedTripId}`}
              className="shrink-0 rounded-full bg-[#2a2520] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a1510]"
            >
              Open
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
    </div>
  );
}
