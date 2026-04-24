'use client';

const CATEGORIES = [
  { id: 'cities', label: 'Cities' },
  { id: 'duration', label: 'Duration' },
  { id: 'dates', label: 'Dates' },
  { id: 'budget', label: 'Budget' },
  { id: 'interests', label: 'Interests' },
];

export default function PlannerProgressBar({ gaps }) {
  const completeness = gaps?.completeness ?? 0;
  const openGaps = gaps?.gaps || [];
  const hardFilled = new Set(gaps?.hardFilled || []);

  return (
    <div className="px-3 py-1.5 border-t border-[#e5e0d8] bg-white/50 shrink-0 flex items-center gap-2">
      <div
        className="flex-1 h-1 bg-[#e5e0d8] rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={completeness}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Trip framework ${completeness}% complete`}
      >
        <div
          className="h-full bg-[#2a2520] rounded-full transition-all duration-500"
          style={{ width: `${completeness}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {CATEGORIES.map((cat) => {
          const hasOpenGap = openGaps.some((g) => g.field === cat.id);
          const done = hardFilled.has(cat.id) && !hasOpenGap;
          return (
            <div
              key={cat.id}
              title={`${cat.label}: ${done ? 'done' : 'pending'}`}
              aria-label={`${cat.label}: ${done ? 'done' : 'pending'}`}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                done ? 'bg-[#2a2520]' : 'bg-[#d5d0c8]'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
