'use client';

export default function PlannerProgressBar({ gaps }) {
  const completeness = gaps?.completeness ?? 0;
  const filledGaps = gaps?.gaps || [];

  const categories = [
    { id: 'cities', label: 'Cities' },
    { id: 'duration', label: 'Duration' },
    { id: 'dates', label: 'Dates' },
    { id: 'budget', label: 'Budget' },
    { id: 'interests', label: 'Interests' },
  ];

  return (
    <div className="px-3 py-1.5 border-t border-[#e5e0d8] bg-white/50 shrink-0 flex items-center gap-2">
      {/* Progress bar */}
      <div className="flex-1 h-1 bg-[#e5e0d8] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#2a2520] rounded-full transition-all duration-500"
          style={{ width: `${completeness}%` }}
        />
      </div>
      {/* Category dots */}
      <div className="flex items-center gap-1.5 shrink-0">
        {categories.map((cat) => {
          const done = !filledGaps.find(g => g.field === cat.id);
          return (
            <div
              key={cat.id}
              title={cat.label}
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
