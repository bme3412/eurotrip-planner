'use client';

const STATUS_LABELS = {
  needs_anchor: 'Needs anchor',
  draft_with_assumptions: 'Draftable',
  ready: 'Ready',
};

function collectBriefChips(gaps) {
  const intake = gaps?.intake || {};
  const chips = [];

  if (intake.routeAnchors?.status === 'confirmed') {
    chips.push({ id: 'route', label: intake.routeAnchors.summary });
  }
  if (intake.timeEnvelope?.status === 'confirmed') {
    chips.push({ id: 'time', label: intake.timeEnvelope.summary });
  } else if (intake.timeEnvelope?.status === 'assumed') {
    chips.push({ id: 'time', label: intake.timeEnvelope.summary, assumed: true });
  }
  if (intake.tripIntent?.status === 'confirmed') {
    chips.push({ id: 'intent', label: intake.tripIntent.summary });
  }
  if (intake.negativeConstraints?.status === 'confirmed') {
    chips.push({ id: 'constraints', label: intake.negativeConstraints.summary });
  }
  if (intake.preferenceSignals?.status === 'assumed') {
    chips.push({ id: 'prefs', label: intake.preferenceSignals.summary, assumed: true });
  }

  return chips.slice(0, 4);
}

export default function PlannerProgressBar({ gaps, interaction }) {
  const nextMove = gaps?.nextMove || gaps?.nextQuestion;
  const draftReadiness = gaps?.draftReadiness || 'needs_anchor';
  const status = interaction?.copy?.status || STATUS_LABELS[draftReadiness] || 'Working brief';
  const nextLabel = interaction?.copy?.nextLabel || nextMove?.label;
  const chips = collectBriefChips(gaps);

  if (interaction && !interaction.showProgress) return null;

  return (
    <div className="px-3 py-1.5 border-t border-[#e5e0d8] bg-white/80 shrink-0">
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8578]">
          {status}
        </span>
        {nextLabel && (
          <span className="min-w-0 truncate text-[11px] text-[#6a6459]">
            Next: {nextLabel}
          </span>
        )}
        {chips.length > 0 && (
          <span className="hidden md:inline min-w-0 truncate text-[10px] text-[#8a8578]">
            · {chips.map((chip) => `${chip.assumed ? 'assume ' : ''}${chip.label}`).join(' · ')}
          </span>
        )}
      </div>
    </div>
  );
}
