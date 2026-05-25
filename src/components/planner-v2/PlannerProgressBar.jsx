'use client';

const STATUS_LABELS = {
  needs_anchor: 'Start planning',
  draft_with_assumptions: 'Draftable',
  ready: 'Ready',
};

function compactRouteLabel(value) {
  if (!value || !value.includes('→')) return value;
  const parts = value.split('→').map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 3) return value;
  return `${parts[0]} → ${parts[parts.length - 1]} · ${parts.length} stops`;
}

function collectBriefChips(gaps) {
  const intake = gaps?.intake || {};
  const chips = [];

  if (intake.routeAnchors?.status === 'confirmed') {
    chips.push({ id: 'route', label: compactRouteLabel(intake.routeAnchors.summary) });
  }
  if (intake.timeEnvelope?.status === 'confirmed') {
    chips.push({ id: 'time', label: intake.timeEnvelope.summary });
  }

  return chips.slice(0, 2);
}

export default function PlannerProgressBar({ gaps, interaction }) {
  const draftReadiness = gaps?.draftReadiness || 'needs_anchor';
  // The "Route captured" banner duplicated the inline Day Strip in the top bar
  // and the route summary pill, so we suppress the progress bar entirely once
  // the trip is captured. While still drafting, fall through to the normal
  // readiness label.
  if (interaction?.hasCapturedItinerary) return null;

  const status = interaction?.copy?.status || STATUS_LABELS[draftReadiness] || 'Working brief';
  const chips = collectBriefChips(gaps);

  if (interaction && !interaction.showProgress) return null;

  return (
    <div className="px-3 py-1.5 border-t border-[#e5e0d8] bg-white/80 shrink-0">
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8578]">
          {status}
        </span>
        {chips.map((chip) => (
          <span
            key={chip.id}
            className="min-w-0 max-w-[42%] truncate rounded-full bg-[#faf8f5] px-2 py-0.5 text-[10px] text-[#6a6459]"
            title={chip.label}
          >
            {chip.label}
          </span>
        ))}
      </div>
    </div>
  );
}
