'use client';

import { MapPin, Calendar, Gauge, Wallet, Heart } from 'lucide-react';
import InlineItinerary from '@/components/conversation/InlineItinerary';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getDayCount(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

const PACE_LABELS = {
  relaxed: 'Relaxed',
  balanced: 'Balanced',
  active: 'Active',
};

const BUDGET_LABELS = {
  budget: 'Budget',
  moderate: 'Moderate',
  premium: 'Premium',
};

export default function StepReview({ tripDates, itinerary, preferences, isGenerating, generateError, generatedItinerary, onRetry, onStartOver }) {
  const totalDays = getDayCount(tripDates.start, tripDates.end);
  const cities = itinerary.filter(item => item.type === 'anchor' || item.type === 'gap-filled');
  const openGaps = itinerary.filter(item => item.type === 'gap');

  return (
    <div className="space-y-8">
      {/* Trip summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-[#faf6eb] border border-[#e5e0d8]">
          <div className="flex items-center gap-2 text-[#6a6459] mb-3">
            <Calendar className="w-4 h-4" />
            <span className="text-[10px] font-medium uppercase tracking-[0.15em]">Duration</span>
          </div>
          <div
            className="text-3xl font-light text-[#2a2520]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {totalDays} <span className="text-lg text-[#6a6459]">days</span>
          </div>
          <div className="text-xs text-[#8a8578] mt-2">
            {formatDate(tripDates.start)} – {formatDate(tripDates.end)}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#faf6eb] border border-[#e5e0d8]">
          <div className="flex items-center gap-2 text-[#6a6459] mb-3">
            <MapPin className="w-4 h-4" />
            <span className="text-[10px] font-medium uppercase tracking-[0.15em]">Destinations</span>
          </div>
          <div
            className="text-3xl font-light text-[#2a2520]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {cities.length} <span className="text-lg text-[#6a6459]">cities</span>
          </div>
          <div className="text-xs text-[#8a8578] mt-2">
            {openGaps.length > 0 ? `${openGaps.length} open gap${openGaps.length !== 1 ? 's' : ''}` : 'Route complete'}
          </div>
        </div>
      </div>

      {/* Itinerary */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-[0.2em] text-[#6a6459] mb-4">
          Your Route
        </h4>
        <div className="space-y-2">
          {itinerary.map((item, index) => (
            <div
              key={item.id || `item-${index}`}
              className={`flex items-center justify-between p-4 rounded-xl ${
                item.type === 'gap'
                  ? 'bg-[#faf8f5] border border-dashed border-[#d5d0c8]'
                  : item.type === 'anchor'
                  ? 'bg-[#faf6eb] border border-[#c9a227]/40'
                  : 'bg-[#f0f7f4] border border-[#4a7c59]/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  item.type === 'gap'
                    ? 'bg-[#e5e0d8]'
                    : item.type === 'anchor'
                    ? 'bg-[#c9a227]/15'
                    : 'bg-[#4a7c59]/15'
                }`}>
                  <MapPin className={`w-4 h-4 ${
                    item.type === 'gap'
                      ? 'text-[#8a8578]'
                      : item.type === 'anchor'
                      ? 'text-[#a08545]'
                      : 'text-[#4a7c59]'
                  }`} />
                </div>
                <div>
                  <div
                    className="text-sm font-light text-[#2a2520]"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    {item.type === 'gap' ? 'Open days' : item.cityName}
                  </div>
                  <div className="text-[10px] text-[#8a8578] mt-0.5">
                    {formatDate(item.startDate)} – {formatDate(item.endDate)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-light ${
                  item.type === 'gap' ? 'text-[#6a6459]' : 'text-[#2a2520]'
                }`}>
                  {item.days || getDayCount(item.startDate, item.endDate)}d
                </div>
                {item.type !== 'gap' && (
                  <div className={`text-[10px] ${
                    item.type === 'anchor' ? 'text-[#a08545]' : 'text-[#4a7c59]'
                  }`}>
                    {item.type === 'anchor' ? 'anchor' : 'added'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white border border-[#e5e0d8] text-center">
          <Gauge className="w-4 h-4 text-[#8a8578] mx-auto mb-2" />
          <div className="text-[10px] text-[#8a8578] uppercase tracking-wider">Pace</div>
          <div className="text-sm font-light text-[#2a2520] mt-1">
            {PACE_LABELS[preferences.paceId] || 'Balanced'}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5e0d8] text-center">
          <Wallet className="w-4 h-4 text-[#8a8578] mx-auto mb-2" />
          <div className="text-[10px] text-[#8a8578] uppercase tracking-wider">Budget</div>
          <div className="text-sm font-light text-[#2a2520] mt-1">
            {BUDGET_LABELS[preferences.budget] || 'Moderate'}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5e0d8] text-center">
          <Heart className="w-4 h-4 text-[#8a8578] mx-auto mb-2" />
          <div className="text-[10px] text-[#8a8578] uppercase tracking-wider">Interests</div>
          <div className="text-sm font-light text-[#2a2520] mt-1">
            {preferences.interests.length || 0}
          </div>
        </div>
      </div>

      {/* Interests list */}
      {preferences.interests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {preferences.interests.map(interest => (
            <span
              key={interest}
              className="px-3 py-1.5 bg-[#faf8f5] border border-[#e5e0d8] rounded-full text-xs font-light text-[#6a6459]"
            >
              {interest}
            </span>
          ))}
        </div>
      )}

      {/* Warning for open gaps */}
      {openGaps.length > 0 && !generatedItinerary && (
        <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#d5d0c8]">
          <div className="text-sm text-[#6a6459] font-light">
            {openGaps.length} open day{openGaps.length !== 1 ? 's' : ''} will remain flexible in your itinerary.
          </div>
        </div>
      )}

      {/* Generated itinerary */}
      {(isGenerating || generateError || generatedItinerary) && (
        <div className="mt-8 pt-8 border-t border-[#e5e0d8]">
          <InlineItinerary
            itinerary={generatedItinerary}
            isLoading={isGenerating}
            error={generateError}
            trip={{ dates: tripDates }}
            onRetry={onRetry}
            onStartOver={onStartOver}
          />
        </div>
      )}
    </div>
  );
}
