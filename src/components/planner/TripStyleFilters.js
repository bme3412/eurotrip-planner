'use client';

const TRIP_STYLES = [
  { id: 'everyone', label: 'Everyone', icon: '🌍', color: 'blue' },
  { id: 'families', label: 'Families', icon: '👨‍👩‍👧', color: 'green' },
  { id: 'couples', label: 'Couples', icon: '💑', color: 'pink' },
  { id: 'solo', label: 'Solo', icon: '🎒', color: 'purple' },
  { id: 'budget', label: 'Budget', icon: '💰', color: 'amber' },
  { id: 'luxury', label: 'Luxury', icon: '✨', color: 'gold' },
];

export default function TripStyleFilters({ activeFilter, onFilterChange }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Trip Style
      </div>
      <div className="flex flex-wrap gap-2">
        {TRIP_STYLES.map(style => {
          const isActive = activeFilter === style.id;
          const colorClasses = {
            blue: isActive ? 'bg-blue-500 border-blue-500 text-white shadow-blue-500/30' : '',
            green: isActive ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/30' : '',
            pink: isActive ? 'bg-pink-500 border-pink-500 text-white shadow-pink-500/30' : '',
            purple: isActive ? 'bg-purple-500 border-purple-500 text-white shadow-purple-500/30' : '',
            amber: isActive ? 'bg-amber-500 border-amber-500 text-white shadow-amber-500/30' : '',
            gold: isActive ? 'bg-amber-600 border-amber-600 text-white shadow-amber-600/30' : '',
          };

          return (
            <button
              key={style.id}
              onClick={() => onFilterChange(style.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-[13px] font-semibold transition-all duration-200 ${
                isActive
                  ? `${colorClasses[style.color]} shadow-lg transform scale-[1.02]`
                  : 'border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 hover:scale-[1.02] hover:shadow-md'
              }`}
            >
              <span className="text-base">{style.icon}</span>
              <span>{style.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { TRIP_STYLES };
