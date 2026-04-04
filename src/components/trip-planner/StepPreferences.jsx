'use client';

import {
  Landmark,
  Wine,
  Frame,
  TreePine,
  Castle,
  Sparkles,
  ShoppingBag,
  Camera,
} from './icons';

const PACE_CARDS = [
  {
    id: 'relaxed',
    label: 'Relaxed',
    pace: 15,
    rate: '2–3 things/day',
    description: 'Long lunches, unplanned detours, time to wander.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    pace: 50,
    rate: '3–4 things/day',
    description: 'A mix of highlights and breathing room.',
  },
  {
    id: 'active',
    label: 'Active',
    pace: 85,
    rate: '5–6 things/day',
    description: 'Early starts, full days, maximum exploration.',
  },
];

const INTEREST_OPTIONS = [
  { id: 'Culture & History', Icon: Landmark, sub: 'Landmarks & heritage' },
  { id: 'Food & Drink', Icon: Wine, sub: 'Local cuisine' },
  { id: 'Art & Museums', Icon: Frame, sub: 'Galleries & exhibitions' },
  { id: 'Nature & Outdoors', Icon: TreePine, sub: 'Parks & landscapes' },
  { id: 'Architecture', Icon: Castle, sub: 'Buildings & design' },
  { id: 'Nightlife', Icon: Sparkles, sub: 'Evening entertainment' },
  { id: 'Shopping', Icon: ShoppingBag, sub: 'Markets & boutiques' },
  { id: 'Photography', Icon: Camera, sub: 'Scenic viewpoints' },
];

const BUDGET_OPTIONS = [
  { id: 'budget', label: 'Budget', description: 'Hostels, street food, free attractions' },
  { id: 'moderate', label: 'Moderate', description: '3-star hotels, local restaurants' },
  { id: 'premium', label: 'Premium', description: 'Fine dining, boutique hotels' },
];

export default function StepPreferences({ preferences, onChangePreferences }) {
  const { paceId, interests, budget } = preferences;

  const selectedBudget = BUDGET_OPTIONS.find(b => b.id === budget) || BUDGET_OPTIONS[1];

  const selectPace = (card) => {
    onChangePreferences({
      ...preferences,
      paceId: card.id,
      pace: card.pace,
    });
  };

  const toggleInterest = (id) => {
    const newInterests = interests.includes(id)
      ? interests.filter(x => x !== id)
      : [...interests, id];
    onChangePreferences({
      ...preferences,
      interests: newInterests,
    });
  };

  const setBudget = (id) => {
    onChangePreferences({
      ...preferences,
      budget: id,
    });
  };

  return (
    <div className="space-y-10">
      {/* Pace */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-[0.2em] text-[#6a6459] mb-4">
          Travel Pace
        </label>
        <div className="grid grid-cols-3 gap-3">
          {PACE_CARDS.map(card => {
            const active = paceId === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => selectPace(card)}
                className={`flex flex-col gap-2 rounded-xl border px-4 py-5 text-left transition-all duration-300 ${
                  active
                    ? 'border-[#c9a227]/50 bg-[#faf6eb]'
                    : 'border-[#e5e0d8] bg-white hover:border-[#d5d0c8] hover:bg-[#faf8f5]'
                }`}
              >
                <span
                  className={`text-base font-light ${active ? 'text-[#a08545]' : 'text-[#2a2520]'}`}
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {card.label}
                </span>
                <span className={`text-xs tabular-nums ${active ? 'text-[#a08545]/70' : 'text-[#6a6459]'}`}>
                  {card.rate}
                </span>
                <span className={`text-xs leading-relaxed ${active ? 'text-[#6a6459]' : 'text-[#8a8578]'}`}>
                  {card.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-[0.2em] text-[#6a6459] mb-4">
          Interests
        </label>
        <div className="grid grid-cols-2 gap-2">
          {INTEREST_OPTIONS.map(opt => {
            const active = interests.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleInterest(opt.id)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-300 ${
                  active
                    ? 'border-[#c9a227]/50 bg-[#faf6eb]'
                    : 'border-[#e5e0d8] bg-white hover:border-[#d5d0c8]'
                }`}
              >
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                  active ? 'bg-[#c9a227]/15' : 'bg-[#f5f3f0]'
                }`}>
                  <opt.Icon className={`w-5 h-5 ${active ? 'text-[#c9a227]' : 'text-[#6a6459]'}`} />
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-light ${active ? 'text-[#2a2520]' : 'text-[#5a5549]'}`}>
                    {opt.id}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${active ? 'text-[#6a6459]' : 'text-[#8a8578]'}`}>
                    {opt.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-[0.2em] text-[#6a6459] mb-4">
          Budget
        </label>
        <div className="flex rounded-xl border border-[#e5e0d8] bg-[#faf8f5] p-1 gap-1">
          {BUDGET_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setBudget(opt.id)}
              className={`flex-1 rounded-lg py-3 text-sm font-light transition-all duration-300 ${
                budget === opt.id
                  ? 'bg-[#c9a227] text-white'
                  : 'text-[#6a6459] hover:text-[#2a2520]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#8a8578] text-center font-light">
          {selectedBudget.description}
        </p>
      </div>
    </div>
  );
}
