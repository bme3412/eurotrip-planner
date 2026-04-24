'use client';

export default function PlannerProgressBar({ trip, gaps }) {
  const completeness = gaps?.completeness ?? 0;
  const filledGaps = gaps?.gaps || [];

  // Show category-level progress
  const categories = [
    { id: 'cities', label: 'Cities', done: !filledGaps.find(g => g.field === 'cities') },
    { id: 'duration', label: 'Duration', done: !filledGaps.find(g => g.field === 'duration') },
    { id: 'dates', label: 'Dates', done: !filledGaps.find(g => g.field === 'dates') },
    { id: 'transport', label: 'Transport', done: !filledGaps.find(g => g.field === 'transport') },
    { id: 'budget', label: 'Budget', done: !filledGaps.find(g => g.field === 'budget') },
    { id: 'travelers', label: 'Travelers', done: !filledGaps.find(g => g.field === 'travelers') },
  ];

  return (
    <div className="px-3 py-2.5 border-t border-[#e5e0d8] bg-white/50 shrink-0">
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#8a8578] mr-1.5 shrink-0">
          {completeness}%
        </span>
        {categories.map((cat, i) => (
          <div key={cat.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-[#d5d0c8] text-[8px]">|</span>}
            <div className="flex items-center gap-0.5">
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  cat.done ? 'bg-[#2a2520]' : 'bg-[#d5d0c8]'
                }`}
              />
              <span
                className={`text-[9px] transition-colors ${
                  cat.done ? 'text-[#2a2520] font-medium' : 'text-[#8a8578]'
                }`}
              >
                {cat.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
