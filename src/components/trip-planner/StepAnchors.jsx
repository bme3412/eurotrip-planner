'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import TripDateSelector from './TripDateSelector';
import { getAllCities } from '@/lib/planning/easeScoreCalculator';

function formatCityName(slug) {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatShortDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
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

export default function StepAnchors({ tripDates, anchors, onAddAnchor, onRemoveAnchor }) {
  const [cities, setCities] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);
  const [anchorDates, setAnchorDates] = useState({ start: '', end: '' });

  useEffect(() => {
    getAllCities().then(setCities);
  }, []);

  // Calculate date ranges already used by existing anchors
  const excludeRanges = useMemo(() => {
    return anchors.map(a => ({ start: a.startDate, end: a.endDate }));
  }, [anchors]);

  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.country.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8);

  const handleSelectCity = (city) => {
    setSelectedCity(city);
    setSearchQuery(city.name);
  };

  const handleAddAnchor = () => {
    if (!selectedCity || !anchorDates.start || !anchorDates.end) return;

    onAddAnchor({
      city: selectedCity.id,
      cityName: selectedCity.name,
      country: selectedCity.country,
      startDate: anchorDates.start,
      endDate: anchorDates.end,
    });

    // Reset form
    setIsAdding(false);
    setSelectedCity(null);
    setSearchQuery('');
    setAnchorDates({ start: '', end: '' });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setSelectedCity(null);
    setSearchQuery('');
    setAnchorDates({ start: '', end: '' });
  };

  return (
    <div className="space-y-6">
      {/* Existing anchors */}
      {anchors.length > 0 && (
        <div className="space-y-3">
          {anchors.map((anchor) => (
            <div
              key={anchor.id}
              className="flex items-center justify-between px-5 py-4 rounded-xl bg-[#faf6eb] border border-[#e5e0d8]"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#c9a227]/15 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#a08545]" />
                </div>
                <div>
                  <div
                    className="font-light text-[#2a2520] text-lg"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    {anchor.cityName}
                  </div>
                  <div className="text-xs text-[#6a6459]">
                    {formatShortDate(anchor.startDate)} – {formatShortDate(anchor.endDate)}
                    <span className="ml-2 text-[#a08545]">
                      {getDayCount(anchor.startDate, anchor.endDate)} days
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onRemoveAnchor(anchor.id)}
                className="p-2 text-[#8a8578] hover:text-[#991b1b] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add anchor form */}
      {isAdding ? (
        <div className="p-5 rounded-xl bg-[#faf8f5] border border-[#c9a227]/40 space-y-5">
          <h4
            className="text-base font-light text-[#2a2520]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Add a destination
          </h4>

          {/* City search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedCity(null);
              }}
              placeholder="Search cities..."
              className="w-full px-4 py-3 bg-white border border-[#e5e0d8] rounded-lg text-[#2a2520] placeholder:text-[#a5a098] focus:outline-none focus:border-[#c9a227]/50 transition-colors"
            />
            {searchQuery && !selectedCity && filteredCities.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e5e0d8] rounded-lg overflow-hidden z-10 shadow-xl shadow-[#2a2520]/10">
                {filteredCities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleSelectCity(city)}
                    className="w-full px-4 py-3 text-left hover:bg-[#faf8f5] transition-colors flex items-center gap-3 border-b border-[#e5e0d8] last:border-0"
                  >
                    <MapPin className="w-4 h-4 text-[#8a8578]" />
                    <span className="text-[#2a2520]">{city.name}</span>
                    <span className="text-xs text-[#8a8578]">{city.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date selection for this anchor */}
          {selectedCity && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.15em] text-[#6a6459] mb-3">
                When in {selectedCity.name}?
              </label>
              <TripDateSelector
                tripDates={tripDates}
                value={anchorDates}
                onChange={setAnchorDates}
                excludeRanges={excludeRanges}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 text-sm text-[#6a6459] hover:text-[#2a2520] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAnchor}
              disabled={!selectedCity || !anchorDates.start || !anchorDates.end}
              className="px-5 py-2.5 bg-[#c9a227] hover:bg-[#d4af37] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
            >
              Add Anchor
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-3 px-4 py-5 rounded-xl border border-dashed border-[#d5d0c8] hover:border-[#c9a227]/50 text-[#6a6459] hover:text-[#a08545] transition-all group"
        >
          <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="font-light">Add anchor city</span>
        </button>
      )}

      {/* Help text */}
      {anchors.length === 0 && !isAdding && (
        <div className="text-center text-[#6a6459] text-sm py-6 font-light">
          <p>An <span className="text-[#a08545]">anchor</span> is a city you know you&apos;ll visit.</p>
          <p className="mt-1 italic text-[#8a8578]">&quot;I&apos;m flying into Paris and staying until June 22&quot;</p>
        </div>
      )}
    </div>
  );
}
